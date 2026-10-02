import type { ReactNode } from 'react';
import type { ShopConfig } from './catalog';

const UPDATED = '2 Ekim 2026';

const Seller = ({ s, mail }: { s: ShopConfig['seller']; mail: string }) => (
  <table>
    <tbody>
      <tr>
        <th>Unvan</th>
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

export type Doc = {
  slug: string;
  title: string;
  lead: string;
  body: () => ReactNode;
};

/**
 * Yasal metinler. Satıcı/iletişim bilgileri ve ücretsiz kargo eşiği yönetim panelindeki ayarlardan gelir.
 * Metinler örnek taslaktır; yayına almadan önce bir avukat tarafından işletmenin gerçek durumuna göre gözden geçirilmelidir.
 */
export function legalDocs(config: ShopConfig): Doc[] {
  const s = config.seller;
  const mail = config.contactEmail;
  const freeFrom = config.freeFrom.toLocaleString('tr-TR');
  const Mail = () => <a href={`mailto:${mail}`}>{mail}</a>;
  return [
    /* ───────────────────────── KARGO VE İADE ───────────────────────── */
    {
      slug: 'kargo-ve-iade',
      title: 'Kargo, teslimat ve iade',
      lead: 'Siparişin nasıl yola çıkar, nasıl teslim alırsın; cayma ve iade haklarını nasıl kullanırsın.',
      body: () => (
        <>
          <h2>1. Teslimat</h2>
          <ul>
            <li>Siparişler, ödemenin onaylanmasından (havale/EFT’de ödemenin hesabımıza geçmesinden) itibaren 2–4 iş gününde kargoya verilir.</li>
            <li>Demleme Sehpası siparişle üretilir; bu ürün 7–10 iş gününde kargoya verilir. Sepette birden fazla ürün varsa, aksini belirtmedikçe siparişin tamamı en uzun süreli ürüne göre gönderilir.</li>
            <li>Her durumda sözleşmedeki teslim süresi, siparişin verildiği tarihten itibaren en geç 30 gündür (Mesafeli Sözleşmeler Yönetmeliği m. 20).</li>
            <li>Gönderiler UPS Kargo ile Türkiye içindeki adrese teslim edilir. Sipariş kargoya verildiğinde durumu “Kargoda” olarak güncellenir ve takip numarası e-postanla paylaşılır; sipariş takibi sayfasından ya da hesabından da izleyebilirsin.</li>
            <li>
              {freeFrom} ₺ ve üzeri siparişlerde kargo ücretsizdir. Bu tutarın altındaki siparişlerde kargo ücreti sepet ve ödeme sayfasında, sipariş vermeden önce ayrıca gösterilir.
            </li>
            <li>Teslimat adresinin ve telefonun doğru, eksiksiz verilmesi alıcının sorumluluğundadır. Hatalı adres nedeniyle teslim edilemeyen gönderilerde yeniden gönderim masrafı alıcıya yansıtılabilir.</li>
          </ul>

          <h2>2. Teslim alırken yapılacaklar</h2>
          <p>
            Paketi kargo görevlisinin yanında kontrol et. Paket ezik, yırtık, ıslak ya da açılmış görünüyorsa teslim almadan görevliyle birlikte hasar tespit tutanağı tut ve bize <Mail /> adresinden haber ver. Hasarlı
            teslim aldığın ürünü, tutanak olmasa da paketi teslim aldıktan sonra mümkün olan en kısa sürede bildirmen hakların bakımından önemlidir.
          </p>

          <h2 id="iade">3. Cayma hakkı</h2>
          <p>
            6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, ürünü teslim aldığın tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeden ve cezai şart
            ödemeden sözleşmeden cayma hakkına sahipsin. Birden fazla ürün tek siparişle ve ayrı ayrı teslim edildiyse süre, son ürünün teslim edildiği günden başlar.
          </p>
          <ol>
            <li>
              Cayma bildirimini, sipariş numaranla birlikte <Mail /> adresine yaz (aşağıdaki cayma formunu kullanabilirsin; form kullanmak zorunlu değildir, açık bir bildirim yeterlidir). Bildirim süre dolmadan
              bize ulaşmalıdır.
            </li>
            <li>Bildirimden sonra 10 gün içinde ürünü bize UPS Kargo ile geri gönder. Gönderim bilgilerini ve iade kodunu yazışmada ayrıca iletiriz.</li>
            <li>Ürünü, kullanılmamış, yeniden satılabilir durumda; etiketi, aksesuarı ve mümkünse orijinal ambalajıyla gönder. Ürünün niteliği ve işleyişini belirlemek için gerekli olandan fazla kullanılmasından doğan değer kaybı, alıcıya yansıtılabilir.</li>
            <li>
              Cayma bildiriminin bize ulaşmasından itibaren en geç 14 gün içinde ürün bedelini ve (standart teslimat dışında bir seçenek istemediysen) ilk teslimat masraflarını, ödemeyi yaptığın yöntemle iade ederiz. Ürün bize
              ulaşıncaya veya gönderdiğini belgeleyinceye kadar iade bedelini bekletme hakkımız saklıdır. Kredi kartı iadeleri, bankanın iade sürecine bağlı olarak hesabına birkaç gün içinde yansır.
            </li>
          </ol>
          <p>
            Cayma halinde geri gönderim masrafı alıcıya aittir. Ayıplı ya da hatalı gönderilen üründe geri gönderim masrafını biz karşılarız.
          </p>

          <h3>Cayma hakkının kullanılamayacağı haller</h3>
          <p>Yönetmeliğin 15. maddesine göre, aşağıdaki sözleşmelerde cayma hakkı kullanılamaz:</p>
          <ul>
            <li>Fiyatı finansal piyasalardaki dalgalanmalara bağlı ürünler.</li>
            <li>Alıcının istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan, üzerinde kişiye özel değişiklik yapılan ürünler.</li>
            <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler.</li>
            <li>Teslimden sonra ambalajı, bandı, mührü, paketi açılmış; iadesi sağlık ve hijyen açısından uygun olmayan ürünler.</li>
            <li>Teslimden sonra başka ürünlerle karışan ve doğası gereği ayrıştırılması mümkün olmayan ürünler.</li>
            <li>Yönetmelikte sayılan diğer istisnalar.</li>
          </ul>

          <h2>4. Değişim</h2>
          <p>
            Beden ya da renk değişimi için de <Mail /> adresine sipariş numaranla yaz. Stok durumuna göre değişimi birlikte planlarız; stokta olmayan üründe cayma ve bedel iadesi seçeneğin saklıdır.
          </p>

          <h2>5. Ayıplı ürün</h2>
          <p>
            Teslim ettiğimiz ürün ayıplı çıkarsa, 6502 sayılı Kanun’un 11. maddesinden doğan seçimlik haklarını (satış bedelinden indirim, ürünü iade ederek bedel iadesi, ücretsiz onarım ya da ayıpsız misli ile değiştirme)
            kullanabilirsin. Ayıp bildirimi için fotoğraf ve sipariş numaranla <Mail /> adresine yazman yeterlidir. Ayıplı ürünün gönderim masrafı bize aittir. Kanunda öngörülen süreler (teslimden itibaren 2 yıl) saklıdır.
          </p>

          <h2>6. İptal</h2>
          <p>
            Henüz kargoya verilmemiş siparişini <Mail /> adresine yazarak iptal edebilirsin. Ödeme yaptıysan bedel, ödeme yöntemine uygun şekilde iade edilir. Kargoya verilmiş siparişlerde cayma ve iade koşulları geçerlidir.
          </p>

          <h2>7. Cayma bildirim formu</h2>
          <p>(Sözleşmeden cayma hakkını kullanmak istediğinde bu formu doldurup <Mail /> adresine göndermen yeterlidir.)</p>
          <ul>
            <li>Kime: {s.name}{s.address ? `, ${s.address}` : ''}</li>
            <li>Aşağıdaki mal/hizmetin satışına ilişkin sözleşmeden cayma hakkımı kullandığımı beyan ederim.</li>
            <li>Sipariş numarası ve tarihi:</li>
            <li>Sipariş edilen ürün(ler):</li>
            <li>Alıcının adı soyadı:</li>
            <li>Alıcının adresi:</li>
            <li>İade bedelinin iadesini istediğim hesap/ödeme yöntemi:</li>
            <li>Tarih ve imza (kâğıt ortamında iletilecekse):</li>
          </ul>

          <h2>8. Başvuru ve uyuşmazlık</h2>
          <p>
            Şikâyetlerin için önce bizimle <Mail /> üzerinden iletişime geçebilirsin. Çözüme ulaşılamazsa, Ticaret Bakanlığı’nca her yıl ilan edilen parasal sınırlar dahilinde il/ilçe Tüketici Hakem Heyetlerine, bu
            sınırların üzerindeki uyuşmazlıklarda Tüketici Mahkemelerine başvurabilirsin.
          </p>
          <p className="small">Son güncelleme: {UPDATED}</p>
        </>
      ),
    },

    /* ───────────────────── MESAFELİ SATIŞ SÖZLEŞMESİ ───────────────────── */
    {
      slug: 'mesafeli-satis-sozlesmesi',
      title: 'Ön bilgilendirme formu ve mesafeli satış sözleşmesi',
      lead: 'Sipariş vermeden önce bilmen gereken koşullar. Siparişi tamamladığında bu metni okuduğunu ve onayladığını kabul etmiş olursun.',
      body: () => (
        <>
          <h2>Madde 1 – Taraflar</h2>
          <h3>1.1. Satıcı</h3>
          <Seller s={s} mail={mail} />
          <h3>1.2. Alıcı</h3>
          <p>Siteye üye olarak ya da üye olmadan, sipariş formunda ad soyad, e-posta, telefon ve teslimat adresi bilgilerini vererek sipariş veren gerçek veya tüzel kişidir (“Alıcı”). Sipariş formundaki bilgiler sözleşmenin ayrılmaz parçasıdır.</p>

          <h2>Madde 2 – Konu ve kapsam</h2>
          <p>
            Bu sözleşme, Alıcı’nın Satıcı’ya ait internet sitesi üzerinden elektronik ortamda sipariş verdiği, sipariş özetinde nitelikleri ve satış fiyatı belirtilen ürünlerin satışı ve teslimi ile ilgili olarak 6502 sayılı
            Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca tarafların hak ve yükümlülüklerini düzenler. Alıcı, sözleşmeyi onaylamadan önce ön bilgilendirme yükümlülüklerinin
            yerine getirildiğini kabul eder.
          </p>

          <h2>Madde 3 – Sözleşme konusu ürün ve fiyat bilgisi</h2>
          <p>
            Ürünün adı, türü, rengi, bedeni, adedi, vergiler dahil toplam satış fiyatı ile varsa teslimat/kargo bedeli ve kampanya indirimi sipariş özetinde ve sipariş onay e-postasında gösterilir. Fiyatlar sipariş anında
            geçerli olan fiyatlardır; sipariş verildikten sonra yapılan fiyat değişiklikleri verilmiş siparişi etkilemez. Satıcı, açıkça hatalı fiyat ve stok bilgisinden kaynaklanan siparişleri iptal etme hakkını saklı tutar;
            bu durumda Alıcı’ya derhal bilgi verilir ve ödeme yapıldıysa tamamı iade edilir.
          </p>
          <p>Ürünlerin temel nitelikleri ürün sayfasında yer alır. Ürün görsellerindeki renk tonları, ekran ayarlarına bağlı olarak küçük farklılıklar gösterebilir.</p>

          <h2>Madde 4 – Ödeme ve ödeme planı</h2>
          <p>
            Alıcı, sipariş sırasında sunulan ödeme yöntemlerinden birini seçer: havale/EFT, kapıda ödeme ve (etkinleştirildiğinde) kredi/banka kartı. Kartla ödemelerde kart bilgileri Satıcı tarafından görülmez ve saklanmaz; ödeme,
            lisanslı ödeme kuruluşunun güvenli altyapısı üzerinden gerçekleşir. Havale/EFT ile ödemede sipariş, ödemenin Satıcı’nın hesabına geçmesinden sonra hazırlanır; sipariş kodunu açıklamaya yazmak gerekir. Kapıda ödemede
            bedel, teslimat sırasında kargo görevlisine ödenir; kargo firmasının uyguladığı ek hizmet bedeli varsa sipariş özetinde gösterilir.
          </p>

          <h2>Madde 5 – Teslimat</h2>
          <p>
            Ürünler, Alıcı’nın bildirdiği adrese, anlaşmalı kargo firması aracılığıyla teslim edilir. Teslimat süreleri “Kargo, teslimat ve iade” sayfasında belirtilmiştir; her durumda süre, sipariş tarihinden itibaren 30 günü
            geçemez. Satıcı bu süre içinde teslimat yapamazsa Alıcı sözleşmeden cayabilir. Mücbir sebepler (doğal afet, salgın, grev, kargo operasyonlarındaki olağanüstü durumlar vb.) nedeniyle oluşan gecikmeler Alıcı’ya
            bildirilir. Teslimatın, teslim anında Alıcı’nın veya adreste bulunan kişinin imzasıyla gerçekleştiği kabul edilir. Alıcı, paketi teslim alırken ambalaj bütünlüğünü kontrol etmeli, hasar varsa tutanak tutturmalıdır.
          </p>

          <h2>Madde 6 – Cayma hakkı</h2>
          <p>
            Alıcı, ürünün kendisine veya gösterdiği adresteki kişiye tesliminden itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Cayma bildirimi{' '}
            <Mail /> adresine yazılı olarak yapılır; “Kargo, teslimat ve iade” sayfasındaki cayma formu kullanılabilir. Bildirimden itibaren 10 gün içinde ürün Satıcı’ya geri gönderilir. Satıcı, cayma bildiriminin kendisine
            ulaşmasından itibaren 14 gün içinde ürün bedelini ve (Alıcı’nın seçtiği standart dışı bir teslimat yöntemi sebebiyle doğan ek masraflar hariç) teslimat masraflarını, Alıcı’nın ödeme yaptığı yöntemle iade eder. Geri
            gönderim masrafı Alıcı’ya aittir.
          </p>
          <p>
            Yönetmelik m. 15’te sayılan hallerde (kişiye özel hazırlanan ürünler, ambalajı açılmış hijyen ürünleri, çabuk bozulan ürünler, teslimden sonra başka ürünlerle karışan ürünler vb.) cayma hakkı kullanılamaz.
            Cayma süresi içinde ürünün kullanılmış, hasar görmüş veya yeniden satılamaz hale gelmiş olması hâlinde, Alıcı bu durumdan doğan değer kaybından sorumludur.
          </p>

          <h2>Madde 7 – Ayıplı ürün</h2>
          <p>
            Teslim edilen ürün ayıplı ise Alıcı, 6502 sayılı Kanun’un 11. maddesi uyarınca; ürünü kabulden itibaren 30 gün içinde ayıpsız misli ile değiştirilmesini, bedel indirimini, bedel iadesiyle ürünün iadesini veya
            ücretsiz onarımı isteyebilir. Ayıp, teslimden itibaren 2 yıl içinde ortaya çıkarsa Satıcı sorumludur; ilk 6 ay içinde ortaya çıkan ayıbın teslim anında mevcut olduğu kabul edilir.
          </p>

          <h2>Madde 8 – Satıcı’nın yükümlülükleri</h2>
          <p>Satıcı; ürünü sipariş özetindeki niteliklere uygun, ayıpsız ve sözleşmede belirtilen sürede teslim etmekle, Alıcı’ya ön bilgilendirme yapmakla ve kişisel verileri KVKK Aydınlatma Metni’ne uygun işlemekle yükümlüdür.</p>

          <h2>Madde 9 – Alıcı’nın yükümlülükleri</h2>
          <p>Alıcı; sipariş bilgilerinin doğruluğunu sağlamak, ödeme yükümlülüğünü yerine getirmek, ürünü teslim aldığında kontrol etmek ve iade halinde ürünü özenle ambalajlayıp geri göndermekle yükümlüdür.</p>

          <h2>Madde 10 – Kampanya, kupon ve hediye çeki</h2>
          <p>
            Kupon ve hediye çekleri yalnızca belirtilen koşullar (asgari sepet tutarı, geçerlilik tarihi, kullanım adedi) dahilinde kullanılabilir, nakde çevrilemez ve devredilemez. İade halinde, siparişte kullanılan indirim
            tutarı bedel iadesinden düşülerek hesaplanır; iade edilen siparişe bağlı olarak kazanılmış puan geri alınabilir.
          </p>

          <h2>Madde 11 – Mücbir sebep</h2>
          <p>Tarafların kontrolü dışında gelişen, önceden öngörülemeyen ve kaçınılamayan olaylar (doğal afet, savaş, salgın, resmî makam kararları, altyapı ve kargo operasyonlarını durduran olaylar vb.) mücbir sebep sayılır; bu hallerde taraflar sorumlu tutulamaz.</p>

          <h2>Madde 12 – Uyuşmazlıkların çözümü</h2>
          <p>
            Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı’nca her yıl ilan edilen parasal sınırlar dahilinde Alıcı’nın yerleşim yerindeki veya sözleşmenin yapıldığı yerdeki Tüketici Hakem Heyetleri, bu sınırların
            üzerindeki uyuşmazlıklarda Tüketici Mahkemeleri yetkilidir.
          </p>

          <h2>Madde 13 – Kişisel veriler</h2>
          <p>Sipariş kapsamında paylaşılan kişisel veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu’na uygun olarak <a href="/kvkk">KVKK Aydınlatma Metni</a>’nde açıklandığı şekilde işlenir.</p>

          <h2>Madde 14 – Yürürlük</h2>
          <p>
            Alıcı, siparişi onaylamadan önce bu ön bilgilendirme formunu ve sözleşme maddelerini okuduğunu, anladığını ve elektronik ortamda onayladığını kabul eder. Sözleşme, siparişin onaylanmasıyla kurulur ve Alıcı’nın
            e-postasına gönderilen sipariş onayıyla birlikte yürürlüğe girer. Sözleşmenin bir örneği, sipariş onay e-postasında ve bu sayfada erişilebilir durumdadır; Satıcı sözleşmenin kayıtlarını mevzuatın öngördüğü süre boyunca saklar.
          </p>
          <p className="small">Son güncelleme: {UPDATED}</p>
        </>
      ),
    },

    /* ───────────────────────── KVKK AYDINLATMA ───────────────────────── */
    {
      slug: 'kvkk',
      title: 'KVKK aydınlatma metni',
      lead: '6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi uyarınca, kişisel verilerinin kim tarafından, hangi amaçla ve nasıl işlendiği.',
      body: () => (
        <>
          <h2>1. Veri sorumlusu</h2>
          <Seller s={s} mail={mail} />
          <p>Bu metinde “biz”, yukarıda bilgileri verilen veri sorumlusunu ifade eder.</p>

          <h2>2. İşlediğimiz kişisel veriler</h2>
          <table>
            <tbody>
              <tr>
                <th>Veri kategorisi</th>
                <td>Örnekler</td>
              </tr>
              <tr>
                <th>Kimlik</th>
                <td>Ad, soyad</td>
              </tr>
              <tr>
                <th>İletişim</th>
                <td>E-posta adresi, telefon numarası, teslimat ve fatura adresi</td>
              </tr>
              <tr>
                <th>Müşteri işlemi</th>
                <td>Sipariş içeriği ve tutarı, ödeme yöntemi, sipariş ve iade/değişim durumu, kargo takip bilgisi, kupon ve puan hareketleri, destek yazışmaları</td>
              </tr>
              <tr>
                <th>İşlem güvenliği</th>
                <td>IP adresi, cihaz ve tarayıcı bilgisi, oturum ve günlük (log) kayıtları, şifrelenmiş parola</td>
              </tr>
              <tr>
                <th>Pazarlama</th>
                <td>Bülten ve ticari ileti tercihi, çerez ve izleme verileri (yalnızca onay verildiyse)</td>
              </tr>
              <tr>
                <th>Finans</th>
                <td>Ödeme sonucu ve sipariş tutarı. Kart bilgileri bize ulaşmaz, ödeme kuruluşunda işlenir.</td>
              </tr>
            </tbody>
          </table>

          <h2>3. İşleme amaçları ve hukuki sebepler</h2>
          <table>
            <tbody>
              <tr>
                <th>Amaç</th>
                <td>Hukuki sebep (KVKK m. 5)</td>
              </tr>
              <tr>
                <th>Siparişi almak, hazırlamak, teslim etmek, ödemeyi tahsil etmek ve siparişle ilgili iletişim kurmak</th>
                <td>Sözleşmenin kurulması ve ifası için gerekli olması (m. 5/2-c)</td>
              </tr>
              <tr>
                <th>Üyelik hesabını oluşturmak ve yönetmek, hesap güvenliğini sağlamak</th>
                <td>Sözleşmenin ifası; meşru menfaat (m. 5/2-f)</td>
              </tr>
              <tr>
                <th>İade, cayma, ayıplı ürün ve şikâyet süreçlerini yürütmek; destek taleplerini yanıtlamak</th>
                <td>Hukuki yükümlülüğün yerine getirilmesi (m. 5/2-ç); sözleşmenin ifası</td>
              </tr>
              <tr>
                <th>Fatura, muhasebe, vergi ve diğer yasal kayıt ve saklama yükümlülükleri</th>
                <td>Kanunlarda açıkça öngörülmesi; hukuki yükümlülük (m. 5/2-a, ç)</td>
              </tr>
              <tr>
                <th>Dolandırıcılık ve kötüye kullanımı önlemek, site ve bilgi güvenliğini sağlamak, hak ve alacaklarımızı korumak</th>
                <td>Meşru menfaat; bir hakkın tesisi, kullanılması veya korunması (m. 5/2-e, f)</td>
              </tr>
              <tr>
                <th>Bülten, kampanya ve ticari elektronik ileti göndermek</th>
                <td>Açık rıza (m. 5/1) ve 6563 sayılı Kanun kapsamındaki onay</td>
              </tr>
              <tr>
                <th>Siteyi geliştirmek, analiz ve reklam ölçümü yapmak (çerezler)</th>
                <td>Açık rıza; yalnızca çerez tercihinde onay verildiyse</td>
              </tr>
              <tr>
                <th>Ürün yorumlarını yayımlamak ve doğrulamak</th>
                <td>Açık rıza / sözleşmenin ifası; yorumunu yazdığında paylaştığın ad görünür</td>
              </tr>
            </tbody>
          </table>

          <h2>4. Kişisel verilerin aktarılması</h2>
          <p>Kişisel verilerin, yukarıdaki amaçlarla sınırlı olarak ve KVKK’nın 8. ve 9. maddelerine uygun şekilde aşağıdaki alıcı gruplarına aktarılabilir:</p>
          <ul>
            <li>
              <strong>Kargo ve lojistik:</strong> siparişi teslim eden kargo firması (UPS Kargo); ad soyad, telefon, teslimat adresi ve sipariş bilgisi.
            </li>
            <li>
              <strong>Ödeme kuruluşları ve bankalar:</strong> kartla ödemede lisanslı ödeme kuruluşu; ödemenin gerçekleştirilmesi için gerekli veriler.
            </li>
            <li>
              <strong>Altyapı ve hizmet sağlayıcılar:</strong> sitenin barındırılması, veritabanı ve üyelik hizmeti, e-posta ve SMS gönderimi, yedekleme ve güvenlik hizmeti aldığımız şirketler (veri işleyen sıfatıyla, talimatlarımız doğrultusunda).
            </li>
            <li>
              <strong>Mali müşavir, avukat, denetçi:</strong> muhasebe ve hukuki süreçlerin yürütülmesi için.
            </li>
            <li>
              <strong>Yetkili kurum ve kuruluşlar:</strong> mevzuattan kaynaklanan talepler doğrultusunda mahkemeler, savcılıklar, vergi ve tüketici otoriteleri.
            </li>
          </ul>
          <p>
            Altyapı hizmeti sağlayıcılarımızın bir kısmı yurt dışında bulunmaktadır. Bu durumda aktarım, KVKK m. 9’da öngörülen şartlara (yeterlilik kararı, standart sözleşme, taahhütname, bağlayıcı şirket kuralları veya
            kanunda sayılan diğer haller) uygun olarak yapılır. Pazarlama amaçlı verilerini üçüncü kişilere satmayız.
          </p>

          <h2>5. Toplama yöntemi</h2>
          <p>Verilerin; internet sitemizdeki üyelik, sipariş, ödeme, yorum, bülten ve iletişim formları ile çerezler ve benzeri teknolojiler aracılığıyla otomatik veya kısmen otomatik yollarla elektronik ortamda toplanır.</p>

          <h2>6. Saklama süresi</h2>
          <p>
            Verilerin, işlendikleri amaç için gerekli süre boyunca ve ilgili mevzuatta öngörülen saklama sürelerine (örn. Vergi Usul Kanunu ve Türk Ticaret Kanunu kapsamında fatura ve muhasebe kayıtları için 5–10 yıl;
            tüketici mevzuatı kapsamındaki zamanaşımı süreleri) uygun olarak saklanır. Süre sona erdiğinde verilerin silinir, yok edilir veya anonim hale getirilir. Üyeliğini silmeni istersen, yasal saklama zorunluluğu
            bulunmayan veriler silinir. Açık rızaya dayalı ticari ileti izinleri, geri alınana kadar geçerlidir.
          </p>

          <h2>7. Haklarının kullanımı</h2>
          <p>KVKK’nın 11. maddesi uyarınca veri sorumlusuna başvurarak;</p>
          <ul>
            <li>kişisel verilerinin işlenip işlenmediğini öğrenme,</li>
            <li>işlenmişse buna ilişkin bilgi talep etme,</li>
            <li>işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
            <li>eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
            <li>kanunda öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme ve bunun aktarılan üçüncü kişilere bildirilmesini isteme,</li>
            <li>işlenen verilerin otomatik sistemlerle analiz edilmesi suretiyle aleyhine bir sonucun ortaya çıkmasına itiraz etme,</li>
            <li>kanuna aykırı işleme nedeniyle zarara uğraman halinde zararın giderilmesini talep etme</li>
          </ul>
          <p>
            haklarına sahipsin. Başvurularını, kimliğini tespit edecek bilgilerle birlikte <Mail /> adresine yazılı olarak ya da bizzat iletebilirsin. Başvurun, niteliğine göre en geç 30 gün içinde ücretsiz olarak
            sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulu’nca belirlenen tarife uygulanabilir. Başvurunun reddedilmesi, cevabın yetersiz bulunması veya süresinde cevap
            verilmemesi halinde, cevabı öğrendiğin tarihten itibaren 30 gün ve her halde başvuru tarihinden itibaren 60 gün içinde Kişisel Verileri Koruma Kurulu’na şikâyette bulunabilirsin.
          </p>
          <p className="small">Son güncelleme: {UPDATED}</p>
        </>
      ),
    },

    /* ───────────────────────── GİZLİLİK ───────────────────────── */
    {
      slug: 'gizlilik-politikasi',
      title: 'Gizlilik politikası',
      lead: 'Sitede hangi bilgilerin neden tutulduğu, nasıl korunduğu ve tercihlerini nasıl yönetebileceğin.',
      body: () => (
        <>
          <h2>1. Kapsam</h2>
          <p>
            Bu politika, Demleme internet sitesini ziyaret ettiğinde, üye olduğunda, sipariş verdiğinde, bültene kaydolduğunda veya bizimle iletişime geçtiğinde hangi bilgileri topladığımızı ve nasıl kullandığımızı anlatır.
            Kişisel verilerin işlenmesine ilişkin yasal bilgilendirme <a href="/kvkk">KVKK Aydınlatma Metni</a>’ndedir; çerezler için <a href="/cerez-politikasi">Çerez Politikası</a>’na bakabilirsin.
          </p>

          <h2>2. Topladığımız bilgiler</h2>
          <ul>
            <li>
              <strong>Verdiğin bilgiler:</strong> üyelik ve sipariş sırasında ad soyad, e-posta, telefon, adres; yorum yazarken adın ve yorumun; bültene kayıt olurken e-posta adresin.
            </li>
            <li>
              <strong>Sipariş ve işlem bilgileri:</strong> ürünler, tutarlar, ödeme yöntemi ve durumu, kargo bilgisi, iade ve destek yazışmaları.
            </li>
            <li>
              <strong>Teknik bilgiler:</strong> IP adresi, cihaz ve tarayıcı türü, ziyaret edilen sayfalar, sitenin güvenliği ve hatalarının giderilmesi için tutulan günlükler.
            </li>
          </ul>

          <h2>3. Bilgileri nasıl kullanıyoruz?</h2>
          <ul>
            <li>Siparişini hazırlamak, teslim etmek ve seninle sipariş hakkında iletişim kurmak.</li>
            <li>Hesabını yönetmek, puan ve hediye çeki gibi üyelik avantajlarını sağlamak.</li>
            <li>İade, değişim ve müşteri destek taleplerini karşılamak.</li>
            <li>Yasal ve mali yükümlülüklerimizi yerine getirmek; sahtekârlığı ve kötüye kullanımı önlemek.</li>
            <li>İzin verdiysen bülten ve kampanya iletileri göndermek. İzni istediğin zaman geri alabilirsin; her e-postanın altındaki bağlantıdan veya <Mail /> adresine yazarak ayrılabilirsin.</li>
          </ul>

          <h2>4. Üçüncü taraf hizmetler</h2>
          <p>
            Sitenin çalışması için barındırma, veritabanı ve üyelik, e-posta gönderimi, (etkinleştirildiğinde) SMS ve ödeme altyapısı, kargo ve yazı tipi sağlayıcıları gibi hizmet sağlayıcılarla çalışırız. Bu sağlayıcılar
            verileri yalnızca bizim adımıza ve belirtilen amaçla işler. Yazı tipleri Google Fonts ve Adobe Fonts’tan yüklenir; bu hizmetler sayfayı açtığında IP adresini görebilir. Çerez onayı verdiysen analiz ve reklam
            ölçüm araçları (Google Analytics, Meta Pixel vb.) da kullanılabilir; ayrıntı için Çerez Politikası’na bak. Sitede bağlantı verilen üçüncü taraf sitelerin gizlilik uygulamalarından sorumlu değiliz.
          </p>

          <h2>5. Bilgi güvenliği</h2>
          <p>
            Verilerin şifreli (HTTPS) bağlantı üzerinden iletilir. Parolan geri döndürülemez biçimde şifrelenerek saklanır. Veri tabanı erişimi yetki ve satır düzeyinde güvenlik kurallarıyla sınırlandırılmıştır; yönetim
            işlemleri yetkilendirilmiş personelle sınırlıdır. Sipariş ve adres bilgilerine yalnızca hesabınla ya da sipariş numarası ve e-postanla ulaşılabilir. Hiçbir internet iletiminin tamamen risksiz olmadığını hatırlatırız;
            bir güvenlik ihlali olursa, yasal yükümlülüklerimiz çerçevesinde ilgili kişileri ve Kurulu bilgilendiririz.
          </p>

          <h2>6. Saklama ve silme</h2>
          <p>
            Bilgilerini, işleme amacı için gerekli olduğu ve mevzuatın öngördüğü süre boyunca saklarız. Hesabını ve yasal olarak saklamamız gerekmeyen verilerini silmemizi <Mail /> adresinden talep edebilirsin.
          </p>

          <h2>7. Çocukların gizliliği</h2>
          <p>Sitemiz 18 yaşın altındaki kişilere yönelik değildir. 18 yaşından küçüklerin kişisel verilerini bilerek toplamayız; böyle bir durum fark edersek ilgili verileri sileriz.</p>

          <h2>8. Haklarının kullanımı ve iletişim</h2>
          <p>KVKK kapsamındaki haklarını ve başvuru yollarını <a href="/kvkk">Aydınlatma Metni</a>’nde bulabilirsin. Soru ve talepler için: <Mail /></p>

          <h2>9. Değişiklikler</h2>
          <p>Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikleri sitede ya da e-posta ile duyururuz; güncel metin her zaman bu sayfadadır.</p>
          <p className="small">Son güncelleme: {UPDATED}</p>
        </>
      ),
    },

    /* ───────────────────────── ÇEREZ POLİTİKASI ───────────────────────── */
    {
      slug: 'cerez-politikasi',
      title: 'Çerez politikası',
      lead: 'Sitede hangi çerezlerin ve benzeri teknolojilerin kullanıldığı ve tercihlerini nasıl değiştirebileceğin.',
      body: () => (
        <>
          <h2>1. Çerez nedir?</h2>
          <p>Çerezler, bir siteyi ziyaret ettiğinde tarayıcına veya cihazına kaydedilen küçük metin dosyalarıdır. Benzer işlevi gören yerel depolama gibi teknolojiler de bu politikanın kapsamındadır.</p>

          <h2>2. Kullandığımız çerez türleri</h2>
          <table>
            <tbody>
              <tr>
                <th>Tür</th>
                <td>Amaç ve örnekler</td>
              </tr>
              <tr>
                <th>Zorunlu</th>
                <td>
                  Sitenin çalışması için gerekli olanlardır: oturum ve giriş bilgisi, sepetin tarayıcında tutulması, güvenlik ve çerez tercihinin hatırlanması. Bunlar için onay aranmaz ve kapatılamaz; kapatırsan sepet ve giriş
                  çalışmaz.
                </td>
              </tr>
              <tr>
                <th>Analiz</th>
                <td>Sitenin nasıl kullanıldığını anlamamıza yardım eder (ör. Google Analytics, Microsoft Clarity, Hotjar): hangi sayfaların ziyaret edildiği, sitenin hızı, hatalar. Yalnızca onay verirsen çalışır.</td>
              </tr>
              <tr>
                <th>Pazarlama</th>
                <td>Reklamlarımızın işe yarayıp yaramadığını ölçer ve ilgini çekebilecek içerikleri göstermeye yardım eder (ör. Meta Pixel, TikTok Pixel, Google Ads). Yalnızca onay verirsen çalışır.</td>
              </tr>
            </tbody>
          </table>
          <p>Analiz ve pazarlama araçlarından hangilerinin etkin olduğu zaman içinde değişebilir; yalnızca etkinleştirilmiş olanlar ve yalnızca onayınla çalışır.</p>

          <h2>3. Tercihlerini yönetme</h2>
          <ul>
            <li>Siteye ilk girişte çıkan çerez penceresinden analiz ve pazarlama çerezlerini kabul edebilir ya da reddedebilirsin; tercihini istediğin zaman sayfanın altındaki “Çerez ayarları” bağlantısından değiştirebilirsin.</li>
            <li>Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsin; ancak zorunlu çerezleri engellersen sepet ve üyelik gibi özellikler çalışmayabilir.</li>
            <li>Üçüncü taraf araçlardan çıkmak için ilgili sağlayıcının sunduğu devre dışı bırakma seçeneklerini de kullanabilirsin.</li>
          </ul>

          <h2>4. Saklama süresi</h2>
          <p>Oturum çerezleri tarayıcını kapattığında silinir. Kalıcı çerezler ve yerel depolama kayıtları, işlevlerine göre birkaç günden birkaç aya kadar saklanır; çerez tercihin yaklaşık bir yıl hatırlanır.</p>

          <h2>5. Hukuki dayanak ve haklarının kullanımı</h2>
          <p>
            Zorunlu olmayan çerezler açık rızana dayanır ve rızanı geri alman her zaman mümkündür. Çerezlerle toplanan kişisel verilere ilişkin haklarını <a href="/kvkk">KVKK Aydınlatma Metni</a>’nde bulabilir, sorularını{' '}
            <Mail /> adresine iletebilirsin.
          </p>
          <p className="small">Son güncelleme: {UPDATED}</p>
        </>
      ),
    },

    /* ───────────────────────── KULLANIM ŞARTLARI ───────────────────────── */
    {
      slug: 'kullanim-sartlari',
      title: 'Kullanım şartları',
      lead: 'Siteyi kullanırken ve alışveriş yaparken geçerli olan kurallar.',
      body: () => (
        <>
          <h2>1. Kabul ve kapsam</h2>
          <p>
            Bu siteyi ziyaret ederek, üye olarak veya sipariş vererek aşağıdaki şartları kabul etmiş sayılırsın. Şartları zaman zaman güncelleyebiliriz; güncel hâli bu sayfada yayımlanır ve yayımlandığı tarihten itibaren
            geçerlidir. Satın alma işlemleri ayrıca <a href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a>’ne tabidir.
          </p>

          <h2>2. Üyelik ve hesap güvenliği</h2>
          <ul>
            <li>Üye olmak için 18 yaşını doldurmuş olmalı ve doğru, güncel bilgi vermelisin.</li>
            <li>Hesabındaki bilgilerin doğruluğundan ve parolanın gizliliğinden sen sorumlusun. Hesabında yetkisiz bir kullanım fark edersen bize derhal bildir.</li>
            <li>Hesabını istediğin zaman kapatılmasını isteyebilirsin. Şartlara aykırı, sahte veya kötüye kullanım amaçlı hesapları askıya alma ya da kapatma hakkımız saklıdır.</li>
          </ul>

          <h2>3. Siparişler ve fiyatlar</h2>
          <p>
            Sipariş verebilmek için yasal olarak sözleşme yapma ehliyetine sahip olmalısın. Siteye girilen siparişler, sipariş onay e-postamızla kesinleşir. Stok yetersizliği, fiyat ya da açıkça hatalı bilgi nedeniyle bir siparişi
            gerçekleştiremezsek sana bildirir ve ödeme yaptıysan tamamını iade ederiz. Fiyatlar Türk lirasıdır ve KDV dahildir; kargo bedeli ayrıca belirtilir.
          </p>

          <h2>4. Kampanya, kupon ve hediye çeki</h2>
          <ul>
            <li>Kampanya ve kuponlar belirtilen tarihler, asgari sepet tutarı ve kullanım adediyle sınırlıdır; aksi yazılmadıkça diğer kampanyalarla birleştirilemez.</li>
            <li>Kuponlar nakde çevrilemez ve devredilemez. Hatalı veya kötüye kullanım şüphesi taşıyan kullanımlarda kuponu geçersiz kılma hakkımız saklıdır.</li>
          </ul>

          <h2>5. Puan sistemi</h2>
          <ul>
            <li>Puan; kampanya koşullarında belirtilen alışveriş ve onaylı ürün yorumu gibi işlemlerle kazanılır, üyelik hesabında tutulur. Kazanım oranları ve ödül seçenekleri sitede ve hesabında yayımlanır; bunları duyurarak değiştirebiliriz. Değişiklik, o ana kadar kazanılmış puanı azaltmaz.</li>
            <li>Puan nakde çevrilemez, devredilemez ve satılamaz. Puan, hesabında gösterilen koşullarla tek kullanımlık, süreli hediye çeklerine dönüştürülebilir; çeklerin geçerlilik süresi ve asgari sepet tutarı çekin üzerinde belirtilir.</li>
            <li>İptal ya da iade edilen siparişin, silinen veya onayı kaldırılan yorumun puanı hesabından geri alınır; bakiye bu sebeple negatife düşebilir ve sonraki kazanımlardan mahsup edilir.</li>
            <li>Hile, çoklu hesap, sahte yorum veya sistemi kötüye kullanma tespit edilirse puanları iptal etme ve hesabı kapatma hakkımız saklıdır.</li>
          </ul>

          <h2>6. Ürün yorumları ve kullanıcı içeriği</h2>
          <p>
            Yorum yazarken yasalara, genel ahlaka ve üçüncü kişilerin haklarına uygun davranmalısın. Hakaret, nefret söylemi, reklam, kişisel veri içeren veya sahte yorumları yayımlamama ya da kaldırma hakkımız saklıdır.
            Yorumunu yayımlamamıza, ürün ve pazarlama sayfalarında adınla birlikte göstermemize izin vermiş olursun; bu izni istediğin zaman <Mail /> adresine yazarak geri alabilirsin.
          </p>

          <h2>7. Fikri mülkiyet</h2>
          <p>
            Sitedeki çizimler, karakterler, fotoğraflar, ses ve video kayıtları, yazılar, logo, marka ve tasarımlar ile yazılım dahil tüm içerikler Demleme’ye veya lisans verenlerine aittir ve fikri mülkiyet mevzuatı ile
            korunur. Önceden yazılı izin almadan kopyalanamaz, çoğaltılamaz, dağıtılamaz, değiştirilemez veya ticari amaçla kullanılamaz. Podcast içerikleri ve konukların hakları ilgili sahiplerine aittir.
          </p>

          <h2>8. Yasaklı kullanımlar</h2>
          <ul>
            <li>Siteye yetkisiz erişim, güvenlik açığı arama, sistemleri aşırı yükleme veya zararlı yazılım yayma.</li>
            <li>Otomatik araçlarla (bot, kazıma vb.) izinsiz veri toplama.</li>
            <li>Başkasının hesabını veya kimliğini kullanma; yanıltıcı sipariş verme.</li>
            <li>Sitenin ya da içeriklerin hukuka aykırı amaçlarla kullanılması.</li>
          </ul>

          <h2>9. Sorumluluğun sınırı</h2>
          <p>
            Siteyi kesintisiz ve hatasız sunmaya çalışırız; ancak bakım, teknik arıza veya üçüncü taraf hizmetlerdeki aksaklıklar nedeniyle yaşanabilecek kesintilerden doğan dolaylı zararlardan, kanunun izin verdiği ölçüde
            sorumlu değiliz. Tüketici mevzuatından doğan haklarına ve kasıt ya da ağır kusurumuzdan doğan sorumluluğumuza dokunulmaz. Sitede verilen bilgiler genel bilgilendirme amaçlıdır.
          </p>

          <h2>10. Bağlantılı siteler</h2>
          <p>Sitede başka sitelere bağlantılar bulunabilir. Bu sitelerin içeriğinden ve gizlilik uygulamalarından sorumlu değiliz.</p>

          <h2>11. Uygulanacak hukuk ve uyuşmazlık</h2>
          <p>Bu şartlara Türk hukuku uygulanır. Tüketici uyuşmazlıklarında yetkili merciler Mesafeli Satış Sözleşmesi’nde belirtilmiştir; diğer uyuşmazlıklarda Türkiye’deki mahkemeler ve icra daireleri yetkilidir.</p>

          <h2>12. İletişim</h2>
          <p>
            Soru ve bildirimler için: <Mail />
          </p>
          <p className="small">Son güncelleme: {UPDATED}</p>
        </>
      ),
    },

    /* ───────────────────────── AÇIK RIZA / TİCARİ İLETİ ───────────────────────── */
    {
      slug: 'acik-riza-ticari-ileti',
      title: 'Ticari elektronik ileti ve açık rıza metni',
      lead: 'Bülten, kampanya ve duyuru iletileri almak için vereceğin iznin kapsamı.',
      body: () => (
        <>
          <h2>1. Kapsam</h2>
          <p>
            Bültene kaydolarak veya üyelik/sipariş sırasında ilgili kutuyu işaretleyerek; 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik
            kapsamında, e-posta adresine (ve ayrıca onay verdiysen telefon numarana SMS ile) {s.name} tarafından yeni bölüm duyuruları, konuk haberleri, yeni ürün ve stok bilgileri, kampanya ve indirim iletileri
            gönderilmesine onay vermiş olursun.
          </p>

          <h2>2. İletilerin sıklığı ve içeriği</h2>
          <p>E-posta bülteni en fazla haftada bir kez gönderilir. İletilerde göndericinin kimliği ve ret bağlantısı yer alır.</p>

          <h2>3. İzni geri alma (ret hakkı)</h2>
          <p>
            Onayını istediğin zaman, hiçbir gerekçe göstermeden ve ücretsiz olarak geri alabilirsin: her e-postanın altındaki ayrılma bağlantısını kullanabilir ya da <Mail /> adresine yazabilirsin. Talebin en geç 3 iş günü
            içinde yerine getirilir. İznini geri almak, sipariş onayı ve kargo bilgilendirmesi gibi hizmet iletilerinin gönderilmesine engel değildir.
          </p>

          <h2>4. Kişisel verilerin işlenmesi</h2>
          <p>
            Bu amaçla e-posta adresin, (varsa) telefon numaran, onay tarihi ve kaynağı ile ayrılma tercihin işlenir. Bu veriler, açık rızana dayanılarak ve onayın geçerli olduğu süre boyunca saklanır; ayrıntılar{' '}
            <a href="/kvkk">KVKK Aydınlatma Metni</a>’ndedir. Verilerin pazarlama amacıyla üçüncü kişilere satılmaz veya devredilmez.
          </p>

          <h2>5. Onay kaydı</h2>
          <p>Verdiğin onayın ispatı için kaydın tarihi ve kaynağı tutulur. Bu onay, aksini belirtmedikçe geri alınana kadar geçerlidir.</p>
          <p className="small">Son güncelleme: {UPDATED}</p>
        </>
      ),
    },
  ];
}

export const docSlugs = ['kargo-ve-iade', 'mesafeli-satis-sozlesmesi', 'kvkk', 'gizlilik-politikasi', 'cerez-politikasi', 'kullanim-sartlari', 'acik-riza-ticari-ileti'];
