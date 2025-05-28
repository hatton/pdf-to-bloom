# pdf-to-bloom

A Node.js library for converting PDF documents to Bloom-compatible HTML format through intelligent markdown processing.

## Overview

pdf-to-bloom is a TypeScript library that provides a three-stage pipeline for converting PDF documents into Bloom-ready HTML:

1. **makeMarkdownFromPDF**: Extract and convert PDF content to markdown using MistralAI

   ```typescript
   makeMarkdownFromPDF(
     pdfPath: string,
     outputDir: string,
     mistralApiKey: string,
     logCallback?: (log: LogEntry) => void
   ): Promise<string>
   ```

2. **enrichMarkdown**: Enhance the markdown content using OpenRouter API

   ```typescript
   enrichMarkdown(
     markdown: string,
     openRouterApiKey: string,
     options?: EnrichMarkdownOptions
   ): Promise<string>
   ```

   Options interface:

   ```typescript
   interface EnrichMarkdownOptions {
     logCallback?: (log: LogEntry) => void;
     overridePrompt?: string;
     overrideModel?: string;
   }
   ```

3. **makeBloomHtml**: Convert the enriched markdown to Bloom-compatible HTML format

   ```typescript
   makeBloomHtml(
     markdown: string,
     options?: MakeBloomHtmlOptions
   ): string
   ```

   Options interface:

   ```typescript
   interface MakeBloomHtmlOptions {
     logCallback?: (log: LogEntry) => void;
     customStyles?: string;
     outputFormat?: "standard" | "enhanced";
   }
   ```

Additional exports:

- **logger**: Logger singleton instance for tracking the conversion process
- **LogEntry**: Interface for log entries with level, message, and timestamp
- **LogLevel**: Type definition for log levels ("info" | "error" | "verbose")

## Requirements

- Node.js 22.11.0 or higher
- MistralAI API key
- OpenRouter API key

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd pdf-to-bloom

# Install dependencies
yarn install

# Run tests
yarn test

# Build the project
yarn build

# Development mode with watch
yarn dev
```

### Testing

```bash
# Run tests once
yarn test

# Run tests in watch mode
yarn test:watch
```

### Building

```bash
yarn build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
