'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authMessage, useAuth } from '@/lib/auth';
import { Alert, Field, phoneOk } from './ui';
import { Favorites } from './Favorites';
import { LoyaltyTab } from './Loyalty';
import { OrderBody, StatusBadge, dateTr, type OrderRow } from './OrderParts';

type Tab = 'orders' | 'favorites' | 'points' | 'profile' | 'addresses';
type Addr = { id: string; title: string; full_name: string; phone: string; city: string; district: string; address: string; zip: string | null };

export function AccountView() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('orders');
  const [profile, setProfile] = useState<{ full_name: string; phone: string | null } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/giris?next=/hesabim');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase()
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? { full_name: '', phone: '' }));
  }, [user]);

  async function logout() {
    await supabase().auth.signOut();
    router.replace('/');
  }

  if (loading || !user) return <p className="loading">Yükleniyor…</p>;
  const first = (profile?.full_name || '').trim().split(/\s+/)[0];

  return (
    <>
      <div className="acct-head">
        <div>
          <p className="eyebrow">Hesabım</p>
          <h1 className="page-title" style={{ margin: 0 }}>
            {first ? `Merhaba ${first}` : 'Merhaba'}
          </h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            {user.email}
          </p>
        </div>
        <button className="btn" onClick={logout}>
          Çıkış yap
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Hesap bölümleri">
        {(
          [
            ['orders', 'Siparişlerim'],
            ['favorites', 'Favorilerim'],
            ['points', 'Puanlarım'],
            ['profile', 'Bilgilerim'],
            ['addresses', 'Adreslerim'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <Orders />}
      {tab === 'favorites' && <Favorites />}
      {tab === 'points' && <LoyaltyTab />}
      {tab === 'profile' && (profile ? <Profile userId={user.id} profile={profile} onSaved={setProfile} /> : <p className="loading">Yükleniyor…</p>)}
      {tab === 'addresses' && <Addresses userId={user.id} />}
    </>
  );
}

function Orders() {
  const [orders, setOrders] = useState<(OrderRow & { id: string })[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase()
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr('Siparişlerin yüklenemedi. Sayfayı yenile.');
        else setOrders((data ?? []) as (OrderRow & { id: string })[]);
      });
  }, []);

  if (err) return <Alert kind="err">{err}</Alert>;
  if (!orders) return <p className="loading">Siparişlerin yükleniyor…</p>;
  if (!orders.length)
    return (
      <div className="empty">
        <h2>Henüz siparişin yok</h2>
        <p>İlk siparişini verdiğinde burada görünecek.</p>
        <a className="btn btn--solid" href="/#magaza">
          Mağazaya göz at
        </a>
      </div>
    );

  return (
    <div className="orders">
      {orders.map((o) => (
        <article className="order" key={o.id}>
          <div className="order-h">
            <span>
              <b>{o.order_no}</b> <span className="muted">· {dateTr(o.created_at)}</span>
            </span>
            <StatusBadge status={o.status} />
          </div>
          <div className="order-b">
            <OrderBody o={o} />
          </div>
        </article>
      ))}
    </div>
  );
}

function Profile({ userId, profile, onSaved }: { userId: string; profile: { full_name: string; phone: string | null } | null; onSaved: (p: { full_name: string; phone: string | null }) => void }) {
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const x: Record<string, string> = {};
    if (name.trim().length < 3) x.name = 'Adını ve soyadını yaz.';
    if (phone && !phoneOk(phone)) x.phone = 'Geçerli bir telefon numarası gir.';
    setErrs(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    const next = { full_name: name.trim(), phone: phone.trim() || null };
    const { error } = await supabase().from('profiles').update(next).eq('id', userId);
    setBusy(false);
    if (error) return setMsg({ kind: 'err', text: 'Bilgilerin kaydedilemedi. Tekrar dene.' });
    onSaved(next);
    setMsg({ kind: 'ok', text: 'Bilgilerin güncellendi.' });
  }

  return (
    <div style={{ display: 'grid', gap: 48, maxWidth: 480 }}>
      <form className="form" onSubmit={save} noValidate>
        <h2 className="section-h">Kişisel bilgiler</h2>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <Field id="full_name" label="Ad soyad" autoComplete="name" value={name} onChange={setName} error={errs.name} />
        <Field id="phone" label="Telefon" type="tel" autoComplete="tel" value={phone} onChange={setPhone} error={errs.phone} />
        <button className="btn btn--solid" type="submit" disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>
      <PasswordForm />
    </div>
  );
}

function PasswordForm() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg({ kind: 'err', text: 'Şifren en az 8 karakter olmalı.' });
    if (pw !== pw2) return setMsg({ kind: 'err', text: 'Şifreler aynı değil.' });
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ kind: 'err', text: authMessage(error) });
    setPw('');
    setPw2('');
    setMsg({ kind: 'ok', text: 'Şifren güncellendi.' });
  }

  return (
    <form className="form" onSubmit={save} noValidate>
      <h2 className="section-h">Şifre değiştir</h2>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Field id="new_password" label="Yeni şifre" type="password" autoComplete="new-password" value={pw} onChange={setPw} hint="En az 8 karakter." />
      <Field id="new_password2" label="Yeni şifre (tekrar)" type="password" autoComplete="new-password" value={pw2} onChange={setPw2} />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
      </button>
    </form>
  );
}

