"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { generateDocumentSummary, generateSummaryPdf, DocumentSummaryResult } from "@/lib/ai-engine";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Upload, 
  ShieldCheck, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  DollarSign,
  CheckSquare,
  Layers,
  BookOpen,
  FileCheck
} from "lucide-react";
import { useRouter } from "next/navigation";

export function SummaryWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<DocumentSummaryResult | null>(null);
  const [viewMode, setViewMode] = useState<'brief' | 'metrics' | 'actions' | 'sections' | 'markdown'>('brief');
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setSummary(null);
    setError(null);
  }, [file]);

  const handleGenerateSummary = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      const buffer = await file.arrayBuffer();
      const res = await generateDocumentSummary(buffer);
      setSummary(res);
    } catch (err: any) {
      console.error("Summary generation failed:", err);
      setError(err?.message || "Failed to generate document summary.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!summary || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const blob = new Blob([summary.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_Executive_Summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!summary || !file) return;

    try {
      setIsExportingPdf(true);
      const pdfBlob = await generateSummaryPdf(summary);
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_Executive_Brief.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF summary export failed:", err);
      alert("Failed to export PDF summary: " + err.message);
    } finally {
      setIsExportingPdf(false);
    }
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
            <div className="h-7 w-7 rounded-lg bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Document Summary AI</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Executive briefs, financial metrics & action items &bull; 100% On-Device</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Zero-Telemetry
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
            <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to Generate Summary</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Synthesizes executive briefings, key financial numbers, and compliance obligations client-side with zero data retention.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold truncate max-w-sm md:max-w-md">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {summary ? `${summary.totalWords.toLocaleString()} words • ${summary.readingTimeMinutes} min read` : "Ready to analyze"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!summary ? (
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-md gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing Document...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Executive Summary
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
                      onClick={handleDownloadMarkdown}
                      className="text-xs h-8 gap-1 text-fuchsia-600 border-fuchsia-500/30"
                    >
                      <Download className="w-3 h-3" />
                      .MD
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownloadPdf}
                      disabled={isExportingPdf}
                      className="text-xs h-8 gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-sm"
                    >
                      {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                      Executive Brief PDF
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

            {/* Summary Dashboard */}
            {summary && (
              <div className="space-y-6">
                {/* Metrics Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border bg-card shadow-xs">
                    <span className="text-xs text-muted-foreground">Document Scope</span>
                    <p className="text-lg font-bold text-foreground mt-1">{summary.totalWords.toLocaleString()} words</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-card shadow-xs">
                    <span className="text-xs text-muted-foreground">Reading Duration</span>
                    <p className="text-lg font-bold text-fuchsia-600 mt-1">{summary.readingTimeMinutes} mins</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-card shadow-xs">
                    <span className="text-xs text-muted-foreground">Key Metrics Found</span>
                    <p className="text-lg font-bold text-foreground mt-1">{summary.metrics.length} figures</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-card shadow-xs">
                    <span className="text-xs text-muted-foreground">Obligations Detected</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{summary.actionItems.length} items</p>
                  </div>
                </div>

                {/* Dashboard Viewport Card */}
                <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-6">
                  {/* View Tabs */}
                  <div className="flex items-center justify-between border-b pb-3 overflow-x-auto gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewMode('brief')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                          viewMode === 'brief'
                            ? 'bg-fuchsia-600 text-white font-semibold shadow-xs'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Executive Brief
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('metrics')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                          viewMode === 'metrics'
                            ? 'bg-fuchsia-600 text-white font-semibold shadow-xs'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Financials & Figures ({summary.metrics.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('actions')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                          viewMode === 'actions'
                            ? 'bg-fuchsia-600 text-white font-semibold shadow-xs'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Action Items ({summary.actionItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('sections')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                          viewMode === 'sections'
                            ? 'bg-fuchsia-600 text-white font-semibold shadow-xs'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Section Breakdown ({summary.sectionSummaries.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('markdown')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                          viewMode === 'markdown'
                            ? 'bg-fuchsia-600 text-white font-semibold shadow-xs'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        Markdown
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Executive Brief */}
                  {viewMode === 'brief' && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl bg-muted/20 border space-y-2">
                        <span className="text-xs font-bold text-fuchsia-600 uppercase tracking-wider">Executive Overview</span>
                        <p className="text-sm leading-relaxed text-foreground/90 font-sans">
                          {summary.executiveBrief}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Takeaways</h4>
                        <div className="grid grid-cols-1 gap-2.5">
                          {summary.keyTakeaways.map((takeaway, idx) => (
                            <div key={idx} className="p-3 rounded-xl border bg-card flex items-start gap-3">
                              <span className="w-5 h-5 rounded-full bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs leading-relaxed text-foreground font-medium">{takeaway}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Metrics & Numbers */}
                  {viewMode === 'metrics' && (
                    <div className="space-y-4">
                      {summary.metrics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {summary.metrics.map((m, idx) => (
                            <div key={idx} className="p-4 rounded-xl border bg-card space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-bold text-fuchsia-600">{m.value}</span>
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono">
                                  Page {m.pageNum}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">&ldquo;{m.context}&rdquo;</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-8 text-center">No explicit currency or percentage metrics detected in text stream.</p>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Action Items & Obligations */}
                  {viewMode === 'actions' && (
                    <div className="space-y-3">
                      {summary.actionItems.length > 0 ? (
                        summary.actionItems.map((action, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl border bg-card flex items-start gap-3">
                            <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                              ✓
                            </span>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                  {action.obligationType}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">Page {action.pageNum}</span>
                              </div>
                              <p className="text-xs leading-relaxed text-foreground">{action.task}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-8 text-center">No explicit compliance obligations or deadlines detected.</p>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Section Breakdown */}
                  {viewMode === 'sections' && (
                    <div className="space-y-3">
                      {summary.sectionSummaries.length > 0 ? (
                        summary.sectionSummaries.map((sec, idx) => (
                          <div key={idx} className="p-4 rounded-xl border bg-card space-y-1.5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-foreground">{sec.heading}</h4>
                              <span className="text-[10px] text-muted-foreground font-mono">Page {sec.pageNum}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{sec.summary}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-8 text-center">No distinct section headings detected.</p>
                      )}
                    </div>
                  )}

                  {/* Tab 5: Markdown */}
                  {viewMode === 'markdown' && (
                    <div className="max-h-[500px] overflow-y-auto p-4 rounded-xl bg-background border font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {summary.markdown}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
