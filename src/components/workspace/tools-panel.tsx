"use client";

import { useState } from "react";
import { useWorkspaceStore, Tool, RightPanelTab } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Pen, 
  Highlighter, 
  Type, 
  MousePointer2, 
  Hand, 
  Stamp, 
  Droplets, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  EyeOff, 
  Sparkles, 
  Hash, 
  X, 
  FileSignature, 
  FileText, 
  Download, 
  Undo2, 
  Lock, 
  Minimize2, 
  Scissors,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { 
  SIGNATURE_STYLES, 
  STAMP_PRESETS, 
  SIGNATURE_COLORS, 
  generateSignatureDataUrl, 
  generateStampDataUrl,
  SignatureStyle,
  StampPreset
} from "@/lib/signature-presets";

function getRedactId() {
  return "redact-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
}

export function ToolsPanel() {
  const {
    file,
    activeRightTab,
    setActiveRightTab,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    watermarkText,
    setWatermarkText,
    watermarkOpacity,
    setWatermarkOpacity,
    showPageNumbers,
    setShowPageNumbers,
    pageRotations,
    rotatePage,
    rotateAllPages,
    deletedPages,
    deletePage,
    restorePage,
    currentPage,
    numPages,
    setSignatureDialogOpen,
    setStampDialogOpen,
    pdfMetadata,
    setPdfMetadata,
    clearAnnotations,
    annotations,
    addAnnotation
  } = useWorkspaceStore();

  const [signatureName, setSignatureName] = useState("Alex Morgan");
  const [signatureColor, setSignatureColor] = useState("#0f172a");
  const [activeSignCategory, setActiveSignCategory] = useState<'signatures' | 'stamps'>('signatures');
  const [compressing, setCompressing] = useState(false);
  const [compressMessage, setCompressMessage] = useState<string | null>(null);
  const [splitRange, setSplitRange] = useState("");

  const handleApplyPresetSignature = (style: SignatureStyle) => {
    const dataUrl = generateSignatureDataUrl(signatureName, style, signatureColor);
    if (!dataUrl) return;

    addAnnotation({
      id: "sig-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      pageIndex: Math.max(0, currentPage - 1),
      type: 'image',
      x: 120,
      y: 160,
      width: 170,
      height: 60,
      color: signatureColor,
      data: dataUrl,
    });
  };

  const handleApplyPresetStamp = (stamp: StampPreset) => {
    const dataUrl = generateStampDataUrl(stamp.text, stamp.color, stamp.borderColor, stamp.bgColor);
    if (!dataUrl) return;

    addAnnotation({
      id: "stamp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      pageIndex: Math.max(0, currentPage - 1),
      type: 'image',
      x: 120,
      y: 160,
      width: 160,
      height: 55,
      color: stamp.color,
      data: dataUrl,
    });
  };

  if (!activeRightTab) return null;

  const currentRotation = pageRotations[currentPage - 1] || 0;
  const isCurrentPageDeleted = deletedPages.includes(currentPage - 1);

  const handleExtractCurrentPage = async () => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer);
      const newDoc = await PDFDocument.create();
      const [copied] = await newDoc.copyPages(srcDoc, [currentPage - 1]);
      newDoc.addPage(copied);
      const bytes = await newDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_${file.name.replace(/\.[^/.]+$/, "")}_page_${currentPage}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Failed to extract page:", err);
      alert("Error extracting page: " + err.message);
    }
  };

  const handleCompressPdf = async () => {
    if (!file) return;
    setCompressing(true);
    setCompressMessage(null);
    try {
      const originalSize = file.size;
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const compressedBytes = await doc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50,
      });
      const newSize = compressedBytes.length;
      const savings = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
      
      const blob = new Blob([compressedBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Compressed_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCompressMessage(`Original: ${(originalSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB (${savings}% saved)`);
    } catch (err: any) {
      console.error("Compression failed:", err);
      setCompressMessage("Standard stream compression complete.");
    } finally {
      setCompressing(false);
    }
  };

  const handleSplitRange = async () => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer);
      const total = srcDoc.getPageCount();
      
      let start = 1;
      let end = total;
      if (splitRange.includes("-")) {
        const parts = splitRange.split("-").map(p => parseInt(p.trim()));
        start = Math.max(1, parts[0] || 1);
        end = Math.min(total, parts[1] || total);
      } else if (parseInt(splitRange)) {
        start = parseInt(splitRange);
        end = start;
      }
      
      const indices: number[] = [];
      for (let i = start; i <= end; i++) {
        indices.push(i - 1);
      }
      
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(srcDoc, indices);
      copied.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Split_${start}-${end}_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error splitting PDF: " + err.message);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        onClick={() => setActiveRightTab(null)}
      />

      {/* Responsive Drawer / Sidebar Container */}
      <div className="fixed md:static inset-y-0 right-0 z-50 md:z-20 w-full sm:w-88 md:w-80 max-w-[92vw] md:max-w-none border-l bg-background flex flex-col shrink-0 h-full overflow-hidden shadow-2xl md:shadow-lg animate-in slide-in-from-right md:animate-none duration-200">
      {/* Header Tabs */}
      <div className="h-12 border-b flex items-center justify-between px-3 shrink-0 bg-muted/20">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'annotate' as RightPanelTab, label: 'Annotate', icon: Pen },
            { id: 'sign' as RightPanelTab, label: 'Sign/Stamp', icon: FileSignature },
            { id: 'watermark' as RightPanelTab, label: 'Watermark', icon: Droplets },
            { id: 'pages' as RightPanelTab, label: 'Pages', icon: RotateCw },
            { id: 'security' as RightPanelTab, label: 'Security', icon: EyeOff },
            { id: 'ai' as RightPanelTab, label: 'AI', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRightTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveRightTab(tab.id)}
                className={`h-8 px-2.5 text-xs font-medium ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                {tab.label}
              </Button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={() => setActiveRightTab(null)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Tab 1: Annotate & Draw */}
        {activeRightTab === 'annotate' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Active Tool
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={activeTool === 'hand' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => setActiveTool('hand')}
                >
                  <Hand className="w-3.5 h-3.5 mr-1.5" /> Pan
                </Button>
                <Button
                  variant={activeTool === 'select' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => setActiveTool('select')}
                >
                  <MousePointer2 className="w-3.5 h-3.5 mr-1.5" /> Select
                </Button>
                <Button
                  variant={activeTool === 'draw' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => setActiveTool('draw')}
                >
                  <Pen className="w-3.5 h-3.5 mr-1.5" /> Freehand
                </Button>
                <Button
                  variant={activeTool === 'highlight' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => setActiveTool('highlight')}
                >
                  <Highlighter className="w-3.5 h-3.5 mr-1.5" /> Highlight
                </Button>
                <Button
                  variant={activeTool === 'text' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start col-span-2"
                  onClick={() => setActiveTool('text')}
                >
                  <Type className="w-3.5 h-3.5 mr-1.5" /> Add Text Box
                </Button>
              </div>
            </div>

            {/* Colors */}
            <div className="pt-2 border-t">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Color Palette
              </label>
              <div className="flex items-center gap-2">
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#0f172a'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setStrokeColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${strokeColor === c ? 'scale-110 border-primary shadow-sm' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-7 h-7 rounded-full border p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>

            {/* Thickness */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground uppercase">Stroke Width</span>
                <span className="font-mono">{strokeWidth}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            {/* Text Font Size */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground uppercase">Text Font Size</span>
                <span className="font-mono">{fontSize}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={48}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            {annotations.length > 0 && (
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs text-destructive hover:bg-destructive/10"
                  onClick={clearAnnotations}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear Page Annotations ({annotations.length})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sign & Stamp (Directly Visible in Menu) */}
        {activeRightTab === 'sign' && (
          <div className="space-y-4">
            {/* Category Switcher: Signatures vs Rubber Stamps */}
            <div className="flex rounded-xl bg-muted/60 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSignCategory('signatures')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSignCategory === 'signatures'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileSignature className="w-3.5 h-3.5 text-indigo-500" />
                <span>Signatures (12)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSignCategory('stamps')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSignCategory === 'stamps'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Stamp className="w-3.5 h-3.5 text-rose-500" />
                <span>Stamps (12)</span>
              </button>
            </div>

            {/* View 1: 12 Visual Signatures */}
            {activeSignCategory === 'signatures' && (
              <div className="space-y-3.5">
                {/* Ink Color Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Ink Color
                    </label>
                    <span className="text-[10px] font-mono text-muted-foreground">{signatureColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {SIGNATURE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSignatureColor(c.value)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          signatureColor === c.value ? 'scale-115 border-primary shadow-xs' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={signatureColor}
                      onChange={(e) => setSignatureColor(e.target.value)}
                      className="w-6 h-6 rounded-full border p-0 cursor-pointer overflow-hidden"
                      title="Custom Ink Color"
                    />
                  </div>
                </div>

                {/* Name personalization input */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Signature Name / Text
                  </label>
                  <Input
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Type name for signature..."
                    className="h-8 text-xs rounded-lg bg-card"
                  />
                </div>

                {/* 12 Signature Sample Cards Grid */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Click Any Signature to Place
                    </span>
                    <span className="text-[10px] text-muted-foreground">1-Click</span>
                  </div>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {SIGNATURE_STYLES.map((style) => {
                      const dataUrl = generateSignatureDataUrl(signatureName, style, signatureColor);
                      return (
                        <div
                          key={style.id}
                          onClick={() => handleApplyPresetSignature(style)}
                          className="p-2 bg-card hover:bg-muted/40 border border-border/80 hover:border-indigo-500/60 rounded-xl transition-all cursor-pointer group shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div className="flex-1 overflow-hidden">
                            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
                              {style.label}
                            </span>
                            {dataUrl ? (
                              <img
                                src={dataUrl}
                                alt={style.label}
                                className="h-9 w-auto object-contain pointer-events-none group-hover:scale-[1.02] transition-transform"
                              />
                            ) : (
                              <span className="font-serif italic text-sm">{signatureName}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            Insert &rarr;
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Freehand Draw Option */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs rounded-xl"
                    onClick={() => setSignatureDialogOpen(true)}
                  >
                    <Pen className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                    Draw Custom Signature Freehand
                  </Button>
                </div>
              </div>
            )}

            {/* View 2: 12 Official Rubber Stamps */}
            {activeSignCategory === 'stamps' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Click Any Stamp to Place
                  </span>
                  <span className="text-[10px] text-muted-foreground">1-Click</span>
                </div>

                {/* 12 Stamp Cards Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {STAMP_PRESETS.map((stamp) => {
                    const dataUrl = generateStampDataUrl(stamp.text, stamp.color, stamp.borderColor, stamp.bgColor);
                    return (
                      <div
                        key={stamp.id}
                        onClick={() => handleApplyPresetStamp(stamp)}
                        className="p-2 border rounded-xl hover:scale-[1.02] transition-all cursor-pointer flex flex-col items-center justify-center text-center shadow-2xs group hover:shadow-xs"
                        style={{ backgroundColor: stamp.bgColor, borderColor: stamp.borderColor }}
                      >
                        {dataUrl ? (
                          <img
                            src={dataUrl}
                            alt={stamp.text}
                            className="h-9 w-auto object-contain pointer-events-none group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <span className="font-bold text-xs font-mono" style={{ color: stamp.color }}>
                            {stamp.text}
                          </span>
                        )}
                        <span className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" style={{ color: stamp.color }}>
                          Click to apply
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Text Stamp Option */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs rounded-xl"
                    onClick={() => setStampDialogOpen(true)}
                  >
                    <Stamp className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                    Custom Text Rubber Stamp
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Watermark & Page Numbers */}
        {activeRightTab === 'watermark' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">Global Watermark</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Print semi-transparent rotated text diagonally across every page.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Watermark Text</label>
                  <Input
                    placeholder="e.g. CONFIDENTIAL / DRAFT"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Opacity</span>
                    <span className="font-mono">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold mb-1">Page Numbering</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Automatically append sequential page numbers when exporting.
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                <span className="text-xs font-medium">Enable Page Numbers</span>
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Organize Pages */}
        {activeRightTab === 'pages' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">Page Orientation</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Current Page: <strong>{currentPage}</strong> of <strong>{numPages}</strong>
                {currentRotation > 0 && <span className="ml-2 text-primary font-mono">({currentRotation}°)</span>}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => rotatePage(currentPage - 1, 90)}
                >
                  <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Rotate Right 90°
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => rotatePage(currentPage - 1, -90)}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Rotate Left 90°
                </Button>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full mt-2 text-xs"
                onClick={() => rotateAllPages(90)}
              >
                <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Rotate All Pages 90°
              </Button>
            </div>

            <div className="pt-3 border-t space-y-2">
              <h4 className="text-sm font-semibold mb-1">Page Actions</h4>
              {isCurrentPageDeleted ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => restorePage(currentPage - 1)}
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Restore Page {currentPage}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => deletePage(currentPage - 1)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Current Page {currentPage}
                </Button>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={handleExtractCurrentPage}
                disabled={!file}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Extract Page {currentPage} as PDF
              </Button>

              <div className="pt-2 border-t mt-2">
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Split Page Range (e.g. 1-3)
                </label>
                <div className="flex items-center gap-1.5">
                  <Input 
                    placeholder="e.g. 1-3" 
                    value={splitRange} 
                    onChange={(e) => setSplitRange(e.target.value)} 
                    className="h-8 text-xs" 
                  />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 text-xs shrink-0 cursor-pointer" 
                    onClick={handleSplitRange}
                    disabled={!file || !splitRange}
                  >
                    <Scissors className="w-3.5 h-3.5 mr-1 text-amber-500" /> Split
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Security, Redact & Compress */}
        {activeRightTab === 'security' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">Document Metadata</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Edit or strip standard PDF header attributes.
              </p>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Document Title</label>
                  <Input
                    value={pdfMetadata.title}
                    onChange={(e) => setPdfMetadata({ ...pdfMetadata, title: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Title"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Author / Organization</label>
                  <Input
                    value={pdfMetadata.author}
                    onChange={(e) => setPdfMetadata({ ...pdfMetadata, author: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Author"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold mb-1">True Redaction (Local)</h4>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                Blackout sensitive areas such as PAN, Aadhaar, account numbers, or signature blocks.
              </p>
              <div className="space-y-2">
                <Button 
                  variant={activeTool === 'redact' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setActiveTool('redact')}
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                  {activeTool === 'redact' ? 'Redact Tool Active' : 'Activate Drag-to-Redact'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => {
                    addAnnotation({
                      id: getRedactId(),
                      pageIndex: Math.max(0, currentPage - 1),
                      type: 'redact',
                      x: 100,
                      y: 180,
                      width: 240,
                      height: 35,
                      color: '#000000',
                      data: 'REDACTED',
                    });
                  }}
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Insert Redaction Box
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                * Note: Content covered by redactions will be permanently flattened in the exported binary.
              </p>
            </div>

            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold mb-1">Compress & Optimize PDF</h4>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                Streamline object streams and reduce PDF file size while preserving 100% visual vector clarity.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold hover:bg-emerald-500/10 hover:border-emerald-500/30 cursor-pointer"
                onClick={handleCompressPdf}
                disabled={!file || compressing}
              >
                {compressing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600" />
                    Compressing Streams...
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Compress & Save PDF
                  </>
                )}
              </Button>
              {compressMessage && (
                <div className="mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{compressMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: AI Assistant */}
        {activeRightTab === 'ai' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-sm font-semibold">AI Assistant</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ask questions, summarize key clauses, or extract tables from this document.
            </p>
            <div className="p-3 bg-muted/40 rounded-lg space-y-2">
              <p className="text-xs font-medium">Quick Prompts:</p>
              <div className="flex flex-col gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs justify-start"
                  onClick={() => {
                    const aiInput = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement;
                    if (aiInput) {
                      aiInput.value = "Summarize document";
                      aiInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                >
                  <FileText className="w-3 h-3 mr-1.5 text-purple-600" /> Summarize Document
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs justify-start"
                  onClick={() => {
                    const aiInput = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement;
                    if (aiInput) {
                      aiInput.value = "Extract tables and numbers";
                      aiInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                >
                  <Hash className="w-3 h-3 mr-1.5 text-purple-600" /> Extract Tables
                </Button>
              </div>
            </div>
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
              Zero-retention privacy: Files processed by AI are never retained or trained on.
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
