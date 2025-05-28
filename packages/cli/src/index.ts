#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { pdfToBloomFolder } from "@pdf-to-bloom/core";

const program = new Command();

program
  .name("pdf-to-bloom")
  .description("Convert PDF documents to Bloom-compatible HTML format")
  .version("1.0.0");

program
  .command("convert")
  .description("Convert a PDF file to Bloom HTML format")
  .requiredOption("-i, --input <path>", "Path to the input PDF file")
  .requiredOption("-o, --output <path>", "Output directory for generated files")
  .requiredOption("--mistral-key <key>", "Mistral AI API key")
  .option("--openrouter-key <key>", "OpenRouter API key for enrichment")
  .option("--skip-enrichment", "Skip the markdown enrichment step")
  .option("--verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔄 Starting PDF to Bloom conversion..."));

      const logCallback = options.verbose
        ? (log: any) => {
            const timestamp = new Date().toISOString();
            console.log(
              chalk.gray(`[${timestamp}] ${log.level}: ${log.message}`)
            );
          }
        : undefined;
      const bloomHtmlPath = await pdfToBloomFolder(
        options.input,
        options.output,
        options.mistralKey,
        logCallback
      );

      console.log(chalk.green("✅ Conversion completed successfully!"));
      console.log(chalk.blue(`📄 Output saved to: ${bloomHtmlPath}`));
    } catch (error) {
      console.error(chalk.red("❌ Error during conversion:"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error))
      );
      process.exit(1);
    }
  });

program
  .command("version")
  .description("Show version information")
  .action(() => {
    console.log(chalk.blue("pdf-to-bloom CLI v1.0.0"));
    console.log(
      chalk.gray("A tool for converting PDF documents to Bloom format")
    );
  });

// Handle unknown commands
program.on("command:*", () => {
  console.error(chalk.red("❌ Invalid command: %s"), program.args.join(" "));
  console.log(chalk.blue("See --help for a list of available commands."));
  process.exit(1);
});

// Show help if no arguments provided
if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);
