"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PDFTool } from "@/lib/tools-data";
import { ToolIcon } from "@/components/tool-icon";
import { useWorkspaceStore } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { Upload, Shield, Zap, Lock, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ToolLandingProps {
  tool: PDFTool;
}

export function ToolLanding({ tool }: ToolLandingProps) {
  const router = useRouter();
  const { setFile } = useWorkspaceStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      router.push(`/workspace?tool=${tool.id}`);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      router.push(`/workspace?tool=${tool.id}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20 px-4 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <span className="capitalize">{tool.category}</span>
        <span>/</span>
        <span className="text-foreground font-medium">{tool.title}</span>
      </div>

      <div className="w-full text-center space-y-6">
        <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${tool.color} text-white flex items-center justify-center shadow-lg shadow-indigo-500/10`}>
          <ToolIcon name={tool.icon} className="w-10 h-10" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {tool.title}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Upload Dropzone */}
        <div className="mt-8">
          <div
            className={`
              relative group cursor-pointer max-w-xl mx-auto rounded-3xl p-10 md:p-14 transition-all duration-200
              ${isDragging 
                ? 'bg-indigo-500/10 border-2 border-indigo-600 border-dashed scale-[1.01]' 
                : 'bg-card border-2 border-dashed border-border/80 hover:border-indigo-500/60 shadow-sm hover:shadow-md'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={handleFileUpload}
              accept={tool.category === "convert" ? "image/*,.doc,.docx,.xls,.xlsx,.pdf" : "application/pdf"}
            />
            
            <div className="flex flex-col items-center justify-center space-y-4 relative z-0">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight">Select PDF Document</h3>
                <p className="text-xs text-muted-foreground">or drag and drop your file here</p>
              </div>

              <Button size="lg" className="rounded-xl px-8 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-2">
                Choose Document
              </Button>
            </div>
          </div>
          
          {/* Trust points */}
          <div className="flex items-center justify-center gap-6 mt-8 text-xs font-medium text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Local Browser Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Zero Cloud Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>No File Size Queues</span>
            </div>
          </div>
        </div>

        {/* How It Works 3-Step Guide */}
        <div className="mt-20 pt-12 border-t text-left">
          <h2 className="text-2xl font-extrabold tracking-tight text-center mb-10">
            How to use {tool.title} with PDFMan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-card border rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-xs mb-3">
                1
              </div>
              <h3 className="font-bold text-sm mb-1">Upload Document</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose your PDF file from your device. The document is decoded instantly within your browser’s local sandbox.
              </p>
            </div>

            <div className="p-5 bg-card border rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-xs mb-3">
                2
              </div>
              <h3 className="font-bold text-sm mb-1">Execute Operation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure your custom settings, reorder pages, apply annotations, or execute conversions with live preview.
              </p>
            </div>

            <div className="p-5 bg-card border rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-xs mb-3">
                3
              </div>
              <h3 className="font-bold text-sm mb-1">Instant Download</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Download your processed PDF file directly to disk with original vector fidelity and stripped metadata.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
