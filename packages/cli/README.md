# @pdf-to-bloom/cli

Command-line interface for converting PDF documents to Bloom format.

## Installation

```bash
yarn add -g @pdf-to-bloom/cli
```

## Usage

```bash
# Convert a PDF to Bloom format
pdf-to-bloom convert \
  --input document.pdf \
  --output ./output \
  --mistral-key YOUR_MISTRAL_API_KEY \
  --openrouter-key YOUR_OPENROUTER_API_KEY

# Skip enrichment step
pdf-to-bloom convert \
  --input document.pdf \
  --output ./output \
  --mistral-key YOUR_MISTRAL_API_KEY \
  --skip-enrichment

# Enable verbose logging
pdf-to-bloom convert \
  --input document.pdf \
  --output ./output \
  --mistral-key YOUR_MISTRAL_API_KEY \
  --verbose
```

## Commands

### `convert`

Convert a PDF file to Bloom HTML format.

**Options:**

- `-i, --input <path>` - Path to the input PDF file (required)
- `-o, --output <path>` - Output directory for generated files (required)
- `--mistral-key <key>` - Mistral AI API key (required)
- `--openrouter-key <key>` - OpenRouter API key for enrichment (optional)
- `--skip-enrichment` - Skip the markdown enrichment step
- `--verbose` - Enable verbose logging

### `version`

Show version information.
