"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  Layers, 
  Split, 
  FileSignature, 
  Droplets, 
  Stamp, 
  RotateCw, 
  Minimize2, 
  Printer, 
  Download, 
  EyeOff, 
  Sparkles, 
  Landmark, 
  Building2,
  Home,
  Shield,
  FileText
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkspaceStore } from "@/store/workspace";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setActiveTool, toggleRightTab, file, setStampDialogOpen, setSignatureDialogOpen, rotatePage, currentPage } = useWorkspaceStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, []);

  const runCommand = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search tools (e.g. sign, compress, stamp, merge)..." />
      <CommandList>
        <CommandEmpty>No matching commands found.</CommandEmpty>
        
        {/* Spec Section 42 Commands */}
        <CommandGroup heading="Document Actions & Tools (Section 42)">
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace'); })}>
            <Search className="mr-2 h-4 w-4 text-indigo-500" />
            <span>Search in Document (Ctrl + F)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace?tool=merge-pdf'); })}>
            <Layers className="mr-2 h-4 w-4 text-indigo-500" />
            <span>Merge PDF Files</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace?tool=split-pdf'); })}>
            <Split className="mr-2 h-4 w-4 text-amber-500" />
            <span>Split PDF Pages</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace'); setSignatureDialogOpen(true); })}>
            <FileSignature className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Sign PDF Document</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace'); toggleRightTab('watermark'); })}>
            <Droplets className="mr-2 h-4 w-4 text-blue-500" />
            <span>Add Watermark</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace'); setStampDialogOpen(true); })}>
            <Stamp className="mr-2 h-4 w-4 text-violet-500" />
            <span>Apply Rubber Stamp (APPROVED, CONFIDENTIAL)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace'); rotatePage(currentPage - 1, 90); })}>
            <RotateCw className="mr-2 h-4 w-4 text-cyan-500" />
            <span>Rotate Current Page 90°</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace?tool=compress-pdf'); })}>
            <Minimize2 className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Compress PDF File Size</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { window.print(); })}>
            <Printer className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Print Document (Ctrl + P)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { router.push('/workspace'); })}>
            <Download className="mr-2 h-4 w-4 text-indigo-600" />
            <span>Save & Export Document (Ctrl + S)</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Specialized Modes */}
        <CommandGroup heading="Specialized Portals & Compliance">
          <CommandItem onSelect={() => runCommand(() => router.push('/government'))}>
            <Landmark className="mr-2 h-4 w-4 text-indigo-600" />
            <span>Government PDF Tools Portal</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/banking'))}>
            <Building2 className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Banking & KYC Masking Suite</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/privacy-center'))}>
            <Shield className="mr-2 h-4 w-4 text-teal-600" />
            <span>Open Privacy Center</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/security'))}>
            <Shield className="mr-2 h-4 w-4 text-blue-600" />
            <span>Open Security Center</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation & Help */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <Home className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Homepage</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/pricing'))}>
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Pricing & Plans</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin'))}>
            <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Enterprise Admin Dashboard</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
