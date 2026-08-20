import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vania Memory",
  description: "Database dashboard untuk memori Vania",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-zinc-950 text-zinc-100`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
