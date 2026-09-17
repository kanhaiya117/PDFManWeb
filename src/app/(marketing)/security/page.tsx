"use client";

import { Shield, Lock, FileCheck, Cpu, AlertOctagon, Terminal, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SecurityCenterPage() {
  return (
    <div className="flex flex-col min-h-screen py-12 md:py-20 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
          <Lock className="w-4 h-4" />
          Security Architecture & Compliance
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
          PDFMan Security Center
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          How PDFMan isolates documents, neutralizes malicious PDF exploits, and secures enterprise workflows.
        </p>
      </div>

      {/* Security Architecture Pillars */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-6 bg-card border rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Magic-Byte Header Validation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We verify file headers against binary magic signatures (`%PDF-1.x`). Files masquerading as PDFs with executable polyglots or shell scripts are rejected before parser execution.
            </p>
          </div>

          <div className="p-6 bg-card border rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Sandboxed Web Worker Execution</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PDF.js and WASM engines run inside isolated Web Worker scopes with disabled DOM and script execution privileges, neutralizing embedded JavaScript attacks inside untrusted PDFs.
            </p>
          </div>

          <div className="p-6 bg-card border rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Strict Content Security Policy (CSP)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enforced strict CSP directives, `X-Content-Type-Options: nosniff`, and sandbox iframe headers prevent cross-site scripting (XSS) and clickjacking attacks.
            </p>
          </div>

          <div className="p-6 bg-card border rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Client-Side AES Encryption</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When password protecting documents, PDFMan applies AES-256 standard encryption natively in client memory. Your passwords are never transmitted or logged.
            </p>
          </div>
        </div>

        {/* Security Testing Matrix */}
        <div className="p-6 md:p-8 bg-card border rounded-3xl space-y-4">
          <h2 className="text-lg font-bold">Security Testing Matrix (Section 51)</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Our continuous integration pipeline subjects PDFMan to automated test suites covering malformed inputs, edge cases, and attack vectors:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {[
              "Malformed / Corrupted PDFs",
              "Oversized 1GB+ files",
              "Invalid MIME type payloads",
              "Polyglot executable files",
              "Embedded PDF JavaScript traps",
              "ZIP Bomb / Decompression bombs",
              "XSS Injection vectors",
              "SSRF / Network exfiltration",
              "Memory leak thresholds",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible Disclosure */}
        <div id="disclosure" className="p-6 md:p-8 bg-muted/30 border rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Responsible Vulnerability Disclosure</h2>
              <p className="text-xs text-muted-foreground">We value bug bounty hunters and cybersecurity researchers</p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            If you discover a security vulnerability, please notify our security team directly. We commit to acknowledging reports within 24 hours and releasing fixes within coordinated timeframes.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              security@pdfman.app
            </Button>
            <span className="text-xs text-muted-foreground">PGP Key ID: `4A9F 821E B309 67D2`</span>
          </div>
        </div>
      </div>
    </div>
  );
}
