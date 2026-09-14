export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  priceDisplay: string;
  category: string;
  stock: number;
  limited: boolean;
  description: string;
  longDescription: string;
  details: string[];
  specs: { label: string; value: string }[];
  badge?: string;
  color: string;
  accentColor: string;
  images: string[];
  reviews: { name: string; rating: number; comment: string; date: string }[];
  faq: { q: string; a: string }[];
  svgIcon: string;
}

export const products: Product[] = [
  {
    id: 'p1',
    slug: 'demleme-kupasi',
    name: 'Demleme Kupası',
    price: 290,
    priceDisplay: '₺290',
    category: 'Mutfak',
    stock: 27,
    limited: true,
    badge: 'Sınırlı Üretim',
    color: '#b5451b',
    accentColor: '#e07048',
    description: 'Her çayı ritüele dönüştüren, el yapımı seramik kupa. Demleme logolu, sıcak dokunuşlu.',
    longDescription: 'Sofranın vazgeçilmezi olacak bu kupa, Türkiye\'nin en iyi seramik ustalarından biriyle iş birliği yapılarak tasarlandı. Klasik Türk çay bardağı formundan ilham alıp modern bir yoruma kavuşturuldu. Her kupa tek tek elle şekillendirilip, yüksek ısıda fırınlanıyor. Demleme logosu ise kabartma tekniğiyle işleniyor.',
    details: ['El yapımı seramik', '300ml kapasite', 'Bulaşık makinesine uygun', 'Kutulu özel teslimat', 'Kabartma logo detayı', 'Kurşunsuz sır'],
    specs: [
      { label: 'Malzeme', value: 'El yapımı seramik' },
      { label: 'Kapasite', value: '300ml' },
      { label: 'Ağırlık', value: '~280g' },
      { label: 'Boyut', value: '9cm × 11cm' },
      { label: 'Renk', value: 'Mat krem / Terracotta' },
      { label: 'Bakım', value: 'Bulaşık makinesine uygun' },
    ],
    reviews: [
      { name: 'Selin A.', rating: 5, comment: 'Hediye aldım, çok beğendiler. Kalitesi gerçekten üst düzey.', date: '2 hafta önce' },
      { name: 'Mert K.', rating: 5, comment: 'Her sabah çayımı bu kupadan içiyorum. Elinize sağlık!', date: '1 ay önce' },
      { name: 'Ayşe D.', rating: 4, comment: 'Çok şık, biraz küçük geldi bana ama tasarım harika.', date: '6 hafta önce' },
    ],
    faq: [
      { q: 'Kargo ne zaman çıkar?', a: 'Siparişler 1-2 iş günü içinde kargoya verilir, toplam 2-4 iş günü teslimat beklenir.' },
      { q: 'İade koşulları nedir?', a: '14 gün içinde koşulsuz iade. Hasarlı veya yanlış ürünlerde kargo bedeli bize aittir.' },
      { q: 'Hediye paketi mevcut mu?', a: 'Evet, sipariş notuna "hediye paketi" yazarsanız özel kutuda gönderilir.' },
    ],
    images: ['/images/demleme-kupasi.webp'],
    svgIcon: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 30 Q20 54 22 66 L58 66 Q60 54 58 30 Z" fill="currentColor" opacity="0.12"/>
  <path d="M22 30 Q20 54 22 66 L58 66 Q60 54 58 30 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/>
  <path d="M58 38 L64 38 Q72 38 72 48 Q72 58 64 58 L58 58" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M22 30 L58 30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M30 20 Q31 14 34 18 Q37 22 38 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M42 18 Q43 12 46 16 Q49 20 50 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.5"/>
  <ellipse cx="40" cy="30" rx="10" ry="2.5" fill="currentColor" opacity="0.15"/>
</svg>`,
  },
  {
    id: 'p2',
    slug: 'sofra-tisortu',
    name: 'Sofra Tişörtü',
    price: 450,
    priceDisplay: '₺450',
    category: 'Giyim',
    stock: 48,
    limited: false,
    color: '#5b3a8c',
    accentColor: '#8b6bbf',
    description: '"Sofraya herkes davetli" yazılı oversize tişört. %100 organik pamuk, unisex kalıp.',
    longDescription: 'Demleme\'nin ruhunu taşıyan bu tişört, masaya oturmanın davetini veriyor. 280g/m² ağır organik pamuktan üretilen oversize kalıbı, hem rahat hem de şık. Baskılar su bazlı boyalarla yapılıyor — çevre dostu ve uzun ömürlü.',
    details: ['%100 organik pamuk, 280g/m²', 'Oversize unisex kalıp', 'XS – 2XL beden seçeneği', 'Su bazlı çevre dostu baskı', 'Krem & siyah renk seçeneği', 'GOTS sertifikalı'],
    specs: [
      { label: 'Materyal', value: '%100 Organik pamuk' },
      { label: 'Gramaj', value: '280g/m²' },
      { label: 'Kalıp', value: 'Oversize, unisex' },
      { label: 'Bedenler', value: 'XS / S / M / L / XL / 2XL' },
      { label: 'Renkler', value: 'Krem, Siyah' },
      { label: 'Yıkama', value: '30°C, ters çevirerek' },
    ],
    reviews: [
      { name: 'Zeynep T.', rating: 5, comment: 'Kalitesi mükemmel, bedeni tam. Herkese öneriyorum.', date: '1 hafta önce' },
      { name: 'Can B.', rating: 5, comment: 'Kumaşı çok kaliteli, baskı da solmadı.', date: '3 hafta önce' },
      { name: 'Elif M.', rating: 4, comment: 'Güzel ama kargo biraz geç geldi.', date: '2 ay önce' },
    ],
    faq: [
      { q: 'Beden nasıl seçmeliyim?', a: 'Oversize kalıp olduğu için bir beden küçük almanızı öneririz.' },
      { q: 'Yıkamada solar mı?', a: 'Su bazlı baskılar düşük ısıda ve ters çevrilerek yıkandığında uzun yıllar dayanır.' },
    ],
    images: ['/images/sofra-tisortu.webp'],
    svgIcon: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 14 L52 14 L52 14 C56 14 62 18 65 24 L72 28 L64 38 L58 34 L58 66 L22 66 L22 34 L16 38 L8 28 L15 24 C18 18 24 14 28 14 Z" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <path d="M28 14 Q30 22 40 22 Q50 22 52 14" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <text x="40" y="50" text-anchor="middle" font-size="7" fill="currentColor" font-family="serif" opacity="0.7">sofraya</text>
  <text x="40" y="59" text-anchor="middle" font-size="7" fill="currentColor" font-family="serif" opacity="0.7">herkes davetli</text>
</svg>`,
  },
  {
    id: 'p3',
    slug: 'demleme-defteri',
    name: 'Demleme Defteri',
    price: 180,
    priceDisplay: '₺180',
    category: 'Kırtasiye',
    stock: 62,
    limited: false,
    color: '#2a7a4b',
    accentColor: '#4aad70',
    description: 'Sofrada doğan fikirleri, tarifleri, anları yazmak için. Noktalı iç sayfa, sert kapak.',
    longDescription: 'Demleme\'nin her bölümünde olduğu gibi, iyi fikirler iyi ortamlarda doğar. Bu defter, sohbet sırasında aklına gelen o muhteşem fikri ya da masanın tarifini kayıt altına almak için tasarlandı.',
    details: ['A5 format (14.8 × 21cm)', '160 sayfa noktalı iç kağıt, 90g', 'Sert kapak, yuvarlak köşe', 'El işi deri yer tutucu şerit', 'İç cep sayfası', 'Lay-flat spiral bağlama'],
    specs: [
      { label: 'Format', value: 'A5 (14.8 × 21cm)' },
      { label: 'Sayfa', value: '160 sayfa' },
      { label: 'Kağıt', value: '90g noktalı' },
      { label: 'Kapak', value: 'Sert, mat laminasyon' },
      { label: 'Bağlama', value: 'Lay-flat spiral' },
      { label: 'Ekstralar', value: 'Deri şerit, iç cep' },
    ],
    reviews: [
      { name: 'Berk Y.', rating: 5, comment: 'Kağıt kalitesi harika, mürekkep geçirmiyor.', date: '5 gün önce' },
      { name: 'Nisan Ö.', rating: 5, comment: 'Hediye olarak aldım, çok beğenildi.', date: '2 hafta önce' },
    ],
    faq: [
      { q: 'Dolma kalem uyumlu mu?', a: 'Evet, 90g kağıt dolma kalem için uygundur, geçirme yapmaz.' },
    ],
    images: ['/images/demleme-defteri.webp'],
    svgIcon: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="18" y="10" width="44" height="58" rx="4" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="2"/>
  <rect x="14" y="10" width="8" height="58" rx="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.5"/>
  <line x1="28" y1="24" x2="54" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <line x1="28" y1="32" x2="54" y2="32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <line x1="28" y1="40" x2="44" y2="40" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <circle cx="31" cy="48" r="1.5" fill="currentColor" opacity="0.4"/>
  <circle cx="36" cy="48" r="1.5" fill="currentColor" opacity="0.4"/>
  <circle cx="41" cy="48" r="1.5" fill="currentColor" opacity="0.4"/>
  <path d="M52 58 L62 48 L66 52 L56 62 Z" fill="currentColor" opacity="0.5"/>
  <path d="M62 48 L65 45 L67 47 L64 50 Z" fill="currentColor" opacity="0.8"/>
</svg>`,
  },
  {
    id: 'p4',
    slug: 'mini-cay-seti',
    name: 'Mini Çay Seti',
    price: 620,
    priceDisplay: '₺620',
    category: 'Mutfak',
    stock: 15,
    limited: true,
    badge: 'Çok Satan',
    color: '#9a6f1a',
    accentColor: '#d4a435',
    description: 'Sofranın tam ortasına layık. İki kişilik seramik çay seti; demlik ve iki fincanla.',
    longDescription: 'İki kişilik bu sohbet için tasarlandı. Küçük ama kaliteli demlik, ısıyı uzun süre tutar; eşleşen iki fincan ise tam kucak boyu. Tümü el yapımı, Türkiye\'de üretilmiş.',
    details: ['El yapımı seramik, Türkiye üretimi', '600ml demlik', '2 × 150ml fincan', 'Hediyelik ahşap kutu', 'Isı koruyucu çift cidar demlik', 'Kurşunsuz, gıdaya uygun sır'],
    specs: [
      { label: 'İçerik', value: '1 demlik + 2 fincan' },
      { label: 'Demlik', value: '600ml, çift cidarlı' },
      { label: 'Fincan', value: '150ml her biri' },
      { label: 'Malzeme', value: 'El yapımı seramik' },
      { label: 'Renk', value: 'Mavi, Yeşil' },
      { label: 'Kutu', value: 'Ahşap hediyelik kutu' },
    ],
    reviews: [
      { name: 'Hande S.', rating: 5, comment: 'Anneme aldım, çok memnun kaldı. Hem güzel hem kaliteli.', date: '3 gün önce' },
      { name: 'Tolga R.', rating: 5, comment: 'Demlik gerçekten ısıyı tutuyor, fincanlar da sağlam.', date: '1 hafta önce' },
      { name: 'Dilara K.', rating: 5, comment: 'Hediyelik kutusuyla beraber çok şık geldi.', date: '3 hafta önce' },
      { name: 'Emre A.', rating: 4, comment: 'Güzel ürün, fiyatına değer.', date: '1 ay önce' },
    ],
    faq: [
      { q: 'Renk seçimi nasıl yapılır?', a: 'Sipariş notuna "mavi" veya "yeşil" yazmanız yeterli.' },
      { q: 'Demlik ocağa konur mu?', a: 'Hayır, sadece demlenmiş çay için kullanılır.' },
    ],
    images: ['/images/cay-icon-blue.jpeg', '/images/cay-icon-green.jpeg'],
    svgIcon: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 28 Q18 50 20 62 L52 62 Q54 50 52 28 Z" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <path d="M52 36 L58 35 Q67 34 67 45 Q67 56 58 55 L52 54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="36" cy="28" rx="12" ry="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
  <path d="M30 16 Q31 11 33 14 Q35 18 37 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.45"/>
  <path d="M40 14 Q41 9 43 12 Q45 16 47 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.45"/>
  <circle cx="61" cy="68" r="6" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="72" cy="68" r="6" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1.5"/>
</svg>`,
  },
  {
    id: 'p5',
    slug: 'bolum-posteri',
    name: 'Bölüm Posteri',
    price: 220,
    priceDisplay: '₺220',
    category: 'Dekor',
    stock: 33,
    limited: false,
    color: '#1a6e6e',
    accentColor: '#2aafaf',
    description: 'En sevdiğin bölümün kapak tasarımı. 30×40cm baskı, mat kuşe kağıt.',
    longDescription: 'Demleme\'nin en çok izlenen bölümlerinin özel tasarım posterleri. Mat kuşe kağıda baskı, asılmaya hazır. Her bölümün kendine özgü renk paleti ve tipografisi var.',
    details: ['30×40cm format', '200g mat kuşe kağıt', 'Siparişe özel bölüm baskısı', 'Çerçevesiz gönderim', 'Sert karton tüp ile koruma', 'Tüm bölümler mevcut'],
    specs: [
      { label: 'Boyut', value: '30 × 40cm' },
      { label: 'Kağıt', value: '200g mat kuşe' },
      { label: 'Baskı', value: 'Dijital offset, UV' },
      { label: 'Gönderim', value: 'Sert karton tüp' },
      { label: 'Süre', value: '3-5 iş günü (baskı + kargo)' },
    ],
    reviews: [
      { name: 'Yasemin B.', rating: 5, comment: 'Duvarımın en güzel köşesi oldu. Renkleri canlı.', date: '1 hafta önce' },
      { name: 'Serhan G.', rating: 5, comment: 'Sevgilime aldım, çok mutlu oldu.', date: '1 ay önce' },
    ],
    faq: [
      { q: 'Hangi bölümü seçebilirim?', a: 'Tüm yayınlanmış bölümler mevcut. Sipariş notuna bölüm adı veya numarasını yazın.' },
      { q: 'Kaç günde gelir?', a: 'Baskı + kargo toplam 3-5 iş günü.' },
    ],
    images: ['/images/bolum-posteri.webp'],
    svgIcon: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="14" y="8" width="52" height="64" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="2"/>
  <rect x="20" y="14" width="40" height="26" rx="2" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="30" cy="24" r="5" fill="currentColor" opacity="0.3"/>
  <path d="M26 36 L36 24 L44 32 L50 26 L60 36 Z" fill="currentColor" opacity="0.25"/>
  <line x1="20" y1="48" x2="60" y2="48" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="20" y1="56" x2="48" y2="56" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="20" y1="63" x2="38" y2="63" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>
</svg>`,
  },
  {
    id: 'p6',
    slug: 'kupa-altligi-seti',
    name: 'Kupa Altlığı Seti',
    price: 140,
    priceDisplay: '₺140',
    category: 'Mutfak',
    stock: 80,
    limited: false,
    color: '#1c4f7a',
    accentColor: '#3182c8',
    description: '4\'lü ahşap kupa altlığı seti. Lazerle işlenmiş Demleme logosu.',
    longDescription: 'Masanı tamamlayan bu 4\'lü set, doğal ahşaptan lazer kesim ve baskı ile üretiliyor. Her altlık 10×10cm boyutunda, 8mm kalınlığında kayın ağacından.',
    details: ['4\'lü set', 'Doğal kayın ağacı, 8mm', '10×10cm boyut', 'Lazer baskı logo', 'Kaydırmaz kauçuk taban', 'Hediye kutusunda'],
    specs: [
      { label: 'Malzeme', value: 'Doğal kayın ağacı' },
      { label: 'Kalınlık', value: '8mm' },
      { label: 'Boyut', value: '10 × 10cm' },
      { label: 'Adet', value: '4\'lü set' },
      { label: 'Taban', value: 'Kaydırmaz kauçuk' },
    ],
    reviews: [
      { name: 'Kerem Y.', rating: 5, comment: 'Ahşap kalitesi çok iyi, lazer baskı da çok net.', date: '2 hafta önce' },
    ],
    faq: [
      { q: 'Islak silinebilir mi?', a: 'Evet, nemli bez ile silebilirsiniz. Uzun süre ıslatmayın.' },
    ],
    images: ['/images/kupa-altligi.webp'],
    svgIcon: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="26" height="26" rx="5" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.8"/>
  <rect x="44" y="10" width="26" height="26" rx="5" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.8"/>
  <rect x="10" y="44" width="26" height="26" rx="5" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.8"/>
  <rect x="44" y="44" width="26" height="26" rx="5" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.8"/>
  <circle cx="23" cy="23" r="5" fill="currentColor" opacity="0.35"/>
  <circle cx="57" cy="23" r="5" fill="currentColor" opacity="0.35"/>
  <circle cx="23" cy="57" r="5" fill="currentColor" opacity="0.35"/>
  <circle cx="57" cy="57" r="5" fill="currentColor" opacity="0.35"/>
</svg>`,
  },
  {
    id: 'p7',
    slug: 'hediye-karti',
    name: 'Hediye Kartı',
    price: 200,
    priceDisplay: '₺200 – ₺1000',
    category: 'Diğer',
    stock: 999,
    limited: false,
    color: '#6b3080',
    accentColor: '#a050c0',
    description: 'Sevdiklerine Demleme\'den bir şey almak istiyorsan, hediye kartı tam sana göre.',
    longDescription: 'Ne alacağını bilemiyorsan, seçimi onlara bırak. ₺200\'den ₺1000\'e kadar istediğin tutarda dijital hediye kartı. Anında e-posta ile iletilir, 1 yıl geçerlidir.',
    details: ['₺200 – ₺1000 arası tutar', 'Anında dijital teslimat', '1 yıl geçerlilik süresi', 'Tüm ürünlerde kullanılabilir', 'Kişiselleştirilmiş mesaj eklenebilir'],
    specs: [
      { label: 'Teslimat', value: 'Dijital (e-posta)' },
      { label: 'Geçerlilik', value: '1 yıl' },
      { label: 'Minimum', value: '₺200' },
      { label: 'Maksimum', value: '₺1000' },
    ],
    reviews: [],
    faq: [
      { q: 'Ne zaman teslim edilir?', a: 'Satın alma sonrası anında e-posta ile gönderilir.' },
      { q: 'Bakiye kalırsa ne olur?', a: 'Kalan bakiye bir sonraki alışverişte kullanılabilir.' },
    ],
    images: ['/images/hediye-karti.webp'],
    svgIcon: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="22" width="64" height="40" rx="6" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="2"/>
  <line x1="8" y1="36" x2="72" y2="36" stroke="currentColor" stroke-width="1.8" opacity="0.4"/>
  <path d="M40 22 L40 16 Q40 10 34 10 Q28 10 28 16 Q28 22 34 22 Z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
  <path d="M40 22 L40 16 Q40 10 46 10 Q52 10 52 16 Q52 22 46 22 Z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
  <rect x="18" y="47" width="20" height="6" rx="3" fill="currentColor" opacity="0.25"/>
  <rect x="18" y="56" width="32" height="4" rx="2" fill="currentColor" opacity="0.15"/>
</svg>`,
  },
];

export function getProduct(slug: string) {
  return products.find(p => p.slug === slug);
}
export function getProductById(id: string) {
  return products.find(p => p.id === id);
}
