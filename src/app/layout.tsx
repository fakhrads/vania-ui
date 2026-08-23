import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { themeBootScript } from "@/lib/theme";

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Caduceus — Hermes Agentic Memory & Mission Control",
  description: "Open-source knowledge graph, memory explorer, kanban, and subagent tracking for Hermes Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased bg-bg text-tx-1`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
