"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { extractStructuredText, StructuredTextResult } from "@/lib/extraction-engine";
import { Button } from "@/components/ui/button";
import { 
  FileCode, 
  Download, 
  Upload, 
  ShieldCheck, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  FileText,
  Hash,
  Clock,
  Code2,
  BookOpen
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ExtractTextWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<StructuredTextResult | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'markdown' | 'stats' | 'json'>('text');
  const [copied, setCopied] = useState(false);
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
      const res = await extractStructuredText(buffer);
      setResult(res);
    } catch (err: any) {
      console.error("Text extraction failed:", err);
      setError(err?.message || "Failed to extract text from PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const content = activeTab === 'markdown' 
      ? result.markdown 
      : activeTab === 'json' 
      ? result.jsonDump 
      : result.fullText;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'md' | 'json') => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    let content = "";
    let mime = "text/plain";
    let ext = "txt";

    if (format === 'txt') {
      content = result.fullText;
      mime = "text/plain;charset=utf-8";
      ext = "txt";
    } else if (format === 'md') {
      content = result.markdown;
      mime = "text/markdown;charset=utf-8";
      ext = "md";
    } else if (format === 'json') {
      content = result.jsonDump;
      mime = "application/json;charset=utf-8";
      ext = "json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_extracted.${ext}`;
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
            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <FileCode className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Structured Text Extractor</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Extract paragraphs, Markdown, JSON & keyword intelligence</p>
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
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
              <FileCode className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to extract structured text</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Deconstructs document text into headings, paragraphs, Markdown, JSON, and keyword analytics in your browser.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-cyan-600 hover:bg-cyan-700 text-white">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action & Info Bar */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold truncate max-w-sm md:max-w-md">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {result ? `${result.stats.totalWords} words • ${result.stats.readingTimeMinutes} min read` : "PDF Document"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!result ? (
                  <Button
                    onClick={handleExtract}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white shadow-md gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting Text...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Extract Text & Data
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="text-xs h-8 gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload('txt')}
                      className="text-xs h-8 gap-1 text-cyan-600 border-cyan-600/30"
                    >
                      <Download className="w-3 h-3" />
                      .TXT
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload('md')}
                      className="text-xs h-8 gap-1 text-cyan-600 border-cyan-600/30"
                    >
                      <Download className="w-3 h-3" />
                      .MD
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload('json')}
                      className="text-xs h-8 gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      <Download className="w-3 h-3" />
                      .JSON
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Results Viewer */}
            {result && (
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                {/* View Tabs */}
                <div className="flex items-center justify-between border-b pb-3 overflow-x-auto gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('text')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeTab === 'text'
                          ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Plain Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('markdown')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeTab === 'markdown'
                          ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('stats')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeTab === 'stats'
                          ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5" />
                      Intelligence & Keywords
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('json')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeTab === 'json'
                          ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      JSON Schema
                    </button>
                  </div>
                </div>

                {/* Tab Content Display */}
                {activeTab === 'text' && (
                  <div className="max-h-[500px] overflow-y-auto p-4 rounded-xl bg-background border font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {result.fullText || "No text could be extracted."}
                  </div>
                )}

                {activeTab === 'markdown' && (
                  <div className="max-h-[500px] overflow-y-auto p-4 rounded-xl bg-background border font-mono text-xs leading-relaxed whitespace-pre-wrap text-cyan-900 dark:text-cyan-200">
                    {result.markdown || "No markdown content."}
                  </div>
                )}

                {activeTab === 'stats' && (
                  <div className="space-y-6 py-2">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl border bg-muted/20">
                        <span className="text-xs text-muted-foreground">Total Words</span>
                        <p className="text-xl font-bold text-foreground mt-1">{result.stats.totalWords.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-xl border bg-muted/20">
                        <span className="text-xs text-muted-foreground">Characters</span>
                        <p className="text-xl font-bold text-foreground mt-1">{result.stats.totalChars.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-xl border bg-muted/20">
                        <span className="text-xs text-muted-foreground">Paragraphs</span>
                        <p className="text-xl font-bold text-foreground mt-1">{result.stats.totalParagraphs.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-xl border bg-muted/20">
                        <span className="text-xs text-muted-foreground">Est. Reading Time</span>
                        <p className="text-xl font-bold text-cyan-600 mt-1">{result.stats.readingTimeMinutes} min</p>
                      </div>
                    </div>

                    {/* Keywords List */}
                    <div className="p-5 rounded-xl border bg-card space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Keywords & Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.stats.topKeywords.map((kw) => (
                          <div 
                            key={kw.word}
                            className="px-3 py-1.5 rounded-lg border bg-muted/40 text-xs font-medium flex items-center gap-2"
                          >
                            <span className="text-foreground font-semibold">{kw.word}</span>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded-full">
                              {kw.count}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'json' && (
                  <div className="max-h-[500px] overflow-y-auto p-4 rounded-xl bg-background border font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-emerald-800 dark:text-emerald-300">
                    {result.jsonDump}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
