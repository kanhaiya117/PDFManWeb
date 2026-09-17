/**
 * PDFMan Signature & Stamp Presets Library
 * Generates 12+ high-resolution, transparent PNG signatures and 10+ official rubber stamps.
 */

export interface SignatureStyle {
  id: string;
  label: string;
  font: string;
  underline: boolean;
  letterSpacing?: number;
  rotation?: number;
  flourish?: 'none' | 'underline' | 'double-underline' | 'loop' | 'dot-end';
}

export const SIGNATURE_STYLES: SignatureStyle[] = [
  {
    id: 'elegant',
    label: 'Elegant Flow',
    font: 'italic 46px "Brush Script MT", "Segoe Script", cursive',
    underline: false,
    flourish: 'loop',
  },
  {
    id: 'executive',
    label: 'Executive Slant',
    font: 'italic 42px "Segoe Script", "Brush Script MT", cursive',
    underline: true,
    flourish: 'underline',
  },
  {
    id: 'classic',
    label: 'Classic Flourish',
    font: 'italic 44px "Lucida Handwriting", cursive',
    underline: false,
    flourish: 'double-underline',
  },
  {
    id: 'doctor',
    label: 'Fast Clinical',
    font: 'italic 48px "Caveat", "Segoe Script", cursive',
    underline: false,
    flourish: 'none',
  },
  {
    id: 'minimalist',
    label: 'Modern Minimal',
    font: 'italic 38px "Dancing Script", "Segoe Script", cursive',
    underline: false,
    flourish: 'dot-end',
  },
  {
    id: 'bold-exec',
    label: 'Bold Leader',
    font: 'bold italic 44px "Brush Script MT", cursive',
    underline: true,
    flourish: 'underline',
  },
  {
    id: 'sharp',
    label: 'Sharp Legal',
    font: 'italic 40px "Segoe Script", sans-serif',
    underline: true,
    flourish: 'none',
  },
  {
    id: 'dynamic',
    label: 'Dynamic Wave',
    font: 'italic 46px "Marck Script", "Brush Script MT", cursive',
    underline: false,
    flourish: 'loop',
  },
  {
    id: 'calligraphy',
    label: 'Royal Calligraphy',
    font: 'italic 45px "Great Vibes", "Brush Script MT", cursive',
    underline: false,
    flourish: 'double-underline',
  },
  {
    id: 'artistic',
    label: 'Artistic Script',
    font: 'italic 43px "Sacramento", "Segoe Script", cursive',
    underline: true,
    flourish: 'underline',
  },
  {
    id: 'balanced',
    label: 'Formal Contract',
    font: 'italic 41px "Parisienne", "Brush Script MT", cursive',
    underline: false,
    flourish: 'dot-end',
  },
  {
    id: 'distinguished',
    label: 'Official Seal',
    font: 'bold italic 43px "Alex Brush", "Segoe Script", cursive',
    underline: true,
    flourish: 'loop',
  },
];

