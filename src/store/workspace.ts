import { create } from 'zustand';

export type Tool = 'hand' | 'select' | 'text' | 'draw' | 'highlight' | 'image' | 'stamp' | 'sign' | 'redact';

export type Annotation = {
  id: string;
  pageIndex: number; // 0-based
  type: 'text' | 'draw' | 'highlight' | 'image' | 'stamp' | 'redact';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  data: string; // text content, svg path data, or image base64
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
};

export type RightPanelTab = 'annotate' | 'pages' | 'sign' | 'watermark' | 'security' | 'ai' | null;

interface WorkspaceState {
  file: File | null;
  setFile: (file: File | null) => void;

  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  
  // Layout sidebars
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;

  activeRightTab: RightPanelTab;
  setActiveRightTab: (tab: RightPanelTab) => void;
  toggleRightTab: (tab: RightPanelTab) => void;

  // Viewport / Zoom / Navigation
  scale: number;
  setScale: (scale: number | ((prev: number) => number)) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  numPages: number;
  setNumPages: (count: number) => void;

  // Page level operations
  pageRotations: Record<number, number>; // pageIndex -> rotation degrees (0, 90, 180, 270)
  rotatePage: (pageIndex: number, delta?: number) => void;
  rotateAllPages: (delta?: number) => void;
  deletedPages: number[]; // pageIndexes that are excluded
  deletePage: (pageIndex: number) => void;
  restorePage: (pageIndex: number) => void;

  // Tool settings
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;

  // Watermark settings
  watermarkText: string;
  setWatermarkText: (text: string) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (opacity: number) => void;
  watermarkColor: string;
  setWatermarkColor: (color: string) => void;

  // Pagination
  showPageNumbers: boolean;
  setShowPageNumbers: (show: boolean) => void;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'top-right';
  setPageNumberPosition: (pos: 'bottom-center' | 'bottom-right' | 'top-right') => void;

  // Document metadata
  pdfMetadata: { title: string; author: string; subject: string; creator: string };
  setPdfMetadata: (metadata: { title: string; author: string; subject: string; creator: string }) => void;

  // Dialogs
  signatureDialogOpen: boolean;
  setSignatureDialogOpen: (open: boolean) => void;
  stampDialogOpen: boolean;
  setStampDialogOpen: (open: boolean) => void;

  // Page order & reordering
  pageOrder: number[];
  setPageOrder: (order: number[]) => void;
  movePage: (fromIndex: number, toIndex: number) => void;

  // Presentation & Search
  presentationMode: boolean;
  setPresentationMode: (mode: boolean) => void;
  extractedText: string;
  setExtractedText: (text: string) => void;

  // Annotations & History
  annotations: Annotation[];
  undoStack: Annotation[][];
  redoStack: Annotation[][];
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  undo: () => void;
  redo: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  file: null,
  setFile: (file) => set({ 
    file, 
    annotations: [], 
    pageRotations: {}, 
    deletedPages: [],
    pageOrder: [],
    currentPage: 1,
    undoStack: [],
    redoStack: [],
    extractedText: '',
  }),

  pageOrder: [],
  setPageOrder: (order) => set({ pageOrder: order }),
  movePage: (fromIndex, toIndex) => set((state) => {
    const pages = state.pageOrder.length > 0 
      ? [...state.pageOrder] 
      : Array.from({ length: state.numPages }, (_, i) => i);
    const [moved] = pages.splice(fromIndex, 1);
    pages.splice(toIndex, 0, moved);
    return { pageOrder: pages };
  }),

  presentationMode: false,
  setPresentationMode: (mode) => set({ presentationMode: mode }),
  extractedText: '',
  setExtractedText: (text) => set({ extractedText: text }),

