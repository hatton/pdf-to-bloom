import { logger, LogEntry } from "./logger";

export interface MakeBloomHtmlOptions {
  logCallback?: (log: LogEntry) => void;
  // Future options that could be passed through to enrichMarkdown or for HTML generation
  customStyles?: string;
  outputFormat?: "standard" | "enhanced";
}

/**
 * Converts markdown to Bloom-compatible HTML format
 * @param markdown - Input markdown string
 * @param options - Optional configuration options
 * @returns HTML string formatted for Bloom
 */
export function makeBloomHtml(
  markdown: string,
  options?: MakeBloomHtmlOptions
): string {
  const { logCallback, customStyles, outputFormat } = options || {};

  if (logCallback) logger.subscribe(logCallback);

  try {
    logger.info("Starting markdown to Bloom HTML conversion");

    // TODO: Implement markdown to Bloom HTML conversion
    // This would convert markdown syntax to Bloom-specific HTML structure
    logger.verbose("Converting markdown to Bloom HTML...");

    // Basic placeholder implementation
    // In a real implementation, you'd parse markdown and create Bloom-specific HTML
    logger.verbose("Applying markdown transformations...");
    const htmlContent = markdown
      .replace(/^# (.+)$/gm, '<div class="bloom-page"><h1>$1</h1></div>')
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<)/gm, "<p>")
      .replace(/(?<!>)$/gm, "</p>");

    const result = `<div class="bloom-book">\n${htmlContent}\n</div>`;
    logger.info("Bloom HTML conversion completed successfully");

    return result;
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}
