import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';
import { baseUrl, robotsPlan } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getSeoBundle();
  const plan = robotsPlan(seo, baseUrl(seo, siteUrl()));
  return { rules: plan.rules, sitemap: plan.sitemap };
}
