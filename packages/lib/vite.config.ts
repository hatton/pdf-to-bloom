/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    dts() as any,
    {
      name: "copy-llm-prompt",
      apply: "build",
      generateBundle() {
        const srcPath = path.resolve(__dirname, "src/2-llm/llmPrompt.txt");
        const content = fs.readFileSync(srcPath, "utf8");
        this.emitFile({
          type: "asset",
          fileName: "llmPrompt.txt",
          source: content,
        });
      },
    } as any,
    {
      name: "copy-pdf-worker",
      apply: "build",
      generateBundle() {
        try {
          const workerPath = path.resolve(
            __dirname,
            "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
          );
          if (fs.existsSync(workerPath)) {
            const content = fs.readFileSync(workerPath);
            this.emitFile({
              type: "asset",
              fileName: "pdf.worker.mjs",
              source: content,
            });
          }
        } catch (error) {
          console.warn("Could not copy PDF.js worker file:", error);
        }
      },
    } as any,
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "PdfToBloom",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "fs",
        "fs/promises",
        "path",
        "os",
        "crypto",
        "child_process",
        "stream",
        "util",
        "url",
        "querystring",
        "http",
        "https",
        "buffer",
        "events",
        "sharp", // Add Sharp as external to avoid bundling issues
      ],
    },
    sourcemap: true,
    minify: false,
  },

  test: {
    globals: true,
    environment: "node",
  },
});
