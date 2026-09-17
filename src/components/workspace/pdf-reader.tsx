"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { pdfjsLib } from "@/lib/pdf-init";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, X, Search, RotateCw, Undo2, Redo2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace";
import PDFPage from "./pdf-page";
import ThumbnailSidebar from "./thumbnail-sidebar";
import { ToolsPanel } from "./tools-panel";
import { SearchPanel } from "./search-panel";
import { SignatureDialog } from "./signature-dialog";
import { StampPicker } from "./stamp-picker";

export default function PDFReader() {
  const { 
    file, 
    setFile, 
    scale, 
    setScale, 
    currentPage, 
    setCurrentPage, 
    numPages, 
    setNumPages,
    rotatePage,
    undo,
    redo,
    undoStack,
    redoStack,
    pageOrder
  } = useWorkspaceStore();

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const [currentPageInput, setCurrentPageInput] = useState("1");
  const router = useRouter();

  const loadPdf = useCallback(async (password?: string) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setPasswordError(false);

    try {
      const fileUrl = URL.createObjectURL(file);
      const loadingTask = pdfjsLib.getDocument({
        url: fileUrl,
        cMapUrl: `/cmaps/`,
        cMapPacked: true,
        password: password || undefined,
      });

      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);

      // Auto-fit initial scale for crisp, clean document presentation on open
      if (typeof window !== 'undefined' && parentRef.current) {
        try {
          const firstPage = await pdf.getPage(1);
          const defaultViewport = firstPage.getViewport({ scale: 1.0 });
          const containerWidth = parentRef.current.clientWidth - 48;
          if (containerWidth > 0 && defaultViewport.width > 0) {
            const fitScale = Math.min(1.3, Math.max(0.65, Number((containerWidth / defaultViewport.width).toFixed(2))));
            setScale(fitScale);
          }
        } catch (e) {}
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      if (err.name === "PasswordException") {
        setError("This PDF is password protected.");
        setPasswordError(true);
      } else {
        setError("This PDF appears to be damaged or incomplete.");
      }
      setIsLoading(false);
    }
  }, [file, setNumPages, setScale]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  const displayPages = pageOrder.length === numPages
    ? pageOrder
    : Array.from({ length: numPages }, (_, i) => i);

  const rowVirtualizer = useVirtualizer({
    count: displayPages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 1130 * scale + 40,
    overscan: 2,
  });

  // Ctrl+F keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync scroll position with current page
  useEffect(() => {
    if (!rowVirtualizer.getVirtualItems().length) return;
    const centerItem = rowVirtualizer.getVirtualItems().find(item => {
      const parentRect = parentRef.current?.getBoundingClientRect();
      if (!parentRect) return false;
      const scrollOffset = parentRef.current?.scrollTop || 0;
      const itemCenter = item.start + item.size / 2;
      const viewportCenter = scrollOffset + parentRect.height / 2;
      return Math.abs(itemCenter - viewportCenter) < item.size / 2;
    });

    if (centerItem) {
      const page = centerItem.index + 1;
      setCurrentPage(page);
      setCurrentPageInput(page.toString());
    }
  }, [rowVirtualizer.getVirtualItems(), setCurrentPage]);

  const scrollToPage = useCallback((pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < numPages) {
      rowVirtualizer.scrollToIndex(pageIndex, { align: 'start' });
      setCurrentPage(pageIndex + 1);
      setCurrentPageInput((pageIndex + 1).toString());
    }
  }, [numPages, rowVirtualizer, setCurrentPage]);

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    if ('key' in e && e.key !== 'Enter') return;
    const val = parseInt(currentPageInput);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      scrollToPage(val - 1);
    } else {
      setCurrentPageInput(currentPage.toString());
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/15">
      {/* Workspace Secondary Navigation & Status Bar */}
      <div className="h-11 border-b bg-background/80 backdrop-blur flex items-center justify-between px-2 sm:px-4 shrink-0 shadow-xs z-10 gap-1 sm:gap-2">
        {/* Document Info */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
          <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-7 px-1.5 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden xs:inline">Close</span>
          </Button>
          <div className="h-4 w-[1px] bg-border shrink-0"></div>
          <span className="text-xs font-semibold truncate max-w-[70px] xs:max-w-[110px] sm:max-w-[200px] md:max-w-[320px]">
            {file?.name || "Untitled Document.pdf"}
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono shrink-0 hidden sm:inline-block">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
          </span>
        </div>

        {/* Central Controls: Page nav & History */}
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={undo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={redo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-4 w-[1px] bg-border hidden xs:block"></div>

          {/* Page Counter & Jump */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => scrollToPage(currentPage - 2)}
              disabled={currentPage <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs flex items-center">
              <input 
                type="text" 
                value={currentPageInput}
                onChange={(e) => setCurrentPageInput(e.target.value)}
                onKeyDown={handlePageInputSubmit}
                onBlur={handlePageInputSubmit}
                className="w-8 sm:w-10 text-center bg-background border rounded h-7 text-xs font-mono"
              />
              <span className="text-muted-foreground ml-1">/ {numPages || '-'}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => scrollToPage(currentPage)}
              disabled={currentPage >= numPages}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-4 w-[1px] bg-border hidden sm:block"></div>

          {/* Quick Page Rotate */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hidden sm:flex"
            onClick={() => rotatePage(currentPage - 1, 90)}
            title="Rotate Current Page (90°)"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>

          {/* In-PDF Search Trigger */}
          <Button 
            variant={isSearchOpen ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-7 w-7 hidden sm:flex"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Find Text in PDF (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>

          {/* Fullscreen Presentation Mode Trigger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hidden sm:flex text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            onClick={() => router.push("/workspace?tool=presentation-mode")}
            title="Launch Fullscreen Presentation Mode"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setScale(s => Math.max(0.4, Number((s - 0.2).toFixed(2))))}
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono w-9 sm:w-11 text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setScale(s => Math.min(3.5, Number((s + 0.2).toFixed(2))))}
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hidden md:flex"
            onClick={() => setScale(1.0)} 
            title="Actual Size (100%)"
          >
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Viewer Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnails Sidebar */}
        {pdfDoc && numPages > 0 && (
          <ThumbnailSidebar 
            pdfDoc={pdfDoc}
            numPages={numPages}
            currentPage={currentPage}
            onPageSelect={(index) => scrollToPage(index)}
          />
        )}

        {/* In-Document Search Panel */}
        {isSearchOpen && pdfDoc && (
          <SearchPanel
            pdfDoc={pdfDoc}
            numPages={numPages}
            onJumpToPage={(idx) => scrollToPage(idx)}
            onClose={() => setIsSearchOpen(false)}
          />
        )}

        {/* Center Virtualized PDF Canvas View */}
        <div 
          ref={parentRef}
          className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950/80 relative transition-colors"
        >
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-xs z-30">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-primary border-t-transparent mb-3"></div>
              <p className="text-sm font-medium">Preparing document & pages...</p>
              <p className="text-xs text-muted-foreground mt-1">Processing 100% locally in-browser</p>
            </div>
          )}
          
          {error ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-8 bg-background rounded-xl border shadow-md my-auto mt-20">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {passwordError ? "Password Protected Document" : "Could not open PDF"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {error}
              </p>
              {passwordError ? (
                <div className="w-full flex gap-2">
                  <input 
                    type="password" 
                    placeholder="Enter document password..." 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadPdf(passwordInput)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  />
                  <Button onClick={() => loadPdf(passwordInput)}>Unlock</Button>
                </div>
              ) : (
                <Button onClick={() => setFile(null)}>Choose another file</Button>
              )}
            </div>
          ) : pdfDoc && numPages > 0 ? (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <PDFPage 
                    pdfDoc={pdfDoc}
                    pageNumber={displayPages[virtualRow.index] + 1}
                    scale={scale}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        
        {/* Right Acrobat-style Toolbox Panel */}
        <ToolsPanel />
      </div>

      {/* Signature & Stamp Dialogs */}
      <SignatureDialog />
      <StampPicker />
    </div>
  );
}
