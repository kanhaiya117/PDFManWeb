"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { convertPdfToExcel, convertRowsToCsv, PdfToExcelResult } from "@/lib/conversion-engine";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  FileText,
  Table as TableIcon,
  Layers
} from "lucide-react";
import { useRouter } from "next/navigation";

export function PdfToExcelWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PdfToExcelResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Reset when file changes
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [file]);

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      const buffer = await file.arrayBuffer();
      const res = await convertPdfToExcel({ pdfBuffer: buffer });
      setResult(res);
    } catch (err: any) {
      console.error("PDF to Excel conversion error:", err);
      setError(err?.message || "Failed to extract tables from PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadXlsx = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const csvBlob = convertRowsToCsv(result.previewData);
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === "application/pdf" || selected.name.endsWith(".pdf")) {
        setFile(selected);
      } else {
        alert("Please upload a valid PDF document.");
      }
    }
  };

  // Helper to generate column headers A, B, C...
  const getColHeader = (idx: number) => {
    return String.fromCharCode(65 + (idx % 26));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <header className="h-14 border-b bg-card/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/workspace')} 
            className="h-8 w-8 p-0 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">PDF to Excel Converter</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Extract tabular data into multi-sheet XLSX & CSV workbooks</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            100% Client-Side
          </span>
          {file && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Change File
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[380px] border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all border-muted-foreground/20"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a PDF to extract into Excel</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Uses spatial clustering to detect table rows, cells, and numeric values, exporting them directly to XLSX or CSV spreadsheets.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Info Bar */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold truncate max-w-sm md:max-w-md">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!result ? (
                  <Button 
                    onClick={handleConvert} 
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting Tables...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Extract to Excel (.xlsx)
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button 
                      onClick={handleDownloadXlsx} 
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download .XLSX
                    </Button>
                    <Button 
                      onClick={handleDownloadCsv} 
                      variant="outline"
                      className="border-emerald-600/30 text-emerald-600 dark:text-emerald-400 gap-1.5"
                    >
                      CSV
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Results / Table Preview */}
            {result ? (
              <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold">Spreadsheet Data Preview</h3>
                    <span className="text-xs text-muted-foreground">
                      ({result.rowCount} rows detected • {result.colCount} columns)
                    </span>
                  </div>

                  {result.sheetNames.length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                      {result.sheetNames.map((name, idx) => (
                        <button
                          key={name}
                          onClick={() => setSelectedSheet(idx)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                            selectedSheet === idx
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Spreadsheet Table Grid */}
                <div className="overflow-x-auto border rounded-xl max-h-[460px] bg-background">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-muted/60 sticky top-0 z-10 border-b">
                      <tr>
                        <th className="w-12 p-2.5 text-center text-muted-foreground font-mono text-[11px] border-r">#</th>
                        {Array.from({ length: Math.max(1, result.colCount) }).map((_, cIdx) => (
                          <th key={cIdx} className="p-2.5 font-semibold text-muted-foreground text-[11px] border-r min-w-[120px]">
                            {getColHeader(cIdx)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {result.previewData.length > 0 ? (
                        result.previewData.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                            <td className="p-2 text-center text-muted-foreground font-mono text-[10px] bg-muted/20 border-r">
                              {rIdx + 1}
                            </td>
                            {Array.from({ length: Math.max(1, result.colCount) }).map((_, cIdx) => (
                              <td key={cIdx} className="p-2 text-foreground truncate max-w-[200px] border-r">
                                {row[cIdx] !== undefined ? row[cIdx] : ""}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={result.colCount + 1} className="p-8 text-center text-muted-foreground">
                            No tabular data found on this page.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Showing preview of clustered table rows. The downloaded Excel file contains all pages formatted as individual sheets.</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleDownloadXlsx}
                      className="h-7 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
                    >
                      Export Full .XLSX
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Pre-conversion Guidance */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Spatial Cell Alignment</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automatically computes X and Y coordinates of text elements to recreate column boundaries and row breaks.
                  </p>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Multi-Sheet Support</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Each page of your multi-page PDF document is exported into a distinct sheet tab inside the generated workbook.
                  </p>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Zero-Data Exposure</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Confidential financial ledgers and bank statements never leave your device. All calculations execute locally.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
