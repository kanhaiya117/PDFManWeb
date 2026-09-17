"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { convertPdfToDocx, PdfToDocxResult } from "@/lib/conversion-engine";
import { Button } from "@/components/ui/button";
import { 
  FileType2, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  ScanLine,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { useRouter } from "next/navigation";

export function PdfToWordWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [mode, setMode] = useState<'editable' | 'images'>('editable');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionResult, setConversionResult] = useState<PdfToDocxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Reset result when file changes
  useEffect(() => {
    setConversionResult(null);
    setError(null);
  }, [file]);

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      const buffer = await file.arrayBuffer();
      const result = await convertPdfToDocx({
        pdfBuffer: buffer,
        mode,
      });
      setConversionResult(result);
    } catch (err: any) {
      console.error("PDF to Word conversion error:", err);
      setError(err?.message || "Failed to convert PDF to Word. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!conversionResult || !file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(conversionResult.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.docx`;
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
      {/* Top Header */}
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
              <FileType2 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">PDF to Word Converter</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Editable OpenXML DOCX with typography preservation</p>
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

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {!file ? (
          /* Empty / Upload State */
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[380px] border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <FileType2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to convert to Word</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Converts PDF tables, paragraphs, and headings directly into editable Microsoft Word (.docx) documents in your browser.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        ) : (
          /* File Loaded Configuration State */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left/Main Column: Settings & Actions */}
            <div className="md:col-span-2 space-y-6">
              {/* File Info Card */}
              <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold truncate max-w-[280px] sm:max-w-md">{file.name}</h3>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-muted-foreground"
                >
                  Change
                </Button>
              </div>

              {/* Conversion Mode Selection */}
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold">Conversion Mode</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Select how your Word document should be generated</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    onClick={() => setMode('editable')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      mode === 'editable' 
                        ? 'border-blue-600 bg-blue-500/5 shadow-sm' 
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      {mode === 'editable' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="text-sm font-medium">Editable Text (Recommended)</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Extracts paragraphs, headers, and text formatting into editable OpenXML runs.
                    </p>
                  </div>

                  <div 
                    onClick={() => setMode('images')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      mode === 'images' 
                        ? 'border-blue-600 bg-blue-500/5 shadow-sm' 
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      {mode === 'images' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="text-sm font-medium">Layout & Visual Preservation</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Renders pages as high-resolution embedded images. Ideal for scanned documents or complex posters.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scanned PDF Warning Banner (if detected after initial run) */}
              {conversionResult?.isScanned && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-sm">Scanned or Image-Based Document Detected</p>
                    <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                      Very little selectable text was detected in this PDF. For best results with scanned papers, receipts, or photos, we recommend using OCR PDF.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => router.push('/workspace?tool=ocr-pdf')}
                        className="h-7 text-xs bg-amber-600 text-white hover:bg-amber-700"
                      >
                        <ScanLine className="w-3.5 h-3.5 mr-1" />
                        Switch to OCR PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMode('images');
                          handleConvert();
                        }}
                        className="h-7 text-xs border-amber-500/30"
                      >
                        Try Layout Mode
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button Card */}
              <div className="p-5 rounded-2xl border bg-card shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Ready to convert</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {conversionResult ? "Conversion complete! Click below to download your Word document." : "Click below to process your PDF into .docx format."}
                  </p>
                </div>

                {!conversionResult ? (
                  <Button 
                    onClick={handleConvert} 
                    disabled={isProcessing}
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Converting to Word...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Convert to Word (.docx)
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleDownload} 
                    size="lg"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download DOCX File
                  </Button>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Right Column: Information & Preview Summary */}
            <div className="space-y-6">
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold">Conversion Specs</h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Output Format</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Microsoft Word (.docx)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Standard</span>
                    <span className="font-medium">OpenXML / ECMA-376</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Security</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">100% In-Browser</span>
                  </div>
                  {conversionResult && (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Total Pages</span>
                        <span className="font-semibold">{conversionResult.pageCount}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Word Count</span>
                        <span className="font-semibold">{conversionResult.wordCount} words</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">Document Type</span>
                        <span className="font-semibold">{conversionResult.isScanned ? "Scanned / Image" : "Vector Text"}</span>
                      </div>
                    </>
                  )}
                </div>

                {conversionResult && conversionResult.sampleText && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Extracted Text Sample</span>
                    <div className="p-3 bg-muted/40 rounded-lg text-[11px] text-muted-foreground font-mono max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap border">
                      {conversionResult.sampleText}
                    </div>
                  </div>
                )}
              </div>

              {/* Conversion Tips */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">💡 Pro-Tip</p>
                <p className="leading-relaxed">
                  The generated .docx document opens seamlessly in Microsoft Word, Google Docs, Apple Pages, and LibreOffice with fully selectable text.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
