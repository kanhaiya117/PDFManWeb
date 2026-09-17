"use client";

import { useState, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { 
  ScanLine, 
  Search, 
  Download, 
  Globe, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  ArrowLeft,
  Upload,
  ShieldCheck,
  FileCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { performPdfOcr, generateSearchablePdf, PerformPdfOcrResult, OcrProgress } from "@/lib/ocr-engine";

const INDIC_LANGUAGES = [
  { id: "eng", label: "English", native: "English" },
  { id: "hin", label: "Hindi", native: "हिन्दी" },
  { id: "guj", label: "Gujarati", native: "ગુજરાતી" },
  { id: "mar", label: "Marathi", native: "मराठी" },
  { id: "ben", label: "Bengali", native: "বাংলা" },
  { id: "tam", label: "Tamil", native: "தமிழ்" },
  { id: "tel", label: "Telugu", native: "తెలుగు" },
];

export function OCRWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<OcrProgress | null>(null);
  const [ocrResult, setOcrResult] = useState<PerformPdfOcrResult | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["eng", "hin"]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [forceOcr, setForceOcr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggleLanguage = (langId: string) => {
    if (selectedLangs.includes(langId)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter(l => l !== langId));
      }
    } else {
      setSelectedLangs([...selectedLangs, langId]);
    }
  };

  const handleOCR = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgressInfo({ status: "Starting OCR engine...", progress: 0 });

    try {
      const buffer = await file.arrayBuffer();
      const res = await performPdfOcr({
        pdfBuffer: buffer,
        languages: selectedLangs,
        forceOcr,
        onProgress: (p) => setProgressInfo(p),
      });

      setOcrResult(res);
    } catch (err: any) {
      console.error("OCR failed:", err);
      alert("OCR failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (ocrResult?.fullText) {
      navigator.clipboard.writeText(ocrResult.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportText = () => {
    if (!ocrResult?.fullText) return;
    const blob = new Blob([ocrResult.fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PDFMan_Transcript_${file?.name.replace(/\.[^/.]+$/, "") || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSearchablePdf = async () => {
    if (!ocrResult || !file) return;

    try {
      setIsGeneratingPdf(true);
      const buffer = await file.arrayBuffer();
      const searchableBlob = await generateSearchablePdf({
        pdfBuffer: buffer,
        ocrResult,
      });

      const url = URL.createObjectURL(searchableBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_Searchable.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Searchable PDF creation failed:", err);
      alert("Failed to create Searchable PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setOcrResult(null);
    }
  };

  const filteredText = ocrResult?.fullText
    ? (searchQuery 
        ? ocrResult.fullText.split('\n').filter(line => line.toLowerCase().includes(searchQuery.toLowerCase())).join('\n')
        : ocrResult.fullText)
    : "";

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
            <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ScanLine className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Multi-Lingual OCR Scanner</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recognize scanned pages, Indic scripts & export Searchable PDFs</p>
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
            accept=".pdf,application/pdf,image/*"
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
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
              <ScanLine className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a Scanned PDF or Image for OCR</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Extract readable text from photos, scans, and documents in English, Hindi, Gujarati, Marathi, and other Indic languages.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-teal-600 hover:bg-teal-700 text-white">
              <Upload className="w-4 h-4" />
              Choose Document
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Language Selection & Settings */}
            <div className="space-y-6">
              {/* File Info */}
              <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold truncate max-w-[200px]">{file.name}</h3>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              </div>

              {/* Languages Card */}
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-semibold">OCR Language Models</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select languages present in your document for optimal optical character recognition:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {INDIC_LANGUAGES.map((lang) => {
                    const isSelected = selectedLangs.includes(lang.id);
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => toggleLanguage(lang.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium'
                            : 'border-border hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{lang.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                        </div>
                        <span className="text-[11px] opacity-75">{lang.native}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <label className="text-xs text-muted-foreground cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={forceOcr}
                      onChange={(e) => setForceOcr(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    Force full raster OCR scan
                  </label>
                </div>

                <Button
                  onClick={handleOCR}
                  disabled={isProcessing}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-md gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Recognizing Text...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Run OCR Recognition
                    </>
                  )}
                </Button>

                {isProcessing && progressInfo && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[200px]">{progressInfo.status}</span>
                      <span>{Math.round(progressInfo.progress * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.round(progressInfo.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Metrics Card if done */}
              {ocrResult && (
                <div className="p-4 rounded-xl border bg-card space-y-2 text-xs">
                  <h4 className="font-semibold text-foreground">Extraction Summary</h4>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Average Confidence</span>
                    <span className="font-semibold text-teal-600">{ocrResult.averageConfidence}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Words Extracted</span>
                    <span className="font-semibold">{ocrResult.totalWords}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Document Type</span>
                    <span className="font-semibold">{ocrResult.isScannedDocument ? "Scanned Document" : "Digital Text Layer"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right 2 Columns: Results Transcript & Export */}
            <div className="md:col-span-2 space-y-6">
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Recognized Text Output</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ocrResult ? `${ocrResult.totalWords} words recognized across ${ocrResult.pages.length} pages` : "Awaiting scan..."}
                    </p>
                  </div>

                  {ocrResult && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopy}
                        className="text-xs h-8 gap-1.5"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy Text"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportText}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Save .TXT
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDownloadSearchablePdf}
                        disabled={isGeneratingPdf}
                        className="text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-sm"
                      >
                        {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                        Searchable PDF
                      </Button>
                    </div>
                  )}
                </div>

                {/* Filter Search Input */}
                {ocrResult && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filter transcript lines..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-muted/40 border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                )}

                {/* Text Display Area */}
                <div className="min-h-[420px] max-h-[540px] overflow-y-auto p-4 rounded-xl bg-background border font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {ocrResult ? (
                    filteredText || <span className="text-muted-foreground">No lines match your search filter.</span>
                  ) : (
                    <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                      <ScanLine className="w-10 h-10 text-teal-600/40 mb-3 animate-pulse" />
                      <p className="font-medium text-sm text-foreground">Ready to OCR Document</p>
                      <p className="text-xs max-w-sm mt-1">
                        Select language models on the left and click &quot;Run OCR Recognition&quot; to extract optical characters and build a searchable PDF.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
