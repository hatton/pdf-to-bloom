import { existsSync } from "fs";
import { dirname, join } from "path";
import type { Book, ValidationError } from "../types";

export function validateImages(book: Book, markdownPath: string): ValidationError[] {
  const warnings: ValidationError[] = [];
  const baseDir = dirname(markdownPath);
  book.pages.forEach((page, index) => {
    page.elements.forEach((element) => {
      if (element.type === "image") {
        const fullPath = join(baseDir, element.src);
        if (!existsSync(fullPath)) {
          warnings.push({
            type: "warning",
            message: `Image not found: ${element.src} (page ${index + 1})`,
          });
        }
      }
    });
  });
  return warnings;
}
