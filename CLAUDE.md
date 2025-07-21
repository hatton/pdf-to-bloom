# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Yarn workspaces monorepo** for converting PDF documents to Bloom-compatible HTML format through intelligent markdown processing. The conversion pipeline uses OCR, LLM processing, and HTML generation to create bilingual educational content.

## Package Manager & Build Tools

- **Yarn Classic v1.22.22** - Use `yarn` commands, not `npm`
- **Node.js 22.11.0** - Runtime managed by Volta
- **TypeScript** - Primary language with Vite for lib package, tsc for CLI
- **Vitest** - Testing framework

## Core Architecture

The conversion pipeline follows a 4-stage process:

1. **OCR Stage** (`1-ocr/`): PDF → Markdown + images using Mistral AI
2. **LLM Stage** (`2-llm/`): Enriches markdown with language detection and content structuring  
3. **Bloom Planning** (`3-add-bloom-plan/`): Adds Bloom-specific metadata and page planning
4. **HTML Generation** (`4-generate-html/`): Creates final Bloom HTML with Origami CSS

Key packages:
- `@pdf-to-bloom/lib` - Core TypeScript library (dual ESM/CJS build via Vite)
- `@pdf-to-bloom/cli` - Command-line tool with Commander.js

## Common Commands

### Development
```bash
# Install dependencies
yarn install

# Development with watch mode
yarn watch                    # Both lib and CLI in parallel
yarn dev:lib                  # Library only
yarn dev:cli                  # CLI only

# Build all packages
yarn build
yarn build:lib               # Library only  
yarn build:cli               # CLI only
```

### Testing
```bash
yarn test                    # All packages (continues on failure)
yarn test:strict            # All packages (fails on first error)
yarn test:lib               # Library only
yarn test:lib:watch         # Library with watch mode
```

### CLI Usage
```bash
yarn cli input.pdf                           # Convert PDF to Bloom HTML
yarn cli input.pdf --target markdown         # OCR only
yarn cli input.pdf --target tagged          # Through LLM processing
yarn test:md-to-tagged                       # Test markdown conversion
```

## API Keys Required

- `MISTRAL_API_KEY` - For PDF OCR and general LLM processing
- `OPENROUTER_KEY` - For content enrichment and advanced processing

## File Structure Patterns

- Test files: `*.test.ts` using Vitest
- TypeScript config: Separate `tsconfig.json` per package
- Build outputs: `packages/lib/dist/` (dual format), `packages/cli/dist/`
- Import statements: No extensions needed in TypeScript

## Key Types & Interfaces

Core data structures in `packages/lib/src/types.ts`:
- `Book` - Complete document with pages and metadata
- `Page` - Individual page with elements and type classification
- `PageElement` - Text blocks or images with language mappings
- `FrontMatterMetadata` - Bloom-specific metadata structure

The library exports pipeline functions and utilities for external integration while the CLI provides a complete conversion tool with file I/O handling.