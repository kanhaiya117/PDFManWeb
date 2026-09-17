"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { splitPdfDocument, SplitPackage } from "@/lib/specialized-engine";
import { pdfjsLib } from "@/lib/pdf-init";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Scissors,
  Download,
  Upload,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Archive,
  Layers,
  FileText,
  CheckCircle2,
  Split,
  FolderArchive,
  Eye
} from "lucide-react";
import { useRouter } from "next/navigation";

export function SplitWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [splitMode, setSplitMode] = useState<"ranges" | "fixed" | "pages">("ranges");
  const [rangeString, setRangeString] = useState("1-2, 3-4");
  const [fixedInterval, setFixedInterval] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitResult, setSplitResult] = useState<{
    packages: SplitPackage[];
    zipBlob: Blob;
  } | null>(null);

  // Thumbnail state
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<{ pageNum: number; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load document and generate preview thumbnails
  useEffect(() => {
    setSplitResult(null);
    if (!file) {
      setTotalPages(0);
      setThumbnails([]);
      return;
    }

    let isMounted = true;
    const loadDoc = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({
          data: buffer,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        }).promise;

        if (!isMounted) return;
        setTotalPages(doc.numPages);

        // Adjust default range string based on total pages
        if (doc.numPages >= 4) {
          const mid = Math.floor(doc.numPages / 2);
          setRangeString(`1-${mid}, ${mid + 1}-${doc.numPages}`);
        } else if (doc.numPages > 1) {
          setRangeString(`1, 2-${doc.numPages}`);
        } else {
          setRangeString("1");
        }

        // Render thumbnails (up to 12 pages for quick preview)
        const countToRender = Math.min(doc.numPages, 12);
        const thumbs: { pageNum: number; url: string }[] = [];

        for (let i = 1; i <= countToRender; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.25 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
            thumbs.push({ pageNum: i, url: canvas.toDataURL("image/jpeg", 0.75) });
          }
        }

        if (isMounted) {
          setThumbnails(thumbs);
        }
      } catch (err) {
        console.error("Error loading document in split workspace:", err);
      }
    };

    loadDoc();
    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.type === "application/pdf" || selected.name.endsWith(".pdf")) {
        setFile(selected);
      } else {
        alert("Please select a valid PDF file.");
      }
    }
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await splitPdfDocument({
        pdfBuffer: buffer,
        mode: splitMode,
        rangeString: rangeString.trim(),
        fixedPagesPerSplit: fixedInterval,
      });

      setSplitResult(result);
    } catch (err: any) {
      console.error("Split failed:", err);
      alert(`Split operation failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = () => {
    if (!splitResult) return;
    const url = URL.createObjectURL(splitResult.zipBlob);
    const a = document.createElement("a");
    a.href = url;
    const originalName = file?.name?.replace(/\.pdf$/i, "") || "document";
    a.download = `${originalName}_split_packages.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = (pkg: SplitPackage) => {
    const url = URL.createObjectURL(pkg.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pkg.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/workspace")}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Split PDF Document
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Precision Slicer
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Client-Side In-Memory Slicing</span>
          </div>

          {file && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Change PDF
            </Button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />
        </div>
      </header>

      {/* Main Content Area */}
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <Split className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">
              Select PDF to Split
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Slice large documents by page ranges (e.g., 1-5, 6-10), fixed intervals, or extract every page into standalone files.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2 rounded-xl shadow-lg shadow-emerald-950/50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Select PDF File
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Settings Sidebar */}
          <aside className="w-full md:w-80 border-r border-slate-800 bg-slate-950/60 flex flex-col overflow-y-auto p-4 shrink-0">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]" title={file.name}>
                  {file.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {totalPages} {totalPages === 1 ? "page" : "pages"} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            </div>

            {/* Split Mode Selector */}
            <div className="space-y-4 mb-6">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Split Strategy
              </label>

              {/* Mode 1: Custom Ranges */}
              <div
                onClick={() => setSplitMode("ranges")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  splitMode === "ranges"
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-950/30"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">Custom Ranges</span>
                  </div>
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === "ranges"}
                    onChange={() => setSplitMode("ranges")}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Define custom split boundaries like 1-2, 3-5, 6-10.
                </p>

                {splitMode === "ranges" && (
                  <div className="pt-1">
                    <Input
                      type="text"
                      value={rangeString}
                      onChange={(e) => setRangeString(e.target.value)}
                      placeholder="e.g. 1-2, 3-5"
                      className="h-8 text-xs bg-slate-950/80 border-slate-700 text-slate-200 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Comma-separated ranges or single page numbers.
                    </p>
                  </div>
                )}
              </div>

              {/* Mode 2: Fixed Interval */}
              <div
                onClick={() => setSplitMode("fixed")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  splitMode === "fixed"
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-950/30"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">Fixed Interval</span>
                  </div>
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === "fixed"}
                    onChange={() => setSplitMode("fixed")}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Split into separate documents every N pages.
                </p>

                {splitMode === "fixed" && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400">Every</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages || 100}
                      value={fixedInterval}
                      onChange={(e) => setFixedInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 w-20 text-xs bg-slate-950/80 border-slate-700 text-slate-200 text-center focus:border-emerald-500"
                    />
                    <span className="text-xs text-slate-400">pages</span>
                  </div>
                )}
              </div>

              {/* Mode 3: Extract All Pages */}
              <div
                onClick={() => setSplitMode("pages")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  splitMode === "pages"
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-950/30"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">Single Pages</span>
                  </div>
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === "pages"}
                    onChange={() => setSplitMode("pages")}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Export each individual page as an independent PDF.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-auto pt-4 border-t border-slate-800">
              <Button
                onClick={handleSplit}
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Slicing PDF Document...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    Split Document Now
                  </>
                )}
              </Button>
            </div>
          </aside>

          {/* Right Preview and Results Canvas */}
          <main className="flex-1 flex flex-col bg-slate-900/50 overflow-y-auto p-6">
            {splitResult ? (
              /* Success / Result View */
              <div className="max-w-4xl w-full mx-auto space-y-6">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">
                        Splitting Completed Successfully!
                      </h3>
                      <p className="text-xs text-slate-400">
                        Generated {splitResult.packages.length} standalone PDF {splitResult.packages.length === 1 ? "partition" : "partitions"}.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleDownloadZip}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shrink-0 shadow-md shadow-emerald-950/40"
                  >
                    <FolderArchive className="w-4 h-4" />
                    Download All as ZIP
                  </Button>
                </div>

                {/* Generated Packages Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {splitResult.packages.map((pkg, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            Part #{idx + 1}
                          </span>
                          <span className="text-xs text-emerald-400 font-medium">
                            {pkg.pageCount} {pkg.pageCount === 1 ? "page" : "pages"}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-200 truncate mb-1" title={pkg.name}>
                          {pkg.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mb-4">
                          Range: <span className="text-slate-200 font-medium">{pkg.pageRange}</span>
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadSingle(pkg)}
                        className="w-full text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        Download PDF
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Pre-split Document Page Gallery Preview */
              <div className="max-w-4xl w-full mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5" />
                    Document Page Previews ({thumbnails.length} of {totalPages} pages shown)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Ready to split using selected rules
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {thumbnails.map((thumb) => (
                    <div
                      key={thumb.pageNum}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 flex flex-col items-center relative group"
                    >
                      <div className="w-full aspect-[1/1.4] bg-slate-900 rounded overflow-hidden mb-1.5 flex items-center justify-center border border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb.url}
                          alt={`Page ${thumb.pageNum}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        Page {thumb.pageNum}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
