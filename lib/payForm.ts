/** Tarayıcıyı, verilen alanlarla bir adrese POST eder (Paynkolay ortak ödeme sayfası için). */
export function postForm(url: string, fields: Record<string, string>) {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = url;
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement('input');
    i.type = 'hidden';
    i.name = k;
    i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}
