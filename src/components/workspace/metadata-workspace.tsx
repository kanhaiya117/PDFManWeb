"use client";

import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { DocumentMetadataReport, inspectMetadata, cleanOrUpdateMetadata } from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldOff, 
  Download, 
  Upload, 
  Shield, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Save, 
  FileText,
  ArrowLeft 
} from "lucide-react";
import { useRouter } from "next/navigation";

export function MetadataWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [report, setReport] = useState<DocumentMetadataReport | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [creator, setCreator] = useState("");
  const [producer, setProducer] = useState("");
  const [keywords, setKeywords] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [sanitizedBlob, setSanitizedBlob] = useState<Blob | null>(null);
  const [isStripped, setIsStripped] = useState(false);
  const router = useRouter();

  // Load and inspect metadata
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    const inspect = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const meta = await inspectMetadata(buffer);
        if (isMounted) {
          setReport(meta);
          setTitle(meta.title);
          setAuthor(meta.author);
          setSubject(meta.subject);
          setCreator(meta.creator);
          setProducer(meta.producer);
          setKeywords((meta.keywords || []).join(", "));
        }
      } catch (err) {
        console.error("Metadata inspection error:", err);
      }
    };

    inspect();
    return () => { isMounted = false; };
  }, [file]);

  // Strip all metadata (1-click sanitization)
  const handleStripAll = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const output = await cleanOrUpdateMetadata({
        pdfBuffer: buffer,
        stripAll: true,
      });

      setSanitizedBlob(output);
      setIsStripped(true);
      setTitle("");
      setAuthor("");
      setSubject("");
      setCreator("PDFMan (Sanitized)");
      setProducer("PDFMan Sanitization Engine");
      setKeywords("");
    } catch (err: any) {
      console.error("Strip metadata failed:", err);
      alert("Failed to strip metadata: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save custom metadata updates
  const handleSaveCustom = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const output = await cleanOrUpdateMetadata({
        pdfBuffer: buffer,
        updates: {
          title,
          author,
          subject,
          creator,
          producer,
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
        },
        stripAll: false,
      });

      setSanitizedBlob(output);
      setIsStripped(false);
    } catch (err: any) {
      console.error("Metadata update failed:", err);
      alert("Failed to update metadata: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!sanitizedBlob || !file) return;
    const url = URL.createObjectURL(sanitizedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isStripped ? `PDFMan_NoMetadata_${file.name}` : `PDFMan_UpdatedMeta_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg mx-auto">
            <ShieldOff className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Remove PDF Metadata</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Strip hidden author names, creation software, edit history, GPS data, and XMP metadata packages for complete privacy.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-emerald-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF Document</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop your file here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Purges Document Info Dictionary and Root XMP Stream &bull; Zero Server Upload</span>
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

        {sanitizedBlob && (
          <Button 
            size="sm" 
            onClick={handleDownload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download Sanitized PDF
          </Button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center bg-muted/10">
        <div className="max-w-3xl w-full bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <h2 className="font-bold text-base">Metadata Privacy Inspector</h2>
              <p className="text-xs text-muted-foreground">Audit, edit, or permanently erase hidden identification properties</p>
            </div>

            <Button 
              size="sm" 
              onClick={handleStripAll}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Strip All Metadata & XMP
            </Button>
          </div>

          {/* Before & After Audit Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Before (Original) */}
            <div className="p-4 rounded-2xl bg-muted/30 border space-y-2">
              <div className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Original Metadata in File
              </div>
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{report?.title || "(None)"}</span></div>
              <div><span className="text-muted-foreground">Author:</span> <span className="font-medium">{report?.author || "(None)"}</span></div>
              <div><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{report?.subject || "(None)"}</span></div>
              <div><span className="text-muted-foreground">Creator:</span> <span className="font-medium">{report?.creator || "(None)"}</span></div>
              <div><span className="text-muted-foreground">Producer:</span> <span className="font-medium">{report?.producer || "(None)"}</span></div>
              <div><span className="text-muted-foreground">Keywords:</span> <span className="font-medium">{report?.keywords?.length ? report.keywords.join(", ") : "(None)"}</span></div>
              <div><span className="text-muted-foreground">XMP Schema Stream:</span> <span className="font-mono">{report?.hasXmp ? "Present (Active)" : "None"}</span></div>
            </div>

            {/* Editable / Sanitized Form */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Document Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Author Name</label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Subject / Description</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Creator Software</label>
                <Input value={creator} onChange={(e) => setCreator(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Keywords (comma separated)</label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="h-8 text-xs" />
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveCustom}
                disabled={isProcessing}
                className="w-full rounded-xl text-xs font-semibold gap-1.5 mt-2"
              >
                <Save className="w-3.5 h-3.5" /> Save Custom Metadata Changes
              </Button>
            </div>
          </div>

          {sanitizedBlob && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {isStripped 
                  ? "All identifying author data and XMP metadata streams completely erased. Ready to download." 
                  : "Metadata successfully updated in PDF catalog."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
