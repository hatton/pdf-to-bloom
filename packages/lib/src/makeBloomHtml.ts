import { logger, LogEntry } from "./logger";
import { enrichMarkdown, EnrichMarkdownOptions } from "./enrichMarkdown";

export interface MakeBloomHtmlOptions {
  logCallback?: (log: LogEntry) => void;
  // Options that can be passed through to enrichMarkdown
  overridePrompt?: string;
  overrideModel?: string;
  // HTML generation specific options
  customStyles?: string;
  outputFormat?: "standard" | "enhanced";
}

/**
 * Converts markdown to Bloom-compatible HTML format
 * @param markdown - Input markdown string
 * @param openRouterApiKey - OpenRouter API key (required if enrichment options are provided)
 * @param options - Optional configuration options
 * @returns Promise resolving to HTML string formatted for Bloom
 */
export async function makeBloomHtml(
  markdown: string,
  openRouterApiKey?: string,
  options?: MakeBloomHtmlOptions
): Promise<string> {
  const {
    logCallback,
    customStyles,
    outputFormat,
    overridePrompt,
    overrideModel,
  } = options || {};

  if (logCallback) logger.subscribe(logCallback);

  try {
    logger.info("Starting markdown to Bloom HTML conversion");

    let processedMarkdown = markdown;

    // If enrichment options are provided, re-enrich the markdown
    if ((overridePrompt || overrideModel) && openRouterApiKey) {
      logger.verbose("Re-enriching markdown with provided options...");
      const enrichOptions: EnrichMarkdownOptions = {
        logCallback,
        overridePrompt,
        overrideModel,
      };
      processedMarkdown = await enrichMarkdown(
        markdown,
        openRouterApiKey,
        enrichOptions
      );
    }

    // TODO: Implement markdown to Bloom HTML conversion
    // This would convert markdown syntax to Bloom-specific HTML structure
    logger.verbose("Converting markdown to Bloom HTML...");

    // Basic placeholder implementation
    // In a real implementation, you'd parse markdown and create Bloom-specific HTML
    logger.verbose("Applying markdown transformations...");
    let htmlContent = processedMarkdown
      .replace(/^# (.+)$/gm, '<div class="bloom-page"><h1>$1</h1></div>')
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<)/gm, "<p>")
      .replace(/(?<!>)$/gm, "</p>");

    // Apply custom styles if provided
    if (customStyles) {
      htmlContent = `<style>${customStyles}</style>\n${htmlContent}`;
    }

    // Apply output format variations
    const wrapperClass =
      outputFormat === "enhanced" ? "bloom-book enhanced" : "bloom-book";
    const result = `<div class="${wrapperClass}">\n${htmlContent}\n</div>`;

    logger.info("Bloom HTML conversion completed successfully");

    return result;
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}
