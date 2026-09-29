import type { MetadataRoute } from "next";
import { articles } from "@/data/insights";
import { siteUrl, staticRoutes } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  return [
    ...staticRoutes.map((r) => ({ url: `${url}${r.path === "/" ? "" : r.path}`, priority: r.priority, changeFrequency: "monthly" as const })),
    ...articles.map((a) => ({
      url: `${url}/insights/${a.slug}`,
      lastModified: a.updated ?? a.published,
      priority: 0.5,
      changeFrequency: "yearly" as const,
    })),
  ];
}
