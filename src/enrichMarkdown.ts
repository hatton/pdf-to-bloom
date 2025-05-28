import { logger, LogEntry } from "./logger";

export interface EnrichMarkdownOptions {
  logCallback?: (log: LogEntry) => void;
  overridePrompt?: string;
  overrideModel?: string;
}

/**
 * Enriches markdown content with additional processing
 * @param markdown - Input markdown string
 * @param openRouterApiKey - OpenRouter API key for enrichment processing
 * @param options - Optional configuration options
 * @returns Promise resolving to enriched markdown string
 */
export async function enrichMarkdown(
  markdown: string,
  openRouterApiKey: string,
  options?: EnrichMarkdownOptions
): Promise<string> {
  const { logCallback, overridePrompt, overrideModel } = options || {};

  if (logCallback) logger.subscribe(logCallback);

  try {
    logger.info("Starting markdown enrichment process");

    // TODO: Implement markdown enrichment logic using OpenRouter
    // This could include adding metadata, formatting improvements, etc.
    logger.verbose("Enriching markdown content using OpenRouter...");

    if (!openRouterApiKey) {
      logger.error("OpenRouter API key is required");
      throw new Error("OpenRouter API key is required");
    }

    logger.verbose("Processing markdown with OpenRouter API...");
    // Placeholder implementation - could add table of contents, format headers, etc.
    const enrichedContent = `<!-- Enriched Content via OpenRouter -->\n${markdown}\n\n<!-- End of Enriched Content -->`;

    logger.info("Markdown enrichment completed successfully");
    return enrichedContent;
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}
