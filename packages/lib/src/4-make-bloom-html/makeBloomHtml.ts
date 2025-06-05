import { logger, LogEntry } from "../logger.js";
import { MarkdownToBloomHtml } from "./md-to-bloom.js";
import { HtmlGenerator } from "./html-generator.js";

export interface MdBloomHtmlOptions {
  logCallback?: (log: LogEntry) => void;
}

/**
 * Converts enriched markdown to Bloom-compatible HTML format
 * @param enrichedMarkdown - Input enriched markdown string
 * @param options - Optional configuration options
 * @returns Promise resolving to HTML string formatted for Bloom
 */
export async function mdToBloomHtml(
  enrichedMarkdown: string,
  logCallback: (log: LogEntry) => void
): Promise<string> {
  logger.subscribe(logCallback);

  try {
    logger.info("Starting markdown to Bloom HTML conversion");

    const parser = new MarkdownToBloomHtml(undefined);
    const book = parser.parseMarkdownIntoABookObject(enrichedMarkdown);

    const htmlGenerator = new HtmlGenerator();
    let htmlContent = htmlGenerator.generateHtmlDocument(book);

    logger.info(
      `Bloom HTML conversion completed successfully. Generated ${book.pages.length} pages.`
    );

    return htmlContent;
  } finally {
    logger.unsubscribe(logCallback);
  }
}
