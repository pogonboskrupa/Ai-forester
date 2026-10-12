/** Čitanje PDF-a u browseru (pdf.js, učitava se tek kad zatreba). PDF ne napušta uređaj. */
import type { PageItems } from './layout';

export interface ReadResult {
  pages: PageItems[];
  pageCount: number;
}

export async function readPdf(data: ArrayBuffer, onProgress?: (page: number, total: number) => void): Promise<ReadResult> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const loading = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await loading.promise;
  const pages: PageItems[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { width } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.flatMap((it) =>
        'str' in it
          ? [{ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number, width: it.width, height: it.height || Math.abs(it.transform[3] as number) }]
          : [],
      );
      pages.push({ width, items });
      onProgress?.(n, doc.numPages);
      page.cleanup();
    }
  } finally {
    await doc.cleanup();
    void loading.destroy();
  }
  return { pages, pageCount: pages.length };
}
