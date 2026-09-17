"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { convertPdfToImages, PdfToImagesResult } from "@/lib/conversion-engine";
import { pdfjsLib } from "@/lib/pdf-init";
import { Button } from "@/components/ui/button";
import { 
  FileImage, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  FileText,
  Archive,
  CheckCircle2,
  Sliders,
  ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";

export function PdfToImagesWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [dpi, setDpi] = useState<number>(150); // 150 DPI default
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const [result, setResult] = useState<PdfToImagesResult | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load basic page count on file change
  useEffect(() => {
    setResult(null);
    setError(null);
    if (!file) return;

    let isMounted = true;
    const inspectPdf = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        }).promise;

        if (isMounted) {
          setTotalPages(doc.numPages);
          setCustomRange(`1-${Math.min(doc.numPages, 5)}`);
        }
      } catch (err: any) {
        console.error("PDF inspection error:", err);
      }
    };

    inspectPdf();
    return () => { isMounted = false; };
  }, [file]);

  const parseRangeIndices = (rangeStr: string, total: number): number[] => {
    const indices: Set<number> = new Set();
    const parts = rangeStr.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(total, end); i++) {
            indices.add(i - 1);
          }
        }
      } else {
        const pageNum = parseInt(trimmed, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= total) {
          indices.add(pageNum - 1);
        }
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
  };

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgressText("Rendering PDF pages at high DPI...");

      const buffer = await file.arrayBuffer();
      const scale = dpi === 300 ? 3.0 : dpi === 150 ? 1.5 : 1.0;
      const targetIndices = pageScope === 'custom' && customRange 
        ? parseRangeIndices(customRange, totalPages) 
        : undefined;

      const res = await convertPdfToImages({
        pdfBuffer: buffer,
        format,
        scale,
        pageIndices: targetIndices,
      });

      setResult(res);
      setProgressText("");
    } catch (err: any) {
      console.error("PDF to Images conversion error:", err);
      setError(err?.message || "Failed to render PDF to images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = () => {
    if (!result?.zipBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(result.zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_images.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingleImage = (dataUrl: string, pageNum: number) => {
    if (!file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const ext = format === 'png' ? 'png' : 'jpg';
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${baseName}_page_${pageNum}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileImage className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">PDF to JPG / PNG Converter</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">High-DPI page rasterization & ZIP batch export</p>
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

      {/* Workspace Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[380px] border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <FileImage className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to convert to images</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Render each page into crystal-clear PNG or JPG raster images up to 300 DPI for print, presentations, or sharing.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Options Bar */}
            <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold truncate max-w-sm md:max-w-md">{file.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!result ? (
                    <Button 
                      onClick={handleConvert} 
                      disabled={isProcessing}
                      className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-md gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rendering Pages...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Convert to {format.toUpperCase()}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleDownloadZip} 
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      Download All as ZIP
                    </Button>
                  )}
                </div>
              </div>

              {/* Settings Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Format Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('png')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        format === 'png'
                          ? 'border-amber-600 bg-amber-500/10 text-amber-600 font-semibold shadow-sm'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      PNG (Lossless)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('jpeg')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        format === 'jpeg'
                          ? 'border-amber-600 bg-amber-500/10 text-amber-600 font-semibold shadow-sm'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      JPG (Compressed)
                    </button>
                  </div>
                </div>

                {/* DPI / Quality */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDpi(72)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        dpi === 72
                          ? 'border-amber-600 bg-amber-500/10 text-amber-600 font-semibold'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      72 DPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setDpi(150)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        dpi === 150
                          ? 'border-amber-600 bg-amber-500/10 text-amber-600 font-semibold'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      150 DPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setDpi(300)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        dpi === 300
                          ? 'border-amber-600 bg-amber-500/10 text-amber-600 font-semibold'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      300 DPI
                    </button>
                  </div>
                </div>

                {/* Page Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page Range</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageScope}
                      onChange={(e) => setPageScope(e.target.value as any)}
                      className="text-xs bg-background border rounded-xl px-2.5 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="all">All Pages ({totalPages})</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    {pageScope === 'custom' && (
                      <input
                        type="text"
                        placeholder="e.g. 1-3, 5"
                        value={customRange}
                        onChange={(e) => setCustomRange(e.target.value)}
                        className="text-xs bg-background border rounded-xl px-2.5 py-2 w-28 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Results Grid */}
            {result && (
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold">Rendered Images ({result.images.length} pages)</h3>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleDownloadZip}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Download All ZIP
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {result.images.map((img) => (
                    <div 
                      key={img.pageNum} 
                      className="group border rounded-xl p-3 bg-muted/20 hover:border-amber-500/50 transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-background border mb-3 flex items-center justify-center relative shadow-sm">
                        <img 
                          src={img.dataUrl} 
                          alt={`Page ${img.pageNum}`}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-full">
                          Page {img.pageNum}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {(img.blob.size / 1024).toFixed(0)} KB • {format.toUpperCase()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadSingleImage(img.dataUrl, img.pageNum)}
                          className="h-7 text-xs px-2.5 gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                        >
                          <Download className="w-3 h-3" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
