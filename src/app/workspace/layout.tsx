"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ChevronLeft, 
  Save, 
  Share, 
  PanelLeft, 
  Sparkles, 
  Printer, 
  RotateCw,
  EyeOff,
  Pen,
  FileSignature,
  Droplets,
  Layers,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  SlidersHorizontal,
  GitCompare,
  ScanLine,
  RefreshCw,
  FileText,
  Split,
  Landmark,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/store/workspace";
import { useState, useEffect, useCallback } from "react";
import { exportPdfWithAnnotations } from "@/lib/pdf-export";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { pdfjsLib } from "@/lib/pdf-init";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { 
    file, 
    setFile,
    annotations, 
    pageRotations,
    deletedPages,
    pageOrder,
    watermarkText, 
    watermarkOpacity,
    showPageNumbers, 
    pageNumberPosition,
    pdfMetadata, 
    leftSidebarOpen, 
    toggleLeftSidebar,
    activeRightTab,
    toggleRightTab,
    setActiveRightTab,
    setActiveTool,
    setScale,
    presentationMode,
    setPresentationMode,
    undo,
    redo,
    clearAnnotations
  } = useWorkspaceStore();

  const [isExporting, setIsExporting] = useState(false);

  const triggerOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*,.doc,.docx,.xls,.xlsx';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) setFile(f);
    };
    input.click();
  };

  const handleExport = useCallback(async () => {
    if (!file) {
      alert("No document is currently loaded.");
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportPdfWithAnnotations({
        originalFile: file,
        annotations,
        pageRotations,
        deletedPages,
        pageOrder,
        watermarkText,
        watermarkOpacity,
        showPageNumbers,
        pageNumberPosition,
        metadata: pdfMetadata,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PDFMan_${file.name.replace(/\.[^/.]+$/, "")}_modified.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF. Please check the console for details.");
    } finally {
      setIsExporting(false);
    }
  }, [file, annotations, pageRotations, deletedPages, pageOrder, watermarkText, watermarkOpacity, showPageNumbers, pageNumberPosition, pdfMetadata]);

  const handlePrint = useCallback(async () => {
    if (!file) {
      alert("No document loaded to print.");
      return;
    }
    try {
      const blob = await exportPdfWithAnnotations({
        originalFile: file,
        annotations,
        pageRotations,
        deletedPages,
        pageOrder,
        watermarkText,
        watermarkOpacity,
        showPageNumbers,
        pageNumberPosition,
        metadata: pdfMetadata,
      });
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    } catch (e) {
      window.print();
    }
  }, [file, annotations, pageRotations, deletedPages, pageOrder, watermarkText, watermarkOpacity, showPageNumbers, pageNumberPosition, pdfMetadata]);

  const handleCopyText = async () => {
    if (!file) {
      alert("No document loaded.");
      return;
    }
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += `=== Page ${i} ===\n` + textContent.items.map((it: any) => it.str || '').join(' ') + '\n\n';
      }
      await navigator.clipboard.writeText(fullText.trim());
      alert('Document text copied to clipboard!');
    } catch (err: any) {
      console.error("Text extraction failed:", err);
      alert('Could not copy text: ' + err.message);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExport();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        triggerOpenFile();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleLeftSidebar();
      } else if (e.key === 'F11') {
        e.preventDefault();
        setPresentationMode(!presentationMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExport, handlePrint, undo, redo, toggleLeftSidebar, presentationMode, setPresentationMode]);

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-background ${presentationMode ? 'presentation-mode' : ''}`}>
      {/* Top Application Bar (Adobe Acrobat + Modern SaaS Layout) */}
      {!presentationMode && (
        <header className="flex items-center justify-between h-13 px-3 border-b bg-background shrink-0 z-20">
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-sm hidden sm:flex">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                    P
                  </div>
                  <span>PDF<span className="text-indigo-600 dark:text-indigo-400">Man</span></span>
                </div>
              </Button>
            </Link>

            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-8 w-8 ${leftSidebarOpen ? "bg-muted" : ""}`}
              onClick={toggleLeftSidebar}
              title="Toggle Thumbnails Panel (Alt+T)"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            <div className="h-4 w-[1px] bg-border mx-1"></div>

            {/* Acrobat-Style Menu Bar: File, Edit, View, Tools strictly in the SAME line */}
            <div className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap shrink-0">
              {/* File Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 px-2 sm:px-2.5 text-xs sm:text-sm font-medium rounded-md hover:bg-accent cursor-pointer transition-colors outline-none whitespace-nowrap">
                  File
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-1.5 text-xs sm:text-sm shadow-xl rounded-xl space-y-0.5">
                  <DropdownMenuItem onClick={triggerOpenFile} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Open New PDF... (Ctrl+O)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport} disabled={!file} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Save className="w-4 h-4 mr-2 text-indigo-500 shrink-0" /> Save As / Export PDF (Ctrl+S)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint} disabled={!file} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Printer className="w-4 h-4 mr-2 shrink-0" /> Print Document (Ctrl+P)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={handleExport} disabled={!file} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Flatten Annotations & Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => setFile(null)} disabled={!file} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer text-destructive focus:text-destructive">
                    Close Document
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Edit Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 px-2 sm:px-2.5 text-xs sm:text-sm font-medium rounded-md hover:bg-accent cursor-pointer transition-colors outline-none whitespace-nowrap">
                  Edit
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5 text-xs sm:text-sm shadow-xl rounded-xl space-y-0.5">
                  <DropdownMenuItem onClick={undo} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Undo (Ctrl+Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={redo} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Redo (Ctrl+Y)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={handleCopyText} disabled={!file} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Copy className="w-4 h-4 mr-2 shrink-0" /> Copy All Text to Clipboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={clearAnnotations} disabled={annotations.length === 0} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Clear Annotations ({annotations.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 px-2 sm:px-2.5 text-xs sm:text-sm font-medium rounded-md hover:bg-accent cursor-pointer transition-colors outline-none whitespace-nowrap">
                  View
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5 text-xs sm:text-sm shadow-xl rounded-xl space-y-0.5">
                  <DropdownMenuItem onClick={() => toggleLeftSidebar()} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <PanelLeft className="w-4 h-4 mr-2 shrink-0" /> Toggle Thumbnails (Alt+T)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleRightTab('annotate')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <SlidersHorizontal className="w-4 h-4 mr-2 shrink-0" /> Toggle Toolbox Panel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => setScale((s: number) => Math.min(3.5, Number((s + 0.25).toFixed(2))))} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <ZoomIn className="w-4 h-4 mr-2 shrink-0" /> Zoom In (Ctrl +)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScale((s: number) => Math.max(0.4, Number((s - 0.25).toFixed(2))))} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <ZoomOut className="w-4 h-4 mr-2 shrink-0" /> Zoom Out (Ctrl -)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScale(1.0)} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Actual Size (100%)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScale(1.3)} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Fit to Width
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => setPresentationMode(true)} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Maximize className="w-4 h-4 mr-2 shrink-0" /> Presentation Mode (F11)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tools Menu - In the same line */}
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 px-2 sm:px-2.5 text-xs sm:text-sm font-medium rounded-md hover:bg-accent cursor-pointer transition-colors outline-none whitespace-nowrap">
                  Tools
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-2 text-xs sm:text-sm shadow-xl rounded-xl space-y-0.5">
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                    Document Utilities
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => { setActiveRightTab('annotate'); setActiveTool('draw'); }} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Pen className="w-4 h-4 mr-2 text-indigo-500 shrink-0" /> Freehand & Text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveRightTab('sign')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <FileSignature className="w-4 h-4 mr-2 text-emerald-500 shrink-0" /> Sign & Rubber Stamps
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveRightTab('watermark')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Droplets className="w-4 h-4 mr-2 text-blue-500 shrink-0" /> Watermark & Numbers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveRightTab('pages')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <RotateCw className="w-4 h-4 mr-2 text-cyan-500 shrink-0" /> Organize & Rotate Pages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveRightTab('security'); setActiveTool('redact'); }} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <EyeOff className="w-4 h-4 mr-2 text-slate-700 dark:text-slate-300 shrink-0" /> Redact & Metadata
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveRightTab('ai')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Sparkles className="w-4 h-4 mr-2 text-purple-500 shrink-0" /> AI Document Copilot
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                    Specialized Workspaces
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push('/workspace?tool=merge-pdf')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Layers className="w-4 h-4 mr-2 text-indigo-500 shrink-0" /> Merge PDFs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/workspace?tool=split-pdf')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Split className="w-4 h-4 mr-2 text-amber-500 shrink-0" /> Split PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/workspace?tool=jpg-to-pdf')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <RefreshCw className="w-4 h-4 mr-2 text-cyan-500 shrink-0" /> Convert to PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/workspace?tool=ocr-pdf')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <ScanLine className="w-4 h-4 mr-2 text-teal-500 shrink-0" /> OCR Scanner
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/workspace?tool=compare-pdf')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <GitCompare className="w-4 h-4 mr-2 text-purple-500 shrink-0" /> Compare Documents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/workspace?tool=government-mode')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Landmark className="w-4 h-4 mr-2 text-indigo-500 shrink-0" /> Government Suite
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/workspace?tool=banking-mode')} className="py-2.5 px-3 text-xs sm:text-sm leading-relaxed cursor-pointer">
                    <Building2 className="w-4 h-4 mr-2 text-emerald-500 shrink-0" /> Banking & KYC Suite
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Center: File Title & Local Processing Trust Badge */}
          <div className="hidden md:flex items-center gap-2 max-w-sm truncate">
            {file ? (
              <>
                <span className="text-xs font-semibold text-foreground truncate">{file.name}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Local & Private
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">No document open</span>
            )}
          </div>

          {/* Right Action Icons & Export */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Quick Tool Toggle Buttons (lg+) */}
            <div className="hidden lg:flex items-center gap-1 bg-muted/40 p-1 rounded-xl">
              <Button
                variant={activeRightTab === 'annotate' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs rounded-lg"
                onClick={() => toggleRightTab('annotate')}
              >
                <Pen className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Annotate
              </Button>
              <Button
                variant={activeRightTab === 'sign' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs rounded-lg"
                onClick={() => toggleRightTab('sign')}
              >
                <FileSignature className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Sign
              </Button>
              <Button
                variant={activeRightTab === 'watermark' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs rounded-lg"
                onClick={() => toggleRightTab('watermark')}
              >
                <Droplets className="w-3.5 h-3.5 mr-1 text-blue-500" /> Watermark
              </Button>
              <Button
                variant={activeRightTab === 'pages' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs rounded-lg"
                onClick={() => toggleRightTab('pages')}
              >
                <Layers className="w-3.5 h-3.5 mr-1 text-cyan-500" /> Pages
              </Button>
            </div>

            <Button 
              variant={activeRightTab === 'ai' ? 'default' : 'outline'}
              size="sm" 
              className="h-8 px-2 sm:px-2.5 text-xs rounded-xl border-purple-500/30 hover:border-purple-500"
              onClick={() => toggleRightTab('ai')}
              title="Ask AI Copilot"
            >
              <Sparkles className="h-3.5 w-3.5 sm:mr-1 text-purple-500" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>

            <div className="h-5 w-[1px] bg-border mx-0.5 sm:mx-1"></div>

            <ThemeToggle />

            {/* Export / Download CTA */}
            <Button 
              size="sm" 
              className="h-8 px-2.5 sm:px-4 font-semibold shadow-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer text-xs"
              onClick={handleExport} 
              disabled={isExporting || !file}
              title="Save & Export PDF"
            >
              <Share className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden xs:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
            </Button>
          </div>
        </header>
      )}

      {/* Floating Exit Presentation Mode Button */}
      {presentationMode && (
        <div className="fixed top-4 right-4 z-50">
          <Button 
            variant="secondary" 
            size="sm" 
            className="shadow-lg rounded-xl text-xs gap-1.5 font-semibold bg-background/90 backdrop-blur"
            onClick={() => setPresentationMode(false)}
          >
            <Minimize className="w-3.5 h-3.5" /> Exit Presentation (F11)
          </Button>
        </div>
      )}

      {/* Main Workspace Canvas Container */}
      <div className="flex-1 overflow-hidden flex">
        {children}
      </div>
    </div>
  );
}

