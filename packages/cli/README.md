# pdf-to-bloom command line tool

Command-line interface for converting PDF and markdown documents to Bloom books.

## Usage

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

## API Keys

API keys can be provided via command line options or environment variables:

### Command Line Options

- `--mistral-api-key <key>` - Mistral AI API key
- `--openrouter-key <key>` - OpenRouter API key
- `--prompt <path>` - Path to custom prompt file to override the built-in LLM prompt

### Environment Variables

- `MISTRAL_API_KEY` - Mistral AI API key
- `OPENROUTER_KEY` - OpenRouter API key

## Options for --target

- `markdown` - OCR's markdown
- `tagged` - markdown annotated with comments that identify text blocks, languages, and metadata fields
- `bloom` - Bloom HTML

## Examples

```bash
# Basic PDF to Bloom conversion
pdf-to-bloom document.pdf

# Convert PDF to markdown only
pdf-to-bloom document.pdf --target=markdown

# Enrich existing markdown
pdf-to-bloom document.md --target=tagged

# Use custom prompt for LLM enrichment
pdf-to-bloom document.pdf --target=tagged --prompt ./my-custom-prompt.txt

# Process directory with verbose logging and custom prompt
pdf-to-bloom ./markdown-files --output ./output --verbose --openrouter-key YOUR_KEY --prompt ./custom-prompt.txt
```
