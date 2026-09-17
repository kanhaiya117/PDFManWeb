import { pdfjsLib } from '@/lib/pdf-init';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ==========================================
// 26. DOCUMENT SUMMARY ENGINE
// ==========================================

export interface DocumentMetric {
  label: string;
  value: string;
  context: string;
  pageNum: number;
}

export interface DocumentActionItem {
  task: string;
  obligationType: 'requirement' | 'deadline' | 'prohibition' | 'general';
  pageNum: number;
}

export interface DocumentSummaryResult {
  title: string;
  executiveBrief: string;
  keyTakeaways: string[];
  metrics: DocumentMetric[];
  actionItems: DocumentActionItem[];
  sectionSummaries: Array<{ heading: string; pageNum: number; summary: string }>;
  markdown: string;
  totalWords: number;
  readingTimeMinutes: number;
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

export async function generateDocumentSummary(pdfBuffer: ArrayBuffer): Promise<DocumentSummaryResult> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const totalPages = doc.numPages;
  const pageTexts: Array<{ pageNum: number; text: string; lines: string[] }> = [];
  let allText = '';
  const metrics: DocumentMetric[] = [];
  const actionItems: DocumentActionItem[] = [];
  const sectionSummaries: Array<{ heading: string; pageNum: number; summary: string }> = [];

  for (let pNum = 1; pNum <= totalPages; pNum++) {
    const page = await doc.getPage(pNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // Cluster items into lines
    const lineMap = new Map<number, any[]>();
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 4) * 4;
      const line = lineMap.get(y) || [];
      line.push(it);
      lineMap.set(y, line);
    }

    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const lines: string[] = [];

    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!;
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
      const lineStr = lineItems.map(i => i.str).join(' ').trim();
      if (!lineStr) continue;

      lines.push(lineStr);
      allText += lineStr + ' ';

      // Detect potential section heading
      const maxFontSize = Math.max(...lineItems.map(i => i.transform[0] || 12));
      if (maxFontSize >= 14 || (lineStr.length < 50 && lineStr === lineStr.toUpperCase() && !lineStr.includes('.'))) {
        sectionSummaries.push({
          heading: lineStr,
          pageNum: pNum,
          summary: '', // filled below
        });
      }

      // Detect Financial / Numeric Metrics
      const currencyMatch = lineStr.match(/(?:[$€£₹]|USD|EUR|INR)\s?[\d,]+(?:\.\d{2})?/i);
      if (currencyMatch && metrics.length < 8) {
        metrics.push({
          label: "Monetary Value",
          value: currencyMatch[0],
          context: lineStr.slice(0, 100),
          pageNum: pNum,
        });
      }

      const percentMatch = lineStr.match(/\b\d+(?:\.\d+)?%/);
      if (percentMatch && metrics.length < 12) {
        metrics.push({
          label: "Percentage Metric",
          value: percentMatch[0],
          context: lineStr.slice(0, 100),
          pageNum: pNum,
        });
      }

