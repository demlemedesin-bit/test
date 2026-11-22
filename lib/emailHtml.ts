import { siteUrl } from './siteUrl';

/**
 * Marka HTML e-posta şablonu. Panelde düzenlenen düz metin gövde korunur; burada paragraflara, düğmelere ve
 * kutulara çevrilir. Her e-posta düz metin yedeğiyle birlikte gider. Tablo tabanlı, satır içi stil (e-posta istemcileri için).
 */

const INK = '#17130F';
const INK2 = '#5b5148';
const CREAM = '#F4EEE1';
const PAPER = '#FBF8F1';
const LINE = '#d9cfbd';
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');

export type MailLine = { name: string; sub?: string; qty: number; total: string };
export type MailTotals = { subtotal: string; shipping: string; discount?: string; coupon?: string; total: string };
export type HtmlCtx = {
  /** Gelen kutusu önizleme satırı */
  preheader?: string;
  /** Sipariş özeti tablosu (alındı / ödeme alındı) */
  lines?: MailLine[];
  totals?: MailTotals;
  /** Altbilgi: neden bu e-postayı aldığı */
  reason?: string;
  /** Ticari iletilerde: gönderici kimliği ve tek tıkla ayrılma bağlantısı */
  who?: string;
  unsubUrl?: string;
};

const TOK = { track: '\u0001track\u0001', carrier: '\u0001carrier\u0001', pay: '\u0001pay\u0001', cart: '\u0001cart\u0001', items: '\u0001items\u0001' };

/** Şablon değişkenlerini doldururken bağlantı/kutu değişkenlerini işaretçiyle değiştirir (HTML'de düğme/kutu olacak). */
export function tokenVars(vars: Record<string, string>): Record<string, string> {
  return { ...vars, track_url: TOK.track, carrier_url: TOK.carrier, payment_info: TOK.pay, cart_url: TOK.cart, cart_items: TOK.items };
}

const btn = (href: string, label: string, primary = true) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="border-radius:10px;background:${primary ? INK : 'transparent'};border:2px solid ${INK}"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:.02em;color:${primary ? CREAM : INK};text-decoration:none">${esc(label)}</a></td></tr></table>`;

