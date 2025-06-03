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
  logCallback: (log: LogEntry) => void
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
    const enrichmentLLMResult = await enrichMarkdown(
      markdown,
      openRouterApiKey,
      {
        logCallback,
      }
    );
    // write out the enrichment.result.markdownResultFromEnrichmentLLM and enrichment.result.cleanedUpMarkdown to files in the output directory
    const markdownPath = path.join(outputDir, "enriched_markdown.md");
    logger.info(`Saving enriched markdown to: ${markdownPath}`);
    await fs.promises.writeFile(
      markdownPath,
      enrichmentLLMResult.markdownResultFromEnrichmentLLM,
      "utf8"
    );
    const cleanedupMarkdownPath = path.join(outputDir, "cleanedup_markdown.md");
    logger.info(`Saving cleaned up markdown to: ${cleanedupMarkdownPath}`);
    await fs.promises.writeFile(
      cleanedupMarkdownPath,
      enrichmentLLMResult.cleanedupMarkdown,
      "utf8"
    );

    if (!enrichmentLLMResult.valid) {
      logger.error("Enrichment LLM result is not valid, aborting conversion");
      throw new Error("Enrichment LLM result is not valid");
    }

    const bloomHtml = await enrichedMarkdownToBloomHtml(
      enrichmentLLMResult.cleanedupMarkdown,

      logCallback
    );
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
