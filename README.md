# pdf-to-bloom

A monorepo containing tools for converting PDF documents to Bloom-compatible HTML format through intelligent markdown processing.

## Packages

This monorepo contains three packages:

### [@pdf-to-bloom/lib](./packages/lib)

The core Node.js library that provides the PDF to Bloom conversion functionality.

### [@pdf-to-bloom/cli](./packages/cli)

A command-line interface for converting PDFs to Bloom format.

## Requirements

- Node.js 22.11.0 or higher
- OpenRouter API key

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd pdf-to-bloom

# Install dependencies
yarn install
```

### Developing

```bash

# Watch the lib and cli
yarn dev:lib   # in one terminal
yarn dev:cli   # in another terminal

# Run all tests once
yarn test

# Run tests in watch mode
yarn test:watch

# convert a pdf. When --collection is used, the languages specified in the .bloomCollection will be fed to the llm as a hint of what languages to expect
yarn cli input.pdf # defaults to most recently opened Bloom collection for better language detection
yarn cli input.pdf --collection recent # explicitly use the most recently opened Bloom collection (release, alpha, beta, or betainternal)
yarn cli input.pdf --collection path/to/bloom/collection # output to a particular collection
yarn cli input.pdf --output path/to/output/directory # output to a specific directory instead of a collection


# Extract only images from a PDF
yarn cli input.pdf --target images

# Extract markdown and images from PDF
yarn cli input.pdf --target ocr
yarn cli input.pdf --target ocr --ocr google/gemini-2.5-pro # specify an llm to do the ocr
```

See [./packages/cli/README.md](./packages/cli/README.md) for details

### Building

```bash
yarn build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
