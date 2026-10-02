/** Türkçe-duyarsız arama yardımcıları (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c, büyük/küçük harf). */
export function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(q: string): string[] {
  return norm(q).split(' ').filter(Boolean).slice(0, 6);
}

/** Tüm sözcükler (herhangi bir alanda) geçiyorsa puan döner (yüksek = daha iyi), yoksa 0. İlk alan en değerlidir. */
export function score(fields: string[], toks: string[]): number {
  if (!toks.length) return 0;
  const n = fields.map(norm);
  let total = 0;
  for (const t of toks) {
    let best = 0;
    n.forEach((f, i) => {
      if (!f) return;
      const w = Math.max(1, 4 - i);
      const idx = f.indexOf(t);
      if (idx < 0) return;
      const s = w * (idx === 0 || f[idx - 1] === ' ' ? 3 : 1);
      if (s > best) best = s;
    });
    if (!best) return 0;
    total += best;
  }
  return total;
}
