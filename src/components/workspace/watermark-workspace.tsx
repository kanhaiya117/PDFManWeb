"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { WatermarkOptions, applyAdvancedWatermark } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Droplets, 
  Download, 
  Upload, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Image as ImageIcon, 
  Type, 
  Loader2, 
  ArrowLeft 
} from "lucide-react";
import { useRouter } from "next/navigation";

export function WatermarkWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Watermark Settings
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#94a3b8");
  const [opacity, setOpacity] = useState(0.35);
  const [rotation, setRotation] = useState(45);
  const [layout, setLayout] = useState<WatermarkOptions['layout']>('diagonal');
  const [targetPages, setTargetPages] = useState<WatermarkOptions['targetPages']>('all');
  const [pageRange, setPageRange] = useState("1-3");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [scale, setScale] = useState(1.0);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
        console.error("Watermark workspace PDF loading error:", err);
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
      console.error("Page render error in watermark workspace:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Handle Logo Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (imgFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageDataUrl(reader.result as string);
        setWatermarkType('image');
      };
      reader.readAsDataURL(imgFile);
    }
  };

  // Export Watermarked PDF
  const handleExport = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const outputBlob = await applyAdvancedWatermark({
        pdfBuffer: buffer,
        watermark: {
          type: watermarkType,
          text,
          imageDataUrl: imageDataUrl || undefined,
          fontFamily,
          fontSize,
          color,
          opacity,
          rotation: layout === 'diagonal' ? 45 : rotation,
          layout,
          targetPages,
          pageRange,
          currentPageIndex: currentPage - 1,
        },
      });

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Watermarked_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Watermark export failed:", err);
      alert("Watermark export failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shadow-lg mx-auto">
            <Droplets className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Watermark to PDF</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Apply diagonal, centered, or tiled text or corporate logo watermarks with opacity and page range controls.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-blue-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF Document</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Permanent Vector Embedding &bull; High Resolution &bull; 100% Client-Side</span>
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

        <Button 
          size="sm" 
          onClick={handleExport}
          disabled={isProcessing}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Apply Watermark & Download
        </Button>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Controls */}
        <div className="w-80 border-r bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Type Toggle: Text vs Image */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border">
            <button
              onClick={() => setWatermarkType('text')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                watermarkType === 'text' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
            >
              <Type className="w-3.5 h-3.5" /> Text
            </button>
            <button
              onClick={() => setWatermarkType('image')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                watermarkType === 'image' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Image / Logo
            </button>
          </div>

          {watermarkType === 'text' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Watermark Text</label>
                <Input 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  className="h-8 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Typography Font</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as any)}
                  className="w-full h-8 text-xs border rounded-xl px-2 bg-background font-sans"
                >
                  <option value="Helvetica">Helvetica (Standard Clean)</option>
                  <option value="TimesRoman">Times New Roman (Serif Formal)</option>
                  <option value="Courier">Courier (Monospace Code)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Color</span>
                  <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)}
                    className="w-5 h-5 rounded-full border p-0 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {['#94a3b8', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#0f172a'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full border ${color === c ? 'scale-110 border-primary' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground font-semibold">Font Size</span>
                  <span className="font-mono">{fontSize}px</span>
                </div>
                <input 
                  type="range" 
                  min={18} 
                  max={72} 
                  value={fontSize} 
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input 
                type="file" 
                accept="image/png,image/jpeg" 
                ref={imageInputRef} 
                className="hidden" 
                onChange={handleImageUpload}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full rounded-xl text-xs gap-1.5"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                {imageDataUrl ? "Change Logo Image" : "Upload Logo Image"}
              </Button>

              {imageDataUrl && (
                <div className="p-2 border rounded-xl bg-muted/20 flex items-center justify-center aspect-video max-h-32">
                  <img src={imageDataUrl} alt="Logo" className="max-h-full object-contain" />
                </div>
              )}
            </div>
          )}

          {/* Placement Layout */}
          <div className="pt-2 border-t space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              Layout Position
            </label>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {(['diagonal', 'center', 'tiled', 'top-left', 'top-right', 'bottom-right'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`p-1.5 rounded-lg border text-center capitalize transition-all ${
                    layout === l ? 'bg-blue-500/10 border-blue-600 font-bold text-blue-700 dark:text-blue-400' : 'bg-muted/20'
                  }`}
                >
                  {l.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="pt-2 border-t space-y-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground font-semibold">Opacity</span>
              <span className="font-mono">{Math.round(opacity * 100)}%</span>
            </div>
            <input 
              type="range" 
              min={10} 
              max={90} 
              value={Math.round(opacity * 100)} 
              onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Page Targets */}
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
                    targetPages === t ? 'bg-blue-500/10 border-blue-600 font-bold text-blue-700 dark:text-blue-400' : 'bg-muted/20'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'current' ? `Page ${currentPage}` : 'Range'}
                </button>
              ))}
            </div>

            {targetPages === 'range' && (
              <Input 
                value={pageRange} 
                onChange={(e) => setPageRange(e.target.value)} 
                placeholder="e.g. 1-3, 5" 
                className="h-8 text-xs font-mono"
              />
            )}
          </div>
        </div>

        {/* Center Canvas Preview */}
        <div className="flex-1 bg-muted/10 overflow-auto p-6 flex flex-col items-center justify-center">
          <div 
            className="relative shadow-xl border bg-white rounded-sm select-none"
            style={{ width: pageDimensions.width, height: pageDimensions.height }}
          >
            <canvas ref={canvasRef} className="block" />

            {/* Visual Live Watermark Preview on Page */}
            {watermarkType === 'text' ? (
              layout === 'tiled' ? (
                <div className="absolute inset-0 overflow-hidden pointer-events-none grid grid-cols-2 grid-rows-3 gap-8 p-6 items-center justify-items-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div 
                      key={i}
                      className="font-bold whitespace-nowrap transform rotate-[-30deg]"
                      style={{ color, opacity: opacity * 0.75, fontSize: `${fontSize * 0.65}px`, fontFamily }}
                    >
                      {text || 'WATERMARK'}
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className={`absolute pointer-events-none font-bold whitespace-nowrap ${
                    layout === 'diagonal' 
                      ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg]'
                      : layout === 'center'
                      ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                      : layout === 'top-left'
                      ? 'top-12 left-12'
                      : layout === 'top-right'
                      ? 'top-12 right-12'
                      : 'bottom-12 right-12'
                  }`}
                  style={{ color, opacity, fontSize: `${fontSize}px`, fontFamily }}
                >
                  {text || 'WATERMARK'}
                </div>
              )
            ) : (
              imageDataUrl && (
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ opacity, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
                >
                  <img src={imageDataUrl} alt="Watermark" className="w-56 object-contain" />
                </div>
              )
            )}
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
