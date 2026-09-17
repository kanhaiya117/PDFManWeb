import { Document, Paragraph, TextRun, Packer, HeadingLevel, ImageRun } from 'docx';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { pdfjsLib } from '@/lib/pdf-init';

// ==========================================
// 15. PDF TO WORD CONVERTER
// ==========================================

export interface PdfToDocxResult {
  blob: Blob;
  isScanned: boolean;
  pageCount: number;
  wordCount: number;
  sampleText: string;
}

export async function convertPdfToDocx({
  pdfBuffer,
  mode = 'editable',
}: {
  pdfBuffer: ArrayBuffer;
  mode?: 'editable' | 'images';
}): Promise<PdfToDocxResult> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const totalPages = doc.numPages;
  const docxSections: any[] = [];
  let totalWordCount = 0;
  let totalCharCount = 0;
  let accumulatedText = '';

  if (mode === 'editable') {
    const allDocxChildren: any[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      if (p > 1 && allDocxChildren.length > 0) {
        allDocxChildren.push(
          new Paragraph({
            children: [new TextRun({ text: "", break: 1 })],
            pageBreakBefore: true,
          })
        );
      }

      // Group text items by vertical position (Y coordinate)
      const lineMap = new Map<number, any[]>();
      for (const it of items) {
        if (!it.str || !it.str.trim()) continue;
        const rawY = Math.round(it.transform[5] / 4) * 4; // cluster close Ys
        const line = lineMap.get(rawY) || [];
        line.push(it);
        lineMap.set(rawY, line);
        totalCharCount += it.str.length;
      }

      // Sort lines from top of page to bottom (descending Y in PDF space)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (const y of sortedYs) {
        const lineItems = lineMap.get(y)!;
        // Sort line items horizontally from left to right (ascending X)
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);

        const lineString = lineItems.map(i => i.str).join(' ').trim();
        if (!lineString) continue;

        accumulatedText += lineString + '\n';
        totalWordCount += lineString.split(/\s+/).length;

        // Detect if font size suggests a heading
        const maxFontSize = Math.max(...lineItems.map(i => i.transform[0] || 12));
        const isHeading = maxFontSize >= 18;
        const isSubheading = maxFontSize >= 14 && maxFontSize < 18;

        allDocxChildren.push(
          new Paragraph({
            heading: isHeading 
              ? HeadingLevel.HEADING_1 
              : isSubheading 
              ? HeadingLevel.HEADING_2 
              : undefined,
            spacing: { after: isHeading ? 200 : 120 },
            children: [
              new TextRun({
                text: lineString,
                bold: isHeading || isSubheading,
                size: Math.round(maxFontSize * 2), // docx uses half-points
                font: 'Calibri',
              }),
            ],
          })
        );
      }
    }

    const docx = new Document({
      sections: [{
        properties: {},
        children: allDocxChildren.length > 0 ? allDocxChildren : [
          new Paragraph({
            children: [new TextRun({ text: "No selectable text was extracted from this document." })],
          })
        ],
      }],
    });

    const docxBlob = await Packer.toBlob(docx);
    const isScanned = totalCharCount < 25;

    return {
      blob: docxBlob,
      isScanned,
      pageCount: totalPages,
      wordCount: totalWordCount,
      sampleText: accumulatedText.slice(0, 300),
    };
  } else {
    // Mode: Image-preserved DOCX
    const imageDocxChildren: any[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        imageDocxChildren.push(
          new Paragraph({
            pageBreakBefore: p > 1,
            children: [
              new ImageRun({
                data: bytes,
                transformation: {
                  width: 550,
                  height: Math.round((viewport.height / viewport.width) * 550),
                },
                type: 'jpg',
              }),
            ],
          })
        );
      }
    }

    const docx = new Document({
      sections: [{
        properties: {},
        children: imageDocxChildren,
      }],
    });

    const docxBlob = await Packer.toBlob(docx);
    return {
      blob: docxBlob,
      isScanned: false,
      pageCount: totalPages,
      wordCount: 0,
      sampleText: "[Image-based DOCX document]",
    };
  }
}

