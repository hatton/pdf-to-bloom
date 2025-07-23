import * as fs from "fs/promises"; // Use promises API for async file operations
import * as path from "path";
import {
  makeMarkdownFromPDF,
  logger,
  llmMarkdown,
  Parser,
  HtmlGenerator,
  addBloomPlanToMarkdown,
  pdfToMarkdownWithUnpdf,
  pdfToMarkdown,
} from "@pdf-to-bloom/lib"; // Assuming these functions are async and return/handle as described
import {
  createLogCallback,
  getApiKeys,
  getFileNameWithoutExtension,
  readBloomCollectionSettingsIfFound,
  validateAndResolveCollectionPath,
} from "./processUtils";

export enum PdfProcessor {
  Mistral = "mistral",
  Unpdf = "unpdf",
  OpenRouter = "openrouter",
}

export enum Artifact {
  PDF,
  Images,
  MarkdownFromOCR,
  MarkdownFromLLM,
  MarkdownReadyForBloom,
  HTML,
}
export type Arguments = {
  input: string; // Input file or directory path
  output?: string; // Optional output path
  collection?: string; // Path to Bloom collection folder or .bloomCollection file
  target: Artifact; // Target format (default is HTML)
  verbose: boolean; // Verbose logging
  mistralApiKey?: string; // Mistral API key for PDF to markdown conversion
  openrouterKey?: string; // OpenRouter API key for LLM tagging of markdown
  promptPath?: string; // Path to custom prompt file to override built-in prompt
  modelName?: string; // OpenRouter model name to override the default model
  ocrMethod: string; // OCR processing method: mistral, unpdf, or any OpenRouter model
  parserEngine: string; // PDF parsing engine for OpenRouter: native, mistral-ocr, or pdf-text
};

type Plan = {
  pdfPath?: string;
  markdownFromOCRPath?: string;
  markdownFromLLMPath?: string;
  markdownCleanedAfterLLMPath?: string;
  markdownForBloomPath?: string;
  bookFolderPath?: string;
  collectionFolderPath?: string;
  inputArtifact: Artifact;
  targetArtifact: Artifact;
  verbose: boolean;
  mistralKey?: string;
  openrouterKey?: string;
  promptPath?: string;
  modelName?: string;
  ocrMethod: string;
  parserEngine: string;
};

// Convert numeric enum value to readable string
const artifactNames = {
  [Artifact.PDF]: "PDF",
  [Artifact.Images]: "Images",
  [Artifact.MarkdownFromOCR]: "Markdown from OCR",
  [Artifact.MarkdownFromLLM]: "Tagged Markdown from LLM",
  [Artifact.MarkdownReadyForBloom]: "Bloom-ready Markdown",
  [Artifact.HTML]: "Bloom HTML",
};

