import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { Annotation } from '@/store/workspace';

export interface ExportOptions {
  originalFile: File;
  annotations: Annotation[];
  pageRotations?: Record<number, number>;
  deletedPages?: number[];
  pageOrder?: number[];
  watermarkText?: string;
  watermarkOpacity?: number;
  showPageNumbers?: boolean;
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-right';
  metadata?: { title: string; author: string; subject: string; creator: string };
  flatten?: boolean;
}

// Sanitize string to WinAnsi compatible characters for standard Helvetica font
function sanitizeWinAnsi(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\x7F]/g, '?');
}

// Parse SVG path "M x y L x y ..." into coordinate pairs
function parsePathPoints(pathData: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const regex = /([ML])\s*([-\d.]+)\s+([-\d.]+)/gi;
  let match;
  while ((match = regex.exec(pathData)) !== null) {
    const x = parseFloat(match[2]);
    const y = parseFloat(match[3]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

export async function exportPdfWithAnnotations({
  originalFile,
  annotations,
  pageRotations = {},
  deletedPages = [],
  pageOrder = [],
  watermarkText,
  watermarkOpacity = 0.25,
  showPageNumbers = false,
  pageNumberPosition = 'bottom-center',
  metadata,
}: ExportOptions): Promise<Blob> {
  const fileBuffer = await originalFile.arrayBuffer();
  const srcDoc = await PDFDocument.load(fileBuffer);
  const totalSrcPages = srcDoc.getPageCount();

  // Create target document
  const pdfDoc = await PDFDocument.create();

  // Determine final page sequence
  let targetIndices: number[] = [];
  if (pageOrder && pageOrder.length > 0) {
    targetIndices = pageOrder.filter(idx => idx >= 0 && idx < totalSrcPages && !deletedPages.includes(idx));
  } else {
    for (let i = 0; i < totalSrcPages; i++) {
      if (!deletedPages.includes(i)) {
        targetIndices.push(i);
      }
    }
  }

  // If all pages were deleted, keep at least page 0
  if (targetIndices.length === 0) {
    targetIndices = [0];
  }

  // Copy pages in desired order
  const copiedPages = await pdfDoc.copyPages(srcDoc, targetIndices);
  copiedPages.forEach(p => pdfDoc.addPage(p));

  // Set Document Metadata
  if (metadata) {
    if (metadata.title) pdfDoc.setTitle(metadata.title);
    if (metadata.author) pdfDoc.setAuthor(metadata.author);
    if (metadata.subject) pdfDoc.setSubject(metadata.subject);
    if (metadata.creator) pdfDoc.setCreator(metadata.creator || 'PDFMan');
  } else {
    pdfDoc.setCreator('PDFMan — Fast. Private. Secure.');
  }

  const pages = pdfDoc.getPages();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Apply per-page transformations, watermarks, and numbering
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const origIndex = targetIndices[i];
    const { width, height } = page.getSize();

    // 1. Page Rotation
    const customRotation = pageRotations[origIndex] || 0;
    if (customRotation) {
      const existingRotation = page.getRotation().angle;
      page.setRotation(degrees((existingRotation + customRotation) % 360));
    }

    // 2. Global Watermark
    if (watermarkText && watermarkText.trim()) {
      const cleanWatermark = sanitizeWinAnsi(watermarkText.trim());
      const fontSize = Math.min(width, height) / 9;
      page.drawText(cleanWatermark, {
        x: width * 0.15,
        y: height * 0.45,
        size: fontSize,
        font: helveticaBold,
        color: rgb(0.45, 0.45, 0.45),
        opacity: watermarkOpacity,
        rotate: degrees(45),
      });
    }

    // 3. Page Numbering
    if (showPageNumbers) {
      const numStr = `Page ${i + 1} of ${pages.length}`;
      let posX = width / 2 - 35;
      let posY = 20;

      if (pageNumberPosition === 'bottom-right') {
        posX = width - 90;
        posY = 20;
      } else if (pageNumberPosition === 'top-right') {
        posX = width - 90;
        posY = height - 25;
      }

      page.drawText(numStr, {
        x: posX,
        y: posY,
        size: 10,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    // 4. Apply annotations corresponding to this original page
    const pageAnns = annotations.filter(a => a.pageIndex === origIndex);
    for (const ann of pageAnns) {
      if (ann.type === 'text') {
        const hex = (ann.color || '#000000').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
        const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
        const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

        const lines = ann.data.split('\n');
        const fSize = ann.fontSize || 16;
        lines.forEach((lineText, lIdx) => {
          const safeText = sanitizeWinAnsi(lineText);
          page.drawText(safeText, {
            x: ann.x,
            y: height - ann.y - (lIdx * fSize * 1.25),
            size: fSize,
            font: helveticaFont,
            color: rgb(r, g, b),
          });
        });
      } else if (ann.type === 'draw' || ann.type === 'highlight') {
        const hex = (ann.color || '#ef4444').substring(0, 7).replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
        const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
        const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
        const strokeW = ann.strokeWidth || (ann.type === 'highlight' ? 18 : 2.5);
        const opacity = ann.type === 'highlight' ? 0.35 : 1.0;

        const points = parsePathPoints(ann.data);
        for (let pIdx = 0; pIdx < points.length - 1; pIdx++) {
          const p1 = points[pIdx];
          const p2 = points[pIdx + 1];
          page.drawLine({
            start: { x: p1.x, y: height - p1.y },
            end: { x: p2.x, y: height - p2.y },
            thickness: strokeW,
            color: rgb(r, g, b),
            opacity,
          });
        }
      } else if (ann.type === 'redact') {
        // True solid blackout rectangle permanently placed in the PDF
        const rectWidth = ann.width || 60;
        const rectHeight = ann.height || 20;
        page.drawRectangle({
          x: ann.x,
          y: height - ann.y - rectHeight,
          width: rectWidth,
          height: rectHeight,
          color: rgb(0, 0, 0),
        });
      } else if (ann.type === 'image') {
        try {
          let embeddedImage;
          if (ann.data.startsWith('data:image/png')) {
            embeddedImage = await pdfDoc.embedPng(ann.data);
          } else if (ann.data.startsWith('data:image/jpeg') || ann.data.startsWith('data:image/jpg')) {
            embeddedImage = await pdfDoc.embedJpg(ann.data);
          }

          if (embeddedImage) {
            const imgW = ann.width || 120;
            const imgH = ann.height || 60;
            page.drawImage(embeddedImage, {
              x: ann.x,
              y: height - ann.y - imgH,
              width: imgW,
              height: imgH,
            });
          }
        } catch (err) {
          console.error("Error embedding annotation image on export:", err);
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}
