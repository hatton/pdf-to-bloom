# @pdf-to-bloom/web

React-based web application for PDF to Bloom conversion with a user-friendly interface.

## Development

```bash
# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## Features

- Drag & drop PDF upload
- Real-time conversion status
- API key configuration
- Download converted HTML
- Modern, responsive UI with Tailwind CSS

## Technology Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)
- React Dropzone

## Usage

1. Enter your Mistral AI API key (required)
2. Optionally enter your OpenRouter API key for enrichment
3. Drag and drop a PDF file or click to select
4. Click "Convert to Bloom" to start the conversion
5. Download the converted HTML file when complete

## Note

The web interface currently shows a placeholder implementation. In a production environment, you would need to implement a backend service to handle the actual PDF processing, as the core library uses Node.js APIs that aren't available in the browser.
