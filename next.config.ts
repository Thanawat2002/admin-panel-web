import type { NextConfig } from "next";

/** Elysia API (admin-panel/api) */
const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Proxy /api/* to the Elysia API so the site and API share one origin
  // (the session cookie just works and no CORS setup is needed).
  // If a reverse proxy (nginx/Caddy) already routes /api, this rewrite is never hit.
  rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
