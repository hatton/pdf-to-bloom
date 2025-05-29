/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts()],
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
  },

  test: {
    globals: true,
    environment: "node",
  },
});
