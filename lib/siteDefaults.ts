// OTOMATİK OLUŞTURULDU: varsayılan site içeriği. Panelde kaydedilen değerler bunların üstüne yazılır.
export type FieldKind = 'text' | 'long' | 'image' | 'url' | 'number' | 'bool';
export type Field = { id: string; group: string; label: string; kind: FieldKind; def: string; hint?: string };
export type Faq = { q: string; a: string };
export type FooterLink = { label: string; href: string };
export type FooterCol = { title: string; links: FooterLink[] };
export type Reel = { cover: string; url: string; progress: number };
export type Guest = { name: string; url: string; drawing: string; reels: Reel[] };
export type Demleyen = { month: string; photos: { name: string; city: string; img: string; icon: 'heart' | 'mug'; tilt: number }[] };
export type FooterData = { cols: FooterCol[]; legal: FooterLink[] };

export const FIELDS: Field[] = [
 {
  "id": "hero_l1",
  "group": "Ana sayfa · Üst bölüm",
  "label": "Başlık, 1. satır",
  "kind": "text",
  "def": "Bir demin 40 yıllık hatırı var."
 },
 {
  "id": "hero_l2",
  "group": "Ana sayfa · Üst bölüm",
  "label": "Başlık, 2. satır",
  "kind": "text",
  "def": "Gel, beraber demleyelim."
 },
 {
  "id": "hero_btn_yt",
  "group": "Ana sayfa · Üst bölüm",
  "label": "YouTube düğmesi",
  "kind": "text",
  "def": "YouTube kanalına bir bak"
 },
 {
  "id": "hero_btn_shop",
  "group": "Ana sayfa · Üst bölüm",
  "label": "Mağaza düğmesi",
  "kind": "text",
  "def": "Kendine demlik bir şeyler bak"
 },
 {
  "id": "hero_photo",
  "group": "Ana sayfa · Üst bölüm",
  "label": "Ana fotoğraf",
  "kind": "image",
  "def": "/demleme/02-hero-pour/garen-photo.jpg",
  "hint": "Çay dökme animasyonunun bittiği fotoğraf"
 },
 {
  "id": "hero_photo_alt",
  "group": "Ana sayfa · Üst bölüm",
  "label": "Fotoğraf açıklaması (alt)",
  "kind": "text",
  "def": "Garen, elinde çay bardağıyla"
 },
 {
  "id": "about_title",
  "group": "Ana sayfa · Hakkında",
  "label": "Başlık",
  "kind": "text",
  "def": "Merhaba. Ben Garen."
 },
 {
  "id": "about_p1",
  "group": "Ana sayfa · Hakkında",
  "label": "1. paragraf",
  "kind": "long",
  "def": "Seni burda görmek çok güzel. Herkesin hikâyesinin özel olduğuna inanıyorum. Sen dahil. Demleme benim sofram. Sana belki burayı seveceğinin sözünü veremem, ama gördüğün her şeyin gerçek olduğu sözünü verebilirim."
 },
 {
  "id": "about_h2",
  "group": "Ana sayfa · Hakkında",
  "label": "2. başlık",
  "kind": "text",
  "def": "Burada ne var"
 },
 {
  "id": "about_p2",
  "group": "Ana sayfa · Hakkında",
  "label": "2. paragraf",
  "kind": "long",
  "def": "Bazen misafirlerim, bazen ailem, kimi zaman da sırf beni görebilirsin. Hikâyeler, tecrübeler, hayata dair sorularım, her şey. Bu sofrada bir şeyler bulmanın yanı sıra, sen de çok şey ekleyebilirsin."
 },
 {
  "id": "about_h3",
  "group": "Ana sayfa · Hakkında",
  "label": "3. başlık",
  "kind": "text",
  "def": "Bir de elle tutulur tarafı"
 },
 {
  "id": "about_p3",
  "group": "Ana sayfa · Hakkında",
  "label": "3. paragraf",
  "kind": "long",
  "def": "Ailem İstanbul'da üç kuşaktır metal işliyor. Demleme'nin tepsilerini, sehpalarını, küçük ev parçalarını orada üretiyorum. Sohbetin geçtiği masaya ait şeyler. Anlayacağın, ben masayı kurdum."
 },
 {
  "id": "about_p4",
  "group": "Ana sayfa · Hakkında",
  "label": "Kapanış cümlesi",
  "kind": "text",
  "def": "Seni bekliyorum…"
 },
 {
  "id": "about_sign",
  "group": "Ana sayfa · Hakkında",
  "label": "İmza",
  "kind": "text",
  "def": "Garen"
 },
 {
  "id": "stat1_n",
  "group": "Ana sayfa · İstatistikler",
  "label": "1. sayı",
  "kind": "number",
  "def": "40"
 },
 {
  "id": "stat1_suf",
  "group": "Ana sayfa · İstatistikler",
  "label": "1. sayı eki (k, M…)",
  "kind": "text",
  "def": ""
 },
 {
  "id": "stat1_dec",
  "group": "Ana sayfa · İstatistikler",
  "label": "1. sayı ondalık basamak",
  "kind": "number",
  "def": "0"
 },
 {
  "id": "stat1_label",
  "group": "Ana sayfa · İstatistikler",
  "label": "1. etiket",
  "kind": "text",
  "def": "bölüm"
 },
 {
  "id": "stat2_n",
  "group": "Ana sayfa · İstatistikler",
  "label": "2. sayı",
  "kind": "number",
  "def": "15"
 },
 {
  "id": "stat2_suf",
  "group": "Ana sayfa · İstatistikler",
  "label": "2. sayı eki (k, M…)",
  "kind": "text",
  "def": ""
 },
 {
  "id": "stat2_dec",
  "group": "Ana sayfa · İstatistikler",
  "label": "2. sayı ondalık basamak",
  "kind": "number",
  "def": "0"
 },
 {
  "id": "stat2_label",
  "group": "Ana sayfa · İstatistikler",
  "label": "2. etiket",
  "kind": "text",
  "def": "farklı konuk"
 },
 {
  "id": "stat3_n",
  "group": "Ana sayfa · İstatistikler",
  "label": "3. sayı",
  "kind": "number",
  "def": "410"
 },
 {
  "id": "stat3_suf",
  "group": "Ana sayfa · İstatistikler",
  "label": "3. sayı eki (k, M…)",
  "kind": "text",
  "def": "k"
 },
 {
  "id": "stat3_dec",
  "group": "Ana sayfa · İstatistikler",
  "label": "3. sayı ondalık basamak",
  "kind": "number",
  "def": "0"
 },
 {
  "id": "stat3_label",
  "group": "Ana sayfa · İstatistikler",
  "label": "3. etiket",
  "kind": "text",
  "def": "farklı izleyen"
 },
 {
  "id": "stat4_n",
  "group": "Ana sayfa · İstatistikler",
  "label": "4. sayı",
  "kind": "number",
  "def": "3.3"
 },
 {
  "id": "stat4_suf",
  "group": "Ana sayfa · İstatistikler",
  "label": "4. sayı eki (k, M…)",
  "kind": "text",
  "def": "M"
 },
 {
  "id": "stat4_dec",
  "group": "Ana sayfa · İstatistikler",
  "label": "4. sayı ondalık basamak",
  "kind": "number",
  "def": "1"
 },
 {
  "id": "stat4_label",
  "group": "Ana sayfa · İstatistikler",
  "label": "4. etiket",
  "kind": "text",
  "def": "izlenme"
 },
 {
  "id": "nav_shop",
  "group": "Menü",
  "label": "Menü: Mağaza",
  "kind": "text",
  "def": "Mağaza"
 },
 {
  "id": "nav_guests",
  "group": "Menü",
  "label": "Menü: Konuklar",
  "kind": "text",
  "def": "Konuklar"
 },
 {
  "id": "nav_about",
  "group": "Menü",
  "label": "Menü: Hakkında",
  "kind": "text",
  "def": "Hakkında"
 },
 {
  "id": "nav_contact",
  "group": "Menü",
  "label": "Menü: İletişim",
  "kind": "text",
  "def": "İletişim"
 },
 {
  "id": "nav_account",
  "group": "Menü",
  "label": "Menü: Hesabım",
  "kind": "text",
  "def": "Hesabım"
 },
 {
  "id": "nav_login",
  "group": "Menü",
  "label": "Menü: Giriş yap (üye değilken)",
  "kind": "text",
  "def": "Giriş yap"
 },
 {
  "id": "shop_title",
  "group": "Ana sayfa · Mağaza",
  "label": "Başlık (alt satır için Enter)",
  "kind": "text",
  "def": "Demleme\nShop"
 },
 {
  "id": "shop_sub",
  "group": "Ana sayfa · Mağaza",
  "label": "Alt başlık",
  "kind": "text",
  "def": "Sohbetin en güzel eşlikçileri."
 },
 {
  "id": "cat_sofra",
  "group": "Ana sayfa · Mağaza",
  "label": "Kategori: Ev & Sofra",
  "kind": "text",
  "def": "Ev & Sofra"
 },
 {
  "id": "cat_giyim",
  "group": "Ana sayfa · Mağaza",
  "label": "Kategori: Giyim",
  "kind": "text",
  "def": "Giyim"
 },
 {
  "id": "cat_aksesuar",
  "group": "Ana sayfa · Mağaza",
  "label": "Kategori: Aksesuar",
  "kind": "text",
  "def": "Aksesuar"
 },
 {
  "id": "shop_hero",
  "group": "Ana sayfa · Mağaza",
  "label": "Mağaza ana görseli",
  "kind": "image",
  "def": "/demleme/03-shop/hero/shop-hero-1800.webp"
 },
 {
  "id": "shop_hero_alt",
  "group": "Ana sayfa · Mağaza",
  "label": "Ana görsel açıklaması (alt)",
  "kind": "text",
  "def": "Demleme ürünleri: kavanozlar, tepsi, çay bardağı, bez çanta, şapka"
 },
 {
  "id": "shop_cat_img",
  "group": "Ana sayfa · Mağaza",
  "label": "Kedi çizimi",
  "kind": "image",
  "def": "/demleme/03-shop/illustrations/cat-tea-720.webp"
 },
 {
  "id": "konuk_label",
  "group": "Ana sayfa · Konuklar",
  "label": "Küçük etiket",
  "kind": "text",
  "def": "Konuklar"
 },
 {
  "id": "konuk_title",
  "group": "Ana sayfa · Konuklar",
  "label": "Başlık",
  "kind": "text",
  "def": "Demlemedeki konuklar"
 },
 {
  "id": "konuk_meta",
  "group": "Ana sayfa · Konuklar",
  "label": "Sağdaki not",
  "kind": "text",
  "def": "15 konuk ağırlandı"
 },
 {
  "id": "dm_sub",
  "group": "Ana sayfa · Ayın demleyenleri",
  "label": "Açıklama",
  "kind": "text",
  "def": "Demleme izlerken çektiğin fotoğrafı bizimle paylaş, sen de ayın demleyenleri arasında yerini al."
 },
 {
  "id": "dm_url",
  "group": "Ana sayfa · Ayın demleyenleri",
  "label": "Katıl düğmesi bağlantısı",
  "kind": "url",
  "def": "https://demlemedesin.com"
 },
 {
  "id": "dm_weekly",
  "group": "Ana sayfa · Ayın demleyenleri",
  "label": "Alt not",
  "kind": "text",
  "def": "Her pazar güncellenir"
 },
 {
  "id": "sss_label",
  "group": "Ana sayfa · SSS",
  "label": "Küçük etiket",
  "kind": "text",
  "def": "Merak edilenler"
 },
 {
  "id": "sss_title",
  "group": "Ana sayfa · SSS",
  "label": "Başlık",
  "kind": "text",
  "def": "Sıkça sorulan sorular"
 },
 {
  "id": "nl_label",
  "group": "Ana sayfa · Bülten / iletişim",
  "label": "Küçük etiket",
  "kind": "text",
  "def": "Bülten"
 },
 {
  "id": "nl_title",
  "group": "Ana sayfa · Bülten / iletişim",
  "label": "Başlık",
  "kind": "text",
  "def": "Sofraya davetlisin."
 },
 {
  "id": "nl_lead",
  "group": "Ana sayfa · Bülten / iletişim",
  "label": "Açıklama",
  "kind": "text",
  "def": "Yeni bölümler, konuk duyuruları ve mağaza yenilikleri e-postana gelsin."
 },
 {
  "id": "nl_btn",
  "group": "Ana sayfa · Bülten / iletişim",
  "label": "Düğme",
  "kind": "text",
  "def": "Katıl"
 },
 {
  "id": "nl_note",
  "group": "Ana sayfa · Bülten / iletişim",
  "label": "Form altı not",
  "kind": "text",
  "def": "Haftada en fazla bir e-posta. İstediğin zaman ayrılabilirsin."
 },
 {
  "id": "nl_contact",
  "group": "Ana sayfa · Bülten / iletişim",
  "label": "İletişim cümlesi",
  "kind": "text",
  "def": "İş birliği ve konuk önerileri için:"
 },
 {
  "id": "footer_tagline",
  "group": "Footer",
  "label": "Slogan",
  "kind": "text",
  "def": "İyi bir sohbet, iyi bir dünyaya katkı olsun."
 },
 {
  "id": "footer_copy",
  "group": "Footer",
  "label": "Telif satırı",
  "kind": "text",
  "def": "© 2026 Demleme. Tüm hakları saklıdır."
 },
 {
  "id": "url_youtube",
  "group": "Bağlantılar",
  "label": "YouTube kanalı",
  "kind": "url",
  "def": "https://youtube.com"
 },
 {
  "id": "url_instagram",
  "group": "Bağlantılar",
  "label": "Instagram hesabı",
  "kind": "url",
  "def": "https://instagram.com"
 },
 {
  "id": "show_stats",
  "group": "Bölümler",
  "label": "Rakamlar şeridi bölümü görünsün",
  "kind": "bool",
  "def": "1"
 },
 {
  "id": "show_demleyen",
  "group": "Bölümler",
  "label": "Ayın demleyenleri bölümü görünsün",
  "kind": "bool",
  "def": "1"
 },
 {
  "id": "show_sss",
  "group": "Bölümler",
  "label": "Sıkça sorulan sorular bölümü görünsün",
  "kind": "bool",
  "def": "1"
 },
 {
  "id": "show_newsletter",
  "group": "Bölümler",
  "label": "Bülten / iletişim bölümü görünsün",
  "kind": "bool",
  "def": "1"
 },
 {
  "id": "anim_off",
  "group": "Animasyonlar",
  "label": "Tüm animasyonları kapat",
  "kind": "bool",
  "def": "0",
  "hint": "Açarsan çay dökme, masa dönüşü ve sayaç animasyonları sade hâle gelir."
 },
 {
  "id": "anim_countMs",
  "group": "Animasyonlar",
  "label": "Sayaç süresi (ms)",
  "kind": "number",
  "def": "1400",
  "hint": "Rakamların 0'dan yükselme süresi"
 },
 {
  "id": "anim_countStagger",
  "group": "Animasyonlar",
  "label": "Sayaçlar arası gecikme (ms)",
  "kind": "number",
  "def": "110"
 },
 {
  "id": "anim_tableMs",
  "group": "Animasyonlar",
  "label": "Konuk masası dönüş süresi (ms)",
  "kind": "number",
  "def": "1000"
 },
 {
  "id": "anim_pourPin",
  "group": "Animasyonlar",
  "label": "Çay dökmede sayfa bekletme çarpanı",
  "kind": "number",
  "def": "3",
  "hint": "Büyük değer = kolu kaldırırken sayfa daha uzun sabit kalır"
 },
 {
  "id": "anim_pourPx",
  "group": "Animasyonlar",
  "label": "Çay akışı uzunluğu (px kaydırma)",
  "kind": "number",
  "def": "520"
 },
 {
  "id": "anim_logoDelay",
  "group": "Animasyonlar",
  "label": "Logo animasyonu başlangıç gecikmesi (ms)",
  "kind": "number",
  "def": "1300"
 },
 {
  "id": "seo_title",
  "group": "SEO",
  "label": "Sayfa başlığı",
  "kind": "text",
  "def": "Demleme — Bir demin 40 yıllık hatırı var",
  "hint": "Google ve tarayıcı sekmesinde görünür"
 },
 {
  "id": "seo_desc",
  "group": "SEO",
  "label": "Sayfa açıklaması",
  "kind": "long",
  "def": "Demleme; sohbetin, çayın ve hikâyenin yavaş yavaş demlendiği bir masa. YouTube bölümleri, podcast, konuklar ve kendi mağazasıyla sofradaki konuşmaları mikrofonun karşısına taşıyor."
 },
 {
  "id": "seo_og_title",
  "group": "SEO",
  "label": "Paylaşım başlığı",
  "kind": "text",
  "def": "Demleme — İyi Bir Sohbet, Zamanla Demlenir.",
  "hint": "Link WhatsApp/Instagram/X'te paylaşılınca"
 },
 {
  "id": "seo_og_desc",
  "group": "SEO",
  "label": "Paylaşım açıklaması",
  "kind": "long",
  "def": "Sohbetin, çayın ve hikâyenin yavaş yavaş demlendiği bir masa — YouTube, podcast, konuklar ve mağaza bir arada."
 },
 {
  "id": "seo_og_image",
  "group": "SEO",
  "label": "Paylaşım görseli",
  "kind": "image",
  "def": "",
  "hint": "1200×630 önerilir; boşsa görsel gösterilmez"
 },
 {
  "id": "ga_id",
  "group": "Takip kodları",
  "label": "Google Analytics 4 ölçüm kodu",
  "kind": "text",
  "def": "",
  "hint": "Örn. G-ABC123XYZ"
 },
 {
  "id": "pixel_id",
  "group": "Takip kodları",
  "label": "Meta (Facebook) Pixel kodu",
  "kind": "text",
  "def": "",
  "hint": "Sayısal kod"
 }
];
export const DEFAULT_FAQ: Faq[] = [
 {
  "q": "Demleme'nin yeni bölümleri ne zaman yayınlanıyor?",
  "a": "Yeni bölümler her hafta Cuma akşamı YouTube'da yayınlanıyor, ardından podcast platformlarına ekleniyor. Kaçırmamak için bültene katılabilir ya da bölümler listesini takip edebilirsin."
 },
 {
  "q": "Demleme Shop ürünleri nereden ve nasıl sipariş edilir?",
  "a": "Ürünlere Mağaza bölümünden göz atabilirsin. Sipariş ve kargo süreci için mağaza sayfamız yakında tam entegrasyonla açılıyor."
 },
 {
  "q": "Podcast bölümlerine hangi platformlardan ulaşabilirim?",
  "a": "Demleme Podcast; Spotify, Apple Podcasts ve YouTube Music üzerinden dinlenebiliyor."
 },
 {
  "q": "Programa konuk olmak ya da iş birliği yapmak istiyorum, nasıl ulaşırım?",
  "a": "merhaba@demleme.com adresine yazabilirsin. Konuk önerilerini ve iş birliği taleplerini buradan değerlendiriyoruz."
 },
 {
  "q": "E-posta bültenine katılırsam neler gönderiyorsunuz?",
  "a": "Yeni bölüm duyuruları, konuk açıklamaları ve mağazadaki yeni ürünleri haber veriyoruz. Spam yok — haftada en fazla bir e-posta."
 }
];
export const DEFAULT_FOOTER: FooterData = {
 "cols": [
  {
   "title": "Keşfet",
   "links": [
    {
     "label": "Konuklar",
     "href": "#konuklar"
    },
    {
     "label": "Hakkında",
     "href": "#hakkinda"
    }
   ]
  },
  {
   "title": "Mağaza",
   "links": [
    {
     "label": "Tüm ürünler",
     "href": "#magaza"
    },
    {
     "label": "Tişört",
     "href": "#magaza"
    },
    {
     "label": "Kupa",
     "href": "#magaza"
    },
    {
     "label": "Hediye kartı",
     "href": "#magaza"
    }
   ]
  },
  {
   "title": "Yardım",
   "links": [
    {
     "label": "Sıkça sorulan sorular",
     "href": "#sss"
    },
    {
     "label": "Kargo & teslimat",
     "href": "/kargo-ve-iade"
    },
    {
     "label": "İade & değişim",
     "href": "/kargo-ve-iade"
    },
    {
     "label": "İletişim",
     "href": "#iletisim"
    }
   ]
  }
 ],
 "legal": [
  {"label": "Sipariş takibi", "href": "/siparis-takip"},
  {"label": "Kargo ve iade", "href": "/kargo-ve-iade"},
  {"label": "Mesafeli satış sözleşmesi", "href": "/mesafeli-satis-sozlesmesi"},
  {
   "label": "KVKK",
   "href": "/kvkk"
  },
  {
   "label": "Kullanım şartları",
   "href": "/kullanim-sartlari"
  },
  {
   "label": "Gizlilik politikası",
   "href": "/gizlilik-politikasi"
  }
 ]
};
export const DEFAULT_DM: Demleyen = {
 "month": "Eylül",
 "photos": [
  {
   "name": "Zeynep",
   "city": "İstanbul",
   "img": "/demleme/05-demleyenler/viewer-photos/viewer01-640.webp",
   "icon": "heart",
   "tilt": -3
  },
  {
   "name": "Emir",
   "city": "Ankara",
   "img": "/demleme/05-demleyenler/viewer-photos/viewer02-640.webp",
   "icon": "mug",
   "tilt": 2
  },
  {
   "name": "Merve",
   "city": "İzmir",
   "img": "/demleme/05-demleyenler/viewer-photos/viewer03-640.webp",
   "icon": "heart",
   "tilt": -1
  },
  {
   "name": "Ali",
   "city": "Bursa",
   "img": "/demleme/05-demleyenler/viewer-photos/viewer04-640.webp",
   "icon": "mug",
   "tilt": 3
  },
  {
   "name": "Deniz",
   "city": "Eskişehir",
   "img": "/demleme/05-demleyenler/viewer-photos/viewer05-640.webp",
   "icon": "heart",
   "tilt": -2
  }
 ]
};
export const DEFAULT_GUESTS: Guest[] = [{"name": "Selin B.", "url": "/konuklar/selin-b", "drawing": "g01_f", "reels": [{"cover": "reel01-640x800.webp", "url": "https://instagram.com", "progress": 18}, {"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 42}, {"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 8}]}, {"name": "Emre K.", "url": "/konuklar/emre-k", "drawing": "g06_m", "reels": [{"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 42}, {"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 8}, {"cover": "reel04-640x800.webp", "url": "https://instagram.com", "progress": 60}]}, {"name": "Aslı D.", "url": "/konuklar/asli-d", "drawing": "g02_f", "reels": [{"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 8}, {"cover": "reel04-640x800.webp", "url": "https://instagram.com", "progress": 60}, {"cover": "reel05-640x800.webp", "url": "https://instagram.com", "progress": 25}]}, {"name": "Mert Y.", "url": "/konuklar/mert-y", "drawing": "g07_m", "reels": [{"cover": "reel04-640x800.webp", "url": "https://instagram.com", "progress": 60}, {"cover": "reel05-640x800.webp", "url": "https://instagram.com", "progress": 25}, {"cover": "reel06-640x800.webp", "url": "https://instagram.com", "progress": 12}]}, {"name": "Deniz A.", "url": "/konuklar/deniz-a", "drawing": "g16_f", "reels": [{"cover": "reel05-640x800.webp", "url": "https://instagram.com", "progress": 25}, {"cover": "reel06-640x800.webp", "url": "https://instagram.com", "progress": 12}, {"cover": "reel01-640x800.webp", "url": "https://instagram.com", "progress": 34}]}, {"name": "Can T.", "url": "/konuklar/can-t", "drawing": "g08_m", "reels": [{"cover": "reel06-640x800.webp", "url": "https://instagram.com", "progress": 12}, {"cover": "reel01-640x800.webp", "url": "https://instagram.com", "progress": 34}, {"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 18}]}, {"name": "Elif S.", "url": "/konuklar/elif-s", "drawing": "g15_f", "reels": [{"cover": "reel01-640x800.webp", "url": "https://instagram.com", "progress": 34}, {"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 18}, {"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 42}]}, {"name": "Burak Ö.", "url": "/konuklar/burak-o", "drawing": "g09_m", "reels": [{"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 18}, {"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 42}, {"cover": "reel04-640x800.webp", "url": "https://instagram.com", "progress": 8}]}, {"name": "Zeynep K.", "url": "/konuklar/zeynep-k", "drawing": "g05_f", "reels": [{"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 42}, {"cover": "reel04-640x800.webp", "url": "https://instagram.com", "progress": 8}, {"cover": "reel05-640x800.webp", "url": "https://instagram.com", "progress": 60}]}, {"name": "Kerem T.", "url": "/konuklar/kerem-t", "drawing": "g10_m", "reels": [{"cover": "reel04-640x800.webp", "url": "https://instagram.com", "progress": 8}, {"cover": "reel05-640x800.webp", "url": "https://instagram.com", "progress": 60}, {"cover": "reel06-640x800.webp", "url": "https://instagram.com", "progress": 25}]}, {"name": "Ece N.", "url": "/konuklar/ece-n", "drawing": "g11_f", "reels": [{"cover": "reel05-640x800.webp", "url": "https://instagram.com", "progress": 60}, {"cover": "reel06-640x800.webp", "url": "https://instagram.com", "progress": 25}, {"cover": "reel01-640x800.webp", "url": "https://instagram.com", "progress": 12}]}, {"name": "Haluk Ç.", "url": "/konuklar/haluk-c", "drawing": "g13_m", "reels": [{"cover": "reel06-640x800.webp", "url": "https://instagram.com", "progress": 25}, {"cover": "reel01-640x800.webp", "url": "https://instagram.com", "progress": 12}, {"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 34}]}, {"name": "Nazlı Y.", "url": "/konuklar/nazli-y", "drawing": "g12_f", "reels": [{"cover": "reel01-640x800.webp", "url": "https://instagram.com", "progress": 12}, {"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 34}, {"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 18}]}, {"name": "Onur S.", "url": "/konuklar/onur-s", "drawing": "g14_m", "reels": [{"cover": "reel02-640x800.webp", "url": "https://instagram.com", "progress": 34}, {"cover": "reel03-640x800.webp", "url": "https://instagram.com", "progress": 18}, {"cover": "reel04-640x800.webp", "url": "https://instagram.com", "progress": 42}]}];
export const DRAWINGS: string[] = ["g01_f", "g02_f", "g05_f", "g06_m", "g07_m", "g08_m", "g09_m", "g10_m", "g11_f", "g12_f", "g13_m", "g14_m", "g15_f", "g16_f"];
export const REEL_COVERS: string[] = ["reel01-640x800.webp", "reel02-640x800.webp", "reel03-640x800.webp", "reel04-640x800.webp", "reel05-640x800.webp", "reel06-640x800.webp"];
