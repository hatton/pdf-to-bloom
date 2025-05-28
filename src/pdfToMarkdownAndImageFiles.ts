import { logger, LogEntry } from "./logger";
import fs from "fs";
import path from "path";

/**
 * Converts a PDF file to markdown format
 * @param pdfPath - Path to the PDF file
 * @param mistralApiKey - MistralAI API key for processing
 * @param logCallback - Optional callback to receive log messages
 * @returns Promise resolving to markdown string
 */
export async function pdfToMarkdownAndImageFiles(
  pdfPath: string,
  outputDir: string,
  mistralApiKey: string,
  logCallback?: (log: LogEntry) => void
): Promise<string> {
  if (logCallback) logger.subscribe(logCallback);

  try {
    // Validate API key
    if (!mistralApiKey || mistralApiKey.trim() === "") {
      logger.error("MistralAI API key is required");
      throw new Error("MistralAI API key is required");
    }

    logger.info(`Starting PDF to markdown conversion for: ${pdfPath}`);

    const markdown =
      `# Document from ${pdfPath}\n\n` + "![Image](image1.png)\n";

    // save a pretend image1.png to the output directory
    fs.writeFileSync(
      path.join(outputDir, "image1.png"),
      "pretend image content"
    );

    logger.verbose("Processing completed");
    logger.info("PDF to markdown conversion completed successfully");
    return markdown;
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}
