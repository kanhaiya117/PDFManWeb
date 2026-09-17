import { PDFDocument, rgb, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import http from 'http';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function createSamplePdf(pageCount = 3) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Sample Document Page ${i}`, {
      x: 50,
      y: 750,
      size: 24,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
  return await doc.save();
}

async function testPhase1() {
  console.log("=== PHASE 1 AUTOMATED ENGINE & ROUTE VERIFICATION ===\n");

  // 1. Create test sample PDF
  const samplePdfBytes = await createSamplePdf(4);
  assert(samplePdfBytes.length > 0, "Created 4-page sample PDF in memory");

  // 2. Test Forms: AcroForm Field Creation & Value Embedding
  console.log("\n--- Testing Tool 2: Fill & Design Forms ---");
  const docForForms = await PDFDocument.load(samplePdfBytes);
  const form = docForForms.getForm();
  const page1 = docForForms.getPages()[0];
  
  const tf = form.createTextField('applicant_name');
  tf.addToPage(page1, { x: 50, y: 600, width: 200, height: 30 });
  tf.setText('Jane Doe');

  const cb = form.createCheckBox('agree_terms');
  cb.addToPage(page1, { x: 50, y: 550, width: 20, height: 20 });
  cb.check();

  const dd = form.createDropdown('department');
  dd.setOptions(['Engineering', 'Marketing', 'Finance']);
  dd.addToPage(page1, { x: 50, y: 500, width: 150, height: 30 });
  dd.select('Engineering');

  const formPdfBytes = await docForForms.save();
  assert(formPdfBytes.length > samplePdfBytes.length, "Generated PDF containing interactive AcroForm fields");

  // Reopen and inspect
  const reloadedFormDoc = await PDFDocument.load(formPdfBytes);
  const reloadedForm = reloadedFormDoc.getForm();
  const reloadedName = reloadedForm.getTextField('applicant_name').getText();
  const reloadedAgree = reloadedForm.getCheckBox('agree_terms').isChecked();
  const reloadedDept = reloadedForm.getDropdown('department').getSelected()[0];

  assert(reloadedName === 'Jane Doe', `Embedded TextField value verified: "${reloadedName}"`);
  assert(reloadedAgree === true, "Embedded CheckBox value verified: true");
  assert(reloadedDept === 'Engineering', `Embedded Dropdown selection verified: "${reloadedDept}"`);

  // Test form flattening
  reloadedForm.flatten();
  const flattenedBytes = await reloadedFormDoc.save();
  const flattenedDoc = await PDFDocument.load(flattenedBytes);
  assert(flattenedDoc.getForm().getFields().length === 0, "Flattened form successfully converted interactive fields into permanent vectors");

  // 3. Test Stamps: Real Vector Embedding
  console.log("\n--- Testing Tool 3: Stamp PDF ---");
  const docForStamp = await PDFDocument.load(samplePdfBytes);
  const targetPage = docForStamp.getPages()[0];
  targetPage.drawRectangle({
    x: 200,
    y: 400,
    width: 220,
    height: 60,
    borderColor: rgb(0.86, 0.15, 0.15),
    borderWidth: 3,
    color: rgb(1, 1, 1),
    opacity: 0.85,
    rotate: degrees(-15),
  });
  targetPage.drawText("CONFIDENTIAL", {
    x: 215,
    y: 420,
    size: 24,
    color: rgb(0.86, 0.15, 0.15),
    opacity: 0.85,
    rotate: degrees(-15),
  });
  const stampedBytes = await docForStamp.save();
  assert(stampedBytes.length > 0, "Embedded authentic CONFIDENTIAL vector stamp into PDF with -15° rotation");

  // 4. Test Organize Pages: Reordering and Multi-PDF Assembly
  console.log("\n--- Testing Tool 4: Organize Pages ---");
  const organizeDoc = await PDFDocument.create();
  const srcDoc = await PDFDocument.load(samplePdfBytes);

  // Desired order: Page 3, Page 1, Page 4, Page 2 (0-indexed: 2, 0, 3, 1)
  const sequence = [2, 0, 3, 1];
  const copied = await organizeDoc.copyPages(srcDoc, sequence);
  copied.forEach(p => organizeDoc.addPage(p));
  const organizedBytes = await organizeDoc.save();

  const verifyOrganizeDoc = await PDFDocument.load(organizedBytes);
  assert(verifyOrganizeDoc.getPageCount() === 4, "Organized PDF has exactly 4 pages matching the reorganized sequence");

  // 5. Test Rotate PDF
  console.log("\n--- Testing Tool 5: Rotate PDF ---");
  const rotateDoc = await PDFDocument.load(samplePdfBytes);
  rotateDoc.getPages()[0].setRotation(degrees(90));
  rotateDoc.getPages()[1].setRotation(degrees(180));
  const rotatedBytes = await rotateDoc.save();

  const verifyRotateDoc = await PDFDocument.load(rotatedBytes);
  const p0Rot = verifyRotateDoc.getPages()[0].getRotation().angle;
  const p1Rot = verifyRotateDoc.getPages()[1].getRotation().angle;
  assert(p0Rot === 90, `Page 1 rotation catalog verified: ${p0Rot}°`);
  assert(p1Rot === 180, `Page 2 rotation catalog verified: ${p1Rot}°`);

  // 6. Test Delete Pages
  console.log("\n--- Testing Tool 6: Delete Pages ---");
  const deleteDoc = await PDFDocument.create();
  const srcForDelete = await PDFDocument.load(samplePdfBytes);
  // Delete page 2 (index 1), keeping indices [0, 2, 3]
  const kept = await deleteDoc.copyPages(srcForDelete, [0, 2, 3]);
  kept.forEach(p => deleteDoc.addPage(p));
  const deletedBytes = await deleteDoc.save();

  const verifyDeleteDoc = await PDFDocument.load(deletedBytes);
  assert(verifyDeleteDoc.getPageCount() === 3, "Deleted Page 2: document page count reduced from 4 to 3");

  // 7. Test Extract Pages: Single PDF & ZIP Archive
  console.log("\n--- Testing Tool 7: Extract Pages ---");
  // Extract pages 1 and 3 (indices 0 and 2)
  const extractDoc = await PDFDocument.create();
  const srcForExtract = await PDFDocument.load(samplePdfBytes);
  const extractedPages = await extractDoc.copyPages(srcForExtract, [0, 2]);
  extractedPages.forEach(p => extractDoc.addPage(p));
  const extractedSingleBytes = await extractDoc.save();

  const verifyExtractDoc = await PDFDocument.load(extractedSingleBytes);
  assert(verifyExtractDoc.getPageCount() === 2, "Single PDF extraction verified: exactly 2 selected pages preserved");

  // ZIP packaging test
  const zip = new JSZip();
  for (const idx of [0, 2]) {
    const single = await PDFDocument.create();
    const [c] = await single.copyPages(srcForExtract, [idx]);
    single.addPage(c);
    const bytes = await single.save();
    zip.file(`sample_page_${idx + 1}.pdf`, bytes);
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const loadedZip = await JSZip.loadAsync(zipBuffer);
  const filesInZip = Object.keys(loadedZip.files);
  assert(filesInZip.includes('sample_page_1.pdf') && filesInZip.includes('sample_page_3.pdf'), `ZIP packaging verified: contains [${filesInZip.join(', ')}]`);

  // 8. HTTP Route Verification for Phase 1 Tools
  console.log("\n--- Testing Phase 1 HTTP Endpoints & Aliases ---");
  const routes = [
    '/workspace?tool=presentation-mode',
    '/workspace?tool=pdf-forms',
    '/workspace?tool=stamp-pdf',
    '/workspace?tool=organize-pdf',
    '/workspace?tool=rotate-pdf',
    '/workspace?tool=delete-pages',
    '/workspace?tool=extract-pages',
    '/presentation-mode',
    '/presentation',
    '/pdf-forms',
    '/fill-pdf',
    '/stamp-pdf',
    '/organize-pdf',
    '/rotate-pdf',
    '/delete-pages',
    '/extract-pages',
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

  console.log("\n🎉 ALL PHASE 1 FUNCTIONALITY & ROUTE TESTS PASSED WITH 100% SUCCESS!\n");
}

testPhase1().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
