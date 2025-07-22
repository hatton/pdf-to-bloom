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
  logger.info(
    `${indent}[DEBUG] findImageInData depth=${depth}: Analyzing XObject...`
  );

  if (!xobj) {
    logger.info(`${indent}[DEBUG] XObject is null or undefined`);
    return null;
  }

  // Log XObject properties for debugging
  const objKeys = Object.keys(xobj);
  logger.info(`${indent}[DEBUG] XObject properties: ${objKeys.join(", ")}`);
  logger.info(`${indent}[DEBUG] XObject.kind: ${xobj.kind}`);
  logger.info(`${indent}[DEBUG] XObject.data exists: ${!!xobj.data}`);
  logger.info(`${indent}[DEBUG] XObject.opList exists: ${!!xobj.opList}`);
  logger.info(`${indent}[DEBUG] XObject.resources exists: ${!!xobj.resources}`);

  // Base Case 1: This is a direct Image XObject. We found it.
  if (xobj && xobj.data && xobj.kind === 1) {
    // kind 1 is Image
    logger.info(
      `${indent}[DEBUG] ✅ Found Image XObject! data length: ${xobj.data.length}`
    );
    return xobj.data;
  }

  // Base Case 2: This might be an XObject with image data but different kind
  if (
    xobj &&
    xobj.data &&
    (xobj.kind === 2 || xobj.kind === 3) &&
    !xobj.opList
  ) {
    // kind 2/3 with data but no opList = direct image data, not a form to recurse into
    logger.info(
      `${indent}[DEBUG] ✅ Found XObject with image data (kind=${xobj.kind})! data length: ${xobj.data.length}`
    );
    return xobj.data;
  }

  // Check if this might be an image with different structure
  if (xobj.data && typeof xobj.kind === "undefined") {
    logger.info(
      `${indent}[DEBUG] Found XObject with data but no kind - might be image: data length ${xobj.data.length}`
    );
    // Try to detect if this looks like image data
    if (xobj.data instanceof Uint8Array && xobj.data.length > 100) {
      logger.info(`${indent}[DEBUG] ✅ Treating as potential image data`);
      return xobj.data;
    }
  }

  // Base Case 3: This is not a Form XObject, so we can't search deeper.
  if (!xobj || xobj.kind !== 2 || !xobj.opList) {
    // kind 2 is Form (only recurse if it has opList)
    logger.info(
      `${indent}[DEBUG] Not a Form XObject (kind !== 2 or no opList), stopping recursion`
    );
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

    logger.info(
      `${indent}[DEBUG] Operation ${i}: ${fn} with args: ${JSON.stringify(args)}`
    );

    // Look for paint operators within the form
    if (fn === PDFJSOps.paintImageXObject || fn === PDFJSOps.paintXObject) {
      const imageName = args[0];
      logger.info(
        `${indent}[DEBUG] Found paint operation for '${imageName}', looking in form.resources...`
      );

      if (!form.resources) {
        logger.warn(`${indent}[DEBUG] ❌ Form has no resources!`);
        continue;
      }

      // IMPORTANT: Resources for a form are in `form.resources`, not `page.objs`
      const innerXObj = form.resources.get(imageName);
      logger.info(
        `${indent}[DEBUG] Retrieved inner XObject for '${imageName}': ${!!innerXObj}`
      );

      const imageData = findImageInData(innerXObj, depth + 1); // Recursive call
      if (imageData) {
        logger.info(
          `${indent}[DEBUG] ✅ Found image data in recursion, bubbling up`
        );
        return imageData; // Found the image, bubble it up.
      }
    }
  }

  // If the loop finishes without finding an image.
  logger.info(
    `${indent}[DEBUG] ❌ No image found after checking all operations`
  );
  return null;
}

