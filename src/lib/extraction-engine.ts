import { pdfjsLib } from '@/lib/pdf-init';
import JSZip from 'jszip';

// ==========================================
// 22. STRUCTURED TEXT EXTRACTION ENGINE
// ==========================================

export interface TextParagraph {
  text: string;
  isHeading: boolean;
  headingLevel?: 1 | 2;
  fontSize: number;
}

export interface ExtractedPageText {
  pageNum: number;
  paragraphs: TextParagraph[];
  rawText: string;
  wordCount: number;
  charCount: number;
}

export interface StructuredTextResult {
  fullText: string;
  markdown: string;
  pages: ExtractedPageText[];
  stats: {
    totalWords: number;
    totalChars: number;
    totalParagraphs: number;
    readingTimeMinutes: number;
    topKeywords: Array<{ word: string; count: number }>;
  };
  jsonDump: string;
}

const STOP_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','say','her','she',
  'or','an','will','my','one','all','would','there','their','what','so','up','out','if',
  'about','who','get','which','go','me','when','make','can','like','time','no','just','him',
  'know','take','people','into','year','your','good','some','could','them','see','other',
  'than','then','now','look','only','come','its','over','think','also','back','after','use',
  'two','how','our','work','first','well','way','even','new','want','because','any','these',
  'give','day','most','us','is','are','was','were','has','had','been'
]);

export async function extractStructuredText(pdfBuffer: ArrayBuffer): Promise<StructuredTextResult> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const totalPages = doc.numPages;
  const pagesData: ExtractedPageText[] = [];
  let combinedFullText = '';
  let combinedMarkdown = '';
  let totalWordCount = 0;
  let totalCharCount = 0;
  let totalParagraphCount = 0;

  const wordFrequency: Map<string, number> = new Map();

  for (let pNum = 1; pNum <= totalPages; pNum++) {
    const page = await doc.getPage(pNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // Cluster items into lines by Y coordinate
    const lineMap = new Map<number, any[]>();
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const clusterY = Math.round(it.transform[5] / 4) * 4;
      const line = lineMap.get(clusterY) || [];
      line.push(it);
      lineMap.set(clusterY, line);
    }

    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const paragraphs: TextParagraph[] = [];
    let pageRawText = '';

    combinedMarkdown += `\n\n## Page ${pNum}\n\n`;

    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!;
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = lineItems.map(i => i.str).join(' ').trim();
      if (!lineText) continue;

      const maxFontSize = Math.max(...lineItems.map(i => i.transform[0] || 12));
      const isH1 = maxFontSize >= 18 || (lineText.length < 50 && lineText === lineText.toUpperCase() && !lineText.includes('.'));
      const isH2 = maxFontSize >= 14 && maxFontSize < 18;

      paragraphs.push({
        text: lineText,
        isHeading: isH1 || isH2,
        headingLevel: isH1 ? 1 : isH2 ? 2 : undefined,
        fontSize: maxFontSize,
      });

      pageRawText += lineText + '\n';
      combinedFullText += lineText + '\n';

      if (isH1) {
        combinedMarkdown += `\n# ${lineText}\n\n`;
      } else if (isH2) {
        combinedMarkdown += `\n## ${lineText}\n\n`;
      } else {
        combinedMarkdown += `${lineText}\n\n`;
      }

      // Keyword frequency
      const words = lineText.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (!STOP_WORDS.has(w)) {
          wordFrequency.set(w, (wordFrequency.get(w) || 0) + 1);
        }
      }
    }

    const pageWords = pageRawText.trim() ? pageRawText.trim().split(/\s+/).length : 0;
    const pageChars = pageRawText.length;

    totalWordCount += pageWords;
    totalCharCount += pageChars;
    totalParagraphCount += paragraphs.length;

    pagesData.push({
      pageNum: pNum,
      paragraphs,
      rawText: pageRawText,
      wordCount: pageWords,
      charCount: pageChars,
    });
  }

  // Calculate top 12 keywords
  const sortedKeywords = Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));

  const readingTime = Math.max(1, Math.round(totalWordCount / 200));

  const jsonDump = JSON.stringify({
    metadata: {
      totalPages,
      totalWords: totalWordCount,
      totalChars: totalCharCount,
      estimatedReadingTimeMinutes: readingTime,
    },
    topKeywords: sortedKeywords,
    pages: pagesData.map(p => ({
      page: p.pageNum,
      wordCount: p.wordCount,
      paragraphs: p.paragraphs.map(pr => ({
        type: pr.isHeading ? `heading_${pr.headingLevel}` : 'paragraph',
        text: pr.text,
      })),
    })),
  }, null, 2);

  return {
    fullText: combinedFullText.trim(),
    markdown: combinedMarkdown.trim(),
    pages: pagesData,
    stats: {
      totalWords: totalWordCount,
      totalChars: totalCharCount,
      totalParagraphs: totalParagraphCount,
      readingTimeMinutes: readingTime,
      topKeywords: sortedKeywords,
    },
    jsonDump,
  };
}

// ==========================================
// 23. EXTRACT EMBEDDED IMAGES ENGINE
// ==========================================

export interface ExtractedImage {
  id: string;
  pageNum: number;
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  dataUrl: string;
  blob: Blob;
}

export interface ExtractImagesResult {
  images: ExtractedImage[];
  zipBlob: Blob;
  totalFound: number;
}

export async function extractEmbeddedImages(pdfBuffer: ArrayBuffer): Promise<ExtractImagesResult> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const images: ExtractedImage[] = [];
  const zip = new JSZip();

  for (let pNum = 1; pNum <= doc.numPages; pNum++) {
    const page = await doc.getPage(pNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const dataUrl = canvas.toDataURL('image/png', 0.9);

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });

      const imgName = `page_${pNum}_visual.png`;
      images.push({
        id: `img-p${pNum}`,
        pageNum: pNum,
        name: imgName,
        width: canvas.width,
        height: canvas.height,
        sizeBytes: bytes.length,
        dataUrl,
        blob,
      });

      zip.file(imgName, bytes);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  return {
    images,
    zipBlob,
    totalFound: images.length,
  };
}
