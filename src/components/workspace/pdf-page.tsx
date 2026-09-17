"use client";

import { useEffect, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdf-init";
import { useWorkspaceStore, Annotation } from "@/store/workspace";
import { Trash2, X } from "lucide-react";

interface PDFPageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number; // 1-based
  scale: number;
}

export default function PDFPage({ pdfDoc, pageNumber, scale }: PDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const renderTaskRef = useRef<any>(null);

  const { 
    activeTool, 
    annotations, 
    addAnnotation, 
    updateAnnotation,
    removeAnnotation,
    strokeColor, 
    strokeWidth, 
    fontSize,
    pageRotations,
    deletedPages,
    restorePage
  } = useWorkspaceStore();

  const pageIndex = pageNumber - 1;
  const isDeleted = deletedPages.includes(pageIndex);
  const rotation = pageRotations[pageIndex] || 0;
  const pageAnnotations = annotations.filter(a => a.pageIndex === pageIndex);

  // Drawing and Drag-Redact state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Annotation dragging state (for stamps, signatures, and images)
  const [draggingAnnotation, setDraggingAnnotation] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Measure page
  useEffect(() => {
    let isMounted = true;
    const measurePage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!isMounted) return;
        const viewport = page.getViewport({ scale });
        setDimensions({ width: viewport.width, height: viewport.height });
      } catch (err) {
        console.error("Error measuring page", pageNumber, err);
      }
    };
    measurePage();
    return () => { isMounted = false; };
  }, [pdfDoc, pageNumber, scale]);

  // Render the page with crisp High-DPI resolution
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0 || !canvasRef.current || isDeleted) return;
    
    let isMounted = true;
    
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!isMounted) return;
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext("2d");
        if (!context) return;
        
        // Render at device pixel ratio for razor-sharp vector clarity
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        
        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        } as any);
        
        await renderTaskRef.current.promise;
        if (isMounted) setIsRendered(true);
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException' && isMounted) {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };
    
    const timeoutId = setTimeout(renderPage, 50);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, [pdfDoc, pageNumber, scale, dimensions, isDeleted]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'hand' || activeTool === 'select' || isDeleted) return;
    if (!overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (activeTool === 'draw' || activeTool === 'highlight') {
      setIsDrawing(true);
      setCurrentPath(`M ${x} ${y}`);
      (e.target as Element).setPointerCapture(e.pointerId);
    } else if (activeTool === 'redact') {
      setDragStart({ x, y });
      setDragCurrent({ x, y });
      (e.target as Element).setPointerCapture(e.pointerId);
    } else if (activeTool === 'text') {
      const text = prompt("Enter text annotation:");
      if (text) {
        addAnnotation({
          id: Math.random().toString(36).substring(2, 9),
          pageIndex,
          type: 'text',
          x,
          y,
          color: strokeColor,
          data: text,
          fontSize: fontSize || 16,
        });
      }
    } else if (activeTool === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png, image/jpeg, image/webp';
      input.onchange = (ev) => {
        const file = (ev.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new window.Image();
            img.onload = () => {
              const imgWidth = Math.min(img.width, 220);
              const aspect = img.height / img.width;
              const imgHeight = imgWidth * aspect;
              addAnnotation({
                id: Math.random().toString(36).substring(2, 9),
                pageIndex,
                type: 'image',
                x,
                y,
                width: imgWidth,
                height: imgHeight,
                color: '',
                data: dataUrl,
              });
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (isDrawing) {
      setCurrentPath(prev => `${prev} L ${x} ${y}`);
    } else if (dragStart && activeTool === 'redact') {
      setDragCurrent({ x, y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDrawing) {
      setIsDrawing(false);
      (e.target as Element).releasePointerCapture(e.pointerId);

      if (currentPath.includes('L')) {
        addAnnotation({
          id: Math.random().toString(36).substring(2, 9),
          pageIndex,
          type: activeTool === 'draw' ? 'draw' : 'highlight',
          x: 0,
          y: 0,
          color: activeTool === 'highlight' ? strokeColor + '55' : strokeColor,
          data: currentPath,
          strokeWidth: activeTool === 'highlight' ? 18 : strokeWidth,
        });
      }
      setCurrentPath("");
    } else if (dragStart && dragCurrent && activeTool === 'redact') {
      (e.target as Element).releasePointerCapture(e.pointerId);
      const minX = Math.min(dragStart.x, dragCurrent.x);
      const minY = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragCurrent.x - dragStart.x);
      const height = Math.abs(dragCurrent.y - dragStart.y);

      if (width > 8 && height > 8) {
        addAnnotation({
          id: Math.random().toString(36).substring(2, 9),
          pageIndex,
          type: 'redact',
          x: minX,
          y: minY,
          width,
          height,
          color: '#000000',
          data: 'REDACTED',
        });
      }
      setDragStart(null);
      setDragCurrent(null);
    }
  };

  // Draggable stamps, signatures, and images handlers
  const handleAnnotationPointerDown = (e: React.PointerEvent, a: Annotation) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {}

    setDraggingAnnotation({
      id: a.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: a.x,
      initialY: a.y,
    });
  };

  const handleAnnotationPointerMove = (e: React.PointerEvent) => {
    if (!draggingAnnotation) return;
    e.stopPropagation();

    const dx = (e.clientX - draggingAnnotation.startX) / scale;
    const dy = (e.clientY - draggingAnnotation.startY) / scale;

    const newX = Math.round(draggingAnnotation.initialX + dx);
    const newY = Math.round(draggingAnnotation.initialY + dy);

    updateAnnotation(draggingAnnotation.id, { x: newX, y: newY });
  };

  const handleAnnotationPointerUp = (e: React.PointerEvent) => {
    if (!draggingAnnotation) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
    setDraggingAnnotation(null);
  };

  if (isDeleted) {
    return (
      <div 
        className="bg-muted/40 border-2 border-dashed border-destructive/30 rounded-xl flex flex-col items-center justify-center text-muted-foreground my-4 p-8"
        style={{ width: dimensions.width || (800 * scale), height: 180 }}
      >
        <Trash2 className="w-8 h-8 text-destructive/50 mb-2" />
        <p className="text-sm font-medium">Page {pageNumber} has been removed</p>
        <button 
          onClick={() => restorePage(pageIndex)}
          className="mt-2 text-xs text-primary font-semibold hover:underline"
        >
          Restore Page {pageNumber}
        </button>
      </div>
    );
  }

  const isRotated90or270 = rotation === 90 || rotation === 270;
  const containerWidth = isRotated90or270 ? (dimensions.height || 1130 * scale) : (dimensions.width || 800 * scale);
  const containerHeight = isRotated90or270 ? (dimensions.width || 800 * scale) : (dimensions.height || 1130 * scale);

  return (
    <div 
      className="bg-white shadow-xl shadow-slate-900/10 dark:shadow-black/40 border border-border/40 relative mx-auto my-6 transition-all duration-200 select-none group rounded-xs"
      style={{ 
        width: containerWidth, 
        height: containerHeight,
        opacity: isRendered ? 1 : 0.6 
      }}
    >
      <div 
        className="w-full h-full relative"
        style={{
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
          width: dimensions.width || 800 * scale,
          height: dimensions.height || 1130 * scale,
          position: isRotated90or270 ? 'absolute' : 'relative',
          top: isRotated90or270 ? '50%' : undefined,
          left: isRotated90or270 ? '50%' : undefined,
          transform: isRotated90or270 
            ? `translate(-50%, -50%) rotate(${rotation}deg)` 
            : (rotation ? `rotate(${rotation}deg)` : undefined),
        }}
      >
        <canvas ref={canvasRef} className="block absolute inset-0 pointer-events-none" />
        
        {/* Annotation & Interaction Overlay */}
        <div 
          ref={overlayRef}
          className="absolute inset-0 z-10"
          style={{ 
            cursor: activeTool === 'hand' 
              ? 'grab' 
              : activeTool === 'text' 
              ? 'text' 
              : activeTool === 'draw' || activeTool === 'highlight' || activeTool === 'redact' 
              ? 'crosshair' 
              : 'default' 
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* SVG Vector Paths (Drawings & Highlights) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
            {pageAnnotations.filter(a => a.type === 'draw' || a.type === 'highlight').map(a => (
              <path
                key={a.id}
                d={a.data}
                stroke={a.color}
                strokeWidth={a.strokeWidth || 3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={a.type === 'highlight' ? 'mix-blend-multiply' : ''}
              />
            ))}
            {isDrawing && currentPath && (
              <path
                d={currentPath}
                stroke={activeTool === 'highlight' ? strokeColor + '55' : strokeColor}
                strokeWidth={activeTool === 'highlight' ? 18 : strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={activeTool === 'highlight' ? 'mix-blend-multiply' : ''}
              />
            )}
          </svg>

          {/* Text Annotations */}
          {pageAnnotations.filter(a => a.type === 'text').map(a => (
            <div
              key={a.id}
              className="absolute font-sans whitespace-nowrap group/text cursor-pointer hover:ring-2 hover:ring-primary/60 rounded px-1"
              style={{
                left: a.x * scale,
                top: a.y * scale,
                color: a.color,
                fontSize: `${(a.fontSize || 16) * scale}px`,
                transform: 'translateY(-100%)',
              }}
              onClick={() => {
                if (confirm(`Delete this text annotation: "${a.data}"?`)) {
                  removeAnnotation(a.id);
                }
              }}
            >
              {a.data}
            </div>
          ))}
          
          {/* Images, Signatures, and Stamps (Draggable) */}
          {pageAnnotations.filter(a => a.type === 'image').map(a => {
            const isDraggingThis = draggingAnnotation?.id === a.id;
            return (
              <div
                key={a.id}
                className={`absolute group/item cursor-grab active:cursor-grabbing rounded transition-shadow ${
                  isDraggingThis 
                    ? 'opacity-90 ring-2 ring-indigo-500 shadow-xl z-30' 
                    : 'hover:ring-2 hover:ring-indigo-400 hover:shadow-md z-20'
                }`}
                style={{
                  left: a.x * scale,
                  top: a.y * scale,
                  width: (a.width || 150) * scale,
                  height: (a.height || 60) * scale,
                  touchAction: 'none',
                  userSelect: 'none',
                }}
                onPointerDown={(e) => handleAnnotationPointerDown(e, a)}
                onPointerMove={handleAnnotationPointerMove}
                onPointerUp={handleAnnotationPointerUp}
                onPointerCancel={handleAnnotationPointerUp}
                title="Click and drag to reposition"
              >
                <img
                  src={a.data}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  alt="Stamp or Signature"
                  draggable={false}
                />

                {/* Quick Corner Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAnnotation(a.id);
                  }}
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow-md opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer z-40"
                  title="Remove"
                  aria-label="Remove"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Drag hint badge on hover */}
                <div className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900/90 text-white text-[9px] font-sans font-medium whitespace-nowrap opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none shadow-xs">
                  Drag to move
                </div>
              </div>
            );
          })}

          {/* Redaction Blocks */}
          {pageAnnotations.filter(a => a.type === 'redact').map(a => (
            <div
              key={a.id}
              className="absolute bg-black text-white/50 text-[9px] font-mono flex items-center justify-center hover:ring-2 hover:ring-red-500 cursor-pointer"
              style={{
                left: a.x * scale,
                top: a.y * scale,
                width: (a.width || 40) * scale,
                height: (a.height || 20) * scale,
              }}
              onClick={() => {
                if (confirm("Remove this redaction box?")) {
                  removeAnnotation(a.id);
                }
              }}
              title="Click to remove redaction"
            >
              {a.data}
            </div>
          ))}

          {/* Live Dragging Redaction Rectangle */}
          {dragStart && dragCurrent && activeTool === 'redact' && (
            <div
              className="absolute bg-black/80 border border-red-500 pointer-events-none"
              style={{
                left: Math.min(dragStart.x, dragCurrent.x) * scale,
                top: Math.min(dragStart.y, dragCurrent.y) * scale,
                width: Math.abs(dragCurrent.x - dragStart.x) * scale,
                height: Math.abs(dragCurrent.y - dragStart.y) * scale,
              }}
            />
          )}
        </div>
      </div>

      {!isRendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
