import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beermacs",
  description:
    "Beer pong tournament software for bars. Tables, brackets and results, run from the phones already in the room.",
};

const themeBootScript = `(() => {
  try {
    const saved = localStorage.getItem("beermacs-theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
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
