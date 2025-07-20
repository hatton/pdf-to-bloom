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

# convert a pdf
yarn cli ./test-inputs/testme.pdf
```

See [./packages/cli/README.md](./packages/cli/README.md) for details

### Building

```bash
yarn build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
