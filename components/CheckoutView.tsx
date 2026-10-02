'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { tl, usePricedCart } from '@/lib/shop';
import { Alert, Field, emailOk, phoneOk } from './ui';

type Addr = { id: string; title: string; full_name: string; phone: string; city: string; district: string; address: string; zip: string | null };

export const LAST_ORDER_KEY = 'demleme-last-order';

export function CheckoutView() {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const { priced, error, loading } = usePricedCart(items, ready);
  const { user, loading: authLoading } = useAuth();

  const [v, setV] = useState({ email: '', full_name: '', phone: '', city: '', district: '', address: '', zip: '', title: 'Teslimat adresi' });
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<'havale' | 'kapida'>('havale');
  const [agree, setAgree] = useState(false);
  const [saveAddr, setSaveAddr] = useState(false);
  const [saved, setSaved] = useState<Addr[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  // Üyeysen e-posta, ad, telefon ve kayıtlı adresler hazır gelsin
  useEffect(() => {
    if (!user) return;
    let off = false;
    (async () => {
      const sb = supabase();
      const [{ data: prof }, { data: addrs }] = await Promise.all([
        sb.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
        sb.from('addresses').select('*').order('created_at', { ascending: false }),
      ]);
      if (off) return;
      setV((s) => ({ ...s, email: s.email || user.email || '', full_name: s.full_name || prof?.full_name || '', phone: s.phone || prof?.phone || '' }));
      setSaved((addrs ?? []) as Addr[]);
    })();
    return () => {
      off = true;
    };
  }, [user]);

  function pickAddress(id: string) {
    const a = saved.find((x) => x.id === id);
    if (!a) return;
    setV((s) => ({ ...s, title: a.title, full_name: a.full_name, phone: a.phone, city: a.city, district: a.district, address: a.address, zip: a.zip ?? '' }));
    setSaveAddr(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    const x: Record<string, string> = {};
    if (!emailOk(v.email)) x.email = 'Geçerli bir e-posta gir.';
    if (v.full_name.trim().length < 3) x.full_name = 'Adını ve soyadını yaz.';
    if (!phoneOk(v.phone)) x.phone = 'Geçerli bir telefon numarası gir.';
    if (!v.city.trim()) x.city = 'İl gerekli.';
    if (!v.district.trim()) x.district = 'İlçe gerekli.';
    if (v.address.trim().length < 10) x.address = 'Mahalle, cadde, bina ve daire numarasıyla açık adresi yaz.';
    if (!agree) x.agree = 'Devam etmek için sözleşmeyi onaylaman gerekiyor.';
    setErrs(x);
    if (Object.keys(x).length) {
      setFormErr('Formda eksik ya da hatalı alanlar var.');
      return;
    }
    if (!priced || priced.hasProblem || !items.length) {
      setFormErr('Sepetinde satın alınamayan ürünler var. Sepete dönüp kontrol et.');
      return;
    }

    setBusy(true);
    const { data, error: rpcErr } = await supabase().rpc('create_order', {
      p_items: items.map((i) => ({ slug: i.slug, color: i.color, size: i.size, qty: i.qty })),
      p_customer: { email: v.email, full_name: v.full_name, phone: v.phone, title: v.title, city: v.city, district: v.district, address: v.address, zip: v.zip },
      p_payment: payment,
      p_note: note,
    });
    if (rpcErr || !data) {
      setBusy(false);
      setFormErr(rpcErr?.code === '22023' ? rpcErr.message : 'Siparişin oluşturulamadı. Bağlantını kontrol edip tekrar dene; sorun sürerse bize yaz.');
      return;
    }

    if (user && saveAddr) {
      await supabase().from('addresses').insert({ user_id: user.id, title: v.title.trim() || 'Adresim', full_name: v.full_name.trim(), phone: v.phone.trim(), city: v.city.trim(), district: v.district.trim(), address: v.address.trim(), zip: v.zip.trim() || null });
    }
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(data));
    } catch {
      /* sipariş yine de oluştu; takip sayfasından bakılabilir */
    }
    setPlaced(true);
    clear();
    router.replace('/siparis-tamamlandi');
  }

  if (placed) return <p className="loading">Siparişin alındı, yönlendiriliyorsun…</p>;
  if (!ready) return <p className="loading">Yükleniyor…</p>;
  if (!items.length)
    return (
      <div className="empty">
        <h2>Sepetin boş</h2>
        <p>Ödeme yapabilmek için sepetinde ürün olmalı.</p>
        <a className="btn btn--solid" href="/#magaza">
          Alışverişe başla
        </a>
      </div>
    );
  if (loading || authLoading) return <p className="loading">Yükleniyor…</p>;
  if (error || !priced) return <Alert kind="err">{error ?? 'Sepet yüklenemedi.'}</Alert>;

  return (
    <form className="shop-grid" onSubmit={submit} noValidate>
      <div>
        {formErr && <Alert kind="err">{formErr}</Alert>}
        {priced.hasProblem && (
          <Alert kind="err">
            Sepetinde satın alınamayan ürünler var.{' '}
            <Link href="/sepet">Sepete dön</Link>
          </Alert>
        )}

        {!user && (
          <p className="notice">
            Üye misin?{' '}
            <Link className="link" href="/giris?next=/odeme">
              Giriş yap
            </Link>
            , bilgilerin hazır gelsin. Üye olmadan da sipariş verebilirsin.
          </p>
        )}

        <fieldset className="fieldset">
          <legend>İletişim ve teslimat</legend>
          {saved.length > 0 && (
            <div className="fld">
              <label htmlFor="saved">Kayıtlı adreslerim</label>
              <select id="saved" defaultValue="" onChange={(e) => pickAddress(e.target.value)}>
                <option value="">Adres seç…</option>
                {saved.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} · {a.district}, {a.city}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Field id="email" label="E-posta" type="email" autoComplete="email" value={v.email} onChange={set('email')} error={errs.email} required />
          <div className="row2">
            <Field id="full_name" label="Ad soyad" autoComplete="name" value={v.full_name} onChange={set('full_name')} error={errs.full_name} required />
            <Field id="phone" label="Telefon" type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} error={errs.phone} placeholder="05xx xxx xx xx" required />
          </div>
          <div className="row2">
            <Field id="city" label="İl" autoComplete="address-level1" value={v.city} onChange={set('city')} error={errs.city} required />
            <Field id="district" label="İlçe" autoComplete="address-level2" value={v.district} onChange={set('district')} error={errs.district} required />
          </div>
          <div className="fld">
            <label htmlFor="address">Açık adres</label>
            <textarea id="address" name="address" autoComplete="street-address" value={v.address} onChange={(e) => set('address')(e.target.value)} aria-invalid={errs.address ? true : undefined} required />
            {errs.address && <p className="fld-err">{errs.address}</p>}
          </div>
          <div className="row2">
            <Field id="zip" label="Posta kodu (isteğe bağlı)" autoComplete="postal-code" value={v.zip} onChange={set('zip')} inputMode="numeric" />
            <Field id="title" label="Adres başlığı" value={v.title} onChange={set('title')} hint="Örn. Ev, İş" />
          </div>
          {user && (
            <label className="check">
              <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} />
              <span>Bu adresi hesabıma kaydet.</span>
            </label>
          )}
          <div className="fld">
            <label htmlFor="note">Sipariş notu (isteğe bağlı)</label>
            <textarea id="note" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Ödeme yöntemi</legend>
          <div className="pay">
            <label className="pay-opt">
              <input type="radio" name="pay" checked={payment === 'havale'} onChange={() => setPayment('havale')} />
              <div>
                <b>Havale / EFT</b>
                <span>Siparişi verdikten sonra ödeme bilgilerini göreceksin. Ödemen onaylanınca siparişin hazırlanır.</span>
              </div>
            </label>
            <label className="pay-opt">
              <input type="radio" name="pay" checked={payment === 'kapida'} onChange={() => setPayment('kapida')} />
              <div>
                <b>Kapıda ödeme</b>
                <span>Ürünler sana ulaştığında kurye ya da kargo görevlisine ödersin.</span>
              </div>
            </label>
            <label className="pay-opt is-off" aria-disabled="true">
              <input type="radio" name="pay" disabled />
              <div>
                <b>Kredi / banka kartı</b>
                <span>Çok yakında.</span>
              </div>
            </label>
          </div>
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            <Link href="/mesafeli-satis-sozlesmesi" target="_blank">
              Ön bilgilendirme ve mesafeli satış sözleşmesini
            </Link>{' '}
            okudum, onaylıyorum. Kişisel verilerim{' '}
            <Link href="/kvkk" target="_blank">
              KVKK aydınlatma metni
            </Link>{' '}
            kapsamında işlenecek.
          </span>
        </label>
        {errs.agree && (
          <p className="fld-err" style={{ marginTop: -8, marginBottom: 16 }}>
            {errs.agree}
          </p>
        )}
      </div>

      <aside className="summary" aria-label="Sipariş özeti">
        <h2>Siparişin</h2>
        <ul className="sum-items">
          {priced.lines.map((l) => (
            <li key={l.key}>
              <span>
                {l.item.qty} × {l.item.name}
              </span>
              <span>{l.problem ? '—' : tl(l.total)}</span>
            </li>
          ))}
        </ul>
        <div className="sum-row muted">
          <span>Ara toplam</span>
          <span>{tl(priced.subtotal)}</span>
        </div>
        <div className="sum-row muted">
          <span>Kargo</span>
          <span>{priced.shipping === 0 ? 'Ücretsiz' : tl(priced.shipping)}</span>
        </div>
        {priced.remainingForFree > 0 && <p className="free-note">{tl(priced.remainingForFree)} daha ekle, kargo ücretsiz olsun.</p>}
        <div className="sum-row sum-total">
          <span>Toplam</span>
          <span>{tl(priced.total)}</span>
        </div>
        <button className="btn btn--red btn--block" type="submit" disabled={busy || priced.hasProblem} style={{ marginTop: 20 }}>
          {busy ? 'Siparişin oluşturuluyor…' : 'Siparişi tamamla'}
        </button>
        <p className="small" style={{ margin: '12px 0 0' }}>
          <Link href="/sepet" className="link">
            ← Sepete dön
          </Link>
        </p>
      </aside>
    </form>
  );
}