/**
 * Converts a PDF to markdown, preserving the exact order of text and images
 * by recursively parsing Form XObjects to find embedded images.
 *
 * KNOWN LIMITATION: This approach extracts ALL text operations from the PDF structure,
 * including text that may not be visually rendered. Some PDFs (particularly those created
 * with Adobe Illustrator and processed through Adobe Distiller) may contain hidden or
 * non-visible text layers that appear in the extracted content but are not visible when
 * viewing the PDF. For example, bilingual-sample.pdf contains an English story summary
 * that is embedded in the PDF structure but not visually displayed.
 *
 * This differs from vision-based OCR approaches (like Mistral AI) which only extract
 * visually rendered text. Choose the appropriate method based on your needs:
 * - unpdf: Structural text extraction (includes hidden/searchable text)
 * - Mistral OCR: Visual text extraction (what you see is what you get)
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
    logger.info(`PDF file size: ${pdfBuffer.length} bytes`);
    logger.info("Processing PDF with unpdf");
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
  if (typeof globalThis !== "undefined" && !(globalThis as any).DOMMatrix) {
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

  // No worker configuration needed - let unpdf handle it

  await definePDFJSModule(() => import("pdfjs-dist/legacy/build/pdf.mjs"));
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

    // Track graphics state to filter out invisible text
    let textRenderingMode = 0; // 0 = fill (visible), 3 = invisible
    let isTextVisible = true;
    let graphicsStack: any[] = [];
    let currentTransformMatrix = [1, 0, 0, 1, 0, 0]; // Default transformation matrix
    
    // Track text positioning for line break detection
    let lastTextY = 0;
    let hasTextBeenPlaced = false;

    const flushText = () => {
      if (textAccumulator.trim() && isTextVisible) {
        pageContent.push({
          type: "text",
          content: textAccumulator.trim(),
          orderIndex: orderIndex++,
        });
      }
      textAccumulator = "";
    };

    const { fnArray, argsArray } = opList;
    logger.verbose(
      `Page ${p}: Found ${fnArray.length} operations in operator list`
    );

    // Log all text-related operations for debugging
    const textOperations = [];
    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      if (
        fn === OPS.showText ||
        fn === OPS.showSpacedText ||
        fn === OPS.setTextRenderingMode ||
        fn === OPS.setTextMatrix ||
        fn === OPS.moveText
      ) {
        textOperations.push({ fn, args: argsArray[i], index: i });
      }
    }
    logger.verbose(
      `Page ${p}: Found ${textOperations.length} text-related operations`
    );

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      switch (fn) {
        case OPS.save:
          // Push current graphics state onto stack
          graphicsStack.push({
            textRenderingMode,
            transformMatrix: [...currentTransformMatrix],
          });
          break;

        case OPS.restore:
          // Restore previous graphics state
          if (graphicsStack.length > 0) {
            const state = graphicsStack.pop();
            textRenderingMode = state.textRenderingMode;
            currentTransformMatrix = state.transformMatrix;
            isTextVisible = textRenderingMode !== 3;
          }
          break;

        case OPS.setTextRenderingMode:
          textRenderingMode = args[0];
          // Text rendering modes: 0-2 are visible, 3 is invisible
          isTextVisible = textRenderingMode !== 3;
          logger.verbose(
            `Page ${p}: Text rendering mode changed to ${textRenderingMode} (visible: ${isTextVisible})`
          );
          break;

        case OPS.transform:
          // Update transformation matrix - could affect text positioning/visibility
          const [a, b, c, d, e, f] = args;
          const newMatrix = [
            currentTransformMatrix[0] * a + currentTransformMatrix[2] * b,
            currentTransformMatrix[1] * a + currentTransformMatrix[3] * b,
            currentTransformMatrix[0] * c + currentTransformMatrix[2] * d,
            currentTransformMatrix[1] * c + currentTransformMatrix[3] * d,
            currentTransformMatrix[0] * e +
              currentTransformMatrix[2] * f +
              currentTransformMatrix[4],
            currentTransformMatrix[1] * e +
              currentTransformMatrix[3] * f +
              currentTransformMatrix[5],
          ];
          currentTransformMatrix = newMatrix;
          break;

        case OPS.showText:
        case OPS.showSpacedText:
          const textArg = args[0];
          if (Array.isArray(textArg) && isTextVisible) {
            const extractedText = textArg
              .map((item) => (item && item.unicode ? item.unicode : ""))
              .join("");

            textAccumulator += extractedText;
          } else if (!isTextVisible) {
            logger.verbose(`Page ${p}: Skipping invisible text operation`);
          }
          break;

        case OPS.paintImageXObject:
        case OPS.paintXObject:
        case OPS.paintImageMaskXObject:
          // An image operation is a natural break for text. Flush any pending text first.
          flushText();

          // Handle different argument structures
          let imageName: string;
          if (fn === OPS.paintImageMaskXObject) {
            // For paintImageMaskXObject, args[0] is an object with data, width, height properties
            const maskData = args[0] as any;
            imageName = maskData?.data || "unknown_mask";
            logger.info(
              `Page ${p}: Found paintImageMaskXObject operation with imageName: '${imageName}', width: ${maskData?.width}, height: ${maskData?.height}`
            );
          } else {
            // For paintImageXObject and paintXObject, args[0] is the image name directly
            imageName = args[0];
            logger.info(
              `Page ${p}: Found paint operation for XObject '${imageName}' with type: ${fn === OPS.paintImageXObject ? "paintImageXObject" : "paintXObject"}.`
            );
          }

          // Try to get the XObject - this may throw if object isn't resolved yet
          let xobj;
          try {
            xobj = objs.get(imageName);
            logger.info(
              `Page ${p}: Retrieved XObject '${imageName}': ${!!xobj}`
            );
          } catch (error) {
            logger.warn(
              `Page ${p}: Failed to retrieve XObject '${imageName}': ${error instanceof Error ? error.message : String(error)}`
            );

            // Add a placeholder comment indicating the missing image
            pageContent.push({
              type: "image",
              content: `<!-- Image XObject ${imageName} not available (PDF.js error: ${error instanceof Error ? error.message : String(error)}) -->`,
              orderIndex: orderIndex++,
            });

            // Continue processing without throwing an error
            break;
          }

          // If the object is not resolved yet, skip with graceful handling
          if (!xobj) {
            logger.warn(
              `Page ${p}: XObject '${imageName}' not resolved yet, skipping...`
            );

            // Add a placeholder comment indicating the missing image
            pageContent.push({
              type: "image",
              content: `<!-- Image XObject ${imageName} not available (unresolved reference) -->`,
              orderIndex: orderIndex++,
            });

            // Continue processing without throwing an error
            break;
          }

          // Successfully retrieved XObject, process it
          const objKeys = Object.keys(xobj);
          logger.info(
            `Page ${p}: XObject '${imageName}' properties: ${objKeys.join(", ")}`
          );

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
          // Extract Y position from text matrix to detect line breaks
          const textMatrix = args[0] || args; // The matrix might be the first argument
          let currentTextY = 0;
          
          // Handle both array format [a,b,c,d,e,f] and object format {"0":a,"1":b,...,"5":f}
          if (Array.isArray(textMatrix)) {
            currentTextY = textMatrix[5] || 0;
          } else if (textMatrix && typeof textMatrix === 'object') {
            currentTextY = textMatrix["5"] || 0;
          }
          
          // Debug output for page 1
          if (p === 1) {
            logger.verbose(`Page ${p}: setTextMatrix args=${JSON.stringify(args)}, textMatrix=${JSON.stringify(textMatrix)}, Y=${currentTextY}, lastY=${lastTextY}, diff=${Math.abs(currentTextY - lastTextY)}`);
          }
          
          // If this is a significant vertical movement, it likely indicates a new line
          // Increased threshold to 5 points to better detect line breaks
          if (hasTextBeenPlaced && Math.abs(currentTextY - lastTextY) > 5) {
            // Flush accumulated text as a separate text block
            logger.verbose(`Page ${p}: Line break detected - Y changed from ${lastTextY} to ${currentTextY} (diff: ${Math.abs(currentTextY - lastTextY)})`);
            flushText();
          } else if (textAccumulator.length > 0 && !textAccumulator.endsWith(" ")) {
            // Small position changes within same line - just add space
            textAccumulator += " ";
          }
          
          lastTextY = currentTextY;
          hasTextBeenPlaced = true;
          break;
          
        case OPS.moveText:
          // Text movement operation - check if it's a significant move indicating a new line
          const [, ty] = args;
          if (p === 1) {
            logger.verbose(`Page ${p}: moveText args=${JSON.stringify(args)}, dy=${ty}`);
          }
          if (ty !== 0 && Math.abs(ty) > 5) {
            logger.verbose(`Page ${p}: Text move operation - dy=${ty}, flushing text`);
            flushText();
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
      // Use the same format as Mistral OCR approach for consistency
      const pageHeader = `<!-- page index=${page.index + 1} -->`;

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

      return `${pageHeader}\n${sortedContent}`;
    })
    .join("\n\n");
}
