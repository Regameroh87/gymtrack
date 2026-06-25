import type { MetadataRoute } from "next";
import { SITE_URL, gymPublicUrl } from "@/lib/site";
import { listPublicGyms } from "@/lib/gym";

export const revalidate = 3600;

// Landing de marca + una entrada por subdominio de cada gym activo.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const gyms = await listPublicGyms();

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...gyms.map((g) => ({
      url: gymPublicUrl(g.slug),
      lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
