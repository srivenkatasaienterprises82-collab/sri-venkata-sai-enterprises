import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Load Sanity CDN / external images directly instead of through the
    // Next.js optimizer. The optimizer was serving stale 400/404 responses
    // from its edge cache for valid image URLs, breaking product images.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  remotePatterns: [
    { protocol: "https", hostname: "cdn.sanity.io" },
    { protocol: "https", hostname: "i.ibb.co", pathname: "/**" },
    { protocol: "https", hostname: "cdn.ibbfile.com", pathname: "/**" },
  ],
  },
  turbopack: {
    // Pin the workspace root to this project directory so Turbopack doesn't
    // infer a parent folder when multiple lockfiles are present upstream.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
