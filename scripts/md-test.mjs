// Kendi kendini sınayan betik: node --experimental-strip-types scripts/md-test.mjs
import { md } from '../lib/md.ts';

let fail = 0;
const t = (name, ok, got) => {
  if (!ok) {
    fail++;
    console.error('BAŞARISIZ:', name, '\n  çıktı:', got);
  } else console.log('ok  ', name);
};
const has = (s, x) => s.includes(x);

// Biçimler
t('başlıklar', md('# A\n## B\n### C') === '<h2>A</h2>\n<h3>B</h3>\n<h4>C</h4>', md('# A\n## B\n### C'));
t('kalın/italik', has(md('**k** ve *i*'), '<strong>k</strong>') && has(md('**k** ve *i*'), '<em>i</em>'), md('**k** ve *i*'));
t('liste', md('- a\n- b') === '<ul><li>a</li><li>b</li></ul>', md('- a\n- b'));
t('sıralı liste', md('1. a\n2. b') === '<ol><li>a</li><li>b</li></ol>', md('1. a\n2. b'));
t('alıntı', has(md('> merhaba'), '<blockquote><p>merhaba</p></blockquote>'), md('> merhaba'));
t('ayraç', md('---') === '<hr>', md('---'));
t('güvenli bağlantı', has(md('[x](https://a.com/?q=1&r=2)'), '<a href="https://a.com/?q=1&amp;r=2" target="_blank" rel="noopener noreferrer">x</a>'), md('[x](https://a.com/?q=1&r=2)'));
t('site içi bağlantı', has(md('[x](/blog)'), '<a href="/blog">x</a>'), md('[x](/blog)'));
t('mailto', has(md('[x](mailto:a@b.co)'), 'href="mailto:a@b.co"'), md('[x](mailto:a@b.co)'));
t('görsel', has(md('![alt](/a.webp)'), '<img src="/a.webp" alt="alt" loading="lazy">'), md('![alt](/a.webp)'));
t('bağlantı içinde kalın', has(md('[**x**](/a)'), '<a href="/a"><strong>x</strong></a>'), md('[**x**](/a)'));
t('url içindeki * bozulmaz', has(md('[x](/a*b*c)'), 'href="/a*b*c"'), md('[x](/a*b*c)'));

// XSS denemeleri
const bad = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '[tıkla](javascript:alert(1))',
  '[tıkla](JaVaScRiPt:alert(1))',
  '[tıkla](&#106;avascript:alert(1))',
  '[tıkla](data:text/html;base64,PHNjcmlwdD4=)',
  '[tıkla](vbscript:msgbox(1))',
  '[tıkla](//evil.com)',
  '[tıkla](/\\evil.com)',
  '![x](javascript:alert(1))',
  '![x](data:image/svg+xml;base64,AAAA)',
  '![x](mailto:a@b.co)',
  '![x" onerror="alert(1)](/a.png)',
  '[x](https://a.com/" onclick="alert(1))',
  '[a](/x"onmouseover="alert(1))',
  '> <b onmouseover=alert(1)>x</b>',
  '- <iframe src=//evil></iframe>',
  '# <svg onload=alert(1)>',
  '**<u>x</u>**',
  '\u00000\u0000 [a](/b)',
];
for (const b of bad) {
  const o = md(b);
  const dangerous =
    /<(script|iframe|svg|b |u>|b>)/i.test(o) ||
    /href="\s*(javascript|data|vbscript|\/\/|\/\\)/i.test(o) ||
    /src="\s*(javascript|data|mailto)/i.test(o);
  // Etiket içinde onXXX= özniteliği oluşmamalı
  // (çift tırnaklı öznitelik değerleri çıkarılır: içerideki "onerror=" metni zararsızdır, kaçışlıdır)
  const attrInjection = /<[a-z]+\s[^>]*\bon\w+=/i.test(o.replace(/"[^"]*"/g, '""'));
  t('XSS: ' + JSON.stringify(b), !dangerous && !attrInjection && !/<(?!\/?(h[2-4]|p|strong|em|a|ul|ol|li|blockquote|hr|img)\b)/i.test(o), o);
}

// Metin kaçışı ve boş girdi
t('etiket kaçışlanır', md('a <b> c') === '<p>a &lt;b&gt; c</p>', md('a <b> c'));
t('boş girdi', md('') === '' && md(null) === '' && md(undefined) === '', '');

if (fail) {
  console.error(`\n${fail} sınama başarısız`);
  process.exit(1);
}
console.log('\nTüm sınamalar geçti');
