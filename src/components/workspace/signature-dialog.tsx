"use client";

import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/store/workspace";
import { Pen, Type, Upload, RotateCcw, Check, ShieldAlert } from "lucide-react";

export function SignatureDialog() {
  const { signatureDialogOpen, setSignatureDialogOpen, addAnnotation, currentPage, strokeColor } = useWorkspaceStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigColor, setSigColor] = useState('#0f172a'); // default navy/black ink
  const [typedName, setTypedName] = useState('');
  const [activeTab, setActiveTab] = useState('draw');

  // Initialize canvas
  useEffect(() => {
    if (signatureDialogOpen && activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = sigColor;
    }
  }, [signatureDialogOpen, activeTab, sigColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApply = () => {
    let dataUrl = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      dataUrl = canvas.toDataURL('image/png');
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 44px "Brush Script MT", "Segoe Script", cursive, sans-serif';
        ctx.fillStyle = sigColor;
        ctx.fillText(typedName, 20, 80);
        dataUrl = tempCanvas.toDataURL('image/png');
      }
    }

    if (dataUrl) {
      addAnnotation({
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: Math.max(0, currentPage - 1),
        type: 'image',
        x: 100,
        y: 200,
        width: 180,
        height: 70,
        color: sigColor,
        data: dataUrl,
      });
      setSignatureDialogOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        addAnnotation({
          id: Math.random().toString(36).substring(2, 9),
          pageIndex: Math.max(0, currentPage - 1),
          type: 'image',
          x: 100,
          y: 200,
          width: 180,
          height: 80,
          color: '',
          data: result,
        });
        setSignatureDialogOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5 text-primary" />
            Create Your Signature
          </DialogTitle>
          <DialogDescription>
            Place your signature anywhere on the PDF.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="draw" className="flex items-center gap-1.5 text-xs">
              <Pen className="w-3.5 h-3.5" /> Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-1.5 text-xs">
              <Type className="w-3.5 h-3.5" /> Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" /> Upload
            </TabsTrigger>
          </TabsList>

          {/* Color selector for ink */}
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs text-muted-foreground font-medium">Ink Color:</span>
            <div className="flex items-center gap-2">
              {['#0f172a', '#1d4ed8', '#dc2626'].map((color) => (
                <button
                  key={color}
                  onClick={() => setSigColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${sigColor === color ? 'scale-110 border-primary shadow-sm' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <TabsContent value="draw" className="mt-3">
            <div className="border rounded-lg bg-background relative overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={450}
                height={160}
                className="w-full h-40 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <div className="absolute bottom-2 right-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={clearCanvas}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-3">
            <div className="space-y-3">
              <Input
                placeholder="Type your full name..."
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="text-base"
              />
              <div className="h-32 border rounded-lg flex items-center justify-center p-4 bg-muted/20">
                <span 
                  className="text-3xl italic tracking-wide select-none"
                  style={{ 
                    fontFamily: '"Brush Script MT", "Segoe Script", cursive, sans-serif',
                    color: sigColor 
                  }}
                >
                  {typedName || 'Your Signature'}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-3">
            <label className="border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors p-4">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Click to upload signature image</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP (transparent recommended)</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </TabsContent>
        </Tabs>

        {/* PRD Compliance Disclaimer */}
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 mt-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Legal Notice:</strong> This is a visual signature stamp and does not constitute a cryptographic/PKI digital certificate.
          </span>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setSignatureDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            <Check className="w-4 h-4 mr-1.5" /> Insert Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
