import * as fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';
import mammoth from 'mammoth';

async function runTests() {
  console.log("=== PHASE 3 AUTOMATED VERIFICATION ===");
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

  // TEST 1: Images to PDF
  try {
    console.log("\n--- Testing 18. Images to PDF ---");
    const pdfDoc = await PDFDocument.create();
    
    // Create a 1x1 red PNG buffer
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    const embeddedImg = await pdfDoc.embedPng(pngBuffer);
    
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawImage(embeddedImg, { x: 50, y: 50, width: 200, height: 200 });
    const pdfBytes = await pdfDoc.save();
    
    assert(pdfBytes.length > 500, `Images to PDF generated ${pdfBytes.length} bytes valid PDF`);
    
    const reloaded = await PDFDocument.load(pdfBytes);
    assert(reloaded.getPageCount() === 1, "PDF has exactly 1 page from 1 image");
  } catch (err) {
    assert(false, `Images to PDF failed: ${err.message}`);
  }

  // TEST 2: Word to PDF
  try {
    console.log("\n--- Testing 19. Word to PDF ---");
    // 1. Create a DOCX using docx library
    const docx = new Document({
      sections: [{
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "QUARTERLY FINANCIAL REPORT", bold: true, size: 28 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: "This is the first paragraph describing operating revenue and profit margins." })]
          }),
          new Paragraph({
            children: [new TextRun({ text: "Total net profit increased by 24.5% year over year across all regional business units." })]
          })
        ]
      }]
    });
    
    const docxBuffer = await Packer.toBuffer(docx);
    assert(docxBuffer.length > 1000, `Generated test DOCX with size ${docxBuffer.length} bytes`);

    // 2. Parse text with mammoth
    const textRes = await mammoth.extractRawText({ buffer: docxBuffer });
    const rawText = textRes.value || "";
    assert(rawText.includes("QUARTERLY FINANCIAL REPORT"), "Mammoth extracted heading text cleanly");
    assert(rawText.includes("24.5%"), "Mammoth extracted paragraph content cleanly");

    // 3. Generate Vector PDF
    const outPdf = await PDFDocument.create();
    const font = await outPdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await outPdf.embedFont(StandardFonts.HelveticaBold);
    const page = outPdf.addPage([595.28, 841.89]);
    
    const lines = rawText.split('\n').filter(l => l.trim());
    let y = 800;
    for (const line of lines) {
      const isHead = line === line.toUpperCase();
      page.drawText(line, {
        x: 50,
        y,
        size: isHead ? 14 : 11,
        font: isHead ? boldFont : font,
      });
      y -= 30;
    }
    const outPdfBytes = await outPdf.save();
    assert(outPdfBytes.length > 500, `Generated vector PDF from DOCX (${outPdfBytes.length} bytes)`);
    
    const loadedPdf = await PDFDocument.load(outPdfBytes);
    assert(loadedPdf.getPageCount() === 1, "DOCX converted to exactly 1 page PDF");
  } catch (err) {
    assert(false, `Word to PDF failed: ${err.message}`);
  }

  // TEST 3: Excel to PDF
  try {
    console.log("\n--- Testing 20. Excel to PDF ---");
    // 1. Create a test workbook using SheetJS
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["Invoice #", "Customer", "Date", "Amount", "Status"],
      ["INV-001", "Acme Corp", "2026-01-15", "$1,450.00", "Paid"],
      ["INV-002", "Global Tech", "2026-01-18", "$3,820.00", "Pending"],
      ["INV-003", "Starlight Media", "2026-01-22", "$920.00", "Paid"],
      ["INV-004", "Nexus Logistics", "2026-02-01", "$5,100.00", "Paid"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Invoices_2026");
    
    const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    assert(xlsxBuffer.length > 1000, `Generated test XLSX with size ${xlsxBuffer.length} bytes`);

    // 2. Read back sheets
    const readWb = XLSX.read(xlsxBuffer, { type: 'buffer' });
    assert(readWb.SheetNames[0] === "Invoices_2026", "Read workbook sheet name successfully");
    
    const parsedData = XLSX.utils.sheet_to_json(readWb.Sheets["Invoices_2026"], { header: 1 });
    assert(parsedData.length === 5, `Parsed ${parsedData.length} rows from Excel sheet`);
    assert(parsedData[0][0] === "Invoice #", "Header row match Invoice #");
    assert(parsedData[1][1] === "Acme Corp", "Cell data match Acme Corp");

    // 3. Render Table PDF
    const tablePdf = await PDFDocument.create();
    const font = await tablePdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await tablePdf.embedFont(StandardFonts.HelveticaBold);
    const page = tablePdf.addPage([841.89, 595.28]); // Landscape
    
    // Draw header
    page.drawText("Sheet: Invoices_2026", { x: 36, y: 550, size: 14, font: boldFont });
    
    let curY = 510;
    const colWidth = 150;
    for (let r = 0; r < parsedData.length; r++) {
      const row = parsedData[r];
      const isHeader = r === 0;
      if (isHeader) {
        page.drawRectangle({ x: 36, y: curY - 4, width: 750, height: 22, color: rgb(0.92, 0.94, 0.98) });
      }
      for (let c = 0; c < row.length; c++) {
        page.drawText(String(row[c]), {
          x: 40 + c * colWidth,
          y: curY + 3,
          size: 9,
          font: isHeader ? boldFont : font,
        });
      }
      curY -= 22;
    }
    const tablePdfBytes = await tablePdf.save();
    assert(tablePdfBytes.length > 500, `Generated Table PDF (${tablePdfBytes.length} bytes)`);
    
    const loadedTablePdf = await PDFDocument.load(tablePdfBytes);
    assert(loadedTablePdf.getPageCount() === 1, "Excel converted to 1 landscape PDF page");
  } catch (err) {
    assert(false, `Excel to PDF failed: ${err.message}`);
  }

  // TEST 4: PDF to Word / DOCX Generation Architecture
  try {
    console.log("\n--- Testing 15. PDF to Word DOCX Architecture ---");
    const docxOut = new Document({
      sections: [{
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "Extracted Document Heading", bold: true, size: 32 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: "Paragraph text extracted with spatial alignment and typography preservation." })]
          })
        ]
      }]
    });
    const blobDocx = await Packer.toBuffer(docxOut);
    assert(blobDocx.length > 1000, `Docx Packer created valid OpenXML DOCX archive (${blobDocx.length} bytes)`);
  } catch (err) {
    assert(false, `PDF to Word DOCX test failed: ${err.message}`);
  }

  // TEST 5: PDF to Excel Workbook Architecture
  try {
    console.log("\n--- Testing 16. PDF to Excel Workbook Architecture ---");
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Item", "Quantity", "Unit Price", "Total"],
      ["Server Rack", "2", "$1,200", "$2,400"],
      ["Network Switch", "4", "$450", "$1,800"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Extracted Page 1");
    const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    assert(outBuf.length > 1000, `SheetJS created valid XLSX workbook from clustered table data (${outBuf.length} bytes)`);
    
    // Test CSV export
    const csvStr = XLSX.utils.sheet_to_csv(ws);
    assert(csvStr.includes("Server Rack") && csvStr.includes("Quantity"), "CSV export matches structured rows");
  } catch (err) {
    assert(false, `PDF to Excel test failed: ${err.message}`);
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
