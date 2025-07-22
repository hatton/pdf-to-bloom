import { logger, LogEntry } from "../logger";
import fs from "fs";
import path from "path";
import { getDocumentProxy, getResolvedPDFJS, definePDFJSModule } from "unpdf";

// We need the full PDF.js types for this, but 'any' will suffice for demonstration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PDFJSOps: any;

interface UnpdfPage {
  index: number;
  content: Array<{
    type: "text" | "image";
    content: string;
    orderIndex: number;
  }>;
}

/**
 * Recursively searches within an XObject (which could be a Form) to find the raw image data.
 * This is the key to handling images embedded inside Form XObjects.
 *
 * @param xobj - The XObject to search, retrieved from page.objs or form.resources.
 * @param depth - Current recursion depth for logging
 * @returns The Uint8Array of the image data if found, otherwise null.
 */
function findImageInData(xobj: any, depth: number = 0): Uint8Array | null {
  const indent = "  ".repeat(depth);
  logger.info(`${indent}[DEBUG] findImageInData depth=${depth}: Analyzing XObject...`);
  
  if (!xobj) {
    logger.info(`${indent}[DEBUG] XObject is null or undefined`);
    return null;
  }

  // Log XObject properties for debugging
  const objKeys = Object.keys(xobj);
  logger.info(`${indent}[DEBUG] XObject properties: ${objKeys.join(', ')}`);
  logger.info(`${indent}[DEBUG] XObject.kind: ${xobj.kind}`);
  logger.info(`${indent}[DEBUG] XObject.data exists: ${!!xobj.data}`);
  logger.info(`${indent}[DEBUG] XObject.opList exists: ${!!xobj.opList}`);
  logger.info(`${indent}[DEBUG] XObject.resources exists: ${!!xobj.resources}`);

  // Base Case 1: This is a direct Image XObject. We found it.
  if (xobj && xobj.data && xobj.kind === 1) {
    // kind 1 is Image
    logger.info(`${indent}[DEBUG] ✅ Found Image XObject! data length: ${xobj.data.length}`);
    return xobj.data;
  }

  // Base Case 2: This might be an XObject with image data but different kind
  if (xobj && xobj.data && (xobj.kind === 2 || xobj.kind === 3) && !xobj.opList) {
    // kind 2/3 with data but no opList = direct image data, not a form to recurse into
    logger.info(`${indent}[DEBUG] ✅ Found XObject with image data (kind=${xobj.kind})! data length: ${xobj.data.length}`);
    return xobj.data;
  }

  // Check if this might be an image with different structure
  if (xobj.data && typeof xobj.kind === 'undefined') {
    logger.info(`${indent}[DEBUG] Found XObject with data but no kind - might be image: data length ${xobj.data.length}`);
    // Try to detect if this looks like image data
    if (xobj.data instanceof Uint8Array && xobj.data.length > 100) {
      logger.info(`${indent}[DEBUG] ✅ Treating as potential image data`);
      return xobj.data;
    }
  }

  // Base Case 3: This is not a Form XObject, so we can't search deeper.
  if (!xobj || xobj.kind !== 2 || !xobj.opList) {
    // kind 2 is Form (only recurse if it has opList)
    logger.info(`${indent}[DEBUG] Not a Form XObject (kind !== 2 or no opList), stopping recursion`);
    return null;
  }

  // Recursive Step: This is a Form XObject. We need to parse its operator list.
  logger.info(`${indent}[DEBUG] Found Form XObject, parsing operator list...`);
  const form = xobj;
  const { fnArray, argsArray } = form.opList;
  logger.info(`${indent}[DEBUG] Form has ${fnArray.length} operations`);

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];

    logger.info(`${indent}[DEBUG] Operation ${i}: ${fn} with args: ${JSON.stringify(args)}`);

    // Look for paint operators within the form
    if (fn === PDFJSOps.paintImageXObject || fn === PDFJSOps.paintXObject) {
      const imageName = args[0];
      logger.info(`${indent}[DEBUG] Found paint operation for '${imageName}', looking in form.resources...`);
      
      if (!form.resources) {
        logger.warn(`${indent}[DEBUG] ❌ Form has no resources!`);
        continue;
      }
      
      // IMPORTANT: Resources for a form are in `form.resources`, not `page.objs`
      const innerXObj = form.resources.get(imageName);
      logger.info(`${indent}[DEBUG] Retrieved inner XObject for '${imageName}': ${!!innerXObj}`);
      
      const imageData = findImageInData(innerXObj, depth + 1); // Recursive call
      if (imageData) {
        logger.info(`${indent}[DEBUG] ✅ Found image data in recursion, bubbling up`);
        return imageData; // Found the image, bubble it up.
      }
    }
  }

  // If the loop finishes without finding an image.
  logger.info(`${indent}[DEBUG] ❌ No image found after checking all operations`);
  return null;
}

