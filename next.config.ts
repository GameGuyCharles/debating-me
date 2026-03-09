import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't use output: 'standalone' with custom server
  serverExternalPackages: ["pg"],
  async redirects() {
    return [
      {
        source: "/topics",
        destination: "/lobby",
        permanent: true,
      },
      {
        source: "/topics/:slug",
        destination: "/lobby",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
