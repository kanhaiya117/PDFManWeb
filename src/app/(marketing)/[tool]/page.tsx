import { notFound } from "next/navigation";
import { PDF_TOOLS } from "@/lib/tools-data";
import { ToolLanding } from "@/components/tool-landing";

const TOOL_ALIASES: Record<string, string> = {
  'presentation': 'presentation-mode',
  'fill-pdf': 'pdf-forms',
  'organize': 'organize-pdf',
  'rotate': 'rotate-pdf',
  'delete': 'delete-pages',
  'extract': 'extract-pages',
  'password-protect': 'protect-pdf',
  'unlock': 'unlock-pdf',
  'redact': 'redact-pdf',
  'watermark': 'watermark-pdf',
  'metadata': 'remove-metadata',
  'flatten': 'flatten-pdf',
  'pdfa': 'pdf-a',
  'images-to-pdf': 'jpg-to-pdf',
  'pdf-to-images': 'pdf-to-jpg',
  'pdf-to-png': 'pdf-to-jpg',
  'png-to-pdf': 'jpg-to-pdf',
  'pdf-to-text': 'extract-text',
  'compress': 'compress-pdf',
  'extract-images': 'pdf-to-jpg',
  'document-summary': 'summarize-pdf',
  'split': 'split-pdf',
  'government': 'government-mode',
  'banking': 'banking-mode',
  'kyc-sanitize': 'banking-mode',
};

export function generateStaticParams() {
  const canonical = PDF_TOOLS.map((tool) => ({
    tool: tool.id,
  }));
  const aliases = Object.keys(TOOL_ALIASES).map((alias) => ({
    tool: alias,
  }));
  return [...canonical, ...aliases];
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const canonicalId = TOOL_ALIASES[tool] || tool;
  const toolData = PDF_TOOLS.find((t) => t.id === canonicalId);

  if (!toolData) {
    notFound();
  }

  return <ToolLanding tool={toolData} />;
}
