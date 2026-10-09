'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Monitor, Smartphone, ExternalLink } from 'lucide-react';
import { bannersHtml, type Banner } from '@/lib/design';

/** Banner'ı mağazadaki gerçek şerit kodu ile (aynı CSS) yalıtılmış bir çerçevede çizer. */
export function BannerPreview({ banner }: { banner: Banner }) {
  const [mobile, setMobile] = useState(false);
  const doc = useMemo(() => {
    const html = bannersHtml([{ ...banner, on: true, starts_at: '', ends_at: '' }]);
    return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#f7f1e8;font-family:system-ui,sans-serif">${html}<div style="padding:18px 6%;color:#8a7e70;font-size:13px">↓ ana sayfa hero bölümü burada başlar</div></body>`;
  }, [banner]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
        <button type="button" className={`tab${!mobile ? ' on' : ''}`} onClick={() => setMobile(false)}><Monitor size={14} style={{ marginRight: 6 }} />Masaüstü</button>
        <button type="button" className={`tab${mobile ? ' on' : ''}`} onClick={() => setMobile(true)}><Smartphone size={14} style={{ marginRight: 6 }} />Mobil</button>
        <a className="btn ghost sm" style={{ marginLeft: 'auto' }} href="/" target="_blank" rel="noopener"><ExternalLink size={13} /> Canlı sitede aç</a>
      </div>
      {!banner.image ? (
        <div className="empty" style={{ padding: 28 }}><b>Görsel eklenmedi</b><span>Görseli olmayan banner sitede gösterilmez.</span></div>
      ) : (
        <div style={{ background: 'var(--s3)', borderRadius: 14, padding: 14, display: 'flex', justifyContent: 'center' }}>
          <iframe title="Banner önizleme" sandbox="" srcDoc={doc} style={{ width: mobile ? 390 : '100%', maxWidth: '100%', height: mobile ? 520 : 340, border: 0, borderRadius: 10, background: '#f7f1e8', transition: 'width .25s' }} />
        </div>
      )}
    </div>
  );
}

export type BannerState = { label: string; tone: string; why: string };
export function bannerState(b: Banner, now: number): BannerState {
  if (!b.on) return { label: 'Kapalı', tone: 'b-gray', why: 'Yayında kutusu işaretli değil.' };
  if (!b.image) return { label: 'Görsel yok', tone: 'b-red', why: 'Görsel eklenmeden banner sitede gösterilmez.' };
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return { label: 'Zamanlandı', tone: 'b-amber', why: 'Başlangıç zamanı gelince kendiliğinden yayına girer.' };
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return { label: 'Süresi doldu', tone: 'b-gray', why: 'Bitiş zamanı geçti, sitede gösterilmiyor.' };
  return { label: 'Yayında', tone: 'b-green', why: 'Şu an ana sayfada görünüyor.' };
}

