import type { Metadata, Viewport } from "next";
import "./engine.css";
import "./app.css";

export const metadata: Metadata = {
  title: "The WISDONOMICS Engine",
  description: "Block Ten Strategy's CEO framework: Customer, Edge, Offer.",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
