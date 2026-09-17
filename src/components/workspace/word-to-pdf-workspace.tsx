"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { convertWordToPdf, readWordPreview, WordPreviewResult, WordToPdfOptions } from "@/lib/conversion-engine";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2,
  Sliders,
  Eye,
  Type
} from "lucide-react";
import { useRouter } from "next/navigation";

export function WordToPdfWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [preview, setPreview] = useState<WordPreviewResult | null>(null);
  const [options, setOptions] = useState<WordToPdfOptions>({
    pageSize: 'a4',
    margin: 'normal',
    fontFamily: 'Helvetica',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedPdfBlob, setConvertedPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Parse DOCX when file changes
  useEffect(() => {
    setPreview(null);
    setConvertedPdfBlob(null);
    setError(null);
    if (!file) return;

    let isMounted = true;
    const loadDocx = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const res = await readWordPreview(buffer);
        if (isMounted) {
          setPreview(res);
        }
      } catch (err: any) {
        console.error("DOCX reading error:", err);
        if (isMounted) {
          setError("Failed to parse Word document. Please ensure it is a valid .docx file.");
        }
      }
    };

    loadDocx();
    return () => { isMounted = false; };
  }, [file]);

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);

      const buffer = await file.arrayBuffer();
      const pdfBlob = await convertWordToPdf({
        docxBuffer: buffer,
        options,
      });

      setConvertedPdfBlob(pdfBlob);
    } catch (err: any) {
      console.error("Word to PDF conversion error:", err);
      setError(err?.message || "Failed to convert Word document to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedPdfBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(convertedPdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.endsWith(".docx") || selected.name.endsWith(".doc")) {
        setFile(selected);
      } else {
        alert("Please upload a Microsoft Word document (.docx).");
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
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Word to PDF Converter</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Vector PDF generation from DOCX with typography preservation</p>
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
              Change Document
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a Word Document to Convert</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Upload Microsoft Word (.docx) files. Parses headings, paragraphs, bullet points, and generates a clean, paginated vector PDF.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Upload className="w-4 h-4" />
              Choose DOCX File
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Settings & Document Content Preview */}
            <div className="md:col-span-2 space-y-6">
              {/* File Status & Actions Card */}
              <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold truncate max-w-sm">{file.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • {preview ? `${preview.wordCount} words • ${preview.paragraphCount} paragraphs` : "Parsing document..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!convertedPdfBlob ? (
                    <Button
                      onClick={handleConvert}
                      disabled={isProcessing}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Converting...
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
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Live Document Preview Card */}
              <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold">Document Content Preview</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">OpenXML Structural Representation</span>
                </div>

                {preview ? (
                  <div className="max-h-[500px] overflow-y-auto p-4 rounded-xl bg-background border leading-relaxed text-sm text-foreground/90 space-y-3 font-sans">
                    <div 
                      dangerouslySetInnerHTML={{ __html: preview.html }}
                      className="prose prose-sm dark:prose-invert max-w-none [&>h1]:text-lg [&>h1]:font-bold [&>h2]:text-base [&>h2]:font-semibold [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-muted-foreground"
                    />
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span>Extracting document text and styles...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: PDF Layout Settings */}
            <div className="space-y-6">
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold">PDF Page Setup</h3>
                </div>

                {/* Page Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page Size</label>
                  <select
                    value={options.pageSize}
                    onChange={(e) => {
                      setOptions({ ...options, pageSize: e.target.value as any });
                      setConvertedPdfBlob(null);
                    }}
                    className="w-full text-xs bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                  </select>
                </div>

                {/* Margins */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Margins</label>
                  <select
                    value={options.margin}
                    onChange={(e) => {
                      setOptions({ ...options, margin: e.target.value as any });
                      setConvertedPdfBlob(null);
                    }}
                    className="w-full text-xs bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="normal">Normal (50 pt / 0.7 in)</option>
                    <option value="narrow">Narrow (36 pt / 0.5 in)</option>
                    <option value="wide">Wide (72 pt / 1.0 in)</option>
                  </select>
                </div>

                {/* Typography */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Family</label>
                  <select
                    value={options.fontFamily}
                    onChange={(e) => {
                      setOptions({ ...options, fontFamily: e.target.value as any });
                      setConvertedPdfBlob(null);
                    }}
                    className="w-full text-xs bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Helvetica">Helvetica (Modern Sans-Serif)</option>
                    <option value="TimesRoman">Times Roman (Classic Serif)</option>
                  </select>
                </div>

                {/* Specs List */}
                <div className="pt-2 border-t space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Engine</span>
                    <span className="font-semibold">Vector PDF-Lib</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Pagination</span>
                    <span className="font-semibold">Auto-Wrapped</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Privacy</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% In-Browser</span>
                  </div>
                </div>
              </div>

              {/* Privacy / Tip Card */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">🔒 Zero Telemetry</p>
                <p className="leading-relaxed">
                  Your confidential documents are converted purely within your browser memory using WebAssembly. No files are uploaded to any external server.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
