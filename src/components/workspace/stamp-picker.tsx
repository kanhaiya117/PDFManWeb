"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/store/workspace";
import { Stamp } from "lucide-react";

function getStampId() {
  return "stamp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
}

interface PredefinedStamp {
  text: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

const BUILT_IN_STAMPS: PredefinedStamp[] = [
  { text: 'APPROVED', color: '#15803d', borderColor: '#16a34a', bgColor: '#f0fdf4' },
  { text: 'CONFIDENTIAL', color: '#b91c1c', borderColor: '#dc2626', bgColor: '#fef2f2' },
  { text: 'DRAFT', color: '#475569', borderColor: '#64748b', bgColor: '#f8fafc' },
  { text: 'PAID', color: '#1d4ed8', borderColor: '#2563eb', bgColor: '#eff6ff' },
  { text: 'REJECTED', color: '#b91c1c', borderColor: '#ef4444', bgColor: '#fef2f2' },
  { text: 'VERIFIED', color: '#047857', borderColor: '#059669', bgColor: '#ecfdf5' },
  { text: 'RECEIVED', color: '#6d28d9', borderColor: '#7c3aed', bgColor: '#f5f3ff' },
  { text: 'OFFICIAL COPY', color: '#c2410c', borderColor: '#ea580c', bgColor: '#fff7ed' },
];

export function StampPicker() {
  const { stampDialogOpen, setStampDialogOpen, addAnnotation, currentPage } = useWorkspaceStore();
  const [customText, setCustomText] = useState('');
  const [customColor, setCustomColor] = useState('#dc2626');

  const createStampDataUrl = (text: string, color: string, border: string, bg: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw rubber stamp style
    ctx.save();
    
    // Background fill
    ctx.fillStyle = bg;
    ctx.roundRect(10, 10, 280, 80, 8);
    ctx.fill();

    // Outer double border
    ctx.lineWidth = 4;
    ctx.strokeStyle = border;
    ctx.roundRect(10, 10, 280, 80, 8);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.roundRect(16, 16, 268, 68, 5);
    ctx.stroke();

    // Text
    ctx.font = 'bold 26px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '3px';
    ctx.fillText(text.toUpperCase(), 150, 52);

    ctx.restore();
    return canvas.toDataURL('image/png');
  };

  const applyStamp = (text: string, color: string, border: string, bg: string) => {
    const dataUrl = createStampDataUrl(text, color, border, bg);
    if (!dataUrl) return;

    addAnnotation({
      id: getStampId(),
      pageIndex: Math.max(0, currentPage - 1),
      type: 'image',
      x: 150,
      y: 120,
      width: 170,
      height: 60,
      color: color,
      data: dataUrl,
    });
    setStampDialogOpen(false);
  };

  return (
    <Dialog open={stampDialogOpen} onOpenChange={setStampDialogOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="w-5 h-5 text-primary" />
            Apply Rubber Stamp
          </DialogTitle>
          <DialogDescription>
            Choose a standard official stamp or create a custom one to place on the page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Standard Stamps
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BUILT_IN_STAMPS.map((s) => (
              <button
                key={s.text}
                onClick={() => applyStamp(s.text, s.color, s.borderColor, s.bgColor)}
                className="group p-2.5 rounded-lg border flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-md active:scale-95"
                style={{ backgroundColor: s.bgColor, borderColor: s.borderColor }}
              >
                <div 
                  className="border-2 rounded px-2 py-1 text-center font-black text-xs tracking-wider"
                  style={{ color: s.color, borderColor: s.borderColor }}
                >
                  {s.text}
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
              Custom Stamp
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Custom stamp text (e.g. RECEIVED 2026)"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="flex-1 text-sm"
              />
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-10 h-10 rounded border p-0.5 cursor-pointer"
                title="Select stamp color"
              />
              <Button 
                onClick={() => {
                  if (customText.trim()) {
                    applyStamp(customText, customColor, customColor, customColor + '10');
                  }
                }}
                disabled={!customText.trim()}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setStampDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
