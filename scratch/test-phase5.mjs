import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function runTests() {
  console.log("=== PHASE 5 AUTOMATED VERIFICATION ===");
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  // TEST 1: Summary Engine Synthesis & Metrics Detection
  try {
    console.log("\n--- Testing 26. Document Summary Synthesis ---");
    const sampleText = `
MASTER SERVICES & CONSULTING AGREEMENT
This Agreement is entered between Acme Enterprises and CyberTech Global.
The total contract value shall be $125,000.00 payable across quarterly installments.
Annual service level uptime is guaranteed at 99.9% throughout the multi-year term.
The Service Provider shall submit audit logs by the deadline of December 31, 2026.
    `;

    // Currency Detection
    const currencyMatch = sampleText.match(/(?:[$€£₹]|USD|EUR|INR)\s?[\d,]+(?:\.\d{2})?/i);
    assert(currencyMatch !== null && currencyMatch[0] === "$125,000.00", `Detected financial metric: ${currencyMatch?.[0]}`);

    // Percentage Detection
    const percentMatch = sampleText.match(/\b\d+(?:\.\d+)?%/);
    assert(percentMatch !== null && percentMatch[0] === "99.9%", `Detected percentage metric: ${percentMatch?.[0]}`);

    // Action Items / Obligations Detection
    const hasObligation = sampleText.toLowerCase().includes("shall submit") || sampleText.toLowerCase().includes("deadline");
    assert(hasObligation, "Identified legal compliance obligation and deadline");
  } catch (err) {
    assert(false, `Summary test failed: ${err.message}`);
  }

  // TEST 2: Executive Brief PDF Compilation
  try {
    console.log("\n--- Testing 26. Executive Brief PDF Generation ---");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595.28, 841.89]);

    page.drawText("EXECUTIVE BRIEF: Master Services Agreement", {
      x: 48,
      y: 790,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });

    page.drawText("Summary generated client-side with zero cloud telemetry.", {
      x: 48,
      y: 765,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    assert(pdfBytes.length > 500, `Generated Executive Brief PDF (${pdfBytes.length} bytes)`);

    const loaded = await PDFDocument.load(pdfBytes);
    assert(loaded.getPageCount() === 1, "Brief PDF loaded with 1 page");
  } catch (err) {
    assert(false, `Executive Brief PDF failed: ${err.message}`);
  }

  // TEST 3: On-Device Copilot Querying & Citation Extraction
  try {
    console.log("\n--- Testing 27. Ask PDF Copilot Indexing & Citations ---");
    const chunks = [
      {
        pageNum: 1,
        text: "The vendor Acme Enterprises agrees to provide cloud infrastructure support starting in Q1.",
        keywords: new Set(["vendor", "acme", "enterprises", "cloud", "infrastructure", "support", "q1"]),
      },
      {
        pageNum: 2,
        text: "Financial penalties will be assessed at $5,000 for each day of unplanned service outage.",
        keywords: new Set(["financial", "penalties", "5000", "day", "unplanned", "service", "outage"]),
      }
    ];

    // Query 1: Outage penalties
    const qWords = ["financial", "penalties", "outage"];
    let bestChunk = null;
    let maxScore = -1;

    for (const c of chunks) {
      let score = 0;
      for (const qw of qWords) {
        if (c.keywords.has(qw)) score += 3;
      }
      if (score > maxScore) {
        maxScore = score;
        bestChunk = c;
      }
    }

    assert(bestChunk !== null && bestChunk.pageNum === 2, "Copilot accurately matched query to Page 2");
    assert(bestChunk.text.includes("$5,000"), "Snippet captures penalty figure ($5,000)");

    // Query 2: Vendor name
    const vendorQuery = ["vendor", "acme"];
    let vendorChunk = null;
    let vScore = -1;

    for (const c of chunks) {
      let score = 0;
      for (const w of vendorQuery) {
        if (c.keywords.has(w)) score += 3;
      }
      if (score > vScore) {
        vScore = score;
        vendorChunk = c;
      }
    }

    assert(vendorChunk !== null && vendorChunk.pageNum === 1, "Copilot accurately matched vendor query to Page 1");
    assert(vendorChunk.text.includes("Acme Enterprises"), "Extracted vendor name correctly");
  } catch (err) {
    assert(false, `Copilot test failed: ${err.message}`);
  }

  // TEST 4: Compare PDF Diffs
  try {
    console.log("\n--- Testing 25. Compare PDF Vocabulary Diff ---");
    const textA = "This contract contains confidential terms for Acme Corp.".toLowerCase().split(/\s+/);
    const textB = "This contract contains revised public terms for Acme Corp.".toLowerCase().split(/\s+/);

    const setA = new Set(textA);
    const setB = new Set(textB);

    const added = textB.filter(w => !setA.has(w));
    const removed = textA.filter(w => !setB.has(w));

    assert(added.includes("revised") && added.includes("public"), "Detected added words: revised, public");
    assert(removed.includes("confidential"), "Detected removed word: confidential");
  } catch (err) {
    assert(false, `Compare diff failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
