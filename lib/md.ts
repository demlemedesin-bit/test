/**
 * Güvenli mini-markdown → HTML. Ham HTML geçirilmez: girdinin TÜM metni önce kaçışlanır, sonra biçim eklenir.
 * Desteklenenler: # / ## / ### başlıklar (sayfa başlığı h1 olduğu için h2 / h3 / h4 üretilir), paragraf, **kalın**, *italik*,
 * [bağlantı](url), "- " listesi, "1. " listesi, "> " alıntı, ![alt](url) görsel, "---" ayraç.
 * Bağlantılar yalnızca http(s) / mailto / tel / site içi "/" ile, görseller yalnızca http(s) ve "/" ile başlayabilir; diğerleri düz metin kalır.
 */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ESC[c]);

// Site içi yol: "/" ile başlar ama "//" veya "/\" (protokolsüz dış adres) değildir.
const isLocal = (u: string) => u.startsWith('/') && !/^\/[/\\]/.test(u);
const okLink = (u: string) => isLocal(u) || /^(https?:\/\/|mailto:|tel:)/i.test(u);
const okImg = (u: string) => isLocal(u) || /^https?:\/\//i.test(u);

/** Satır içi biçim. Girdi ham metindir; çıktı güvenli HTML. */
function inline(src: string): string {
  const stash: string[] = [];
  const hold = (html: string) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = esc(src.replace(/\u0000/g, ''));

  // Görseller (kaçışlanmış metin üzerinde çalışır; " zaten &quot; olduğundan öznitelikten çıkılamaz)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, url: string) =>
    hold(okImg(url) ? `<img src="${url}" alt="${alt}" loading="lazy">` : alt),
  );
  // Bağlantılar: açılış ve kapanış etiketi ayrı tutulur, metin içindeki **kalın** / *italik* çalışmaya devam eder
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text: string, url: string) => {
    if (!okLink(url)) return text;
    const ext = /^https?:/i.test(url);
    return hold(`<a href="${url}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>`) + text + hold('</a>');
  });
  s = s.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => stash[Number(i)] ?? '');
}

const isHr = (l: string) => /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
const isHead = (l: string) => /^\s{0,3}#{1,3}\s+\S/.test(l);
const isUl = (l: string) => /^\s{0,3}-\s+\S/.test(l);
const isOl = (l: string) => /^\s{0,3}\d{1,3}\.\s+\S/.test(l);
const isQuote = (l: string) => /^\s{0,3}>/.test(l);
const startsBlock = (l: string) => isHr(l) || isHead(l) || isUl(l) || isOl(l) || isQuote(l);

function blocks(lines: string[], depth: number): string {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
    } else if (isHr(l)) {
      out.push('<hr>');
      i++;
    } else if (isHead(l)) {
      const m = /^\s{0,3}(#{1,3})\s+(.*?)\s*#*\s*$/.exec(l)!;
      const lv = m[1].length + 1;
      out.push(`<h${lv}>${inline(m[2])}</h${lv}>`);
      i++;
    } else if (isQuote(l)) {
      const q: string[] = [];
      while (i < lines.length && isQuote(lines[i])) q.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
      out.push(`<blockquote>${depth < 3 ? blocks(q, depth + 1) : `<p>${inline(q.join(' '))}</p>`}</blockquote>`);
    } else if (isUl(l) || isOl(l)) {
      const ol = isOl(l);
      const test = ol ? isOl : isUl;
      const items: string[] = [];
      while (i < lines.length && test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s{0,3}(-|\d{1,3}\.)\s+/, ''))}</li>`);
      out.push(`<${ol ? 'ol' : 'ul'}>${items.join('')}</${ol ? 'ol' : 'ul'}>`);
    } else {
      const p: string[] = [];
      while (i < lines.length && lines[i].trim() && !(p.length && startsBlock(lines[i]))) p.push(lines[i++].trim());
      out.push(`<p>${inline(p.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

export function md(src: string | null | undefined): string {
  return blocks(String(src ?? '').replace(/\r\n?/g, '\n').split('\n'), 0);
}