      // Detect Action Items & Obligations
      const lower = lineStr.toLowerCase();
      if (lower.includes('shall') || lower.includes('must') || lower.includes('required to') || lower.includes('agree to')) {
        if (actionItems.length < 8) {
          actionItems.push({
            task: lineStr,
            obligationType: 'requirement',
            pageNum: pNum,
          });
        }
      } else if (lower.includes('deadline') || lower.includes('due date') || lower.includes('by no later than')) {
        if (actionItems.length < 8) {
          actionItems.push({
            task: lineStr,
            obligationType: 'deadline',
            pageNum: pNum,
          });
        }
      } else if (lower.includes('prohibited') || lower.includes('shall not') || lower.includes('must not')) {
        if (actionItems.length < 8) {
          actionItems.push({
            task: lineStr,
            obligationType: 'prohibition',
            pageNum: pNum,
          });
        }
      }
    }

    pageTexts.push({ pageNum: pNum, text: lines.join(' '), lines });
  }

  const allWords = allText.trim().split(/\s+/).filter(Boolean);
  const totalWords = allWords.length;
  const readingTimeMinutes = Math.max(1, Math.round(totalWords / 200));

  // Determine Title from first non-empty lines
  const firstLines = pageTexts[0]?.lines || [];
  const title = firstLines.find(l => l.length > 5 && l.length < 80) || "Document Summary Analysis";

  // Synthesize Executive Brief
  const introSentences = allText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 30).slice(0, 4);
  const executiveBrief = introSentences.length > 0 
    ? introSentences.join(' ')
    : "This document contains formal records and structured provisions analyzed client-side with zero telemetry.";

  // Synthesize Key Takeaways
  const keyTakeaways: string[] = [];
  if (sectionSummaries.length > 0) {
    keyTakeaways.push(`Document covers ${sectionSummaries.length} primary structured sections including "${sectionSummaries[0].heading}".`);
  }
  if (metrics.length > 0) {
    keyTakeaways.push(`Financial and numeric benchmarks identified: ${metrics.slice(0, 3).map(m => m.value).join(', ')}.`);
  }
  if (actionItems.length > 0) {
    keyTakeaways.push(`Identified ${actionItems.length} active legal or operational compliance obligations.`);
  }
  keyTakeaways.push(`Total document volume comprises ${totalPages} pages and ${totalWords.toLocaleString()} words with an estimated reading time of ${readingTimeMinutes} minutes.`);

  // Generate Section Summaries text
  for (const sec of sectionSummaries) {
    const pageInfo = pageTexts.find(p => p.pageNum === sec.pageNum);
    if (pageInfo) {
      const idx = pageInfo.lines.indexOf(sec.heading);
      const followingLines = pageInfo.lines.slice(idx + 1, idx + 4).join(' ');
      sec.summary = followingLines.slice(0, 200) || "Section outlines specific operational criteria and procedural clauses.";
    }
  }

  // Generate Formatted Markdown
  let markdown = `# Executive Summary: ${title}\n\n`;
  markdown += `**Pages**: ${totalPages} | **Word Count**: ${totalWords.toLocaleString()} | **Est. Reading Time**: ${readingTimeMinutes} min\n\n`;
  markdown += `## Executive Brief\n${executiveBrief}\n\n`;
  markdown += `## Key Takeaways\n`;
  for (const t of keyTakeaways) {
    markdown += `- ${t}\n`;
  }
  if (metrics.length > 0) {
    markdown += `\n## Key Figures & Metrics\n`;
    for (const m of metrics) {
      markdown += `- **${m.value}** (${m.label}): *"${m.context}"* [Page ${m.pageNum}]\n`;
    }
  }
  if (actionItems.length > 0) {
    markdown += `\n## Action Items & Obligations\n`;
    for (const a of actionItems) {
      markdown += `- [ ] **${a.obligationType.toUpperCase()}**: ${a.task} [Page ${a.pageNum}]\n`;
    }
  }
  if (sectionSummaries.length > 0) {
    markdown += `\n## Section-by-Section Breakdown\n`;
    for (const s of sectionSummaries.slice(0, 6)) {
      markdown += `### ${s.heading} (Page ${s.pageNum})\n${s.summary}\n\n`;
    }
  }

  return {
    title,
    executiveBrief,
    keyTakeaways,
    metrics,
    actionItems,
    sectionSummaries: sectionSummaries.slice(0, 8),
    markdown,
    totalWords,
    readingTimeMinutes,
  };
}

