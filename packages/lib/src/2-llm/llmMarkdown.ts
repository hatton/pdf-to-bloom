import { logger, LogEntry } from "../logger";
import { generateText, CoreUserMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import fs from "fs";
import path from "path";
import { Language } from "../types";
import { attemptCleanup } from "./post-llm-cleanup";

export interface EnrichMarkdownOptions {
  logCallback?: (log: LogEntry) => void;
  overridePrompt?: string;
  overrideModel?: string; // an openrouter model name, e.g. "google/gemini-2.5-flash
  // AI can guess at these, but in the context of a bloom collection, we already know what to expect so we can provide these to help the AI model
  l1?: Language; // Primary language of the content
  l2?: Language; // Secondary language
  l3?: Language; // Tertiary language
}

/**
 * Enriches markdown content with additional processing
 */
export async function llmMarkdown(
  markdown: string,
  openRouterApiKey: string,
  options?: EnrichMarkdownOptions
): Promise<{
  markdownResultFromEnrichmentLLM: string;
  cleanedUpMarkdown: string;
  valid: boolean;
}> {
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
    } // Read the enrichment prompt from file
    const promptPath = path.join(__dirname, "llmPrompt.txt");
    let llmPrompt: string;

    try {
      llmPrompt = overridePrompt || fs.readFileSync(promptPath, "utf8");
      logger.verbose("Loaded enrichment prompt from file");
    } catch (error) {
      logger.error(`Failed to read enrichment prompt: ${error}`);
      throw error;
    } // Configure OpenRouter with Gemini 2.5 Flash
    const modelName = overrideModel || "google/gemini-2.5-flash-preview-05-20";
    const openrouterProvider = createOpenRouter({
      apiKey: openRouterApiKey,
    });

    logger.info(
      `Processing markdown with ${modelName} through OpenRouter API...`
    );

    // let's set the maxTokens to at least the length of the markdown content
    // because we're typically working on minority languages so can expect poor tokenization.
    const maxTokens = markdown.length + 2000; // Adding a buffer of 2000 tokens for metadata and new tagging
    logger.verbose(`Setting maxTokens to: ${maxTokens}`);

    let messages: CoreUserMessage[] = [
      {
        role: "user",
        content: llmPrompt,
      },
    ];
    if (options?.l1) {
      // build up a single message that conveys info about for each language that was provided, and is silent on the others
      // E.g. "We have reason to expect that some or all of these languages are in this document. [l1: {tag:"mza", "Mixteco de Santa María Zacatepec"}, l2: {tag:"en", name:"English"}]
      const languages: Language[] = [];
      if (options.l1) languages.push(options.l1);
      if (options.l2) languages.push(options.l2);
      if (options.l3) languages.push(options.l3);
      if (languages.length > 0) {
        messages.push({
          role: "user",
          content: `We have reason to expect that some or all of these languages are in the following document. ${JSON.stringify(
            languages
          )}`,
        });
      }
    }
    messages.push({
      role: "user",
      content: `Here is the Markdown content:\n\n${markdown}`,
    });
    // Call the AI model to enrich the markdown
    const result = await generateText({
      model: openrouterProvider(modelName),
      messages,
      temperature: 0.0, // Deterministic, no creativity needed
      maxTokens,
    });
    let enrichedContent = result.text;

    logger.info("Markdown enrichment completed... validating...");
    logger.verbose(
      `Generated ${enrichedContent.length} characters of markdown`
    );

    if (!enrichedContent) {
      logger.error("No markdown content received from AI model");
      throw new Error("Failed to generate enriched markdown");
    }

    const cleanupResult = attemptCleanup(enrichedContent);
    if (!cleanupResult.valid) {
      logger.error("Enriched markdown content failed validation checks");
      // don't throw: we want to save what we did so that it can be inspected: throw new Error("Enriched markdown content failed validation checks");
    } else {
      logger.info("Enriched markdown content passed validation checks");
    }
    return {
      markdownResultFromEnrichmentLLM: enrichedContent,
      cleanedUpMarkdown: cleanupResult.cleaned,
      valid: cleanupResult.valid,
    };
  } catch (error) {
    logger.error(`Markdown enrichment failed: ${error}`);
    throw error;
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}
