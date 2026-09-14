import type { Metadata } from "next";
import { Bebas_Neue, Inter, Luckiest_Guy } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beermacs",
  description:
    "Beer pong tournament software for bars. Tables, brackets and results, run from the phones already in the room.",
};

// Bebas Neue: the mobile app's own display face (apps/mobile's font-display),
// carried over here for every structural heading — same brand, same voice.
// Luckiest Guy is deliberately NOT used that broadly: it's the one loud,
// spray-can-bubble face reserved for the BEERMACS wordmark itself, the one
// "poster" moment (see Hero) — using it everywhere would read as novelty,
// not brand.
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const luckiestGuy = Luckiest_Guy({ subsets: ["latin"], weight: "400", variable: "--font-poster" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${bebasNeue.variable} ${luckiestGuy.variable} ${inter.variable}`}
    >
      <head>
        <script
          defer
          src="https://umami-analytics-five-rosy.vercel.app/script.js"
          data-website-id="a19f8170-2d9a-4c73-9ca2-33b4e34fbc46"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
