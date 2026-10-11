import { rest } from './catalog';
import { serviceClient } from './notify';

/**
 * Konuklar bölümünün altındaki reels şeridi için Instagram reels'leri (Behold JSON feed üzerinden).
 * Başarılı her çekim site_content('ig_reels') içine son iyi kopya olarak yazılır; servis çökerse o kopya gösterilir.
 */
export type IgReel = { u: string; c: string; t?: string };
export type IgData = { user: string; reels: IgReel[] };

const FEED = /^https:\/\/feeds\.behold\.so\/[A-Za-z0-9_-]{6,64}$/;
const MAX = 20;
const KEY = 'ig_reels';

type Rec = Record<string, unknown>;
const rec = (x: unknown): Rec | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Rec) : null);
const str = (x: unknown) => (typeof x === 'string' ? x : '');
const httpsUrl = (x: unknown) => (/^https:\/\//i.test(str(x)) ? str(x) : '');

/** Behold feed gövdesini (posts dizisi) reels listesine çevirir; biçim farklıysa boş döner. */
export function parseFeed(body: unknown): IgData | null {
  const root = rec(body);
  const posts = Array.isArray(body) ? body : Array.isArray(root?.posts) ? (root!.posts as unknown[]) : null;
  if (!posts) return null;
  const items = posts.map(rec).filter((p): p is Rec => !!p);
  const isReel = (p: Rec) => p.isReel === true || str(p.mediaType).toUpperCase() === 'REEL';
  const pool = items.some(isReel) ? items.filter(isReel) : items.filter((p) => str(p.mediaType).toUpperCase() === 'VIDEO');
  const reels: IgReel[] = [];
  for (const p of pool) {
    const u = httpsUrl(p.permalink);
    const sizes = rec(p.sizes);
    const c = httpsUrl(rec(sizes?.medium)?.mediaUrl) || httpsUrl(rec(sizes?.large)?.mediaUrl) || httpsUrl(p.thumbnailUrl);
    if (!u || !c) continue;
    const cap = str(p.prunedCaption) || str(p.caption);
    reels.push({ u, c, t: cap.replace(/\s+/g, ' ').slice(0, 90) || undefined });
    if (reels.length >= MAX) break;
  }
  return reels.length ? { user: str(root?.username).replace(/^@/, '').slice(0, 40), reels } : null;
}

async function stored(): Promise<IgData | null> {
  const rows = await rest<{ value: IgData }[]>(`site_content?select=value&key=eq.${KEY}`);
  const v = rows?.[0]?.value;
  return v && Array.isArray(v.reels) && v.reels.length ? v : null;
}

/** Feed adresi geçerliyse reels'leri döner; çekim başarısızsa son iyi kopya, o da yoksa null (site konuğa göre reels'e döner). */
export async function getIgReels(feedUrl: string): Promise<IgData | null> {
  const url = feedUrl.trim();
  if (!FEED.test(url)) return null;
  try {
    const r = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const data = parseFeed(await r.json());
      if (data) {
        const old = await stored();
        if (!old || JSON.stringify(old.reels.map((x) => x.u)) !== JSON.stringify(data.reels.map((x) => x.u)) || old.reels[0]?.c !== data.reels[0]?.c) {
          const sb = serviceClient();
          if (sb) await sb.from('site_content').upsert({ key: KEY, value: data }).then(() => {}, () => {});
        }
        return data;
      }
    }
  } catch {
    /* son iyi kopyaya düş */
  }
  return stored();
}
