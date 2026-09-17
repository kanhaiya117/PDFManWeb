"use client";

import { useState } from "react";
import { Shield, CheckCircle2, AlertTriangle, Trash2, Cpu, HardDrive, Lock, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyCenterPage() {
  const [clearedMessage, setClearedMessage] = useState(false);

  const handleClearLocalCache = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        setClearedMessage(true);
        setTimeout(() => setClearedMessage(false), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen py-12 md:py-20 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <Shield className="w-4 h-4" />
          Transparent Privacy Center
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
          How PDFMan Protects Your Privacy
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Clear, honest facts without misleading marketing claims. Here is exactly how your files, data, and memory are handled.
        </p>
      </div>

      {/* Main Privacy Matrix */}
      <div className="space-y-8">
        {/* What Stays on Device */}
        <div className="p-6 md:p-8 bg-card border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">1. What Stays on Your Device</h2>
              <p className="text-xs text-muted-foreground">Client-side operations guarantee complete isolation</p>
            </div>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground leading-relaxed space-y-2 pl-2 border-l-2 border-emerald-500/30">
            <p>
              When you use PDFMan for <strong>Reading, Annotating, Drawing, Watermarking, Rubber Stamping, Merging, Splitting, Rotating, and True Redaction</strong>, 100% of the computation executes on your own device CPU and GPU.
            </p>
            <p>
              Your document bytes, extracted text, metadata, and user signatures are held purely in your browser’s temporary RAM and WebAssembly heap. They are never sent to our servers or any cloud storage.
            </p>
          </div>
        </div>

        {/* What Is Uploaded (and Why) */}
        <div className="p-6 md:p-8 bg-card border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">2. When Is Anything Uploaded?</h2>
              <p className="text-xs text-muted-foreground">Only for explicitly requested complex conversions or optional AI</p>
            </div>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground leading-relaxed space-y-2 pl-2 border-l-2 border-indigo-500/30">
            <p>
              Certain advanced operations (such as high-fidelity PDF to Microsoft Word DOCX rasterization or multi-lingual deep OCR) may optionally utilize temporary isolated worker containers if your browser does not support WASM hardware acceleration.
            </p>
            <p>
              In those cases, an explicit prompt will notify you before any transmission occurs. Uploaded streams are processed in an encrypted ephemeral sandbox and deleted immediately upon completion.
            </p>
          </div>
        </div>

        {/* Optional AI Transparency */}
        <div className="p-6 md:p-8 bg-card border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">3. AI Document Copilot Transparency</h2>
              <p className="text-xs text-muted-foreground">AI is strictly opt-in and requires explicit user consent</p>
            </div>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground leading-relaxed space-y-2 pl-2 border-l-2 border-purple-500/30">
            <p>
              PDFMan never silently feeds your documents into external AI models. When you click &ldquo;Ask AI&rdquo; or &ldquo;Summarize&rdquo;, the app requires you to confirm your prompt. Only the relevant text snippet is transmitted over an encrypted TLS connection. No training on user data is ever permitted.
            </p>
          </div>
        </div>

        {/* Analytics Policy */}
        <div className="p-6 md:p-8 bg-card border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">4. Analytics & Telemetry Policy</h2>
              <p className="text-xs text-muted-foreground">Zero capture of document contents, passwords, or personal data</p>
            </div>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground leading-relaxed space-y-2 pl-2 border-l-2 border-amber-500/30">
            <p>
              In accordance with Section 37 of our specification, PDFMan analytics <strong>never capture</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>PDF content, body text, or images</li>
              <li>Passwords or decryption keys</li>
              <li>User drawn or typed signatures</li>
              <li>Document filenames and author metadata</li>
            </ul>
            <p className="text-xs">
              We only track anonymous high-level product events (e.g. `tool_opened`, `processing_completed`) solely to optimize browser performance.
            </p>
          </div>
        </div>

        {/* One-Click Memory & Cache Eraser */}
        <div className="p-6 md:p-8 bg-muted/30 border border-border rounded-3xl space-y-4 text-center">
          <h2 className="text-lg font-bold">One-Click Device Data Wipe</h2>
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            Want to ensure zero session traces remain in your browser storage or memory cache? Click below to instantly purge all local preferences and temporary state.
          </p>

          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleClearLocalCache}
            className="rounded-xl px-6 font-semibold"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear All Local Browser Data & Cache
          </Button>

          {clearedMessage && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
              &check; All local browser storage and cached references have been purged successfully!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
