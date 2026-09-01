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
      <body>{children}</body>
    </html>
  );
}
