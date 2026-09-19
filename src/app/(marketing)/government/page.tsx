"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Landmark, 
  FileCheck2, 
  Stamp, 
  EyeOff, 
  Droplets, 
  Archive, 
  ShieldOff, 
  Hash, 
  FileDown, 
  Printer, 
  ScanLine, 
  GitCompare, 
  Upload, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/workspace";

const GOV_TOOLS = [
  {
    id: "gov-forms",
    title: "Official Form Filler",
    description: "Fill government applications, tender documents, and affidavit forms with clean text fields.",
    icon: FileCheck2,
    badge: "Official Forms",
    actionTool: "edit-pdf",
  },
  {
    id: "gov-stamps",
    title: "Official Rubber Stamps",
    description: "Apply standard stamps: APPROVED, CONFIDENTIAL, VERIFIED, OFFICIAL COPY, or custom seals.",
    icon: Stamp,
    badge: "Authentic Seals",
    actionTool: "stamp-pdf",
  },
  {
    id: "gov-redact",
    title: "Permanent Redaction",
    description: "Safely blackout sensitive personal identifiers, classified memos, and witness data with permanent object deletion.",
    icon: EyeOff,
    badge: "True Sanitization",
    actionTool: "redact-pdf",
  },
  {
    id: "gov-watermark",
    title: "Confidential Watermarking",
    description: "Stamp diagonal 'CONFIDENTIAL' or custom departmental security marks across all pages.",
    icon: Droplets,
    badge: "Dept Security",
    actionTool: "watermark-pdf",
  },
  {
    id: "gov-pdfa",
    title: "ISO PDF/A Archival",
    description: "Preserve public records and legal acts in ISO 19005 compliant format for permanent 50+ year storage.",
    icon: Archive,
    badge: "ISO 19005",
    actionTool: "pdf-a",
  },
  {
    id: "gov-metadata",
    title: "Metadata Stripping",
    description: "Remove author names, computer IDs, GPS tags, and hidden revision history before publishing to portals.",
    icon: ShieldOff,
    badge: "FOIA / RTI Safe",
    actionTool: "remove-metadata",
  },
  {
    id: "gov-pagination",
    title: "Official Page Numbering",
    description: "Add standardized page numbering (e.g. 'Page X of Y') with custom departmental margins.",
    icon: Hash,
    badge: "Legal Numbering",
    actionTool: "page-numbers",
  },
  {
    id: "gov-flatten",
    title: "Print-Ready Flattening",
    description: "Convert dynamic form fields, signatures, and stamps into immutable vector curves for court filing.",
    icon: Printer,
    badge: "Court Filing Ready",
    actionTool: "flatten-pdf",
  },
  {
    id: "gov-ocr",
    title: "Multi-Lingual OCR",
    description: "Extract text from scanned gazettes, notifications, and notices. Full English, Hindi, and Gujarati support.",
    icon: ScanLine,
    badge: "Indic OCR",
    actionTool: "ocr-pdf",
  },
  {
    id: "gov-compare",
    title: "Document Comparison",
    description: "Detect alterations, added clauses, and deleted terms between two drafts of a contract or bill.",
    icon: GitCompare,
    badge: "Audit Diff",
    actionTool: "compare-pdf",
  },
];

export default function GovernmentModePage() {
  const router = useRouter();
  const { setFile } = useWorkspaceStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      router.push("/workspace?tool=government-mode");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      router.push("/workspace?tool=government-mode");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Banner */}
      <section className="pt-12 pb-10 md:pt-16 md:pb-14 bg-gradient-to-b from-slate-900 to-indigo-950 text-white border-b border-indigo-900/50 w-full">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold w-fit mb-4">
            <Landmark className="w-3.5 h-3.5 text-indigo-300" />
            Specialized Public Sector Portal
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl">
            Government PDF Tools
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
            Simplified, ultra-secure document utilities built for public servants, tender boards, and citizens. Complete zero-upload privacy ensures compliance with state data protection laws.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>No Cloud Uploads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Air-Gapped & Offline Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>ISO 19005 PDF/A Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Launch Dropzone */}
      <section className="py-8 bg-muted/20 border-b w-full">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 md:p-8 transition-all duration-200 cursor-pointer text-center bg-card ${
              isDragging ? "border-indigo-600 bg-indigo-500/10" : "border-border hover:border-indigo-500/60"
            }`}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-base">Select Official Document to Begin</h3>
                <p className="text-xs text-muted-foreground">Drop gazette, notification, tender, or application form &bull; 100% processed on this computer</p>
              </div>
              <Button size="sm" className="hidden sm:inline-flex ml-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                Choose Document
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Tool Grid */}
      <section className="py-14 bg-background w-full">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold tracking-tight">Government Workflow Actions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Click any workflow to load your document directly into the tool</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GOV_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  onClick={() => router.push(`/workspace?tool=${tool.actionTool}`)}
                  className="p-5 bg-card border rounded-2xl hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                        {tool.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>Launch Workflow</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
