"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect, Suspense } from "react";
import { Upload, Shield, FileText, Sparkles, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useWorkspaceStore } from "@/store/workspace";
import Link from "next/link";
import { MergeWorkspace } from "@/components/workspace/merge-workspace";
import { CompareWorkspace } from "@/components/workspace/compare-workspace";
import { OCRWorkspace } from "@/components/workspace/ocr-workspace";
import { ConvertWorkspace } from "@/components/workspace/convert-workspace";
import { PresentationWorkspace } from "@/components/workspace/presentation-workspace";
import { FormsWorkspace } from "@/components/workspace/forms-workspace";
import { StampWorkspace } from "@/components/workspace/stamp-workspace";
import { OrganizeWorkspace } from "@/components/workspace/organize-workspace";
import { RotateWorkspace } from "@/components/workspace/rotate-workspace";
import { DeletePagesWorkspace } from "@/components/workspace/delete-pages-workspace";
import { ExtractPagesWorkspace } from "@/components/workspace/extract-pages-workspace";
import { ProtectWorkspace } from "@/components/workspace/protect-workspace";
import { UnlockWorkspace } from "@/components/workspace/unlock-workspace";
import { RedactWorkspace } from "@/components/workspace/redact-workspace";
import { WatermarkWorkspace } from "@/components/workspace/watermark-workspace";
import { MetadataWorkspace } from "@/components/workspace/metadata-workspace";
import { FlattenWorkspace } from "@/components/workspace/flatten-workspace";
import { PdfAWorkspace } from "@/components/workspace/pdf-a-workspace";
import { PdfToWordWorkspace } from "@/components/workspace/pdf-to-word-workspace";
import { PdfToExcelWorkspace } from "@/components/workspace/pdf-to-excel-workspace";
import { PdfToImagesWorkspace } from "@/components/workspace/pdf-to-images-workspace";
import { ImagesToPdfWorkspace } from "@/components/workspace/images-to-pdf-workspace";
import { WordToPdfWorkspace } from "@/components/workspace/word-to-pdf-workspace";
import { ExcelToPdfWorkspace } from "@/components/workspace/excel-to-pdf-workspace";
import { ExtractTextWorkspace } from "@/components/workspace/extract-text-workspace";
import { ExtractImagesWorkspace } from "@/components/workspace/extract-images-workspace";
import { CompressWorkspace } from "@/components/workspace/compress-workspace";
import { SummaryWorkspace } from "@/components/workspace/summary-workspace";
import { AskPdfWorkspace } from "@/components/workspace/ask-pdf-workspace";
import { GovernmentWorkspace } from "@/components/workspace/government-workspace";
import { BankingWorkspace } from "@/components/workspace/banking-workspace";
import { SplitWorkspace } from "@/components/workspace/split-workspace";

