import chalk from "chalk";

import * as fs from "fs/promises"; // Use promises API for async file operations
import * as path from "path";
import {
  makeMarkdownFromPDF,
  enrichMarkdown,
  makeBloomHtml,
  logger,
} from "@pdf-to-bloom/lib"; // Assuming these functions are async and return/handle as described
import {
  checkIfEnriched,
  cleanUpTempDir,
  copyFileToDest,
  createLogCallback,
  createTempDir,
  findMarkdownFileInDirectory,
  getApiKeys,
  getFileExtension,
  getFileNameWithoutExtension,
  isDirectory,
  readBloomCollectionSettingsIfFound,
} from "./processUtils";

enum InputType {
  PDF = "pdf",
  Markdown = "markdown", // unenriched
  EnrichedMarkdown = "enrichedMarkdown",
}

enum TargetType {
  Markdown = "markdown",
  Enriched = "enriched",
  Bloom = "bloom",
}

export async function processConversion(inputPathArg: string, options: any) {
  let tempDir: string | null = null;
  const { mistralKey, openrouterKey } = getApiKeys(options);
  const logCallback = createLogCallback(options.verbose);

  try {
    // 1. Resolve Input: Determine actual file path and its type
    const resolvedInputPath = path.resolve(inputPathArg);
    const isInputDirectory = await isDirectory(resolvedInputPath);
    let actualFilePath: string; // The specific file (e.g., .md inside a directory or the direct input file)
    let resolvedInputType: InputType;

    if (isInputDirectory) {
      const mdFile = await findMarkdownFileInDirectory(resolvedInputPath);
      if (!mdFile) {
        throw new Error(
          `No .md file found in input directory: ${resolvedInputPath}`
        );
      }
      actualFilePath = mdFile; // Set actualFilePath to the .md file found
      resolvedInputType = (await checkIfEnriched(actualFilePath))
        ? InputType.EnrichedMarkdown
        : InputType.Markdown;
      console.log(
        chalk.blue(
          `📄 Identified input as directory containing markdown file: ${path.basename(actualFilePath)}`
        )
      );
    } else {
      actualFilePath = resolvedInputPath; // Input is a direct file path
      const ext = getFileExtension(actualFilePath);
      if (ext === ".pdf") {
        resolvedInputType = InputType.PDF;
      } else if (ext === ".md") {
        resolvedInputType = (await checkIfEnriched(actualFilePath))
          ? InputType.EnrichedMarkdown
          : InputType.Markdown;
      } else {
        throw new Error(
          `Unsupported input file type: ${ext}. Supported types: .pdf, .md`
        );
      }
    }
    console.log(
      chalk.gray(`Input file: "${actualFilePath}" (Type: ${resolvedInputType})`)
    );

    // 2. Resolve Target: Determine the desired output format
    let resolvedTargetType: TargetType;
    if (!options.target) {
      // Default target if --target is not specified
      // Requirement: pdf-to-bloom path-to-some/directory --output some/directory implies bloom target
      // Requirement: pdf-to-bloom path-to-some/mybook.pdf (no target) implies bloom target
      resolvedTargetType = TargetType.Bloom;
      console.log(
        chalk.gray(`No target specified. Defaulting to: ${resolvedTargetType}`)
      );
    } else {
      switch (options.target.toLowerCase()) {
        case "markdown":
          resolvedTargetType = TargetType.Markdown;
          break;
        case "enriched":
          resolvedTargetType = TargetType.Enriched;
          break;
        case "bloom":
          resolvedTargetType = TargetType.Bloom;
          break;
        default:
          throw new Error(
            `Invalid target type: "${options.target}". Valid targets are: markdown, enriched, bloom.`
          );
      }
    }
    console.log(chalk.gray(`Target format: ${resolvedTargetType}`));

    // 3. Calculate Final Output Path: Determine where the final result should be saved
    let finalOutputPath: string;
    const inputFileNameWithoutExt = getFileNameWithoutExtension(actualFilePath);
    const inputBaseDir = path.dirname(actualFilePath);
    if (options.output) {
      // If --output is specified, create a subdirectory within it based on the input file name
      const outputBaseDir = path.resolve(options.output);
      switch (resolvedTargetType) {
        case TargetType.Markdown:
          finalOutputPath = path.join(
            outputBaseDir,
            `${inputFileNameWithoutExt}.md`
          );
          await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });
          break;
        case TargetType.Enriched:
          finalOutputPath = path.join(
            outputBaseDir,
            `${inputFileNameWithoutExt}.enriched.md`
          );
          await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });
          break;
        case TargetType.Bloom:
          finalOutputPath = path.join(
            outputBaseDir,
            `${inputFileNameWithoutExt}_bloom`
          );
          await fs.mkdir(finalOutputPath, { recursive: true });
          break;
      }
    } else {
      // If no --output is specified, derive it based on input type and target
      // For PDF inputs: use current working directory (traditional behavior)
      // For markdown inputs: use same directory as input, unless it contains "test-inputs/"
      let outputBaseDir: string;

      if (resolvedInputType === InputType.PDF) {
        // PDF inputs create output in current working directory
        outputBaseDir = process.cwd();
      } else {
        // Markdown inputs (plain or enriched) use same directory as input,
        // unless the path contains "test-inputs/" to avoid polluting test directories
        if (inputBaseDir.includes("test-inputs")) {
          outputBaseDir = process.cwd();
        } else {
          outputBaseDir = inputBaseDir;
        }
      }

      switch (resolvedTargetType) {
        case TargetType.Markdown:
          finalOutputPath = path.join(
            outputBaseDir,
            `${inputFileNameWithoutExt}.md`
          );
          break;
        case TargetType.Enriched:
          finalOutputPath = path.join(
            outputBaseDir,
            `${inputFileNameWithoutExt}.enriched.md`
          );
          break;
        case TargetType.Bloom:
          if (resolvedInputType === InputType.PDF) {
            // For PDF inputs, create a bloom folder
            finalOutputPath = path.join(
              outputBaseDir,
              `${inputFileNameWithoutExt}_bloom`
            );
            await fs.mkdir(finalOutputPath, { recursive: true });
          } else {
            // For markdown inputs, create HTML file directly in the same directory
            finalOutputPath = path.join(
              outputBaseDir,
              `${inputFileNameWithoutExt}.html`
            );
          }
          break;
      }
    }
    console.log(chalk.gray(`Final output path: "${finalOutputPath}"`)); // --- Conversion Orchestration: Execute the necessary transformation steps ---
    console.log(
      chalk.blue(
        `🔄 Starting conversion pipeline from ${resolvedInputType} to ${resolvedTargetType}...`
      )
    ); // Note: We always use the step-by-step pipeline approach instead of pdfToBloomFolder()
    // to create intermediate files that can be inspected for debugging purposes

    // Validate API keys early for PDF to Bloom conversion
    if (
      resolvedInputType === InputType.PDF &&
      resolvedTargetType === TargetType.Bloom
    ) {
      if (!mistralKey) {
        throw new Error(
          "Mistral API key is required for PDF to Bloom conversion. Provide --mistral-api-key or set MISTRAL_API_KEY environment variable."
        );
      }
      if (!openrouterKey) {
        throw new Error(
          "OpenRouter API key is required for PDF to Bloom conversion. Provide --openrouter-key or set OPENROUTER_KEY environment variable."
        );
      }
    }

    // For all other conversion paths, follow the staged pipeline:
    // PDF -> Markdown -> Enriched Markdown -> Bloom HTML    // Determine if intermediate output files should be stored in a temporary directory.
    // For debugging purposes, we'll always save intermediate files next to the input
    // so they can be inspected.
    const useTempForIntermediate = false;

    if (useTempForIntermediate) {
      tempDir = await createTempDir();
      console.log(
        chalk.gray(
          `Using temporary directory for intermediate files: "${tempDir}"`
        )
      );
    }

    // Initialize current state of the file being processed
    let currentProcessingFilePath = actualFilePath;
    let currentProcessingFileType = resolvedInputType;
    let currentProcessingBaseName = getFileNameWithoutExtension(
      currentProcessingFilePath
    ); // Step 1: Convert PDF to Markdown (if input is PDF)
    if (currentProcessingFileType === InputType.PDF) {
      if (!mistralKey) {
        throw new Error(
          "Mistral API key is required for PDF to Markdown conversion. Provide --mistral-api-key or set MISTRAL_API_KEY environment variable."
        );
      } // Path for the markdown output file (either temp or final)
      let markdownOutputLocation: string;
      if (useTempForIntermediate) {
        markdownOutputLocation = path.join(
          tempDir!,
          `${currentProcessingBaseName}.md`
        );
      } else if (resolvedTargetType === TargetType.Markdown) {
        markdownOutputLocation = finalOutputPath;
      } else {
        // create it in the bloom output directory
        markdownOutputLocation = path.join(
          finalOutputPath,
          `${currentProcessingBaseName}.md`
        );
      }
      console.log(chalk.blue(`-> Converting PDF to Markdown...`));
      // makeMarkdownFromPDF returns the markdown content string and writes associated images
      const markdownContent = await makeMarkdownFromPDF(
        currentProcessingFilePath,
        path.dirname(markdownOutputLocation),
        mistralKey,
        logCallback
      );
      logger.info(`Writing OCR'd markdown to: ${markdownOutputLocation}`);
      console.log(
        chalk.gray(
          `📝 Creating intermediate markdown file: ${markdownOutputLocation}`
        )
      );
      await fs.writeFile(markdownOutputLocation, markdownContent); // Write the markdown content to file

      currentProcessingFilePath = markdownOutputLocation; // Update current file path
      currentProcessingFileType = InputType.Markdown; // Update current file type
      currentProcessingBaseName = getFileNameWithoutExtension(
        currentProcessingFilePath
      ); // Update base name

      // If Markdown was the final target, we're done here
      if (resolvedTargetType === TargetType.Markdown) {
        if (useTempForIntermediate) {
          // If it was written to temp, copy to final destination.
          await copyFileToDest(currentProcessingFilePath, finalOutputPath);
        }
        console.log(
          chalk.green("✅ PDF to Markdown conversion completed successfully!")
        );
        console.log(chalk.blue(`📄 Output saved to: "${finalOutputPath}"`));
        return;
      }
    } // Step 2: Enrich Markdown (if current file is Markdown and needs enrichment)
    // This step is skipped if the input was already EnrichedMarkdown
    if (currentProcessingFileType === InputType.Markdown) {
      if (!openrouterKey) {
        throw new Error(
          "OpenRouter API key is required for markdown enrichment. Provide --openrouter-key or set OPENROUTER_KEY environment variable."
        );
      } // Path for the enriched markdown output file (either temp or final)
      let enrichedMarkdownOutputLocation: string;
      if (useTempForIntermediate) {
        enrichedMarkdownOutputLocation = path.join(
          tempDir!,
          `${currentProcessingBaseName}.enriched.md`
        );
      } else if (resolvedTargetType === TargetType.Enriched) {
        enrichedMarkdownOutputLocation = finalOutputPath;
      } else {
        // For intermediate enriched markdown when target is bloom
        if (
          resolvedInputType === InputType.PDF ||
          finalOutputPath.endsWith("_bloom")
        ) {
          // If finalOutputPath is a directory (PDF input or explicit bloom folder), create intermediate file inside it
          enrichedMarkdownOutputLocation = path.join(
            finalOutputPath,
            `${currentProcessingBaseName}.enriched.md`
          );
        } else {
          // If finalOutputPath is an HTML file (markdown input), create intermediate file in same directory
          enrichedMarkdownOutputLocation = path.join(
            path.dirname(finalOutputPath),
            `${currentProcessingBaseName}.enriched.md`
          );
        }
      }
      console.log(chalk.blue(`-> Enriching Markdown...`));
      const markdownContentToEnrich = await fs.readFile(
        currentProcessingFilePath,
        "utf-8"
      );
      // For markdown enrichment, if the input is from a Bloom collection, try to get language info from collection settings
      const inputFolder = path.dirname(currentProcessingFilePath);
      const langs = await readBloomCollectionSettingsIfFound(inputFolder);
      // put to the console whether we found the languages
      if (langs) {
        console.log(
          chalk.blue(
            `Supplying info from collection settings: L1: ${langs.l1}, L2: ${langs.l2}, L3: ${langs.l3}`
          )
        );
      } else {
        console.log(chalk.red("No a priori language info found."));
      }

      // Enrich the markdown content using the enrichment function

      const result = await enrichMarkdown(
        markdownContentToEnrich,
        openrouterKey,
        { logCallback, l1: langs?.l1, l2: langs?.l2, l3: langs?.l3 }
      );
      logger.info(
        `Writing uncleaned enriched markdown to: ${enrichedMarkdownOutputLocation.replace(".enriched.", ".fromLLM.enriched.")}`
      );
      await fs.writeFile(
        enrichedMarkdownOutputLocation.replace(
          ".enriched.",
          ".fromLLM.enriched."
        ),
        result.markdownResultFromEnrichmentLLM
      );

      logger.info(
        `Writing cleaned enriched markdown to: ${enrichedMarkdownOutputLocation}`
      );

      await fs.writeFile(
        enrichedMarkdownOutputLocation,
        result.cleanedUpMarkdown
      );

      if (!result.valid) {
        throw new Error(
          `Enrichment process returned invalid content. This can be a result of the mode/prompt. You may be able to see errors in the file "${enrichedMarkdownOutputLocation}" for details.`
        );
      }
      currentProcessingFilePath = enrichedMarkdownOutputLocation; // Update current file path
      currentProcessingFileType = InputType.EnrichedMarkdown; // Update current file type
      currentProcessingBaseName = getFileNameWithoutExtension(
        currentProcessingFilePath
      ); // Update base name

      // If Enriched Markdown was the final target, we're done here
      if (resolvedTargetType === TargetType.Enriched) {
        if (useTempForIntermediate) {
          // If it was written to temp, copy to final destination
          await copyFileToDest(currentProcessingFilePath, finalOutputPath);
        }
        console.log(
          chalk.green("✅ Markdown enrichment completed successfully!")
        );
        console.log(chalk.blue(`📄 Output saved to: "${finalOutputPath}"`));
        return;
      }
    }
    // If the input was originally EnrichedMarkdown, this step is naturally skipped,
    // and currentProcessingFileType remains InputType.EnrichedMarkdown.    // Step 3: Convert Enriched Markdown to Bloom HTML (if current file is Enriched Markdown)
    if (currentProcessingFileType === InputType.EnrichedMarkdown) {
      if (resolvedTargetType === TargetType.Bloom) {
        console.log(
          chalk.blue(`-> Converting Enriched Markdown to Bloom HTML...`)
        );
        const enrichedMarkdownContent = await fs.readFile(
          currentProcessingFilePath,
          "utf-8"
        ); // makeBloomHtml returns the HTML content string
        const bloomHtmlContent = await makeBloomHtml(
          enrichedMarkdownContent,
          logCallback
        );

        // Check if finalOutputPath is a directory or a file path
        if (
          resolvedInputType === InputType.PDF ||
          finalOutputPath.endsWith("_bloom")
        ) {
          // For PDF inputs or when explicitly creating a bloom folder, save as index.html in the directory
          await fs.writeFile(
            path.join(finalOutputPath, "index.html"),
            bloomHtmlContent
          );
        } else {
          // For markdown inputs, save directly as the HTML file
          await fs.writeFile(finalOutputPath, bloomHtmlContent);
        }

        console.log(
          chalk.green("✅ Conversion to Bloom HTML completed successfully!")
        );
        console.log(chalk.blue(`📄 Output saved to: "${finalOutputPath}"`));
        return;
      }
    }

    // If execution reaches this point, it means an unsupported or unhandled conversion path was requested.
    throw new Error(
      `Unhandled conversion scenario: Input "${resolvedInputType}", Target "${resolvedTargetType}".`
    );
  } catch (error: any) {
    console.error(chalk.red("❌ Error during conversion:"));
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1); // Exit with an error code
  } finally {
    // Ensure temporary directory is cleaned up regardless of success or failure
    if (tempDir) {
      await cleanUpTempDir(tempDir);
    }
  }
}
