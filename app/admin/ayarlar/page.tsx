'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Field, Loading, TopBar, useToast } from '@/components/admin/ui';

const KEYS = [
  'free_shipping_threshold', 'shipping_fee', 'contact_email',
  'seller_name', 'seller_address', 'seller_tax_office', 'seller_tax_no', 'seller_mersis', 'seller_phone',
  'bank_holder', 'bank_name', 'bank_iban',
] as const;
type Form = Record<(typeof KEYS)[number], string>;
type Adm = { id: string; email: string; name: string };

export default function Settings() {
  const menu = useMenu();
  const [f, setF] = useState<Form | null>(null);
  const [admins, setAdmins] = useState<Adm[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { show, node } = useToast();

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([supabase().from('shop_settings').select('key, value'), supabase().rpc('admin_admins')]);
    if (s.error) return setErr('Ayarlar yüklenemedi. Sayfayı yenile.');
    const m = Object.fromEntries((s.data ?? []).map((r) => [r.key as string, String(r.value ?? '')]));
    setF(Object.fromEntries(KEYS.map((k) => [k, m[k] ?? ''])) as Form);
    setAdmins((a.data ?? []) as Adm[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (!f)
    return (
      <>
        <TopBar title="Ayarlar" onMenu={menu} />
        <div className="adm-scroll">{err ? <div className="alert err">{err}</div> : <Loading />}</div>
      </>
    );
  const set = (k: keyof Form, v: string) => setF((s) => ({ ...(s as Form), [k]: v }));
  const inp = (k: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className="inp" value={f[k]} onChange={(e) => set(k, e.target.value)} {...props} />
  );

  async function save() {
    const fee = Number(f!.shipping_fee.replace(',', '.'));
    const free = Number(f!.free_shipping_threshold.replace(',', '.'));
    if (isNaN(fee) || fee < 0 || isNaN(free) || free < 0 || f!.shipping_fee.trim() === '' || f!.free_shipping_threshold.trim() === '') return show('Kargo ücreti ve ücretsiz kargo eşiği geçerli sayılar olmalı.', true);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f!.contact_email.trim())) return show('Geçerli bir iletişim e-postası gir.', true);
    const iban = f!.bank_iban.replace(/\s+/g, '').toUpperCase();
    if (iban && !/^TR\d{24}$/.test(iban)) return show('IBAN “TR” ile başlayan 26 karakter olmalı.', true);
    setBusy(true);
    const rows = KEYS.map((k) => ({
      key: k,
      value: k === 'bank_iban' ? iban.replace(/(.{4})/g, '$1 ').trim() : k === 'free_shipping_threshold' ? String(free) : k === 'shipping_fee' ? String(fee) : f![k].trim(),
      is_public: true,
    }));
    const { error } = await supabase().from('shop_settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      setBusy(false);
      return show('Kaydedilemedi: ' + error.message, true);
    }
    await refreshSite();
    setBusy(false);
    show('Ayarlar kaydedildi, site güncellendi');
    load();
  }

  async function addAdmin() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return show('Geçerli bir e-posta gir.', true);
    const { error } = await supabase().rpc('admin_set_admin', { p_email: email, p_make: true });
    if (error) return show(error.message, true);
    setEmail('');
    show('Yönetici eklendi');
    load();
  }
  async function removeAdmin(a: Adm) {
    const { error } = await supabase().rpc('admin_set_admin', { p_email: a.email, p_make: false });
    if (error) return show(error.message, true);
    show('Yönetici yetkisi kaldırıldı');
    load();
  }

  return (
    <>
      <TopBar title="Ayarlar" onMenu={menu}>
        <button className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner" style={{ maxWidth: 860 }}>
          <section className="card" style={{ marginBottom: 18 }}>
            <div className="card-h"><h2 className="card-t">Kargo</h2></div>
            <div className="card-b row2">
              <Field label="Ücretsiz kargo eşiği (₺)" hint="Sepet bu tutara ulaşınca kargo ücretsiz olur.">{inp('free_shipping_threshold', { inputMode: 'decimal' })}</Field>
              <Field label="Kargo ücreti (₺)" hint="Eşiğin altındaki siparişlere eklenir.">{inp('shipping_fee', { inputMode: 'decimal' })}</Field>
            </div>
          </section>

          <section className="card" style={{ marginBottom: 18 }}>
            <div className="card-h"><h2 className="card-t">Havale / EFT bilgileri</h2><span className="card-m">Sipariş sonrası müşteriye gösterilir</span></div>
            <div className="card-b">
              <div className="row2">
                <Field label="Hesap sahibi">{inp('bank_holder')}</Field>
                <Field label="Banka">{inp('bank_name')}</Field>
              </div>
              <Field label="IBAN">{inp('bank_iban', { placeholder: 'TR00 0000 0000 0000 0000 0000 00' })}</Field>
            </div>
          </section>

          <section className="card" style={{ marginBottom: 18 }}>
            <div className="card-h"><h2 className="card-t">İletişim ve satıcı bilgileri</h2><span className="card-m">Yasal sayfalarda (KVKK, mesafeli satış vb.) kullanılır</span></div>
            <div className="card-b">
              <div className="row2">
                <Field label="İletişim e-postası">{inp('contact_email', { type: 'email' })}</Field>
                <Field label="Telefon">{inp('seller_phone')}</Field>
              </div>
              <Field label="Satıcı unvanı">{inp('seller_name')}</Field>
              <Field label="Adres"><textarea className="inp" value={f.seller_address} onChange={(e) => set('seller_address', e.target.value)} /></Field>
              <div className="row3">
                <Field label="Vergi dairesi">{inp('seller_tax_office')}</Field>
                <Field label="Vergi no">{inp('seller_tax_no')}</Field>
                <Field label="Mersis no">{inp('seller_mersis')}</Field>
              </div>
              <p className="hint">Boş bırakılan alanlar yasal sayfalarda gösterilmez. Metinleri yayına almadan önce bir avukata gösterman önerilir.</p>
            </div>
          </section>

          <section className="card">
            <div className="card-h"><h2 className="card-t">Yöneticiler</h2><ShieldCheck size={16} color="var(--tx3)" /></div>
            <div>
              {admins.map((a) => (
                <div className="attn" key={a.id}>
                  <span className="sb-av">{(a.name || a.email).slice(0, 2).toUpperCase()}</span>
                  <div style={{ flex: 1 }}><b>{a.name || a.email}</b><span className="m">{a.email}</span></div>
                  <button className="icon-btn" title="Yetkiyi kaldır" onClick={() => removeAdmin(a)}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <div className="card-b" style={{ borderTop: '1px solid var(--bdr)' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="inp" type="email" placeholder="Yönetici yapılacak üyenin e-postası" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn ghost" onClick={addAdmin}><UserPlus size={15} /> Ekle</button>
              </div>
              <p className="hint">Kişinin önce sitede kayıt olmuş olması gerekir.</p>
            </div>
          </section>
        </div>
      </div>
      {node}
    </>
  );
}