export async function processConversion(inputPath: string, options: Arguments) {
  const logCallback = createLogCallback(!!options.verbose);
  logger.subscribe(logCallback);

  const plan = await makeThePlan(inputPath, options);

  try {
    logger.info(
      `Starting conversion from "${artifactNames[plan.inputArtifact]}" to "${artifactNames[plan.targetArtifact]}"`
    );

    let latestArtifact = plan.inputArtifact; // Start with the input type

    // ------------------------------------------------------------------------------
    // Step 0.5: Extract Images from PDF (if target is Images)
    // ------------------------------------------------------------------------------
    if (
      latestArtifact === Artifact.PDF &&
      plan.targetArtifact === Artifact.Images
    ) {
      logger.info(`-> Extracting images from PDF...`);

      const { extractAndSaveImages } = await import("@pdf-to-bloom/lib");

      await extractAndSaveImages(plan.pdfPath!, plan.bookFolderPath!);
      logger.info(`Images extracted to: ${plan.bookFolderPath}`);
      return; // Exit early, we only wanted images
    }

    // ------------------------------------------------------------------------------
    // Step 1: Convert PDF to Markdown
    // ------------------------------------------------------------------------------
    if (latestArtifact === Artifact.PDF) {
      logger.info(`-> Converting PDF to Markdown...`);

      let markdownContent: string;

      if (plan.ocrMethod === "unpdf") {
        logger.info(`Using unpdf for PDF processing (experimental)`);
        // Use the new unpdf approach - extracts ALL text from PDF structure,
        // including potentially hidden layers. Some PDFs (especially those from
        // Adobe Illustrator/Distiller) may contain non-visible text.
        markdownContent = await pdfToMarkdownWithUnpdf(
          plan.pdfPath!,
          plan.bookFolderPath!,
          logCallback
        );
      } else if (plan.ocrMethod === "mistral") {
        logger.info(`Using Mistral AI for PDF processing`);
        // Use the existing Mistral AI approach - vision-based OCR that only
        // extracts visually rendered text, similar to what a human would see.
        markdownContent = await makeMarkdownFromPDF(
          plan.pdfPath!,
          plan.bookFolderPath!,
          plan.mistralKey!,
          logCallback
        );
      } else {
        logger.info(
          `Using OpenRouter model '${plan.ocrMethod}' for PDF processing (simplified approach)`
        );
        // Use OpenRouter vision models for OCR with simplified approach

        // Read custom prompt if provided
        let customPrompt: string | undefined;
        if (plan.promptPath) {
          try {
            customPrompt = await fs.readFile(plan.promptPath, "utf-8");
            logger.info(`Using custom prompt from: ${plan.promptPath} for OCR`);
          } catch (error) {
            logger.error(
              `Failed to read custom prompt file: ${plan.promptPath}`
            );
            throw error;
          }
        }

        markdownContent = await pdfToMarkdown(
          plan.pdfPath!,
          plan.openrouterKey!,
          plan.ocrMethod,
          logCallback,
          customPrompt
        );
        // After writing markdown, extract images from the PDF to match markdown references
        const { extractAndSaveImages } = await import("@pdf-to-bloom/lib");
        await extractAndSaveImages(plan.pdfPath!, plan.bookFolderPath!);
      }

      logger.info(`Writing OCR'd markdown to: ${plan.markdownFromOCRPath}`);
      await fs.writeFile(plan.markdownFromOCRPath!, markdownContent); // Write the markdown content to file

      latestArtifact = Artifact.MarkdownFromOCR;
      // If Markdown was the final target, we're done here
      if (plan.targetArtifact === Artifact.MarkdownFromOCR) {
        return;
      }
    } // ------------------------------------------------------------------------------
    // Stage 2: Run LLM over Markdown
    // ------------------------------------------------------------------------------
    if (latestArtifact === Artifact.MarkdownFromOCR) {
      logger.info(`-> Giving Markdown to LLM...`);
      const markdownContentToEnrich = await fs.readFile(
        plan.markdownFromOCRPath!,
        "utf-8"
      );
      // For markdown enrichment, if the input is from a Bloom collection, try to get language info from collection settings
      const inputFolder =
        plan.collectionFolderPath || path.dirname(plan.bookFolderPath!);
      const langs = await readBloomCollectionSettingsIfFound(inputFolder);
      if (langs) {
        const formatLang = (lang?: { tag: string; name: string }) =>
          lang ? `${lang.name} (${lang.tag})` : "undefined";
        logger.info(
          `Supplying info from Bloom Collection settings: L1: ${formatLang(langs.l1)}, L2: ${formatLang(langs.l2)}, L3: ${formatLang(langs.l3)}`
        );
      } else {
        logger.warn(
          `No Bloom Collection settings found in ${inputFolder} or parent directories, so LLM may not use the correct language codes.`
        );
      }

      // Read custom prompt if provided
      let customPrompt: string | undefined;
      if (plan.promptPath) {
        try {
          customPrompt = await fs.readFile(plan.promptPath, "utf-8");
          logger.info(`Using custom prompt from: ${plan.promptPath}`);
        } catch (error) {
          logger.error(`Failed to read custom prompt file: ${error}`);
          throw new Error(
            `Failed to read custom prompt file: ${plan.promptPath}`
          );
        }
      }

      const llmResult = await llmMarkdown(
        markdownContentToEnrich,
        plan.openrouterKey!,
        {
          logCallback,
          l1: langs?.l1,
          l2: langs?.l2,
          l3: langs?.l3,
          overridePrompt: customPrompt,
          overrideModel: plan.modelName,
        }
      );
      logger.info(
        `Writing llm-tagged markdown to: ${plan.markdownFromLLMPath}`
      );

      // Check if LLM processing failed
      if (llmResult.error) {
        // Save the invalid markdown for inspection
        await fs.writeFile(
          plan.markdownFromLLMPath!,
          llmResult.markdownResultFromLLM
        );
        logger.error(`LLM processing failed: ${llmResult.error}`);
        logger.info(`Invalid markdown saved to: ${plan.markdownFromLLMPath!}`);
        throw new Error(
          `LLM processing failed: ${llmResult.error}. Check the saved markdown at "${plan.markdownFromLLMPath!}" for details.`
        );
      }

      await fs.writeFile(
        plan.markdownFromLLMPath!,
        llmResult.markdownResultFromLLM
      );
      logger.info(
        `Writing cleaned up markdown to: ${plan.markdownCleanedAfterLLMPath}`
      );
      await fs.writeFile(
        plan.markdownCleanedAfterLLMPath!,
        llmResult.cleanedUpMarkdown
      );

      if (!llmResult.valid) {
        throw new Error(
          `Enrichment process returned invalid content. This can be a result of the mode/prompt. You may be able to see errors in the file "${plan.markdownCleanedAfterLLMPath!}" for details.`
        );
      }

      latestArtifact = Artifact.MarkdownFromLLM;
      console.log(
        `latestArtifact is now MarkdownFromLLM. target is ${artifactNames[plan.targetArtifact]}`
      );
      if (plan.targetArtifact === Artifact.MarkdownFromLLM) {
        return; // If Markdown was the final target, we're done here
      }
    }

    // ------------------------------------------------------------------------------
    // Stage 3: Make Markdown with all decisions made
    // ------------------------------------------------------------------------------
    if (latestArtifact === Artifact.MarkdownFromLLM) {
      logger.info(`-> Adding Bloom plan to Markdown...`);
      // Now we want to do the final bit of any logic work, still in markdown format because
      // then it is easier for a human to inspect the plan. Later we're going to HTML and by then
      // it's really hard to wade through what was done.

      console.log("reading in markdown from LLM");
      const input = await fs.readFile(
        plan.markdownCleanedAfterLLMPath!,
        "utf-8"
      );
      console.log("calling addBloomPlanToMarkdown");
      const finalMarkdown = addBloomPlanToMarkdown(input);
      console.log("returned;");
      console.log(
        `finalMarkdown length: ${finalMarkdown?.length || "undefined"}`
      );
      logger.info(
        `Writing ready-for-bloom markdown to: ${plan.markdownForBloomPath!}`
      );

      await fs.writeFile(plan.markdownForBloomPath!, finalMarkdown);

      latestArtifact = Artifact.MarkdownReadyForBloom;
      // If Tagged Markdown was the final target, we're done here
      if (plan.targetArtifact === Artifact.MarkdownReadyForBloom) {
        return;
      }
    }
    // ------------------------------------------------------------------------------
    // Stage 4: Convert Tagged Markdown to Bloom HTML
    // ------------------------------------------------------------------------------
    if (latestArtifact === Artifact.MarkdownReadyForBloom) {
      logger.info(`-> Converting Markdown to Bloom HTML...`);
      const taggedMarkdownContent = await fs.readFile(
        plan.markdownForBloomPath!,
        "utf-8"
      );

      const book = new Parser().parseMarkdown(taggedMarkdownContent);

      const bloomHtmlContent = await HtmlGenerator.generateHtmlDocument(
        book,
        logCallback
      );

      // Ensure the output directory exists
      await fs.mkdir(plan.bookFolderPath!, { recursive: true });
      await fs.writeFile(
        path.join(plan.bookFolderPath!, "index.html"),
        bloomHtmlContent
      );
      logger.info(`Bloom book should be at: ${plan.bookFolderPath}`);
      logger.info("✅ Conversion to Bloom HTML completed successfully!");
      return;
    }
  } catch (error: any) {
    logger.error("❌ Error during conversion:");

    if (error instanceof Error) {
      logger.error(error.message);
      // Log the stack trace which contains file paths and line numbers
      if (error.stack) {
        logger.error("Stack trace:");
        logger.error(error.stack);
      }
    } else {
      logger.error(String(error));
    }

    process.exit(1); // Exit with an error code
  }
}