const BOX: React.CSSProperties = { border: '1.5px dashed var(--bdr2)', borderRadius: 8, padding: '8px 10px', fontSize: 11.5, color: 'var(--tx3)', position: 'relative' };
function Pin({ n }: { n: number }) {
  return <span style={{ position: 'absolute', top: -9, left: -9, width: 20, height: 20, borderRadius: 99, background: 'var(--ac)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, boxShadow: '0 0 10px var(--ac)' }}>{n}</span>;
}

const POINTS: { n: number; title: string; text: string; href: string; where: string }[] = [
  { n: 1, title: 'Duyuru çubuğu', text: 'En üstte ince şerit: kargo, kampanya duyurusu.', href: '/admin/icerik', where: 'İçerik → Duyuru' },
  { n: 2, title: 'Banner şeridi', text: 'Hero bölümünün üstünde; birden fazlaysa kaydırmalı. Görseli olan ve süresi geçerli banner gösterilir.', href: '/admin/tasarim', where: 'Sayfa tasarımı → Banner' },
  { n: 3, title: 'Mağaza kartları', text: 'İndirimli üründe eski fiyat çizili, “%X indirim” ve “Son N adet” etiketi çıkar.', href: '/admin/sureli', where: 'Süreli kampanya' },
  { n: 4, title: 'Ürün sayfası', text: 'Çizili eski fiyat, kampanya geri sayımı, stok uyarısı, yorumlar ve ilgili ürünler.', href: '/admin/vitrin', where: 'Vitrin ve popup' },
  { n: 5, title: 'Popup', text: 'Zamanlama, sayfa ve cihaz kurallarına göre pencere olarak açılır.', href: '/admin/popuplar', where: 'Popuplar' },
  { n: 6, title: 'Özel betikler', text: 'Head ve sayfa sonuna eklenen kodlar tüm sayfalarda çalışır (çerez onayına bağlanabilir).', href: '/admin/tasarim', where: 'Sayfa tasarımı → Özel betikler' },
];

/** Ana sayfa şeması: hangi ayar sitenin neresine yansır. */
export function PlacementMap() {
  return (
    <div className="grid2 even" style={{ alignItems: 'start' }}>
      <div style={{ background: 'var(--s2)', border: '1px solid var(--bdr)', borderRadius: 14, padding: 18, display: 'grid', gap: 12 }}>
        <div style={{ ...BOX, background: 'var(--s3)' }}><Pin n={1} />Duyuru çubuğu</div>
        <div style={{ ...BOX, display: 'flex', justifyContent: 'space-between' }}><span>Logo</span><span>Mağaza · Konuklar · Hakkında · İletişim · Hesabım</span></div>
        <div style={{ ...BOX, height: 54, background: 'var(--ac3)', borderColor: 'var(--ac)', color: 'var(--ac)', display: 'grid', placeItems: 'center' }}><Pin n={2} />Banner şeridi</div>
        <div style={{ ...BOX, height: 80, display: 'grid', placeItems: 'center' }}>Hero (başlık, çay animasyonu, YouTube / Mağaza düğmeleri)</div>
        <div style={BOX}><Pin n={3} />Mağaza şeridi
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>{[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 46, borderRadius: 8, background: 'var(--s3)', display: 'grid', placeItems: 'center', fontSize: 11 }}>{i === 0 ? <><s style={{ opacity: 0.5 }}>₺420</s> ₺336</> : 'ürün'}</div>)}</div>
        </div>
        <div style={{ ...BOX, height: 40, display: 'grid', placeItems: 'center' }}>Konuklar · Demleyenler · SSS</div>
        <div style={{ ...BOX, height: 34, display: 'grid', placeItems: 'center' }}>Footer</div>
        <div style={{ ...BOX, borderColor: 'var(--ac)', color: 'var(--ac)', textAlign: 'center' }}><Pin n={5} />Popup penceresi (üstte açılır)</div>
        <div style={{ ...BOX, textAlign: 'center' }}><Pin n={6} />&lt;head&gt; ve &lt;/body&gt; öncesi: özel betikler</div>
        <div style={{ ...BOX, textAlign: 'center' }}><Pin n={4} />Ürün sayfası: fiyat · geri sayım · stok · yorum · ilgili ürünler</div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {POINTS.map((p) => (
          <Link key={p.n} href={p.href} className="card" style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'flex-start' }}>
            <span style={{ flex: '0 0 26px', height: 26, borderRadius: 99, background: 'var(--ac2)', color: 'var(--ac)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12.5 }}>{p.n}</span>
            <span style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 14 }}>{p.title}</b><span style={{ color: 'var(--tx2)', fontSize: 13 }}>{p.text}</span><span style={{ display: 'block', color: 'var(--ac)', fontSize: 12, marginTop: 4 }}>{p.where} →</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Kampanya fiyatının mağazada nasıl görüneceği (kart + ürün sayfası). */
export function SalePreview({ name, base, price, pct, ends, left, state }: { name: string; base: number; price: number; pct: number; ends?: string; left?: number; state: string }) {
  const f = (n: number) => '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  const live = state === 'Aktif';
  const [now] = useState(() => Date.now());
  const rem = ends ? Math.max(0, new Date(ends).getTime() - now) : 0;
  const h = Math.floor(rem / 36e5);
  const cd = !ends ? 'Süre sınırı yok' : rem <= 0 ? 'Kampanya sona erdi' : 'Kampanya bitimine ' + (h >= 48 ? `${Math.floor(h / 24)} gün ${h % 24} sa` : `${h} sa ${Math.floor((rem % 36e5) / 6e4)} dk`);
  return (
    <div className="grid2 even" style={{ marginBottom: 0 }}>
      <div style={{ background: '#f7f1e8', color: '#1d1a16', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a7e70', marginBottom: 10 }}>Ana sayfa · mağaza kartı</div>
        <div style={{ width: 170, background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 2px 12px rgba(0,0,0,.08)' }}>
          <div style={{ height: 96, background: '#efe6d8', borderRadius: 8, marginBottom: 10 }} />
          <div style={{ fontSize: 14 }}>{name}{live && <span style={{ background: '#DD262C', color: '#fff', padding: '1px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600, marginLeft: 6, whiteSpace: 'nowrap' }}>-%{pct}</span>}</div>
          {live && left ? <div style={{ color: '#9a2f24', fontSize: 11 }}>Son {left} adet</div> : null}
          <div style={{ fontSize: 14, color: '#5c5348' }}>{live && <s style={{ opacity: 0.5, marginRight: 4 }}>{f(base)}</s>}<span style={live ? { color: '#DD262C', fontWeight: 600 } : undefined}>{f(live ? price : base)}</span></div>
        </div>
        {!live && <p style={{ fontSize: 12, color: '#8a7e70', marginTop: 10 }}>Kampanya şu an aktif değil; kartta normal fiyat görünür.</p>}
      </div>
      <div style={{ background: '#f7f1e8', color: '#1d1a16', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a7e70', marginBottom: 10 }}>Ürün sayfası</div>
        <div style={{ position: 'relative', height: 90, background: '#efe6d8', borderRadius: 10, marginBottom: 12 }}>{live && <span style={{ position: 'absolute', top: 8, right: 8, width: 56, height: 56, borderRadius: '50%', background: '#DD262C', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.05, transform: 'rotate(8deg)', boxShadow: '0 6px 18px rgba(221,38,44,.35)' }}><b style={{ fontSize: 15 }}>-%{pct}</b><small style={{ fontSize: 9 }}>indirim</small></span>}</div>
        <div style={{ fontSize: 22, fontFamily: 'Georgia, serif' }}>{name}</div>
        <div style={{ fontSize: 18, margin: '6px 0' }}>{live && <s style={{ opacity: 0.5, marginRight: 8, fontWeight: 400 }}>{f(base)}</s>}<span style={live ? { color: '#DD262C', fontWeight: 600 } : undefined}>{f(live ? price : base)}</span></div>
        {live && <div style={{ fontSize: 13, color: '#9a2f24' }}>{cd}</div>}
        {live && left ? <div style={{ fontSize: 13, color: '#9a2f24' }}>Son {left} adet kaldı</div> : null}
        <div style={{ marginTop: 12, display: 'inline-block', background: '#14161b', color: '#fff', padding: '8px 18px', borderRadius: 99, fontSize: 14 }}>Sepete ekle</div>
        <p style={{ fontSize: 12, color: '#8a7e70', marginTop: 12 }}>Sepet, ödeme ve sipariş kaydı da {live ? f(price) : f(base)} üzerinden hesaplanır.</p>
      </div>
    </div>
  );
}
