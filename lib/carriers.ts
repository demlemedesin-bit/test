/** Kargo firmaları ve takip adresi şablonları. `{no}` takip numarasıyla değiştirilir. Hem sunucuda hem tarayıcıda kullanılır. */
export type Carrier = { name: string; url: string };

export const CARRIERS: Carrier[] = [
  { name: 'Yurtiçi Kargo', url: 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={no}' },
  { name: 'Aras Kargo', url: 'https://www.araskargo.com.tr/trs-kargo-takip?kargo_takip_no={no}' },
  { name: 'MNG Kargo', url: 'https://www.mngkargo.com.tr/gonderi-takip/?q={no}' },
  { name: 'PTT Kargo', url: 'https://gonderitakip.ptt.gov.tr/Track/Verify?q={no}' },
  { name: 'Sürat Kargo', url: 'https://www.suratkargo.com.tr/gonderi-takip?takipNo={no}' },
  { name: 'UPS', url: 'https://www.ups.com/track?loc=tr_TR&tracknum={no}' },
  { name: 'HepsiJet', url: 'https://www.hepsijet.com/gonderi-takibi/{no}' },
  { name: 'Trendyol Express', url: 'https://www.trendyolexpress.com/gonderi-takip?trackingNo={no}' },
  { name: 'Diğer', url: '' },
];

export const CARRIER_NAMES = CARRIERS.map((c) => c.name);

/** Firma adı ve takip numarasından takip bağlantısı; firma tanınmıyorsa ya da numara yoksa boş döner. */
export function carrierUrl(name?: string | null, no?: string | null): string {
  const n = (no ?? '').trim();
  if (!name || !n) return '';
  const c = CARRIERS.find((x) => x.name.toLocaleLowerCase('tr-TR') === name.trim().toLocaleLowerCase('tr-TR'));
  return c && c.url ? c.url.replace('{no}', encodeURIComponent(n)) : '';
}
