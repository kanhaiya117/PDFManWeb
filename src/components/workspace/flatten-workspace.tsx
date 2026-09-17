"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { flattenPdfDocument } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { 
  FileDown, 
  Download, 
  Upload, 
  Shield, 
  CheckCircle2, 
  Loader2, 
  CheckSquare, 
  PenTool, 
  Layers, 
  ArrowLeft 
} from "lucide-react";
import { useRouter } from "next/navigation";

export function FlattenWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [flattenMode, setFlattenMode] = useState<'forms' | 'annotations' | 'all'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [flattenedBlob, setFlattenedBlob] = useState<Blob | null>(null);
  const router = useRouter();

  const handleFlatten = async () => {
    if (!file) return;
    setIsProcessing(true);
    setFlattenedBlob(null);

    try {
      const buffer = await file.arrayBuffer();
      const output = await flattenPdfDocument({
        pdfBuffer: buffer,
        mode: flattenMode,
      });

      setFlattenedBlob(output);
    } catch (err: any) {
      console.error("Flattening error:", err);
      alert("Failed to flatten PDF: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!flattenedBlob || !file) return;
    const url = URL.createObjectURL(flattenedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PDFMan_Flattened_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white flex items-center justify-center shadow-lg mx-auto">
            <FileDown className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Flatten PDF Document</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Permanently convert form fields, signatures, and annotations into unalterable, locked native page vectors.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-blue-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF to Flatten</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Preserves exact visual fidelity &bull; Prevents subsequent tampering &bull; 100% Client-Side</span>
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

        {flattenedBlob && (
          <Button 
            size="sm" 
            onClick={handleDownload}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download Flattened PDF
          </Button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center justify-center bg-muted/10">
        <div className="max-w-xl w-full bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-base">Select Flattening Strategy</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Choose which interactive components should be locked permanently into the PDF layer.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'all' as const,
                title: 'Flatten Everything Supported (Recommended)',
                desc: 'Seals interactive form fields, checkboxes, dropdowns, signatures, stamps, and annotations into static content.',
                icon: Layers,
              },
              {
                id: 'forms' as const,
                title: 'Flatten Forms Only',
                desc: 'Converts interactive AcroForm fields into flat text. Keeps markup annotations and highlights editable.',
                icon: CheckSquare,
              },
              {
                id: 'annotations' as const,
                title: 'Flatten Annotations Only',
                desc: 'Bakes highlighters, drawings, and notes into the document. Keeps interactive AcroForms fillable.',
                icon: PenTool,
              },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = flattenMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setFlattenMode(opt.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                    isSelected ? 'border-indigo-600 bg-indigo-500/10 shadow-xs ring-1 ring-indigo-500/30' : 'hover:border-muted-foreground/40 bg-card'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">{opt.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {flattenedBlob && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Document successfully flattened with {flattenMode} mode. Ready to download.</span>
            </div>
          )}

          <Button 
            onClick={handleFlatten}
            disabled={isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 text-xs font-bold gap-2 shadow-sm cursor-pointer"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isProcessing ? "Flattening Document..." : "Flatten & Seal Document"}
          </Button>
        </div>
      </div>
    </div>
  );
}
