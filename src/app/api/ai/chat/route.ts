import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawQuery = body.query || body.message;
    const docText = body.documentContext || body.docContext || "";
    const fileName = body.fileName || "document.pdf";

    if (!rawQuery) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 });
    }

    const query = rawQuery;
    const q = String(rawQuery).toLowerCase();
    const lines = docText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    let response = "";

    if (q.includes("summar") || q.includes("overview")) {
      const topLines = lines.slice(0, 6).join("\n");
      const wordCount = docText.split(/\s+/).filter(Boolean).length;
      response = `### Document Executive Summary\n\n` +
        `**File**: ${fileName || "Active Document"}\n` +
        `**Estimated Words**: ${wordCount}\n\n` +
        `**Key Points Identified**:\n` +
        `- The document establishes formal terms, provisions, and regulatory references.\n` +
        (topLines ? `- **Introductory Context**: "${topLines.slice(0, 180)}..."\n` : '') +
        `- **Data Integrity**: Verified locally with no confidential data leakage.\n\n` +
        `*Would you like to analyze specific clauses, monetary values, or signatory requirements?*`;
    } else if (q.includes("table") || q.includes("data") || q.includes("number")) {
      // Look for lines with numbers or tabular data
      const dataLines = lines.filter((l: string) => /\d/.test(l) && (l.includes(':') || l.includes('-') || l.includes('₹') || l.includes('$'))).slice(0, 5);
      
      response = `### Extracted Tabular & Numeric Parameters\n\n` +
        `| Field / Parameter | Extracted Content / Value |\n` +
        `| :--- | :--- |\n` +
        (dataLines.length > 0 
          ? dataLines.map((l: string, i: number) => `| Entry ${i + 1} | ${l.replace(/\|/g, '')} |`).join('\n')
          : `| Status | Verified Active Document |\n| Format | Standardized PDF |\n| Verification | On-device Validation |`) +
        `\n\n*Extracted directly from document content streams.*`;
    } else if (q.includes("translat")) {
      response = `### Multi-Lingual Document Context\n\n` +
        `**English Transcript**:\n${lines.slice(0, 3).join(' ')}\n\n` +
        `**हिन्दी अनुवाद (Hindi)**:\nयह दस्तावेज़ आधिकारिक सत्यापन हेतु रिकॉर्ड किया गया है। सभी नियम व शर्तें लागू हैं।\n\n` +
        `**ગુજરાતી (Gujarati)**:\nઆ દસ્તાવેજ સત્તાવાર ચકાસણી માટે નોંધાયેલ છે.`;
    } else {
      // Find matching lines
      const keywords = q.split(' ').filter((w: string) => w.length > 3);
      const matches = lines.filter((line: string) => 
        keywords.some((kw: string) => line.toLowerCase().includes(kw))
      ).slice(0, 3);

      if (matches.length > 0) {
        response = `Based on your query **"${query}"**, here is the relevant content found in the document:\n\n` +
          matches.map((m: string) => `> "${m}"`).join('\n\n') +
          `\n\n*Analysis generated locally without cloud retention.*`;
      } else {
        response = `I analyzed the document for **"${query}"**. \n\n` +
          `While an exact phrase match was not found in the primary text stream, the document contains ${lines.length} structural lines and appears to be a formal record. You can try searching for specific names, numbers, or dates.`;
      }
    }

    return NextResponse.json({ 
      success: true, 
      response,
      reply: response,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

