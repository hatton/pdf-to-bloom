#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import {
  pdfToBloomFolder,
  makeMarkdownFromPDF,
  enrichMarkdown,
  makeBloomHtml,
} from "@pdf-to-bloom/lib";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name("pdf-to-bloom")
  .description("Convert PDF documents to Bloom-compatible HTML format")
  .version("1.0.0");

// Helper function to get API keys from options or environment
function getApiKeys(options: any) {
  const mistralKey = options.mistralApiKey || process.env.MISTRAL_API_KEY;
  const openrouterKey = options.openrouterKey || process.env.OPENROUTER_KEY;

  return { mistralKey, openrouterKey };
}

// Helper function to create log callback
function createLogCallback(verbose: boolean) {
  return verbose
    ? (log: any) => {
        const timestamp = new Date().toISOString();
        console.log(chalk.gray(`[${timestamp}] ${log.level}: ${log.message}`));
      }
    : undefined;
}

// Helper function to check if markdown has YAML front matter
function hasYamlFrontMatter(markdown: string): boolean {
  return markdown.trim().startsWith("---");
}

// Helper function to start web app
function startWebApp() {
  console.log(chalk.blue("🚀 Starting web application..."));

  // Try to find the web package and start it
  // Look for web package in the workspace structure
  const possibleWebPaths = [
    path.resolve(__dirname, "../../../web"),
    path.resolve(__dirname, "../../web"),
    path.resolve(process.cwd(), "packages/web"),
    path.resolve(process.cwd(), "web"),
  ];

  let webPath = null;
  for (const webPathCandidate of possibleWebPaths) {
    if (fs.existsSync(path.join(webPathCandidate, "package.json"))) {
      webPath = webPathCandidate;
      break;
    }
  }

  if (webPath) {
    console.log(chalk.gray(`Found web package at: ${webPath}`));
    const child = spawn("yarn", ["dev"], {
      cwd: webPath,
      stdio: "inherit",
      shell: true,
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
        "❌ Web application not found. Please ensure you're running from a pdf-to-bloom workspace."
      )
    );
    console.log(
      chalk.blue(
        "💡 Tip: Run from the root of the pdf-to-bloom project, or install the web package."
      )
    );
    process.exit(1);
  }
}

// Main command with file input
program
  .argument("[input]", "Path to input file (PDF, markdown) or directory")
  .option(
    "--target <target>",
    "Target format: bloom, markdown, enriched",
    "bloom"
  )
  .option("--output <path>", "Output directory or file path")
  .option("--mistral-api-key <key>", "Mistral AI API key")
  .option("--openrouter-key <key>", "OpenRouter API key")
  .option("--verbose", "Enable verbose logging")
  .action(async (input, options) => {
    // If no input provided, start web app
    if (!input) {
      startWebApp();
      return;
    }

    const { mistralKey, openrouterKey } = getApiKeys(options);
    const logCallback = createLogCallback(options.verbose);

    try {
      const inputPath = path.resolve(input);
      const stats = fs.statSync(inputPath);

      if (stats.isDirectory()) {
        // Handle directory input - look for .md files
        await handleDirectoryInput(
          inputPath,
          options,
          mistralKey,
          openrouterKey,
          logCallback
        );
      } else if (stats.isFile()) {
        // Handle file input
        await handleFileInput(
          inputPath,
          options,
          mistralKey,
          openrouterKey,
          logCallback
        );
      } else {
        throw new Error(`Invalid input: ${inputPath}`);
      }
    } catch (error) {
      console.error(chalk.red("❌ Error during conversion:"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error))
      );
      process.exit(1);
    }
  });

async function handleDirectoryInput(
  inputPath: string,
  options: any,
  mistralKey: string,
  openrouterKey: string,
  logCallback: any
) {
  if (!options.output) {
    throw new Error("Output directory is required when input is a directory");
  }

  // Look for .md files in the directory
  const files = fs.readdirSync(inputPath);
  const mdFiles = files.filter((file) => file.endsWith(".md"));

  if (mdFiles.length === 0) {
    throw new Error("No .md files found in the input directory");
  }

  if (mdFiles.length > 1) {
    throw new Error(
      "Multiple .md files found. Please specify a single markdown file."
    );
  }

  const mdFilePath = path.join(inputPath, mdFiles[0]);
  const markdown = fs.readFileSync(mdFilePath, "utf8");

  console.log(chalk.blue(`📄 Found markdown file: ${mdFiles[0]}`));

  if (hasYamlFrontMatter(markdown)) {
    console.log(
      chalk.blue("✨ Markdown appears to be enriched (has YAML front matter)")
    );
    // Already enriched, convert to Bloom HTML
    const bloomHtml = await makeBloomHtml(markdown, openrouterKey, {
      logCallback,
    });

    const outputPath = path.join(options.output, "bloom.html");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, bloomHtml);

    console.log(chalk.green("✅ Conversion completed successfully!"));
    console.log(chalk.blue(`📄 Output saved to: ${outputPath}`));
  } else {
    console.log(chalk.blue("📝 Markdown needs enrichment first"));
    // Enrich first, then convert to Bloom HTML
    if (!openrouterKey) {
      throw new Error("OpenRouter API key is required for markdown enrichment");
    }

    const enrichedMarkdown = await enrichMarkdown(markdown, openrouterKey, {
      logCallback,
    });
    const bloomHtml = await makeBloomHtml(enrichedMarkdown, openrouterKey, {
      logCallback,
    });

    const outputPath = path.join(options.output, "bloom.html");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, bloomHtml);

    console.log(chalk.green("✅ Conversion completed successfully!"));
    console.log(chalk.blue(`📄 Output saved to: ${outputPath}`));
  }
}

