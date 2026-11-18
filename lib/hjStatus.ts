/** HepsiJET ham kargo durumunu Türkçe, okunur etikete çevirir. Bilinmeyen durum olduğu gibi gösterilir. */
export function trKargo(last: string | null | undefined): string {
  const s = (last ?? '').trim();
  if (!s || s === 'OK') return 'Kurye bekleniyor';
  if (/edilemedi|edilmedi|not[\s_-]?deliver|undeliver|failed/i.test(s)) return 'Teslim edilemedi';
  if (/iade|return/i.test(s)) return 'İade sürecinde';
  if (/cancel|iptal/i.test(s)) return 'İptal edildi';
  if (/^delivered$|teslim[\s_-]?edildi|delivery[\s_-]?completed/i.test(s)) return 'Teslim edildi';
  if (/^delivering$|out[\s_-]?for[\s_-]?delivery|dağıtım|dagitim/i.test(s)) return 'Dağıtımda';
  if (/branch|şube|sube|xdock|depo|transfer|transit|in[\s_-]?transit|tasiniyor|taşınıyor|sorting|aktar/i.test(s)) return 'Taşınıyor';
  if (/picked|alındı|alindi|collected|pickup|received/i.test(s)) return 'Kurye teslim aldı';
  if (/created|olu[sş]tur|waiting|bekl|pending|ready/i.test(s)) return 'Kurye bekleniyor';
  return s;
}
