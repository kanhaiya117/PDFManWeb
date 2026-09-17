"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { 
  GitCompare, 
  ArrowRightLeft, 
  FileText, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  SplitSquareVertical, 
  Loader2, 
  ArrowLeft,
  Upload,
  ShieldCheck,
  Layers,
  Download,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { pdfjsLib } from "@/lib/pdf-init";

interface DocStats {
  numPages: number;
  sizeMb: string;
  charCount: number;
  words: number;
}

export function CompareWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [file2, setFile2] = useState<File | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compared, setCompared] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [maxPages, setMaxPages] = useState(1);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'audit'>('side-by-side');

  const [stats1, setStats1] = useState<DocStats | null>(null);
  const [stats2, setStats2] = useState<DocStats | null>(null);
  const [textDiff, setTextDiff] = useState<{ added: string[]; removed: string[]; sharedCount: number } | null>(null);

  const [pdf1, setPdf1] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdf2, setPdf2] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const handleFile2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile2(e.target.files[0]);
      setCompared(false);
    }
  };

  const handleCompare = async () => {
    if (!file || !file2) return;
    setIsComparing(true);

    try {
      const b1 = await file.arrayBuffer();
      const b2 = await file2.arrayBuffer();

      const doc1 = await pdfjsLib.getDocument({
        data: new Uint8Array(b1),
        cMapUrl: "/cmaps/",
        cMapPacked: true,
      }).promise;

      const doc2 = await pdfjsLib.getDocument({
        data: new Uint8Array(b2),
        cMapUrl: "/cmaps/",
        cMapPacked: true,
      }).promise;

      setPdf1(doc1);
      setPdf2(doc2);
      setMaxPages(Math.max(doc1.numPages, doc2.numPages));

      // Extract text from both
      let fullText1 = "";
      for (let i = 1; i <= doc1.numPages; i++) {
        const p = await doc1.getPage(i);
        const t = await p.getTextContent();
        fullText1 += (t.items as any[]).map(it => it.str || "").join(" ") + " ";
      }

      let fullText2 = "";
      for (let i = 1; i <= doc2.numPages; i++) {
        const p = await doc2.getPage(i);
        const t = await p.getTextContent();
        fullText2 += (t.items as any[]).map(it => it.str || "").join(" ") + " ";
      }

      const words1 = fullText1.trim().split(/\s+/).filter(Boolean);
      const words2 = fullText2.trim().split(/\s+/).filter(Boolean);

      setStats1({
        numPages: doc1.numPages,
        sizeMb: (file.size / (1024 * 1024)).toFixed(2),
        charCount: fullText1.length,
        words: words1.length,
      });

      setStats2({
        numPages: doc2.numPages,
        sizeMb: (file2.size / (1024 * 1024)).toFixed(2),
        charCount: fullText2.length,
        words: words2.length,
      });

      const set1 = new Set(words1.map(w => w.toLowerCase()));
      const set2 = new Set(words2.map(w => w.toLowerCase()));

      const added = Array.from(set2).filter(w => !set1.has(w)).slice(0, 100);
      const removed = Array.from(set1).filter(w => !set2.has(w)).slice(0, 100);
      const sharedCount = Array.from(set1).filter(w => set2.has(w)).length;

      setTextDiff({ added, removed, sharedCount });
      setCompared(true);
      setActivePage(1);
    } catch (err: any) {
      console.error("Comparison error:", err);
      alert("Error comparing documents: " + err.message);
    } finally {
      setIsComparing(false);
    }
  };

  // Render side-by-side & overlay canvases
  useEffect(() => {
    if (!compared) return;

    const render = async () => {
      const scale = 0.9;

      // Render Doc 1
      if (pdf1 && canvas1Ref.current && activePage <= pdf1.numPages) {
        const p1 = await pdf1.getPage(activePage);
        const v1 = p1.getViewport({ scale });
        const c1 = canvas1Ref.current;
        c1.width = v1.width;
        c1.height = v1.height;
        const ctx1 = c1.getContext('2d');
        if (ctx1) await p1.render({ canvasContext: ctx1, viewport: v1, canvas: c1 } as any).promise;
      }

      // Render Doc 2
      if (pdf2 && canvas2Ref.current && activePage <= pdf2.numPages) {
        const p2 = await pdf2.getPage(activePage);
        const v2 = p2.getViewport({ scale });
        const c2 = canvas2Ref.current;
        c2.width = v2.width;
        c2.height = v2.height;
        const ctx2 = c2.getContext('2d');
        if (ctx2) await p2.render({ canvasContext: ctx2, viewport: v2, canvas: c2 } as any).promise;
      }

      // Render Overlay Diff Canvas if in overlay mode
      if (diffCanvasRef.current && canvas1Ref.current && canvas2Ref.current) {
        const diffCanvas = diffCanvasRef.current;
        const c1 = canvas1Ref.current;
        const c2 = canvas2Ref.current;

        diffCanvas.width = Math.max(c1.width, c2.width);
        diffCanvas.height = Math.max(c1.height, c2.height);
        const diffCtx = diffCanvas.getContext('2d');

        if (diffCtx) {
          diffCtx.clearRect(0, 0, diffCanvas.width, diffCanvas.height);
          // Draw Doc 1 with slight red tint
          diffCtx.globalAlpha = 0.7;
          diffCtx.drawImage(c1, 0, 0);

          // Draw Doc 2 with difference blending
          diffCtx.globalCompositeOperation = 'difference';
          diffCtx.drawImage(c2, 0, 0);
          diffCtx.globalCompositeOperation = 'source-over';
        }
      }
    };

    render();
  }, [compared, activePage, pdf1, pdf2, viewMode]);

  const handleExportAuditReport = () => {
    if (!textDiff || !file || !file2) return;
    let report = `PDFMAN DOCUMENT COMPARISON AUDIT REPORT\n`;
    report += `================================================\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Document A (Original): ${file.name} (${stats1?.numPages} pages, ${stats1?.words} words)\n`;
    report += `Document B (Modified): ${file2.name} (${stats2?.numPages} pages, ${stats2?.words} words)\n`;
    report += `================================================\n\n`;
    report += `MODIFICATION SUMMARY:\n`;
    report += `Added Words / Terms: ${textDiff.added.length}\n`;
    report += `Removed Words / Terms: ${textDiff.removed.length}\n`;
    report += `Shared / Unchanged Vocabulary: ${textDiff.sharedCount}\n\n`;
    report += `ADDED TERMS (+):\n${textDiff.added.join(', ') || 'None'}\n\n`;
    report += `REMOVED TERMS (-):\n${textDiff.removed.join(', ') || 'None'}\n\n`;
    report += `Audit completed client-side with 100% zero-telemetry local isolation.\n`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Compare_Report_${file.name.slice(0, 10)}_vs_${file2.name.slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <GitCompare className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Side-by-Side PDF Document Compare</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Visual difference & text modification analyzer &bull; Client-Side</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            100% Client-Side
          </span>
          {compared && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAuditReport}
              className="text-xs h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit Report
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
        {!compared ? (
          <div className="max-w-4xl mx-auto space-y-8 my-auto pt-4">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-bold tracking-tight">Select Two Documents to Compare</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Upload the original version and the revised document to inspect visual difference heatmaps and text modifications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File 1 */}
              <div className="bg-card rounded-2xl border-2 border-dashed p-8 flex flex-col items-center text-center shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Version A (Original)</span>
                {file ? (
                  <div className="bg-muted/40 p-4 rounded-xl w-full border text-left">
                    <p className="font-semibold text-xs truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <Button variant="outline" className="rounded-xl text-xs font-semibold">Upload Original PDF</Button>
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => {
                        if (e.target.files) setFile(e.target.files[0]);
                      }} 
                    />
                  </div>
                )}
              </div>

              {/* File 2 */}
              <div className="bg-card rounded-2xl border-2 border-dashed p-8 flex flex-col items-center text-center shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Version B (Modified)</span>
                {file2 ? (
                  <div className="bg-muted/40 p-4 rounded-xl w-full border text-left">
                    <p className="font-semibold text-xs truncate">{file2.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{(file2.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <Button variant="outline" className="rounded-xl text-xs font-semibold">Upload Modified PDF</Button>
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleFile2} 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-2">
              <Button 
                size="lg"
                onClick={handleCompare} 
                disabled={!file || !file2 || isComparing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 rounded-xl font-bold text-xs shadow-sm cursor-pointer gap-2"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Comparing Documents...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Compare Documents Now
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Compare Metrics Bar */}
            <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">DOC A ({file?.name.slice(0, 16)}...)</span>
                  <span className="font-bold">{stats1?.numPages} pgs &bull; {stats1?.words} words</span>
                </div>
                <div className="h-6 w-[1px] bg-border"></div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">DOC B ({file2?.name.slice(0, 16)}...)</span>
                  <span className="font-bold">{stats2?.numPages} pgs &bull; {stats2?.words} words</span>
                </div>
                <div className="h-6 w-[1px] bg-border"></div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">MODIFICATIONS DETECTED</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    +{textDiff?.added.length} added &bull; -{textDiff?.removed.length} removed
                  </span>
                </div>
              </div>

              {/* View mode buttons & page nav */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('side-by-side')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      viewMode === 'side-by-side' ? 'bg-indigo-600 text-white font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('overlay')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      viewMode === 'overlay' ? 'bg-indigo-600 text-white font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Visual Overlay Diff
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('audit')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      viewMode === 'audit' ? 'bg-indigo-600 text-white font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Text Audit
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setActivePage(p => Math.max(1, p - 1))}
                    disabled={activePage <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono font-semibold px-2">Page {activePage} of {maxPages}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setActivePage(p => Math.min(maxPages, p + 1))}
                    disabled={activePage >= maxPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* View Mode 1: Side by Side */}
            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl border bg-card shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b">
                    <span>Document A (Original)</span>
                    <span>Page {activePage}</span>
                  </div>
                  <div className="flex items-center justify-center p-2 bg-muted/20 rounded-xl overflow-hidden min-h-[450px]">
                    <canvas ref={canvas1Ref} className="max-w-full h-auto rounded shadow-sm border" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-card shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b">
                    <span>Document B (Modified)</span>
                    <span>Page {activePage}</span>
                  </div>
                  <div className="flex items-center justify-center p-2 bg-muted/20 rounded-xl overflow-hidden min-h-[450px]">
                    <canvas ref={canvas2Ref} className="max-w-full h-auto rounded shadow-sm border" />
                  </div>
                </div>
              </div>
            )}

            {/* View Mode 2: Visual Overlay Diff */}
            {viewMode === 'overlay' && (
              <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3 text-xs">
                  <div>
                    <h3 className="font-semibold text-sm">Visual Difference Heatmap</h3>
                    <p className="text-muted-foreground">Inverted pixel difference highlights changes between Page {activePage} of Doc A and Doc B</p>
                  </div>
                  <span className="text-[11px] bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded-full font-medium">
                    Pixel Difference Blending
                  </span>
                </div>

                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-xl overflow-hidden min-h-[480px]">
                  <canvas ref={diffCanvasRef} className="max-w-full h-auto rounded shadow border bg-white" />
                </div>
              </div>
            )}

            {/* View Mode 3: Text Modification Audit */}
            {viewMode === 'audit' && textDiff && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Added Words (+{textDiff.added.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[360px] overflow-y-auto p-1">
                    {textDiff.added.map((w, i) => (
                      <span key={i} className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded border border-emerald-500/20 font-mono">
                        +{w}
                      </span>
                    ))}
                    {textDiff.added.length === 0 && (
                      <span className="text-xs text-muted-foreground">No new vocabulary detected.</span>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Removed Words (-{textDiff.removed.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[360px] overflow-y-auto p-1">
                    {textDiff.removed.map((w, i) => (
                      <span key={i} className="text-[11px] bg-destructive/10 text-destructive px-2 py-1 rounded border border-destructive/20 font-mono line-through">
                        -{w}
                      </span>
                    ))}
                    {textDiff.removed.length === 0 && (
                      <span className="text-xs text-muted-foreground">No removed vocabulary detected.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
