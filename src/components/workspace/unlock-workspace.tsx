"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { unlockPdfDocument } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Unlock, 
  Eye, 
  EyeOff, 
  Download, 
  Upload, 
  Shield, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  FileCheck,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

export function UnlockWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockedBlob, setUnlockedBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleUnlock = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsUnlocking(true);
    setUnlockedBlob(null);

    try {
      const buffer = await file.arrayBuffer();
      const unlocked = await unlockPdfDocument({
        pdfBuffer: buffer,
        password,
      });

      setUnlockedBlob(unlocked);
    } catch (err: any) {
      console.error("Unlock error:", err);
      if (err.name === "PasswordException" || err.message?.toLowerCase().includes("password")) {
        setErrorMessage("Incorrect password. Please verify your password and try again.");
      } else {
        setErrorMessage(err.message || "Failed to unlock document. Please check the password.");
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDownload = () => {
    if (!unlockedBlob || !file) return;
    const url = URL.createObjectURL(unlockedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PDFMan_Unlocked_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInEditor = () => {
    if (!unlockedBlob || !file) return;
    const unlockedFile = new File([unlockedBlob], `Unlocked_${file.name}`, { type: "application/pdf" });
    setFile(unlockedFile);
    router.push("/workspace");
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-lg mx-auto">
            <Unlock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Unlock Password-Protected PDF</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Remove PDF security and password restrictions for authorized users without any quality loss.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-amber-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose Protected PDF</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Authorized Decryption &bull; Zero Server Transmission &bull; 100% Client-Side</span>
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

        {unlockedBlob && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleOpenInEditor}
              className="rounded-xl text-xs font-semibold"
            >
              Open in Reader
            </Button>
            <Button 
              size="sm" 
              onClick={handleDownload}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download Unlocked PDF
            </Button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center justify-center bg-muted/10">
        <div className="max-w-md w-full bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Remove Password & Security</h2>
              <p className="text-xs text-muted-foreground">Provide authorized password to strip restrictions</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              Enter Document Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to unlock"
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

          {/* Success message */}
          {unlockedBlob && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Document decrypted and all restrictions removed. Ready to download.</span>
            </div>
          )}

          {/* Unlock Button */}
          <Button 
            onClick={handleUnlock}
            disabled={isUnlocking || !password}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11 text-xs font-bold gap-2 shadow-sm cursor-pointer"
          >
            {isUnlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            {isUnlocking ? "Verifying & Decrypting..." : "Unlock & Remove Restrictions"}
          </Button>
        </div>
      </div>
    </div>
  );
}
