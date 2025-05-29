import { Command } from "commander";
import chalk from "chalk";
import {
  pdfToBloomFolder,
  makeMarkdownFromPDF,
  enrichMarkdown,
  makeBloomHtml,
} from "@pdf-to-bloom/lib"; // Assuming these functions are async and return/handle as described
import * as fs from "fs/promises"; // Use promises API for async file operations
import { existsSync } from "fs"; // Import the synchronous existsSync function
import * as path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import os from "os"; // For temporary directory creation

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// --- Enums for clarity and type safety ---
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

// --- Helper Functions from original code, slightly adapted for async/promises ---

function getApiKeys(options: any) {
  const mistralKey = options.mistralApiKey || process.env.MISTRAL_API_KEY;
  const openrouterKey = options.openrouterKey || process.env.OPENROUTER_KEY;
  return { mistralKey, openrouterKey };
}

function createLogCallback(verbose: boolean) {
  return verbose
    ? (log: any) => {
        const timestamp = new Date().toISOString();
        console.log(chalk.gray(`[${timestamp}] ${log.level}: ${log.message}`));
      }
    : undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(inputPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(inputPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// More robust check for YAML front matter presence
async function checkIfEnriched(filePath: string): Promise<boolean> {
  if (!(await fileExists(filePath))) return false;
  const content = await fs.readFile(filePath, "utf-8");
  // Check for '---' at the very beginning (trimmed), followed by content, then another '---'
  // (which typically implies a YAML block end marker, on a new line or not)
  return content.trim().startsWith("---") && content.includes("---", 3);
}

function getFileNameWithoutExtension(filePath: string): string {
  return path.parse(filePath).name;
}

function getFileExtension(filePath: string): string {
  return path.parse(filePath).ext;
}

async function findMarkdownFileInDirectory(
  dirPath: string
): Promise<string | null> {
  const files = await fs.readdir(dirPath);
  const mdFiles = files.filter((f) => f.toLowerCase().endsWith(".md"));
  if (mdFiles.length === 0) {
    return null;
  } else if (mdFiles.length === 1) {
    return path.join(dirPath, mdFiles[0]);
  } else {
    // If multiple .md files exist, warn and pick the first one as per original code.
    // In a real-world scenario, you might want to throw an error or ask the user to specify.
    console.warn(
      chalk.yellow(
        `Warning: Multiple .md files found in ${dirPath}. Using the first one: ${mdFiles[0]}`
      )
    );
    return path.join(dirPath, mdFiles[0]);
  }
}

async function createTempDir(): Promise<string> {
  // Creates a unique temporary directory
  return fs.mkdtemp(path.join(os.tmpdir(), "pdf-to-bloom-"));
}

async function cleanUpTempDir(dirPath: string) {
  if (dirPath && (await fileExists(dirPath))) {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(chalk.gray(`Cleaned up temporary directory: ${dirPath}`));
  }
}

async function copyFileToDest(src: string, dest: string) {
  await fs.mkdir(path.dirname(dest), { recursive: true }); // Ensure target directory exists
  await fs.copyFile(src, dest);
}

// Helper function to start web app
function startWebApp() {
  console.log(chalk.blue("🚀 Starting web application..."));

  // Try to find the web package in common monorepo structures
  const possibleWebPaths = [
    path.resolve(__dirname, "../../../web"), // e.g., if cli/dist is inside cli/src
    path.resolve(__dirname, "../../web"), // e.g., if cli/src
    path.resolve(process.cwd(), "packages/web"), // Common monorepo pattern
    path.resolve(process.cwd(), "web"), // If running from project root and web is direct child
  ];
  let webPath: string | null = null;
  for (const webPathCandidate of possibleWebPaths) {
    // existsSync is synchronous, which is acceptable for a startup check
    if (existsSync(path.join(webPathCandidate, "package.json"))) {
      webPath = webPathCandidate;
      break;
    }
  }

  if (webPath) {
    console.log(chalk.gray(`Found web package at: ${webPath}`));
    // Use yarn dev to start the web app
    const child = spawn("yarn", ["dev"], {
      cwd: webPath,
      stdio: "inherit", // Pipe child process stdout/stderr to parent
      shell: true, // Use shell to find 'yarn' command
    });

    child.on("error", (error) => {
      console.error(
        chalk.red("❌ Failed to start web application:"),
        error.message
      );
      process.exit(1);
    });
  } else {
    console.error(
      chalk.red(
        "❌ Web application not found. Please ensure you're running from a pdf-to-bloom workspace or that the 'web' package is installed."
      )
    );
    console.log(
      chalk.blue(
        "💡 Tip: Run from the root of the pdf-to-bloom project (`yarn dev`), or install the web package (`yarn install` in its directory)."
      )
    );
    process.exit(1);
  }
}

// --- Main CLI Logic for Conversions ---

async function processConversion(inputPathArg: string, options: any) {
  let tempDir: string | null = null; // Variable to hold path to temporary directory
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
      // If --output is specified, use it directly (resolved relative to current working directory)
      finalOutputPath = path.resolve(options.output);
      // Ensure the directory for the final output exists
      if (resolvedTargetType === TargetType.Bloom) {
        // Bloom HTML is a directory, so create it directly
        await fs.mkdir(finalOutputPath, { recursive: true });
      } else {
        // For markdown or enriched, create the parent directory of the output file
        await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });
      }
    } else {
      // If no --output is specified, derive it based on input and target
      switch (resolvedTargetType) {
        case TargetType.Markdown:
          finalOutputPath = path.join(
            inputBaseDir,
            `${inputFileNameWithoutExt}.md`
          );
          break;
        case TargetType.Enriched:
          finalOutputPath = path.join(
            inputBaseDir,
            `${inputFileNameWithoutExt}.enriched.md`
          );
          break;
        case TargetType.Bloom:
          finalOutputPath = path.join(
            inputBaseDir,
            `${inputFileNameWithoutExt}_bloom`
          ); // Bloom output is a folder
          await fs.mkdir(finalOutputPath, { recursive: true }); // Ensure the Bloom output folder exists
          break;
      }
    }
    console.log(chalk.gray(`Final output path: "${finalOutputPath}"`));

    // --- Conversion Orchestration: Execute the necessary transformation steps ---
    console.log(
      chalk.blue(
        `🔄 Starting conversion pipeline from ${resolvedInputType} to ${resolvedTargetType}...`
      )
    ); // Special Case: Direct PDF to Bloom HTML conversion using pdfToBloomFolder()
    // This is explicitly called out in the requirements and is an optimized path in the library.
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
      // pdfToBloomFolder handles the entire A -> D pipeline internally
      await pdfToBloomFolder(
        actualFilePath,
        finalOutputPath,
        mistralKey,
        openrouterKey,
        logCallback
      );
      console.log(
        chalk.green(
          "✅ PDF to Bloom conversion completed successfully via direct path!"
        )
      );
      console.log(chalk.blue(`📄 Output saved to: "${finalOutputPath}"`));
      return; // Exit as conversion is complete
    }

    // For all other conversion paths, follow the staged pipeline:
    // PDF -> Markdown -> Enriched Markdown -> Bloom HTML

    // Determine if intermediate output files should be stored in a temporary directory.
    // They should go to temp UNLESS the current target IS that intermediate file type
    // AND the user has NOT specified an explicit --output path (meaning, save next to input).
    const useTempForIntermediate =
      !(resolvedTargetType === TargetType.Markdown && !options.output) &&
      !(resolvedTargetType === TargetType.Enriched && !options.output);

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
    );

    // Step 1: Convert PDF to Markdown (if input is PDF)
    if (currentProcessingFileType === InputType.PDF) {
      if (!mistralKey) {
        throw new Error(
          "Mistral API key is required for PDF to Markdown conversion. Provide --mistral-api-key or set MISTRAL_API_KEY environment variable."
        );
      }
      // Path for the markdown output file (either temp or final)
      const markdownOutputLocation = useTempForIntermediate
        ? path.join(tempDir!, `${currentProcessingBaseName}.md`)
        : finalOutputPath;

      console.log(chalk.blue(`-> Converting PDF to Markdown...`));
      // makeMarkdownFromPDF returns the markdown content string and writes associated images
      const markdownContent = await makeMarkdownFromPDF(
        currentProcessingFilePath,
        path.dirname(markdownOutputLocation),
        mistralKey,
        logCallback
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
          // If it was written to temp, copy to final destination
          await copyFileToDest(currentProcessingFilePath, finalOutputPath);
        }
        console.log(
          chalk.green("✅ PDF to Markdown conversion completed successfully!")
        );
        console.log(chalk.blue(`📄 Output saved to: "${finalOutputPath}"`));
        return;
      }
    }

    // Step 2: Enrich Markdown (if current file is Markdown and needs enrichment)
    // This step is skipped if the input was already EnrichedMarkdown
    if (currentProcessingFileType === InputType.Markdown) {
      if (!openrouterKey) {
        throw new Error(
          "OpenRouter API key is required for markdown enrichment. Provide --openrouter-key or set OPENROUTER_KEY environment variable."
        );
      }
      // Path for the enriched markdown output file (either temp or final)
      const enrichedMarkdownOutputLocation = useTempForIntermediate
        ? path.join(tempDir!, `${currentProcessingBaseName}.enriched.md`)
        : finalOutputPath;

      console.log(chalk.blue(`-> Enriching Markdown...`));
      const markdownContentToEnrich = await fs.readFile(
        currentProcessingFilePath,
        "utf-8"
      );
      const enrichedMarkdownContent = await enrichMarkdown(
        markdownContentToEnrich,
        openrouterKey,
        { logCallback }
      );
      await fs.writeFile(
        enrichedMarkdownOutputLocation,
        enrichedMarkdownContent
      ); // Write enriched markdown content to file

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
    // and currentProcessingFileType remains InputType.EnrichedMarkdown.

    // Step 3: Convert Enriched Markdown to Bloom HTML (if current file is Enriched Markdown)
    if (currentProcessingFileType === InputType.EnrichedMarkdown) {
      if (resolvedTargetType === TargetType.Bloom) {
        // OpenRouter key is often optional for makeBloomHtml, but useful for advanced features
        if (!openrouterKey) {
          console.warn(
            chalk.yellow(
              "Warning: OpenRouter API key not provided. Some advanced Bloom HTML generation features might be limited."
            )
          );
        }
        console.log(
          chalk.blue(`-> Converting Enriched Markdown to Bloom HTML...`)
        );
        const enrichedMarkdownContent = await fs.readFile(
          currentProcessingFilePath,
          "utf-8"
        );
        // makeBloomHtml returns the HTML content string, which we then write to index.html in the bloom folder
        const bloomHtmlContent = await makeBloomHtml(
          enrichedMarkdownContent,
          openrouterKey,
          { logCallback }
        );
        await fs.writeFile(
          path.join(finalOutputPath, "index.html"),
          bloomHtmlContent
        ); // Save as index.html in the bloom directory

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

// --- Commander.js Setup ---
program
  .name("pdf-to-bloom")
  .description("Convert PDF documents to Bloom-compatible HTML format")
  .version("1.0.0");

// Main command: Handles both web app start and file conversions
program
  .argument(
    "[input]",
    "Path to input file (PDF, markdown) or directory. Omit this argument to start the web app."
  )
  .option(
    "-t, --target <target>",
    "Target format: bloom, markdown, or enriched. Default is 'bloom'."
  )
  .option(
    "-o, --output <path>",
    "Output directory or file path. Defaults to same directory as input (or a derived name for Bloom output)."
  )
  .option(
    "--mistral-api-key <key>",
    "Mistral AI API key (for PDF processing and general LLM interactions)"
  )
  .option(
    "--openrouter-key <key>",
    "OpenRouter API key (for enrichment and potentially advanced Bloom HTML generation)"
  )
  .option("--verbose", "Enable verbose logging to see detailed process steps")
  .action(async (input, options) => {
    // If no input path is provided, and no conversion options are specified, start the web app
    if (!input && !options.target && !options.output) {
      startWebApp();
      return;
    }

    // If an input path is provided, proceed with conversion
    if (input) {
      await processConversion(input, options);
    } else {
      // If no input path, but options like --target or --output are given, it's an error.
      // E.g., `pdf-to-bloom --target=markdown` without an input file doesn't make sense.
      console.error(
        chalk.red(
          "❌ Error: Input path is required for file conversion operations."
        )
      );
      console.log(
        chalk.blue("💡 Tip: Use 'pdf-to-bloom --help' for usage instructions.")
      );
      process.exit(1);
    }
  });

// Removed the 'convert' command as its functionality is now absorbed by the main command's `action` handler.

// Version command (kept as is)
program
  .command("version")
  .description("Show version information for the pdf-to-bloom CLI")
  .action(() => {
    console.log(chalk.blue("pdf-to-bloom CLI v1.0.0"));
    console.log(
      chalk.gray("A tool for converting PDF documents to Bloom format")
    );
  });

// Handle unknown commands gracefully
program.on("command:*", () => {
  console.error(chalk.red("❌ Invalid command: %s"), program.args.join(" "));
  console.log(chalk.blue("See '--help' for a list of available commands."));
  process.exit(1);
});

// Parse command line arguments and execute the appropriate action
program.parse(process.argv);