async function handleFileInput(
  inputPath: string,
  options: any,
  mistralKey: string,
  openrouterKey: string,
  logCallback: any
) {
  const ext = path.extname(inputPath).toLowerCase();
  const baseName = path.basename(inputPath, ext);
  const inputDir = path.dirname(inputPath);

  if (ext === ".pdf") {
    await handlePdfInput(
      inputPath,
      baseName,
      inputDir,
      options,
      mistralKey,
      openrouterKey,
      logCallback
    );
  } else if (ext === ".md") {
    await handleMarkdownInput(
      inputPath,
      baseName,
      inputDir,
      options,
      mistralKey,
      openrouterKey,
      logCallback
    );
  } else {
    throw new Error(
      `Unsupported file type: ${ext}. Supported types: .pdf, .md`
    );
  }
}

async function handlePdfInput(
  inputPath: string,
  baseName: string,
  inputDir: string,
  options: any,
  mistralKey: string,
  openrouterKey: string,
  logCallback: any
) {
  if (!mistralKey) {
    throw new Error(
      "Mistral API key is required for PDF processing. Provide --mistral-api-key or set MISTRAL_API_KEY environment variable."
    );
  }

  const target = options.target || "bloom";

  switch (target) {
    case "bloom":
      // Full pipeline: PDF -> Markdown -> Enriched -> Bloom HTML
      const outputDir = options.output || inputDir;
      console.log(chalk.blue("🔄 Starting PDF to Bloom conversion..."));

      const bloomHtmlPath = await pdfToBloomFolder(
        inputPath,
        outputDir,
        mistralKey,
        logCallback
      );

      console.log(chalk.green("✅ Conversion completed successfully!"));
      console.log(chalk.blue(`📄 Output saved to: ${bloomHtmlPath}`));
      break;

    case "markdown":
      // PDF -> Markdown only
      const markdownOutputDir = options.output || inputDir;
      console.log(chalk.blue("🔄 Converting PDF to markdown..."));

      const markdown = await makeMarkdownFromPDF(
        inputPath,
        markdownOutputDir,
        mistralKey,
        logCallback
      );

      const markdownPath = path.join(markdownOutputDir, `${baseName}.md`);
      fs.writeFileSync(markdownPath, markdown);

      console.log(
        chalk.green("✅ Markdown conversion completed successfully!")
      );
      console.log(chalk.blue(`📄 Output saved to: ${markdownPath}`));
      break;

    case "enriched":
      // PDF -> Markdown -> Enriched Markdown
      if (!openrouterKey) {
        throw new Error(
          "OpenRouter API key is required for markdown enrichment. Provide --openrouter-key or set OPENROUTER_KEY environment variable."
        );
      }

      const enrichedOutputDir = options.output || inputDir;
      console.log(chalk.blue("🔄 Converting PDF to enriched markdown..."));

      const baseMarkdown = await makeMarkdownFromPDF(
        inputPath,
        enrichedOutputDir,
        mistralKey,
        logCallback
      );
      const enrichedMarkdown = await enrichMarkdown(
        baseMarkdown,
        openrouterKey,
        { logCallback }
      );

      const enrichedPath = path.join(
        enrichedOutputDir,
        `${baseName}.enriched.md`
      );
      fs.writeFileSync(enrichedPath, enrichedMarkdown);

      console.log(
        chalk.green("✅ Enriched markdown conversion completed successfully!")
      );
      console.log(chalk.blue(`📄 Output saved to: ${enrichedPath}`));
      break;

    default:
      throw new Error(
        `Invalid target: ${target}. Valid targets: bloom, markdown, enriched`
      );
  }
}

async function handleMarkdownInput(
  inputPath: string,
  baseName: string,
  inputDir: string,
  options: any,
  mistralKey: string,
  openrouterKey: string,
  logCallback: any
) {
  const target = options.target || "enriched";

  if (target === "enriched") {
    if (!openrouterKey) {
      throw new Error(
        "OpenRouter API key is required for markdown enrichment. Provide --openrouter-key or set OPENROUTER_KEY environment variable."
      );
    }

    const markdown = fs.readFileSync(inputPath, "utf8");
    console.log(chalk.blue("🔄 Enriching markdown..."));

    const enrichedMarkdown = await enrichMarkdown(markdown, openrouterKey, {
      logCallback,
    });

    const outputPath = options.output
      ? path.join(options.output, `${baseName}.enriched.md`)
      : path.join(inputDir, `${baseName}.enriched.md`);

    if (options.output) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, enrichedMarkdown);

    console.log(chalk.green("✅ Markdown enrichment completed successfully!"));
    console.log(chalk.blue(`📄 Output saved to: ${outputPath}`));
  } else {
    throw new Error(
      `Invalid target for markdown input: ${target}. For .md files, only 'enriched' target is supported.`
    );
  }
}

// Legacy convert command for backwards compatibility
program
  .command("convert")
  .description("Convert a PDF file to Bloom HTML format (legacy command)")
  .requiredOption("-i, --input <path>", "Path to the input PDF file")
  .requiredOption("-o, --output <path>", "Output directory for generated files")
  .requiredOption("--mistral-key <key>", "Mistral AI API key")
  .option("--openrouter-key <key>", "OpenRouter API key for enrichment")
  .option("--skip-enrichment", "Skip the markdown enrichment step")
  .option("--verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔄 Starting PDF to Bloom conversion..."));

      const logCallback = createLogCallback(options.verbose);
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

// Parse arguments first
program.parse(process.argv);
