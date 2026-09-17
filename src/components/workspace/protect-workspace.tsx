"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { encryptPdfDocument } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Download, 
  Upload, 
  Shield, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  KeyRound,
  FileCheck,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ProtectWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');
  
  // Permissions
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowModifying, setAllowModifying] = useState(false);

  const [isEncrypting, setIsEncrypting] = useState(false);
  const [protectedBlob, setProtectedBlob] = useState<Blob | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleProtect = async () => {
    if (!file) return;
    setErrorMessage(null);

    if (!password) {
      setErrorMessage("Please provide an encryption password.");
      return;
    }
    if (password.length < 4) {
      setErrorMessage("Password should be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-type your password.");
      return;
    }

    setIsEncrypting(true);
    setProtectedBlob(null);
    setIsVerified(false);

    try {
      const buffer = await file.arrayBuffer();
      const encrypted = await encryptPdfDocument({
        pdfBuffer: buffer,
        userPassword: password,
        options: {
          algorithm,
          allowPrinting,
          allowCopying,
          allowModifying,
        },
      });

      setProtectedBlob(encrypted);
      setIsVerified(true);
    } catch (err: any) {
      console.error("Encryption failed:", err);
      setErrorMessage(err.message || "Failed to encrypt PDF.");
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDownload = () => {
    if (!protectedBlob || !file) return;
    const url = URL.createObjectURL(protectedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PDFMan_Protected_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white flex items-center justify-center shadow-lg mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Password Protect PDF</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Encrypt your PDF with standard AES-256 encryption. Set owner/user permissions for printing and copying.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-indigo-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF to Encrypt</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Standard AES-256 Cryptography &bull; Passwords never sent over network &bull; 100% Client-Side</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b px-4 flex items-center justify-between bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-xs gap-1.5"
            onClick={() => router.push("/workspace")}
          >
            <ArrowLeft className="w-4 h-4" /> Workspace
          </Button>
          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline truncate max-w-xs">
            {file.name}
          </span>
        </div>

        {protectedBlob && (
          <Button 
            size="sm" 
            onClick={handleDownload}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download Protected PDF
          </Button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center justify-center bg-muted/10">
        <div className="max-w-md w-full bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Encrypt & Protect Document</h2>
              <p className="text-xs text-muted-foreground">Standard PDF 2.0 AES-256 Encryption</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Password Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Document Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="pr-10 rounded-xl text-xs h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Confirm Password
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type document password"
                className="rounded-xl text-xs h-10"
              />
            </div>
          </div>

          {/* Algorithm Standard Selection */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              Encryption Standard
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAlgorithm('AES-256')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  algorithm === 'AES-256' ? 'border-indigo-600 bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : 'bg-muted/20'
                }`}
              >
                <div>AES-256</div>
                <div className="text-[10px] text-muted-foreground font-normal">Modern & Maximum Security</div>
              </button>

              <button
                type="button"
                onClick={() => setAlgorithm('RC4')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  algorithm === 'RC4' ? 'border-indigo-600 bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : 'bg-muted/20'
                }`}
              >
                <div>RC4 128-bit</div>
                <div className="text-[10px] text-muted-foreground font-normal">Legacy PDF 1.4 Compatibility</div>
              </button>
            </div>
          </div>

          {/* Granular Permissions */}
          <div className="pt-2 border-t space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Document Permissions
            </label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={allowPrinting} 
                  onChange={(e) => setAllowPrinting(e.target.checked)} 
                  className="rounded"
                />
                <span>Allow Printing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={allowCopying} 
                  onChange={(e) => setAllowCopying(e.target.checked)} 
                  className="rounded"
                />
                <span>Allow Copying text and graphics</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={allowModifying} 
                  onChange={(e) => setAllowModifying(e.target.checked)} 
                  className="rounded"
                />
                <span>Allow Modifying document content</span>
              </label>
            </div>
          </div>

          {/* Encryption Confirmation State */}
          {isVerified && protectedBlob && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Verified: Document protected with {algorithm}. Ready to download.</span>
            </div>
          )}

          {/* Encrypt Action */}
          <Button 
            onClick={handleProtect}
            disabled={isEncrypting || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 text-xs font-bold gap-2 shadow-sm cursor-pointer"
          >
            {isEncrypting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {isEncrypting ? "Encrypting PDF Locally..." : "Encrypt & Protect PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
