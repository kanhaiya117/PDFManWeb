"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { 
  indexDocumentForCopilot, 
  queryDocumentCopilot, 
  CopilotMessage, 
  DocumentChunk 
} from "@/lib/ai-engine";
import { pdfjsLib } from "@/lib/pdf-init";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Send, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  ArrowLeft, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  BookOpen,
  DollarSign,
  CheckSquare,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";

export function AskPdfWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [docChunks, setDocChunks] = useState<DocumentChunk[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // Document Viewer State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load and Index Document
  useEffect(() => {
    if (!file) {
      setDocChunks([]);
      setMessages([]);
      setPdfDoc(null);
      return;
    }

    let isMounted = true;
    const loadAndIndex = async () => {
      try {
        setIsIndexing(true);
        const buffer = await file.arrayBuffer();

        // Load PDF for visual canvas
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        }).promise;

        if (isMounted) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }

        // Index for on-device Copilot
        const chunks = await indexDocumentForCopilot(buffer);
        if (isMounted) {
          setDocChunks(chunks);
          setMessages([
            {
              id: 'msg-welcome',
              sender: 'assistant',
              content: `Hello! I have indexed all **${doc.numPages} pages** of **"${file.name}"** directly in your browser's local memory. You can ask questions, verify facts, or use the quick prompts below.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ]);
        }
      } catch (err: any) {
        console.error("Indexing failed:", err);
      } finally {
        if (isMounted) setIsIndexing(false);
      }
    };

    loadAndIndex();
    return () => { isMounted = false; };
  }, [file]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.1 });
        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        }
      } catch (e) {
        // ignore cancelled renders
      }
    };

    render();
    return () => { isCancelled = true; };
  }, [pdfDoc, currentPage]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendQuery = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || docChunks.length === 0) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery("");
    setIsThinking(true);

    setTimeout(() => {
      const response = queryDocumentCopilot(docChunks, trimmed);
      const assistantMsg: CopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: response.answer,
        citations: response.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 450);
  };

  const handleJumpToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  const handleExportChat = () => {
    let transcript = `PDFMAN COPILOT TRANSCRIPT\n`;
    transcript += `Document: ${file?.name || 'document.pdf'}\n`;
    transcript += `Date: ${new Date().toLocaleString()}\n`;
    transcript += `================================================\n\n`;

    for (const m of messages) {
      transcript += `[${m.timestamp}] ${m.sender === 'user' ? 'USER' : 'COPILOT'}:\n`;
      transcript += `${m.content}\n\n`;
    }

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Copilot_Chat_${file?.name.replace(/\.[^/.]+$/, "") || 'document'}.txt`;
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b bg-card/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
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
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Ask PDF Copilot</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Interactive on-device AI document chat with live page citations</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Zero-Telemetry
          </span>
          {messages.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportChat}
              className="text-xs h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Chat
            </Button>
          )}
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
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* Main Split Body */}
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="max-w-md w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to Chat with Copilot</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Indexes your document in local browser memory. Ask questions, clarify legal clauses, and inspect citations with 100% privacy.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-violet-600 hover:bg-violet-700 text-white">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Document Viewer Canvas */}
          <div className="w-full md:w-1/2 border-r bg-muted/20 flex flex-col h-full overflow-hidden">
            {/* Page Navigation Strip */}
            <div className="h-11 border-b bg-card/60 px-4 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold truncate max-w-[200px]">{file.name}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-mono font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Canvas Scroll Area */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg shadow-sm border bg-white" />
            </div>
          </div>

          {/* Right Panel: Conversational Copilot */}
          <div className="w-full md:w-1/2 flex flex-col h-full bg-background overflow-hidden">
            {/* Quick Prompt Pills */}
            <div className="p-3 border-b bg-card/40 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => handleSendQuery("Summarize the key takeaways and purpose of this document.")}
                className="px-2.5 py-1 rounded-full border text-[11px] font-medium bg-muted/40 hover:bg-muted text-muted-foreground whitespace-nowrap flex items-center gap-1 transition-colors"
              >
                <BookOpen className="w-3 h-3 text-violet-600" />
                Summarize Main Points
              </button>
              <button
                type="button"
                onClick={() => handleSendQuery("What are the key financial numbers, fees, or monetary values?")}
                className="px-2.5 py-1 rounded-full border text-[11px] font-medium bg-muted/40 hover:bg-muted text-muted-foreground whitespace-nowrap flex items-center gap-1 transition-colors"
              >
                <DollarSign className="w-3 h-3 text-violet-600" />
                Financial Numbers
              </button>
              <button
                type="button"
                onClick={() => handleSendQuery("What are the mandatory obligations, requirements, or deadlines?")}
                className="px-2.5 py-1 rounded-full border text-[11px] font-medium bg-muted/40 hover:bg-muted text-muted-foreground whitespace-nowrap flex items-center gap-1 transition-colors"
              >
                <CheckSquare className="w-3 h-3 text-violet-600" />
                Obligations & Deadlines
              </button>
              <button
                type="button"
                onClick={() => handleSendQuery("Who are the primary parties, entities, or signatories involved?")}
                className="px-2.5 py-1 rounded-full border text-[11px] font-medium bg-muted/40 hover:bg-muted text-muted-foreground whitespace-nowrap flex items-center gap-1 transition-colors"
              >
                <Users className="w-3 h-3 text-violet-600" />
                Parties Involved
              </button>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isIndexing && (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-700 dark:text-violet-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Indexing document passages in browser memory...</span>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {m.sender === 'user' ? 'You' : 'Copilot AI'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-violet-600 text-white shadow-xs rounded-tr-xs'
                        : 'bg-muted/40 border text-foreground/90 shadow-2xs rounded-tl-xs whitespace-pre-wrap'
                    }`}
                  >
                    {m.content}

                    {/* Citations if present */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Verified Sources & Citations
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {m.citations.map((c, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleJumpToPage(c.pageNum)}
                              className="px-2 py-1 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-mono text-[10px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <span>Page {c.pageNum}</span>
                              <span className="opacity-60">&rarr;</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                  <span>Searching document passages...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t bg-card/60 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuery(inputQuery);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask any question about this document..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={isThinking || docChunks.length === 0}
                  className="flex-1 text-xs bg-muted/40 border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputQuery.trim() || isThinking || docChunks.length === 0}
                  className="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
