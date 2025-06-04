import { logger, LogEntry } from "../logger";
import { generateText, CoreUserMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import fs from "fs";
import path from "path";
import { Language } from "../types";

export interface EnrichMarkdownOptions {
  logCallback?: (log: LogEntry) => void;
  overridePrompt?: string;
  overrideModel?: string;
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

function attemptCleanup(content: string): { cleaned: string; valid: boolean } {
  // Strip code block wrapper if present
  content = content.replace(/^```\w*\s*\n([\s\S]*?)\n```\s*$/g, "$1");

  // Remove standalone "yaml" lines that AI models sometimes add
  content = content.replace(/yaml/, "");

  // Fix malformed YAML frontmatter if it's missing the opening delimiter
  // Check if content starts with YAML-like content but is missing the opening ---
  if (!content.startsWith("---") && content.includes("allTitles:")) {
    const lines = content.split("\n");
    let yamlEndIndex = -1;

    // Find where the YAML ends (look for the first line that starts with #, !, [, or <!-- after YAML-like content)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        line.startsWith("#") ||
        line.startsWith("!") ||
        line.startsWith("[") ||
        line.startsWith("<!--")
      ) {
        yamlEndIndex = i;
        break;
      }
    }

    if (yamlEndIndex > 0) {
      // Insert --- at the beginning and replace the separator
      const yamlContent = lines.slice(0, yamlEndIndex).join("\n");
      const markdownContent = lines.slice(yamlEndIndex).join("\n");
      content = `---\n${yamlContent.trim()}\n---\n${markdownContent}`;
      logger.verbose(
        "Fixed malformed YAML frontmatter by adding missing delimiters"
      );
    }

    // remove any other ``` (I've seen it after the YAML frontmatter)
    content = content.replace(/```/g, "");
  }
  // Sometimes in the markdown, the LLM will have 2 lines like this:
  //
  // <!-- lang=id -->
  // ![img-0.jpeg](img-0.jpeg){width=150}
  // etc...
  //
  // But we need that comment to come after the img statement, not before it.  // Match and swap the order of language comment followed by image statement
  const langCommentFollowedImmediatelyByImageRegex =
    /(<!--\s*lang=\w+\s*-->)\n\s*(!\[.*?\]\(.*?\)(\{.*?\})?)/g;
  content = content.replace(
    langCommentFollowedImmediatelyByImageRegex,
    (_match, langComment, imageStatement) => {
      logger.warn(
        `Reordered language comment to follow image statement in markdown: ${langComment} ${imageStatement}`
      );
      return `${imageStatement}\n${langComment}\n`;
    }
  );

  // do a final check and return null if we fail the check.
  // we must have a) no code block wrapper, b) a YAML frontmatter bounded by ---, at least one comment with "lang=", and the required frontmatter fields (allTitles, l1, and languages).
  // Check each of these problems individually so that if any fail, log a specific error and return null.
  if (content.includes("```")) {
    logger.error("Code block wrapper is present.");
    // log the first 3 lines
    const firstThreeLines = content.split("\n").slice(0, 3).join("\n");
    logger.error(`First 3 lines of content:\n${firstThreeLines}`);
    return { cleaned: content, valid: false };
  }

  if (!content.startsWith("---") || !content.includes("---", 3)) {
    logger.error("YAML frontmatter does not start and end with ---");

    const firstThreeLines = content.split("\n").slice(0, 3).join("\n");
    logger.error(`First 3 lines of content:\n${firstThreeLines}`);
    return { cleaned: content, valid: false };
  }

  if (!content.includes("lang=")) {
    logger.error("No languages identified in the markdown.");
    return { cleaned: content, valid: false };
  }

  const requiredFields = ["allTitles", "l1", "languages"];
  for (const field of requiredFields) {
    if (!content.includes(`${field}:`)) {
      logger.error(`Missing required frontmatter field: ${field}`);
      return { cleaned: content, valid: false };
    }
  }

  return { cleaned: content, valid: true };
}
