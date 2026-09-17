"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { 
  applyAdvancedWatermark, 
  flattenPdfDocument, 
  convertToPdfA, 
  cleanOrUpdateMetadata 
} from "@/lib/pdf-engine";
import { pdfjsLib } from "@/lib/pdf-init";
import { Button } from "@/components/ui/button";
import { 
  Landmark, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft, 
  Stamp, 
  Printer, 
  Archive, 
  ShieldOff, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

export function GovernmentWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<string>("APPROVED");
  const [enableFlatten, setEnableFlatten] = useState(true);
  const [enablePdfA, setEnablePdfA] = useState(true);
  const [enableMetadataStrip, setEnableMetadataStrip] = useState(true);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Canvas Viewer State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load PDF for visual canvas
  useEffect(() => {
    setProcessedBlob(null);
    setLogs([]);
    if (!file) {
      setPdfDoc(null);
      return;
    }

    let isMounted = true;
    const loadPdf = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        }).promise;

        if (isMounted) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err: any) {
        console.error("PDF load error:", err);
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // Render canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        }
      } catch (e) {
        // ignore cancelled renders
      }
    };

    render();
    return () => { isCancelled = true; };
  }, [pdfDoc, currentPage, processedBlob]);

  const handleApplyGovernmentHardening = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      const actionLogs: string[] = [];
      let currentBuffer = await file.arrayBuffer();

      // 1. Apply Official Stamp if selected
      if (selectedStamp && selectedStamp !== "NONE") {
        actionLogs.push(`Applied official gazette seal: "${selectedStamp}"`);
        const stampedBlob = await applyAdvancedWatermark({
          pdfBuffer: currentBuffer,
          watermark: {
            type: 'text',
            text: `• ${selectedStamp} •`,
            fontFamily: 'Helvetica',
            fontSize: 32,
            color: selectedStamp === 'CONFIDENTIAL' ? '#dc2626' : '#1d4ed8',
            opacity: 0.35,
            rotation: 45,
            layout: 'diagonal',
            targetPages: 'all',
          },
        });
        currentBuffer = await stampedBlob.arrayBuffer();
      }

      // 2. Strip Metadata & XMP for RTI/FOIA
      if (enableMetadataStrip) {
        actionLogs.push("Purged hidden author names, GPS tags, and XMP metadata stream for RTI/FOIA privacy.");
        const cleanBlob = await cleanOrUpdateMetadata({
          pdfBuffer: currentBuffer,
          stripAll: true,
        });
        currentBuffer = await cleanBlob.arrayBuffer();
      }

      // 3. Court-Filing Flattening
      if (enableFlatten) {
        actionLogs.push("Flattened annotations and form widgets into permanent vector curves for court filing.");
        const flatBlob = await flattenPdfDocument({
          pdfBuffer: currentBuffer,
          mode: 'all',
        });
        currentBuffer = await flatBlob.arrayBuffer();
      }

      // 4. ISO PDF/A Archival Conversion
      if (enablePdfA) {
        actionLogs.push("Injected sRGB OutputIntent and XMP identification schema for ISO 19005-1 (PDF/A-1b).");
        const pdfaRes = await convertToPdfA({
          pdfBuffer: currentBuffer,
          target: 'PDF/A-1b',
        });
        currentBuffer = await pdfaRes.blob.arrayBuffer();
      }

      const finalBlob = new Blob([currentBuffer], { type: 'application/pdf' });
      setProcessedBlob(finalBlob);
      setLogs(actionLogs);
    } catch (err: any) {
      console.error("Government workflow error:", err);
      alert("Failed to process government document: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_Gov_Verified.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === "application/pdf" || selected.name.endsWith(".pdf")) {
        setFile(selected);
      } else {
        alert("Please upload a valid PDF document.");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b bg-card/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/workspace')} 
            className="h-8 w-8 p-0 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-700/10 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Government PDF Tools</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Official gazetted stamps, court filing flattening & ISO PDF/A preservation</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Zero-Telemetry
          </span>
          {file && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Change Document
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* Main Container */}
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="max-w-md w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-800/10 text-slate-800 dark:text-slate-200 flex items-center justify-center mb-4">
              <Landmark className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select Official Document for Processing</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Purpose-built suite for public servants, legal clerks, and citizens. Apply gazetted stamps, FOIA privacy stripping, and court-filing verification.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900">
              <Upload className="w-4 h-4" />
              Choose Government PDF
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Settings & Actions */}
          <div className="w-full md:w-[420px] border-r bg-card/60 flex flex-col h-full overflow-y-auto p-5 space-y-6 shrink-0">
            {/* Document Info */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <div>
                  <h4 className="text-xs font-semibold truncate max-w-[200px]">{file.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB &bull; {totalPages} pages</p>
                </div>
              </div>
            </div>

            {/* Actions Checklist */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Official Hardening Actions</h3>

              {/* 1. Official Stamp */}
              <div className="p-3.5 rounded-xl border bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold">Gazetted Rubber Stamp</span>
                  </div>
                </div>
                <select
                  value={selectedStamp}
                  onChange={(e) => setSelectedStamp(e.target.value)}
                  className="w-full text-xs bg-muted/40 border rounded-lg px-2.5 py-1.5 text-foreground"
                >
                  <option value="APPROVED">APPROVED (Official Approval)</option>
                  <option value="OFFICIAL COPY">OFFICIAL COPY (Certified Reproduction)</option>
                  <option value="VERIFIED">VERIFIED (Field Verification)</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL (Classified Memo)</option>
                  <option value="CONSTITUTIONAL COPY">CONSTITUTIONAL COPY</option>
                  <option value="NONE">None (Do not stamp)</option>
                </select>
              </div>

              {/* 2. Court-Filing Flattening */}
              <label className="p-3.5 rounded-xl border bg-background flex items-start gap-3 cursor-pointer hover:bg-muted/10 transition-colors">
                <input
                  type="checkbox"
                  checked={enableFlatten}
                  onChange={(e) => setEnableFlatten(e.target.checked)}
                  className="rounded text-slate-800 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-slate-700" /> Court-Filing Flattening
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Locks form fields, signatures, and annotations into unalterable vector curves.
                  </p>
                </div>
              </label>

              {/* 3. ISO PDF/A Archival */}
              <label className="p-3.5 rounded-xl border bg-background flex items-start gap-3 cursor-pointer hover:bg-muted/10 transition-colors">
                <input
                  type="checkbox"
                  checked={enablePdfA}
                  onChange={(e) => setEnablePdfA(e.target.checked)}
                  className="rounded text-slate-800 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5 text-slate-700" /> ISO PDF/A Archival
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Injects standard sRGB OutputIntent and XMP identification schema for permanent archival.
                  </p>
                </div>
              </label>

              {/* 4. RTI / FOIA Metadata Stripping */}
              <label className="p-3.5 rounded-xl border bg-background flex items-start gap-3 cursor-pointer hover:bg-muted/10 transition-colors">
                <input
                  type="checkbox"
                  checked={enableMetadataStrip}
                  onChange={(e) => setEnableMetadataStrip(e.target.checked)}
                  className="rounded text-slate-800 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldOff className="w-3.5 h-3.5 text-slate-700" /> RTI / FOIA Metadata Stripping
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Clears author names, internal computer paths, and hidden edit history before publishing.
                  </p>
                </div>
              </label>
            </div>

            {/* Execute Button */}
            <div className="pt-2 space-y-2">
              {!processedBlob ? (
                <Button
                  onClick={handleApplyGovernmentHardening}
                  disabled={isProcessing}
                  className="w-full bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:text-slate-900 shadow-md gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Applying Official Hardening...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Apply Official Hardening
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDownload}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Government Verified PDF
                </Button>
              )}
            </div>

            {/* Execution Audit Log */}
            {logs.length > 0 && (
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
                <span className="font-semibold text-foreground block">Audit Trail:</span>
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Document Viewer Canvas */}
          <div className="flex-1 bg-muted/20 flex flex-col h-full overflow-hidden">
            {/* Page Nav */}
            <div className="h-11 border-b bg-card/60 px-4 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold">Visual Inspection Preview</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-mono font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Canvas Viewport */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg shadow-sm border bg-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
