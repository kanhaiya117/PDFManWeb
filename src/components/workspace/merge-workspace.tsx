"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { Upload, Layers, GripVertical, Trash2, ArrowUp, ArrowDown, CheckCircle2, Download, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PDFDocument } from "pdf-lib";

export function MergeWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [files, setFiles] = useState<File[]>(file ? [file] : []);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedFileName, setMergedFileName] = useState("PDFMan_Merged_Document.pdf");
  const router = useRouter();

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
      setMergedBlob(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setMergedBlob(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFiles(prev => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
    setMergedBlob(null);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles(prev => {
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
    setMergedBlob(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert("Please add at least 2 PDF files to merge.");
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      mergedPdf.setCreator("PDFMan — Fast. Private. Secure.");
      mergedPdf.setTitle("Merged PDF Document");

      for (const f of files) {
        const buffer = await f.arrayBuffer();
        const srcDoc = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
      const blob = new Blob([mergedBytes as any], { type: "application/pdf" });
      setMergedBlob(blob);
    } catch (err: any) {
      console.error("PDF Merge failed:", err);
      alert("Error merging PDFs: " + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const downloadMergedPdf = () => {
    if (!mergedBlob) return;
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mergedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openInEditor = () => {
    if (!mergedBlob) return;
    const mergedFile = new File([mergedBlob], mergedFileName, { type: "application/pdf" });
    setFile(mergedFile);
    router.push("/workspace");
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden">
      <header className="h-14 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none">Merge PDF Documents</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Combine multiple PDFs into a single file &bull; 100% Client-Side</p>
          </div>
        </div>
        <Button onClick={() => router.push('/')} variant="ghost" size="sm" className="rounded-xl text-xs">Exit</Button>
      </header>
      
      <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-10 bg-muted/20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-card rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Document Merge Sequence</h2>
                <p className="text-xs text-muted-foreground">Drag, reorder, or remove files before combining.</p>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-muted">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-2 mb-6">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/30 border rounded-xl group hover:border-indigo-500/40 transition-colors gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-background border flex items-center justify-center text-xs font-mono font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate max-w-[120px] xs:max-w-[180px] sm:max-w-md">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveUp(i)} 
                      disabled={i === 0} 
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveDown(i)} 
                      disabled={i === files.length - 1} 
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeFile(i)} 
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      title="Remove File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {files.length === 0 && (
                <div className="text-center p-12 border-2 border-dashed rounded-2xl text-muted-foreground bg-muted/10">
                  <Layers className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-medium text-xs">No PDF files added yet.</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">Upload 2 or more PDFs to combine them into one document.</p>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
              <div className="relative">
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Add More PDFs
                </Button>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleAddFile}
                />
              </div>

              {!mergedBlob ? (
                <Button 
                  onClick={handleMerge} 
                  disabled={files.length < 2 || isMerging}
                  className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer shadow-sm"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Merging {files.length} PDFs...
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 mr-1.5" />
                      Merge {files.length} PDFs
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={downloadMergedPdf} 
                    className="rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Merged PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={openInEditor} 
                    className="rounded-xl px-4 text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Open in Editor
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Success card if merged */}
          {mergedBlob && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs text-emerald-700 dark:text-emerald-400 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>PDFs merged successfully into a single document ({(mergedBlob.size / 1024 / 1024).toFixed(2)} MB).</span>
              </div>
              <Button size="sm" variant="ghost" onClick={downloadMergedPdf} className="h-7 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
                Download Now
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
