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
  // Google Search Console, URL-prefix property for https://www.vvcollectibles.com.
  // Verified by meta tag rather than DNS: the TXT record could not be added
  // alongside the existing SPF record at the apex. Not a secret — it is served
  // in the page source by design. Removing it un-verifies the property.
  verification: {
    google: "brsV1NiGqPDpcpSqYfrzoEk_Gx2zO19bZT6Da0S4stY",
  },
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
