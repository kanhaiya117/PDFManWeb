"use client";

import { useState, useRef } from "react";
import { convertImagesToPdf, ImageToPdfItem, ImageToPdfSettings } from "@/lib/conversion-engine";
import { Button } from "@/components/ui/button";
import { 
  Image as ImageIcon, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sliders,
  CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ImagesToPdfWorkspace() {
  const [items, setItems] = useState<ImageToPdfItem[]>([]);
  const [settings, setSettings] = useState<ImageToPdfSettings>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 'small',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedPdfBlob, setConvertedPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setConvertedPdfBlob(null);

    const newItems: ImageToPdfItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      });

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file: f,
        dataUrl,
        name: f.name,
        rotation: 0,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRotate = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const nextRot = ((it.rotation || 0) + 90) % 360;
          return { ...it, rotation: nextRot };
        }
        return it;
      })
    );
    setConvertedPdfBlob(null);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setConvertedPdfBlob(null);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setConvertedPdfBlob(null);
  };

  const handleGeneratePdf = async () => {
    if (items.length === 0) return;

    try {
      setIsProcessing(true);
      setError(null);

      const blob = await convertImagesToPdf({
        images: items,
        settings,
      });

      setConvertedPdfBlob(blob);
    } catch (err: any) {
      console.error("Images to PDF conversion error:", err);
      setError(err?.message || "Failed to generate PDF from images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedPdfBlob) return;
    const url = URL.createObjectURL(convertedPdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Images_Combined_${items.length}_Pages.pdf`;
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
            <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Images to PDF Converter</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Combine JPG, PNG, WebP into organized multi-page PDF</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            100% Client-Side
          </span>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add More
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {items.length === 0 ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[380px] border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select Images to Combine into PDF</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Upload multiple JPG, PNG, WEBP photos or scans. Reorder pages, rotate, adjust margins, and export a clean vector PDF.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-orange-600 hover:bg-orange-700 text-white">
              <Upload className="w-4 h-4" />
              Choose Image Files
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Control & Settings Strip */}
            <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-sm font-semibold">{items.length} Images Selected</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Drag or use arrow buttons to arrange pages in your preferred order</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!convertedPdfBlob ? (
                    <Button
                      onClick={handleGeneratePdf}
                      disabled={isProcessing}
                      className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-md gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating PDF...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Convert to PDF
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleDownload}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Combined PDF
                    </Button>
                  )}
                </div>
              </div>

              {/* Layout Configuration Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Page Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page Size</label>
                  <select
                    value={settings.pageSize}
                    onChange={(e) => {
                      setSettings({ ...settings, pageSize: e.target.value as any });
                      setConvertedPdfBlob(null);
                    }}
                    className="w-full text-xs bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="a4">A4 (Standard 210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="fit">Fit to Image (No White Canvas)</option>
                  </select>
                </div>

                {/* Orientation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orientation</label>
                  <select
                    value={settings.orientation}
                    onChange={(e) => {
                      setSettings({ ...settings, orientation: e.target.value as any });
                      setConvertedPdfBlob(null);
                    }}
                    className="w-full text-xs bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="auto">Auto (Match Image Ratio)</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* Margins */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Margins</label>
                  <select
                    value={settings.margin}
                    onChange={(e) => {
                      setSettings({ ...settings, margin: e.target.value as any });
                      setConvertedPdfBlob(null);
                    }}
                    className="w-full text-xs bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="none">None (Full Bleed Edge-to-Edge)</option>
                    <option value="small">Small Margin (0.25 inch)</option>
                    <option value="normal">Normal Margin (0.5 inch)</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Image Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative border rounded-2xl p-3 bg-card shadow-sm hover:border-orange-500/50 transition-all flex flex-col justify-between"
                >
                  {/* Sequence Badge */}
                  <span className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-black/75 text-white px-2 py-0.5 rounded-full shadow">
                    Page {index + 1}
                  </span>

                  {/* Thumbnail Image */}
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted/40 border mb-3 flex items-center justify-center relative">
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      style={{
                        transform: `rotate(${item.rotation || 0}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Image Name */}
                  <p className="text-[11px] font-medium text-foreground truncate mb-2">
                    {item.name}
                  </p>

                  {/* Action Buttons: Move, Rotate, Delete */}
                  <div className="flex items-center justify-between border-t pt-2 gap-1">
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'left')}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={index === items.length - 1}
                        onClick={() => handleMove(index, 'right')}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRotate(item.id)}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-orange-600"
                        title="Rotate 90° clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add More Card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all min-h-[220px]"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center mb-2">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-foreground">Add Images</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, WebP</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
