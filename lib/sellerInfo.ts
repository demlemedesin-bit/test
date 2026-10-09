import type { ShopConfig } from './catalog';

/** Footer ve İletişim sayfasında gösterilen satıcı bilgileri; panelde boş bırakılan alanlar gizlenir. */
export function sellerParts(c: ShopConfig): { label: string; value: string }[] {
  const s = c.seller;
  const rows: [string, string][] = [
    ['Ticari unvan', s.name],
    ['Adres', s.address],
    ['Vergi dairesi', s.taxOffice],
    ['Vergi no', s.taxNo],
    ['Mersis no', s.mersis],
    ['Telefon', s.phone],
    ['E-posta', c.contactEmail],
  ];
  return rows.filter(([, v]) => v && v.trim()).map(([label, value]) => ({ label, value: value.trim() }));
}

export function sellerLine(c: ShopConfig): string {
  const s = c.seller;
  const tax = [s.taxOffice && `V.D. ${s.taxOffice}`, s.taxNo && `V.No ${s.taxNo}`].filter(Boolean).join(' ');
  return [s.name, s.address, tax, s.mersis && `Mersis ${s.mersis}`, s.phone && `Tel ${s.phone}`].filter((x) => x && String(x).trim()).join(' · ');
}

export const PAY_NOTE = 'Güvenli ödeme: Paynkolay altyapısı · 3D Secure · Visa · Mastercard · Troy';
