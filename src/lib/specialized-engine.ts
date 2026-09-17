import { pdfjsLib } from '@/lib/pdf-init';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { sanitizeAndRedactPdf, RedactionRegion } from '@/lib/pdf-engine';

// ==========================================
// 28. BANKING & KYC AUTO-SANITIZATION ENGINE
// ==========================================

export interface KycSanitizeOptions {
  maskPan?: boolean;
  maskAadhaar?: boolean;
  maskAccount?: boolean;
  maskIfsc?: boolean;
  applyKycWatermark?: boolean;
  watermarkText?: string;
}

export interface KycSanitizeResult {
  sanitizedBlob: Blob;
  detections: {
    pan: number;
    aadhaar: number;
    account: number;
    ifsc: number;
    total: number;
  };
}

export async function autoSanitizeKycDocument({
  pdfBuffer,
  options = {},
}: {
  pdfBuffer: ArrayBuffer;
  options?: KycSanitizeOptions;
}): Promise<KycSanitizeResult> {
  const {
    maskPan = true,
    maskAadhaar = true,
    maskAccount = true,
    maskIfsc = true,
    applyKycWatermark = true,
    watermarkText = "FOR KYC VERIFICATION ONLY",
  } = options;

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const totalPages = doc.numPages;
  const allRedactions: RedactionRegion[] = [];

  let panCount = 0;
  let aadhaarCount = 0;
  let accountCount = 0;
  let ifscCount = 0;

  // Regular expressions for Indian/International financial identifiers
  const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
  const ACCOUNT_REGEX = /\b\d{9,18}\b/g;
  const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;

  for (let pNum = 1; pNum <= totalPages; pNum++) {
    const page = await doc.getPage(pNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    for (const item of items) {
      const text = item.str || '';
      if (!text.trim()) continue;

      const itemX = item.transform[4];
      const itemY = item.transform[5];
      const itemW = item.width || 50;
      const itemH = item.height || 12;

      // Convert PDF coordinate (bottom-left) to viewer space (top-left) for redactor
      const boxTop = viewport.height - itemY - itemH;

      if (maskPan && PAN_REGEX.test(text)) {
        panCount++;
        allRedactions.push({
          id: `pan-${pNum}-${allRedactions.length}`,
          pageIndex: pNum - 1,
          x: Math.max(0, itemX - 2),
          y: Math.max(0, boxTop - 2),
          width: itemW + 4,
          height: itemH + 4,
        });
      }

      if (maskAadhaar && AADHAAR_REGEX.test(text)) {
        aadhaarCount++;
        // Mask first 8 digits / 70% of width
        allRedactions.push({
          id: `adh-${pNum}-${allRedactions.length}`,
          pageIndex: pNum - 1,
          x: Math.max(0, itemX - 2),
          y: Math.max(0, boxTop - 2),
          width: itemW * 0.7 + 2,
          height: itemH + 4,
        });
      }

      if (maskAccount && ACCOUNT_REGEX.test(text)) {
        accountCount++;
        // Mask leading digits, leaving last 4
        allRedactions.push({
          id: `acc-${pNum}-${allRedactions.length}`,
          pageIndex: pNum - 1,
          x: Math.max(0, itemX - 2),
          y: Math.max(0, boxTop - 2),
          width: itemW * 0.7 + 2,
          height: itemH + 4,
        });
      }

      if (maskIfsc && IFSC_REGEX.test(text)) {
        ifscCount++;
        allRedactions.push({
          id: `ifsc-${pNum}-${allRedactions.length}`,
          pageIndex: pNum - 1,
          x: Math.max(0, itemX - 2),
          y: Math.max(0, boxTop - 2),
          width: itemW + 4,
          height: itemH + 4,
        });
      }
    }
  }

  // Apply true rasterization redaction if detections found
  let sanitizedBlob: Blob;
  if (allRedactions.length > 0) {
    const result = await sanitizeAndRedactPdf({
      pdfBuffer,
      redactions: allRedactions,
    });
    sanitizedBlob = result.blob;
  } else {
    sanitizedBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
  }

  // Inject anti-fraud watermark if enabled
  if (applyKycWatermark) {
    const wmBuffer = await sanitizedBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(wmBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, 28);

      page.drawText(watermarkText, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: 28,
        font,
        color: rgb(0.85, 0.25, 0.25),
        opacity: 0.25,
        rotate: degrees(35),
      });
    }

    const wmBytes = await pdfDoc.save({ useObjectStreams: true });
    sanitizedBlob = new Blob([wmBytes as any], { type: 'application/pdf' });
  }

  return {
    sanitizedBlob,
    detections: {
      pan: panCount,
      aadhaar: aadhaarCount,
      account: accountCount,
      ifsc: ifscCount,
      total: panCount + aadhaarCount + accountCount + ifscCount,
    },
  };
}

