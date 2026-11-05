const projectAliases = require("./lib/portfolio-legacy.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return Object.entries(projectAliases).map(([source, destination]) => ({
      source: `/work/${source}`,
      destination: `/work/${destination}`,
      permanent: true
    }));
  },
  // sharp: 部署时由 .env 决定 SHARP_CONCURRENCY
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  // 2c4g 部署时启用 standalone (v0.4 §13.4)
  output: process.env.DEPLOY_MODE === "prod-4g" || process.env.DEPLOY_MODE === "prod-16g" ? "standalone" : undefined,
  experimental: {
    // Phase 2 启用 typedRoutes
    typedRoutes: false
  }
};

module.exports = nextConfig;
