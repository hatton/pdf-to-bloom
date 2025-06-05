# pdf-to-bloom

A monorepo containing tools for converting PDF documents to Bloom-compatible HTML format through intelligent markdown processing.

## Packages

This monorepo contains three packages:

### [@pdf-to-bloom/lib](./packages/lib)

The core Node.js library that provides the PDF to Bloom conversion functionality.

### [@pdf-to-bloom/cli](./packages/cli)

A command-line interface for converting PDFs to Bloom format.

## Quick Start

1. **Install dependencies:**

   ```bash
   yarn install
   ```

2. **Build all packages:**

   ```bash
   yarn build
   ```

3. **Use the CLI:**
   ```bash
   yarn start:cli convert --input example.pdf --output ./output --mistral-key YOUR_KEY
   ```

## Development Commands

- `yarn dev` - Start development mode for all packages
- `yarn test` - Run tests for all packages
- `yarn build` - Build all packages
- `yarn start:cli` - Run the CLI tool

## Individual Package Commands

You can also run commands on specific packages:

```bash
# Work with the core library
yarn workspace @pdf-to-bloom/lib build
yarn workspace @pdf-to-bloom/lib test

# Work with the CLI
yarn workspace @pdf-to-bloom/cli build
yarn workspace @pdf-to-bloom/cli start


## Project Structure

```

pdf-to-bloom/
├── package.json # Root workspace configuration
├── packages/
│ ├── core/ # Core Node.js library
│ │ ├── src/ # TypeScript source files
│ │ ├── dist/ # Built library files
│ │ └── package.json # Core package config
│ ├── cli/ # Command-line interface
│ ├── src/ # CLI source files
│ ├── dist/ # Built CLI files
│ └── package.json # CLI package config
└── README.md # This file

````

## Core Library Overview

pdf-to-bloom is a TypeScript library that provides a three-stage pipeline for converting PDF documents into Bloom-ready HTML:

1. **makeMarkdownFromPDF**: Extract and convert PDF content to markdown using MistralAI

   ```typescript
   makeMarkdownFromPDF(
     pdfPath: string,
     outputDir: string,
     mistralApiKey: string,
     logCallback?: (log: LogEntry) => void
   ): Promise<string>
````

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

3. **mdToBloomHtml**: Convert the enriched markdown to Bloom-compatible HTML format

   ```typescript
   mdToBloomHtml(
     markdown: string,
     options?: MakeBloomHtmlOptions
   ): Promise<string>
   ```

   Options interface:

   ```typescript
   interface MakeBloomHtmlOptions {
     logCallback?: (log: LogEntry) => void;
     // HTML generation specific options
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
