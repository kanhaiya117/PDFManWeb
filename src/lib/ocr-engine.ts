import { pdfjsLib } from '@/lib/pdf-init';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { recognize } from 'tesseract.js';

export interface OcrWord {
  text: string;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence: number;
}

export interface OcrPageResult {
  pageNum: number;
  text: string;
  confidence: number;
  isScanned: boolean;
  words: OcrWord[];
}

export interface OcrProgress {
  status: string;
  progress: number;
  currentPage?: number;
  totalPages?: number;
}

export interface PerformPdfOcrOptions {
  pdfBuffer: ArrayBuffer;
  languages?: string[];
  forceOcr?: boolean;
  onProgress?: (progress: OcrProgress) => void;
}

export interface PerformPdfOcrResult {
  fullText: string;
  pages: OcrPageResult[];
  averageConfidence: number;
  totalWords: number;
  isScannedDocument: boolean;
}

export async function performPdfOcr({
  pdfBuffer,
  languages = ['eng'],
  forceOcr = false,
  onProgress,
}: PerformPdfOcrOptions): Promise<PerformPdfOcrResult> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const totalPages = doc.numPages;
  const pagesResult: OcrPageResult[] = [];
  let combinedText = '';
  let totalConfidenceSum = 0;
  let totalWordsCount = 0;
  let scannedPagesCount = 0;

  const langCode = languages.join('+') || 'eng';

  for (let pNum = 1; pNum <= totalPages; pNum++) {
    onProgress?.({
      status: `Processing page ${pNum} of ${totalPages}...`,
      progress: (pNum - 1) / totalPages,
      currentPage: pNum,
      totalPages,
    });

    const page = await doc.getPage(pNum);
    const textContent = await page.getTextContent();
    const rawItems = textContent.items as any[];
    const digitalText = rawItems.map(it => it.str || '').join(' ').replace(/\s+/g, ' ').trim();

    const isScanned = digitalText.length < 25;
    if (isScanned) scannedPagesCount++;

    if (!forceOcr && !isScanned) {
      // Use high-fidelity digital text layer
      const words: OcrWord[] = rawItems
        .filter(it => it.str && it.str.trim())
        .map(it => ({
          text: it.str.trim(),
          confidence: 100,
          bbox: {
            x0: it.transform[4],
            y0: it.transform[5],
            x1: it.transform[4] + (it.width || 40),
            y1: it.transform[5] + (it.height || 12),
          },
        }));

      pagesResult.push({
        pageNum: pNum,
        text: digitalText,
        confidence: 100,
        isScanned: false,
        words,
      });

      combinedText += `--- Page ${pNum} ---\n${digitalText}\n\n`;
      totalConfidenceSum += 100;
      totalWordsCount += digitalText.split(/\s+/).length;
    } else {
      // Scanned or forced OCR: Render high-resolution canvas and run Tesseract
      onProgress?.({
        status: `Running OCR on page ${pNum} (${langCode})...`,
        progress: (pNum - 0.5) / totalPages,
        currentPage: pNum,
        totalPages,
      });

      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const dataUrl = canvas.toDataURL('image/png');

        try {
          const tesseractRes = await recognize(dataUrl, langCode, {
            logger: (m) => {
              if (m.status === 'recognizing text' && m.progress) {
                const subProgress = ((pNum - 1) + m.progress) / totalPages;
                onProgress?.({
                  status: `Recognizing page ${pNum}: ${(m.progress * 100).toFixed(0)}%`,
                  progress: subProgress,
                  currentPage: pNum,
                  totalPages,
                });
              }
            },
          });

          const pageText = tesseractRes.data.text.trim();
          const pageConfidence = Math.round(tesseractRes.data.confidence || 90);
          const rawWords = (tesseractRes.data as any).words || [];
          const words: OcrWord[] = rawWords.map((w: any) => ({
            text: w.text,
            confidence: w.confidence,
            bbox: w.bbox ? {
              x0: w.bbox.x0 / 2.0, // convert back to standard PDF points
              y0: viewport.height / 2.0 - w.bbox.y1 / 2.0,
              x1: w.bbox.x1 / 2.0,
              y1: viewport.height / 2.0 - w.bbox.y0 / 2.0,
            } : undefined,
          }));

          pagesResult.push({
            pageNum: pNum,
            text: pageText,
            confidence: pageConfidence,
            isScanned: true,
            words,
          });

          combinedText += `--- Page ${pNum} [OCR] ---\n${pageText}\n\n`;
          totalConfidenceSum += pageConfidence;
          totalWordsCount += pageText ? pageText.split(/\s+/).length : 0;
        } catch (ocrErr: any) {
          console.warn(`OCR recognition error on page ${pNum}:`, ocrErr);
          // Fallback if worker fails
          pagesResult.push({
            pageNum: pNum,
            text: digitalText || "[OCR Recognition unavailable]",
            confidence: 50,
            isScanned: true,
            words: [],
          });
          combinedText += `--- Page ${pNum} ---\n${digitalText}\n\n`;
          totalConfidenceSum += 50;
        }
      }
    }
  }

  onProgress?.({
    status: "OCR Processing Complete!",
    progress: 1.0,
    currentPage: totalPages,
    totalPages,
  });

  return {
    fullText: combinedText.trim(),
    pages: pagesResult,
    averageConfidence: Math.round(totalConfidenceSum / totalPages),
    totalWords: totalWordsCount,
    isScannedDocument: scannedPagesCount > totalPages / 2,
  };
}

export async function generateSearchablePdf({
  pdfBuffer,
  ocrResult,
}: {
  pdfBuffer: ArrayBuffer;
  ocrResult: PerformPdfOcrResult;
}): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();

  for (const pageRes of ocrResult.pages) {
    if (pageRes.pageNum > pages.length) continue;
    const page = pages[pageRes.pageNum - 1];
    const { width, height } = page.getSize();

    for (const word of pageRes.words) {
      if (!word.text || !word.text.trim()) continue;

      let x = 50;
      let y = 50;
      let fontSize = 10;

      if (word.bbox) {
        x = Math.max(0, Math.min(width - 20, word.bbox.x0));
        y = Math.max(0, Math.min(height - 20, word.bbox.y0));
        const boxH = Math.abs(word.bbox.y1 - word.bbox.y0);
        if (boxH > 4 && boxH < 40) {
          fontSize = boxH;
        }
      }

      // Draw invisible text layer: standard PDF rendering mode for searchable text
      try {
        page.drawText(word.text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity: 0.0, // Invisible overlay
        });
      } catch {
        // Skip unencodable glyphs in standard font
      }
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}