const EMPTY = { title: '', full_name: '', phone: '', city: '', district: '', address: '', zip: '' };

function Addresses({ userId }: { userId: string }) {
  const [list, setList] = useState<Addr[] | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; v: typeof EMPTY } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [rev, setRev] = useState(0);
  const load = useCallback(() => setRev((n) => n + 1), []);
  useEffect(() => {
    let off = false;
    supabase()
      .from('addresses')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (off) return;
        if (error) setErr('Adreslerin yüklenemedi. Sayfayı yenile.');
        else setList((data ?? []) as Addr[]);
      });
    return () => {
      off = true;
    };
  }, [rev]);

  const setF = (k: keyof typeof EMPTY) => (val: string) => setEdit((s) => (s ? { ...s, v: { ...s.v, [k]: val } } : s));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setErr('');
    const v = edit.v;
    const x: Record<string, string> = {};
    if (!v.title.trim()) x.title = 'Adrese bir başlık ver (Ev, İş…).';
    if (v.full_name.trim().length < 3) x.full_name = 'Alıcının adını ve soyadını yaz.';
    if (!phoneOk(v.phone)) x.phone = 'Geçerli bir telefon numarası gir.';
    if (!v.city.trim()) x.city = 'İl gerekli.';
    if (!v.district.trim()) x.district = 'İlçe gerekli.';
    if (v.address.trim().length < 10) x.address = 'Açık adresi eksiksiz yaz.';
    setErrs(x);
    if (Object.keys(x).length) return;

    setBusy(true);
    const row = { title: v.title.trim(), full_name: v.full_name.trim(), phone: v.phone.trim(), city: v.city.trim(), district: v.district.trim(), address: v.address.trim(), zip: v.zip.trim() || null };
    const { error } = edit.id ? await supabase().from('addresses').update(row).eq('id', edit.id) : await supabase().from('addresses').insert({ ...row, user_id: userId });
    setBusy(false);
    if (error) return setErr('Adres kaydedilemedi. Tekrar dene.');
    setEdit(null);
    setErrs({});
    load();
  }

  async function del(id: string) {
    if (!confirm('Bu adresi silmek istediğine emin misin?')) return;
    const { error } = await supabase().from('addresses').delete().eq('id', id);
    if (error) setErr('Adres silinemedi. Tekrar dene.');
    else load();
  }

  if (edit)
    return (
      <form className="form" onSubmit={save} noValidate style={{ maxWidth: 560 }}>
        <h2 className="section-h">{edit.id ? 'Adresi düzenle' : 'Yeni adres'}</h2>
        {err && <Alert kind="err">{err}</Alert>}
        <Field id="a_title" label="Adres başlığı" value={edit.v.title} onChange={setF('title')} error={errs.title} placeholder="Ev, İş…" />
        <div className="row2">
          <Field id="a_name" label="Alıcı ad soyad" value={edit.v.full_name} onChange={setF('full_name')} error={errs.full_name} autoComplete="name" />
          <Field id="a_phone" label="Telefon" type="tel" value={edit.v.phone} onChange={setF('phone')} error={errs.phone} autoComplete="tel" />
        </div>
        <div className="row2">
          <Field id="a_city" label="İl" value={edit.v.city} onChange={setF('city')} error={errs.city} />
          <Field id="a_district" label="İlçe" value={edit.v.district} onChange={setF('district')} error={errs.district} />
        </div>
        <div className="fld">
          <label htmlFor="a_address">Açık adres</label>
          <textarea id="a_address" value={edit.v.address} onChange={(e) => setF('address')(e.target.value)} aria-invalid={errs.address ? true : undefined} />
          {errs.address && <p className="fld-err">{errs.address}</p>}
        </div>
        <Field id="a_zip" label="Posta kodu (isteğe bağlı)" value={edit.v.zip} onChange={setF('zip')} inputMode="numeric" />
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn--solid" type="submit" disabled={busy}>
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button className="btn" type="button" onClick={() => { setEdit(null); setErrs({}); setErr(''); }}>
            Vazgeç
          </button>
        </div>
      </form>
    );

  return (
    <>
      {err && <Alert kind="err">{err}</Alert>}
      <p style={{ margin: '0 0 24px' }}>
        <button className="btn btn--solid" onClick={() => setEdit({ id: null, v: EMPTY })}>
          Yeni adres ekle
        </button>
      </p>
      {!list ? (
        <p className="loading">Adreslerin yükleniyor…</p>
      ) : !list.length ? (
        <p className="muted">Kayıtlı adresin yok. Ödeme sırasında da adres kaydedebilirsin.</p>
      ) : (
        <div className="addr-grid">
          {list.map((a) => (
            <div className="addr" key={a.id}>
              <b>{a.title}</b>
              <p>{a.full_name} · {a.phone}</p>
              <p>{a.address}</p>
              <p>{a.district} / {a.city}{a.zip ? ` · ${a.zip}` : ''}</p>
              <div className="addr-actions">
                <button className="btn-text" onClick={() => setEdit({ id: a.id, v: { title: a.title, full_name: a.full_name, phone: a.phone, city: a.city, district: a.district, address: a.address, zip: a.zip ?? '' } })}>
                  Düzenle
                </button>
                <button className="btn-text" onClick={() => del(a.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p style={{ marginTop: 32 }}>
        <Link className="link" href="/sepet">
          Sepetime git
        </Link>
      </p>
    </>
  );
}
