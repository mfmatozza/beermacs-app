import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship as TypeScript source and are transpiled by Next.
  transpilePackages: ["@beermacs/shared"],
};

export default nextConfig;
