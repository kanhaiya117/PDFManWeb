import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "PDFMan — Fast. Private. Secure. The Modern PDF Platform",
  description: "Read, edit, annotate, organize, and convert your PDFs directly in your browser with 100% local-first privacy.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen w-full max-w-full overflow-x-hidden flex flex-col selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegister />
          {children}
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
