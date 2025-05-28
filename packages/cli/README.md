# @pdf-to-bloom/cli

Command-line interface for converting PDF documents to Bloom format.

## Installation

```bash
yarn add -g @pdf-to-bloom/cli
```

## Usage

### Start Web Application

```bash
# Start the web application (when no arguments provided)
pdf-to-bloom
```

### PDF Conversions

```bash
# Convert PDF to Bloom HTML (full pipeline)
pdf-to-bloom mybook.pdf --target=bloom --output ./output

# Convert PDF to markdown only
pdf-to-bloom mybook.pdf --target=markdown

# Convert PDF to markdown with custom output directory
pdf-to-bloom mybook.pdf --target=markdown --output ./output

# Convert PDF to enriched markdown
pdf-to-bloom mybook.pdf --target=enriched --output ./output
```

### Markdown Conversions

```bash
# Enrich existing markdown file
pdf-to-bloom mybook.md --target=enriched

# Enrich markdown with custom output directory
pdf-to-bloom mybook.md --target=enriched --output ./output
```

### Directory Processing

```bash
# Process directory containing .md files
# - If markdown has YAML front matter: convert directly to Bloom HTML
# - If no front matter: enrich first, then convert to Bloom HTML
pdf-to-bloom ./my-directory --output ./output
```

## API Keys

API keys can be provided via command line options or environment variables:

### Command Line Options

- `--mistral-api-key <key>` - Mistral AI API key
- `--openrouter-key <key>` - OpenRouter API key

### Environment Variables

- `MISTRAL_API_KEY` - Mistral AI API key
- `OPENROUTER_KEY` - OpenRouter API key

## Target Formats

- `bloom` - Full conversion pipeline (PDF → Markdown → Enriched → Bloom HTML)
- `markdown` - PDF to markdown conversion only
- `enriched` - PDF to enriched markdown, or markdown enrichment

## Examples

```bash
# Basic PDF to Bloom conversion
pdf-to-bloom document.pdf --mistral-api-key YOUR_KEY

# Convert PDF to markdown only
pdf-to-bloom document.pdf --target=markdown --mistral-api-key YOUR_KEY

# Enrich existing markdown
pdf-to-bloom document.md --target=enriched --openrouter-key YOUR_KEY

# Process directory with verbose logging
pdf-to-bloom ./markdown-files --output ./output --verbose --openrouter-key YOUR_KEY

# Using environment variables
export MISTRAL_API_KEY="your-mistral-key"
export OPENROUTER_KEY="your-openrouter-key"
pdf-to-bloom document.pdf --target=bloom --output ./output
```

## Legacy Command

For backwards compatibility, the original `convert` command is still available:

```bash
pdf-to-bloom convert \
  --input document.pdf \
  --output ./output \
  --mistral-key YOUR_MISTRAL_API_KEY \
  --openrouter-key YOUR_OPENROUTER_API_KEY
```
