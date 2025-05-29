import type { Layout, PageContent } from "./types.js";

export type ElementFlavor =
  | "image"
  | "l1-only"
  | "l2-only"
  | "multiple-languages";

export function determinePageLayout(
  items: Array<ElementFlavor>
): PageContent["layout"] {
  const patterns: Array<{ pattern: Array<string>; layout: Layout }> = [
    { pattern: ["image"], layout: "image-only" },
    { pattern: ["l1-only"], layout: "text-only" },
    { pattern: ["l2-only"], layout: "text-only" },
    {
      pattern: ["l1-only", "image", "l2-only"],
      layout: "bilingual-text-image-text",
    },
    { pattern: ["image", "l1-only"], layout: "image-top-text-bottom" },
    {
      pattern: ["image", "multiple-languages"],
      layout: "image-top-text-bottom",
    },
    { pattern: ["l1-only", "image"], layout: "text-top-image-bottom" },
    {
      pattern: ["multiple-languages", "image"],
      layout: "text-top-image-bottom",
    },
    { pattern: ["l1-only", "image", "l1-only"], layout: "text-image-text" },
    { pattern: ["l2-only", "image", "l2-only"], layout: "text-image-text" },
  ];

  for (const { pattern, layout } of patterns) {
    if (
      items.length === pattern.length &&
      items.every((item, index) => item === pattern[index])
    ) {
      return layout;
    }
  }

  // If no specific pattern matches, default to text-only
  return "text-only";
}
