/** Konuk adından profil adresi (istemci ve sunucuda ortak). */
export function slugify(s: string): string {
  return s.trim().toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
/** Panelde yazılan ad belgedeki addan biraz farklı olabilir (ör. "Arto abi"). */
export const ALIAS: Record<string, string> = { 'degirmeci-mustafa': 'degirmenci-mustafa', 'arto-abi': 'arto-dayday', mustafa: 'degirmenci-mustafa', mahmut: 'mahmut-kemal' };
export const guestSlug = (name: string) => { const s = slugify(name); return ALIAS[s] ?? s; };
