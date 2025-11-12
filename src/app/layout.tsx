import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reluit",
  description: "AI voice agent for small and mid-size businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

