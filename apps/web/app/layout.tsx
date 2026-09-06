import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beermacs",
  description:
    "Beer pong tournament software for bars. Tables, brackets and results, run from the phones already in the room.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
