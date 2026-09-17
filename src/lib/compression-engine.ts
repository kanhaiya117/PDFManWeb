import { pdfjsLib } from '@/lib/pdf-init';
import { PDFDocument } from 'pdf-lib';

export type CompressionProfile = 'extreme' | 'recommended' | 'high';

export interface CompressPdfOptions {
  pdfBuffer: ArrayBuffer;
  profile?: CompressionProfile;
  onProgress?: (current: number, total: number) => void;
}

export interface CompressPdfResult {
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  percentReduction: number;
  pageCount: number;
}

export async function compressPdfDocument({
  pdfBuffer,
  profile = 'recommended',
  onProgress,
}: CompressPdfOptions): Promise<CompressPdfResult> {
  const originalSize = pdfBuffer.byteLength;

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const totalPages = doc.numPages;

  // Profile parameter settings
  const config = {
    extreme: { scale: 1.0, quality: 0.55 },
    recommended: { scale: 1.35, quality: 0.75 },
    high: { scale: 1.75, quality: 0.88 },
  }[profile];

  const compressedDoc = await PDFDocument.create();
  compressedDoc.setCreator("PDFMan — Intelligent Compression Engine");

  for (let pNum = 1; pNum <= totalPages; pNum++) {
    onProgress?.(pNum, totalPages);

    const page = await doc.getPage(pNum);
    const viewport = page.getViewport({ scale: config.scale });
    const originalViewport = page.getViewport({ scale: 1.0 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // White background for transparent PDF elements
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', config.quality);

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const embeddedImg = await compressedDoc.embedJpg(bytes);
      const targetPage = compressedDoc.addPage([originalViewport.width, originalViewport.height]);

      targetPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: originalViewport.width,
        height: originalViewport.height,
      });
    }
  }

  // Save with maximum object compression
  const outBytes = await compressedDoc.save({ useObjectStreams: true });
  const compressedSize = outBytes.length;

  const percentReduction = originalSize > 0 
    ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
    : 0;

  const compressedBlob = new Blob([outBytes as any], { type: 'application/pdf' });

  return {
    compressedBlob,
    originalSize,
    compressedSize,
    percentReduction,
    pageCount: totalPages,
  };
}
