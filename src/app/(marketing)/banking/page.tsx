"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  EyeOff, 
  FileSpreadsheet, 
  Droplets, 
  FileSignature, 
  Stamp, 
  GitCompare, 
  ShieldOff, 
  FileDown, 
  Upload, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  Lock,
  CreditCard,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/workspace";

const BANK_TOOLS = [
  {
    id: "bank-statements",
    title: "Bank Statement Viewer",
    description: "Inspect high-volume e-statements, transaction ledgers, and credit card summaries in high-contrast mode.",
    icon: FileSpreadsheet,
    badge: "Financial Tables",
    actionTool: "pdf-reader",
  },
  {
    id: "bank-pan",
    title: "PAN Card Redaction",
    description: "Permanent blackout sanitization for Permanent Account Numbers (PAN) before submitting documents.",
    icon: CreditCard,
    badge: "PAN Masking",
    actionTool: "redact-pdf",
  },
  {
    id: "bank-aadhaar",
    title: "Aadhaar UIDAI Masking",
    description: "Mask the first 8 digits of Aadhaar identity cards in compliance with RBI / UIDAI KYC regulations.",
    icon: EyeOff,
    badge: "KYC Compliant",
    actionTool: "redact-pdf",
  },
  {
    id: "bank-account",
    title: "Account Number Masking",
    description: "Scrub full account numbers and CIF IDs while keeping the last 4 digits visible for verification.",
    icon: Lock,
    badge: "Account Sanitize",
    actionTool: "redact-pdf",
  },
  {
    id: "bank-ifsc",
    title: "IFSC & Branch Redaction",
    description: "Conceal bank branch routing codes, SWIFT IDs, and internal clearing markers from client copies.",
    icon: Building2,
    badge: "Branch Privacy",
    actionTool: "redact-pdf",
  },
  {
    id: "bank-watermark",
    title: "Confidential Watermark",
    description: "Stamp customized security watermarks (e.g. 'FOR KYC VERIFICATION ONLY') to prevent misuse.",
    icon: Droplets,
    badge: "Anti-Fraud",
    actionTool: "watermark-pdf",
  },
  {
    id: "bank-sign",
    title: "Executive Sign-Off",
    description: "Place authorizer signatures, date markers, and designation stamps on loan sanction letters.",
    icon: FileSignature,
    badge: "Approvals",
    actionTool: "sign-pdf",
  },
  {
    id: "bank-stamp",
    title: "Branch Rubber Stamps",
    description: "Apply authentic stamps: VERIFIED, PAID, RECEIVED, APPROVED, or custom teller ink seals.",
    icon: Stamp,
    badge: "Teller Stamps",
    actionTool: "stamp-pdf",
  },
  {
    id: "bank-compare",
    title: "Audit & Ledger Diff",
    description: "Compare modified invoices and bank reconciliations against original drafts to identify alterations.",
    icon: GitCompare,
    badge: "Forensics",
    actionTool: "compare-pdf",
  },
  {
    id: "bank-flatten",
    title: "Immutable PDF Flattening",
    description: "Lock annotations, payment stamps, and signatures permanently to create non-tamperable PDF audits.",
    icon: FileDown,
    badge: "Tamper Proof",
    actionTool: "flatten-pdf",
  },
];

export default function BankingModePage() {
  const router = useRouter();
  const { setFile } = useWorkspaceStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      router.push("/workspace?tool=banking-mode");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      router.push("/workspace?tool=banking-mode");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Banner */}
      <section className="pt-12 pb-10 md:pt-16 md:pb-14 bg-gradient-to-b from-slate-950 via-emerald-950/40 to-slate-950 text-white border-b border-emerald-900/40">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold w-fit mb-4">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Banking & Financial Compliance Suite
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl">
            Banking & KYC PDF Tools
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
            Bank-grade redaction, ledger inspection, and anti-fraud watermarking. Designed for financial compliance officers, accountants, and individuals sharing sensitive financial documents.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Zero Cloud Uploads &bull; Bank Privacy Guaranteed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>RBI / UIDAI KYC Redaction Standards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Permanent Object Removal</span>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Dropzone */}
      <section className="py-8 bg-muted/20 border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 md:p-8 transition-all duration-200 cursor-pointer text-center bg-card ${
              isDragging ? "border-emerald-600 bg-emerald-500/10" : "border-border hover:border-emerald-500/60"
            }`}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-base">Select Bank Statement or KYC Document</h3>
                <p className="text-xs text-muted-foreground">Drop financial PDF &bull; 100% processed locally on this device</p>
              </div>
              <Button size="sm" className="hidden sm:inline-flex ml-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                Choose Statement
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Banking Tool Grid */}
      <section className="py-14 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h2 className="text-xl font-bold tracking-tight">Banking & KYC Redaction Actions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select any action to load your file directly into the local workspace</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BANK_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  onClick={() => router.push(`/workspace?tool=${tool.actionTool}`)}
                  className="p-5 bg-card border rounded-2xl hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                        {tool.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Open in Workspace</span>
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
