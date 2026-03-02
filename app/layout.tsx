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
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
