# pdf-to-bloom command line tool

Command-line interface for converting PDF and markdown documents to Bloom books.

## Normal Usage

### Environment Variables

First, create these accounts and put their keys in your Environment Variables. On Microsoft Windows, you will need to restart any terminals in or for them to see changes to Environment Variables.

- `OPENROUTER_KEY`

### Run

The recommended way to use the tool is with the `--collection` option. You can use either a simple collection name or a full path:

```bash

# When --collection is used, the languages specified in the .bloomCollection will be fed to the llm as a hint of what languages to expect
# use the most recently opened Bloom collection (release, alpha, beta, or betainternal)

pdf-to-bloom Ebida.pdf --collection recent

# Simple collection name (recommended) - expands to ~/Documents/Bloom/<collection-name>
pdf-to-bloom Ebida.pdf --collection "Edolo Books"

# Full path to collection folder
pdf-to-bloom Ebida.pdf --collection "C:\Users\MudMan\Documents\Bloom\Edolo Books"

```

Then run or restart Bloom to see the book.

Alternatively, you can use the older `--output` option:

```bash
pdf-to-bloom Ebida.pdf --output "path/to/create/the/output/folder"
```

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

- `ocr` or `markdown` - raw markdown from the OCR system (includes images as `img-*.jpeg`)
- `images` - extract images only in `image-{page}-{imageIndex}.png` format
- `tagged` - markdown annotated by an LLM, with comments that identify text blocks, languages, and metadata fields
- `bloom` - Bloom HTML

For example, to convert PDF to markdown only:

`pdf-to-bloom mybook.pdf --target=markdown`

To extract only images from a PDF:

`pdf-to-bloom mybook.pdf --target=images`
