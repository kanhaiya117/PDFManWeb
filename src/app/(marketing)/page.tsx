"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Upload, 
  Shield, 
  Zap, 
  Lock, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  Cpu, 
  FileCheck, 
  ArrowRight,
  Landmark,
  Building2,
  HardDrive,
  Eye,
  Globe2
} from "lucide-react";
import { PDF_TOOLS, PDF_CATEGORIES, PDFTool } from "@/lib/tools-data";
import { ToolIcon } from "@/components/tool-icon";
import { useWorkspaceStore } from "@/store/workspace";

// Tools already prominently present on the top navigation bar
const TOP_MENU_TOOL_IDS = new Set([
  'search-pdf',
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'edit-pdf',
  'sign-pdf',
  'government-mode',
  'banking-mode',
]);

export default function HomePage() {
  const router = useRouter();
  const { setFile } = useWorkspaceStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Filter out tools already present in the top menu to eliminate duplication
  const directoryTools = PDF_TOOLS.filter((tool) => !TOP_MENU_TOOL_IDS.has(tool.id));

  const filteredTools = directoryTools.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCategories = PDF_CATEGORIES.filter((cat) => {
    if (cat.id === 'all') return true;
    return directoryTools.some((t) => t.category === cat.id);
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      router.push('/workspace');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      router.push('/workspace');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION (Small refined title, Original Dropzone) */}
      <section className="relative overflow-hidden pt-8 pb-10 md:pt-12 md:pb-12 bg-gradient-to-b from-indigo-500/5 via-background to-background border-b">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            100% In-Browser & Local-First Processing
          </div>

          {/* Small, Refined, Proportional Title */}
          <h1 className="text-2xl sm:text-3xl md:text-[34px] font-extrabold tracking-tight text-foreground max-w-2xl mx-auto leading-snug">
            Every tool you need for PDFs. <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500">
              Fast. Private. Secure.
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto font-normal leading-relaxed">
            Read, edit, annotate, sign, and manage your PDFs directly in your browser. No file uploads. No privacy compromises.
          </p>

          {/* Primary and Secondary Action Buttons */}
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <Button 
              size="default" 
              onClick={() => router.push('/workspace')} 
              className="h-11 sm:h-12 px-7 sm:px-8 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer"
            >
              Open PDF Document
            </Button>
            <a href="#tools">
              <Button 
                variant="outline" 
                size="default" 
                className="h-11 sm:h-12 px-6 sm:px-7 py-3 rounded-xl text-sm font-semibold border-muted-foreground/30 hover:bg-muted/80 cursor-pointer transition-all"
              >
                Explore All Tools
              </Button>
            </a>
            <Link href="/government">
              <Button 
                variant="outline" 
                size="default" 
                className="h-11 sm:h-12 px-5 sm:px-6 py-3 rounded-xl text-sm font-semibold border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:border-indigo-500/50 cursor-pointer transition-all flex items-center gap-2 shadow-2xs"
              >
                <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Government Tools</span>
              </Button>
            </Link>
            <Link href="/banking">
              <Button 
                variant="outline" 
                size="default" 
                className="h-11 sm:h-12 px-5 sm:px-6 py-3 rounded-xl text-sm font-semibold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center gap-2 shadow-2xs"
              >
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Banking & KYC</span>
              </Button>
            </Link>
          </div>

          {/* 2. ORIGINAL MAIN PDF UPLOAD DROPZONE */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl p-8 md:p-12 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg ${
                isDragging 
                  ? 'border-indigo-600 bg-indigo-500/10 scale-[1.01]' 
                  : 'border-border/80 hover:border-indigo-500/60 bg-card'
              }`}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Choose PDF"
              />
              
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg text-white mb-4 transform transition-transform group-hover:scale-105">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-1 tracking-tight text-foreground">
                  Drop your PDF here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to choose file from your device
                </p>
                
                <Button size="lg" className="rounded-xl px-8 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer">
                  Choose PDF
                </Button>

                <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Your file stays on your device whenever possible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. UNIFIED PDF TOOL DIRECTORY (NO DUPLICATE TILES) */}
      <section id="tools" className="py-10 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Specialized Document Tools</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredTools.length} utilities &bull; Client-side execution &bull; Zero upload queues
              </p>
            </div>

            {/* Quick Command Palette trigger — No duplicate search input */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-muted/40 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-2xs"
                title="Search all tools (Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Quick search all tools...</span>
                <kbd className="text-[10px] font-mono border rounded px-1.5 py-0.5 bg-background">⌘K</kbd>
              </button>
            </div>
          </div>

          {/* Category Tabs — Cleaned of duplicate top-menu categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 no-scrollbar">
            {activeCategories.map((cat) => {
              const count = cat.id === 'all' 
                ? directoryTools.length 
                : directoryTools.filter(t => t.category === cat.id).length;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-xl text-xs font-semibold px-3 h-7.5 shrink-0 transition-all cursor-pointer ${
                    selectedCategory === cat.id 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Comprehensive Unique Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredTools.map((tool) => (
              <Link
                key={tool.id}
                href={`/${tool.id}`}
                className="group p-4 bg-card border rounded-xl hover:border-indigo-500/50 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tool.color} text-white flex items-center justify-center shadow-xs`}>
                      <ToolIcon name={tool.icon} className="w-4.5 h-4.5" />
                    </div>
                    {tool.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground/80">{tool.category}</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">Use &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW PDFMAN WORKS (Local-First Architecture) */}
      <section className="py-12 bg-card border-y">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5" /> Architecture Principle
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">How PDFMan Works</h2>
            <p className="text-muted-foreground text-xs mt-1">Zero cloud uploads for standard document operations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col items-center text-center p-5 rounded-xl bg-muted/20 border border-border/80">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base mb-3">
                1
              </div>
              <h3 className="font-bold text-sm mb-1">Local PDF Stream</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your file is decoded directly inside the browser using WebAssembly. The binary bytes never cross the network.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-5 rounded-xl bg-muted/20 border border-border/80">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-base mb-3">
                2
              </div>
              <h3 className="font-bold text-sm mb-1">Web Worker Processing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Annotations, stamps, true redactions, and page reorganization execute in background threads without blocking your UI.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-5 rounded-xl bg-muted/20 border border-border/80">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-base mb-3">
                3
              </div>
              <h3 className="font-bold text-sm mb-1">Instant Local Export</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The updated PDF is generated in client memory and saved directly to your downloads. Zero trace left behind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRIVACY-FIRST SECTION */}
      <section className="py-12 bg-muted/10 border-b">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
                <Shield className="w-3.5 h-3.5" /> Privacy By Design
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight leading-tight">
                Your sensitive files never touch foreign servers.
              </h2>
              <p className="text-muted-foreground text-xs mt-3 leading-relaxed">
                Traditional PDF web tools upload sensitive banking statements, government affidavits, and confidential contracts to remote servers. PDFMan replaces this with client-side Web Workers and WebAssembly.
              </p>
              
              <ul className="mt-5 space-y-2">
                {[
                  '100% Client-side reader and editing engine',
                  'Zero document logs, text scrapers, or telemetry',
                  'Sandboxed memory isolation prevents leaks',
                  'Full functionality even completely offline',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                <Link href="/privacy-center">
                  <Button variant="outline" size="sm" className="text-xs font-semibold h-8">
                    Read our Privacy Center &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-card border space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b">
                <span className="text-xs font-semibold">Traditional Cloud PDF Tools</span>
                <span className="text-xs font-semibold text-rose-500">High Risk & Exposure</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono space-y-1">
                <div>Client &rarr; <span className="text-rose-500 font-bold">Unencrypted Cloud Upload</span> &rarr; Server Disk &rarr; Processing Queue &rarr; Re-download</div>
              </div>

              <div className="flex items-center justify-between pt-3 pb-2.5 border-b">
                <span className="text-xs font-semibold">PDFMan Local Architecture</span>
                <span className="text-xs font-semibold text-emerald-600">Zero Attack Surface</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono space-y-1">
                <div>Client Browser &rarr; <span className="text-emerald-600 dark:text-emerald-400 font-bold">Isolated WebAssembly</span> &rarr; Local Memory &rarr; Instant Save</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MULTI-LAYER SECURITY SECTION */}
      <section className="py-12 bg-card border-b">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
              <Lock className="w-3.5 h-3.5" /> Enterprise Grade
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Multi-Layer Document Security</h2>
            <p className="text-muted-foreground text-xs mt-1">
              PDFMan uses multiple security checks to protect you from unsafe documents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4.5 bg-muted/20 border rounded-xl">
              <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2.5" />
              <h3 className="font-bold text-sm mb-1">Magic-Byte Verification</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Validates the file header against true PDF byte signatures to block polyglot exploits and renamed binaries.
              </p>
            </div>

            <div className="p-4.5 bg-muted/20 border rounded-xl">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2.5" />
              <h3 className="font-bold text-sm mb-1">Sandboxed Workers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                PDF parsing runs in an isolated Web Worker, shielding your main browser thread and session storage.
              </p>
            </div>

            <div className="p-4.5 bg-muted/20 border rounded-xl">
              <Eye className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-2.5" />
              <h3 className="font-bold text-sm mb-1">True Redaction</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Underlying vector paths and text data are purged from the PDF object stream, not just covered with a black shape.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. GOVERNMENT & BANKING SPECIALIZED SUITES */}
      <section id="sectors" className="py-12 bg-muted/20 border-b scroll-mt-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Specialized Sector Workflows</h2>
            <p className="text-muted-foreground text-xs mt-1">
              Dedicated portals designed for official government filings and banking compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Government Card */}
            <div className="p-5 bg-card border rounded-xl flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Government PDF Tools</h3>
                    <p className="text-[11px] text-muted-foreground">For public servants, contractors, and citizens</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Fill standardized government forms, place authentic rubber stamps (APPROVED, OFFICIAL COPY), flatten documents for printing, and convert to ISO PDF/A long-term archival format.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {['Official Rubber Stamps', 'PDF/A Preservation', 'Print Flattening', 'Metadata Scrubbing'].map((tag, i) => (
                    <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/government">
                <Button className="w-full h-8.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Enter Government Portal &rarr;
                </Button>
              </Link>
            </div>

            {/* Banking Card */}
            <div className="p-5 bg-card border rounded-xl flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Banking & KYC Suite</h3>
                    <p className="text-[11px] text-muted-foreground">For financial analysts, auditors, and account holders</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Inspect bank statements with dedicated redaction presets for Indian PAN cards, Aadhaar numbers, account numbers, and IFSC codes. Add confidential watermarks before external sharing.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {['PAN Masking', 'Aadhaar Redaction', 'Account # Blackout', 'Watermark'].map((tag, i) => (
                    <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/banking">
                <Button className="w-full h-8.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  Enter Banking & KYC Suite &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PERFORMANCE STATS */}
      <section className="py-10 border-b bg-muted/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3.5 bg-card border rounded-xl">
              <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
              <div className="text-xl font-extrabold">&lt; 1.2s</div>
              <div className="text-[11px] text-muted-foreground">Core Web Vitals LCP</div>
            </div>
            <div className="p-3.5 bg-card border rounded-xl">
              <Cpu className="w-5 h-5 text-indigo-500 mx-auto mb-1.5" />
              <div className="text-xl font-extrabold">Virtualized</div>
              <div className="text-[11px] text-muted-foreground">Smooth on 500+ Pages</div>
            </div>
            <div className="p-3.5 bg-card border rounded-xl">
              <Globe2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
              <div className="text-xl font-extrabold">Cross-Browser</div>
              <div className="text-[11px] text-muted-foreground">Chrome, Edge, Safari, Firefox</div>
            </div>
            <div className="p-3.5 bg-card border rounded-xl">
              <HardDrive className="w-5 h-5 text-cyan-500 mx-auto mb-1.5" />
              <div className="text-xl font-extrabold">0 KB Upload</div>
              <div className="text-[11px] text-muted-foreground">Your files stay on device</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section className="py-12 bg-card">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-xs mt-1">Answers regarding privacy, performance, and compliance</p>
          </div>

          <Accordion className="w-full space-y-2.5">
            <AccordionItem value="faq-1" className="bg-muted/20 border rounded-xl px-4">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                How does PDFMan guarantee my files are not uploaded?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                PDFMan is designed on a strict local-first architecture. All standard viewing, text annotations, digital signatures, rubber stamps, page reorganizations, and redactions are computed on your device using WebAssembly (via pdf-lib and PDF.js). You can verify this by inspecting your browser’s Network tab—no document payloads are sent over the wire.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="bg-muted/20 border rounded-xl px-4">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                How is PDFMan different from iLovePDF?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                While iLovePDF processes documents by uploading them to centralized cloud servers with variable retention periods, PDFMan executes operations locally whenever possible. PDFMan also provides a comprehensive Adobe Acrobat-style desktop reader with virtualized rendering, specialized Government and Banking modes, and zero requirement to create an account or provide payment details for core reading.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="bg-muted/20 border rounded-xl px-4">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                What is the difference between visual signatures and cryptographic certificates?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                PDFMan clearly distinguishes between visual signatures (drawn, typed, or uploaded signature marks stamped onto the document) and cryptographic PKI digital signatures. Our visual signatures are intended for approvals, forms, and general agreements without claiming unsupported legal PKI certification.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="bg-muted/20 border rounded-xl px-4">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                How does True Redaction work?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Unlike simple tools that merely draw a black box over existing text (allowing malicious actors to highlight or extract the text underneath), PDFMan permanently scrubs the underlying text elements and coordinate objects from the exported PDF stream.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="bg-muted/20 border rounded-xl px-4">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                Can I process large documents with 500+ pages?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Yes. PDFMan employs progressive page virtualization via TanStack Virtual. Only the pages within your current screen viewport are rendered into memory, while unviewed pages remain as compressed binary streams.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
