"use client";

import Link from "next/link";
import { Check, Shield, Sparkles, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen py-12 md:py-20 px-4 max-w-6xl mx-auto">
      {/* Heading */}
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Transparent, Fair Pricing
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Free Forever for Local Reading & Basic Tools
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          No aggressive paywalls on the reader. Only pay if you need cloud batch conversions, enterprise SSO, or multi-seat audit controls.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FREE TIER */}
        <div className="p-7 bg-card border rounded-3xl flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Starter</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                No Login Required
              </span>
            </div>
            <h3 className="text-2xl font-black">Free</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              Complete local-first PDF reading and everyday workspace tools.
            </p>

            <div className="text-3xl font-black mb-6">
              $0 <span className="text-xs font-normal text-muted-foreground">/ month</span>
            </div>

            <ul className="space-y-3 text-xs text-muted-foreground border-t pt-6 mb-8">
              {[
                "Unlimited High-Speed Local PDF Reader",
                "Text annotations, drawing, and highlighters",
                "Merge, Split, Rotate, and Organize pages",
                "Visual signatures and official rubber stamps",
                "True permanent content redaction",
                "Client-side AES password protection",
                "100% in-browser offline capability",
              ].map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/workspace">
            <Button variant="outline" className="w-full h-11 font-semibold rounded-xl text-sm hover:bg-muted transition-all cursor-pointer">
              Start Using Free
            </Button>
          </Link>
        </div>

        {/* PRO TIER */}
        <div className="p-7 bg-card border-2 border-indigo-600 rounded-3xl flex flex-col justify-between shadow-lg relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Professional</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Power Users
              </span>
            </div>
            <h3 className="text-2xl font-black">Pro</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              For professionals handling complex legal scans, OCR, and document intelligence.
            </p>

            <div className="text-3xl font-black mb-6">
              $9 <span className="text-xs font-normal text-muted-foreground">/ month</span>
            </div>

            <ul className="space-y-3 text-xs text-muted-foreground border-t pt-6 mb-8">
              {[
                "Everything in Free Tier",
                "Deep multi-lingual OCR (English, Hindi, Gujarati, etc.)",
                "High-fidelity Word, Excel & PowerPoint conversion",
                "AI Document Copilot: Q&A, Summaries & Clause verification",
                "Automated Banking & KYC Redaction Presets",
                "Batch processing for up to 50 files simultaneously",
                "Priority worker execution queue",
              ].map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/workspace">
            <Button className="w-full h-11 font-bold rounded-xl text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer">
              Upgrade to Pro
            </Button>
          </Link>
        </div>

        {/* ENTERPRISE TIER */}
        <div className="p-7 bg-card border rounded-3xl flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Organization</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Enterprise
              </span>
            </div>
            <h3 className="text-2xl font-black">Enterprise</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              For banks, governments, and regulated enterprises requiring dedicated infrastructure.
            </p>

            <div className="text-3xl font-black mb-6">
              Custom <span className="text-xs font-normal text-muted-foreground">/ volume</span>
            </div>

            <ul className="space-y-3 text-xs text-muted-foreground border-t pt-6 mb-8">
              {[
                "Everything in Pro Tier",
                "Microsoft Entra ID, Okta & SAML 2.0 Single Sign-On (SSO)",
                "Granular Role-Based Access Control (RBAC)",
                "Immutable Audit Logging & Retention Policy enforcement",
                "Dedicated regional processing clusters",
                "On-Premise / Private VPC deployment option",
                "Custom security review & SLA guarantees",
              ].map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/admin">
            <Button variant="outline" className="w-full h-11 font-semibold rounded-xl text-sm hover:bg-muted transition-all cursor-pointer">
              Contact Enterprise Sales
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
