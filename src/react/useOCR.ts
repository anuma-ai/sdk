import { useCallback, useState } from "react";
import Tesseract from "tesseract.js";

import { convertPdfToImages } from "../lib/pdf";
import { getLogger } from "../lib/logger";

export interface OCRFile {
  url: string | File | Blob;
  filename?: string;
  language?: string;
}

/**
 * Result returned by the useOCR hook.
 * @category Hooks
 */
export interface UseOCRResult {
  /** Extract text from images using OCR */
  extractOCRContext: (files: OCRFile[]) => Promise<string | null>;
  /** Whether OCR processing is in progress */
  isProcessing: boolean;
  /** Error from the last OCR extraction attempt */
  error: Error | null;
}

/**
 * React hook for extracting text from images using OCR.
 * @category Hooks
 */
export function useOCR(): UseOCRResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const extractOCRContext = useCallback(async (files: OCRFile[]): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      if (files.length === 0) {
        return null;
      }

      const contexts = await Promise.all(
        files.map(async (file) => {
          try {
            let imagesToProcess: Array<string | File | Blob> = [];
            const language = file.language || "eng";
            const filename = file.filename || (file.url instanceof File ? file.url.name : "");

            // Determine if it's a PDF
            let isPdf = false;
            if (typeof file.url === "string") {
              isPdf =
                file.url.toLowerCase().endsWith(".pdf") ||
                (filename?.toLowerCase().endsWith(".pdf") ?? false);
            } else if (file.url instanceof Blob) {
              isPdf =
                file.url.type === "application/pdf" ||
                (filename?.toLowerCase().endsWith(".pdf") ?? false);
            }

            if (isPdf) {
              let pdfUrl: string;
              let shouldRevoke = false;

              if (typeof file.url === "string") {
                pdfUrl = file.url;
              } else {
                pdfUrl = URL.createObjectURL(file.url);
                shouldRevoke = true;
              }

              try {
                // Convert PDF to images
                const pdfImages = await convertPdfToImages(pdfUrl);
                imagesToProcess = pdfImages;
              } catch (e) {
                getLogger().error("Failed to convert PDF to images", e);
                throw e;
              } finally {
                if (shouldRevoke) {
                  URL.revokeObjectURL(pdfUrl);
                }
              }
            } else {
              imagesToProcess = [file.url];
            }

            // Process images sequentially to avoid spawning too many workers at once
            const pageTexts: string[] = [];
            for (const image of imagesToProcess) {
              const result = await Tesseract.recognize(image, language);
              pageTexts.push(result.data.text);
            }

            const text = pageTexts.join("\n\n");

            if (!text.trim()) {
              getLogger().warn(`No text found in OCR source ${filename || "unknown"}`);
              return null;
            }

            return `[Context from OCR attachment ${filename || "unknown"}]:\n${text}`;
          } catch (err) {
            getLogger().error(`Failed to process OCR for ${file.filename || "unknown"}:`, err);
            return null;
          }
        })
      );

      const mergedContext = contexts.filter(Boolean).join("\n\n");
      return mergedContext || null;
    } catch (err) {
      const processedError = err instanceof Error ? err : new Error(String(err));
      setError(processedError);
      throw processedError;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    extractOCRContext,
    isProcessing,
    error,
  };
}
