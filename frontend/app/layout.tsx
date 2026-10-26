import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoardIQ",
  description: "A simple full-stack BoardIQ starter",
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
