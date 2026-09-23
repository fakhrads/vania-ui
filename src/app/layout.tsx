import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { themeBootScript } from "@/lib/theme";

/* Tiga suara: Geist buat teks kerja, Geist Mono buat angka & ID (lebar
   digitnya seragam, jadi angka yang berdetak tiap 5 detik tidak menggeser
   layout), Instrument Serif cuma buat judul & angka utama. */
const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
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
      <body className={`${sans.variable} ${mono.variable} ${display.variable} font-sans antialiased bg-bg text-tx-1`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
