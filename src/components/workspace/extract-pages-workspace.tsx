"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { extractPdfPagesSingle, extractPdfPagesAsZip, parsePageRange } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileOutput, 
  Download, 
  Upload, 
  Shield, 
  CheckSquare, 
  Square, 
  Loader2, 
  ArrowLeft,
  Archive,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ExtractPagesWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [thumbnails, setThumbnails] = useState<{ pageNum: number; url: string }[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState("");
  const [exportMode, setExportMode] = useState<'single' | 'zip'>('single');
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
        console.error("Error loading PDF in extract workspace:", err);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [file]);

  const toggleSelect = (pageIdx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(pageIdx)) next.delete(pageIdx);
      else next.add(pageIdx);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIndices(new Set(thumbnails.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
  };

  const applyRange = () => {
    const indices = parsePageRange(rangeInput, thumbnails.length);
    setSelectedIndices(new Set(indices));
    setRangeInput("");
  };

  const handleExport = async () => {
    if (!file || selectedIndices.size === 0) {
      alert("Please select at least one page to extract.");
      return;
    }

    setIsExporting(true);
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);

    try {
      const buffer = await file.arrayBuffer();

      if (exportMode === 'single') {
        const outputBlob = await extractPdfPagesSingle({
          pdfBuffer: buffer,
          pageIndices: sortedIndices,
        });

        const url = URL.createObjectURL(outputBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `PDFMan_Extracted_${file.name.replace(/\.pdf$/i, '')}_${sortedIndices.length}pages.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const zipBlob = await extractPdfPagesAsZip({
          pdfBuffer: buffer,
          pageIndices: sortedIndices,
          baseFileName: file.name,
        });

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `PDFMan_Extracted_${file.name.replace(/\.pdf$/i, '')}_pages.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error("Extraction export failed:", err);
      alert("Extraction failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <FileOutput className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Extract PDF Pages</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Extract specific pages or page ranges into a single consolidated PDF or individual files packaged as a ZIP archive.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-emerald-500/60 bg-card shadow-sm transition-all">
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
            <span>Preserves exact page dimensions, embedded fonts, and vector quality &bull; Client-side</span>
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

          {/* Select all / Deselect all */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-xs"
            onClick={selectedIndices.size === thumbnails.length ? deselectAll : selectAll}
          >
            {selectedIndices.size === thumbnails.length ? "Deselect All" : "Select All"}
          </Button>

          {/* Range input */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-muted-foreground">Range:</span>
            <Input 
              value={rangeInput} 
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-3, 5" 
              className="h-8 w-28 text-xs font-mono"
            />
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={applyRange}>
              Select
            </Button>
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Extraction Mode Toggle */}
          <div className="flex items-center bg-muted/50 p-0.5 rounded-xl border">
            <button
              onClick={() => setExportMode('single')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                exportMode === 'single' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Single PDF
            </button>
            <button
              onClick={() => setExportMode('zip')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                exportMode === 'zip' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
            >
              <Archive className="w-3.5 h-3.5" /> Separate PDFs (ZIP)
            </button>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
            <span className="text-teal-600 dark:text-teal-400 font-bold">{selectedIndices.size} selected</span> / {thumbnails.length}
          </span>

          <Button 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting || selectedIndices.size === 0}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exportMode === 'single' ? 'Extract to PDF' : 'Extract to ZIP'}
          </Button>
        </div>
      </div>

      {/* Grid of Pages */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {thumbnails.map((thumb, idx) => {
            const isSelected = selectedIndices.has(idx);
            return (
              <div 
                key={thumb.pageNum}
                onClick={() => toggleSelect(idx)}
                className={`group relative flex flex-col bg-card border rounded-2xl p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-teal-600 ring-2 ring-teal-600/40 bg-teal-500/5' 
                    : 'hover:border-teal-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`font-bold font-mono ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'}`}>
                    Page {thumb.pageNum}
                  </span>
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => toggleSelect(idx)}
                    className="w-4 h-4 rounded text-teal-600 cursor-pointer"
                  />
                </div>

                {/* Thumbnail Preview */}
                <div className="aspect-[3/4] bg-white border rounded-xl overflow-hidden flex items-center justify-center p-2 relative shadow-inner">
                  <img 
                    src={thumb.url} 
                    alt={`Page ${thumb.pageNum}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
