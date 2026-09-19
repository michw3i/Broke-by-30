import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broke by 30",
  description: "A financial life simulator for your twenties.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
