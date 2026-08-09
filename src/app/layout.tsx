import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import GlobalRefreshButton from "@/components/GlobalRefreshButton";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Comanda Guela Seca",
  description: "Sistema MVP de comanda para Empório Beer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased relative`}>
        {children}
        <GlobalRefreshButton />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
