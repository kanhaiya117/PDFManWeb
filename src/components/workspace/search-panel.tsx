"use client";

import { useState } from "react";
import { pdfjsLib } from "@/lib/pdf-init";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowRight, X } from "lucide-react";

interface SearchResult {
  pageNumber: number;
  snippet: string;
}

interface SearchPanelProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  numPages: number;
  onJumpToPage: (pageIndex: number) => void;
  onClose: () => void;
}

export function SearchPanel({ pdfDoc, numPages, onJumpToPage, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearched(true);
    setResults([]);

    const foundResults: SearchResult[] = [];
    const searchLower = query.toLowerCase();

    try {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');

        const matchIdx = pageText.toLowerCase().indexOf(searchLower);
        if (matchIdx !== -1) {
          const start = Math.max(0, matchIdx - 30);
          const end = Math.min(pageText.length, matchIdx + searchLower.length + 40);
          const snippet = (start > 0 ? '...' : '') + pageText.substring(start, end).trim() + (end < pageText.length ? '...' : '');

          foundResults.push({
            pageNumber: i,
            snippet: snippet || `Match found on page ${i}`,
          });
        }
      }
      setResults(foundResults);
    } catch (err) {
      console.error("PDF Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-80 border-r bg-background flex flex-col shrink-0 h-full overflow-hidden shadow-sm">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Search className="w-4 h-4 text-primary" />
          Find in Document
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSearch} className="p-3 border-b flex gap-2">
        <Input
          placeholder="Search keywords..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-xs flex-1"
          autoFocus
        />
        <Button size="sm" type="submit" className="h-8 px-3 text-xs" disabled={isSearching || !query.trim()}>
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
        </Button>
      </form>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {isSearching && (
          <div className="text-center py-8 text-muted-foreground text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Searching through {numPages} pages...
          </div>
        )}

        {!isSearching && searched && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No matches found for &ldquo;{query}&rdquo;
          </div>
        )}

        {!isSearching && results.map((res, i) => (
          <div
            key={i}
            onClick={() => onJumpToPage(res.pageNumber - 1)}
            className="p-2.5 rounded-lg border bg-muted/20 hover:bg-accent/60 cursor-pointer transition-colors text-xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-primary">Page {res.pageNumber}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-muted-foreground line-clamp-2 italic leading-relaxed">
              {res.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
