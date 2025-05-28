import { logger, LogEntry } from "./logger";
import { pdfToMarkdownAndImageFiles } from "./pdfToMarkdownAndImageFiles";
import { enrichMarkdown } from "./enrichMarkdown";
import { makeBloomHtml } from "./makeBloomHtml";
import fs from "fs";
import path from "path";

export async function pdfToBloomFolder(
  pdfPath: string,
  outputDir: string,
  mistralApiKey: string,
  logCallback?: (log: LogEntry) => void
): Promise<string> {
  if (logCallback) logger.subscribe(logCallback);

  try {
    // call pdfToMarkdownAndImageFiles, then pipe that to enrichMarkdown, then pipe that to makeBloomHtml
    logger.info(`Starting PDF to Bloom conversion for: ${pdfPath}`);
    const markdown = await pdfToMarkdownAndImageFiles(
      pdfPath,
      outputDir,
      mistralApiKey,
      logCallback
    );
    logger.verbose("PDF to Markdown conversion completed");
    const enrichedMarkdown = await enrichMarkdown(markdown, mistralApiKey, {
      logCallback,
    });
    logger.verbose("Markdown enrichment completed");
    const bloomHtml = await makeBloomHtml(enrichedMarkdown, mistralApiKey, {
      logCallback,
    });
    logger.verbose("Bloom HTML conversion completed");
    // Save the Bloom HTML to a file in the output directory
    const bloomHtmlPath = path.join(outputDir, "bloom.html");
    logger.info(`Saving Bloom HTML to: ${bloomHtmlPath}`);
    await fs.promises.writeFile(bloomHtmlPath, bloomHtml, "utf8");
    logger.info("Bloom HTML file created successfully");
    return bloomHtmlPath;
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}
