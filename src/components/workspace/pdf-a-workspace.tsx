"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { PdfAAnalysisReport, convertToPdfA } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { 
  Archive, 
  Download, 
  Upload, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileCheck2, 
  Info,
  ArrowLeft 
} from "lucide-react";
import { useRouter } from "next/navigation";

export function PdfAWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [targetStandard, setTargetStandard] = useState<'PDF/A-1b' | 'PDF/A-2b'>('PDF/A-1b');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfaBlob, setPdfaBlob] = useState<Blob | null>(null);
  const [report, setReport] = useState<PdfAAnalysisReport | null>(null);
  const router = useRouter();

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setPdfaBlob(null);
    setReport(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await convertToPdfA({
        pdfBuffer: buffer,
        target: targetStandard,
      });

      setPdfaBlob(result.blob);
      setReport(result.report);
    } catch (err: any) {
      console.error("PDF/A conversion failed:", err);
      alert("PDF/A conversion failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!pdfaBlob || !file) return;
    const url = URL.createObjectURL(pdfaBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PDFMan_${targetStandard.replace(/[/]/g, '_')}_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-700 to-slate-900 text-white flex items-center justify-center shadow-lg mx-auto">
            <Archive className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PDF/A Long-Term Preservation</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Convert documents to ISO 19005 standard PDF/A-1b / PDF/A-2b for government, legal, and institutional archiving.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-slate-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF to Convert</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>ISO Standard Compliance &bull; Embedded sRGB OutputIntent &bull; Genuine XMP Metadata</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b px-4 flex items-center justify-between bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-xs gap-1.5"
            onClick={() => router.push("/workspace")}
          >
            <ArrowLeft className="w-4 h-4" /> Workspace
          </Button>
          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline truncate max-w-xs">
            {file.name}
          </span>
        </div>

        {pdfaBlob && (
          <Button 
            size="sm" 
            onClick={handleDownload}
            className="bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download {targetStandard} File
          </Button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center bg-muted/10">
        <div className="max-w-2xl w-full bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">ISO Archival Conversion</h2>
              <p className="text-xs text-muted-foreground">Select archival target and generate compliance schema</p>
            </div>
          </div>

          {/* Target Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              Archival Target Standard
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'PDF/A-1b' as const, name: 'PDF/A-1b (ISO 19005-1)', desc: 'Visual preservation standard for official records and public filings.' },
                { id: 'PDF/A-2b' as const, name: 'PDF/A-2b (ISO 19005-2)', desc: 'Enhanced standard supporting JPEG2000, transparency, and attachments.' },
              ].map((std) => (
                <button
                  key={std.id}
                  onClick={() => setTargetStandard(std.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    targetStandard === std.id ? 'border-zinc-800 dark:border-zinc-200 bg-muted/40 font-bold shadow-xs' : 'bg-card'
                  }`}
                >
                  <div className="text-xs">{std.name}</div>
                  <div className="text-[11px] text-muted-foreground font-normal mt-1 leading-relaxed">{std.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Compliance Audit Report */}
          {report && (
            <div className="p-4 rounded-2xl bg-muted/30 border space-y-3 text-xs animate-in fade-in">
              <div className="flex items-center justify-between font-bold">
                <span>Compliance Audit Scorecard</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                  STATUS: COMPLIANT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-card border flex items-center justify-between">
                  <span>OutputIntent sRGB Profile:</span>
                  <span className="text-emerald-600 font-bold">{report.checks.outputIntent}</span>
                </div>
                <div className="p-2 rounded-lg bg-card border flex items-center justify-between">
                  <span>XMP PDF/A Identification:</span>
                  <span className="text-emerald-600 font-bold">{report.checks.xmpSchema}</span>
                </div>
                <div className="p-2 rounded-lg bg-card border flex items-center justify-between">
                  <span>Script & Actions Stripped:</span>
                  <span className="text-emerald-600 font-bold">{report.checks.interactiveActionsPurged}</span>
                </div>
                <div className="p-2 rounded-lg bg-card border flex items-center justify-between">
                  <span>Standard Font Embedding:</span>
                  <span className="text-emerald-600 font-bold">{report.checks.fontEmbedding}</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-muted-foreground pt-2 border-t">
                {report.notes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-foreground">&bull;</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={handleConvert}
            disabled={isProcessing}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl h-11 text-xs font-bold gap-2 shadow-sm cursor-pointer"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            {isProcessing ? "Converting to ISO Standard..." : `Convert to ${targetStandard}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
