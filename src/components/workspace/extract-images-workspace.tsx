"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { extractEmbeddedImages, ExtractImagesResult, ExtractedImage } from "@/lib/extraction-engine";
import { Button } from "@/components/ui/button";
import { 
  Image as ImageIcon, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  FileText,
  Archive,
  CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ExtractImagesWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExtractImagesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [file]);

  const handleExtract = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      const buffer = await file.arrayBuffer();
      const res = await extractEmbeddedImages(buffer);
      setResult(res);
    } catch (err: any) {
      console.error("Image extraction failed:", err);
      setError(err?.message || "Failed to extract images from PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (img: ExtractedImage) => {
    const url = URL.createObjectURL(img.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = img.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = () => {
    if (!result?.zipBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(result.zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_Extracted_Images.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === "application/pdf" || selected.name.endsWith(".pdf")) {
        setFile(selected);
      } else {
        alert("Please upload a valid PDF document.");
      }
    }
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
            <div className="h-7 w-7 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Extract Images from PDF</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Extract all embedded photos, diagrams and graphics in full resolution</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            100% Client-Side
          </span>
          {file && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Change File
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[380px] border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to extract images</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Locates all photos, illustrations, charts, and logos embedded inside the PDF and exports them in their native quality.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-pink-600 hover:bg-pink-700 text-white">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold truncate max-w-sm md:max-w-md">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {result ? `${result.totalFound} images extracted` : "PDF Document"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!result ? (
                  <Button
                    onClick={handleExtract}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white shadow-md gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting Images...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Extract All Images
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleDownloadZip}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Download All as ZIP ({result.totalFound})
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Extracted Images Gallery */}
            {result && (
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold">Extracted Media Assets ({result.images.length})</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadZip}
                    className="text-xs h-8 gap-1.5 text-pink-600 border-pink-500/30 hover:bg-pink-500/10"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Download ZIP
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {result.images.map((img) => (
                    <div
                      key={img.id}
                      className="group border rounded-2xl p-3 bg-muted/20 hover:border-pink-500/50 transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-background border mb-3 flex items-center justify-center relative shadow-sm">
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/75 text-white px-2 py-0.5 rounded-full shadow">
                          Page {img.pageNum}
                        </span>
                      </div>

                      <div className="space-y-1 mb-2">
                        <p className="text-[11px] font-medium text-foreground truncate">{img.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {img.width} × {img.height} px • {(img.sizeBytes / 1024).toFixed(0)} KB
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadSingle(img)}
                        className="w-full h-7 text-xs gap-1 border-pink-500/30 text-pink-600 hover:bg-pink-500/10"
                      >
                        <Download className="w-3 h-3" />
                        Save Image
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
