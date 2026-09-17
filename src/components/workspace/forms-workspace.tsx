"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { pdfjsLib } from "@/lib/pdf-init";
import { 
  FormFieldDefinition, 
  ExistingFormField, 
  inspectAcroForm, 
  generateFilledOrDesignedForm 
} from "@/lib/pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CheckSquare, 
  Type, 
  CircleDot, 
  ChevronDownSquare, 
  Calendar, 
  FileSignature, 
  Trash2, 
  Copy, 
  Download, 
  Eye, 
  PenTool, 
  Upload, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  Settings2,
  CheckCircle2,
  Loader2,
  Lock,
  Unlock
} from "lucide-react";
import { useRouter } from "next/navigation";

export function FormsWorkspace() {
  const { file, setFile } = useWorkspaceStore();
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [isFillMode, setIsFillMode] = useState(false);
  const [flattenForms, setFlattenForms] = useState(false);
  const [existingAcroFields, setExistingAcroFields] = useState<ExistingFormField[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [scale, setScale] = useState(1.0);
  const router = useRouter();

  // Load PDF & inspect existing form
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    const load = async () => {
      try {
        const fileBuffer = await file.arrayBuffer();
        const acroInfo = await inspectAcroForm(fileBuffer);
        if (isMounted) {
          setExistingAcroFields(acroInfo.fields);
          const initialValues: Record<string, any> = {};
          acroInfo.fields.forEach(f => {
            initialValues[f.name] = f.value;
          });
          setFieldValues(prev => ({ ...initialValues, ...prev }));
        }

        const task = pdfjsLib.getDocument({
          url: URL.createObjectURL(file),
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        });
        const doc = await task.promise;
        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error("Error loading PDF in forms workspace:", err);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [file]);

  // Render current page canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      setPageDimensions({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(dpr, dpr);

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      } as any).promise;

      context.restore();
    } catch (err) {
      console.error("Page render error:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Add a new form field
  const addField = (type: FormFieldDefinition['type']) => {
    const id = `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pageIdx = currentPage - 1;

    let width = 160;
    let height = 32;
    if (type === 'checkbox' || type === 'radio') {
      width = 22;
      height = 22;
    } else if (type === 'signature') {
      width = 180;
      height = 60;
    }

    const newField: FormFieldDefinition = {
      id,
      name: `${type}_${fields.length + 1}`,
      type,
      pageIndex: pageIdx,
      x: 60,
      y: 80 + (fields.filter(f => f.pageIndex === pageIdx).length * 45) % 400,
      width,
      height,
      placeholder: type === 'text' ? 'Enter text...' : '',
      options: type === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      fontSize: 12,
      alignment: 'left',
      required: false,
    };

    setFields(prev => [...prev, newField]);
    setSelectedFieldId(id);
  };

  // Duplicate selected field
  const duplicateSelectedField = () => {
    if (!selectedFieldId) return;
    const target = fields.find(f => f.id === selectedFieldId);
    if (!target) return;

    const copy: FormFieldDefinition = {
      ...target,
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name}_copy`,
      x: target.x + 20,
      y: target.y + 20,
    };

    setFields(prev => [...prev, copy]);
    setSelectedFieldId(copy.id);
  };

  // Delete selected field
  const deleteSelectedField = () => {
    if (!selectedFieldId) return;
    setFields(prev => prev.filter(f => f.id !== selectedFieldId));
    setSelectedFieldId(null);
  };

  // Handle export & download
  const handleExport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setIsExportSuccess(false);

    try {
      const buffer = await file.arrayBuffer();
      const outputBlob = await generateFilledOrDesignedForm({
        pdfBuffer: buffer,
        newFields: fields,
        values: fieldValues,
        flatten: flattenForms,
        scale,
      });

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PDFMan_Form_${file.name.replace(/\.pdf$/i, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExportSuccess(true);
    } catch (err: any) {
      console.error("Form export failed:", err);
      alert("Error saving form: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);
  const currentPageFields = fields.filter(f => f.pageIndex === currentPage - 1);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-muted/10">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fill & Design PDF Forms</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Add interactive AcroForm text fields, checkboxes, dropdowns, radio buttons, and dates with genuine PDF embedding.
            </p>
          </div>

          <label className="border-2 border-dashed rounded-3xl p-10 block cursor-pointer hover:border-teal-500/60 bg-card shadow-sm transition-all">
            <input 
              type="file" 
              accept="application/pdf,.pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }} 
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <span className="font-semibold text-sm block">Choose PDF Form</span>
            <span className="text-xs text-muted-foreground block mt-1">or drag and drop here</span>
          </label>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Compliant AcroForm Standard &bull; Zero Cloud Upload &bull; Instant Local Processing</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="h-14 border-b px-4 flex items-center justify-between bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-xs gap-1.5"
            onClick={() => router.push("/workspace")}
          >
            <ChevronLeft className="w-4 h-4" /> Workspace
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Mode Switcher: Design vs Fill */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border">
            <button
              onClick={() => setIsFillMode(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                !isFillMode ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 inline mr-1.5" /> Design Fields
            </button>
            <button
              onClick={() => setIsFillMode(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                isFillMode ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1.5" /> Fill Form Mode
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={flattenForms} 
              onChange={(e) => setFlattenForms(e.target.checked)} 
              className="rounded"
            />
            <span>Flatten Form into Content</span>
          </label>

          <Button 
            size="sm" 
            onClick={handleExport}
            disabled={isProcessing}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Save & Download PDF
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar: Add Form Elements */}
        {!isFillMode && (
          <div className="w-60 border-r bg-muted/20 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Add Form Elements
            </div>

            {[
              { type: 'text' as const, label: 'Text Field', icon: Type, desc: 'Single-line input' },
              { type: 'checkbox' as const, label: 'Checkbox', icon: CheckSquare, desc: 'Yes/No selection' },
              { type: 'dropdown' as const, label: 'Dropdown List', icon: ChevronDownSquare, desc: 'Select options' },
              { type: 'radio' as const, label: 'Radio Button', icon: CircleDot, desc: 'Mutual choice' },
              { type: 'date' as const, label: 'Date Field', icon: Calendar, desc: 'Formatted date picker' },
              { type: 'signature' as const, label: 'Signature Placeholder', icon: FileSignature, desc: 'Sign zone' },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.type}
                  onClick={() => addField(tool.type)}
                  className="w-full text-left p-2.5 rounded-xl border bg-card hover:border-teal-500/50 hover:bg-teal-500/5 transition-all text-xs flex items-center gap-2.5 shadow-2xs group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold">{tool.label}</div>
                    <div className="text-[10px] text-muted-foreground">{tool.desc}</div>
                  </div>
                </button>
              );
            })}

            {/* Existing AcroForms Detected */}
            {existingAcroFields.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Existing AcroFields ({existingAcroFields.length})
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {existingAcroFields.map(f => (
                    <div key={f.name} className="p-1.5 rounded-lg bg-card border text-[11px] truncate">
                      <span className="font-semibold">{f.name}</span>
                      <span className="text-muted-foreground ml-1 font-mono">({f.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center: PDF Page with Interactive Form Elements */}
        <div className="flex-1 bg-muted/10 overflow-auto p-6 flex flex-col items-center">
          <div 
            ref={pageContainerRef}
            className="relative shadow-xl border bg-white rounded-sm"
            style={{ width: pageDimensions.width, height: pageDimensions.height }}
          >
            <canvas ref={canvasRef} className="block" />

            {/* Render Designed Form Fields */}
            {currentPageFields.map((field) => {
              const isSelected = selectedFieldId === field.id && !isFillMode;
              const val = fieldValues[field.id] !== undefined ? fieldValues[field.id] : (field.value || '');

              return (
                <div
                  key={field.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isFillMode) setSelectedFieldId(field.id);
                  }}
                  className={`absolute transition-shadow ${
                    isSelected 
                      ? 'ring-2 ring-teal-600 shadow-md z-20' 
                      : 'hover:ring-1 hover:ring-teal-400 z-10'
                  }`}
                  style={{
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                  }}
                >
                  {/* Text / Date Field */}
                  {(field.type === 'text' || field.type === 'date') && (
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      disabled={!isFillMode}
                      placeholder={field.placeholder || field.name}
                      value={val}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full h-full px-2 text-xs bg-teal-50/70 border border-teal-300 text-foreground rounded font-sans focus:outline-none focus:bg-white"
                      style={{ fontSize: field.fontSize || 12, textAlign: field.alignment || 'left' }}
                    />
                  )}

                  {/* Checkbox */}
                  {field.type === 'checkbox' && (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50/70 border border-teal-300 rounded">
                      <input
                        type="checkbox"
                        disabled={!isFillMode}
                        checked={!!val}
                        onChange={(e) => setFieldValues(prev => ({ ...prev, [field.id]: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-0"
                      />
                    </div>
                  )}

                  {/* Dropdown */}
                  {field.type === 'dropdown' && (
                    <select
                      disabled={!isFillMode}
                      value={val}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full h-full px-1 text-xs bg-teal-50/70 border border-teal-300 rounded font-sans focus:outline-none focus:bg-white"
                    >
                      {(field.options || ['Option 1', 'Option 2']).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* Radio Button */}
                  {field.type === 'radio' && (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50/70 border border-teal-300 rounded-full">
                      <input
                        type="radio"
                        disabled={!isFillMode}
                        checked={!!val}
                        onChange={() => setFieldValues(prev => ({ ...prev, [field.id]: true }))}
                        className="w-3.5 h-3.5 text-teal-600 focus:ring-0"
                      />
                    </div>
                  )}

                  {/* Signature Placeholder */}
                  {field.type === 'signature' && (
                    <div className="w-full h-full border border-dashed border-teal-500 bg-teal-50/50 rounded flex items-center justify-center gap-1.5 text-[11px] text-teal-700 font-semibold select-none">
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>Signature Zone</span>
                    </div>
                  )}

                  {/* Drag and Move Handles in Design Mode */}
                  {!isFillMode && isSelected && (
                    <div className="absolute -top-6 left-0 bg-teal-700 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      <span>{field.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Page Pagination Bottom Bar */}
          <div className="mt-4 flex items-center gap-3 bg-card px-3 py-1.5 rounded-xl border shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right Property Inspector Panel */}
        {!isFillMode && selectedField && (
          <div className="w-72 border-l bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="font-bold text-xs flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-teal-600" /> Field Properties
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={duplicateSelectedField} title="Duplicate Field">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={deleteSelectedField} title="Delete Field">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Field Name (AcroForm ID)</label>
                <Input
                  value={selectedField.name}
                  onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, name: e.target.value } : f))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Placeholder / Default</label>
                <Input
                  value={selectedField.placeholder || ''}
                  onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, placeholder: e.target.value } : f))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Width (px)</label>
                  <Input
                    type="number"
                    value={selectedField.width}
                    onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, width: parseInt(e.target.value) || 20 } : f))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Height (px)</label>
                  <Input
                    type="number"
                    value={selectedField.height}
                    onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, height: parseInt(e.target.value) || 20 } : f))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Position X</label>
                  <Input
                    type="number"
                    value={Math.round(selectedField.x)}
                    onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, x: parseInt(e.target.value) || 0 } : f))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Position Y</label>
                  <Input
                    type="number"
                    value={Math.round(selectedField.y)}
                    onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, y: parseInt(e.target.value) || 0 } : f))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Font Size</label>
                <Input
                  type="number"
                  value={selectedField.fontSize || 12}
                  onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, fontSize: parseInt(e.target.value) || 12 } : f))}
                  className="h-8 text-xs"
                />
              </div>

              {selectedField.type === 'dropdown' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Options (comma separated)</label>
                  <Input
                    value={(selectedField.options || []).join(', ')}
                    onChange={(e) => setFields(prev => prev.map(f => f.id === selectedField.id ? { ...f, options: e.target.value.split(',').map(s => s.trim()) } : f))}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