export async function generateSummaryPdf(summary: DocumentSummaryResult): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator("PDFMan — Executive Summary AI");
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const usableWidth = pageWidth - margin * 2;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let curY = pageHeight - margin;

  // Header Banner
  page.drawRectangle({
    x: margin,
    y: curY - 45,
    width: usableWidth,
    height: 50,
    color: rgb(0.94, 0.96, 1.0),
  });

  page.drawText("PDFMAN EXECUTIVE BRIEF", {
    x: margin + 14,
    y: curY - 20,
    size: 14,
    font: boldFont,
    color: rgb(0.15, 0.25, 0.55),
  });

  page.drawText(`Generated on ${new Date().toLocaleDateString()} • Zero-telemetry on-device analysis`, {
    x: margin + 14,
    y: curY - 36,
    size: 9,
    font,
    color: rgb(0.4, 0.45, 0.6),
  });

  curY -= 65;

  // Title
  page.drawText(summary.title.slice(0, 65), {
    x: margin,
    y: curY,
    size: 15,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  curY -= 25;

  // Executive Brief Section
  page.drawText("EXECUTIVE BRIEF", {
    x: margin,
    y: curY,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  curY -= 16;

  // Word wrap brief text
  const briefWords = summary.executiveBrief.split(/\s+/);
  let line = '';
  for (const w of briefWords) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, 10) > usableWidth) {
      page.drawText(line, { x: margin, y: curY, size: 10, font, color: rgb(0.25, 0.25, 0.25) });
      curY -= 15;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x: margin, y: curY, size: 10, font, color: rgb(0.25, 0.25, 0.25) });
    curY -= 25;
  }

  // Key Takeaways Section
  page.drawText("KEY TAKEAWAYS", {
    x: margin,
    y: curY,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  curY -= 18;

  for (const takeaway of summary.keyTakeaways) {
    page.drawText("•", { x: margin, y: curY, size: 12, font: boldFont, color: rgb(0.2, 0.4, 0.8) });
    page.drawText(takeaway.slice(0, 95), { x: margin + 14, y: curY, size: 9.5, font, color: rgb(0.2, 0.2, 0.2) });
    curY -= 18;
  }

  // Metrics Section
  if (summary.metrics.length > 0 && curY > 150) {
    curY -= 10;
    page.drawText("EXTRACTED METRICS & FIGURES", {
      x: margin,
      y: curY,
      size: 11,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    curY -= 18;

    for (const m of summary.metrics.slice(0, 4)) {
      page.drawText(`[Page ${m.pageNum}] ${m.value}: ${m.context.slice(0, 75)}`, {
        x: margin,
        y: curY,
        size: 9,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      curY -= 16;
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ==========================================
// 27. ASK PDF COPILOT ENGINE
// ==========================================

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Array<{ pageNum: number; snippet: string }>;
  timestamp: string;
}

export interface DocumentChunk {
  pageNum: number;
  text: string;
  keywords: Set<string>;
}

export async function indexDocumentForCopilot(pdfBuffer: ArrayBuffer): Promise<DocumentChunk[]> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;

  const chunks: DocumentChunk[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = (content.items as any[])
      .map(i => i.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = text.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

    chunks.push({
      pageNum: p,
      text,
      keywords: new Set(words),
    });
  }

  return chunks;
}

export function queryDocumentCopilot(
  chunks: DocumentChunk[],
  query: string
): { answer: string; citations: Array<{ pageNum: number; snippet: string }> } {
  const qClean = query.toLowerCase();
  const qWords = qClean.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Score chunks based on token overlaps
  const scored = chunks.map(chunk => {
    let score = 0;
    for (const qw of qWords) {
      if (chunk.keywords.has(qw)) score += 3;
      if (chunk.text.toLowerCase().includes(qw)) score += 1;
    }
    return { ...chunk, score };
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      answer: `I searched the document for **"${query}"**, but found no direct textual matches across the indexed pages. You might try searching for specific terms, numbers, or section names.`,
      citations: [],
    };
  }

  const bestChunks = scored.slice(0, 3);
  const citations: Array<{ pageNum: number; snippet: string }> = [];

  let excerptParagraphs = '';
  for (const c of bestChunks) {
    // Find snippet containing query word
    const sentences = c.text.split(/(?<=[.?!])\s+/);
    const matchedSentence = sentences.find(s => qWords.some(w => s.toLowerCase().includes(w))) || sentences[0] || c.text.slice(0, 150);
    
    const cleanSnippet = matchedSentence.trim().slice(0, 180);
    citations.push({
      pageNum: c.pageNum,
      snippet: cleanSnippet,
    });

    excerptParagraphs += `> "${cleanSnippet}..." *(Page ${c.pageNum})*\n\n`;
  }

  let answer = `Based on your document search for **"${query}"**, here is the most relevant information extracted from the text:\n\n` +
    excerptParagraphs +
    `*Answers are extracted from on-device text streams without external cloud transmission.*`;

  return { answer, citations };
}
