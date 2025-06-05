import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { Parser } from "./parseMarkdown";
import { validateImages } from "./validateImages";

describe("validateImages", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-to-bloom-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns warning when image missing", () => {
    const md = `---\nallTitles:\n  en: title\nlanguages:\n  en: English\nl1: en\n---\n![img](missing.png)`;
    const parser = new Parser();
    const book = parser.parseMarkdown(md);
    const warnings = validateImages(book, path.join(tempDir, "test.md"));
    expect(warnings.length).toBe(1);
    expect(warnings[0].message).toContain("missing.png");
  });

  it("does not warn when image exists", () => {
    const md = `---\nallTitles:\n  en: title\nlanguages:\n  en: English\nl1: en\n---\n![img](exists.png)`;
    const imgPath = path.join(tempDir, "exists.png");
    fs.writeFileSync(imgPath, "test");
    const parser = new Parser();
    const book = parser.parseMarkdown(md);
    const warnings = validateImages(book, path.join(tempDir, "file.md"));
    expect(warnings.length).toBe(0);
  });
});
