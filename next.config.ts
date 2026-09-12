import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
  serverExternalPackages: ["@huggingface/transformers", "ffmpeg-static"],
};

export default nextConfig;
