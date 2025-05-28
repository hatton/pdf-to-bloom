# Development Instructions for LLMs

This project is a Node.js library with the following technical stack and conventions:

## Package Manager

- **Yarn Classic (v1.22.22)** - Use `yarn` commands, not `npm`
- Lockfile: `yarn.lock`
- Install dependencies: `yarn install`
- Add dependencies: `yarn add <package>`
- Add dev dependencies: `yarn add -D <package>`

## Language & Build Tools

- **TypeScript** - Primary language for source code
- **Vite** - Build tool and bundler with `vite-plugin-dts` for type definitions
- **Vitest** - Testing framework (built into Vite)

## Project Structure

```
src/
  index.ts          # Main entry point
  *.test.ts         # Test files
dist/                # Built output (generated)
  index.cjs         # CommonJS build
  index.mjs         # ESM build
  index.d.ts        # TypeScript definitions
```

## Available Scripts

- `yarn build` - Build the library
- `yarn test` - Run tests once
- `yarn test:watch` - Run tests in watch mode
- `yarn dev` - Build in watch mode

## Testing

- Use **Vitest** for all tests
- Test files should end with `.test.ts`
- Import test utilities: `import { describe, it, expect } from 'vitest'`

## Build Output

- Dual ESM/CJS builds via Vite
- TypeScript declarations included
- Source maps generated

## CI/CD

- GitHub Actions workflow for publishing
- Runs tests before publishing
- Publishes to npm on git tags starting with 'v'

## Configuration Files

- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build and test configuration
- `package.json` - Package metadata and scripts
