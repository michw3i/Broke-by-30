import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broke by 30",
  description: "A financial life simulation powered by traceable public signals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
