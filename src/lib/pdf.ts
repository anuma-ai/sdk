// Load pdfjs from CDN to avoid webpack bundling issues
let pdfjsLib: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;

  // Load the library from CDN
  const script = document.createElement("script");
  script.src = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js";

  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // @ts-ignore
  pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

  return pdfjsLib;
}

export async function extractTextFromPdf(pdfDataUrl: string): Promise<string> {
  const pdfjs = await loadPdfJs();

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

export async function convertPdfToImages(
  pdfDataUrl: string
): Promise<string[]> {
  const images: string[] = [];

  const pdfjs = await loadPdfJs();

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
