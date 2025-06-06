# Development Instructions for LLMs

This is a Node.js monorepo for PDF to Bloom conversion tools with the following technical stack and conventions:

## Project Structure

This is a **Yarn workspaces monorepo** with three packages:

- `packages/lib` - Core TypeScript library with Vite build
- `packages/cli` - Command-line interface tool
- `packages/web` - React web interface with Vite + Tailwind CSS

## Package Manager

- **Yarn Classic (v1.22.22)** - Use `yarn` commands, not `npm`
- **Yarn Workspaces** - All packages managed from root
- **Package Manager**: `yarn@1.22.22`

## Language & Build Tools

- **TypeScript** - Primary language for source code
- **Node.js 22.11.0** - Runtime version (managed by Volta)
- **Vite** - Build tool and bundler with `vite-plugin-dts` for type definitions (lib package)
- **TypeScript Compiler** - Direct `tsc` build for CLI package
- **Vitest** - Testing framework (built into Vite)
- **React** - Frontend framework for web package
- **Tailwind CSS** - Styling framework for web package

## Available Scripts (Root Level)

### Building

- `yarn build` - Build all packages
- `yarn build:lib` - Build only the lib package
- `yarn build:cli` - Build only the CLI package

### Testing

- `yarn test` - Run tests for all packages (non-strict, continues on failure)
- `yarn test:strict` - Run tests for all packages (strict, fails on first error)
- `yarn test:lib` - Run tests for lib package only
- `yarn test:lib:watch` - Run lib tests in watch mode
- `yarn test:watch` - Run tests in watch mode for all packages

### Development

- `yarn dev` - Start development mode for all packages
- `yarn dev:lib` - Start lib development (build watch mode)
- `yarn dev:cli` - Start CLI development (TypeScript watch mode)
- `yarn watch` - Run lib and CLI in concurrent watch mode
- `yarn web` - Start web development server

### CLI Usage

- `yarn cli` - Run the built CLI tool
- `yarn test:md-to-enriched` - Test conversion of markdown to enriched format

## Testing

- Use **Vitest** for all tests
- Test files should end with `.test.ts`
- Import test utilities: `import { describe, it, expect } from 'vitest'`

## Build Output

### Lib Package

- Dual ESM/CJS builds via Vite (`dist/index.mjs` and `dist/index.cjs`)
- TypeScript declarations included (`dist/index.d.ts`)
- Custom Vite plugins for asset copying

### For file paths in commands:

- Use forward slashes `/` or escape backslashes `\\`

Important: do not recommend adding extensions on import statements, as this is a TypeScript project and extensions are not needed.

Do not tell me to do things or check things, do it yourself as an agent.

Ask me any clarifying questions.
