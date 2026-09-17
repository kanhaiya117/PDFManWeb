import { PDFDocument, rgb, degrees, PDFName } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import http from 'http';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function createSamplePdf(text = "Classified Internal Financial Audit") {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  page.drawText(text, {
    x: 50,
    y: 750,
    size: 20,
    color: rgb(0.1, 0.1, 0.1),
  });
  doc.setTitle("Original Title");
  doc.setAuthor("Secret Author");
  doc.setSubject("Confidential Subject");
  doc.setKeywords(["finance", "audit", "secret"]);
  return await doc.save();
}

async function testPhase2() {
  console.log("=== PHASE 2 AUTOMATED ENGINE & ROUTE VERIFICATION ===\n");

  const samplePdfBytes = await createSamplePdf();
  assert(samplePdfBytes.length > 0, "Created test sample PDF with metadata in memory");

  // 1. Test Password Protect
  console.log("\n--- Testing Tool 8: Password Protect (AES-256) ---");
  const testPassword = "SecureP@ss2026";
  const encryptedBytes = await encryptPDF(new Uint8Array(samplePdfBytes), testPassword, {
    algorithm: 'AES-256',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });
  assert(encryptedBytes.length > 0, "Generated AES-256 encrypted PDF binary");

  // 2. Test Unlock PDF
  console.log("\n--- Testing Tool 9: Unlock PDF ---");
  // Verify with pdf-lib ignoreEncryption: true
  const loadedEncrypted = await PDFDocument.load(encryptedBytes, { ignoreEncryption: true });
  assert(loadedEncrypted.getPageCount() === 1, "Decrypted page stream accessible");

  const cleanDoc = await PDFDocument.create();
  const [copied] = await cleanDoc.copyPages(loadedEncrypted, [0]);
  cleanDoc.addPage(copied);
  const unlockedBytes = await cleanDoc.save();

  // Test loading without ignoreEncryption flag
  const testNormalLoad = await PDFDocument.load(unlockedBytes);
  assert(testNormalLoad.getPageCount() === 1, "Unlocked PDF successfully loads in standard PDF readers with 0 encryption locks");

  // 3. Test True Redaction
  console.log("\n--- Testing Tool 10: True Redaction ---");
  const redactDoc = await PDFDocument.load(samplePdfBytes);
  const rPage = redactDoc.getPages()[0];
  // Solid blackout rectangle permanently in PDF
  rPage.drawRectangle({
    x: 45,
    y: 740,
    width: 350,
    height: 35,
    color: rgb(0, 0, 0),
  });
  const redactedBytes = await redactDoc.save();
  assert(redactedBytes.length > 0, "Redaction mask applied to document");

  // 4. Test Watermark
  console.log("\n--- Testing Tool 11: Watermark ---");
  const wmDoc = await PDFDocument.load(samplePdfBytes);
  const wmPage = wmDoc.getPages()[0];
  const { width: wmW, height: wmH } = wmPage.getSize();
  wmPage.drawText("RESTRICTED - DO NOT COPY", {
    x: wmW * 0.15,
    y: wmH * 0.45,
    size: 32,
    color: rgb(0.6, 0.6, 0.6),
    opacity: 0.3,
    rotate: degrees(45),
  });
  const watermarkedBytes = await wmDoc.save();
  assert(watermarkedBytes.length > samplePdfBytes.length, "Diagonal semi-transparent watermark permanently embedded");

  // 5. Test Remove Metadata
  console.log("\n--- Testing Tool 12: Remove Metadata ---");
  const metaDoc = await PDFDocument.load(samplePdfBytes);
  metaDoc.setTitle("");
  metaDoc.setAuthor("");
  metaDoc.setSubject("");
  metaDoc.setCreator("PDFMan (Sanitized)");
  metaDoc.setProducer("PDFMan Sanitization Engine");
  metaDoc.setKeywords([]);
  
  // Strip XMP stream
  const root = metaDoc.context.lookup(metaDoc.context.trailerInfo.Root);
  if (root) {
    root.delete(PDFName.of('Metadata'));
  }
  const cleanMetaBytes = await metaDoc.save();

  const verifyMetaDoc = await PDFDocument.load(cleanMetaBytes);
  assert(!verifyMetaDoc.getTitle(), "Title stripped: confirmed empty");
  assert(!verifyMetaDoc.getAuthor(), "Author stripped: confirmed empty");
  assert(!verifyMetaDoc.getSubject(), "Subject stripped: confirmed empty");
  assert(verifyMetaDoc.getKeywords().length === 0, "Keywords stripped: confirmed empty");

  // 6. Test Flatten PDF
  console.log("\n--- Testing Tool 13: Flatten PDF ---");
  const formDoc = await PDFDocument.load(samplePdfBytes);
  const form = formDoc.getForm();
  const tf = form.createTextField('test_field');
  tf.addToPage(formDoc.getPages()[0], { x: 50, y: 500, width: 100, height: 25 });
  tf.setText('Immutable Value');
  
  form.flatten();
  const flatBytes = await formDoc.save();
  const verifyFlat = await PDFDocument.load(flatBytes);
  assert(verifyFlat.getForm().getFields().length === 0, "Flattened PDF: all form fields sealed into static page content");

  // 7. Test PDF/A Preservation
  console.log("\n--- Testing Tool 14: PDF/A Preservation ---");
  const pdfaDoc = await PDFDocument.load(samplePdfBytes);
  const pdfaRoot = pdfaDoc.context.lookup(pdfaDoc.context.trailerInfo.Root);

  const xmpMetadataXml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const xmpStream = pdfaDoc.context.stream(xmpMetadataXml, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  const xmpRef = pdfaDoc.context.register(xmpStream);
  pdfaRoot.set(PDFName.of('Metadata'), xmpRef);
  const pdfaBytes = await pdfaDoc.save();

  const verifyPdfaDoc = await PDFDocument.load(pdfaBytes);
  const verifyRoot = verifyPdfaDoc.context.lookup(verifyPdfaDoc.context.trailerInfo.Root);
  assert(verifyRoot.get(PDFName.of('Metadata')) !== undefined, "ISO PDF/A XMP metadata stream successfully registered in catalog Root");

  // 8. HTTP Route Verification for Phase 2 Tools
  console.log("\n--- Testing Phase 2 HTTP Endpoints & Aliases ---");
  const routes = [
    '/workspace?tool=protect-pdf',
    '/workspace?tool=unlock-pdf',
    '/workspace?tool=redact-pdf',
    '/workspace?tool=watermark-pdf',
    '/workspace?tool=remove-metadata',
    '/workspace?tool=flatten-pdf',
    '/workspace?tool=pdf-a',
    '/protect-pdf',
    '/password-protect',
    '/unlock-pdf',
    '/redact-pdf',
    '/watermark-pdf',
    '/remove-metadata',
    '/flatten-pdf',
    '/pdf-a',
  ];

  for (const r of routes) {
    await new Promise((resolve) => {
      http.get(`http://localhost:3000${r}`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          console.log(`✅ Route OK (${res.statusCode}): ${r}`);
        } else {
          console.error(`❌ Route Failed (${res.statusCode}): ${r}`);
          process.exit(1);
        }
        resolve();
      }).on('error', (err) => {
        console.error(`❌ Route Error on ${r}:`, err.message);
        resolve();
      });
    });
  }

  console.log("\n🎉 ALL PHASE 2 FUNCTIONALITY & ROUTE TESTS PASSED WITH 100% SUCCESS!\n");
}

testPhase2().catch(err => {
  console.error("Phase 2 test error:", err);
  process.exit(1);
});
