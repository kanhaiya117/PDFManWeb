"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  ChevronDown, 
  Layers, 
  Split, 
  Minimize2, 
  PenTool, 
  FileSignature, 
  EyeOff, 
  Droplets, 
  RotateCw, 
  Sparkles,
  Command,
  Landmark,
  Building2,
  ScanLine,
  Lock,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Search
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Notification / Trust Announcement Bar */}
      <div className="bg-indigo-950/95 text-indigo-200 text-xs py-1.5 px-4 text-center border-b border-indigo-900/50 hidden md:flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Zero Cloud Uploads: Your PDFs are processed 100% locally on your device
        </span>
        <span className="text-indigo-400/40">&bull;</span>
        <Link href="/privacy-center" className="underline hover:text-white transition-colors font-medium">
          Explore Privacy Architecture
        </Link>
      </div>

      {/* Unique, Spacious, Premium Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-2xs">
        <div className="container mx-auto flex h-[72px] items-center justify-between px-4 md:px-6 lg:px-8 max-w-7xl">
          {/* Brand Logo with Unique Shield Emblem */}
          <div className="flex items-center gap-4 xl:gap-8 min-w-0 shrink-0">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 group-hover:shadow-indigo-500/30 transition-all duration-200">
                <Shield className="w-5 h-5 fill-white/25 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-tight leading-none text-foreground">
                    PDF<span className="text-indigo-600 dark:text-indigo-400">Man</span>
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    LOCAL
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wide uppercase mt-0.5">
                  Private &bull; Fast &bull; Secure
                </span>
              </div>
            </Link>

            {/* Quick Links Navigation with Comfortable Spacing - All in ONE line */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium whitespace-nowrap shrink-0">
              <Link 
                href="/workspace?tool=merge-pdf" 
                className="whitespace-nowrap shrink-0 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
              >
                Merge
              </Link>
              <Link 
                href="/workspace?tool=split-pdf" 
                className="whitespace-nowrap shrink-0 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
              >
                Split
              </Link>
              <Link 
                href="/workspace?tool=compress-pdf" 
                className="whitespace-nowrap shrink-0 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
              >
                Compress
              </Link>
              <Link 
                href="/workspace?tool=sign-pdf" 
                className="whitespace-nowrap shrink-0 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
              >
                Sign
              </Link>
              <Link 
                href="/workspace?tool=edit-pdf" 
                className="whitespace-nowrap shrink-0 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
              >
                Edit & Annotate
              </Link>

              {/* Specialized Modes Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer outline-none">
                  <span className="whitespace-nowrap">Specialized Modes</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[340px] p-2.5 text-xs shadow-xl rounded-xl">
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 px-2">
                    Compliance & Sector Suites
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push('/government')} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted cursor-pointer">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Government PDF Tools</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Form filler, stamps, PDF/A preservation & print flattening</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/banking')} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted cursor-pointer">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Banking & KYC Suite</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Statement inspection, PAN, Aadhaar & Account number redaction</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* All Tools Mega Dropdown — Cleaned of duplicates */}
              <DropdownMenu>
                <DropdownMenuTrigger className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer outline-none">
                  <span className="whitespace-nowrap">All Tools</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[620px] p-4 grid grid-cols-3 gap-4 text-xs shadow-2xl rounded-2xl">
                  <div>
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Organize & Pages
                    </DropdownMenuLabel>
                    <div className="space-y-1">
                      <Link href="/workspace?tool=organize-pdf" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <RotateCw className="w-4 h-4 text-cyan-500" />
                        <span className="font-medium text-xs">Organize Pages</span>
                      </Link>
                      <Link href="/rotate-pdf" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <RotateCw className="w-4 h-4 text-teal-500" />
                        <span className="font-medium text-xs">Rotate PDF</span>
                      </Link>
                      <Link href="/extract-pages" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium text-xs">Extract Pages</span>
                      </Link>
                      <Link href="/delete-pages" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <Split className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-xs">Delete Pages</span>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Protect & Redact
                    </DropdownMenuLabel>
                    <div className="space-y-1">
                      <Link href="/workspace?tool=redact-pdf" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <EyeOff className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                        <span className="font-medium text-xs">True Redaction</span>
                      </Link>
                      <Link href="/workspace?tool=watermark-pdf" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-xs">Watermark</span>
                      </Link>
                      <Link href="/workspace?tool=protect-pdf" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <Lock className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium text-xs">AES Protect</span>
                      </Link>
                      <Link href="/remove-metadata" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <PenTool className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-xs">Remove Metadata</span>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Convert & Intelligence
                    </DropdownMenuLabel>
                    <div className="space-y-1">
                      <Link href="/workspace?tool=ocr-pdf" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <ScanLine className="w-4 h-4 text-teal-600" />
                        <span className="font-medium text-xs">OCR Scanner</span>
                      </Link>
                      <Link href="/workspace?tool=pdf-to-word" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <FileCheck2 className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-xs">PDF to Word</span>
                      </Link>
                      <Link href="/pdf-to-excel" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <FileSignature className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-xs">PDF to Excel</span>
                      </Link>
                      <Link href="/workspace?tool=ask-pdf" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                        <Sparkles className="w-4 h-4 text-fuchsia-500" />
                        <span className="font-medium text-xs">AI Copilot</span>
                      </Link>
                    </div>
                  </div>

                  <div className="col-span-3 pt-3 mt-1 border-t flex items-center justify-between">
                    <a href="#tools" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                      <span>Explore All 26 Document Utilities &rarr;</span>
                    </a>
                    <Link href="/privacy-center" className="text-xs text-muted-foreground hover:text-foreground">
                      Privacy Center &rarr;
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link 
                href="/pricing" 
                className="whitespace-nowrap shrink-0 px-2.5 xl:px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
              >
                Pricing
              </Link>
            </nav>
          </div>

          {/* Action CTAs — Generous, Uncompacted Buttons with 2-3px increased padding */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Search Button (< sm) */}
            <button
              onClick={openCommandPalette}
              className="flex sm:hidden items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border/80 transition-all cursor-pointer"
              aria-label="Search tools"
              title="Search tools"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Search Tools Button (sm+) */}
            <button
              onClick={openCommandPalette}
              className="hidden sm:flex items-center gap-2.5 h-10 sm:h-10.5 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border/80 rounded-xl transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              title="Command Palette (Ctrl + K)"
            >
              <Command className="w-3.5 h-3.5" />
              <span>Search tools</span>
              <kbd className="text-[10px] bg-background border px-1.5 py-0.5 rounded-md font-mono">⌘K</kbd>
            </button>

            <ThemeToggle />

            {/* Prominent Workspace Button with increased padding */}
            <Link href="/workspace" className="hidden sm:block shrink-0">
              <Button size="default" className="h-10 sm:h-10.5 px-6 sm:px-7 py-2.5 rounded-full text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap">
                Open Workspace
              </Button>
            </Link>

            {/* Mobile Hamburger Toggle Button (< lg) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex lg:hidden items-center justify-center w-10 h-10 rounded-xl text-foreground hover:bg-muted border border-border/80 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-sm ml-auto h-full bg-background border-l shadow-2xl flex flex-col overflow-y-auto z-10 animate-in slide-in-from-right duration-200">
            {/* Mobile Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <Link 
                href="/" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4 fill-white/20" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-base tracking-tight text-foreground leading-none">
                    PDF<span className="text-indigo-600 dark:text-indigo-400">Man</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                    100% Local PDF Engine
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 space-y-5 flex-1">
              {/* Workspace CTA Button on Mobile */}
              <Link 
                href="/workspace"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full"
              >
                <Button className="w-full h-12 px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 text-base flex items-center justify-center gap-2 cursor-pointer">
                  Open PDF Workspace &rarr;
                </Button>
              </Link>

              {/* Search trigger inside menu */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openCommandPalette();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border/80 rounded-xl transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-500" />
                  <span>Search all 34 tools...</span>
                </span>
                <kbd className="text-[10px] bg-background border px-1.5 py-0.5 rounded-md font-mono">⌘K</kbd>
              </button>

              {/* Quick Core Tools */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Core Tools
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/workspace?tool=merge-pdf"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card hover:border-indigo-500/50 hover:bg-muted/50 text-xs font-semibold transition-all"
                  >
                    <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Merge</span>
                  </Link>
                  <Link
                    href="/workspace?tool=edit-pdf"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card hover:border-indigo-500/50 hover:bg-muted/50 text-xs font-semibold transition-all"
                  >
                    <PenTool className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Edit</span>
                  </Link>
                  <Link
                    href="/workspace?tool=compress-pdf"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card hover:border-emerald-500/50 hover:bg-muted/50 text-xs font-semibold transition-all"
                  >
                    <Minimize2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Compress</span>
                  </Link>
                  <Link
                    href="/workspace?tool=sign-pdf"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card hover:border-teal-500/50 hover:bg-muted/50 text-xs font-semibold transition-all"
                  >
                    <FileSignature className="w-4 h-4 text-teal-500 shrink-0" />
                    <span>Sign</span>
                  </Link>
                </div>
              </div>

              {/* Specialized Modes */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Specialized Compliance Suites
                </p>
                <div className="space-y-2">
                  <Link
                    href="/government"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl border bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/20 text-xs font-semibold transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">Government Mode</div>
                        <div className="text-[10px] text-muted-foreground font-normal">Official stamps & affidavit filler</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/banking"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl border bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-xs font-semibold transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">Banking & KYC Suite</div>
                        <div className="text-[10px] text-muted-foreground font-normal">PAN & Aadhaar masking</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                </div>
              </div>

              {/* More Navigation & Tools Directory */}
              <div className="pt-3 border-t space-y-1.5 text-sm font-medium">
                <Link
                  href="/#tools"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-muted text-foreground text-xs transition-colors"
                >
                  <span className="font-semibold">Browse All 34 PDF Tools</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border font-bold">34 Tools</span>
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-muted text-foreground text-xs transition-colors"
                >
                  <span className="font-semibold">Pricing & Plans</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Free local tier</span>
                </Link>
                <Link
                  href="/privacy-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-muted text-foreground text-xs transition-colors"
                >
                  <span className="font-semibold">Privacy Architecture</span>
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                </Link>
                <Link
                  href="/security"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-muted text-foreground text-xs transition-colors"
                >
                  <span className="font-semibold">Security Center</span>
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                </Link>
              </div>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="p-4 border-t bg-muted/20 text-center text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Client-Side &bull; Zero Cloud Uploads</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Body */}
      <main className="flex-1">
        {children}
      </main>

      {/* 12. COMPREHENSIVE FOOTER (Section 54 from Spec) */}
      <footer className="border-t bg-muted/30 text-muted-foreground text-xs py-14">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black">
                  <Shield className="w-4 h-4 fill-white/20" />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-foreground">
                  PDF<span className="text-indigo-600 dark:text-indigo-400">Man</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                Advanced production-grade PDF platform designed with a local-first, privacy-by-default architecture. Read, annotate, sign, and organize documents directly on your device.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 w-fit px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% Client-Side Processing for standard operations
              </div>
            </div>

            {/* Core Tools */}
            <div>
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">Core Utilities</h4>
              <ul className="space-y-2">
                <li><Link href="/workspace?tool=merge-pdf" className="hover:text-foreground transition-colors">Merge PDF</Link></li>
                <li><Link href="/workspace?tool=split-pdf" className="hover:text-foreground transition-colors">Split & Extract</Link></li>
                <li><Link href="/workspace?tool=compress-pdf" className="hover:text-foreground transition-colors">Compress & Optimize</Link></li>
                <li><Link href="/workspace?tool=organize-pdf" className="hover:text-foreground transition-colors">Organize Pages</Link></li>
                <li><Link href="/workspace?tool=rotate-pdf" className="hover:text-foreground transition-colors">Rotate Pages</Link></li>
                <li><Link href="/workspace?tool=pdf-to-word" className="hover:text-foreground transition-colors">PDF to Word</Link></li>
              </ul>
            </div>

            {/* Security & Modes */}
            <div>
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">Modes & Security</h4>
              <ul className="space-y-2">
                <li><Link href="/government" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Government Mode</Link></li>
                <li><Link href="/banking" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Banking & KYC Mode</Link></li>
                <li><Link href="/workspace?tool=redact-pdf" className="hover:text-foreground transition-colors">True Redaction</Link></li>
                <li><Link href="/workspace?tool=protect-pdf" className="hover:text-foreground transition-colors">AES Password Protect</Link></li>
                <li><Link href="/privacy-center" className="hover:text-foreground transition-colors">Privacy Center</Link></li>
                <li><Link href="/security" className="hover:text-foreground transition-colors">Security Center</Link></li>
              </ul>
            </div>

            {/* Enterprise & Legal */}
            <div>
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">Trust & Policies</h4>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing & Plans</Link></li>
                <li><Link href="/admin" className="hover:text-foreground transition-colors">Enterprise Admin</Link></li>
                <li><Link href="/security#disclosure" className="hover:text-foreground transition-colors">Responsible Disclosure</Link></li>
                <li><Link href="/privacy-center#data" className="hover:text-foreground transition-colors">Data Retention Rules</Link></li>
                <li><Link href="/privacy-center#wcag" className="hover:text-foreground transition-colors">WCAG 2.2 AA Accessibility</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} PDFMan. Built with privacy-first document architecture. Not affiliated with Adobe or iLovePDF.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy-center" className="hover:underline">Privacy</Link>
              <Link href="/security" className="hover:underline">Security</Link>
              <Link href="/government" className="hover:underline">Government</Link>
              <Link href="/banking" className="hover:underline">Banking</Link>
              <Link href="/pricing" className="hover:underline">Pricing</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

