import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cegonzz Cold Storage - Almacén",
  description: "Sistema de captura de movimientos de almacén",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
