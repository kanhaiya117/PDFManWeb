"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { PageSequenceItem, reorganizePdfPages, parsePageRange } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Grid, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Plus, 
  Download, 
  Upload, 
  Undo2, 
  Redo2, 
  CheckSquare, 
  Square, 
  Split, 
  FilePlus, 
  Loader2,
  Shield,
  ArrowLeft,
  ArrowRight,
  GripVertical
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PageCard extends PageSequenceItem {
  id: string;
  sourceDocIndex: number;
  originalPageNumber: number;
  thumbnailUrl?: string;
}

export function OrganizeWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [sourceBuffers, setSourceBuffers] = useState<ArrayBuffer[]>([]);
  const [pages, setPages] = useState<PageCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<PageCard[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [rangeInput, setRangeInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Initialize with the current file if available
  useEffect(() => {
    if (file && sourceFiles.length === 0) {
      loadNewSourceFiles([file]);
    }
  }, [file]);

  // Load new source PDF files and render thumbnails
  const loadNewSourceFiles = async (newFiles: File[]) => {
    const updatedSourceFiles = [...sourceFiles, ...newFiles];
    setSourceFiles(updatedSourceFiles);

    const newBuffers: ArrayBuffer[] = [];
    const newPageCards: PageCard[] = [];

    let currentDocIdx = sourceFiles.length;

    for (const f of newFiles) {
      try {
        const buffer = await f.arrayBuffer();
        newBuffers.push(buffer);

        const task = pdfjsLib.getDocument({
          data: buffer,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        });
        const doc = await task.promise;

        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          }

          newPageCards.push({
            id: `p_${currentDocIdx}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            sourceFileIndex: currentDocIdx,
            sourceDocIndex: currentDocIdx,
            sourcePageIndex: p - 1,
            originalPageNumber: p,
            rotation: 0,
            sourceFileName: f.name,
            thumbnailUrl: canvas.toDataURL("image/jpeg", 0.8),
          });
        }
        currentDocIdx++;
      } catch (err) {
        console.error("Error loading PDF for organization:", err);
      }
    }

    setSourceBuffers(prev => [...prev, ...newBuffers]);
    const updatedPages = [...pages, ...newPageCards];
    setPages(updatedPages);
    pushHistory(updatedPages);
  };

  // History tracking (Undo / Redo)
  const pushHistory = (newPages: PageCard[]) => {
    const sliced = history.slice(0, historyIndex + 1);
    const nextHist = [...sliced, newPages];
    setHistory(nextHist);
    setHistoryIndex(nextHist.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setPages(history[prevIdx]);
      setSelectedIds(new Set());
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setPages(history[nextIdx]);
      setSelectedIds(new Set());
    }
  };

  // Reordering via Drag and Drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, moved);
    setDraggedIndex(targetIndex);
    setPages(newPages);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      setDraggedIndex(null);
      pushHistory(pages);
    }
  };

  // Selection handlers
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pages.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const applyRangeSelection = () => {
    const indices = parsePageRange(rangeInput, pages.length);
    const newSelected = new Set<string>();
    indices.forEach(idx => {
      if (pages[idx]) newSelected.add(pages[idx].id);
    });
    setSelectedIds(newSelected);
  };

  // Batch actions
  const rotateSelected = (deltaDegrees: number) => {
    if (selectedIds.size === 0) return;
    const next = pages.map(p => {
      if (selectedIds.has(p.id)) {
        return { ...p, rotation: (p.rotation + deltaDegrees + 360) % 360 };
      }
      return p;
    });
    setPages(next);
    pushHistory(next);
  };

  const duplicateSelected = () => {
    if (selectedIds.size === 0) return;
    const next: PageCard[] = [];
    pages.forEach(p => {
      next.push(p);
      if (selectedIds.has(p.id)) {
        next.push({
          ...p,
          id: `p_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        });
      }
    });
    setPages(next);
    pushHistory(next);
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0 || pages.length <= selectedIds.size) {
      alert("At least one page must remain in the document.");
      return;
    }
    const next = pages.filter(p => !selectedIds.has(p.id));
    setPages(next);
    setSelectedIds(new Set());
    pushHistory(next);
  };

  // Individual Card Actions
  const rotateCard = (id: string, delta: number) => {
    const next = pages.map(p => p.id === id ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p);
    setPages(next);
    pushHistory(next);
  };

  const deleteCard = (id: string) => {
    if (pages.length <= 1) {
      alert("Cannot delete the only page remaining.");
      return;
    }
    const next = pages.filter(p => p.id !== id);
    setPages(next);
    pushHistory(next);
  };

  // Export reorganized PDF
  const handleExport = async () => {
    if (pages.length === 0 || sourceBuffers.length === 0) return;
    setIsExporting(true);

    try {
      const outputBlob = await reorganizePdfPages({
        sources: sourceBuffers,
        sequence: pages.map(p => ({
          sourceFileIndex: p.sourceFileIndex,
          sourcePageIndex: p.sourcePageIndex,
          rotation: p.rotation,
        })),
      });

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Organized_${sourceFiles[0]?.name || "Document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Failed to export organized PDF:", err);
      alert("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Empty state dropzone
  if (pages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <Grid className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organize PDF Pages</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Visual page manager: drag to reorder, duplicate, rotate, delete, or merge pages from multiple PDF files.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-blue-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              multiple
              accept="application/pdf,.pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) loadNewSourceFiles(Array.from(e.target.files));
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF Documents</span>
            <span className="text-xs text-muted-foreground block mt-1">Select one or multiple PDF files to organize together</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Multi-File Support &bull; Zero Server Upload &bull; Instant Local Assembly</span>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Undo / Redo */}
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            disabled={historyIndex >= history.length - 1} 
            onClick={handleRedo}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Add more PDFs button */}
          <input 
            type="file" 
            multiple 
            accept="application/pdf,.pdf" 
            className="hidden" 
            ref={addMoreInputRef}
            onChange={(e) => {
              if (e.target.files) loadNewSourceFiles(Array.from(e.target.files));
            }}
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl text-xs gap-1.5"
            onClick={() => addMoreInputRef.current?.click()}
          >
            <Plus className="w-3.5 h-3.5" /> Add More Files
          </Button>

          <span className="text-xs text-muted-foreground ml-2 font-mono">
            {pages.length} Pages total ({sourceFiles.length} {sourceFiles.length === 1 ? 'file' : 'files'})
          </span>
        </div>

        {/* Export Button */}
        <Button 
          size="sm" 
          onClick={handleExport}
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export Organized PDF
        </Button>
      </div>

      {/* Secondary Multi-Select Action Ribbon */}
      <div className="h-11 border-b px-4 flex items-center justify-between bg-muted/30 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs" 
            onClick={selectedIds.size === pages.length ? deselectAll : selectAll}
          >
            {selectedIds.size === pages.length ? <CheckSquare className="w-3.5 h-3.5 mr-1 text-primary" /> : <Square className="w-3.5 h-3.5 mr-1" />}
            {selectedIds.size === pages.length ? "Deselect All" : "Select All"}
          </Button>

          {selectedIds.size > 0 && (
            <span className="font-semibold text-primary font-mono">
              ({selectedIds.size} selected)
            </span>
          )}

          {/* Quick Range Selection */}
          <div className="flex items-center gap-1.5 ml-4">
            <span className="text-muted-foreground text-[11px]">Range:</span>
            <Input 
              value={rangeInput} 
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-4, 7" 
              className="h-7 w-28 text-xs font-mono"
            />
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={applyRangeSelection}>
              Select
            </Button>
          </div>
        </div>

        {/* Batch Operations on Selected Pages */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => rotateSelected(90)}>
              <RotateCw className="w-3 h-3" /> Rotate 90&deg;
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={duplicateSelected}>
              <Copy className="w-3 h-3" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={deleteSelected}>
              <Trash2 className="w-3 h-3" /> Delete ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>

      {/* Visual Page Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pages.map((card, idx) => {
            const isSelected = selectedIds.has(card.id);
            return (
              <div
                key={card.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group relative flex flex-col bg-card border rounded-2xl p-2.5 transition-all shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing ${
                  isSelected ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'hover:border-primary/50'
                }`}
              >
                {/* Drag Handle & Page Index Badge */}
                <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    <span className="font-bold text-foreground font-mono">#{idx + 1}</span>
                  </div>

                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => toggleSelect(card.id)}
                    className="w-3.5 h-3.5 rounded text-primary cursor-pointer"
                  />
                </div>

                {/* Thumbnail Preview with applied rotation */}
                <div 
                  onClick={() => toggleSelect(card.id)}
                  className="aspect-[3/4] bg-white border rounded-xl overflow-hidden flex items-center justify-center p-1 relative shadow-inner cursor-pointer"
                >
                  {card.thumbnailUrl ? (
                    <img 
                      src={card.thumbnailUrl} 
                      alt={`Page ${idx + 1}`}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                      style={{ transform: `rotate(${card.rotation}deg)` }}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">Page {card.originalPageNumber}</span>
                  )}

                  {/* Rotation Indicator badge */}
                  {card.rotation !== 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-black/75 text-white text-[10px] font-mono px-1 rounded">
                      {card.rotation}&deg;
                    </div>
                  )}
                </div>

                {/* Source File Name & Quick Actions */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[90px]" title={card.sourceFileName}>
                    {card.sourceFileName || `Doc ${card.sourceDocIndex + 1}`}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    <button 
                      onClick={(e) => { e.stopPropagation(); rotateCard(card.id, 90); }}
                      className="p-1 hover:text-foreground rounded hover:bg-muted"
                      title="Rotate Clockwise"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                      className="p-1 hover:text-destructive rounded hover:bg-destructive/10"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
