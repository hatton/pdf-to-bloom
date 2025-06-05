// Re-export all functions from their individual modules
export {
  pdfToMarkdownAndImageFiles,
  pdfToMarkdownAndImageFiles as makeMarkdownFromPDF,
} from "./1-ocr/pdfToMarkdownAndImageFiles";
export { llmMarkdown } from "./2-llm/llmMarkdown";
export { addBloomPlanToMarkdown } from "./4-add-bloom-plan/addBloomPlan";

// Export additional types and classes for advanced usage
export { Parser } from "./3-parse-markdown/parseMarkdown";
export { BloomMetadataParser } from "./4-add-bloom-plan/bloomMetadata";

export { HtmlGenerator } from "./5-generate-html/html-generator";
export type {
  Book,
  PageContent,
  PageElement,
  TextBlockElement,
  ImageElement,
  Layout,
  ValidationError,
  ConversionStats,
} from "./types";

// Export logger utilities for callers to access log messages
export { logger } from "./logger";

//export Language type
export type { Language } from "./types";
