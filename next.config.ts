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
  // ส่ง /api/* ต่อไปที่ Elysia ให้หน้าเว็บกับ API อยู่ domain เดียวกัน (cookie session ใช้ร่วมกันได้, ไม่ต้องตั้ง CORS)
  // ถ้า production ใช้ nginx/Caddy แยก /api ให้แล้ว rewrite นี้จะไม่ถูกเรียก
  rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
