import { Command } from "commander";
import chalk from "chalk";
import { existsSync } from "fs"; // Import the synchronous existsSync function
import * as path from "path";
import { fileURLToPath } from "url";
import { Arguments, Artifact, processConversion } from "./process";
import { A } from "vitest/dist/chunks/environment.LoooBwUu.js";
import { get } from "http";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    "-o, --output <path>",
    "Directory in which a new directory will be created based on the input file name. Defaults to your current working directory."
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
    if (input) {
      const args: Arguments = {
        input,
        target: getTarget(options.target),
        output: options.output,
        mistralApiKey: options.mistralApiKey || process.env.MISTRAL_API_KEY,
        openrouterKey: options.openrouterKey || process.env.OPENROUTER_KEY,
        verbose: options.verbose || false,
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
