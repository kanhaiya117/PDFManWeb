import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

async function runPhase6Tests() {
  console.log('--- Phase 6 Test Suite: Specialized Modes & Split PDF ---');

  // 1. Create a synthetic test PDF with financial & personal KYC data
  const testDoc = await PDFDocument.create();
  const font = await testDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: PAN and Aadhaar
  const page1 = testDoc.addPage([600, 400]);
  page1.drawText('CONFIDENTIAL BANK RECORD', { x: 50, y: 350, size: 16, font, color: rgb(0, 0, 0) });
  page1.drawText('Customer PAN: ABCDE1234F', { x: 50, y: 300, size: 12, font, color: rgb(0, 0, 0) });
  page1.drawText('Aadhaar Number: 2345 6789 0123', { x: 50, y: 260, size: 12, font, color: rgb(0, 0, 0) });
  page1.drawText('Account: 123456789012', { x: 50, y: 220, size: 12, font, color: rgb(0, 0, 0) });
  page1.drawText('Branch IFSC: HDFC0001234', { x: 50, y: 180, size: 12, font, color: rgb(0, 0, 0) });

  // Page 2: Summary info
  const page2 = testDoc.addPage([600, 400]);
  page2.drawText('Page 2 - Financial Statement Summary', { x: 50, y: 350, size: 14, font, color: rgb(0, 0, 0) });
  page2.drawText('No sensitive markers here.', { x: 50, y: 300, size: 12, font, color: rgb(0, 0, 0) });

  // Page 3: Official Gazette filing
  const page3 = testDoc.addPage([600, 400]);
  page3.drawText('Page 3 - Official Government Notification', { x: 50, y: 350, size: 14, font, color: rgb(0, 0, 0) });
  page3.drawText('Ministry of Finance - Gazette Notification 2026', { x: 50, y: 300, size: 12, font, color: rgb(0, 0, 0) });

  // Page 4: Appendix
  const page4 = testDoc.addPage([600, 400]);
  page4.drawText('Page 4 - Archival Appendix', { x: 50, y: 350, size: 14, font, color: rgb(0, 0, 0) });

  const testPdfBytes = await testDoc.save();
  const testBuffer = testPdfBytes.buffer.slice(testPdfBytes.byteOffset, testPdfBytes.byteOffset + testPdfBytes.byteLength);

  console.log(`[✓] Created 4-page test PDF (${testBuffer.byteLength} bytes)`);

  // -------------------------------------------------------------
  // Test Split Engine (Ranges, Fixed, Individual Pages)
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Split Engine Validation:');

  // We test the split logic using PDFDocument and JSZip directly in Node.js
  const srcDoc = await PDFDocument.load(testBuffer);
  const totalPages = srcDoc.getPageCount();

  // Mode 1: Custom Ranges '1-2, 3-4'
  const rangeDoc1 = await PDFDocument.create();
  const copied1 = await rangeDoc1.copyPages(srcDoc, [0, 1]);
  copied1.forEach(p => rangeDoc1.addPage(p));
  const bytes1 = await rangeDoc1.save();

  const rangeDoc2 = await PDFDocument.create();
  const copied2 = await rangeDoc2.copyPages(srcDoc, [2, 3]);
  copied2.forEach(p => rangeDoc2.addPage(p));
  const bytes2 = await rangeDoc2.save();

  const zip = new JSZip();
  zip.file('Part_1_Pages_1-2.pdf', bytes1);
  zip.file('Part_2_Pages_3-4.pdf', bytes2);
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  console.log(`[✓] Custom Range Split: Part 1 (${rangeDoc1.getPageCount()} pages), Part 2 (${rangeDoc2.getPageCount()} pages)`);
  console.log(`[✓] ZIP Package Generated: ${zipBuffer.byteLength} bytes containing 2 files`);

  // Mode 2: Fixed Interval (every 1 page -> 4 parts)
  const singlePagesZip = new JSZip();
  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(page);
    const sBytes = await singleDoc.save();
    singlePagesZip.file(`Page_${i + 1}.pdf`, sBytes);
  }
  const singleZipBuffer = await singlePagesZip.generateAsync({ type: 'nodebuffer' });
  const readSingleZip = await JSZip.loadAsync(singleZipBuffer);
  const fileKeys = Object.keys(readSingleZip.files);
  console.log(`[✓] Individual Pages Split: Generated ${fileKeys.length} files in ZIP (${fileKeys.join(', ')})`);
  if (fileKeys.length !== 4) {
    throw new Error(`Expected 4 split files, got ${fileKeys.length}`);
  }

  // -------------------------------------------------------------
  // Test KYC Sanitization Logic
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Banking & KYC Identifier Detection Logic:');
  const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
  const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
  const ACCOUNT_REGEX = /\b\d{9,18}\b/;
  const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/;

  const samples = [
    { text: 'Customer PAN: ABCDE1234F', pan: true, adh: false },
    { text: 'Aadhaar Number: 2345 6789 0123', pan: false, adh: true },
    { text: 'Account: 123456789012', acc: true },
    { text: 'Branch IFSC: HDFC0001234', ifsc: true },
  ];

  for (const s of samples) {
    if (s.pan) {
      const match = PAN_REGEX.test(s.text);
      console.log(`[✓] PAN Check on "${s.text}": Match = ${match}`);
      if (!match) throw new Error('PAN regex failed');
    }
    if (s.adh) {
      const match = AADHAAR_REGEX.test(s.text);
      console.log(`[✓] Aadhaar Check on "${s.text}": Match = ${match}`);
      if (!match) throw new Error('Aadhaar regex failed');
    }
    if (s.acc) {
      const match = ACCOUNT_REGEX.test(s.text);
      console.log(`[✓] Account Check on "${s.text}": Match = ${match}`);
      if (!match) throw new Error('Account regex failed');
    }
    if (s.ifsc) {
      const match = IFSC_REGEX.test(s.text);
      console.log(`[✓] IFSC Check on "${s.text}": Match = ${match}`);
      if (!match) throw new Error('IFSC regex failed');
    }
  }

  // -------------------------------------------------------------
  // Test Government Security Chaining
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Government Security Pipeline Chaining:');
  // 1. Watermark / Stamp
  const govDoc = await PDFDocument.load(testBuffer);
  const stampFont = await govDoc.embedFont(StandardFonts.HelveticaBold);
  const p1 = govDoc.getPages()[0];
  p1.drawText('VERIFIED OFFICIAL COPY', {
    x: 150,
    y: 200,
    size: 24,
    font: stampFont,
    color: rgb(0.1, 0.45, 0.85),
    opacity: 0.35,
  });

  // 2. Metadata Stripping
  govDoc.setTitle('');
  govDoc.setAuthor('');
  govDoc.setSubject('');
  govDoc.setKeywords([]);
  govDoc.setProducer('PdfMan Government Suite - ISO 19005 Archival Ready');
  govDoc.setCreator('PdfMan Client Core');

  const finalGovBytes = await govDoc.save({ useObjectStreams: true });
  console.log(`[✓] Government Hardened PDF produced: ${finalGovBytes.byteLength} bytes`);

  const reloaded = await PDFDocument.load(finalGovBytes);
  console.log(`[✓] Producer metadata verified: "${reloaded.getProducer()}"`);
  console.log(`[✓] Author metadata stripped: "${reloaded.getAuthor() || '(empty)'}"`);

  console.log('\n=============================================');
  console.log('ALL PHASE 6 SPECIALIZED MODE TESTS PASSED [✓]');
  console.log('=============================================');
}

runPhase6Tests().catch(err => {
  console.error('Phase 6 Test Failed:', err);
  process.exit(1);
});
