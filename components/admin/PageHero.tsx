'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Sparkles } from 'lucide-react';
import { NAV } from './Shell';

type Tone = 'ac' | 'green' | 'blue' | 'amber' | 'red';
type Meta = { desc: string; chips: string[]; tone: Tone; site?: [string, string] };

const META: Record<string, Meta> = {
  '/admin/siparisler': { tone: 'ac', desc: 'Gelen siparişleri takip et, kargoya ver, müşteriyi bilgilendir.', chips: ['Durum akışı', 'Kargo takip no', 'CSV dışa aktar'], site: ['/siparis-takip', 'Müşteri takip sayfası'] },
  '/admin/urunler': { tone: 'green', desc: 'Ürün, fiyat, stok ve görselleri yönet. Değişiklik sitede anında yayınlanır.', chips: ['Sürükle-bırak görsel', 'Renk ve beden', 'SEO alanları'], site: ['/#magaza', 'Mağazayı gör'] },
  '/admin/musteriler': { tone: 'blue', desc: 'Müşterilerini segmentle, etiketle ve sipariş geçmişini incele.', chips: ['VIP / sadık / pasif', 'Etiket ve not', 'E-posta listesi'] },
  '/admin/sepetler': { tone: 'amber', desc: 'E-postasını bırakıp siparişi tamamlamayanları geri kazan.', chips: ['Terk edilen sepet', 'Hatırlatma e-postası', 'Potansiyel ciro'] },
  '/admin/kalite': { tone: 'green', desc: 'Eksik açıklama, görsel, SEO ve barkodları otomatik tespit eder.', chips: ['SEO skoru', 'İçerik kontrolü', 'Katalog sağlığı'] },
  '/admin/iadeler': { tone: 'red', desc: 'İade ve değişim taleplerini, nedenlerini ve tutarlarını izle.', chips: ['İade oranı', 'Neden analizi', 'Ürün bazlı'] },
  '/admin/depo': { tone: 'blue', desc: 'Toplama, paketleme ve kargoya hazırlık listeleri.', chips: ['Hazırlanacaklar', 'Paketlendi', 'Düşük stok'] },
  '/admin/muhasebe': { tone: 'amber', desc: 'Günlük ciro, ödeme yöntemleri, iade ve indirim özetleri.', chips: ['Günlük özet', 'Ödeme yöntemi', 'Fatura durumu'] },
  '/admin/destek': { tone: 'blue', desc: 'Müşteri talepleri ve müşteri 360 görünümü tek ekranda.', chips: ['Talepler', 'Customer 360', 'Sipariş geçmişi'] },
  '/admin/kampanyalar': { tone: 'ac', desc: 'Kupon ve otomatik indirimler. Sepette ve ödemede anında geçerli olur.', chips: ['Yüzde / tutar', 'Kullanım limiti', 'Ürüne özel'], site: ['/sepet', 'Sepet sayfası'] },
  '/admin/takip': { tone: 'blue', desc: 'UTM bağlantıları, kaynak ve kampanya performansı.', chips: ['Kısa link (/t/kod)', 'Kaynak raporu', 'Dönüşüm'] },
  '/admin/sureli': { tone: 'amber', desc: 'Zamanlı indirimli fiyat; başlangıç ve bitişte kendiliğinden devreye girer, çıkar.', chips: ['Kartta çizili fiyat', 'Geri sayım', 'Sepette geçerli'], site: ['/#magaza', 'Vitrinde gör'] },
  '/admin/raporlar': { tone: 'green', desc: 'Satış, ürün, şehir ve ödeme raporları; dönem karşılaştırması.', chips: ['Önceki dönem', 'CSV indir', 'Kupon etkisi'] },
  '/admin/analiz': { tone: 'ac', desc: 'Ürün, marka, stok, müşteri ve kampanya analizi; öneri performansı.', chips: ['Funnel', 'Marka', 'Stok devir'] },
  '/admin/vitrin': { tone: 'ac', desc: 'Yorumlar, ilgili ürünler, sepet çapraz satışı ve ücretsiz kargo çubuğu.', chips: ['Öneri modülü', 'Son bakılanlar', 'Rozetler'], site: ['/urun/cam-kavanoz-uzun', 'Ürün sayfası'] },
  '/admin/popuplar': { tone: 'ac', desc: 'Bülten, duyuru, çıkış niyeti ve geri sayım pencereleri; zamanlama ve cihaz kurallarıyla.', chips: ['Şablonlar', 'Canlı önizleme', 'Kupon ve KVKK'], site: ['/', 'Ana sayfayı aç'] },
  '/admin/abonelikler': { tone: 'blue', desc: 'Bülten aboneleri ve “stoğa girince haber ver” talepleri.', chips: ['Abone listesi', 'Stok haberi', 'Onay kaydı'] },
  '/admin/icerik': { tone: 'amber', desc: 'Ana sayfadaki tüm metin, görsel, SSS ve konuk içerikleri.', chips: ['Metinler', 'SSS', 'Konuklar'], site: ['/', 'Ana sayfa'] },
  '/admin/sayfalar': { tone: 'blue', desc: 'Statik sayfalar, blog yazıları ve yönlendirmeler.', chips: ['Markdown', 'Blog', '301 yönlendirme'], site: ['/blog', 'Blog'] },
  '/admin/yorumlar': { tone: 'amber', desc: 'Ürün yorumlarını onayla, yanıtla ve yayından kaldır.', chips: ['Onay bekleyen', 'Yanıt ver', 'Puan'] },
  '/admin/seo': { tone: 'green', desc: 'Başlık, açıklama, favicon, sitemap, robots ve reklam etiketleri.', chips: ['Google önizleme', 'Favicon', 'Çerez onayı'], site: ['/sitemap.xml', 'Sitemap'] },
  '/admin/tasarim': { tone: 'ac', desc: 'Ana sayfa banner şeridi ve özel betikler; canlı önizleme ve yerleşim haritasıyla.', chips: ['Banner', 'Önizleme', 'Betikler'], site: ['/', 'Canlı siteyi aç'] },
  '/admin/medya': { tone: 'blue', desc: 'Yüklenen görseller, sıkıştırma ayarları ve depolama kullanımı.', chips: ['WebP dönüşümü', 'Kullanılmayanlar', 'Sürükle-bırak'] },
  '/admin/veri-kontrol': { tone: 'green', desc: 'Pixel, olay ve reklam entegrasyonlarının gerçekten çalıştığını doğrula.', chips: ['Purchase olayı', 'Para birimi', 'Tekrar kontrolü'] },
  '/admin/entegrasyonlar': { tone: 'blue', desc: 'Ödeme, e-posta, SMS, kargo ve analitik bağlantıları.', chips: ['iyzico', 'E-posta / SMS', 'Webhook'] },
  '/admin/sistem': { tone: 'red', desc: 'Ekip üyeleri, yetkiler ve işlem kayıtları.', chips: ['Departman yetkisi', 'Denetim kaydı', 'Mesaj şablonları'] },
  '/admin/ayarlar': { tone: 'amber', desc: 'Kargo ücreti, ücretsiz kargo eşiği ve mağaza bilgileri.', chips: ['Kargo', 'Satıcı bilgisi', 'Havale'] },
};

/** Her yönetim sayfasının üstündeki başlık kartı: simge, açıklama, ipuçları ve sitede ilgili sayfaya kısayol. */
export function PageHero() {
  const path = usePathname() || '';
  const m = META[path];
  if (!m) return null;
  const item = NAV.flatMap((g) => g.items).find((i) => i.href === path);
  const Icon = item?.Icon ?? Sparkles;
  return (
    <section className={`hero hero-${m.tone}`} aria-label={item?.label}>
      <i className="hero-o1" /><i className="hero-o2" />
      <div className="hero-ic"><Icon size={26} strokeWidth={1.7} /></div>
      <div className="hero-tx">
        <h2>{item?.label}</h2>
        <p>{m.desc}</p>
        <div className="hero-chips">{m.chips.map((c) => <span key={c}>{c}</span>)}</div>
      </div>
      {m.site && (
        <Link className="hero-go" href={m.site[0]} target="_blank">
          <ExternalLink size={14} /> {m.site[1]}
        </Link>
      )}
    </section>
  );
}