// ==========================================
// 30. SPLIT PDF ENGINE
// ==========================================

export interface SplitPackage {
  name: string;
  pageRange: string;
  pageCount: number;
  blob: Blob;
}

export interface SplitPdfResult {
  packages: SplitPackage[];
  zipBlob: Blob;
}

export async function splitPdfDocument({
  pdfBuffer,
  mode = 'ranges',
  rangeString = '1-2, 3-4',
  fixedPagesPerSplit = 2,
}: {
  pdfBuffer: ArrayBuffer;
  mode?: 'ranges' | 'fixed' | 'pages';
  rangeString?: string;
  fixedPagesPerSplit?: number;
}): Promise<SplitPdfResult> {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = srcDoc.getPageCount();
  const packages: SplitPackage[] = [];
  const zip = new JSZip();

  if (mode === 'pages') {
    // Each page is an individual PDF
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);

      const bytes = await newDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const fileName = `Page_${i + 1}.pdf`;

      packages.push({
        name: fileName,
        pageRange: `Page ${i + 1}`,
        pageCount: 1,
        blob,
      });

      zip.file(fileName, bytes);
    }
  } else if (mode === 'fixed') {
    // Split every N pages
    const interval = Math.max(1, fixedPagesPerSplit);
    let partNum = 1;

    for (let i = 0; i < totalPages; i += interval) {
      const pageIndices: number[] = [];
      for (let j = i; j < Math.min(totalPages, i + interval); j++) {
        pageIndices.push(j);
      }

      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach(p => newDoc.addPage(p));

      const bytes = await newDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const rangeLabel = `${i + 1}-${Math.min(totalPages, i + interval)}`;
      const fileName = `Part_${partNum}_Pages_${rangeLabel}.pdf`;

      packages.push({
        name: fileName,
        pageRange: `Pages ${rangeLabel}`,
        pageCount: pageIndices.length,
        blob,
      });

      zip.file(fileName, bytes);
      partNum++;
    }
  } else {
    // Custom Ranges (e.g. "1-2, 3-5")
    const rangeParts = rangeString.split(',').map(s => s.trim()).filter(Boolean);
    let partNum = 1;

    for (const part of rangeParts) {
      let pageIndices: number[] = [];
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
            pageIndices.push(p - 1);
          }
        }
      } else {
        const single = parseInt(part, 10);
        if (!isNaN(single) && single >= 1 && single <= totalPages) {
          pageIndices.push(single - 1);
        }
      }

      if (pageIndices.length > 0) {
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(p => newDoc.addPage(p));

        const bytes = await newDoc.save({ useObjectStreams: true });
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        const fileName = `Part_${partNum}_Pages_${part.replace(/\s+/g, '')}.pdf`;

        packages.push({
          name: fileName,
          pageRange: `Pages ${part}`,
          pageCount: pageIndices.length,
          blob,
        });

        zip.file(fileName, bytes);
        partNum++;
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  return { packages, zipBlob };
}
