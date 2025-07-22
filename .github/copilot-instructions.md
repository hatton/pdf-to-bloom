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

### Development

- `yarn dev` - Start development mode for all packages
- `yarn dev:lib` - Start lib development (build watch mode)
- `yarn dev:cli` - Start CLI development (TypeScript watch mode)

### CLI Usage

- `yarn cli` - Run the built CLI tool

## Testing

- use `yarn test` to run all tests across packages. This often works bettern than the "run_tests" tool.
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

When running add-hoc tests in the terminal, use the --output option to place outputs underneath the `test-outputs` directory, e.g. `yarn test:md-to-tagged --output test-outputs/md-to-tagged`.

When doing debugging by writing temporary one-off code files in the terminal, remember not to leave them laying around.
