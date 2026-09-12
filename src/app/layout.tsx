import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroVoz | Registros desde WhatsApp",
  description: "Recepción y revisión de registros de aplicaciones fitosanitarias para Córdoba.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
