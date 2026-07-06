import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";

// Closest freely available equivalent to DIN 1450 — geometric, barrier-free proportions
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HDI Analytics | Marketing Mix Model",
  description: "Plataforma de resultados del Marketing Mix Model para HDI Seguros México",
  icons: {
    icon: "https://www.hdi.com.mx/wp-content/uploads/2021/12/2009-hdi-seguros-001.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${barlow.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
