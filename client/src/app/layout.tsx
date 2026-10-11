import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