// ==========================================
// 16. PDF TO EXCEL CONVERTER
// ==========================================

export interface PdfToExcelResult {
  blob: Blob;
  rowCount: number;
  colCount: number;
  previewData: string[][];
  sheetNames: string[];
}

export async function convertPdfToExcel({
  pdfBuffer,
}: {
  pdfBuffer: ArrayBuffer;
}): Promise<PdfToExcelResult> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const wb = XLSX.utils.book_new();
  const allRowsCombined: string[][] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // Cluster items into rows by Y (within 8px tolerance)
    const rowClusters = new Map<number, any[]>();
    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const yVal = Math.round(item.transform[5] / 8) * 8;
      const cluster = rowClusters.get(yVal) || [];
      cluster.push(item);
      rowClusters.set(yVal, cluster);
    }

    // Sort rows descending Y (top of page first)
    const sortedYs = Array.from(rowClusters.keys()).sort((a, b) => b - a);
    const pageTable: string[][] = [];

    for (const y of sortedYs) {
      const lineItems = rowClusters.get(y)!;
      // Sort columns left to right (ascending X)
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
      const rowValues = lineItems.map(i => i.str.trim());
      if (rowValues.length > 0) {
        pageTable.push(rowValues);
        allRowsCombined.push(rowValues);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(pageTable.length > 0 ? pageTable : [["(No data found on this page)"]]);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${p}`);
  }

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const maxCols = allRowsCombined.reduce((max, r) => Math.max(max, r.length), 0);

  return {
    blob,
    rowCount: allRowsCombined.length,
    colCount: maxCols,
    previewData: allRowsCombined.slice(0, 25),
    sheetNames: wb.SheetNames,
  };
}

export function convertRowsToCsv(rows: string[][]): Blob {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

// ==========================================
// 17. PDF TO JPG / PNG CONVERTER
// ==========================================

export interface PdfToImagesResult {
  images: Array<{ pageNum: number; dataUrl: string; blob: Blob }>;
  zipBlob?: Blob;
}

export async function convertPdfToImages({
  pdfBuffer,
  format = 'png',
  scale = 2.0,
  pageIndices,
}: {
  pdfBuffer: ArrayBuffer;
  format?: 'png' | 'jpeg';
  scale?: number;
  pageIndices?: number[];
}): Promise<PdfToImagesResult> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const total = doc.numPages;
  const targetPages = pageIndices && pageIndices.length > 0
    ? pageIndices.map(p => p + 1).filter(p => p >= 1 && p <= total)
    : Array.from({ length: total }, (_, i) => i + 1);

  const images: Array<{ pageNum: number; dataUrl: string; blob: Blob }> = [];
  const zip = new JSZip();
  const ext = format === 'png' ? 'png' : 'jpg';
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';

  for (const pNum of targetPages) {
    const page = await doc.getPage(pNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const dataUrl = canvas.toDataURL(mime, 0.92);

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pageBlob = new Blob([bytes], { type: mime });

      images.push({ pageNum: pNum, dataUrl, blob: pageBlob });
      zip.file(`page_${pNum}.${ext}`, bytes);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return { images, zipBlob };
}

// ==========================================
// 18. IMAGES TO PDF CONVERTER
// ==========================================

export interface ImageToPdfItem {
  id: string;
  file?: File;
  dataUrl: string;
  name: string;
  rotation?: number;
}

export interface ImageToPdfSettings {
  pageSize: 'a4' | 'letter' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: 'none' | 'small' | 'normal';
}

export async function convertImagesToPdf({
  images,
  settings,
}: {
  images: ImageToPdfItem[];
  settings: ImageToPdfSettings;
}): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator("PDFMan — Images to PDF");

  const marginMap = { none: 0, small: 18, normal: 36 };
  const margin = marginMap[settings.margin] || 0;

  for (const imgItem of images) {
    let embedded;
    if (imgItem.dataUrl.startsWith('data:image/png')) {
      embedded = await pdfDoc.embedPng(imgItem.dataUrl);
    } else {
      embedded = await pdfDoc.embedJpg(imgItem.dataUrl);
    }

    const imgWidth = embedded.width;
    const imgHeight = embedded.height;

    let targetPageWidth = 595.28; // A4 default
    let targetPageHeight = 841.89;

    if (settings.pageSize === 'letter') {
      targetPageWidth = 612;
      targetPageHeight = 792;
    } else if (settings.pageSize === 'fit') {
      targetPageWidth = imgWidth + margin * 2;
      targetPageHeight = imgHeight + margin * 2;
    }

    if (settings.orientation === 'landscape' || (settings.orientation === 'auto' && imgWidth > imgHeight && settings.pageSize !== 'fit')) {
      const temp = targetPageWidth;
      targetPageWidth = targetPageHeight;
      targetPageHeight = temp;
    }

    const page = pdfDoc.addPage([targetPageWidth, targetPageHeight]);

    // Calculate dimensions to fit inside target page with margin
    const availWidth = targetPageWidth - margin * 2;
    const availHeight = targetPageHeight - margin * 2;

    const scaleX = availWidth / imgWidth;
    const scaleY = availHeight / imgHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.0);

    const renderW = imgWidth * fitScale;
    const renderH = imgHeight * fitScale;
    const posX = targetPageWidth / 2 - renderW / 2;
    const posY = targetPageHeight / 2 - renderH / 2;

    page.drawImage(embedded, {
      x: posX,
      y: posY,
      width: renderW,
      height: renderH,
      rotate: degrees(imgItem.rotation || 0),
    });
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 19. WORD TO PDF CONVERTER
// ==========================================

export interface WordPreviewResult {
  html: string;
  rawText: string;
  wordCount: number;
  paragraphCount: number;
}

export async function readWordPreview(docxBuffer: ArrayBuffer): Promise<WordPreviewResult> {
  const [htmlRes, textRes] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer: docxBuffer }),
    mammoth.extractRawText({ arrayBuffer: docxBuffer }),
  ]);

  const rawText = textRes.value || "";
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const paragraphs = rawText.split('\n').filter(p => p.trim().length > 0);

  return {
    html: htmlRes.value || "",
    rawText,
    wordCount: words.length,
    paragraphCount: paragraphs.length,
  };
}

export interface WordToPdfOptions {
  pageSize?: 'a4' | 'letter';
  margin?: 'narrow' | 'normal' | 'wide';
  fontFamily?: 'Helvetica' | 'TimesRoman';
}

export async function convertWordToPdf({
  docxBuffer,
  options = {},
}: {
  docxBuffer: ArrayBuffer;
  options?: WordToPdfOptions;
}): Promise<Blob> {
  const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
  const rawText = result.value || "";

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator("PDFMan — Word to PDF Engine");

  const font = options.fontFamily === 'TimesRoman'
    ? await pdfDoc.embedFont(StandardFonts.TimesRoman)
    : await pdfDoc.embedFont(StandardFonts.Helvetica);

  const boldFont = options.fontFamily === 'TimesRoman'
    ? await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    : await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const isLetter = options.pageSize === 'letter';
  const pageWidth = isLetter ? 612 : 595.28;
  const pageHeight = isLetter ? 792 : 841.89;

  const marginMap = { narrow: 36, normal: 50, wide: 72 };
  const margin = marginMap[options.margin || 'normal'] || 50;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  const headingHeight = 26;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const lines = rawText.split('\n');

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      currentY -= lineHeight * 0.75;
      continue;
    }

    const isHeading = trimmed.length < 60 && (trimmed.endsWith(':') || trimmed === trimmed.toUpperCase());
    const activeFont = isHeading ? boldFont : font;
    const fontSize = isHeading ? 14 : 10.5;
    const spacing = isHeading ? headingHeight : lineHeight;

    // Word wrap line to fit content width
    const words = trimmed.split(/\s+/);
    let currentLineText = '';

    for (const word of words) {
      const testLine = currentLineText ? `${currentLineText} ${word}` : word;
      const testWidth = activeFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > contentWidth && currentLineText) {
        if (currentY - spacing < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        currentPage.drawText(currentLineText, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: activeFont,
          color: isHeading ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
        });

        currentY -= spacing;
        currentLineText = word;
      } else {
        currentLineText = testLine;
      }
    }

    if (currentLineText) {
      if (currentY - spacing < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      currentPage.drawText(currentLineText, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: activeFont,
        color: isHeading ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
      });

      currentY -= spacing;
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 20. EXCEL TO PDF CONVERTER
// ==========================================

export interface ExcelWorkbookInfo {
  sheetNames: string[];
  sheetsData: Record<string, any[][]>;
}

export function readExcelWorkbookInfo(xlsxBuffer: ArrayBuffer): ExcelWorkbookInfo {
  const wb = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetsData: Record<string, any[][]> = {};

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  }

  return {
    sheetNames: wb.SheetNames,
    sheetsData,
  };
}

export interface ExcelToPdfOptions {
  orientation?: 'portrait' | 'landscape';
  sheetIndex?: number;
  showGridLines?: boolean;
}

export async function convertExcelToPdf({
  xlsxBuffer,
  options = {},
}: {
  xlsxBuffer: ArrayBuffer;
  options?: ExcelToPdfOptions;
}): Promise<Blob> {
  const wb = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[options.sheetIndex || 0] || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator("PDFMan — Excel to PDF Engine");
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const isLandscape = options.orientation !== 'portrait';
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;
  const margin = 36;
  const usableWidth = pageWidth - margin * 2;
  const rowHeight = 22;

  // Determine column count and widths
  const maxCols = Math.min(12, data.reduce((max, r) => Math.max(max, r?.length || 0), 0) || 1);
  const colWidth = usableWidth / maxCols;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Header Title with Sheet Name
  currentPage.drawText(`Sheet: ${sheetName}`, {
    x: margin,
    y: currentY,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 30;

  for (let rIdx = 0; rIdx < data.length; rIdx++) {
    const row = data[rIdx] || [];
    const isHeaderRow = rIdx === 0;

    if (currentY - rowHeight < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }

    // Row Background
    if (isHeaderRow) {
      currentPage.drawRectangle({
        x: margin,
        y: currentY - 4,
        width: usableWidth,
        height: rowHeight,
        color: rgb(0.92, 0.94, 0.98),
      });
    } else if (rIdx % 2 === 1) {
      currentPage.drawRectangle({
        x: margin,
        y: currentY - 4,
        width: usableWidth,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    // Cells
    for (let cIdx = 0; cIdx < maxCols; cIdx++) {
      const cellVal = row[cIdx] !== undefined ? String(row[cIdx]).trim() : '';
      const activeFont = isHeaderRow ? boldFont : font;
      const cellText = cellVal.length > 25 ? cellVal.slice(0, 22) + '...' : cellVal;

      if (cellText) {
        currentPage.drawText(cellText, {
          x: margin + cIdx * colWidth + 4,
          y: currentY + 3,
          size: 8.5,
          font: activeFont,
          color: isHeaderRow ? rgb(0.1, 0.2, 0.4) : rgb(0.2, 0.2, 0.2),
        });
      }
    }

    // Horizontal bottom border if enabled
    if (options.showGridLines !== false) {
      currentPage.drawLine({
        start: { x: margin, y: currentY - 4 },
        end: { x: margin + usableWidth, y: currentY - 4 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
    }

    currentY -= rowHeight;
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}
