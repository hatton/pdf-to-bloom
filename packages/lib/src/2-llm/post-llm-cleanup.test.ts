import { describe, it, expect } from "vitest";
import { attemptCleanup } from "./post-llm-cleanup";

const validFrontmatter = `---
allTitles:
  en: "Book"
languages:
  en: "English"
l1: en
---`;

function wrapWithFrontmatter(body: string): string {
  return `${validFrontmatter}\n${body}`;
}

describe("attemptCleanup", () => {
  it("strips code block wrappers", () => {
    const wrapped = `\`\`\`\n${wrapWithFrontmatter('<!-- text lang="en" -->\nText')}\n\`\`\``;
    const result = attemptCleanup(wrapped);
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("```");
    expect(result.cleaned.startsWith("---")).toBe(true);
  });

  it("fixes missing opening yaml delimiter", () => {
    const input = `allTitles:\n  en: Book\nlanguages:\n  en: English\nl1: en\n<!-- text lang=\"en\" -->\nText`;
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned.startsWith("---")).toBe(true);
    expect(result.cleaned).toContain('---\n<!-- text lang="en" -->');
  });

  it("reorders language comments after images", () => {
    const input = wrapWithFrontmatter(
      `<!-- text lang="en" -->\n![img](img.png){width=150}`
    );
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).toMatch(
      /!\[img\]\(img.png\)\{width=150\}\n<!-- text lang="en" -->/
    );
  });

  it("returns invalid when leftover code blocks remain", () => {
    const input = wrapWithFrontmatter(
      `<!-- text lang="en" -->\nHere is code:\n\`\`\`js\nconsole.log('hi');\n\`\`\``
    );
    const result = attemptCleanup(input);
    expect(result.valid).toBe(false);
  });

  it("returns invalid when required fields are missing", () => {
    const bad = `---\nallTitles:\n  en: Book\n---\n<!-- text lang="en" -->\ntext`;
    const result = attemptCleanup(bad);
    expect(result.valid).toBe(false);
  });
});
