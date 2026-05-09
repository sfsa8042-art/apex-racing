import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX — Sim Racing Platform",
  description: "Get faster on track with structured learning and telemetry-based insights.",
  keywords: ["sim racing", "telemetry", "iRacing", "ACC", "lap time improvement"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
