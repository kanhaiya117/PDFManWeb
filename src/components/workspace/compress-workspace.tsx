"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { compressPdfDocument, CompressPdfResult, CompressionProfile } from "@/lib/compression-engine";
import { Button } from "@/components/ui/button";
import { 
  Minimize2, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  FileText,
  CheckCircle2,
  Sliders,
  TrendingDown,
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";

export function CompressWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [profile, setProfile] = useState<CompressionProfile>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<CompressPdfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [file]);

  const handleCompress = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(null);

      const buffer = await file.arrayBuffer();
      const res = await compressPdfDocument({
        pdfBuffer: buffer,
        profile,
        onProgress: (current, total) => setProgress({ current, total }),
      });

      setResult(res);
    } catch (err: any) {
      console.error("Compression failed:", err);
      setError(err?.message || "Failed to compress PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(result.compressedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_compressed.pdf`;
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <header className="h-14 border-b bg-card/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
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
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Minimize2 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Compress PDF</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Reduce PDF file size while preserving high visual quality</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            100% Client-Side
          </span>
          {file && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Change File
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
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[380px] border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Minimize2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to Compress</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Downsamples oversized graphics, optimizes internal stream dictionaries, and reduces file size up to 80% directly in your browser.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info Bar */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold truncate max-w-sm md:max-w-md">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB • Original PDF Size</p>
                </div>
              </div>
            </div>

            {/* Profile Selection Grid */}
            <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-semibold">Choose Compression Profile</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select the compression level tailored for your target use case</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Extreme */}
                <div
                  onClick={() => { setProfile('extreme'); setResult(null); }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profile === 'extreme'
                      ? 'border-emerald-600 bg-emerald-500/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    {profile === 'extreme' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="text-sm font-semibold">Extreme Compression</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum size reduction (~70–85% saved). Ideal for strict email attachment limits and job application portals.
                  </p>
                </div>

                {/* Recommended */}
                <div
                  onClick={() => { setProfile('recommended'); setResult(null); }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profile === 'recommended'
                      ? 'border-emerald-600 bg-emerald-500/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    {profile === 'recommended' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="text-sm font-semibold">Recommended (Balanced)</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balanced clarity and compact footprint (~40–60% saved). Excellent for screens, web viewing, and digital sharing.
                  </p>
                </div>

                {/* High Quality */}
                <div
                  onClick={() => { setProfile('high'); setResult(null); }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profile === 'high'
                      ? 'border-emerald-600 bg-emerald-500/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                      <Sliders className="w-4 h-4" />
                    </div>
                    {profile === 'high' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="text-sm font-semibold">High Quality (Light)</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Light compression preserving high DPI and fine details (~20–40% saved). Perfect for archiving and printing.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Trigger Card */}
            <div className="p-5 rounded-2xl border bg-card shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold">Ready to compress</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result ? "Optimization complete! Your compressed PDF is ready for download." : "Click below to process and reduce PDF file size."}
                </p>
              </div>

              {!result ? (
                <Button
                  onClick={handleCompress}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progress ? `Optimizing page ${progress.current} of ${progress.total}...` : "Compressing PDF..."}
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      Compress PDF Now
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDownload}
                  size="lg"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Compressed PDF
                </Button>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Compression Results Gauge */}
            {result && (
              <div className="p-6 rounded-2xl border bg-card space-y-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-semibold">Compression Analysis</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">Original File Size</span>
                    <p className="text-lg font-bold text-muted-foreground line-through">
                      {(result.originalSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-1">
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Compressed Size</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {(result.compressedSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">Total Reduction</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TrendingDown className="w-4 h-4 text-emerald-500" />
                      <p className="text-lg font-bold text-emerald-600">
                        {result.percentReduction}% Saved
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Document optimized across {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'} with 100% zero-telemetry local memory execution.
                  </span>
                  <Button
                    size="sm"
                    onClick={handleDownload}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save Compressed PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
