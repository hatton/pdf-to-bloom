import { logger, LogEntry } from "./logger";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { readFileSync } from "fs";
import { join } from "path";

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
  const {
    logCallback,
    overridePrompt = undefined,
    overrideModel = undefined,
  } = options || {};

  if (logCallback) logger.subscribe(logCallback);

  try {
    logger.info("Starting markdown enrichment process");

    if (!openRouterApiKey) {
      logger.error("OpenRouter API key is required");
      throw new Error("OpenRouter API key is required");
    }

    // Read the enrichment prompt from file
    const promptPath = join(__dirname, "enrichmentPrompt.txt");
    let enrichmentPrompt: string;

    try {
      enrichmentPrompt = overridePrompt || readFileSync(promptPath, "utf-8");
      logger.verbose("Loaded enrichment prompt from file");
    } catch (error) {
      logger.error(`Failed to read enrichment prompt: ${error}`);
      throw new Error("Failed to read enrichment prompt file");
    } // Configure OpenRouter with Gemini 2.5 Flash
    const modelName = overrideModel || "google/gemini-2.5-flash-preview-05-20";
    const openrouterProvider = createOpenRouter({
      apiKey: openRouterApiKey,
    });

    logger.verbose(`Using model: ${modelName}`);
    logger.verbose("Processing markdown with OpenRouter API...");

    // let's set the maxTokens to at least the length of the markdown content
    // because we're typically working on minority languages so can expect poor tokenization.
    const maxTokens = markdown.length + 2000; // Adding a buffer of 2000 tokens for metadata and new tagging
    logger.verbose(`Setting maxTokens to: ${maxTokens}`);

    // Call the AI model to enrich the markdown
    const result = await generateText({
      model: openrouterProvider(modelName),
      messages: [
        {
          role: "user",
          content: enrichmentPrompt,
        },
        {
          role: "user",
          content: `Here is the Markdown content:\n\n${markdown}`,
        },
      ],
      temperature: 0.0, // Deterministic, no creativity needed
      maxTokens,
    });

    const enrichedContent = result.text;

    if (!enrichedContent) {
      logger.error("No markdown content received from AI model");
      throw new Error("Failed to generate enriched markdown");
    }

    logger.info("Markdown enrichment completed successfully");
    logger.verbose(
      `Generated ${enrichedContent.length} characters of markdown`
    );

    return enrichedContent;
  } catch (error) {
    logger.error(`Markdown enrichment failed: ${error}`);
    throw error;
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}
