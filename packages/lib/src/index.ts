// Re-export all functions from their individual modules
export {
  pdfToMarkdownAndImageFiles,
  pdfToMarkdownAndImageFiles as makeMarkdownFromPDF,
} from "./1-ocr/pdfToMarkdownAndImageFiles-Mistral";
export { pdfToMarkdownAndImageFiles as pdfToMarkdownWithOpenRouter } from "./1-ocr/unused-pdfToMarkdownAndImageFiles-OpenRouter";
export { pdfToMarkdown } from "./1-ocr/pdfToMarkdown";
export { pdfToMarkdownWithUnpdf } from "./1-ocr/pdfToMarkdownWithUnpdf";
export { llmMarkdown } from "./2-llm/llmMarkdown";
export { addBloomPlanToMarkdown } from "./3-add-bloom-plan/addBloomPlan";

// Export additional types and classes for advanced usage
export { BloomMarkdown as Parser } from "./bloom-markdown/parseMarkdown";
export { BloomMetadataParser } from "./3-add-bloom-plan/bloomMetadata";

export { HtmlGenerator } from "./4-generate-html/html-generator";
export type {
  Book,
  Page as PageContent,
  PageElement,
  TextBlockElement,
  ImageElement,
  ValidationError,
  ConversionStats,
} from "./types";

// Export logger utilities for callers to access log messages
export { logger } from "./logger";

//export Language type
export type { Language } from "./types";
