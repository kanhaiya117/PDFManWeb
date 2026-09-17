"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  LayoutGrid, 
  Upload, 
  Shield, 
  Play, 
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

export function PresentationWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [zoomMode, setZoomMode] = useState<'fit' | 'actual' | 'custom'>('fit');
  const [customScale, setCustomScale] = useState(1.0);
  const [showThumbnailsModal, setShowThumbnailsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const router = useRouter();

  // Load PDF Document
  useEffect(() => {
    if (!file) return;
    let isMounted = true;
    setIsLoading(true);

    const load = async () => {
      try {
        const fileUrl = URL.createObjectURL(file);
        const task = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        });
        const doc = await task.promise;
        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load PDF for presentation:", err);
        setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render current slide
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const availableWidth = container.clientWidth - 32;
      const availableHeight = container.clientHeight - 32;

      let scale = customScale;
      if (zoomMode === 'fit') {
        const scaleX = availableWidth / unscaledViewport.width;
        const scaleY = availableHeight / unscaledViewport.height;
        scale = Math.min(scaleX, scaleY, 2.5);
      } else if (zoomMode === 'actual') {
        scale = 1.0;
      }

      const viewport = page.getViewport({ scale });
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
      console.error("Slide render failed:", err);
    }
  }, [pdfDoc, currentPage, zoomMode, customScale]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Window resize re-rendering
  useEffect(() => {
    const handleResize = () => {
      if (zoomMode === 'fit') {
        renderCurrentPage();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [zoomMode, renderCurrentPage]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPrev = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Keyboard navigation & Fullscreen API
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        if (isFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === "Home") {
        setCurrentPage(1);
      } else if (e.key === "End") {
        setCurrentPage(totalPages);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, isFullscreen, totalPages]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  };

  // Touch navigation for mobile / tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setControlsVisible(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) goToNext();
      else goToPrev();
    }
    touchStartRef.current = null;
  };

  // Empty state dropzone
  if (!file) {
    return (
      <div 
        className={`flex-1 flex flex-col items-center justify-center p-6 md:p-12 transition-colors ${
          isDragging ? 'bg-indigo-500/5' : 'bg-muted/10'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
        }}
      >
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <Play className="w-8 h-8 ml-0.5 fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Presentation Mode</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Distraction-free, razor-sharp fullscreen display for pitch decks, slides, briefs, and meetings.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-indigo-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF Presentation</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your slides here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Zero cloud upload &bull; Rendered 100% locally with high-DPI clarity</span>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-white overflow-hidden select-none"
    >
      {/* Top Floating Bar */}
      <div 
        className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 rounded-xl text-xs gap-1.5"
            onClick={() => router.push("/workspace")}
          >
            <ArrowLeft className="w-4 h-4" /> Exit to Workspace
          </Button>
          <span className="text-xs font-semibold text-white/80 hidden sm:inline truncate max-w-xs">
            {file.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 rounded-xl text-xs gap-1"
            onClick={() => setShowThumbnailsModal(true)}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 rounded-xl h-8 w-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (F11)"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Slide Presentation Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-4">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-white/70">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Preparing slide...</span>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className="shadow-2xl rounded-sm max-w-full max-h-full object-contain bg-white transition-transform duration-100" 
        />

        {/* Mouse Click Hit Areas for fast clicking left/right */}
        <div 
          onClick={goToPrev} 
          className="absolute inset-y-0 left-0 w-1/5 cursor-w-resize z-10" 
          title="Previous slide (Left Arrow)"
        />
        <div 
          onClick={goToNext} 
          className="absolute inset-y-0 right-0 w-1/5 cursor-e-resize z-10" 
          title="Next slide (Right Arrow / Space)"
        />
      </div>

      {/* Bottom Floating Controls Bar */}
      <div 
        className={`absolute bottom-5 z-30 flex flex-col items-center gap-2 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 px-3 shadow-2xl">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white hover:bg-white/10 rounded-xl disabled:opacity-30" 
            onClick={goToPrev}
            disabled={currentPage <= 1}
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="px-3 text-xs font-mono font-medium text-white/90">
            <span className="text-white font-bold">{currentPage}</span> / {totalPages}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white hover:bg-white/10 rounded-xl disabled:opacity-30" 
            onClick={goToNext}
            disabled={currentPage >= totalPages}
            title="Next (Right Arrow / Space)"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          <div className="w-px h-5 bg-white/20 mx-1" />

          {/* Zoom controls */}
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 px-2.5 text-xs text-white rounded-xl ${zoomMode === 'fit' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            onClick={() => { setZoomMode('fit'); renderCurrentPage(); }}
          >
            Fit
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white hover:bg-white/10 rounded-xl"
            onClick={() => {
              setZoomMode('custom');
              setCustomScale(prev => Math.min(3.0, prev + 0.15));
            }}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white hover:bg-white/10 rounded-xl"
            onClick={() => {
              setZoomMode('custom');
              setCustomScale(prev => Math.max(0.4, prev - 0.15));
            }}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottom Progress Bar Indicator */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-20">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Slide Overview Modal */}
      {showThumbnailsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 max-w-5xl mx-auto w-full">
            <h3 className="font-bold text-base text-white">Slide Overview ({totalPages} pages)</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10"
              onClick={() => setShowThumbnailsModal(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 max-w-5xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                onClick={() => {
                  setCurrentPage(pNum);
                  setShowThumbnailsModal(false);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentPage === pNum 
                    ? 'border-indigo-500 bg-indigo-500/20 text-white' 
                    : 'border-white/10 bg-white/5 hover:border-white/30 text-white/80'
                }`}
              >
                <div className="aspect-[4/3] bg-white/10 rounded-lg flex items-center justify-center font-bold text-lg mb-2">
                  {pNum}
                </div>
                <div className="text-xs font-semibold">Page {pNum}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
