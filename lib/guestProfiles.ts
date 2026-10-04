import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSite } from './site';
import { DRAWINGS } from './siteDefaults';
import { guestSlug } from './guestSlug';
import { parseVideo } from './catalog';

export type Profile = { name: string; slug: string; bio: string[]; img: string | null; photos: string[]; videos: string[] };

const KONUK = '/demleme/04-konuklar/';
type Bio = { name: string; slug: string; bio: string[] };
const BIOS: Bio[] = JSON.parse(readFileSync(join(process.cwd(), 'content/konuk-profilleri.json'), 'utf8'));
const paras = (t: string) => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);

/** Profili olan konuklar. Panelde yazılan metin/fotoğraf varsa o, yoksa Garen'in belgesindeki varsayılan metin geçerli. */
export async function getProfiles(): Promise<Profile[]> {
  const site = await getSite();
  const out: Profile[] = [];
  const seen = new Set<string>();
  for (const g of site.guests) {
    if (!g?.name?.trim()) continue;
    const slug = guestSlug(g.name);
    if (!slug || seen.has(slug)) continue;
    const def = BIOS.find((b) => b.slug === slug);
    const bio = g.bio?.trim() ? paras(g.bio) : def?.bio ?? [];
    if (!bio.length) continue;
    seen.add(slug);
    out.push({ name: g.name.trim(), slug, bio, img: DRAWINGS.includes(g.drawing) ? `${KONUK}guests/${g.drawing}-720.webp` : null, photos: (g.photos ?? []).filter(Boolean), videos: [...new Set((g.videos ?? '').split(/\s+/).map((u) => parseVideo(u)?.yt).filter((x): x is string => !!x))] });
  }
  for (const b of BIOS) if (!seen.has(b.slug)) out.push({ name: b.name, slug: b.slug, bio: b.bio, img: null, photos: [], videos: [] });
  return out;
}

/** Ana sayfadaki konuğun profil adresi (profili yoksa liste sayfası). */
export function profileHref(name: string, hasBio = false): string {
  const s = guestSlug(name);
  return hasBio || BIOS.some((b) => b.slug === s) ? `/konuklar/${s}` : '/konuklar';
}
