/** Sitenin kök adresi: NEXT_PUBLIC_SITE_URL (özel alan adı) → Vercel üretim adresi → yerel. */
export function siteUrl(): string {
  const e = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  return e.replace(/\/+$/, '');
}
