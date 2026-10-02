import type { ReactNode } from 'react';
import config from '@/content/shop-config.json';

const s = config.seller;
const mail = config.contactEmail;
const UPDATED = '2 Ekim 2026';

const Seller = () => (
  <table>
    <tbody>
      <tr>
        <th>Satıcı</th>
        <td>{s.name}</td>
      </tr>
      {s.address && (
        <tr>
          <th>Adres</th>
          <td>{s.address}</td>
        </tr>
      )}
      {s.taxOffice && s.taxNo && (
        <tr>
          <th>Vergi dairesi / no</th>
          <td>
            {s.taxOffice} / {s.taxNo}
          </td>
        </tr>
      )}
      {s.mersis && (
        <tr>
          <th>MERSİS no</th>
          <td>{s.mersis}</td>
        </tr>
      )}
      <tr>
        <th>E-posta</th>
        <td>
          <a href={`mailto:${mail}`}>{mail}</a>
        </td>
      </tr>
      {s.phone && (
        <tr>
          <th>Telefon</th>
          <td>{s.phone}</td>
        </tr>
      )}
    </tbody>
  </table>
);

export type Doc = { slug: string; title: string; lead: string; body: () => ReactNode };

export const docs: Doc[] = [
  {
    slug: 'kargo-ve-iade',
    title: 'Kargo ve iade',
    lead: 'Siparişin nasıl yola çıkar, nasıl teslim alırsın, istersen nasıl iade edersin.',
    body: () => (
      <>
        <h2>Teslimat</h2>
        <ul>
          <li>Siparişler 2–4 iş gününde kargoya verilir.</li>
          <li>Demleme Sehpası siparişle üretilir: 7–10 iş gününde kargoya verilir.</li>
          <li>750 ₺ ve üzeri siparişlerde kargo ücretsizdir. Altındaki siparişlerde kargo ücreti sepet ve ödeme sayfasında, sipariş vermeden önce açıkça gösterilir.</li>
          <li>Teslimat Türkiye içine yapılır. Siparişin kargoya verildiğinde durumu “Kargoda” olarak güncellenir; sipariş takibi sayfasından ya da hesabından görebilirsin.</li>
        </ul>
        <h2>Teslim alırken</h2>
        <p>Paketi kargo görevlisinin yanında kontrol et. Paket ezik, yırtık ya da açılmış görünüyorsa teslim almadan görevliyle birlikte tutanak tut ve bize yaz.</p>

        <h2 id="iade">İade ve cayma hakkı</h2>
        <p>Ürünü teslim aldığın tarihten itibaren 14 gün içinde, herhangi bir gerekçe göstermeden ve cezai şart ödemeden cayma hakkını kullanabilirsin.</p>
        <ol>
          <li>
            <a href={`mailto:${mail}`}>{mail}</a> adresine sipariş numaranla birlikte iade talebini yaz.
          </li>
          <li>Ürünü kullanılmamış, yeniden satılabilir durumda ve mümkünse orijinal ambalajında bize gönder. Gönderim yöntemini yazışmada birlikte netleştiririz.</li>
          <li>İade talebinin bize ulaşmasından itibaren en geç 14 gün içinde ödemeni, ödeme yöntemine uygun şekilde iade ederiz.</li>
        </ol>
        <p>Mesafeli Sözleşmeler Yönetmeliği’nde sayılan cayma hakkı istisnaları saklıdır.</p>

        <h2>Değişim</h2>
        <p>Beden ya da renk değişimi için de aynı adrese yazabilirsin. Stok durumuna göre değişimi birlikte planlarız.</p>
        <h2>Soruların için</h2>
        <p>
          <a href={`mailto:${mail}`}>{mail}</a>
        </p>
      </>
    ),
  },
  {
    slug: 'mesafeli-satis-sozlesmesi',
    title: 'Ön bilgilendirme ve mesafeli satış sözleşmesi',
    lead: 'Sipariş vermeden önce bilmen gereken koşullar.',
    body: () => (
      <>
        <h2>1. Taraflar</h2>
        <h3>Satıcı</h3>
        <Seller />
        <h3>Alıcı</h3>
        <p>Sipariş sırasında ad soyad, e-posta, telefon ve teslimat adresi bilgilerini girerek siparişi veren kişidir.</p>

        <h2>2. Sözleşmenin konusu</h2>
        <p>
          Bu sözleşme, alıcının Demleme internet sitesi üzerinden sipariş ettiği ürünlerin satışı ve teslimi ile ilgili tarafların hak ve yükümlülüklerini, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerine göre düzenler.
        </p>

        <h2>3. Ürün ve fiyat bilgisi</h2>
        <p>
          Ürünün adı, rengi, bedeni, adedi, vergiler dahil satış fiyatı ve kargo bedeli sipariş özetinde ve sipariş onayında gösterilir. Fiyatlar sipariş anında geçerli olan fiyatlardır; siparişten sonra yapılan fiyat değişiklikleri verilmiş siparişi etkilemez.
        </p>

        <h2>4. Ödeme</h2>
        <p>Alıcı, sipariş sırasında sunulan ödeme yöntemlerinden birini seçer: havale/EFT ya da kapıda ödeme. Havale/EFT ile ödemede sipariş, ödeme bize ulaştıktan sonra hazırlanır.</p>

        <h2>5. Teslimat</h2>
        <p>
          Ürünler, sipariş onayında ve “Kargo ve iade” sayfasında belirtilen süreler içinde alıcının bildirdiği adrese kargo ile teslim edilir. Mücbir sebepler nedeniyle yaşanabilecek gecikmeler alıcıya bildirilir. Teslimat adresinin doğru ve eksiksiz verilmesi alıcının sorumluluğundadır.
        </p>

        <h2>6. Cayma hakkı</h2>
        <p>
          Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeden ve cezai şart ödemeden sözleşmeden cayma hakkına sahiptir. Cayma bildirimi <a href={`mailto:${mail}`}>{mail}</a> adresine yapılır. Satıcı, cayma bildiriminin kendisine ulaşmasından itibaren 14 gün içinde ürün bedelini ve varsa teslimat masraflarını alıcıya iade eder. Mesafeli Sözleşmeler Yönetmeliği’nde sayılan istisnalar saklıdır. Ayrıntılar “Kargo ve iade” sayfasındadır.
        </p>

        <h2>7. Ayıplı ürün</h2>
        <p>Teslim edilen ürün ayıplı ise alıcı, 6502 sayılı Kanun’dan doğan seçimlik haklarını (ayıpsız misli ile değiştirme, bedel iadesi, bedelden indirim, ücretsiz onarım) kullanabilir.</p>

        <h2>8. Uyuşmazlıkların çözümü</h2>
        <p>
          Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı’nca her yıl ilan edilen parasal sınırlar dahilinde alıcının yerleşim yerindeki ya da işlemin yapıldığı yerdeki Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir.
        </p>

        <h2>9. Yürürlük</h2>
        <p>Alıcı, siparişi tamamlamadan önce bu sözleşmeyi ve ön bilgilendirmeyi okuduğunu, anladığını ve elektronik ortamda onayladığını kabul eder. Sözleşme, sipariş onayı ile yürürlüğe girer.</p>
        <p className="small">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
  {
    slug: 'kvkk',
    title: 'KVKK aydınlatma metni',
    lead: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında verilerinin nasıl işlendiği.',
    body: () => (
      <>
        <h2>Veri sorumlusu</h2>
        <Seller />
        <h2>İşlediğimiz veriler</h2>
        <ul>
          <li>Kimlik ve iletişim: ad soyad, e-posta, telefon.</li>
          <li>Teslimat: adres bilgileri.</li>
          <li>Müşteri işlemi: sipariş içeriği, tutarı, ödeme yöntemi, sipariş durumu.</li>
          <li>Hesap: üyelik bilgileri ve şifre (şifren bize okunabilir halde ulaşmaz, şifreli saklanır).</li>
        </ul>
        <h2>İşleme amaçları</h2>
        <ul>
          <li>Siparişini almak, hazırlamak, teslim etmek ve siparişle ilgili seninle iletişim kurmak.</li>
          <li>Üyelik hesabını oluşturmak ve yönetmek.</li>
          <li>İade, cayma ve ayıplı ürün süreçlerini yürütmek.</li>
          <li>Yasal yükümlülüklerimizi (fatura, muhasebe, vergi) yerine getirmek.</li>
        </ul>
        <h2>Hukuki sebepler</h2>
        <p>Verilerin; bir sözleşmenin kurulması ve ifasıyla doğrudan ilgili olması, hukuki yükümlülüğün yerine getirilmesi ve meşru menfaatimiz (hizmet güvenliği) sebeplerine dayanılarak işlenir.</p>
        <h2>Aktarım</h2>
        <p>
          Verilerin, siparişini teslim etmek için kargo firmalarıyla; yasal yükümlülükler için yetkili kurum ve kuruluşlarla; sitenin çalışması için barındırma ve veritabanı hizmeti aldığımız altyapı sağlayıcılarıyla paylaşılabilir. Altyapı sağlayıcıları yurt dışında bulunabilir.
        </p>
        <h2>Toplama yöntemi</h2>
        <p>Verilerin, internet sitemizdeki üyelik, ödeme ve iletişim formları aracılığıyla elektronik ortamda toplanır.</p>
        <h2>Haklarının kullanımı</h2>
        <p>KVKK’nın 11. maddesi uyarınca; verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri öğrenme ve zarara uğraman halinde tazminat talep etme haklarına sahipsin. Başvurularını <a href={`mailto:${mail}`}>{mail}</a> adresine iletebilirsin.</p>
        <p className="small">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
  {
    slug: 'gizlilik-politikasi',
    title: 'Gizlilik politikası',
    lead: 'Sitede hangi bilgilerin neden tutulduğu.',
    body: () => (
      <>
        <h2>Hangi bilgileri topluyoruz?</h2>
        <p>Üye olurken ve sipariş verirken bize verdiğin bilgileri (ad soyad, e-posta, telefon, adres, sipariş içeriği) tutarız. Bu bilgileri yalnızca siparişini ve hesabını yönetmek, seninle iletişim kurmak ve yasal yükümlülükleri yerine getirmek için kullanırız. Ayrıntılı bilgi için <a href="/kvkk">KVKK aydınlatma metnine</a> bakabilirsin.</p>
        <h2>Tarayıcıda saklananlar</h2>
        <p>Sepetin ve oturum bilgin, sitenin çalışabilmesi için tarayıcının yerel depolamasında saklanır. Bu siteyi analiz ya da reklam amacıyla izleyen bir çerez kullanmıyoruz.</p>
        <h2>Üçüncü taraf hizmetler</h2>
        <p>Yazı tipleri Google Fonts ve Adobe Fonts’tan yüklenir; bu hizmetler sayfayı açtığında IP adresini görebilir. Sitenin barındırılması ve veritabanı için altyapı hizmeti sağlayıcıları kullanılır.</p>
        <h2>Güvenlik</h2>
        <p>Verilerin şifreli bağlantı üzerinden iletilir. Şifren şifreli (hash’lenmiş) olarak saklanır. Sipariş ve adres bilgilerine yalnızca hesabınla ya da sipariş numarası ve e-postanla ulaşılabilir.</p>
        <h2>Saklama süresi</h2>
        <p>Bilgilerini, ilgili yasal sürelerin gerektirdiği kadar ya da hesabını silmeni isteyene kadar saklarız.</p>
        <h2>İletişim</h2>
        <p>
          Sorular ve talepler için: <a href={`mailto:${mail}`}>{mail}</a>
        </p>
        <p className="small">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
  {
    slug: 'kullanim-sartlari',
    title: 'Kullanım şartları',
    lead: 'Siteyi kullanırken geçerli olan kurallar.',
    body: () => (
      <>
        <h2>Genel</h2>
        <p>Bu siteyi kullanarak aşağıdaki şartları kabul etmiş sayılırsın. Şartları zaman zaman güncelleyebiliriz; güncel hâli bu sayfada yayımlanır.</p>
        <h2>Hesap</h2>
        <p>Hesabındaki bilgilerin doğruluğundan ve şifrenin gizliliğinden sen sorumlusun. Hesabında yetkisiz bir kullanım fark edersen bize bildir.</p>
        <h2>Siparişler</h2>
        <p>Sipariş verebilmek için yasal olarak sözleşme yapma ehliyetine sahip olmalısın. Stok, fiyat ya da açıkça hatalı bilgi nedeniyle bir siparişi gerçekleştiremezsek sana bildirir ve ödeme yaptıysan iade ederiz.</p>
        <h2>İçerik ve fikri mülkiyet</h2>
        <p>Sitedeki çizimler, fotoğraflar, yazılar, logo ve diğer tüm içerikler Demleme’ye aittir; izin almadan kopyalanamaz, çoğaltılamaz ya da ticari amaçla kullanılamaz.</p>
        <h2>Sorumluluk</h2>
        <p>Siteyi kesintisiz ve hatasız sunmaya çalışırız; ancak teknik nedenlerle yaşanabilecek kesintilerden doğan dolaylı zararlardan sorumlu değiliz. Yasal tüketici haklarına dokunulmaz.</p>
        <h2>Uygulanacak hukuk</h2>
        <p>Bu şartlara Türk hukuku uygulanır. Tüketici uyuşmazlıkları için yetkili merciler mesafeli satış sözleşmesinde belirtilmiştir.</p>
        <h2>İletişim</h2>
        <p>
          <a href={`mailto:${mail}`}>{mail}</a>
        </p>
        <p className="small">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
];

export const docBySlug = (slug: string) => docs.find((d) => d.slug === slug);
