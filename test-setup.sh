#!/bin/bash

# PDF to Bloom - Development Setup Test Script

echo "🚀 Testing PDF to Bloom Monorepo Setup"
echo "======================================="

echo ""
echo "📦 Checking workspace structure..."
yarn workspaces list

echo ""
echo "🔨 Building all packages..."
yarn build

echo ""
echo "✅ Testing CLI..."
yarn workspace @pdf-to-bloom/cli start --help

echo ""
echo "🌐 Web app is available at: http://localhost:3000"
echo "   Run 'yarn start:web' to start the development server"

echo ""
echo "📚 Package Information:"
echo "   • Core library: packages/lib/"
echo "   • CLI tool: packages/cli/"
echo "   • Web app: packages/web/"

echo ""
echo "🎉 Setup complete! All packages are ready for development."
