import { supabase } from './supabase';

/** Görsel sıkıştırma ayarları (site_content.key = 'media'). */
export type MediaSettings = {
  max_px: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'auto';
  keep_png_transparency: boolean;
  strip_exif: boolean;
  skip_below_kb: number;
  max_upload_mb: number;
  thumb_px: number;
};

export const MEDIA_DEFAULTS: MediaSettings = {
  max_px: 1600,
  quality: 0.82,
  format: 'webp',
  keep_png_transparency: true,
  strip_exif: true,
  skip_below_kb: 60,
  max_upload_mb: 15,
  thumb_px: 480,
};

export const MEDIA_BUCKET = 'product-images';

const num = (v: unknown, d: number, min: number, max: number) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

/** Bozuk / eksik değerleri güvenli aralığa çeker; bilinmeyen alanları atar. */
export function validateMediaSettings(raw: unknown): MediaSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const D = MEDIA_DEFAULTS;
  const format = r.format === 'webp' || r.format === 'jpeg' || r.format === 'auto' ? r.format : D.format;
  return {
    max_px: Math.round(num(r.max_px, D.max_px, 320, 6000)),
    quality: Math.round(num(r.quality, D.quality, 0.5, 0.95) * 100) / 100,
    format,
    keep_png_transparency: typeof r.keep_png_transparency === 'boolean' ? r.keep_png_transparency : D.keep_png_transparency,
    strip_exif: true,
    skip_below_kb: Math.round(num(r.skip_below_kb, D.skip_below_kb, 0, 5000)),
    max_upload_mb: Math.round(num(r.max_upload_mb, D.max_upload_mb, 1, 50)),
    thumb_px: Math.round(num(r.thumb_px, D.thumb_px, 120, 1200)),
  };
}

let cache: { at: number; value: MediaSettings } | null = null;
const TTL = 5 * 60 * 1000;

/** Ayarları okur (5 dk bellek önbelleği). Hata / kayıt yok = varsayılanlar. */
export async function getMediaSettings(force = false): Promise<MediaSettings> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.value;
  let value = MEDIA_DEFAULTS;
  try {
    const { data, error } = await supabase().from('site_content').select('value').eq('key', 'media').maybeSingle();
    if (!error && data) value = validateMediaSettings((data as { value: unknown }).value);
  } catch {
    /* varsayılanlar */
  }
  cache = { at: Date.now(), value };
  return value;
}

/** Ayarları kaydeder (site_content upsert) ve önbelleği günceller. */
export async function saveMediaSettings(s: MediaSettings): Promise<MediaSettings> {
  const value = validateMediaSettings(s);
  const { error } = await supabase().from('site_content').upsert({ key: 'media', value }, { onConflict: 'key' });
  if (error) throw error;
  cache = { at: Date.now(), value };
  return value;
}

export type Compressed = {
  blob: Blob;
  width: number;
  height: number;
  ext: string;
  mime: string;
  before: number;
  after: number;
  /** true: dosya olduğu gibi bırakıldı (SVG/GIF, küçük dosya ya da sıkıştırma kazandırmadı) */
  untouched: boolean;
  reason?: 'vektor' | 'kucuk' | 'kazanc-yok';
};

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' };

export const fmtBytes = (n: number) => (n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 1 : 2).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

/** "1.8 MB → 240 KB (%87 küçüldü)" */
export function gainText(before: number, after: number): string {
  if (after >= before) return `${fmtBytes(before)} (olduğu gibi)`;
  return `${fmtBytes(before)} → ${fmtBytes(after)} (%${Math.round((1 - after / before) * 100)} küçüldü)`;
}

let webpOk: boolean | null = null;
function supportsWebp(): boolean {
  if (webpOk === null) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      webpOk = c.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      webpOk = false;
    }
  }
  return webpOk;
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error('Görsel okunamadı. JPG, PNG veya WebP dosyası dene.');
    }
  }
}