/**
 * Converts a PDF to markdown, preserving the exact order of text and images
 * by recursively parsing Form XObjects to find embedded images.
 *
 * @param pdfPath - Path to the PDF file
 * @param imageOutputDir - Directory where extracted images will be saved
 * @param logCallback - Optional callback to receive log messages
 * @returns Promise resolving to markdown string
 */
export async function pdfToMarkdownWithUnpdf(
  pdfPath: string,
  imageOutputDir: string,
  logCallback?: (log: LogEntry) => void
): Promise<string> {
  if (logCallback) logger.subscribe(logCallback);

  try {
    logger.info(`Starting PDF to markdown conversion for: ${pdfPath}`);
    if (!fs.existsSync(pdfPath))
      throw new Error(`PDF file not found: ${pdfPath}`);

    const pdfBuffer = new Uint8Array(fs.readFileSync(pdfPath));
    if (!fs.existsSync(imageOutputDir))
      fs.mkdirSync(imageOutputDir, { recursive: true });

    const pages = await processPages(pdfBuffer, imageOutputDir);

    const markdown = generateMarkdownFromPages(pages);
    logger.info("✅ PDF to markdown conversion completed successfully.");
    return markdown;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`unpdf processing failed: ${errorMessage}`);
    throw new Error(`unpdf processing failed: ${errorMessage}`);
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}

/**
 * Processes pages by iterating through the operator list to maintain paint order.
 * When a paintXObject is found, it uses a recursive helper to find the actual image data.
 *
 * @param pdfBuffer - PDF buffer data
 * @param imageOutputDir - Directory to save images
 * @returns Array of processed pages
 */
