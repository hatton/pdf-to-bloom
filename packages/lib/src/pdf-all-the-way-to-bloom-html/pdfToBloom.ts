import { logger, LogEntry } from "../logger";
import { pdfToMarkdownAndImageFiles } from "../pdf-to-markdown-and-images/pdfToMarkdownAndImageFiles";
import { enrichMarkdown } from "../enrich-markdown/enrichMarkdown";
import { enrichedMarkdownToBloomHtml } from "../enriched-markdown-to-bloom-html/enrichedMarkdownToBloomHtml";
import fs from "fs";
import path from "path";

export async function pdfToBloomFolder(
  pdfPath: string,
  outputDir: string,
  mistralApiKey: string,
  openRouterApiKey: string,
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
    const enrichedMarkdown = await enrichMarkdown(markdown, openRouterApiKey, {
      logCallback,
    });
    logger.verbose("Markdown enrichment completed");
    const bloomHtml = await enrichedMarkdownToBloomHtml(enrichedMarkdown, {
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
