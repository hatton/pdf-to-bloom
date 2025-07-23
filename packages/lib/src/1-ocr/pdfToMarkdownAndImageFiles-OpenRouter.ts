import { logger, LogEntry } from "../logger";
import fs from "fs";

// Type definitions for OpenRouter OCR response
interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: Array<{
    type: "text" | "file";
    text?: string;
    file?: {
      filename: string;
      file_data: string;
    };
  }>;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Model aliases for easier use
 */
const MODEL_ALIASES: Record<string, string> = {
  gemini: "google/gemini-2.5-pro",
  "4o": "openai/gpt-4o",
};

/**
 * Resolve model name from alias or return as-is
 */
function resolveModelName(model: string): string {
  return MODEL_ALIASES[model] || model;
}

/**
 * Converts a PDF file to markdown format using OpenRouter models
 * @param pdfPath - Path to the PDF file
 * @param imageOutputDir - Directory where extracted images will be saved
 * @param openRouterApiKey - OpenRouter API key for processing
 * @param modelName - Model name (can be alias like "gemini" or full name like "google/gemini-2.5-pro")
 * @param logCallback - Optional callback to receive log messages
 * @returns Promise resolving to markdown string
 */
export async function pdfToMarkdownAndImageFiles(
  pdfPath: string,
  imageOutputDir: string,
  openRouterApiKey: string,
  modelName: string = "gemini",
  logCallback?: (log: LogEntry) => void
): Promise<string> {
  if (logCallback) logger.subscribe(logCallback);

  try {
    // Validate API key
    if (!openRouterApiKey || openRouterApiKey.trim() === "") {
      logger.error("OpenRouter API key is required");
      throw new Error("OpenRouter API key is required");
    }

    const resolvedModel = resolveModelName(modelName);
    logger.info(
      `Starting PDF to markdown conversion for: ${pdfPath} using model: ${resolvedModel}`
    );

    // Check if PDF file exists
    if (!fs.existsSync(pdfPath)) {
      logger.error(`PDF file not found: ${pdfPath}`);
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Get file size for logging
    const fileStats = fs.statSync(pdfPath);
    logger.info(`PDF file size: ${Math.round(fileStats.size / 1024)} KB`);

    // Read and encode PDF as base64
    logger.verbose("Reading PDF file and encoding to base64...");
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Pdf = pdfBuffer.toString("base64");

    logger.info("Sending PDF to OpenRouter model...");

    // Prepare the request for OpenRouter
    const systemPrompt = `You are an expert in OCRing documents in languages you have never seen before. Convert the provided PDF pages to markdown format. 
Starting with the very first line and then again for each page, insert a <!-- page-index="1" -->. Drop the text giving the page number at the bottom. For images, include a markdown image reference. Be super careful with the transcription, preferring the embedded unicode over optical recognition. This may include minority language text with unusual characters. Therefore, do not omit or substitute any characters, and preserve all Unicode exactly as present, including rare IPA symbols and diacritics."`;

    // Upload the PDF using OpenRouter's file format
    const userMessage: OpenRouterMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: "Please convert this PDF to markdown format following the requirements specified in the system prompt.",
        },
        {
          type: "file",
          file: {
            filename: "document.pdf",
            file_data: `data:application/pdf;base64,${base64Pdf}`,
          },
        },
      ],
    };

    const requestBody = {
      model: resolvedModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        userMessage,
      ],
      plugins: [
        {
          id: "file-parser",
          pdf: {
            engine: "pdf-text", // or 'mistral-ocr' or 'native'
          },
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/hatton/pdf-to-bloom",
          "X-Title": "PDF to Bloom Converter",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `OpenRouter API request failed: ${response.status} ${response.statusText}`
      );
      logger.error(`Error details: ${errorText}`);
      throw new Error(
        `OpenRouter API request failed: ${response.status} ${response.statusText}`
      );
    }

    const ocrResponse = (await response.json()) as OpenRouterResponse;

    if (!ocrResponse.choices || ocrResponse.choices.length === 0) {
      logger.error("OCR request failed: No response choices received");
      throw new Error("OCR request failed: No response choices received");
    }

    logger.info("✅ Received response from OpenRouter model");

    let markdown = ocrResponse.choices[0].message.content;

    // Ensure we have page markers if not present
    if (!markdown.includes("<!-- page")) {
      markdown = `<!-- page index=1 -->\n${markdown}`;
    }

    // Ensure output directory exists
    logger.verbose("Creating output directory for images...");
    if (!fs.existsSync(imageOutputDir)) {
      fs.mkdirSync(imageOutputDir, { recursive: true });
    }

    // Note: OpenRouter models typically don't extract separate images like Mistral's OCR
    // The images are described in the markdown text rather than provided as separate base64 data
    // If image extraction is needed, additional processing would be required

    logger.info("PDF to markdown conversion completed successfully");
    return markdown;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`OpenRouter OCR failed: ${errorMessage}`);
    throw new Error(`OpenRouter OCR processing failed: ${errorMessage}`);
  } finally {
    if (logCallback) logger.unsubscribe(logCallback);
  }
}

/**
 * Get available model aliases
 */
export function getModelAliases(): Record<string, string> {
  return { ...MODEL_ALIASES };
}
