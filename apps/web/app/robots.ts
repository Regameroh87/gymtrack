import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Permite a buscadores y crawlers de IA. Bloquea la ruta interna /s (las
// páginas de gym se sirven por subdominio con canonical propio).
export default function robots(): MetadataRoute.Robots {
  const aiBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/s/" },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
