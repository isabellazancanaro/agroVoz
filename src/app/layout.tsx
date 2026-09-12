import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroVoz | Registros BPA por voz",
  description: "Recepción, revisión y planillas SENASA para registros agrícolas desde WhatsApp.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
