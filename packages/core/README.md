# @pdf-to-bloom/core

The core Node.js library for converting PDF documents to Bloom-compatible HTML format.

## Installation

```bash
yarn add @pdf-to-bloom/core
```

## Usage

```typescript
import {
  pdfToBloomFolder,
  makeMarkdownFromPDF,
  enrichMarkdown,
  makeBloomHtml,
} from "@pdf-to-bloom/core";

// Convert PDF directly to Bloom HTML
const bloomHtmlPath = await pdfToBloomFolder(
  "./document.pdf",
  "./output",
  "your-mistral-api-key"
);

// Or use individual functions
const markdown = await makeMarkdownFromPDF(
  "./document.pdf",
  "./output",
  "your-mistral-api-key"
);
const enrichedMarkdown = await enrichMarkdown(
  markdown,
  "your-openrouter-api-key"
);
const bloomHtml = await makeBloomHtml(enrichedMarkdown, "your-mistral-api-key");
```

## API

### `pdfToBloomFolder(pdfPath, outputDir, mistralApiKey, logCallback?)`

Complete pipeline that converts a PDF to Bloom HTML format.

### `makeMarkdownFromPDF(pdfPath, outputDir, mistralApiKey, logCallback?)`

Extract and convert PDF content to markdown using MistralAI.

### `enrichMarkdown(markdown, openRouterApiKey, options?)`

Enhance the markdown content using OpenRouter API.

### `makeBloomHtml(markdown, mistralApiKey, options?)`

Convert markdown to Bloom-compatible HTML format.
