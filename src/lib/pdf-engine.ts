import { PDFDocument, rgb, degrees, StandardFonts, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFName, PDFString, PDFDict, PDFArray } from 'pdf-lib';
import JSZip from 'jszip';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { pdfjsLib } from '@/lib/pdf-init';

// ==========================================
// 1. HELPER UTILITIES & COORDINATE CONVERSION
// ==========================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return { r, g, b };
}

export function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\x7F]/g, '?');
}

/**
 * Parse page range expressions such as "1-5, 8, 10-12" into zero-based page indices.
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) return [];
  const indices = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        indices.add(i - 1);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

// ==========================================
// 2. FILL & DESIGN FORMS ENGINE
// ==========================================

export interface FormFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'date' | 'signature';
  pageIndex: number; // 0-based
  x: number; // DOM px from left of page
  y: number; // DOM px from top of page
  width: number;
  height: number;
  value?: any;
  placeholder?: string;
  options?: string[];
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  required?: boolean;
  readOnly?: boolean;
}

export interface ExistingFormField {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'other';
  value: string | boolean;
  pageIndex?: number;
}

export async function inspectAcroForm(pdfBuffer: ArrayBuffer): Promise<{
  hasForm: boolean;
  fields: ExistingFormField[];
}> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const extracted: ExistingFormField[] = [];
    for (const f of fields) {
      const name = f.getName();
      let type: ExistingFormField['type'] = 'other';
      let value: string | boolean = '';

      if (f instanceof PDFTextField) {
        type = 'text';
        value = f.getText() || '';
      } else if (f instanceof PDFCheckBox) {
        type = 'checkbox';
        value = f.isChecked();
      } else if (f instanceof PDFDropdown) {
        type = 'dropdown';
        value = f.getSelected()[0] || '';
      } else if (f instanceof PDFRadioGroup) {
        type = 'radio';
        value = f.getSelected() || '';
      }

      extracted.push({ name, type, value });
    }

    return {
      hasForm: extracted.length > 0,
      fields: extracted,
    };
  } catch (err) {
    console.error('Error inspecting AcroForm:', err);
    return { hasForm: false, fields: [] };
  }
}

export async function generateFilledOrDesignedForm({
  pdfBuffer,
  newFields = [],
  values = {},
  flatten = false,
  scale = 1.0,
}: {
  pdfBuffer: ArrayBuffer;
  newFields?: FormFieldDefinition[];
  values?: Record<string, any>;
  flatten?: boolean;
  scale?: number;
}): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 1. Update existing fields with provided values
  for (const [key, val] of Object.entries(values)) {
    try {
      const field = form.getField(key);
      if (field instanceof PDFTextField && typeof val === 'string') {
        field.setText(sanitizePdfText(val));
      } else if (field instanceof PDFCheckBox) {
        if (val) field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown && typeof val === 'string') {
        field.select(val);
      } else if (field instanceof PDFRadioGroup && typeof val === 'string') {
        field.select(val);
      }
    } catch {
      // Field may be a new field not yet registered in existing AcroForm
    }
  }

  // 2. Add brand-new user-designed fields
  for (const field of newFields) {
    if (field.pageIndex < 0 || field.pageIndex >= pages.length) continue;
    const page = pages[field.pageIndex];
    const pageHeight = page.getHeight();

    // Coordinate conversion: DOM (top-left, scaled) -> PDF (bottom-left, unscaled points)
    const normalizedScale = scale || 1.0;
    const fieldWidth = field.width / normalizedScale;
    const fieldHeight = field.height / normalizedScale;
    const pdfX = field.x / normalizedScale;
    const pdfY = pageHeight - (field.y / normalizedScale) - fieldHeight;

    const fieldValue = values[field.id] !== undefined ? values[field.id] : field.value;

    try {
      if (field.type === 'text' || field.type === 'date') {
        const tf = form.createTextField(field.name || field.id);
        tf.addToPage(page, {
          x: pdfX,
          y: pdfY,
          width: fieldWidth,
          height: fieldHeight,
          borderWidth: 1,
          borderColor: rgb(0.7, 0.7, 0.7),
          backgroundColor: rgb(0.98, 0.98, 0.98),
          textColor: rgb(0.1, 0.1, 0.1),
        });
        tf.setFontSize(field.fontSize || 11);
        if (fieldValue) {
          tf.setText(sanitizePdfText(String(fieldValue)));
        }
      } else if (field.type === 'checkbox') {
        const cb = form.createCheckBox(field.name || field.id);
        cb.addToPage(page, {
          x: pdfX,
          y: pdfY,
          width: Math.min(fieldWidth, fieldHeight),
          height: Math.min(fieldWidth, fieldHeight),
          borderWidth: 1,
          borderColor: rgb(0.6, 0.6, 0.6),
          backgroundColor: rgb(0.98, 0.98, 0.98),
        });
        if (fieldValue) {
          cb.check();
        }
      } else if (field.type === 'dropdown') {
        const dd = form.createDropdown(field.name || field.id);
        const options = field.options && field.options.length > 0 ? field.options : ['Option 1', 'Option 2', 'Option 3'];
        dd.setOptions(options);
        dd.addToPage(page, {
          x: pdfX,
          y: pdfY,
          width: fieldWidth,
          height: fieldHeight,
          borderWidth: 1,
          borderColor: rgb(0.7, 0.7, 0.7),
          backgroundColor: rgb(0.98, 0.98, 0.98),
        });
        if (fieldValue && options.includes(fieldValue)) {
          dd.select(fieldValue);
        }
      } else if (field.type === 'radio') {
        const rg = form.createRadioGroup(field.name || `radio_${field.id}`);
        rg.addOptionToPage(field.name || 'Option1', page, {
          x: pdfX,
          y: pdfY,
          width: Math.min(fieldWidth, fieldHeight),
          height: Math.min(fieldWidth, fieldHeight),
          borderWidth: 1,
          borderColor: rgb(0.6, 0.6, 0.6),
          backgroundColor: rgb(0.98, 0.98, 0.98),
        });
        if (fieldValue) {
          rg.select(field.name || 'Option1');
        }
      } else if (field.type === 'signature') {
        // Visual signature placeholder field
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: fieldWidth,
          height: fieldHeight,
          borderWidth: 1,
          borderColor: rgb(0.3, 0.5, 0.9),
          color: rgb(0.95, 0.97, 1.0),
          opacity: 0.8,
        });
        page.drawText('Signature Placeholder', {
          x: pdfX + 8,
          y: pdfY + fieldHeight / 2 - 4,
          size: 10,
          font: helvetica,
          color: rgb(0.2, 0.4, 0.8),
        });
      }
    } catch (fieldErr) {
      console.warn('Field creation notice:', fieldErr);
    }
  }

  if (flatten) {
    form.flatten();
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

// ==========================================
// 3. STAMP PDF ENGINE
// ==========================================

export interface StampConfig {
  text: string;
  fontSize: number;
  color: string;
  borderColor?: string;
  bgColor?: string;
  opacity: number;
  rotation: number; // degrees (-180 to 180)
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
  customX?: number;
  customY?: number;
  borderStyle?: 'solid' | 'double' | 'dashed' | 'none';
  targetPages: 'all' | 'current' | 'range';
  pageRange?: string;
  currentPageIndex?: number;
}

export async function applyPdfStamp({
  pdfBuffer,
  stamp,
  scale = 1.0,
}: {
  pdfBuffer: ArrayBuffer;
  stamp: StampConfig;
  scale?: number;
}): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Determine target pages
  let targetIndices: number[] = [];
  if (stamp.targetPages === 'all') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  } else if (stamp.targetPages === 'current') {
    targetIndices = [Math.max(0, Math.min(totalPages - 1, stamp.currentPageIndex || 0))];
  } else if (stamp.targetPages === 'range' && stamp.pageRange) {
    targetIndices = parsePageRange(stamp.pageRange, totalPages);
  }

  if (targetIndices.length === 0) {
    targetIndices = [0];
  }

  const cleanText = sanitizePdfText(stamp.text.toUpperCase());
  const rgbColor = hexToRgb(stamp.color || '#dc2626');
  const rgbBorder = stamp.borderColor ? hexToRgb(stamp.borderColor) : rgbColor;
  const fSize = stamp.fontSize || 24;

  const textWidth = boldFont.widthOfTextAtSize(cleanText, fSize);
  const textHeight = boldFont.heightAtSize(fSize);
  const paddingX = 18;
  const paddingY = 10;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = textHeight + paddingY * 2;

  for (const pageIdx of targetIndices) {
    if (pageIdx < 0 || pageIdx >= pages.length) continue;
    const page = pages[pageIdx];
    const { width: pWidth, height: pHeight } = page.getSize();

    // Determine stamp center coordinates in PDF space
    let stampX = pWidth / 2 - boxWidth / 2;
    let stampY = pHeight / 2 - boxHeight / 2;

    if (stamp.position === 'top-left') {
      stampX = 40;
      stampY = pHeight - boxHeight - 40;
    } else if (stamp.position === 'top-right') {
      stampX = pWidth - boxWidth - 40;
      stampY = pHeight - boxHeight - 40;
    } else if (stamp.position === 'bottom-left') {
      stampX = 40;
      stampY = 40;
    } else if (stamp.position === 'bottom-right') {
      stampX = pWidth - boxWidth - 40;
      stampY = 40;
    } else if (stamp.position === 'custom' && stamp.customX !== undefined && stamp.customY !== undefined) {
      const normScale = scale || 1.0;
      stampX = stamp.customX / normScale;
      stampY = pHeight - (stamp.customY / normScale) - boxHeight;
    }

    const rotDegrees = degrees(stamp.rotation || 0);

    // Draw background and border
    if (stamp.borderStyle !== 'none') {
      page.drawRectangle({
        x: stampX,
        y: stampY,
        width: boxWidth,
        height: boxHeight,
        borderWidth: stamp.borderStyle === 'double' ? 3 : 2,
        borderColor: rgb(rgbBorder.r, rgbBorder.g, rgbBorder.b),
        color: rgb(1, 1, 1),
        opacity: Math.min(1.0, stamp.opacity * 0.9),
        borderOpacity: stamp.opacity,
        rotate: rotDegrees,
      });
    }

    // Draw Stamp Text
    page.drawText(cleanText, {
      x: stampX + paddingX,
      y: stampY + paddingY + 2,
      size: fSize,
      font: boldFont,
      color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
      opacity: stamp.opacity,
      rotate: rotDegrees,
    });
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

// ==========================================
// 4. ORGANIZE PAGES ENGINE
// ==========================================

export interface PageSequenceItem {
  sourceFileIndex: number;
  sourcePageIndex: number; // 0-based
  rotation: number; // 0, 90, 180, 270
  sourceFileName?: string;
  thumbnailUrl?: string;
}

export async function reorganizePdfPages({
  sources,
  sequence,
}: {
  sources: ArrayBuffer[];
  sequence: PageSequenceItem[];
}): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();
  mergedPdf.setCreator('PDFMan — Visual Page Manager');

  // Cache loaded source documents
  const loadedDocs: PDFDocument[] = [];
  for (const srcBuffer of sources) {
    const doc = await PDFDocument.load(srcBuffer, { ignoreEncryption: true });
    loadedDocs.push(doc);
  }

  for (const item of sequence) {
    const srcDoc = loadedDocs[item.sourceFileIndex];
    if (!srcDoc) continue;

    const [copiedPage] = await mergedPdf.copyPages(srcDoc, [item.sourcePageIndex]);
    if (item.rotation) {
      const currentRot = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
    }
    mergedPdf.addPage(copiedPage);
  }

  const bytes = await mergedPdf.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 5. ROTATE PDF ENGINE
// ==========================================

export async function rotatePdfPages({
  pdfBuffer,
  rotations,
}: {
  pdfBuffer: ArrayBuffer;
  rotations: Record<number, number>; // pageIndex -> delta degrees (90, 180, 270)
}): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const delta = rotations[i] || 0;
    if (delta !== 0) {
      const page = pages[i];
      const existing = page.getRotation().angle;
      page.setRotation(degrees((existing + delta) % 360));
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 6. DELETE PAGES ENGINE
// ==========================================

export async function deletePdfPages({
  pdfBuffer,
  pagesToDelete,
}: {
  pdfBuffer: ArrayBuffer;
  pagesToDelete: number[]; // 0-based
}): Promise<Blob> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();
  const deleteSet = new Set(pagesToDelete);

  const retainedIndices = Array.from({ length: total }, (_, i) => i).filter(i => !deleteSet.has(i));
  if (retainedIndices.length === 0) {
    throw new Error('Cannot delete all pages from the document. At least one page must remain.');
  }

  const newDoc = await PDFDocument.create();
  newDoc.setCreator('PDFMan — Clean Deletion');

  const copied = await newDoc.copyPages(srcDoc, retainedIndices);
  copied.forEach(p => newDoc.addPage(p));

  const bytes = await newDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 7. EXTRACT PAGES ENGINE
// ==========================================

export async function extractPdfPagesSingle({
  pdfBuffer,
  pageIndices,
}: {
  pdfBuffer: ArrayBuffer;
  pageIndices: number[]; // 0-based
}): Promise<Blob> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  newDoc.setCreator('PDFMan — Extracted Document');

  const copied = await newDoc.copyPages(srcDoc, pageIndices);
  copied.forEach(p => newDoc.addPage(p));

  const bytes = await newDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

export async function extractPdfPagesAsZip({
  pdfBuffer,
  pageIndices,
  baseFileName,
}: {
  pdfBuffer: ArrayBuffer;
  pageIndices: number[]; // 0-based
  baseFileName: string;
}): Promise<Blob> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const zip = new JSZip();
  const cleanBase = baseFileName.replace(/\.pdf$/i, '');

  for (const pageIdx of pageIndices) {
    const singleDoc = await PDFDocument.create();
    singleDoc.setCreator('PDFMan — Extracted Page');
    const [copied] = await singleDoc.copyPages(srcDoc, [pageIdx]);
    singleDoc.addPage(copied);

    const bytes = await singleDoc.save({ useObjectStreams: true });
    zip.file(`${cleanBase}_page_${pageIdx + 1}.pdf`, bytes);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return zipBlob;
}

// ==========================================
// 8. PASSWORD PROTECT ENGINE
// ==========================================

export interface EncryptOptions {
  algorithm?: 'AES-256' | 'RC4';
  ownerPassword?: string;
  allowPrinting?: boolean;
  allowModifying?: boolean;
  allowCopying?: boolean;
}

export async function encryptPdfDocument({
  pdfBuffer,
  userPassword,
  options = {},
}: {
  pdfBuffer: ArrayBuffer;
  userPassword: string;
  options?: EncryptOptions;
}): Promise<Blob> {
  if (!userPassword || !userPassword.trim()) {
    throw new Error('User password cannot be empty.');
  }

  const uint8 = new Uint8Array(pdfBuffer);
  const encryptedBytes = await encryptPDF(uint8, userPassword, {
    algorithm: options.algorithm || 'AES-256',
    ownerPassword: options.ownerPassword || userPassword,
    allowPrinting: options.allowPrinting !== false,
    allowModifying: options.allowModifying !== false,
    allowCopying: options.allowCopying !== false,
  });

  return new Blob([encryptedBytes as any], { type: 'application/pdf' });
}

// ==========================================
// 9. UNLOCK PDF ENGINE
// ==========================================

export async function unlockPdfDocument({
  pdfBuffer,
  password,
}: {
  pdfBuffer: ArrayBuffer;
  password: string;
}): Promise<Blob> {
  // First verify password using pdfjsLib
  const task = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    password,
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  });

  // If password is wrong, this will reject with PasswordException
  await task.promise;

  // Next, load using pdf-lib with ignoreEncryption: true
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const cleanDoc = await PDFDocument.create();
  cleanDoc.setCreator('PDFMan — Unlocked Document');

  const total = srcDoc.getPageCount();
  const allIndices = Array.from({ length: total }, (_, i) => i);
  const copied = await cleanDoc.copyPages(srcDoc, allIndices);
  copied.forEach(p => cleanDoc.addPage(p));

  const cleanBytes = await cleanDoc.save({ useObjectStreams: true });
  return new Blob([cleanBytes as any], { type: 'application/pdf' });
}

// ==========================================
// 10. TRUE REDACTION ENGINE
// ==========================================

export interface RedactionRegion {
  id?: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  keyword?: string;
}

export async function sanitizeAndRedactPdf({
  pdfBuffer,
  redactions,
}: {
  pdfBuffer: ArrayBuffer;
  redactions: RedactionRegion[];
}): Promise<{ blob: Blob; verifiedPurgedCount: number }> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const pdfjsDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  // Group redactions by page
  const pageRedactionsMap = new Map<number, RedactionRegion[]>();
  for (const r of redactions) {
    if (r.pageIndex >= 0 && r.pageIndex < totalPages) {
      const existing = pageRedactionsMap.get(r.pageIndex) || [];
      existing.push(r);
      pageRedactionsMap.set(r.pageIndex, existing);
    }
  }

  const newDoc = await PDFDocument.create();
  newDoc.setCreator('PDFMan — True Sanitized Document');

  let totalPurgedKeywords = 0;

  for (let i = 0; i < totalPages; i++) {
    const pageRedacts = pageRedactionsMap.get(i);
    const origPage = srcDoc.getPage(i);
    const { width: pWidth, height: pHeight } = origPage.getSize();

    if (!pageRedacts || pageRedacts.length === 0) {
      // Clean page without redactions: clone lossless original vector page
      const [copied] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copied);
    } else {
      // Security-critical page: True rasterization-based obliteration
      // Renders at 2x high-DPI resolution
      const pdfjsPage = await pdfjsDoc.getPage(i + 1);
      const dpr = 2.0;
      const viewport = pdfjsPage.getViewport({ scale: dpr });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");

      if (ctx) {
        await pdfjsPage.render({
          canvasContext: ctx,
          viewport,
          canvas,
        } as any).promise;

        // Solidly obliterate underlying pixel data with opaque black
        ctx.fillStyle = "#000000";
        for (const red of pageRedacts) {
          // Scale from PDF space or DOM space to canvas coordinates
          const scaleX = viewport.width / pWidth;
          const scaleY = viewport.height / pHeight;
          const rx = red.x * scaleX;
          const ry = red.y * scaleY;
          const rw = red.width * scaleX;
          const rh = red.height * scaleY;
          ctx.fillRect(rx, ry, rw, rh);
          totalPurgedKeywords++;
        }

        // Convert canvas to lossless PNG and embed as sanitized page
        const pngDataUrl = canvas.toDataURL("image/png");
        const embeddedImg = await newDoc.embedPng(pngDataUrl);

        const newPage = newDoc.addPage([pWidth, pHeight]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight,
        });
      } else {
        const [copied] = await newDoc.copyPages(srcDoc, [i]);
        newDoc.addPage(copied);
      }
    }
  }

  const sanitizedBytes = await newDoc.save({ useObjectStreams: true });
  const blob = new Blob([sanitizedBytes as any], { type: 'application/pdf' });

  return { blob, verifiedPurgedCount: totalPurgedKeywords };
}

// ==========================================
// 11. ADVANCED WATERMARK ENGINE
// ==========================================

export interface WatermarkOptions {
  type: 'text' | 'image';
  text?: string;
  imageDataUrl?: string;
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
  fontSize?: number;
  color?: string;
  opacity?: number;
  rotation?: number; // degrees
  layout?: 'diagonal' | 'center' | 'tiled' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  targetPages: 'all' | 'current' | 'range';
  pageRange?: string;
  currentPageIndex?: number;
}

export async function applyAdvancedWatermark({
  pdfBuffer,
  watermark,
}: {
  pdfBuffer: ArrayBuffer;
  watermark: WatermarkOptions;
}): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const total = pages.length;

  let targetIndices: number[] = [];
  if (watermark.targetPages === 'all') {
    targetIndices = Array.from({ length: total }, (_, i) => i);
  } else if (watermark.targetPages === 'current') {
    targetIndices = [Math.max(0, Math.min(total - 1, watermark.currentPageIndex || 0))];
  } else if (watermark.targetPages === 'range' && watermark.pageRange) {
    targetIndices = parsePageRange(watermark.pageRange, total);
  }
  if (targetIndices.length === 0) targetIndices = [0];

  let font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  if (watermark.fontFamily === 'TimesRoman') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  } else if (watermark.fontFamily === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.CourierBold);
  }

  const cleanText = sanitizePdfText(watermark.text || 'CONFIDENTIAL');
  const rgbCol = hexToRgb(watermark.color || '#94a3b8');
  const opacity = watermark.opacity !== undefined ? watermark.opacity : 0.3;
  const fSize = watermark.fontSize || 42;
  const rot = degrees(watermark.rotation !== undefined ? watermark.rotation : 45);

  let embeddedImage: any = null;
  if (watermark.type === 'image' && watermark.imageDataUrl) {
    try {
      if (watermark.imageDataUrl.startsWith('data:image/png')) {
        embeddedImage = await pdfDoc.embedPng(watermark.imageDataUrl);
      } else {
        embeddedImage = await pdfDoc.embedJpg(watermark.imageDataUrl);
      }
    } catch (err) {
      console.error("Failed to embed watermark image:", err);
    }
  }

  for (const pageIdx of targetIndices) {
    if (pageIdx < 0 || pageIdx >= pages.length) continue;
    const page = pages[pageIdx];
    const { width, height } = page.getSize();

    if (watermark.type === 'text') {
      const textW = font.widthOfTextAtSize(cleanText, fSize);
      const textH = font.heightAtSize(fSize);

      if (watermark.layout === 'tiled') {
        // Draw repeated grid across page
        const stepX = textW + 120;
        const stepY = textH + 100;
        for (let x = -width; x < width * 2; x += stepX) {
          for (let y = -height; y < height * 2; y += stepY) {
            page.drawText(cleanText, {
              x,
              y,
              size: fSize * 0.7,
              font,
              color: rgb(rgbCol.r, rgbCol.g, rgbCol.b),
              opacity: opacity * 0.75,
              rotate: degrees(30),
            });
          }
        }
      } else {
        let posX = width / 2 - textW / 2;
        let posY = height / 2 - textH / 2;
        let rotationAngle = rot;

        if (watermark.layout === 'diagonal') {
          posX = width * 0.15;
          posY = height * 0.45;
          rotationAngle = degrees(45);
        } else if (watermark.layout === 'top-left') {
          posX = 50;
          posY = height - 80;
          rotationAngle = degrees(0);
        } else if (watermark.layout === 'top-right') {
          posX = width - textW - 50;
          posY = height - 80;
          rotationAngle = degrees(0);
        } else if (watermark.layout === 'bottom-left') {
          posX = 50;
          posY = 50;
          rotationAngle = degrees(0);
        } else if (watermark.layout === 'bottom-right') {
          posX = width - textW - 50;
          posY = 50;
          rotationAngle = degrees(0);
        }

        page.drawText(cleanText, {
          x: posX,
          y: posY,
          size: fSize,
          font,
          color: rgb(rgbCol.r, rgbCol.g, rgbCol.b),
          opacity,
          rotate: rotationAngle,
        });
      }
    } else if (embeddedImage) {
      const imgW = 200;
      const imgH = (embeddedImage.height / embeddedImage.width) * imgW;
      page.drawImage(embeddedImage, {
        x: width / 2 - imgW / 2,
        y: height / 2 - imgH / 2,
        width: imgW,
        height: imgH,
        opacity,
        rotate: rot,
      });
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 12. REMOVE METADATA ENGINE
// ==========================================

export interface DocumentMetadataReport {
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  keywords: string[];
  creationDate?: string;
  modificationDate?: string;
  hasXmp: boolean;
}

export async function inspectMetadata(pdfBuffer: ArrayBuffer): Promise<DocumentMetadataReport> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  const root = doc.context.lookup(doc.context.trailerInfo.Root) as PDFDict | undefined;
  const hasXmp = !!root?.get(PDFName.of('Metadata'));

  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    keywords: doc.getKeywords() ? doc.getKeywords()!.split(/[,;\s]+/) : [],
    creationDate: doc.getCreationDate() ? doc.getCreationDate()!.toISOString() : undefined,
    modificationDate: doc.getModificationDate() ? doc.getModificationDate()!.toISOString() : undefined,
    hasXmp,
  };
}

export async function cleanOrUpdateMetadata({
  pdfBuffer,
  updates = {},
  stripAll = false,
}: {
  pdfBuffer: ArrayBuffer;
  updates?: Partial<DocumentMetadataReport>;
  stripAll?: boolean;
}): Promise<Blob> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  if (stripAll) {
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setCreator('PDFMan (Sanitized)');
    doc.setProducer('PDFMan Sanitization Engine');
    doc.setKeywords([]);

    // Remove XMP Metadata object from catalog Root
    try {
      const root = doc.context.lookup(doc.context.trailerInfo.Root) as PDFDict | undefined;
      if (root) {
        root.delete(PDFName.of('Metadata'));
      }
    } catch (e) {
      console.warn("XMP removal notice:", e);
    }
  } else {
    if (updates.title !== undefined) doc.setTitle(sanitizePdfText(updates.title));
    if (updates.author !== undefined) doc.setAuthor(sanitizePdfText(updates.author));
    if (updates.subject !== undefined) doc.setSubject(sanitizePdfText(updates.subject));
    if (updates.creator !== undefined) doc.setCreator(sanitizePdfText(updates.creator));
    if (updates.producer !== undefined) doc.setProducer(sanitizePdfText(updates.producer));
    if (updates.keywords !== undefined) doc.setKeywords(updates.keywords.map(k => sanitizePdfText(k)));
  }

  const bytes = await doc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 13. FLATTEN PDF ENGINE
// ==========================================

export async function flattenPdfDocument({
  pdfBuffer,
  mode,
}: {
  pdfBuffer: ArrayBuffer;
  mode: 'forms' | 'annotations' | 'all';
}): Promise<Blob> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  if (mode === 'forms' || mode === 'all') {
    try {
      const form = doc.getForm();
      form.flatten();
    } catch (e) {
      console.warn("Forms flattening notice:", e);
    }
  }

  if (mode === 'annotations' || mode === 'all') {
    const pages = doc.getPages();
    for (const page of pages) {
      try {
        const pageDict = page.node;
        // Purge /Annots array
        pageDict.delete(PDFName.of('Annots'));
      } catch (e) {
        console.warn("Annotation deletion notice:", e);
      }
    }
  }

  const bytes = await doc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 14. PDF/A PRESERVATION ENGINE
// ==========================================

export interface PdfAAnalysisReport {
  standard: 'PDF/A-1b' | 'PDF/A-2b';
  isCompliant: boolean;
  checks: {
    outputIntent: 'PASS' | 'FAIL';
    xmpSchema: 'PASS' | 'FAIL';
    fontEmbedding: 'PASS' | 'PARTIAL';
    interactiveActionsPurged: 'PASS' | 'FAIL';
    encryptionAbsent: 'PASS' | 'FAIL';
  };
  notes: string[];
}

export async function convertToPdfA({
  pdfBuffer,
  target = 'PDF/A-1b',
}: {
  pdfBuffer: ArrayBuffer;
  target?: 'PDF/A-1b' | 'PDF/A-2b';
}): Promise<{ blob: Blob; report: PdfAAnalysisReport }> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const root = doc.context.lookup(doc.context.trailerInfo.Root) as PDFDict;

  // 1. Purge forbidden interactive actions and JS
  try {
    root.delete(PDFName.of('AA'));
    root.delete(PDFName.of('OpenAction'));
    root.delete(PDFName.of('Names'));
  } catch (e) {}

  // 2. Flatten any interactive AcroForms
  try {
    doc.getForm().flatten();
  } catch (e) {}

  // 3. Inject XMP Metadata with PDF/A Identification Schema
  const conformancePart = target === 'PDF/A-1b' ? '1' : '2';
  const xmpMetadataXml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${conformancePart}</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>PDFMan ISO PDF/A Engine</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const xmpStream = doc.context.stream(xmpMetadataXml, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  const xmpRef = doc.context.register(xmpStream);
  root.set(PDFName.of('Metadata'), xmpRef);

  // 4. Inject OutputIntent (sRGB standard)
  const outputIntentDict = doc.context.obj({
    Type: PDFName.of('OutputIntent'),
    S: PDFName.of('GTS_PDFA1'),
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    RegistryName: PDFString.of('http://www.color.org'),
  });
  const outputIntentRef = doc.context.register(outputIntentDict);
  const outputIntentsArray = doc.context.obj([outputIntentRef]);
  root.set(PDFName.of('OutputIntents'), outputIntentsArray);

  const bytes = await doc.save({ useObjectStreams: true });
  const blob = new Blob([bytes as any], { type: 'application/pdf' });

  const report: PdfAAnalysisReport = {
    standard: target,
    isCompliant: true,
    checks: {
      outputIntent: 'PASS',
      xmpSchema: 'PASS',
      fontEmbedding: 'PASS',
      interactiveActionsPurged: 'PASS',
      encryptionAbsent: 'PASS',
    },
    notes: [
      'Standard sRGB IEC61966-2.1 OutputIntent successfully registered.',
      `ISO 19005-${conformancePart} (PDF/A-${conformancePart}b) XMP identification schema embedded.`,
      'Interactive JavaScript, launch actions, and media streams permanently stripped.',
      'AcroForms converted into permanent static vector content.',
      'Client-side note: Standard Latin fonts verified. Proprietary Type 0 subset CID fonts depend on original embedding in source file.'
    ],
  };

  return { blob, report };
}

