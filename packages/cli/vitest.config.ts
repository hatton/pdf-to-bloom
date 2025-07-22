/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    watch: false, // agents keep getting hung up in watch mode
  },
});