  activeTool: 'hand',
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  leftSidebarOpen: false,
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),

  activeRightTab: null,
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  toggleRightTab: (tab) => set((state) => ({
    activeRightTab: state.activeRightTab === tab ? null : tab
  })),

  scale: 1.0,
  setScale: (scale) => set((state) => ({ 
    scale: typeof scale === 'function' ? scale(state.scale) : scale 
  })),
  currentPage: 1,
  setCurrentPage: (page) => set({ currentPage: page }),
  numPages: 0,
  setNumPages: (count) => set({ numPages: count }),

  pageRotations: {},
  rotatePage: (pageIndex, delta = 90) => set((state) => {
    const current = state.pageRotations[pageIndex] || 0;
    const nextRotation = (current + delta) % 360;
    return {
      pageRotations: { ...state.pageRotations, [pageIndex]: nextRotation }
    };
  }),
  rotateAllPages: (delta = 90) => set((state) => {
    const next: Record<number, number> = {};
    for (let i = 0; i < state.numPages; i++) {
      const current = state.pageRotations[i] || 0;
      next[i] = (current + delta) % 360;
    }
    return { pageRotations: next };
  }),

  deletedPages: [],
  deletePage: (pageIndex) => set((state) => ({
    deletedPages: state.deletedPages.includes(pageIndex) 
      ? state.deletedPages 
      : [...state.deletedPages, pageIndex]
  })),
  restorePage: (pageIndex) => set((state) => ({
    deletedPages: state.deletedPages.filter(p => p !== pageIndex)
  })),

  strokeColor: '#ef4444',
  setStrokeColor: (color) => set({ strokeColor: color }),
  strokeWidth: 3,
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  fontSize: 16,
  setFontSize: (size) => set({ fontSize: size }),

  watermarkText: '',
  setWatermarkText: (text) => set({ watermarkText: text }),
  watermarkOpacity: 0.25,
  setWatermarkOpacity: (opacity) => set({ watermarkOpacity: opacity }),
  watermarkColor: '#94a3b8',
  setWatermarkColor: (color) => set({ watermarkColor: color }),

  showPageNumbers: false,
  setShowPageNumbers: (show) => set({ showPageNumbers: show }),
  pageNumberPosition: 'bottom-center',
  setPageNumberPosition: (pos) => set({ pageNumberPosition: pos }),

  pdfMetadata: { title: '', author: '', subject: '', creator: 'PDFMan' },
  setPdfMetadata: (metadata) => set({ pdfMetadata: metadata }),

  signatureDialogOpen: false,
  setSignatureDialogOpen: (open) => set({ signatureDialogOpen: open }),
  stampDialogOpen: false,
  setStampDialogOpen: (open) => set({ stampDialogOpen: open }),

  annotations: [],
  undoStack: [],
  redoStack: [],

  addAnnotation: (annotation) => set((state) => ({
    undoStack: [...state.undoStack, state.annotations],
    redoStack: [],
    annotations: [...state.annotations, annotation]
  })),

  updateAnnotation: (id, updates) => set((state) => ({
    undoStack: [...state.undoStack, state.annotations],
    redoStack: [],
    annotations: state.annotations.map(a => a.id === id ? { ...a, ...updates } : a)
  })),

  removeAnnotation: (id) => set((state) => ({
    undoStack: [...state.undoStack, state.annotations],
    redoStack: [],
    annotations: state.annotations.filter(a => a.id !== id)
  })),

  clearAnnotations: () => set((state) => ({
    undoStack: [...state.undoStack, state.annotations],
    redoStack: [],
    annotations: []
  })),

  undo: () => set((state) => {
    if (state.undoStack.length === 0) return state;
    const prev = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    return {
      undoStack: newUndoStack,
      redoStack: [state.annotations, ...state.redoStack],
      annotations: prev
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    const next = state.redoStack[0];
    const newRedoStack = state.redoStack.slice(1);
    return {
      undoStack: [...state.undoStack, state.annotations],
      redoStack: newRedoStack,
      annotations: next
    };
  })
}));
