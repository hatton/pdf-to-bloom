# pdf-to-bloom command line tool

Command-line interface for converting PDF and markdown documents to Bloom books.

## Normal Usage

### Environment Variables

First, create these accounts and put their keys in your Environment Variables. On Microsoft Windows, you will need to restart any terminals in or for them to see changes to Environment Variables.

- `MISTRAL_API_KEY`
- `OPENROUTER_KEY`

### Run

The recommended way to use the tool is with the `--collection` option. You can use either a simple collection name or a full path:

```bash
# Simple collection name (recommended) - expands to ~/Documents/Bloom/CollectionName
pdf-to-bloom Ebida.pdf --collection "Edolo Books"

# Full path to collection folder
pdf-to-bloom Ebida.pdf --collection "C:\Users\MudMan\Documents\Bloom\Edolo Books"

# Full path to .bloomCollection file directly
pdf-to-bloom Ebida.pdf --collection "C:\Users\MudMan\Documents\Bloom\Edolo Books\EdoloBooks.bloomCollection"
```

Alternatively, you can use the older `--output` option:

```bash
pdf-to-bloom Ebida.pdf --output "C:\Users\MudMan\Documents\Bloom\Edolo Books"
```

Then run or restart Bloom to see the book.

## About Language Detection and Bloom Collections

When processing files, the tool can automatically detect expected languages by looking for Bloom Collection settings. This provides several benefits:

- **More accurate language detection**: The LLM knows what languages to expect when processing the content
- **Consistent language codes**: Uses the same BCP 47 language tags as configured in your Bloom Collection
- **Better metadata extraction**: Language-specific content is properly identified and tagged

### Using the --collection Option (Recommended)

The `--collection` option is the preferred way to specify where to create your book because it automatically finds and uses the Bloom Collection settings. You can specify the collection in two ways:

1. **Simple collection name** - Just provide the collection name, and it will automatically expand to `~/Documents/Bloom/CollectionName`
2. **Full path** - Provide the complete path to either:
   - A Bloom collection folder (containing a `.bloomCollection` file)
   - A `.bloomCollection` file directly

#### Simple Collection Name Examples

```bash
# These are equivalent:
pdf-to-bloom mybook.pdf --collection "Edolo Books"
pdf-to-bloom mybook.pdf --collection "C:\Users\YourName\Documents\Bloom\Edolo Books"

# Works with special characters too:
pdf-to-bloom mybook.pdf --collection "palɨ Books"
```

#### Full Path Examples

```bash
# Using a collection folder
pdf-to-bloom mybook.pdf --collection "C:\Users\MudMan\Documents\Bloom\Edolo Books"

# Using a .bloomCollection file directly
pdf-to-bloom mybook.pdf --collection "C:\Users\MudMan\Documents\Bloom\Edolo Books\EdoloBooks.bloomCollection"
```

The tool will validate that the path exists and contains the necessary collection settings.

### Example Bloom Collection Structure

For example, if we have:

```
C:\Users\MudMan\Documents\Bloom\Edolo Books\
├── EdoloBooks.bloomCollection  # Contains language settings
└── nulu/
```

and we run

```bash
pdf-to-bloom Ebida.pdf --collection "C:\Users\MudMan\Documents\Bloom\Edolo Books"
```

The tool will find `EdoloBooks.bloomCollection` and use its language settings (L1, L2, L3) to help the LLM process the content more accurately.

Then, if all goes well, we will have:

```
Edolo Books/
├── EdoloBooks.bloomCollection  # Contains language settings
└── nulu/
└── Ebida/                      # Output directory for converted book
    ├── index.html
    ├── Ebida.ocr.md
    └── Ebida.llm.md
```

## Setting the starting stage

The conversion from PDF to Bloom HTML is a four stage process. If you want, you can start at any of those stages, and end at three of them.

This tool determines the starting stage by looking at the file name you give it:

- `*.PDF` Start with PDF
- `*.md` or `*.ocr.md` Start with raw markdown
- `*.llm.md` Start with the markdown that has been tagged by an LLM
- `*.bloom.md` Start with markdown that is ready for the last stage of conversion to Bloom HTML:

## Setting the ending stage

To specify the end stage, add the `--target` option using one of these values:

- `markdown` - raw markdown from the OCR system
- `tagged` - markdown annotated by an LLM, with comments that identify text blocks, languages, and metadata fields
- `bloom` - Bloom HTML

For example, to convert PDF to markdown only:

`pdf-to-bloom mybook.pdf --target=markdown`

## API Keys

API keys can be provided via command line options or environment variables:

### Command Line Options

- `--collection <path>` - **Recommended**: Path to Bloom collection folder or .bloomCollection file for better language detection
- `--output <path>` - Directory in which a new directory will be created based on the input file name (use --collection instead for better results)
- `--mistral-api-key <key>` - Mistral AI API key
- `--openrouter-key <key>` - OpenRouter API key
- `--prompt <path>` - Path to custom prompt file to override the built-in LLM prompt. Use this to override the default.
- `--model <model>` - OpenRouter llm model name to use in tagging the markdown. E.g., 'google/gemini-2.5-flash'. Use this to override the default.
- `--pdf <method>` - PDF processing method: 'mistral' (default, vision-based OCR) or 'unpdf' (experimental structural extraction)

## PDF Processing Methods

The tool supports two different methods for extracting content from PDFs:

### Mistral AI OCR (Default)

- **Usage**: `--pdf mistral` (or omit the option)
- **How it works**: Uses vision-based OCR that processes PDFs as images
- **Advantages**: Only extracts visually displayed text, handles complex layouts well
- **Requirements**: Mistral AI API key
- **Best for**: PDFs with complex layouts, PDFs from Adobe Illustrator/Distiller that may contain hidden text

### unpdf (Experimental)

- **Usage**: `--pdf unpdf`
- **How it works**: Structural extraction that reads PDF text content directly
- **Advantages**: Faster processing, no API costs, preserves text formatting
- **Limitations**: May extract hidden/non-visible text layers from some PDFs
- **Best for**: Standard PDFs without hidden content, cost-sensitive processing

Example usage:

```bash
# Use Mistral AI OCR (default)
pdf-to-bloom mybook.pdf

# Use unpdf for local processing
pdf-to-bloom mybook.pdf --pdf unpdf
```
