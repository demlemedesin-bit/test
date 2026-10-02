/** Yapısal veri (JSON-LD). '<' kaçışlıdır; böylece içerik </script> ile betikten çıkamaz. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] | null | undefined }) {
  if (!data) return null;
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
