import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "BeeCheck - Análise de Performance para Hotéis",
  description: "Analise a performance do seu site de hotel e descubra como aumentar suas reservas com relatórios simples e práticos.",
  icons: {
      icon: { url: '/favicon.svg', type: 'image/svg+xml' },
      apple: '/apple-touch-icon.png'
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