async function makeThePlan(
  inputPath: string,
  cliArguments: Arguments
): Promise<Plan> {
  const fullInputPath = path.resolve(inputPath);

  // Validate that collection and output are not both specified
  if (cliArguments.collection && cliArguments.output) {
    throw new Error(
      "Cannot specify both --collection and --output options. Use --collection for better language detection, or --output for custom directory placement."
    );
  }

  // use a regex to figure out the input type (as an Artifact) by looking at its last two file extensions, e.g. ".pdf" or ".ocr.md"
  const regex = /^(.*?)(\.[^.]+)?(\.[^.]+)?$/; // Matches the last two extensions
  const match = fullInputPath.match(regex);
  if (!match) {
    throw new Error(`Failed to parse input file path: ${fullInputPath}`);
  }

  const [, , firstExt, secondExt] = match;
  // want ".pdf" or ".ocr.md" or ".llm.md" or ".bloom.md" by combining the last two extensions with a dot

  const ext = [firstExt, secondExt].filter(Boolean).join("");

  let inputType: Artifact;
  switch (ext) {
    case ".pdf":
      inputType = Artifact.PDF;
      break;
    case ".md":
    case ".ocr.md":
      inputType = Artifact.MarkdownFromOCR;
      break;
    case ".llm.md":
      inputType = Artifact.MarkdownFromLLM;
      break;
    case ".bloom.md":
      inputType = Artifact.MarkdownReadyForBloom;
      break;
    default:
      throw new Error(
        `Unsupported input file type: ${ext}. Supported types: .pdf, .md, .ocr.md, .llm.md, .bloom.md`
      );
  }

  logger.info(`Input file: "${fullInputPath}" (Type: ${inputType})`);

  const targetType = cliArguments.target ?? Artifact.HTML;

  logger.info(`Target format: ${artifactNames[targetType]}`);

  const { mistralKey, openrouterKey } = getApiKeys(cliArguments);

  if (
    inputType === Artifact.PDF &&
    cliArguments.ocrMethod === "mistral" &&
    !mistralKey
  ) {
    // we are going to have to do OCR, need the key
    throw new Error(
      "Mistral API key is required for PDF to Bloom conversion. Provide --mistral-api-key or set MISTRAL_API_KEY environment variable, or use --ocr unpdf for local processing."
    );
  }

  if (
    inputType === Artifact.PDF &&
    cliArguments.ocrMethod !== "mistral" &&
    cliArguments.ocrMethod !== "unpdf" &&
    !openrouterKey
  ) {
    // we are going to use OpenRouter for OCR, need the key
    throw new Error(
      "OpenRouter API key is required for OpenRouter OCR models. Provide --openrouter-key or set OPENROUTER_KEY environment variable."
    );
  }
  if (
    inputType < Artifact.MarkdownFromLLM &&
    targetType >= Artifact.MarkdownFromLLM &&
    !openrouterKey
  ) {
    // we are going to have to do call the LLM, need the key
    throw new Error(
      "OpenRouter API key is required for PDF to Bloom conversion. Provide --openrouter-key or set OPENROUTER_KEY environment variable."
    );
  }

  logger.verbose(
    `fullInputPath: ${fullInputPath} cliOutput: ${cliArguments.output} cliCollection: ${cliArguments.collection}`
  );

  // Handle collection path validation and setup
  let collectionFolderPath: string | undefined;
  let baseOutputDir: string;

  if (cliArguments.collection) {
    // Validate and resolve collection path
    const { collectionFolderPath: resolvedCollectionPath } =
      await validateAndResolveCollectionPath(cliArguments.collection);
    collectionFolderPath = resolvedCollectionPath;
    baseOutputDir = collectionFolderPath;
    logger.info(`Using Bloom collection folder: ${collectionFolderPath}`);
  } else {
    // Fall back to the old logic
    // - If output directory is specified, use it. If a book directory will be created, it will be inside this directory.
    // - If no output directory specified and inputType = PDF, create the book directory in the current working directory
    // - If no output directory specified and inputType != PDF, send all output to the same directory as the input file
    baseOutputDir =
      cliArguments.output ||
      (inputType === Artifact.PDF
        ? process.cwd()
        : path.dirname(fullInputPath));
  }

  logger.verbose(`Output directory: ${baseOutputDir}`);
  const baseName = getFileNameWithoutExtension(
    getFileNameWithoutExtension(fullInputPath)
  );

  // when testing, we often don't want to OCR all over again, so we start with one of the md files, which
  // is already in the book directory, and we just want to write everything into there.
  const bookDir =
    inputType === Artifact.PDF
      ? path.join(baseOutputDir, baseName)
      : baseOutputDir;

  // if inputType is PDF, set the baseOutputDir to the book directory so that all results go in there
  if (inputType === Artifact.PDF) {
    logger.info(`Creating book directory: ${bookDir}`);
    // Ensure the book directory exists
    await fs.mkdir(bookDir, { recursive: true });
    baseOutputDir = bookDir; // All outputs will go into the book directory
  }
  const plan = {
    pdfPath: inputType === Artifact.PDF ? fullInputPath : undefined,
    markdownFromOCRPath:
      inputType === Artifact.MarkdownFromOCR
        ? fullInputPath
        : path.join(baseOutputDir, baseName + ".ocr.md"),
    markdownFromLLMPath: path.join(baseOutputDir, baseName + ".raw-llm.md"),
    markdownCleanedAfterLLMPath:
      inputType === Artifact.MarkdownFromLLM
        ? fullInputPath
        : path.join(baseOutputDir, baseName + ".llm.md"),
    markdownForBloomPath:
      inputType === Artifact.MarkdownReadyForBloom
        ? fullInputPath
        : path.join(baseOutputDir, baseName + ".bloom.md"),

    bookFolderPath: bookDir,
    collectionFolderPath,

    inputArtifact: inputType,
    targetArtifact: targetType,
    verbose: cliArguments.verbose ?? false,
    mistralKey,
    openrouterKey,
    promptPath: cliArguments.promptPath,
    modelName: cliArguments.modelName,
    ocrMethod: cliArguments.ocrMethod,
    parserEngine: cliArguments.parserEngine,
  };
  //console.log(`Plan created:`, JSON.stringify(plan, null, 2));

  return plan;
}
