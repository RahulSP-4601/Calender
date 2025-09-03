// src/types/pdf-parse.d.ts
declare module 'pdf-parse' {
  export interface PDFInfo {
    [k: string]: unknown;
  }
  export interface PDFMetadata {
    [k: string]: unknown;
  }
  export interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata?: PDFMetadata;
    text: string;
    version: string;
  }

  export type PDFParse = (
    data: Buffer | Uint8Array | ArrayBuffer,
    options?: Record<string, unknown>
  ) => Promise<PDFParseResult>;

  const pdfParse: PDFParse;
  export default pdfParse;
}
