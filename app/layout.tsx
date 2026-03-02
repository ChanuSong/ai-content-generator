import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nano Pro - AI Image & Video Generator",
  description:
    "Generate images with Gemini Pro, videos with Veo 3.1, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/30">
        {children}
      </body>
    </html>
  );
}
