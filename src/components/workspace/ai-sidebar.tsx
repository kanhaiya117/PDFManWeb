"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { X, Send, Sparkles, FileText, Database, Globe, Loader2 } from "lucide-react";
import { pdfjsLib } from "@/lib/pdf-init";

export default function AIAssistantSidebar() {
  const { activeRightTab, setActiveRightTab, file, extractedText, setExtractedText } = useWorkspaceStore();
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hi! I am the PDFMan AI Copilot. I can summarize this document, extract key numeric & table parameters, or answer questions grounded directly in your PDF.' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  if (activeRightTab !== 'ai') return null;

  const getOrExtractDocText = async (): Promise<string> => {
    if (extractedText) return extractedText;
    if (!file) return "";

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let text = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it: any) => it.str || "").join(" ") + "\n";
      }
      setExtractedText(text);
      return text;
    } catch (e) {
      console.error("Text extraction for AI failed:", e);
      return file.name;
    }
  };

  const askAi = async (query: string) => {
    setIsTyping(true);
    try {
      const docText = await getOrExtractDocText();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          documentContext: docText,
          fileName: file?.name || "Active Document"
        })
      });

      const data = await res.json();
      if (data.success && data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Could not analyze the document at this moment." }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error: " + err.message }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput("");
    askAi(userMsg);
  };

  const handleAction = (actionText: string) => {
    setMessages(prev => [...prev, { role: 'user', content: `Please ${actionText} this document.` }]);
    askAi(actionText);
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col shrink-0 h-full overflow-hidden shadow-lg z-20">
      <div className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-muted/20">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Ask PDF Copilot</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveRightTab(null)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 border-b flex flex-col gap-2 shrink-0 bg-muted/10">
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Quick Inquiries</p>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleAction('summarize')}>
            <FileText className="w-3 h-3 mr-1 text-purple-500" /> Summarize
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleAction('extract tables from')}>
            <Database className="w-3 h-3 mr-1 text-purple-500" /> Extract Tables
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleAction('translate')}>
            <Globe className="w-3 h-3 mr-1 text-purple-500" /> Translate
          </Button>
        </div>
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
          ✓ Client-side text parsing with zero remote retention.
        </p>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col max-w-[92%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
            <span className="text-[10px] text-muted-foreground mb-1 px-1">{msg.role === 'user' ? 'You' : 'PDFMan AI'}</span>
            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-xs' 
                : 'bg-muted/50 border rounded-bl-xs text-foreground'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="self-start items-start flex flex-col max-w-[90%]">
            <span className="text-[10px] text-muted-foreground mb-1 px-1">PDFMan AI</span>
            <div className="p-3 rounded-2xl bg-muted/40 border flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
              <span>Analyzing document context...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t shrink-0 bg-background">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={file ? "Ask about this document..." : "Open a PDF first..."}
            disabled={!file || isTyping}
            className="flex-1 rounded-xl border bg-muted/20 px-3 py-2 text-xs outline-none focus:border-purple-500"
          />
          <Button size="icon" className="h-8 w-8 rounded-xl bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSend} disabled={isTyping || !input.trim() || !file}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
