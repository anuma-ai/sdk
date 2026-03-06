import * as pdfjs from "pdfjs-dist";

// Configure worker - use CDN in browser, skip in Node.js (uses main-thread fallback)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export async function extractTextFromPdf(pdfDataUrl: string): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument(pdfDataUrl);
    const pdf = await loadingTask.promise;

    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }

    return textParts.join("\n\n");
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

export async function convertPdfToImages(pdfDataUrl: string): Promise<string[]> {
  const images: string[] = [];

  try {
    const loadingTask = pdfjs.getDocument(pdfDataUrl);
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
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
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }

  return images;
}