function hasAlpha(bmp: ImageBitmap): boolean {
  try {
    const k = Math.min(1, 160 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    const x = c.getContext('2d', { willReadFrequently: true });
    if (!x) return false;
    x.drawImage(bmp, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  } catch {
    /* okunamadı = şeffaf sayma */
  }
  return false;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Görsel işlenemedi.'))), type, q));

/** Dosya türü / boyut denetimi (Türkçe hata fırlatır). */
export function checkImageFile(file: File, s: MediaSettings): void {
  if (!/^image\/(jpeg|png|webp|gif|svg\+xml|avif)$/.test(file.type)) throw new Error(`"${file.name}" desteklenmeyen dosya türü. JPG, PNG, WebP, GIF veya SVG yükleyebilirsin.`);
  if (file.size > s.max_upload_mb * 1048576) throw new Error(`"${file.name}" çok büyük (${fmtBytes(file.size)}). En fazla ${s.max_upload_mb} MB yüklenebilir.`);
}

export type CompressOpts = { maxPx?: number; force?: boolean };

/**
 * Görseli ayarlara göre küçültür. EXIF yönü düzeltilir, meta veri tuvalde silinir.
 * SVG/GIF'e dokunmaz; sonuç orijinalden büyükse orijinali döndürür.
 */
export async function compressImage(file: File, s: MediaSettings = MEDIA_DEFAULTS, opts: CompressOpts = {}): Promise<Compressed> {
  checkImageFile(file, s);
  const before = file.size;
  const origExt = EXT[file.type] ?? 'bin';
  const keep = async (reason: Compressed['reason']): Promise<Compressed> => {
    let width = 0;
    let height = 0;
    if (file.type !== 'image/svg+xml') {
      try {
        const b = await decode(file);
        width = b.width;
        height = b.height;
        b.close();
      } catch {
        /* boyut bilinmiyor */
      }
    }
    return { blob: file, width, height, ext: origExt, mime: file.type, before, after: before, untouched: true, reason };
  };

  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return keep('vektor');
  if (!opts.force && before < s.skip_below_kb * 1024) return keep('kucuk');

  const bmp = await decode(file);
  try {
    const max = opts.maxPx ?? s.max_px;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));

    const alpha = file.type !== 'image/jpeg' && hasAlpha(bmp);
    let mime: string;
    if (s.format === 'jpeg') mime = 'image/jpeg';
    else mime = supportsWebp() ? 'image/webp' : 'image/jpeg';
    // Şeffaf PNG: JPEG'e düzleştirme, WebP (alfa destekli) ya da PNG olarak koru
    if (alpha && s.keep_png_transparency && mime === 'image/jpeg') mime = 'image/png';

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    if (!x) throw new Error('Görsel işlenemedi.');
    x.imageSmoothingQuality = 'high';
    if (mime === 'image/jpeg') {
      x.fillStyle = '#fff';
      x.fillRect(0, 0, w, h);
    }
    x.drawImage(bmp, 0, 0, w, h);

    const q = alpha && s.keep_png_transparency && mime === 'image/webp' ? Math.max(s.quality, 0.9) : s.quality;
    let blob = await toBlob(c, mime, mime === 'image/png' ? undefined : q);
    if (blob.type && blob.type !== mime) mime = blob.type; // tarayıcı desteklemeyip PNG'ye düşebilir
    if (blob.size >= before) return await keep('kazanc-yok'); // sonuç büyükse orijinal kalsın
    blob = blob.type === mime ? blob : new Blob([blob], { type: mime });
    return { blob, width: w, height: h, ext: EXT[mime] ?? 'webp', mime, before, after: blob.size, untouched: false };
  } finally {
    bmp.close();
  }
}

/** Küçük önizleme (thumb_px) — yükleme listesi vb. için. */
export async function makeThumb(file: Blob, px: number): Promise<Blob | null> {
  try {
    const bmp = await decode(file);
    const k = Math.min(1, px / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return await toBlob(c, supportsWebp() ? 'image/webp' : 'image/jpeg', 0.7);
  } catch {
    return null;
  }
}

/** Dosya adından okunabilir, güvenli slug ("Kahve Fincanı.JPG" → "kahve-fincani"). */
export function fileSlug(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return base
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

/** Klasör adını güvenli hale getirir (ör. "Blog Görselleri/2026" → "blog-gorselleri/2026"). */
export function cleanFolder(f: string): string {
  return f
    .split('/')
    .map((p) => fileSlug(p + '.x'))
    .filter(Boolean)
    .join('/');
}

export function publicUrl(path: string): string {
  return supabase().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export type UploadResult = { url: string; name: string; before: number; after: number; width: number; height: number; untouched: boolean };

/** Sıkıştırıp yükler; ayrıntıyla döner. Dosya adı: klasör/zaman-slug-rastgele.ext */
export async function uploadImageDetailed(file: File, folder: string, settings?: MediaSettings): Promise<UploadResult> {
  const s = settings ?? (await getMediaSettings());
  const r = await compressImage(file, s);
  const slug = fileSlug(file.name);
  const dir = cleanFolder(folder) || 'site';
  const name = `${dir}/${Date.now()}-${slug ? slug + '-' : ''}${Math.random().toString(36).slice(2, 6)}.${r.ext}`;
  const up = await supabase().storage.from(MEDIA_BUCKET).upload(name, r.blob, { contentType: r.mime, upsert: false, cacheControl: '31536000' });
  if (up.error) throw new Error(storageMessage(up.error.message, r.after));
  return { url: publicUrl(name), name, before: r.before, after: r.after, width: r.width, height: r.height, untouched: r.untouched };
}

/** Depolama hatalarını Türkçe, anlaşılır cümleye çevirir. */
export function storageMessage(m: string, size?: number): string {
  if (/exceeded|too large|payload|size/i.test(m)) return `Dosya depolama sınırını aşıyor${size ? ` (${fmtBytes(size)})` : ''}. Sıkıştırma ayarlarını sıkılaştır ya da daha küçük görsel dene.`;
  if (/mime|type/i.test(m)) return 'Bu dosya türüne depolama izin vermiyor (yalnızca WebP, PNG, JPEG).';
  if (/row-level|policy|permission|unauthor/i.test(m)) return 'Yükleme yetkin yok. Yöneticiye danış.';
  return m;
}
