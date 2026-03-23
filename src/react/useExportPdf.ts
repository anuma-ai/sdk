import { useCallback, useState } from "react";

import type { PdfExportOptions, PdfExportProgress } from "../lib/pdf-export";
import { exportElementToPdf, exportMarkdownToPdf, renderElementToCanvas } from "../lib/pdf-export";

/**
 * Result returned by the useExportPdf hook.
 * @category Hooks
 */
export interface UseExportPdfResult {
  /** DOM capture: export a rendered HTML element as a high-fidelity PDF */
  exportElementToPdf: (element: HTMLElement, options?: PdfExportOptions) => Promise<Blob>;
  /** Headless: export a raw markdown string as PDF (no DOM required) */
  exportMarkdownToPdf: (markdown: string, options?: PdfExportOptions) => Promise<Blob>;
  /** Convenience: export element and trigger browser download */
  downloadElementAsPdf: (element: HTMLElement, options?: PdfExportOptions) => Promise<void>;
  /** Convenience: export markdown and trigger browser download */
  downloadMarkdownAsPdf: (markdown: string, options?: PdfExportOptions) => Promise<void>;
  /** Render an element to canvas for preview (first half of DOM capture pipeline) */
  renderElementToCanvas: (element: HTMLElement) => Promise<HTMLCanvasElement>;
  /** Whether a PDF export is currently in progress */
  isExporting: boolean;
  /** Current export progress, or null when idle */
  progress: PdfExportProgress | null;
  /** Error from the last export attempt */
  error: Error | null;
}

const DEFAULT_FILENAME = "document.pdf";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revocation so the browser can finish initiating the download
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * React hook for exporting content as PDF.
 *
 * Provides two export paths:
 * - **DOM capture** (`exportElementToPdf` / `downloadElementAsPdf`): captures a
 *   rendered HTML element with full styling (syntax highlighting, math, diagrams).
 * - **Headless** (`exportMarkdownToPdf` / `downloadMarkdownAsPdf`): converts raw
 *   markdown to a formatted PDF without requiring a DOM.
 *
 * Exposes `progress` state that updates in real-time during export, and
 * `renderElementToCanvas` for producing a preview before building the PDF.
 *
 * @category Hooks
 */
export function useExportPdf(): UseExportPdfResult {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<PdfExportProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const wrappedExportElement = useCallback(
    async (element: HTMLElement, options?: PdfExportOptions): Promise<Blob> => {
      setIsExporting(true);
      setError(null);
      setProgress({ stage: "preparing", percent: 0 });
      try {
        return await exportElementToPdf(element, {
          ...options,
          onProgress: (p) => {
            setProgress(p);
            options?.onProgress?.(p);
          },
        });
      } catch (err) {
        const processed = toError(err);
        setError(processed);
        throw processed;
      } finally {
        setIsExporting(false);
        setProgress(null);
      }
    },
    []
  );

  const wrappedExportMarkdown = useCallback(
    async (markdown: string, options?: PdfExportOptions): Promise<Blob> => {
      setIsExporting(true);
      setError(null);
      setProgress({ stage: "preparing", percent: 0 });
      try {
        return await exportMarkdownToPdf(markdown, {
          ...options,
          onProgress: (p) => {
            setProgress(p);
            options?.onProgress?.(p);
          },
        });
      } catch (err) {
        const processed = toError(err);
        setError(processed);
        throw processed;
      } finally {
        setIsExporting(false);
        setProgress(null);
      }
    },
    []
  );

  const downloadElementAsPdf = useCallback(
    async (element: HTMLElement, options?: PdfExportOptions): Promise<void> => {
      const blob = await wrappedExportElement(element, options);
      triggerDownload(blob, options?.filename ?? DEFAULT_FILENAME);
    },
    [wrappedExportElement]
  );

  const downloadMarkdownAsPdf = useCallback(
    async (markdown: string, options?: PdfExportOptions): Promise<void> => {
      const blob = await wrappedExportMarkdown(markdown, options);
      triggerDownload(blob, options?.filename ?? DEFAULT_FILENAME);
    },
    [wrappedExportMarkdown]
  );

  const wrappedRenderToCanvas = useCallback(
    async (element: HTMLElement): Promise<HTMLCanvasElement> => {
      setIsExporting(true);
      setError(null);
      setProgress({ stage: "preparing", percent: 0 });
      try {
        const canvas = await renderElementToCanvas(element, { onProgress: setProgress });
        return canvas;
      } catch (err) {
        const processed = toError(err);
        setError(processed);
        throw processed;
      } finally {
        setIsExporting(false);
        setProgress(null);
      }
    },
    []
  );

  return {
    exportElementToPdf: wrappedExportElement,
    exportMarkdownToPdf: wrappedExportMarkdown,
    downloadElementAsPdf,
    downloadMarkdownAsPdf,
    renderElementToCanvas: wrappedRenderToCanvas,
    isExporting,
    progress,
    error,
  };
}
