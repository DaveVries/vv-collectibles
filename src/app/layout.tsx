import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "V&V Collectibles — Sealed Pokémon & TCG pre-orders",
    template: "%s — V&V Collectibles",
  },
  description:
    "Sealed collectible cases & pre-orders. Officiële Pokémon, Bandai en TCG producten. Ook distributie en partnerprijzen voor winkels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
