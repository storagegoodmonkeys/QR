import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flick! QR Code Generator",
  description: "Admin tool to generate QR code batches for Flick lighters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0A0A] text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
