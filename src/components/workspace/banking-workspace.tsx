"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { autoSanitizeKycDocument, KycSanitizeResult } from "@/lib/specialized-engine";
import { pdfjsLib } from "@/lib/pdf-init";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft, 
  EyeOff, 
  CreditCard, 
  Lock, 
  Droplets, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldAlert
} from "lucide-react";
import { useRouter } from "next/navigation";

export function BankingWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [maskPan, setMaskPan] = useState(true);
  const [maskAadhaar, setMaskAadhaar] = useState(true);
  const [maskAccount, setMaskAccount] = useState(true);
  const [maskIfsc, setMaskIfsc] = useState(true);
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState("FOR KYC VERIFICATION ONLY");

  const [result, setResult] = useState<KycSanitizeResult | null>(null);

  // Document Viewer State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load PDF for visual canvas
  useEffect(() => {
    setResult(null);
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
  }, [pdfDoc, currentPage, result]);

  const handleAutoSanitize = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      const buffer = await file.arrayBuffer();

      const res = await autoSanitizeKycDocument({
        pdfBuffer: buffer,
        options: {
          maskPan,
          maskAadhaar,
          maskAccount,
          maskIfsc,
          applyKycWatermark: applyWatermark,
          watermarkText,
        },
      });

      setResult(res);

      // Reload canvas with sanitized version
      const sanitizedBuf = await res.sanitizedBlob.arrayBuffer();
      const updatedDoc = await pdfjsLib.getDocument({
        data: new Uint8Array(sanitizedBuf),
        cMapUrl: "/cmaps/",
        cMapPacked: true,
      }).promise;
      setPdfDoc(updatedDoc);
    } catch (err: any) {
      console.error("KYC sanitization error:", err);
      alert("Failed to sanitize KYC document: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(result.sanitizedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_KYC_Sanitized.pdf`;
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
            <div className="h-7 w-7 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Banking & KYC Compliance Suite</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Automated PAN, Aadhaar, Account masking & anti-fraud watermarking</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            RBI / UIDAI Compliant
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
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select Bank Statement or KYC Document</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Automated spatial scanner detects and redacts PAN cards, 8-digit Aadhaar UIDAI numbers, bank accounts, and IFSC codes locally.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
              <Upload className="w-4 h-4" />
              Choose Banking PDF
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Controls */}
          <div className="w-full md:w-[420px] border-r bg-card/60 flex flex-col h-full overflow-y-auto p-5 space-y-6 shrink-0">
            {/* File Info */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <div>
                  <h4 className="text-xs font-semibold truncate max-w-[200px]">{file.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB &bull; {totalPages} pages</p>
                </div>
              </div>
            </div>

            {/* Masking Criteria Checklist */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Regulatory Masking Criteria</h3>

              {/* PAN */}
              <label className="p-3 rounded-xl border bg-background flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-semibold block">PAN Card Redaction</span>
                    <span className="text-[10px] text-muted-foreground">Full 10-character alphanumeric blackout</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maskPan}
                  onChange={(e) => setMaskPan(e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </label>

              {/* Aadhaar */}
              <label className="p-3 rounded-xl border bg-background flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-2.5">
                  <EyeOff className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-semibold block">Aadhaar UIDAI Masking</span>
                    <span className="text-[10px] text-muted-foreground">Masks first 8 digits (XXXX-XXXX-1234)</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maskAadhaar}
                  onChange={(e) => setMaskAadhaar(e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </label>

              {/* Account Number */}
              <label className="p-3 rounded-xl border bg-background flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-semibold block">Account Number Redaction</span>
                    <span className="text-[10px] text-muted-foreground">Conceals leading digits, keeps last 4</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maskAccount}
                  onChange={(e) => setMaskAccount(e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </label>

              {/* IFSC */}
              <label className="p-3 rounded-xl border bg-background flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-semibold block">IFSC Branch Code Masking</span>
                    <span className="text-[10px] text-muted-foreground">Conceals internal clearing identifiers</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maskIfsc}
                  onChange={(e) => setMaskIfsc(e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </label>

              {/* Anti-Fraud Watermark */}
              <div className="p-3.5 rounded-xl border bg-background space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold">Anti-Fraud KYC Watermark</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={applyWatermark}
                    onChange={(e) => setApplyWatermark(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                </label>
                {applyWatermark && (
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full text-xs bg-muted/40 border rounded-lg px-2.5 py-1.5 text-foreground mt-1"
                    placeholder="e.g. FOR KYC VERIFICATION ONLY"
                  />
                )}
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-2 space-y-2">
              {!result ? (
                <Button
                  onClick={handleAutoSanitize}
                  disabled={isProcessing}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning & Redacting KYC...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Auto-Sanitize KYC Document
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDownload}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Sanitized PDF
                </Button>
              )}
            </div>

            {/* Detections Summary */}
            {result && (
              <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sanitization Complete ({result.detections.total} elements redacted)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                  <div>PAN Detected: <strong>{result.detections.pan}</strong></div>
                  <div>Aadhaar Detected: <strong>{result.detections.aadhaar}</strong></div>
                  <div>Accounts Masked: <strong>{result.detections.account}</strong></div>
                  <div>IFSC Masked: <strong>{result.detections.ifsc}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Document Viewer Canvas */}
          <div className="flex-1 bg-muted/20 flex flex-col h-full overflow-hidden">
            {/* Page Nav */}
            <div className="h-11 border-b bg-card/60 px-4 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold">Live Inspection Preview</span>
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
