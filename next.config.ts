import type { NextConfig } from "next";

const BASE_PATH = "/apps/incart"

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  allowedDevOrigins: ["kooky-unabashed-rice.ngrok-free.dev"],
};

export default nextConfig;
