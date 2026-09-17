"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { deletePdfPages, parsePageRange } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Undo2, 
  Download, 
  Upload, 
  Shield, 
  CheckSquare, 
  Square, 
  Loader2, 
  ArrowLeft,
  X 
} from "lucide-react";
import { useRouter } from "next/navigation";

export function DeletePagesWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [thumbnails, setThumbnails] = useState<{ pageNum: number; url: string }[]>([]);
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<Set<number>[]>([new Set()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [rangeInput, setRangeInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  // Load PDF and render thumbnails
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    const load = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({
          data: buffer,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        }).promise;

        const thumbs: { pageNum: number; url: string }[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          }
          thumbs.push({ pageNum: i, url: canvas.toDataURL("image/jpeg", 0.8) });
        }

        if (isMounted) {
          setThumbnails(thumbs);
        }
      } catch (err) {
        console.error("Error loading PDF in delete workspace:", err);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [file]);

  const pushHistory = (newSet: Set<number>) => {
    const sliced = history.slice(0, historyIndex + 1);
    const nextHist = [...sliced, newSet];
    setHistory(nextHist);
    setHistoryIndex(nextHist.length - 1);
    setDeletedIndices(newSet);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setDeletedIndices(history[prevIdx]);
    }
  };

  const togglePageDeletion = (pageIdx: number) => {
    const next = new Set(deletedIndices);
    if (next.has(pageIdx)) next.delete(pageIdx);
    else next.add(pageIdx);
    pushHistory(next);
  };

  const applyRangeDeletion = () => {
    const indices = parsePageRange(rangeInput, thumbnails.length);
    const next = new Set(deletedIndices);
    indices.forEach(idx => next.add(idx));
    pushHistory(next);
    setRangeInput("");
  };

  const selectEvenPages = () => {
    const next = new Set(deletedIndices);
    thumbnails.forEach((_, idx) => {
      if ((idx + 1) % 2 === 0) next.add(idx);
    });
    pushHistory(next);
  };

  const selectOddPages = () => {
    const next = new Set(deletedIndices);
    thumbnails.forEach((_, idx) => {
      if ((idx + 1) % 2 !== 0) next.add(idx);
    });
    pushHistory(next);
  };

  const clearAllMarked = () => {
    pushHistory(new Set());
  };

  const handleExport = async () => {
    if (!file || deletedIndices.size === 0) {
      alert("Please mark at least one page for deletion.");
      return;
    }

    if (deletedIndices.size >= thumbnails.length) {
      alert("Cannot delete all pages from the document. At least one page must remain.");
      return;
    }

    setIsExporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const outputBlob = await deletePdfPages({
        pdfBuffer: buffer,
        pagesToDelete: Array.from(deletedIndices),
      });

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Sanitized_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Delete pages export failed:", err);
      alert("Failed to delete pages: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center shadow-lg mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Delete PDF Pages</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Remove unwanted, blank, or sensitive pages permanently before distributing your document.
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
            <span className="font-semibold text-sm block">Choose PDF to Clean</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Non-destructive &bull; Original file is untouched &bull; Generates brand-new clean PDF</span>
          </div>
        </div>
      </div>
    );
  }

  const remainingCount = thumbnails.length - deletedIndices.size;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Action Bar */}
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

          <div className="w-px h-5 bg-border mx-1" />

          {/* Range selection input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Range:</span>
            <Input 
              value={rangeInput} 
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-3, 5, 8" 
              className="h-8 w-32 text-xs font-mono"
            />
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={applyRangeDeletion}>
              Mark Range
            </Button>
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Helper buttons */}
          <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={selectEvenPages}>
            Mark Even
          </Button>
          <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={selectOddPages}>
            Mark Odd
          </Button>
          {deletedIndices.size > 0 && (
            <Button variant="ghost" size="sm" className="rounded-xl text-xs text-muted-foreground hover:text-foreground" onClick={clearAllMarked}>
              Reset Marks
            </Button>
          )}

          <div className="w-px h-5 bg-border mx-1" />

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
            <span className="text-destructive font-bold">{deletedIndices.size} marked</span> / {remainingCount} remaining
          </span>

          <Button 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting || deletedIndices.size === 0}
            className="bg-destructive hover:bg-destructive/90 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete Pages & Download
          </Button>
        </div>
      </div>

      {/* Grid of Pages */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {thumbnails.map((thumb, idx) => {
            const isMarked = deletedIndices.has(idx);
            return (
              <div 
                key={thumb.pageNum}
                onClick={() => togglePageDeletion(idx)}
                className={`group relative flex flex-col bg-card border rounded-2xl p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer ${
                  isMarked 
                    ? 'border-destructive ring-2 ring-destructive/40 bg-destructive/5 opacity-80' 
                    : 'hover:border-destructive/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`font-bold font-mono ${isMarked ? 'text-destructive line-through' : 'text-muted-foreground'}`}>
                    Page {thumb.pageNum}
                  </span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    isMarked ? 'bg-destructive text-white' : 'border text-muted-foreground group-hover:border-destructive group-hover:text-destructive'
                  }`}>
                    <X className="w-3 h-3" />
                  </div>
                </div>

                {/* Thumbnail Preview */}
                <div className="aspect-[3/4] bg-white border rounded-xl overflow-hidden flex items-center justify-center p-2 relative shadow-inner">
                  <img 
                    src={thumb.url} 
                    alt={`Page ${thumb.pageNum}`}
                    className={`max-h-full max-w-full object-contain transition-all ${
                      isMarked ? 'grayscale opacity-40 blur-[0.5px]' : ''
                    }`}
                  />

                  {/* Red Strikethrough Overlay when marked */}
                  {isMarked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                      <div className="bg-destructive text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Will be removed
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
