import { useCallback, useState } from "react";
import type { FileUIPart } from "ai";

import { extractTextFromPdf } from "../lib/pdf";

const PDF_MIME_TYPE = "application/pdf";

export function usePdf() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const extractPdfContext = useCallback(
    async (files: FileUIPart[]): Promise<string | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const pdfFiles = files.filter(
          (file) =>
            file.mediaType === PDF_MIME_TYPE ||
            file.filename?.toLowerCase().endsWith(".pdf")
        );

        if (pdfFiles.length === 0) {
          return null;
        }

        const contexts = await Promise.all(
          pdfFiles.map(async (file) => {
            if (!file.url) {
              return null;
            }

            try {
              const text = await extractTextFromPdf(file.url);

              if (!text.trim()) {
                console.warn(`No text found in PDF ${file.filename}`);
                return null;
              }

              return `[Context from PDF attachment ${file.filename}]:\n${text}`;
            } catch (err) {
              console.error(`Failed to process PDF ${file.filename}:`, err);
              return null;
            }
          })
        );

        const mergedContext = contexts.filter(Boolean).join("\n\n");
        return mergedContext || null;
      } catch (err) {
        const processedError =
          err instanceof Error ? err : new Error(String(err));
        setError(processedError);
        throw processedError;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    extractPdfContext,
    isProcessing,
    error,
  };
}
