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
