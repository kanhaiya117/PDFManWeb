"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { convertExcelToPdf, readExcelWorkbookInfo, ExcelWorkbookInfo, ExcelToPdfOptions } from "@/lib/conversion-engine";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2,
  Sliders,
  Table as TableIcon,
  Layers
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ExcelToPdfWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [wbInfo, setWbInfo] = useState<ExcelWorkbookInfo | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedPdfBlob, setConvertedPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load and parse spreadsheet on file change
  useEffect(() => {
    setWbInfo(null);
    setConvertedPdfBlob(null);
    setError(null);
    setActiveSheetIndex(0);
    if (!file) return;

    let isMounted = true;
    const parseExcel = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const info = readExcelWorkbookInfo(buffer);
        if (isMounted) {
          setWbInfo(info);
        }
      } catch (err: any) {
        console.error("Excel parse error:", err);
        if (isMounted) {
          setError("Failed to parse spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.");
        }
      }
    };

    parseExcel();
    return () => { isMounted = false; };
  }, [file]);

  const activeSheetName = wbInfo?.sheetNames[activeSheetIndex] || wbInfo?.sheetNames[0] || "Sheet1";
  const activeSheetRows = wbInfo?.sheetsData[activeSheetName] || [];

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);

      const buffer = await file.arrayBuffer();
      const pdfBlob = await convertExcelToPdf({
        xlsxBuffer: buffer,
        options: {
          orientation,
          sheetIndex: activeSheetIndex,
          showGridLines,
        },
      });

      setConvertedPdfBlob(pdfBlob);
    } catch (err: any) {
      console.error("Excel to PDF conversion error:", err);
      setError(err?.message || "Failed to convert Excel spreadsheet to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedPdfBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(convertedPdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_${activeSheetName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const valid = selected.name.endsWith(".xlsx") || selected.name.endsWith(".xls") || selected.name.endsWith(".csv");
      if (valid) {
        setFile(selected);
      } else {
        alert("Please upload a valid Excel or CSV spreadsheet (.xlsx, .xls, .csv).");
      }
    }
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
            <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Excel to PDF Converter</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Generate printable, formatted table PDF reports from spreadsheets</p>
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
              Change Spreadsheet
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
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
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select an Excel File to Convert</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Upload XLSX, XLS, or CSV files. Renders clean tabular gridlines, alternating row colors, and landscape page formatting.
            </p>
            <Button size="lg" className="rounded-xl shadow-md gap-2 bg-teal-600 hover:bg-teal-700 text-white">
              <Upload className="w-4 h-4" />
              Choose Spreadsheet
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Info & Actions Card */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold truncate max-w-sm md:max-w-md">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {wbInfo ? `${wbInfo.sheetNames.length} ${wbInfo.sheetNames.length === 1 ? 'Sheet' : 'Sheets'}` : "Loading..."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!convertedPdfBlob ? (
                  <Button
                    onClick={handleConvert}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-md gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Convert to PDF
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleDownload}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Table PDF
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Layout Options Strip */}
            <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Orientation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setOrientation('landscape'); setConvertedPdfBlob(null); }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        orientation === 'landscape'
                          ? 'border-teal-600 bg-teal-500/10 text-teal-600 font-semibold shadow-sm'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      Landscape (Best)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOrientation('portrait'); setConvertedPdfBlob(null); }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        orientation === 'portrait'
                          ? 'border-teal-600 bg-teal-500/10 text-teal-600 font-semibold shadow-sm'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      Portrait
                    </button>
                  </div>
                </div>

                {/* Gridlines Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gridlines</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowGridLines(true); setConvertedPdfBlob(null); }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        showGridLines
                          ? 'border-teal-600 bg-teal-500/10 text-teal-600 font-semibold shadow-sm'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      Show Lines
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowGridLines(false); setConvertedPdfBlob(null); }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        !showGridLines
                          ? 'border-teal-600 bg-teal-500/10 text-teal-600 font-semibold shadow-sm'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      Plain White
                    </button>
                  </div>
                </div>

                {/* Active Sheet selector info */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Sheet</label>
                  <select
                    value={activeSheetIndex}
                    onChange={(e) => {
                      setActiveSheetIndex(parseInt(e.target.value, 10));
                      setConvertedPdfBlob(null);
                    }}
                    className="w-full text-xs bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {wbInfo?.sheetNames.map((sName, idx) => (
                      <option key={sName} value={idx}>
                        {sName} ({wbInfo.sheetsData[sName]?.length || 0} rows)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table Preview */}
            <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-semibold">Sheet Preview: {activeSheetName}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({activeSheetRows.length} rows)
                  </span>
                </div>

                {/* Sheet Tabs */}
                {wbInfo && wbInfo.sheetNames.length > 1 && (
                  <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                    {wbInfo.sheetNames.map((name, idx) => (
                      <button
                        key={name}
                        onClick={() => {
                          setActiveSheetIndex(idx);
                          setConvertedPdfBlob(null);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                          activeSheetIndex === idx
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scrollable Preview Grid */}
              <div className="overflow-x-auto border rounded-xl max-h-[460px] bg-background">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="bg-muted/60 sticky top-0 z-10 border-b">
                    <tr>
                      <th className="w-12 p-2.5 text-center text-muted-foreground font-mono text-[11px] border-r">#</th>
                      {activeSheetRows[0]?.map((_, cIdx: number) => (
                        <th key={cIdx} className="p-2.5 font-semibold text-muted-foreground text-[11px] border-r min-w-[120px]">
                          Col {String.fromCharCode(65 + (cIdx % 26))}
                        </th>
                      )) || <th className="p-2.5">Empty</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {activeSheetRows.slice(0, 35).map((row: any[], rIdx: number) => (
                      <tr 
                        key={rIdx} 
                        className={`hover:bg-muted/20 transition-colors ${rIdx === 0 ? 'bg-teal-500/5 font-semibold text-teal-950 dark:text-teal-200' : ''}`}
                      >
                        <td className="p-2 text-center text-muted-foreground font-mono text-[10px] bg-muted/20 border-r">
                          {rIdx + 1}
                        </td>
                        {Array.from({ length: Math.max(1, activeSheetRows[0]?.length || 1) }).map((_, cIdx) => (
                          <td key={cIdx} className="p-2 text-foreground truncate max-w-[200px] border-r">
                            {row && row[cIdx] !== undefined ? String(row[cIdx]) : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing top 35 rows. The generated PDF formats all table cells with crisp vector boundaries and automatic page breaking.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
