import type { Metadata } from "next";
import "./globals.css";
import { BASE_PATH } from "@/lib/paths";

export const metadata: Metadata = {
  title: "VibeVision",
  description:
    "Feel the vibe. Experience restaurants, pubs and nightlife through live streaming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ "--bg-image": `url(${BASE_PATH}/background.jpg)` } as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
