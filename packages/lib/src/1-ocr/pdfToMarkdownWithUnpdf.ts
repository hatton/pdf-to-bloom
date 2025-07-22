import { logger, LogEntry } from "../logger";
import fs from "fs";
import path from "path";
import { getDocumentProxy, getResolvedPDFJS, definePDFJSModule } from "unpdf";

// Type definitions for unpdf processing
interface UnpdfPage {
  index: number;
  content: Array<{
    type: "text" | "image";
    content: string;
    orderIndex: number;
  }>;
}

/**
 * Converts a PDF file to markdown format using unpdf
 *
 * FUNDAMENTAL REQUIREMENT: This function MUST preserve the exact order of text and images
 * as they appear on each page. The order is determined by the PDF's paint operations,
 * not by document structure or layout analysis.
 *
 * @param pdfPath - Path to the PDF file
 * @param imageOutputDir - Directory where extracted images will be saved
 * @param logCallback - Optional callback to receive log messages
 * @returns Promise resolving to markdown string with content in proper paint order
 */
export async function pdfToMarkdownWithUnpdf(
  pdfPath: string,
  imageOutputDir: string,
  logCallback?: (log: LogEntry) => void
): Promise<string> {
  if (logCallback) logger.subscribe(logCallback);

  try {
    logger.info(
      `Starting PDF to markdown conversion with unpdf for: ${pdfPath}`
    );

    // Check if PDF file exists
    if (!fs.existsSync(pdfPath)) {
      logger.error(`PDF file not found: ${pdfPath}`);
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Get file size for logging
    const fileStats = fs.statSync(pdfPath);
    logger.info(`PDF file size: ${Math.round(fileStats.size / 1024)} KB`);

    // Read PDF file
    logger.verbose("Reading PDF file...");
    const pdfBuffer = fs.readFileSync(pdfPath);
    const uint8Buffer = new Uint8Array(pdfBuffer);

    logger.info("Processing PDF with unpdf...");

    logger.info(`✅ Successfully loaded PDF with unpdf`);

    // Ensure output directory exists
    logger.verbose("Creating output directory for images...");
    if (!fs.existsSync(imageOutputDir)) {
      fs.mkdirSync(imageOutputDir, { recursive: true });
    }

    // CRITICAL: Process pages using PDF.js operator list to maintain EXACT paint order
    // This is a fundamental requirement - text and images must appear in the same order
    // as they were painted on the original PDF page
    const pages = await processPages(uint8Buffer, imageOutputDir);

    // Generate markdown from processed pages
    const markdown = generateMarkdownFromPages(pages);

    logger.info("PDF to markdown conversion completed successfully");
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
 * Process extracted content and organize by pages using PDF.js operator list to maintain paint order
 *
 * FUNDAMENTAL REQUIREMENT: This function uses PDF.js getOperatorList() to preserve the EXACT
 * order that content was painted on each page. Text and images must be interleaved in the
 * same sequence as they appear in the PDF's paint operations.
 *
 * The operator list contains paint operations in chronological order:
 * - OPS.showText/OPS.showSpacedText for text content
 * - OPS.paintImageXObject/OPS.paintXObject for images
 *
 * This ensures the output markdown maintains the visual reading order of the original PDF.
 *
 * @param pdfBuffer - PDF buffer data
 * @param imageOutputDir - Directory to save images
 * @returns Array of processed pages with content in correct paint order
 */
async function processPages(
  pdfBuffer: Uint8Array,
  imageOutputDir: string
): Promise<UnpdfPage[]> {
  const pages: UnpdfPage[] = [];

  // Use the full PDF.js build so we can get image data
  try {
    await definePDFJSModule(() => import("pdfjs-dist"));
  } catch (error) {
    // Fall back to default PDF.js if full build not available
    logger.verbose("Full PDF.js build not available, using default");
  }

  const pdf = await getDocumentProxy(pdfBuffer);
  const { OPS } = await getResolvedPDFJS();

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    // CRITICAL: getOperatorList() returns paint operations in chronological order
    // This is the KEY to preserving text/image ordering as it appeared on the original page
    const op = await page.getOperatorList(); // paint order - DO NOT CHANGE THIS APPROACH
    const objs = page.objs; // image cache

    const events = op.fnArray
      .map((fn: number, i: number) => {
        switch (fn) {
          case OPS.showText:
          case OPS.showSpacedText:
            const textArg = op.argsArray[i][0];
            let textStr = "";

            if (Array.isArray(textArg)) {
              // Handle array of character objects or mixed content
              textStr = textArg
                .map((item) => {
                  if (typeof item === "string") {
                    return item;
                  } else if (typeof item === "number") {
                    return ""; // Skip numeric spacing adjustments
                  } else if (item && typeof item === "object" && item.unicode) {
                    // Handle character objects with unicode property
                    return item.unicode;
                  } else if (
                    item &&
                    typeof item === "object" &&
                    item.fontChar
                  ) {
                    // Handle character objects with fontChar property
                    return item.fontChar;
                  }
                  return "";
                })
                .join("");
            } else if (typeof textArg === "string") {
              textStr = textArg;
            } else {
              textStr = String(textArg);
            }

            return { type: "text" as const, content: textStr };

          case OPS.paintImageXObject:
          case OPS.paintXObject:
            const imageName = op.argsArray[i][0];
            const imageData = objs.get(imageName);
            logger.verbose(
              `Found image operation: ${imageName}, data available: ${!!imageData}`
            );
            return { type: "image" as const, name: imageName, data: imageData };
        }
        return null;
      })
      .filter((event): event is NonNullable<typeof event> => event !== null);

    // CRITICAL: Process events in EXACT order from operator list to preserve paint sequence
    // This maintains the visual reading order from the original PDF page
    const pageContent: Array<{
      type: "text" | "image";
      content: string;
      orderIndex: number;
    }> = [];
    let textAccumulator = "";
    let orderIndex = 0;

    for (const event of events) {
      if (event.type === "text") {
        textAccumulator += event.content;
      } else if (event.type === "image") {
        // IMPORTANT: Flush accumulated text before image to maintain correct interleaving
        if (textAccumulator.trim()) {
          pageContent.push({
            type: "text",
            content: textAccumulator.trim(),
            orderIndex: orderIndex++,
          });
          textAccumulator = "";
        }

        // Process and save image
        try {
          const imageId = `img-${p - 1}-${orderIndex}.png`;
          logger.verbose(
            `Processing image: ${imageId}, event.data: ${!!event.data}, event.name: ${event.name}`
          );

          if (event.data && event.data.data) {
            const imagePath = path.join(imageOutputDir, imageId);
            const imageBuffer = new Uint8Array(event.data.data);
            fs.writeFileSync(imagePath, imageBuffer);
            logger.verbose(`✅ Saved image: ${imageId}`);

            pageContent.push({
              type: "image",
              content: `![${imageId}](${imageId})`,
              orderIndex: orderIndex++,
            });
          } else {
            logger.verbose(
              `❌ Image data not available for: ${imageId}, event.name: ${event.name}`
            );
            // Still add the image placeholder to maintain order
            pageContent.push({
              type: "image",
              content: `<!-- Image ${imageId} not extracted -->`,
              orderIndex: orderIndex++,
            });
          }
        } catch (imageError) {
          logger.error(`Failed to save image: ${imageError}`);
        }
      }
    }

    // Flush any remaining text
    if (textAccumulator.trim()) {
      pageContent.push({
        type: "text",
        content: textAccumulator.trim(),
        orderIndex: orderIndex++,
      });
    }

    pages.push({
      index: p - 1, // Convert to 0-based index
      content: pageContent,
    });
  }

  return pages;
}

/**
 * Generate markdown from processed pages
 *
 * FUNDAMENTAL REQUIREMENT: Content must be sorted by orderIndex to maintain the exact
 * paint order from the original PDF. This preserves the visual reading sequence.
 *
 * @param pages - Array of processed pages with content in paint order
 * @returns Markdown string with content in correct sequence
 */
function generateMarkdownFromPages(pages: UnpdfPage[]): string {
  return pages
    .map((page: UnpdfPage) => {
      const pageHeader = `<!-- page index=${page.index + 1} -->`;

      // CRITICAL: Sort by orderIndex to maintain exact paint order from PDF
      // This preserves the visual reading sequence from the original document
      const sortedContent = page.content
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item) => item.content)
        .join("\n\n");

      return `${pageHeader}\n${sortedContent}`;
    })
    .join("\n\n");
}
