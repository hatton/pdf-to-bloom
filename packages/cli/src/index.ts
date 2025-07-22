import { Command } from "commander";
import chalk from "chalk";
import { fileURLToPath } from "url";
import {
  Arguments,
  Artifact,
  PdfProcessor,
  processConversion,
} from "./process";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);

const program = new Command();

// --- Commander.js Setup ---
program
  .name("pdf-to-bloom")
  .description("Convert PDF documents to Bloom-compatible HTML format")
  .version("1.0.0");

// Main command: Handles both web app start and file conversions
program
  .argument(
    "<input>",
    "Path to input file ending in .pdf,  .ocr.md, .llm.md, or .bloom.md."
  )
  .option(
    "-t, --target <target>",
    "Target format: markdown (just ocr of the PDF), tagged (run through LLM and other processing), or bloom. Default is bloom."
  )
  .option(
    "-c, --collection <path>",
    "Path to Bloom collection folder or .bloomCollection file. This is the recommended way to specify where to create the book, as it provides language settings for better processing."
  )
  .option(
    "-o, --output <path>",
    "Directory in which a new directory will be created based on the input file name. Defaults to your current working directory. (Use --collection instead for better language detection)"
  )
  .option(
    "--mistral-api-key <key>",
    "Mistral AI API key (for PDF processing and general LLM interactions)"
  )
  .option(
    "--openrouter-key <key>",
    "OpenRouter API key (for enrichment and potentially advanced Bloom HTML generation)"
  )
  .option(
    "--prompt <path>",
    "Path to custom prompt file to override the built-in LLM prompt"
  )
  .option(
    "--model <model>",
    "OpenRouter model name to use for LLM enrichment (e.g., 'google/gemini-2.5-flash')"
  )
  .option(
    "--pdf <method>",
    "PDF processing method: 'mistral' (default, vision-based OCR) or 'unpdf' (experimental structural extraction). Note: unpdf extracts all text from PDF structure, including hidden layers that may not be visually rendered.",
    "mistral"
  )
  .option("--verbose", "Enable verbose logging to see detailed process steps")
  .action(async (input, options) => {
    if (input) {
      const args: Arguments = {
        input,
        target: getTarget(options.target),
        output: options.output,
        collection: options.collection,
        mistralApiKey: options.mistralApiKey || process.env.MISTRAL_API_KEY,
        openrouterKey: options.openrouterKey || process.env.OPENROUTER_KEY,
        promptPath: options.prompt,
        modelName: options.model,
        verbose: options.verbose || false,
        pdfProcessor:
          options.pdf === "unpdf" ? PdfProcessor.Unpdf : PdfProcessor.Mistral,
      };

      await processConversion(input, args);
    } else {
      // This should never happen now since input is required, but kept for robustness
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
function getTarget(target: any): Artifact {
  switch (target) {
    case "markdown":
      return Artifact.MarkdownFromOCR;
    case "tagged":
      return Artifact.MarkdownReadyForBloom;
    case "bloom":
      return Artifact.HTML;
    default:
      return Artifact.HTML;
  }
}