export interface StampPreset {
  id: string;
  text: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export const STAMP_PRESETS: StampPreset[] = [
  { id: 'approved', text: 'APPROVED', color: '#15803d', borderColor: '#16a34a', bgColor: '#f0fdf4' },
  { id: 'confidential', text: 'CONFIDENTIAL', color: '#b91c1c', borderColor: '#dc2626', bgColor: '#fef2f2' },
  { id: 'verified', text: 'VERIFIED', color: '#047857', borderColor: '#059669', bgColor: '#ecfdf5' },
  { id: 'paid', text: 'PAID', color: '#1d4ed8', borderColor: '#2563eb', bgColor: '#eff6ff' },
  { id: 'rejected', text: 'REJECTED', color: '#b91c1c', borderColor: '#ef4444', bgColor: '#fef2f2' },
  { id: 'official-copy', text: 'OFFICIAL COPY', color: '#c2410c', borderColor: '#ea580c', bgColor: '#fff7ed' },
  { id: 'received', text: 'RECEIVED', color: '#6d28d9', borderColor: '#7c3aed', bgColor: '#f5f3ff' },
  { id: 'draft', text: 'DRAFT', color: '#475569', borderColor: '#64748b', bgColor: '#f8fafc' },
  { id: 'urgent', text: 'URGENT', color: '#ea580c', borderColor: '#f97316', bgColor: '#fff7ed' },
  { id: 'final', text: 'FINAL', color: '#991b1b', borderColor: '#b91c1c', bgColor: '#fef2f2' },
  { id: 'completed', text: 'COMPLETED', color: '#15803d', borderColor: '#22c55e', bgColor: '#f0fdf4' },
  { id: 'notarized', text: 'NOTARIZED', color: '#4338ca', borderColor: '#6366f1', bgColor: '#eef2ff' },
];

export const SIGNATURE_COLORS = [
  { label: 'Classic Slate', value: '#0f172a' },
  { label: 'Royal Navy', value: '#1e3a8a' },
  { label: 'Executive Blue', value: '#2563eb' },
  { label: 'Emerald Ink', value: '#065f46' },
  { label: 'Deep Crimson', value: '#991b1b' },
  { label: 'Amethyst', value: '#6b21a8' },
];

/**
 * Generate a transparent PNG data URL for a stylized signature
 */
export function generateSignatureDataUrl(name: string, style: SignatureStyle, color: string): string {
  if (typeof window === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // Subtle natural handwriting slant
  ctx.translate(20, 20);

  ctx.font = style.font;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textBaseline = 'middle';

  const displayText = name.trim() || 'Alex Morgan';
  const textY = 55;
  ctx.fillText(displayText, 10, textY);

  const textMetrics = ctx.measureText(displayText);
  const textWidth = Math.min(textMetrics.width, 390);

  // Draw authentic flourishes
  if (style.flourish === 'underline' || style.underline) {
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.moveTo(8, textY + 26);
    ctx.quadraticCurveTo(textWidth * 0.5, textY + 32, textWidth + 24, textY + 22);
    ctx.stroke();
  } else if (style.flourish === 'double-underline') {
    ctx.beginPath();
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.moveTo(10, textY + 24);
    ctx.quadraticCurveTo(textWidth * 0.5, textY + 28, textWidth + 20, textY + 22);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 1.2;
    ctx.moveTo(18, textY + 30);
    ctx.quadraticCurveTo(textWidth * 0.5, textY + 34, textWidth + 10, textY + 28);
    ctx.stroke();
  } else if (style.flourish === 'loop') {
    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.moveTo(8, textY + 26);
    ctx.bezierCurveTo(textWidth * 0.4, textY + 34, textWidth * 0.8, textY + 18, textWidth + 28, textY + 28);
    ctx.bezierCurveTo(textWidth + 38, textY + 34, textWidth + 18, textY + 38, textWidth + 6, textY + 32);
    ctx.stroke();
  } else if (style.flourish === 'dot-end') {
    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.arc(textWidth + 16, textY + 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
}

/**
 * Generate a high-resolution rubber stamp image
 */
export function generateStampDataUrl(
  text: string, 
  color: string, 
  borderColor: string, 
  bgColor: string
): string {
  if (typeof window === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 110;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  
  // Background fill
  ctx.fillStyle = bgColor;
  ctx.roundRect(10, 10, 320, 90, 10);
  ctx.fill();

  // Outer thick border
  ctx.lineWidth = 4;
  ctx.strokeStyle = borderColor;
  ctx.roundRect(10, 10, 320, 90, 10);
  ctx.stroke();

  // Inner thin border
  ctx.lineWidth = 1.5;
  ctx.roundRect(16, 16, 308, 78, 7);
  ctx.stroke();

  // Rubber stamp text
  ctx.font = 'bold 28px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '3px';
  ctx.fillText(text.toUpperCase(), 170, 56);

  ctx.restore();
  return canvas.toDataURL('image/png');
}
