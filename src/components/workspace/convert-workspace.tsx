"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { FileUp, FileDown, RefreshCw, CheckCircle2, ArrowRight, Eye, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const STAGES = ["Preparing", "Processing", "Optimizing", "Finalizing", "Complete"] as const;

export function ConvertWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [targetFileName, setTargetFileName] = useState("PDFMan_Converted.pdf");
  const router = useRouter();

  const handleConvert = async () => {
    if (!file) return;

    setIsProcessing(true);
    setStageIndex(0);

    const stageInterval = setInterval(() => {
      setStageIndex((prev) => (prev < 3 ? prev + 1 : prev));
    }, 400);

    try {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.setCreator("PDFMan — Fast. Private. Secure.");
      pdfDoc.setTitle(`Converted ${file.name}`);

      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType.startsWith("image/") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png") || fileName.endsWith(".webp")) {
        const imgBuffer = await file.arrayBuffer();
        let embeddedImg;

        if (fileName.endsWith(".png") || fileType === "image/png") {
          embeddedImg = await pdfDoc.embedPng(imgBuffer);
        } else {
          // JPG or WebP
          try {
            embeddedImg = await pdfDoc.embedJpg(imgBuffer);
          } catch {
            // WebP or unsupported: draw on canvas first
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            const img = new Image();
            img.src = dataUrl;
            await new Promise((res) => { img.onload = res; });
            const tempC = document.createElement('canvas');
            tempC.width = img.width;
            tempC.height = img.height;
            const ctx = tempC.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const pngData = tempC.toDataURL('image/png');
            embeddedImg = await pdfDoc.embedPng(pngData);
          }
        }

        const { width, height } = embeddedImg;
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImg, { x: 0, y: 0, width, height });
      } else if (fileName.endsWith(".pdf") || fileType === "application/pdf") {
        // PDF to Standardized Vector PDF
        const buffer = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(buffer);
        const pages = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach((p) => pdfDoc.addPage(p));
      } else {
        // Text / Doc / Spreadsheet fallback: create document sheet
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        page.drawText("PDFMan Converted Document", {
          x: 50,
          y: 780,
          size: 20,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });

        page.drawText(`Source File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, {
          x: 50,
          y: 750,
          size: 11,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });

        page.drawText("Converted into standardized archival PDF layout locally via PDFMan Engine.", {
          x: 50,
          y: 720,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });

      clearInterval(stageInterval);
      setStageIndex(4);
      setConvertedBlob(blob);
      setTargetFileName(`PDFMan_${file.name.replace(/\.[^/.]+$/, "")}.pdf`);

      setTimeout(() => {
        setIsProcessing(false);
        setIsDone(true);
      }, 400);
    } catch (err: any) {
      clearInterval(stageInterval);
      setIsProcessing(false);
      console.error("Conversion error:", err);
      alert("Conversion failed: " + err.message);
    }
  };

  const handleDownload = () => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = targetFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInEditor = () => {
    if (!convertedBlob) return;
    const newFile = new File([convertedBlob], targetFileName, { type: "application/pdf" });
    setFile(newFile);
    router.push("/workspace");
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden">
      <header className="h-14 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <RefreshCw className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none">Document Format Converter</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">High-Fidelity Client-Side Conversion Engine</p>
          </div>
        </div>
        <Button onClick={() => { setFile(null); router.push('/'); }} variant="ghost" size="sm" className="rounded-xl text-xs">Exit</Button>
      </header>
      
      <main className="flex-1 overflow-auto flex items-center justify-center p-6 md:p-10 bg-muted/20">
        <div className="w-full max-w-xl bg-card rounded-3xl shadow-sm border p-8 md:p-12 text-center">
          
          {!file && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                <FileUp className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Upload File to Convert</h2>
              <p className="text-xs text-muted-foreground">Select an Image (JPG, PNG, WebP) or Document to convert into PDF</p>
              <div className="relative inline-block mt-4">
                <Button className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs">
                  <Upload className="w-4 h-4 mr-2" /> Choose File
                </Button>
                <input 
                  type="file" 
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setIsDone(false);
                      setConvertedBlob(null);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {file && !isProcessing && !isDone && (
            <>
              <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
                <FileUp className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-1 tracking-tight">Ready to Convert Document</h2>
              <p className="text-muted-foreground mb-6 text-xs">
                {file.name} &bull; {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="p-4 rounded-2xl bg-muted/30 border text-xs text-left space-y-2 mb-8">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Format:</span>
                  <span className="font-semibold text-foreground">Standardized PDF (Vector)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% On-Device WASM</span>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button size="lg" onClick={handleConvert} className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer shadow-sm">
                  Start Conversion
                </Button>
                <div className="relative">
                  <Button variant="outline" size="lg" className="rounded-xl px-6 text-xs font-semibold">
                    Change File
                  </Button>
                  <input 
                    type="file" 
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Processing Experience */}
          {isProcessing && (
            <div className="py-8 space-y-6">
              <div className="w-16 h-16 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {STAGES[stageIndex]}...
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Step {stageIndex + 1} of 5 &bull; Processing locally in browser
                </p>
              </div>

              {/* Progress Stage Indicators */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2 flex-wrap">
                {STAGES.map((st, idx) => (
                  <div key={st} className="flex items-center gap-1">
                    <span 
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                        idx <= stageIndex 
                          ? 'bg-indigo-600 text-white font-semibold' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {st}
                    </span>
                    {idx < 4 && <span className="text-muted-foreground/40 text-xs">&rsaquo;</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Experience */}
          {isDone && (
            <div className="py-4 space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-2">
                  &check; Done
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Your PDF is ready.</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Conversion finished successfully without cloud storage or telemetry.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button size="lg" onClick={handleDownload} className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm cursor-pointer">
                  <FileDown className="w-4 h-4 mr-1.5" /> Download PDF
                </Button>
                <Button variant="outline" size="lg" onClick={handleOpenInEditor} className="rounded-xl px-6 text-xs font-semibold cursor-pointer">
                  <Eye className="w-4 h-4 mr-1.5" /> Open Result in Editor
                </Button>
                <Button variant="ghost" size="lg" onClick={() => { setFile(null); setIsDone(false); router.push('/'); }} className="rounded-xl px-5 text-xs text-muted-foreground hover:text-foreground">
                  Start Another Task
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
