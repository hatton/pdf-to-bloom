import { Command } from "commander";
import chalk from "chalk";
import { existsSync } from "fs"; // Import the synchronous existsSync function
import * as path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { processConversion } from "./process";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

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
