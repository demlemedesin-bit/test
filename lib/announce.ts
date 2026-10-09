export type Announce = { on: boolean; text: string; url: string; bg: 'ink' | 'accent' | 'cream' };

const BGS: Announce['bg'][] = ['ink', 'accent', 'cream'];
/** site_content.announce → güvenli Announce (bozuk / eksik kayıt = kapalı). */
export function toAnnounce(v: unknown): Announce {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const bg = BGS.find((b) => b === o.bg) ?? 'ink';
  return { on: o.on === true, text: typeof o.text === 'string' ? o.text : '', url: typeof o.url === 'string' ? o.url : '', bg };
}

