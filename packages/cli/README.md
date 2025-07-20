# pdf-to-bloom command line tool

Command-line interface for converting PDF and markdown documents to Bloom books.

## Normal Usage

### Environment Variables

First, create these accounts and put their keys in your Environment Variables. On Microsoft Windows, you will need to restart any terminals in or for them to see changes to Environment Variables.

- `MISTRAL_API_KEY`
- `OPENROUTER_KEY`

### Run

```bash
pdf-to-bloom Ebida.pdf --output "C:\Users\MudMan\Documents\Bloom\Edolo Books"
```

Then run or restart Bloom to see the book.

## About Language Detection and Bloom Collections

When processing files, the tool can automatically detect expected languages by looking for Bloom Collection settings in the output directory. If you specify an output directory that contains a `.bloomCollection` file (or if the parent directory contains one), the tool will read the language configuration from it.

This provides several benefits:

- **More accurate language detection**: The LLM knows what languages to expect when processing the content
- **Consistent language codes**: Uses the same BCP 47 language tags as configured in your Bloom Collection
- **Better metadata extraction**: Language-specific content is properly identified and tagged

### Example Bloom Collection Structure

For example, if we have:

```
C:\Users\MudMan\Documents\Bloom\Edolo Books\
├── EdoloBooks.bloomCollection  # Contains language settings
└── nulu/
```

and we run

```bash
pdf-to-bloom Ebida.pdf --output "C:\Users\MudMan\Documents\Bloom\Edolo Books"
```

The tool will find `EdoloBooks.bloomCollection` use its language settings (L1, L2, L3) to help the LLM process the content more accurately.

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

The conversion from PDF to Bloom HTML is a three stage process. If you want, you can start at any of those stages, and end at any of them.

This tool determines the starting stage by looking at the file name you give it:

- \*.PDF Start with PDF
- \*.md Start with raw markdown
- \*.tagged.md Start with the markdown that has been tagged by an LLM

## Setting the Target

To specify the end stage, add the `--target` option using one of these values:

- `markdown` - raw markdown from the OCR system
- `tagged` - markdown annotated by an LLM, with comments that identify text blocks, languages, and metadata fields
- `bloom` - Bloom HTML

For example, to convert PDF to markdown only:

`pdf-to-bloom mybook.pdf --target=markdown`

Or to skip OCR'ing and start with a raw markdown:

`pdf-to-bloom mybook.md --target=enriched`

## API Keys

API keys can be provided via command line options or environment variables:

### Command Line Options

- `--mistral-api-key <key>` - Mistral AI API key
- `--openrouter-key <key>` - OpenRouter API key
- `--prompt <path>` - Path to custom prompt file to override the built-in LLM prompt. Use this to override the default.
- `--model <model>` - OpenRouter llm model name to use in tagging the markdown. E.g., 'google/gemini-2.5-flash'. Use this to override the default.
