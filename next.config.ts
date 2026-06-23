import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    // Pin the workspace root to this project directory so Turbopack doesn't
    // infer a parent folder when multiple lockfiles are present upstream.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
