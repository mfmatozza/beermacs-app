import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship as TypeScript source and are transpiled by Next.
  transpilePackages: ["@beermacs/shared", "@beermacs/db"],
  // Keep the Prisma runtime + pg driver out of any bundle — they are required
  // at runtime on the server from node_modules, never bundled for the browser.
  // (@beermacs/db itself is transpiled above; it must NOT also be listed here.)
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  // Nothing here is meant to be framed; /admin especially (clickjacking).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