async function processPages(
  pdfBuffer: Uint8Array,
  imageOutputDir: string
): Promise<UnpdfPage[]> {
  // Polyfill DOMMatrix for Node.js environment
  if (typeof globalThis !== 'undefined' && !(globalThis as any).DOMMatrix) {
    // Simple identity matrix polyfill
    (globalThis as any).DOMMatrix = class DOMMatrix {
      a: number = 1;
      b: number = 0;
      c: number = 0;
      d: number = 1;
      e: number = 0;
      f: number = 0;
      
      constructor(init?: string | number[]) {
        if (Array.isArray(init) && init.length >= 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }
      
      multiply(other: DOMMatrix): DOMMatrix {
        const result = new DOMMatrix();
        result.a = this.a * other.a + this.b * other.c;
        result.b = this.a * other.b + this.b * other.d;
        result.c = this.c * other.a + this.d * other.c;
        result.d = this.c * other.b + this.d * other.d;
        result.e = this.e * other.a + this.f * other.c + other.e;
        result.f = this.e * other.b + this.f * other.d + other.f;
        return result;
      }
    };
  }

  await definePDFJSModule(() => import("pdfjs-dist"));
  const { OPS } = await getResolvedPDFJS();
  PDFJSOps = OPS; // Store OPS globally for the helper function

  const pdf = await getDocumentProxy(pdfBuffer);
  const pages: UnpdfPage[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const opList = await page.getOperatorList();
    const objs = page.objs;

    const pageContent: UnpdfPage["content"] = [];
    let textAccumulator = "";
    let orderIndex = 0;

    const flushText = () => {
      if (textAccumulator.trim()) {
        pageContent.push({
          type: "text",
          content: textAccumulator.trim().replace(/\s+/g, " "), // Normalize whitespace
          orderIndex: orderIndex++,
        });
        textAccumulator = "";
      }
    };

    const { fnArray, argsArray } = opList;
    logger.verbose(`Page ${p}: Found ${fnArray.length} operations in operator list`);
    
    // For page 4, log all operations to debug image detection
    if (p === 4) {
      logger.info(`Page ${p}: Analyzing all ${fnArray.length} operations for image detection...`);
      for (let i = 0; i < fnArray.length; i++) {
        const fn = fnArray[i];
        const args = argsArray[i];
        if (fn === OPS.paintImageXObject || fn === OPS.paintXObject) {
          logger.info(`Page ${p}: Operation ${i}: ${fn === OPS.paintImageXObject ? 'paintImageXObject' : 'paintXObject'} with args: ${JSON.stringify(args)}`);
        }
      }
    }
    
    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      switch (fn) {
        case OPS.showText:
        case OPS.showSpacedText:
          const textArg = args[0];
          if (Array.isArray(textArg)) {
            textAccumulator += textArg
              .map((item) => (item && item.unicode ? item.unicode : ""))
              .join("");
          }
          break;

        case OPS.paintImageXObject:
        case OPS.paintXObject:
          // An image operation is a natural break for text. Flush any pending text first.
          flushText();

          const imageName = args[0];
          const xobj = objs.get(imageName);

          logger.info(
            `Page ${p}: Found paint operation for XObject '${imageName}' with type: ${fn === OPS.paintImageXObject ? 'paintImageXObject' : 'paintXObject'}.`
          );
          
          // Debug XObject retrieval
          logger.info(`Page ${p}: Retrieved XObject '${imageName}': ${!!xobj}`);
          if (xobj) {
            const objKeys = Object.keys(xobj);
            logger.info(`Page ${p}: XObject '${imageName}' properties: ${objKeys.join(', ')}`);
          }
          
          const imageData = findImageInData(xobj); // Use the recursive helper

          if (imageData) {
            const imageId = `page${p}-img${orderIndex}.png`;
            const imagePath = path.join(imageOutputDir, imageId);
            fs.writeFileSync(imagePath, imageData);
            logger.verbose(
              `✅ Saved image: ${imagePath} from XObject '${imageName}'.`
            );

            pageContent.push({
              type: "image",
              content: `![Image](${imagePath})`,
              orderIndex: orderIndex++,
            });
          } else {
            logger.warn(
              `❌ Could not extract image data from XObject '${imageName}' on page ${p}.`
            );
            pageContent.push({
              type: "image",
              content: `<!-- Image from XObject ${imageName} could not be extracted -->`,
              orderIndex: orderIndex++,
            });
          }
          break;

        case OPS.setTextMatrix:
          // A change in text position often implies a new block. Add a space.
          if (textAccumulator.length > 0 && !textAccumulator.endsWith(" ")) {
            textAccumulator += " ";
          }
          break;
      }
    }

    // Flush any remaining text at the end of the page processing
    flushText();

    pages.push({
      index: p - 1,
      content: pageContent,
    });
  }
  return pages;
}

/**
 * Generates markdown from processed pages, sorting content by its order index.
 *
 * @param pages - Array of processed pages
 * @returns Markdown string
 */
function generateMarkdownFromPages(pages: UnpdfPage[]): string {
  return pages
    .map((page) => {
      const pageHeader = `==Start of OCR for page ${page.index + 1}==`;
      const pageFooter = `==End of OCR for page ${page.index + 1}==`;

      const sortedContent = page.content
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item) => {
          if (item.type === "image") {
            return item.content;
          }
          // For text, wrap it to look more like the original OCR format
          return item.content;
        })
        .join("\n"); // Join with single newline to match OCR format

      return `${pageHeader}\n${sortedContent}\n${pageFooter}`;
    })
    .join("\n\n");
}
