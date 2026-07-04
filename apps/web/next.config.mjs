import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @gymtrack/core se publica como source JS crudo (sin build); Next debe
  // transpilarlo como si fuera código propio en vez de tratarlo como un paquete
  // ya compilado en node_modules.
  transpilePackages: ["@gymtrack/core"],
  // Este proyecto Next vive en apps/web dentro del monorepo; fija la raíz de
  // tracing acá para que no infiera la del repo (donde hay otro lockfile).
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (bucket público "media") — Fase 1 salida de Cloudinary.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
