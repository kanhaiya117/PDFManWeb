"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { rotatePdfPages } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { 
  RotateCw, 
  RotateCcw, 
  Undo2, 
  Download, 
  Upload, 
  Shield, 
  RefreshCw, 
  Loader2, 
  ArrowLeft 
} from "lucide-react";
import { useRouter } from "next/navigation";

export function RotateWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [thumbnails, setThumbnails] = useState<{ pageNum: number; url: string }[]>([]);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [history, setHistory] = useState<Record<number, number>[]>([{}]);
  const [historyIndex, setHistoryIndex] = useState(0);
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
        console.error("Error loading PDF in rotate workspace:", err);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [file]);

  const pushRotations = (newRot: Record<number, number>) => {
    const sliced = history.slice(0, historyIndex + 1);
    const nextHist = [...sliced, newRot];
    setHistory(nextHist);
    setHistoryIndex(nextHist.length - 1);
    setRotations(newRot);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setRotations(history[prevIdx]);
    }
  };

  const rotateSingle = (pageIdx: number, delta: number) => {
    const current = rotations[pageIdx] || 0;
    const next = {
      ...rotations,
      [pageIdx]: (current + delta + 360) % 360,
    };
    pushRotations(next);
  };

  const rotateAll = (delta: number) => {
    const next: Record<number, number> = {};
    thumbnails.forEach((_, idx) => {
      const current = rotations[idx] || 0;
      next[idx] = (current + delta + 360) % 360;
    });
    pushRotations(next);
  };

  const resetAll = () => {
    pushRotations({});
  };

  const handleExport = async () => {
    if (!file) return;
    setIsExporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const outputBlob = await rotatePdfPages({
        pdfBuffer: buffer,
        rotations,
      });

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Rotated_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Rotate export failed:", err);
      alert("Failed to rotate PDF: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <RotateCw className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rotate PDF Pages</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Rotate individual pages or all pages clockwise and counterclockwise. Permanent vector rotation applied to PDF catalog.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-cyan-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF to Rotate</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Zero Quality Loss &bull; Modifies PDF /Rotate Dictionary &bull; 100% Client-Side</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Controls Bar */}
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

          {/* Rotate All Controls */}
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl text-xs gap-1.5"
            onClick={() => rotateAll(90)}
          >
            <RotateCw className="w-3.5 h-3.5" /> Rotate All Right (90&deg;)
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl text-xs gap-1.5"
            onClick={() => rotateAll(-90)}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Rotate All Left (-90&deg;)
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={resetAll}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset All
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Undo Rotation"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>

        <Button 
          size="sm" 
          onClick={handleExport}
          disabled={isExporting}
          className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Download Rotated PDF
        </Button>
      </div>

      {/* Grid of Page Cards */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {thumbnails.map((thumb, idx) => {
            const rot = rotations[idx] || 0;
            return (
              <div 
                key={thumb.pageNum}
                className="group relative flex flex-col bg-card border rounded-2xl p-3 shadow-2xs hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold font-mono text-muted-foreground">Page {thumb.pageNum}</span>
                  {rot !== 0 && (
                    <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded font-bold">
                      {rot}&deg;
                    </span>
                  )}
                </div>

                {/* Thumbnail Display */}
                <div className="aspect-[3/4] bg-white border rounded-xl overflow-hidden flex items-center justify-center p-2 relative shadow-inner">
                  <img 
                    src={thumb.url} 
                    alt={`Page ${thumb.pageNum}`}
                    className="max-h-full max-w-full object-contain transition-transform duration-200"
                    style={{ transform: `rotate(${rot}deg)` }}
                  />
                </div>

                {/* Rotate Buttons */}
                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs px-1"
                    onClick={() => rotateSingle(idx, -90)}
                    title="Rotate -90°"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> -90&deg;
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs px-1"
                    onClick={() => rotateSingle(idx, 90)}
                    title="Rotate +90°"
                  >
                    <RotateCw className="w-3 h-3 mr-1" /> +90&deg;
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
