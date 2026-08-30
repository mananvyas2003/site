import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // this archive is for exactly two people. never let a crawler in.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