// Dynamically import the PDF Reader to avoid SSR issues with pdf.js
const PDFReader = dynamic(() => import("@/components/workspace/pdf-reader"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-muted/10">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-semibold text-sm">Initializing High-Performance PDF Engine...</p>
      <p className="text-xs text-muted-foreground mt-1">Loading local Web Workers and character maps</p>
    </div>
  ),
});

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const toolId = searchParams.get('tool');
  const { file, setFile, setActiveRightTab, setActiveTool } = useWorkspaceStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map toolId to correct initial state
  useEffect(() => {
    if (!toolId) return;
    
    // Convert tool to workspace state tab/mode
    switch(toolId) {
      case 'sign-pdf':
        setActiveRightTab('sign');
        setActiveTool('sign');
        break;
      case 'watermark-pdf':
        setActiveRightTab('watermark');
        break;
      case 'redact-pdf':
        setActiveRightTab('security');
        setActiveTool('redact');
        break;
      case 'protect-pdf':
        setActiveRightTab('security');
        break;
      case 'ask-pdf':
      case 'summarize-pdf':
        setActiveRightTab('ai');
        break;
      case 'edit-pdf':
        setActiveRightTab('annotate');
        break;
      case 'rotate-pdf':
      case 'organize-pdf':
      case 'delete-pages':
      case 'split-pdf':
      case 'extract-pages':
        setActiveRightTab('pages');
        break;
      default:
        break;
    }
  }, [toolId, setActiveRightTab, setActiveTool]);

  // Clear annotations when file changes
  useEffect(() => {
    useWorkspaceStore.setState({ 
      annotations: [],
      pageRotations: {},
      deletedPages: []
    });
  }, [file]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const isPDF = selectedFile.type === "application/pdf" || selectedFile.name.endsWith('.pdf');
    const isImage = selectedFile.type.startsWith("image/");
    const isWord = selectedFile.name.endsWith('.doc') || selectedFile.name.endsWith('.docx');
    const isExcel = selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv');

    const isValid = isPDF || isImage || isWord || isExcel;

    if (!isValid) {
      alert("Please upload a valid file format (PDF, Image, Word, or Excel).");
      return;
    }
    setFile(selectedFile);
  };

  const isSpecialTool = 
    toolId === 'merge-pdf' || 
    toolId === 'compare-pdf' || 
    toolId === 'ocr-pdf' || 
    toolId === 'presentation-mode' || 
    toolId === 'presentation' || 
    toolId === 'pdf-forms' || 
    toolId === 'fill-pdf' || 
    toolId === 'stamp-pdf' || 
    toolId === 'organize-pdf' || 
    toolId === 'rotate-pdf' || 
    toolId === 'delete-pages' || 
    toolId === 'extract-pages' || 
    toolId === 'protect-pdf' || 
    toolId === 'password-protect' || 
    toolId === 'unlock-pdf' || 
    toolId === 'redact-pdf' || 
    toolId === 'watermark-pdf' || 
    toolId === 'remove-metadata' || 
    toolId === 'flatten-pdf' || 
    toolId === 'pdf-a' || 
    toolId === 'pdf-to-word' || 
    toolId === 'pdf-to-excel' || 
    toolId === 'pdf-to-jpg' || 
    toolId === 'pdf-to-png' || 
    toolId === 'pdf-to-images' || 
    toolId === 'jpg-to-pdf' || 
    toolId === 'images-to-pdf' || 
    toolId === 'png-to-pdf' || 
    toolId === 'word-to-pdf' || 
    toolId === 'excel-to-pdf' || 
    toolId === 'extract-text' || 
    toolId === 'pdf-to-text' || 
    toolId === 'extract-images' || 
    toolId === 'compress-pdf' || 
    toolId === 'compress' || 
    toolId === 'summarize-pdf' || 
    toolId === 'document-summary' || 
    toolId === 'ask-pdf' ||
    toolId === 'government-mode' ||
    toolId === 'government' ||
    toolId === 'banking-mode' ||
    toolId === 'banking' ||
    toolId === 'kyc-sanitize' ||
    toolId === 'split-pdf' ||
    toolId === 'split';

  if (file || isSpecialTool) {
    if (toolId === 'presentation-mode' || toolId === 'presentation') {
      return <PresentationWorkspace />;
    }
    if (toolId === 'pdf-forms' || toolId === 'fill-pdf') {
      return <FormsWorkspace />;
    }
    if (toolId === 'stamp-pdf') {
      return <StampWorkspace />;
    }
    if (toolId === 'organize-pdf') {
      return <OrganizeWorkspace />;
    }
    if (toolId === 'rotate-pdf') {
      return <RotateWorkspace />;
    }
    if (toolId === 'delete-pages') {
      return <DeletePagesWorkspace />;
    }
    if (toolId === 'extract-pages') {
      return <ExtractPagesWorkspace />;
    }
    if (toolId === 'protect-pdf' || toolId === 'password-protect') {
      return <ProtectWorkspace />;
    }
    if (toolId === 'unlock-pdf') {
      return <UnlockWorkspace />;
    }
    if (toolId === 'redact-pdf') {
      return <RedactWorkspace />;
    }
    if (toolId === 'watermark-pdf') {
      return <WatermarkWorkspace />;
    }
    if (toolId === 'remove-metadata') {
      return <MetadataWorkspace />;
    }
    if (toolId === 'flatten-pdf') {
      return <FlattenWorkspace />;
    }
    if (toolId === 'pdf-a') {
      return <PdfAWorkspace />;
    }
    if (toolId === 'pdf-to-word') {
      return <PdfToWordWorkspace />;
    }
    if (toolId === 'pdf-to-excel') {
      return <PdfToExcelWorkspace />;
    }
    if (toolId === 'pdf-to-jpg' || toolId === 'pdf-to-png' || toolId === 'pdf-to-images') {
      return <PdfToImagesWorkspace />;
    }
    if (toolId === 'jpg-to-pdf' || toolId === 'images-to-pdf' || toolId === 'png-to-pdf') {
      return <ImagesToPdfWorkspace />;
    }
    if (toolId === 'word-to-pdf') {
      return <WordToPdfWorkspace />;
    }
    if (toolId === 'excel-to-pdf') {
      return <ExcelToPdfWorkspace />;
    }
    if (toolId === 'ocr-pdf') {
      return <OCRWorkspace />;
    }
    if (toolId === 'extract-text' || toolId === 'pdf-to-text') {
      return <ExtractTextWorkspace />;
    }
    if (toolId === 'extract-images') {
      return <ExtractImagesWorkspace />;
    }
    if (toolId === 'compress-pdf' || toolId === 'compress') {
      return <CompressWorkspace />;
    }
    if (toolId === 'merge-pdf') {
      return <MergeWorkspace />;
    }
    if (toolId === 'compare-pdf') {
      return <CompareWorkspace />;
    }
    if (toolId === 'summarize-pdf' || toolId === 'document-summary') {
      return <SummaryWorkspace />;
    }
    if (toolId === 'ask-pdf') {
      return <AskPdfWorkspace />;
    }
    if (toolId === 'government-mode' || toolId === 'government') {
      return <GovernmentWorkspace />;
    }
    if (toolId === 'banking-mode' || toolId === 'banking' || toolId === 'kyc-sanitize') {
      return <BankingWorkspace />;
    }
    if (toolId === 'split-pdf' || toolId === 'split') {
      return <SplitWorkspace />;
    }
    return <PDFReader />;
  }

  return (
    <div 
      className={`flex-1 flex flex-col items-center justify-center p-6 md:p-10 transition-colors overflow-y-auto ${
        isDragging ? 'bg-indigo-500/5' : 'bg-muted/10'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-2xl w-full flex flex-col items-center text-center my-auto">
        {/* Onboarding Quick Intent Picker (Section 44) */}
        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
            What do you want to do?
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { label: "Read PDF", tool: "pdf-reader" },
              { label: "Edit PDF", tool: "edit-pdf" },
              { label: "Sign PDF", tool: "sign-pdf" },
              { label: "Organize PDF", tool: "organize-pdf" },
              { label: "Convert PDF", tool: "pdf-to-word" },
            ].map((intent) => (
              <button
                key={intent.label}
                onClick={() => {
                  if (intent.tool !== 'pdf-reader') {
                    setActiveRightTab('annotate');
                  }
                  fileInputRef.current?.click();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-card border text-xs font-semibold hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs transition-all cursor-pointer"
              >
                {intent.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone Card (Section 45: Smart Empty State) */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 md:p-12 border-2 border-dashed rounded-3xl w-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg bg-card ${
            isDragging 
              ? 'border-indigo-600 bg-indigo-500/10 scale-[1.01]' 
              : 'border-border/80 hover:border-indigo-500/60'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/15 mb-4 group-hover:scale-105 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Open a PDF to get started</h2>
          <p className="text-xs text-muted-foreground mb-6">Drag and drop your file here, or browse local disk</p>

          <input 
            type="file" 
            accept=".pdf,application/pdf,image/*,.doc,.docx,.xls,.xlsx" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <Button size="lg" className="rounded-xl px-8 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer">
            Choose PDF Document
          </Button>

          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Processed 100% locally in your browser &bull; Zero cloud upload</span>
          </div>
        </div>

        {/* Quick Tools Row */}
        <div className="mt-8 pt-6 border-t w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Popular Workflows:</span>
            <Link href="/government" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline">Government Tools</Link>
            <span>&bull;</span>
            <Link href="/banking" className="hover:text-emerald-600 dark:hover:text-emerald-400 underline">Banking Redaction</Link>
          </div>
          <Link href="/#tools" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5">
            Browse all 25+ tools <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-center bg-muted/10"><p className="font-semibold text-sm">Loading workspace...</p></div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
