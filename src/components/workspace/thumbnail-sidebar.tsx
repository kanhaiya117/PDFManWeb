"use client";

import { useEffect, useRef } from "react";
import { pdfjsLib } from "@/lib/pdf-init";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useWorkspaceStore } from "@/store/workspace";
import { RotateCw, RotateCcw, Trash2, Undo2, ArrowUp, ArrowDown, X } from "lucide-react";

interface ThumbnailSidebarProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  numPages: number;
  currentPage: number;
  onPageSelect: (pageIndex: number) => void;
}

export default function ThumbnailSidebar({ 
  pdfDoc, 
  numPages, 
  currentPage,
  onPageSelect 
}: ThumbnailSidebarProps) {
  const { 
    leftSidebarOpen, 
    toggleLeftSidebar,
    pageRotations, 
    rotatePage, 
    deletedPages, 
    deletePage, 
    restorePage, 
    pageOrder,
    movePage
  } = useWorkspaceStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const displayPages = pageOrder.length === numPages 
    ? pageOrder 
    : Array.from({ length: numPages }, (_, i) => i);

  const rowVirtualizer = useVirtualizer({
    count: displayPages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 195,
    overscan: 3,
  });

  useEffect(() => {
    if (leftSidebarOpen && currentPage >= 1 && currentPage <= numPages) {
      const idx = displayPages.indexOf(currentPage - 1);
      if (idx !== -1) {
        rowVirtualizer.scrollToIndex(idx, { align: 'auto' });
      }
    }
  }, [currentPage, leftSidebarOpen, numPages, rowVirtualizer, displayPages]);

  if (!leftSidebarOpen) return null;

  const handlePageSelectWithMobileClose = (pageIndex: number) => {
    onPageSelect(pageIndex);
    // On mobile screens, automatically close thumbnail drawer after page selection
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      toggleLeftSidebar();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
        onClick={() => toggleLeftSidebar()}
      />

      {/* Responsive Drawer Container */}
      <div className="fixed md:static inset-y-0 left-0 z-40 md:z-10 w-72 md:w-64 max-w-[85vw] md:max-w-none border-r bg-background md:bg-muted/20 flex flex-col shrink-0 h-full overflow-hidden shadow-2xl md:shadow-sm animate-in slide-in-from-left md:animate-none duration-200">
        <div className="p-3 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between shrink-0 bg-muted/10">
          <div className="flex items-center gap-2">
            <span>Pages ({numPages - deletedPages.length}/{numPages})</span>
            {deletedPages.length > 0 && (
              <span className="text-[10px] text-destructive lowercase font-mono">
                {deletedPages.length} removed
              </span>
            )}
          </div>
          <button
            onClick={() => toggleLeftSidebar()}
            className="w-7 h-7 flex md:hidden items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close thumbnails"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div 
          ref={parentRef}
          className="flex-1 overflow-y-auto p-3 relative space-y-3"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const listIndex = virtualRow.index;
              const originalPageIndex = displayPages[listIndex];
              const isCurrent = currentPage === originalPageIndex + 1;
              const rotation = pageRotations[originalPageIndex] || 0;
              const isDeleted = deletedPages.includes(originalPageIndex);

              return (
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
                  <ThumbnailItem
                    pdfDoc={pdfDoc}
                    pageIndex={originalPageIndex}
                    displayNumber={listIndex + 1}
                    isActive={isCurrent}
                    rotation={rotation}
                    isDeleted={isDeleted}
                    canMoveUp={listIndex > 0}
                    canMoveDown={listIndex < displayPages.length - 1}
                    onMoveUp={() => movePage(listIndex, listIndex - 1)}
                    onMoveDown={() => movePage(listIndex, listIndex + 1)}
                    onClick={() => handlePageSelectWithMobileClose(originalPageIndex)}
                    onRotateRight={() => rotatePage(originalPageIndex, 90)}
                    onRotateLeft={() => rotatePage(originalPageIndex, -90)}
                    onDelete={() => deletePage(originalPageIndex)}
                    onRestore={() => restorePage(originalPageIndex)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function ThumbnailItem({ 
  pdfDoc, 
  pageIndex, 
  displayNumber,
  isActive, 
  rotation, 
  isDeleted,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onClick, 
  onRotateRight, 
  onRotateLeft, 
  onDelete, 
  onRestore 
}: { 
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageIndex: number;
  displayNumber: number;
  isActive: boolean;
  rotation: number;
  isDeleted: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClick: () => void;
  onRotateRight: () => void;
  onRotateLeft: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pageNumber = pageIndex + 1;

  useEffect(() => {
    let isMounted = true;
    
    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!isMounted) return;
        
        const viewport = page.getViewport({ scale: 0.18 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext("2d");
        if (!context) return;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        
        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: viewport,
        } as any);
        
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          // ignore
        }
      }
    };
    
    const timer = setTimeout(renderThumbnail, 80);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div 
      className={`flex flex-col items-center p-1.5 rounded-lg transition-all group relative w-[140px] ${
        isDeleted 
          ? 'opacity-40 bg-destructive/5 border border-dashed border-destructive/30' 
          : isActive 
          ? 'bg-primary/10 shadow-sm border-primary border-2' 
          : 'hover:bg-accent/60 border border-transparent'
      }`}
    >
      <div 
        className="bg-white shadow-sm rounded border w-[110px] h-[140px] flex items-center justify-center cursor-pointer overflow-hidden relative"
        onClick={isDeleted ? onRestore : onClick}
      >
        <div 
          className="transition-transform duration-200"
          style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
        >
          <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
        </div>

        {/* Hover Action Controls */}
        {!isDeleted && (
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
            <div className="flex items-center gap-1">
              <button 
                className="p-1 bg-white/90 text-slate-800 rounded hover:bg-white hover:scale-110 transition-transform shadow disabled:opacity-30"
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                disabled={!canMoveUp}
                title="Move Page Up"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button 
                className="p-1 bg-white/90 text-slate-800 rounded hover:bg-white hover:scale-110 transition-transform shadow disabled:opacity-30"
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                disabled={!canMoveDown}
                title="Move Page Down"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button 
                className="p-1 bg-white/90 text-slate-800 rounded hover:bg-white hover:scale-110 transition-transform shadow"
                onClick={(e) => { e.stopPropagation(); onRotateLeft(); }}
                title="Rotate Left 90°"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button 
                className="p-1 bg-white/90 text-slate-800 rounded hover:bg-white hover:scale-110 transition-transform shadow"
                onClick={(e) => { e.stopPropagation(); onRotateRight(); }}
                title="Rotate Right 90°"
              >
                <RotateCw className="w-3 h-3" />
              </button>
              <button 
                className="p-1 bg-destructive text-destructive-foreground rounded hover:opacity-90 hover:scale-110 transition-transform shadow"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete Page"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {isDeleted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive text-[11px] font-semibold">
            <span>Deleted</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              className="mt-1 flex items-center gap-1 text-[10px] bg-background px-1.5 py-0.5 rounded shadow text-foreground"
            >
              <Undo2 className="w-3 h-3" /> Restore
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground font-mono">
        <span>{displayNumber}</span>
        {rotation > 0 && <span className="text-[10px] text-primary">({rotation}°)</span>}
      </div>
    </div>
  );
}
