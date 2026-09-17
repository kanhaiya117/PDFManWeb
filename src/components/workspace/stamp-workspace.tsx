"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { StampConfig, applyPdfStamp } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Stamp, 
  Download, 
  Upload, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Sliders, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

const PRESET_STAMPS = [
  { text: "APPROVED", color: "#16a34a", borderColor: "#16a34a", rotation: -12 },
  { text: "CONFIDENTIAL", color: "#dc2626", borderColor: "#dc2626", rotation: -15 },
  { text: "DRAFT", color: "#d97706", borderColor: "#d97706", rotation: -10 },
  { text: "VERIFIED", color: "#2563eb", borderColor: "#2563eb", rotation: 0 },
  { text: "REJECTED", color: "#991b1b", borderColor: "#991b1b", rotation: -18 },
  { text: "PAID", color: "#059669", borderColor: "#059669", rotation: -8 },
  { text: "COPY", color: "#475569", borderColor: "#475569", rotation: 0 },
];

export function StampWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Stamp settings
  const [stampText, setStampText] = useState("APPROVED");
  const [stampColor, setStampColor] = useState("#16a34a");
  const [fontSize, setFontSize] = useState(26);
  const [opacity, setOpacity] = useState(0.85);
  const [rotation, setRotation] = useState(-12);
  const [position, setPosition] = useState<StampConfig['position']>('center');
  const [targetPages, setTargetPages] = useState<StampConfig['targetPages']>('all');
  const [pageRange, setPageRange] = useState("1-3");
  const [borderStyle, setBorderStyle] = useState<StampConfig['borderStyle']>('double');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [scale, setScale] = useState(1.0);
  const router = useRouter();

  // Load PDF
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    const load = async () => {
      try {
        const task = pdfjsLib.getDocument({
          url: URL.createObjectURL(file),
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        });
        const doc = await task.promise;
        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error("Stamp workspace PDF loading error:", err);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [file]);

  // Render current page canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      setPageDimensions({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(dpr, dpr);

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      } as any).promise;

      context.restore();
    } catch (err) {
      console.error("Page render error in stamp workspace:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Choose preset stamp
  const selectPreset = (preset: typeof PRESET_STAMPS[0]) => {
    setStampText(preset.text);
    setStampColor(preset.color);
    setRotation(preset.rotation);
  };

  // Export stamped PDF
  const handleExport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setIsSuccess(false);

    try {
      const buffer = await file.arrayBuffer();
      const outputBlob = await applyPdfStamp({
        pdfBuffer: buffer,
        stamp: {
          text: stampText,
          fontSize,
          color: stampColor,
          opacity,
          rotation,
          position,
          targetPages,
          pageRange,
          currentPageIndex: currentPage - 1,
          borderStyle,
        },
        scale,
      });

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Stamped_${file.name.replace(/\.pdf$/i, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Stamp export failed:", err);
      alert("Failed to apply stamp: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-lg mx-auto">
            <Stamp className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stamp PDF Document</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Apply authentic legal and corporate stamps: APPROVED, CONFIDENTIAL, DRAFT, PAID, or custom text stamps.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-violet-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Select PDF Document</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Permanent Vector Stamp Embedding &bull; Zero Server Upload</span>
          </div>
        </div>
      </div>
    );
  }

  // Stamp placement style for DOM preview
  const getStampPreviewPosition = () => {
    switch (position) {
      case 'top-left':
        return { top: 40, left: 40, transform: `rotate(${rotation}deg)` };
      case 'top-right':
        return { top: 40, right: 40, transform: `rotate(${rotation}deg)` };
      case 'bottom-left':
        return { bottom: 40, left: 40, transform: `rotate(${rotation}deg)` };
      case 'bottom-right':
        return { bottom: 40, right: 40, transform: `rotate(${rotation}deg)` };
      case 'center':
      default:
        return { 
          top: '50%', 
          left: '50%', 
          transform: `translate(-50%, -50%) rotate(${rotation}deg)` 
        };
    }
  };

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

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={handleExport}
            disabled={isProcessing}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Apply Stamp & Download
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Stamp Controls */}
        <div className="w-80 border-r bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Preset Stamps */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Official Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_STAMPS.map((p) => (
                <button
                  key={p.text}
                  onClick={() => selectPreset(p)}
                  className={`p-2 rounded-lg border text-center font-bold text-xs tracking-wider transition-all ${
                    stampText === p.text 
                      ? 'border-violet-600 bg-violet-500/10 shadow-xs' 
                      : 'hover:border-violet-300 bg-muted/20'
                  }`}
                  style={{ color: p.color }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              Stamp Text
            </label>
            <Input 
              value={stampText} 
              onChange={(e) => setStampText(e.target.value.toUpperCase())}
              placeholder="e.g. APPROVED, REVISED" 
              className="h-8 text-xs font-bold uppercase tracking-wider"
            />
          </div>

          {/* Color & Border */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Stamp Color</span>
              <input 
                type="color" 
                value={stampColor} 
                onChange={(e) => setStampColor(e.target.value)}
                className="w-6 h-6 rounded-full border p-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {['#dc2626', '#16a34a', '#2563eb', '#d97706', '#0f172a', '#7c3aed'].map((c) => (
                <button
                  key={c}
                  onClick={() => setStampColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    stampColor === c ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Slider Controls: Font Size, Rotation, Opacity */}
          <div className="space-y-3 pt-2 border-t">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-semibold">Font Size</span>
                <span className="font-mono">{fontSize}px</span>
              </div>
              <input 
                type="range" 
                min={16} 
                max={48} 
                value={fontSize} 
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-semibold">Rotation</span>
                <span className="font-mono">{rotation}&deg;</span>
              </div>
              <input 
                type="range" 
                min={-90} 
                max={90} 
                value={rotation} 
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-semibold">Opacity</span>
                <span className="font-mono">{Math.round(opacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min={20} 
                max={100} 
                value={Math.round(opacity * 100)} 
                onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Placement Position */}
          <div className="pt-2 border-t space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              Placement Position
            </label>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {(['top-left', 'center', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  className={`p-1.5 rounded-lg border text-center capitalize transition-all ${
                    position === pos ? 'bg-violet-500/10 border-violet-600 font-bold text-violet-700 dark:text-violet-400' : 'bg-muted/20'
                  }`}
                >
                  {pos.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Target Page Selection */}
          <div className="pt-2 border-t space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              Apply to Pages
            </label>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {(['all', 'current', 'range'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTargetPages(t)}
                  className={`p-1.5 rounded-lg border text-center capitalize transition-all ${
                    targetPages === t ? 'bg-violet-500/10 border-violet-600 font-bold text-violet-700 dark:text-violet-400' : 'bg-muted/20'
                  }`}
                >
                  {t === 'all' ? 'All Pages' : t === 'current' ? `Page ${currentPage}` : 'Range'}
                </button>
              ))}
            </div>

            {targetPages === 'range' && (
              <div className="mt-1">
                <Input 
                  value={pageRange} 
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder="e.g. 1-3, 5" 
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">Format: 1-5, 8, 10-12</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas Preview Area */}
        <div className="flex-1 bg-muted/10 overflow-auto p-6 flex flex-col items-center justify-center">
          <div 
            className="relative shadow-xl border bg-white rounded-sm select-none"
            style={{ width: pageDimensions.width, height: pageDimensions.height }}
          >
            <canvas ref={canvasRef} className="block" />

            {/* Visual Live Stamp Preview on Page */}
            <div 
              className="absolute pointer-events-none transition-all duration-100"
              style={{
                ...getStampPreviewPosition(),
                opacity,
              }}
            >
              <div 
                className="px-4 py-1.5 font-black uppercase tracking-wider rounded-xs border-4 select-none whitespace-nowrap shadow-xs"
                style={{
                  color: stampColor,
                  borderColor: stampColor,
                  fontSize: `${fontSize}px`,
                  backgroundColor: 'rgba(255, 255, 255, 0.88)',
                  borderStyle: borderStyle === 'double' ? 'double' : 'solid',
                }}
              >
                {stampText || "STAMP"}
              </div>
            </div>
          </div>

          {/* Pagination Navigation */}
          <div className="mt-4 flex items-center gap-3 bg-card px-3 py-1.5 rounded-xl border shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
