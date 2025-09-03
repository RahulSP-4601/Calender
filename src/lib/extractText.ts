// src/lib/extractText.ts
// (Types import is optional)
// import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractTextFromPDFBytes(bytes: Uint8Array): Promise<string> {
  // pdfjs-dist expects Uint8Array here
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  let out = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items
      // Type guard is light-weight; items are TextItem|MarkedContent
      .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
      .filter(Boolean);
    out += strings.join(' ') + '\n';
  }

  try { await pdf.cleanup(); } catch {}
  return out;
}