const box = (inner: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="background:${CREAM};border:1px solid ${LINE};border-radius:10px;padding:14px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK}">${inner}</td></tr></table>`;

const para = (inner: string) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.65;color:${INK}">${inner}</p>`;

function summary(lines: MailLine[] | undefined, t: MailTotals | undefined): string {
  if (!lines?.length && !t) return '';
  const rows = (lines ?? [])
    .map(
      (l) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:15px;line-height:1.45;color:${INK}">${esc(l.name)}${l.sub ? `<br><span style="font-size:13px;color:${INK2}">${esc(l.sub)}</span>` : ''}<br><span style="font-size:13px;color:${INK2}">${l.qty} adet</span></td><td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:15px;color:${INK};white-space:nowrap">${esc(l.total)}</td></tr>`,
    )
    .join('');
  const tr = (a: string, b: string, strong = false) =>
    `<tr><td style="padding:${strong ? '12px' : '5px'} 0 ${strong ? '0' : '0'};font-family:${FONT};font-size:${strong ? '17px' : '14px'};${strong ? 'font-weight:700;' : ''}color:${strong ? INK : INK2}">${esc(a)}</td><td align="right" style="padding:${strong ? '12px' : '5px'} 0 0;font-family:${FONT};font-size:${strong ? '17px' : '14px'};${strong ? 'font-weight:700;' : ''}color:${strong ? INK : INK2}">${esc(b)}</td></tr>`;
  const tot = t
    ? tr('Ara toplam', t.subtotal) + (t.discount ? tr(t.coupon ? `İndirim (${t.coupon})` : 'İndirim', t.discount) : '') + tr('Kargo', t.shipping) + tr('Toplam', t.total, true)
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px"><tr><td style="font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${INK2};padding-bottom:4px;border-bottom:2px solid ${INK}">Sipariş özeti</td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}${tot}</table></td></tr></table>`;
}

/**
 * Panel şablonunun (işaretçili) metin gövdesinden tam HTML üretir.
 * - bağlantı işaretçisi taşıyan paragraf → cümle + düğme
 * - ödeme bilgisi → kutu; kargo satırı → kutu
 * - "Demleme" imza satırı → imza
 */
export function renderEmailHtml(bodyTokenized: string, vars: Record<string, string>, ctx: HtmlCtx = {}): string {
  const base = siteUrl();
  const paras = bodyTokenized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  let out = '';
  let summaryDone = false;
  paras.forEach((p, idx) => {
    const last = idx === paras.length - 1;
    const sig = last ? p.match(/^(Sevgiler|Sevgiyle|Selamlar|Saygılar),?\s*\n+([^\n]{1,40})$/i) : null;
    if (sig) {
      out += `<p style="margin:22px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${INK}">${esc(sig[1])},<br><strong>${esc(sig[2])}</strong></p>`;
      return;
    }
    if (last && /^demleme$/i.test(p)) {
      out += `<p style="margin:22px 0 0;font-family:${FONT};font-size:16px;color:${INK}">Sevgiyle,<br><strong style="letter-spacing:.06em;text-transform:uppercase">Demleme</strong></p>`;
      return;
    }
    if (p.includes(TOK.pay)) {
      const info = vars.payment_info || '';
      const rows = info
        .split('\n')
        .map((ln) => {
          const m = ln.match(/^(IBAN|Hesap sahibi|Banka):\s*(.+)$/);
          return m ? `<span style="color:${INK2}">${esc(m[1])}</span> <strong style="${m[1] === 'IBAN' ? 'font-family:Menlo,Consolas,monospace;letter-spacing:.02em' : ''}">${esc(m[2])}</strong>` : esc(ln);
        })
        .join('<br>');
      const lead = p.replace(TOK.pay, '').trim();
      out += (lead ? para(nl2br(lead)) : '') + box(rows);
      // Sipariş özeti, ödeme bilgisinden önce gelsin
      return;
    }
    if (p.includes(TOK.carrier)) {
      // "Etiket: değer" satırları kutuda; bağlantı satırı (etiketi kalan) düğmeye dönüşür
      const rows = p
        .split('\n')
        .filter((ln) => !ln.includes(TOK.carrier) && ln.trim())
        .map((ln) => {
          const m = ln.match(/^([^:]{1,30}):\s*(.*)$/);
          return m ? `<span style="color:${INK2}">${esc(m[1])}:</span> <strong>${esc(m[2])}</strong>` : esc(ln);
        })
        .join('<br>');
      const label = (p.split('\n').find((ln) => ln.includes(TOK.carrier)) || '').replace(TOK.carrier, '').replace(/[:\s]+$/, '').trim();
      const url = vars.carrier_url || '';
      out += (rows ? box(rows) : '') + (url ? btn(url, label || 'Kargom nerede?') : '');
      return;
    }
    if (p.includes(TOK.track)) {
      const lead = p.replace(TOK.track, '').replace(/[:\s]+$/, '').trim();
      const text = lead ? lead.replace(/\s*(:|—|-)\s*$/, '') + '.' : '';
      out += (text ? para(nl2br(text.replace(/\.\.$/, '.'))) : '') + btn(vars.track_url || base, 'Siparişimi takip et');
      return;
    }
    if (p.includes(TOK.cart)) {
      const lead = p.replace(TOK.cart, '').replace(/[:\s]+$/, '').trim();
      out += (lead ? para(nl2br(lead)) : '') + btn(vars.cart_url || `${base}/sepet`, 'Sepetime dön');
      return;
    }
    if (p.includes(TOK.items)) {
      const items = (vars.cart_items || '').split('\n').filter(Boolean).map((l) => l.replace(/^[-•]\s*/, ''));
      const lead = p.split(TOK.items)[0].trim();
      out += (lead ? para(nl2br(lead)) : '') + box(items.map((i) => esc(i)).join('<br>'));
      return;
    }
    out += para(nl2br(p));
    // Sipariş özeti: sipariş numarasının geçtiği paragrafın hemen altına
    if (idx === Math.min(1, paras.length - 1) && !summaryDone) {
      out += summary(ctx.lines, ctx.totals);
      summaryDone = true;
    }
  });
  if (!summaryDone) {
    const sum = summary(ctx.lines, ctx.totals);
    const at = out.lastIndexOf('<p style="margin:22px 0 0');
    if (sum) out = at >= 0 ? out.slice(0, at) + sum + out.slice(at) : out + sum;
  }

  const logo = `${base}/demleme/01-brand/logo/logo-still.png`;
  const pre = ctx.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(ctx.preheader)}</div>` : '';
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Demleme</title></head>
<body style="margin:0;padding:0;background:${CREAM}">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 18px"><a href="${base}" style="text-decoration:none"><img src="${logo}" width="64" height="64" alt="" style="display:inline-block;vertical-align:middle;border:0;width:64px;height:64px"><span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${INK}">Demleme</span></a></td></tr>
<tr><td style="background:${PAPER};border:2px solid ${INK};border-radius:14px;padding:30px 28px 26px">${out}</td></tr>
<tr><td align="center" style="padding:18px 10px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${INK2}">${ctx.reason ? esc(ctx.reason) + '<br>' : ''}${ctx.who ? esc('Gönderen: ' + ctx.who) + '<br>' : ''}Soruların için bu e-postaya yanıt verebilirsin.<br>${ctx.unsubUrl ? `<a href="${esc(ctx.unsubUrl)}" style="color:${INK2}">E-posta almak istemiyorum</a><br>` : ''}<a href="${base}" style="color:${INK2}">${esc(base.replace(/^https?:\/\//, ''))}</a></td></tr>
</table></td></tr></table></body></html>`;
}
