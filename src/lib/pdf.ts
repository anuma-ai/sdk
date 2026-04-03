let pdfjsModule: typeof import("pdfjs-dist") | null = null;
let workerConfigured = false;

async function getPdfjs() {
  if (!pdfjsModule) {
    pdfjsModule = await import("pdfjs-dist");

    // Configure worker - use CDN in browser, skip in Node.js (uses main-thread fallback)
    if (!workerConfigured && typeof window !== "undefined") {
      pdfjsModule.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsModule.version}/build/pdf.worker.min.mjs`;
      workerConfigured = true;
    }
  }
  return pdfjsModule;
}

export async function extractTextFromPdf(pdfDataUrl: string): Promise<string> {
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument(pdfDataUrl);
  const pdf = await loadingTask.promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");

    if (pageText.trim()) {
      textParts.push(pageText);
    }
  }

  return textParts.join("\n\n");
}

export async function convertPdfToImages(pdfDataUrl: string, maxPages?: number): Promise<string[]> {
  const images: string[] = [];

  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument(pdfDataUrl);
  const pdf = await loadingTask.promise;

  const pageLimit = maxPages != null ? Math.min(maxPages, pdf.numPages) : pdf.numPages;

  for (let i = 1; i <= pageLimit; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    images.push(canvas.toDataURL("image/png"));
  }

  return images;
}
