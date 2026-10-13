import type { NextConfig } from "next";

// The GitHub Actions workflow sets GITHUB_PAGES=true. Local dev is unchanged.
const forPages = process.env.GITHUB_PAGES === "true";
const basePath = forPages ? "/vibevision" : "";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: forPages ? "export" : undefined,
  basePath,
  trailingSlash: forPages,
  images: { unoptimized: forPages },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
