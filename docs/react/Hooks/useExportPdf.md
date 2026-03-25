# useExportPdf

> **useExportPdf**(): [`UseExportPdfResult`](UseExportPdfResult.md)

Defined in: [src/react/useExportPdf.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/react/useExportPdf.ts#61)

React hook for exporting content as PDF.

Provides two export paths:

* **DOM capture** (`exportElementToPdf` / `downloadElementAsPdf`): captures a
  rendered HTML element with full styling (syntax highlighting, math, diagrams).
* **Headless** (`exportMarkdownToPdf` / `downloadMarkdownAsPdf`): converts raw
  markdown to a formatted PDF without requiring a DOM.

Exposes `progress` state that updates in real-time during export, and
`renderElementToCanvas` for producing a preview before building the PDF.

## Returns

[`UseExportPdfResult`](UseExportPdfResult.md)
