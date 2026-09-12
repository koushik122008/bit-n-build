import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bit-N-Bulid — Orbital Traffic Management Console",
  description: "Autonomous orbital traffic management system, debris screening, and collision avoidance mission control console.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void text-primary font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
