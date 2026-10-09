'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Save, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, refreshSite, tl, useAdmin } from '@/lib/admin';
import { CARRIERS } from '@/lib/carriers';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import './entegrasyonlar.css';
import { PageHero } from '@/components/admin/PageHero';

type Tab = 'odeme' | 'mesaj' | 'webhook' | 'besleme' | 'kargo' | 'dogrulama' | 'gunluk';
const TABS: [Tab, string][] = [
  ['odeme', 'Ödeme (Paynkolay)'],
  ['mesaj', 'E-posta ve SMS'],
  ['webhook', 'Webhook (n8n)'],
  ['besleme', 'Beslemeler'],
  ['kargo', 'Kargo'],
  ['dogrulama', 'Site doğrulama'],
  ['gunluk', 'Mesaj günlüğü'],
];

type Check = { name: string; ok: boolean; detail: string };
type Toast = (t: string, e?: boolean) => void;

async function token(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? '';
}

function useChecks() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const r = await fetch('/api/durum', { headers: { Authorization: 'Bearer ' + (await token()) }, cache: 'no-store' });
        const j = (await r.json()) as { ok: boolean; checks: Check[] };
        if (off) return;
        if (!r.ok || !j.ok) setErr('Durum okunamadı (bu bilgi için sistem ya da entegrasyon yetkisi gerekir).');
        else setChecks(j.checks);
      } catch {
        if (!off) setErr('Durum okunamadı.');
      }
    })();
    return () => {
      off = true;
    };
  }, []);
  return { checks, err };
}

function CopyField({ value, toast }: { value: string; toast: Toast }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      toast('Kopyalanamadı, elle seç.', true);
    }
  }
  return (
    <div className="int-copy">
      <input className="inp" readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn ghost sm" onClick={copy}>
        {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  );
}

function Status({ checks, names, err }: { checks: Check[] | null; names: string[]; err: string }) {
  if (err) return <div className="card-b"><div className="alert warn" style={{ margin: 0 }}>{err}</div></div>;
  if (!checks) return <Loading />;
  const rows = checks.filter((c) => names.includes(c.name));
  return (
    <div>
      {rows.map((c) => (
        <div className="int-chk" key={c.name}>
          <span className={`badge plain ${c.ok ? 'b-green' : 'b-amber'}`}>{c.ok ? 'Tanımlı' : 'Tanımsız'}</span>
          <b>{c.name}</b>
          <span className="m">{c.detail}</span>
        </div>
      ))}
    </div>
  );
}

// ── Ödeme ────────────────────────────────────────────────────────────
type PayRow = { order_no: string; status: string; paid_price: number | null; payment_id: string | null; created_at: string };
const PAY_ST: Record<string, [string, string]> = { init: ['Başlatıldı', 'b-gray'], paid: ['Ödendi', 'b-green'], failed: ['Başarısız', 'b-red'], review: ['İncelemede', 'b-amber'], refunded: ['İade edildi', 'b-blue'], cancelled: ['İptal', 'b-gray'] };

function Payment() {
  const { checks, err } = useChecks();
  const [rows, setRows] = useState<PayRow[] | null>(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase().from('payments').select('order_no,status,paid_price,payment_id,created_at').order('created_at', { ascending: false }).limit(20);
      setRows((data ?? []) as PayRow[]);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="int-stack">
      <section className="card">
        <div className="card-h"><h2 className="card-t">Canlı durum</h2><span className="card-m">Yalnızca “tanımlı / tanımsız”; değerler gösterilmez</span></div>
        <Status checks={checks} err={err} names={['PAYNKOLAY_SX', 'PAYNKOLAY_SX_LIST', 'PAYNKOLAY_SX_IPTAL', 'PAYNKOLAY_SECRET', 'PAYNKOLAY_BASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SITE_URL']} />
      </section>

      <section className="card">
        <div className="card-h"><h2 className="card-t">Kurulum adımları</h2></div>
        <div className="card-b">
          <ol className="int-steps">
            <li>Paynkolay panelinden (canlı için) <b>sx</b>, <b>sx list</b>, <b>sx iptal</b> değerlerini ve <b>Merchant Secret Key</b>’i al. Değerleri panelde göremiyorsan Paynkolay destek ekibinden API yetkisinin açılmasını iste.</li>
            <li>Vercel → Project → Settings → Environment Variables bölümüne şunları ekle: <code>PAYNKOLAY_SX</code>, <code>PAYNKOLAY_SX_LIST</code>, <code>PAYNKOLAY_SX_IPTAL</code>, <code>PAYNKOLAY_SECRET</code>, <code>PAYNKOLAY_BASE_URL</code> (test: <code>https://paynkolaytest.nkolayislem.com.tr/Vpos</code> · canlı: <code>https://paynkolay.nkolayislem.com.tr/Vpos</code>), <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>NEXT_PUBLIC_SITE_URL</code> (https ile, örn. <code>https://alanadin.com</code>).</li>
            <li>Değişkenleri ekledikten sonra Vercel’de yeniden dağıtım (redeploy) yap; yukarıdaki durum kartı “Tanımlı” olmalı.</li>
            <li>Paynkolay webhook göndermez; sonuç müşteri dönüş adresine gelir. Dönüş adresi otomatik ayarlanır, panelde ayrıca bir adres girmen gerekmez.</li>
            <li>Test kartıyla bir sipariş ver; sipariş “Hazırlanıyor”a geçmeli ve aşağıdaki listede “Ödendi” görünmeli.</li>
          </ol>
          <p className="hint" style={{ marginTop: 12 }}>
            Test kartları ve test ortamı bilgisi: <a href="https://paynkolay.com.tr/entegrasyon/07-test-cards.php" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ac)' }}>paynkolay.com.tr → Test Kartları</a>. Kurulum ayrıntıları depoda <code>docs/paynkolay/README.md</code> dosyasındadır.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-h"><h2 className="card-t">Son ödemeler</h2><span className="card-m">Son 20 kayıt</span></div>
        {!rows ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Henüz ödeme kaydı yok" text="Kart ödemesi başlatılınca burada görünür." />
        ) : (
          <div className="tbl">
            <div className="tr hd cols-ipay"><span>Sipariş</span><span>Ödeme no</span><span>Tutar</span><span>Durum</span><span>Tarih</span></div>
            {rows.map((r, i) => {
              const [l, tone] = PAY_ST[r.status] ?? [r.status, 'b-gray'];
              return (
                <div className="tr cols-ipay" key={i}>
                  <span className="mono">{r.order_no}</span>
                  <span className="cell-muted cell-clip mono">{r.payment_id || '—'}</span>
                  <span className="num">{r.paid_price != null ? tl(Number(r.paid_price)) : '—'}</span>
                  <span><span className={`badge ${tone}`}>{l}</span></span>
                  <span className="cell-muted">{dt(r.created_at, true)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── E-posta ve SMS ───────────────────────────────────────────────────
type Tpl = { key: string; name: string; subject: string; body: string; email_on: boolean; sms_on: boolean };
const ORDER_VARS = ['name', 'order_no', 'total', 'track_url', 'carrier', 'tracking_no', 'carrier_url', 'payment_info'];
const VARS: Record<string, string[]> = { cart_reminder: ['cart_items', 'cart_url'] };

function Messages({ toast }: { toast: Toast }) {
  const { checks, err } = useChecks();
  const { user } = useAdmin();
  const [list, setList] = useState<Tpl[] | null>(null);
  const [sel, setSel] = useState('');
  const [f, setF] = useState<Tpl | null>(null);
  const [busy, setBusy] = useState(false);
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('message_templates').select('key,name,subject,body,email_on,sms_on').order('key');
    if (error) return toast('Şablonlar yüklenemedi.', true);
    const l = (data ?? []) as Tpl[];
    setList(l);
    setSel((s) => s || l[0]?.key || '');
  }, [toast]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    const t = setTimeout(() => setF(list?.find((x) => x.key === sel) ?? null), 0);
    return () => clearTimeout(t);
  }, [list, sel]);

  const email = to || user?.email || '';

  async function save(): Promise<boolean> {
    if (!f) return false;
    if (!f.subject.trim() || !f.body.trim()) {
      toast('Konu ve metin boş olamaz.', true);
      return false;
    }
    setBusy(true);
    const { error } = await supabase().from('message_templates').update({ subject: f.subject, body: f.body, email_on: f.email_on, sms_on: f.sms_on, updated_at: new Date().toISOString() }).eq('key', f.key);
    setBusy(false);
    if (error) {
      toast('Kaydedilemedi: ' + error.message, true);
      return false;
    }
    setList((l) => (l ?? []).map((x) => (x.key === f.key ? f : x)));
    return true;
  }

  async function test() {
    if (!f) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Geçerli bir e-posta gir.', true);
    if (!(await save())) return;
    setBusy(true);
    try {
      const r = await fetch('/api/bildirim/test', { method: 'POST', headers: { Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email, template: f.key }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; skipped?: boolean; error?: string };
      if (!r.ok || !j.ok) toast(j.error || 'Test gönderilemedi.', true);
      else if (j.skipped) toast('Atlandı: ' + (j.error || 'e-posta sağlayıcısı tanımlı değil'), true);
      else toast('Test e-postası gönderildi');
    } catch {
      toast('Test gönderilemedi.', true);
    }
    setBusy(false);
  }

  const vars = f ? [...(f.key === 'cart_reminder' ? [] : ORDER_VARS), ...(VARS[f.key] ?? [])] : [];

  return (
    <div className="int-stack">
      <section className="card">
        <div className="card-h"><h2 className="card-t">Sağlayıcı durumu</h2><span className="card-m">E-posta: SMTP2GO · SMS: NetGSM</span></div>
        <Status checks={checks} err={err} names={['SMTP2GO_API_KEY', 'MAIL_FROM', 'NETGSM_USERCODE', 'NETGSM_PASSWORD', 'NETGSM_HEADER']} />
      </section>

      <section className="card">
        <div className="card-h"><h2 className="card-t">Mesaj şablonları</h2></div>
        {!list ? (
          <Loading />
        ) : (
          <div className="card-b">
            <div className="tabs" style={{ marginBottom: 18 }}>
              {list.map((t) => (
                <button key={t.key} className={`tab${sel === t.key ? ' on' : ''}`} onClick={() => setSel(t.key)}>{t.name}</button>
              ))}
            </div>
            {f && (
              <>
                <Field label="Konu"><input className="inp" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
                <Field label="Metin" hint="Düz metindir; {{değişken}} yazılan yerler otomatik doldurulur.">
                  <textarea className="inp" rows={11} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
                </Field>
                <p className="lbl">Kullanılabilir değişkenler</p>
                <div className="int-tags" style={{ marginBottom: 16 }}>
                  {vars.map((v) => (<code key={v}>{`{{${v}}}`}</code>))}
                </div>
                <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 16 }}>
                  <label className="chk"><input type="checkbox" checked={f.email_on} onChange={(e) => setF({ ...f, email_on: e.target.checked })} /> E-posta gönder</label>
                  <label className="chk"><input type="checkbox" checked={f.sms_on} onChange={(e) => setF({ ...f, sms_on: e.target.checked })} /> SMS gönder</label>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <button className="btn" disabled={busy} onClick={async () => (await save()) && toast('Şablon kaydedildi')}><Save size={15} /> Kaydet</button>
                  <div style={{ flex: 1, minWidth: 220, maxWidth: 340 }}>
                    <Field label="Test e-postası (kendi adresin)"><input className="inp" type="email" value={email} onChange={(e) => setTo(e.target.value)} style={{ marginBottom: 0 }} /></Field>
                  </div>
                  <button className="btn ghost" disabled={busy} onClick={test}><Send size={15} /> Test gönder</button>
                </div>
                <p className="hint">Test, şablonu önce kaydeder; örnek verilerle (DM-0000 gibi) yalnızca yazdığın adrese gider. SMS, siparişteki telefon numarasına gider ve “SMS gönder” açıksa çalışır.</p>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Webhook ──────────────────────────────────────────────────────────
const EVENTS: [string, string][] = [
  ['order_created', 'Sipariş oluştu'],
  ['order_paid', 'Ödeme alındı'],
  ['order_shipped', 'Kargoya verildi'],
  ['order_delivered', 'Teslim edildi'],
  ['order_cancelled', 'Sipariş iptal edildi'],
  ['cart_reminder', 'Sepet hatırlatma gönderildi'],
];
const SAMPLE = `{
  "event": "order_shipped",
  "at": "2026-01-15T10:30:00.000Z",
  "data": {
    "order_no": "DM-1001",
    "status": "kargoda",
    "email": "musteri@ornek.com",
    "full_name": "Ayşe Yılmaz",
    "phone": "05xx xxx xx xx",
    "items": [{ "name": "Demleme Kupa", "qty": 2, "unit_price": 420, "line_total": 840 }],
    "subtotal": 840, "shipping": 59.9, "discount": 0, "coupon_code": null,
    "total": 899.9, "payment_method": "kart",
    "tracking_carrier": "UPS", "tracking_no": "1234567890"
  }
}`;
const VERIFY = `// Node.js / n8n Code düğümü
const crypto = require('crypto');
const imza = crypto.createHmac('sha256', WEBHOOK_SECRET)
  .update(hamGovde)               // gelen isteğin değiştirilmemiş gövdesi
  .digest('hex');
imza === headers['x-demleme-signature'];`;

function Webhook({ toast }: { toast: Toast }) {
  const { checks, err } = useChecks();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase().from('shop_settings').select('value').eq('key', 'webhook_url').maybeSingle();
      setUrl(String(data?.value ?? ''));
    }, 0);
    return () => clearTimeout(t);
  }, []);
  async function save() {
    const v = (url ?? '').trim();
    if (v && !/^https?:\/\/[^\s]+$/i.test(v)) return toast('Adres http:// ya da https:// ile başlamalı.', true);
    setBusy(true);
    const { error } = await supabase().from('shop_settings').upsert({ key: 'webhook_url', value: v, is_public: false }, { onConflict: 'key' });
    setBusy(false);
    if (error) return toast('Kaydedilemedi: ' + error.message, true);
    toast('Webhook adresi kaydedildi');
  }
  return (
    <div className="int-stack">
      <section className="card">
        <div className="card-h"><h2 className="card-t">Durum</h2></div>
        <Status checks={checks} err={err} names={['N8N_WEBHOOK_URL', 'WEBHOOK_SECRET']} />
      </section>
      <section className="card">
        <div className="card-h"><h2 className="card-t">Webhook adresi</h2></div>
        <div className="card-b">
          {url === null ? (
            <Loading />
          ) : (
            <>
              <Field label="n8n webhook adresi" hint="Vercel’de N8N_WEBHOOK_URL tanımlıysa o önceliklidir; burası yedektir. Boş bırakılırsa webhook gönderilmez.">
                <input className="inp" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://n8n.alanadin.com/webhook/…" />
              </Field>
              <button className="btn" disabled={busy} onClick={save}><Save size={15} /> Kaydet</button>
            </>
          )}
        </div>
      </section>
      <section className="card">
        <div className="card-h"><h2 className="card-t">Olaylar</h2></div>
        <div className="card-b">
          <div className="int-tags" style={{ marginTop: 0 }}>
            {EVENTS.map(([k, l]) => (<span key={k}><code>{k}</code> <span className="cell-muted">{l}</span>&nbsp;&nbsp;</span>))}
          </div>
          <p className="int-p" style={{ marginTop: 14 }}>Her olay <code>POST</code> ile JSON olarak gönderilir (5 sn zaman aşımı). Örnek gövde:</p>
          <pre className="int-code">{SAMPLE}</pre>
        </div>
      </section>
      <section className="card">
        <div className="card-h"><h2 className="card-t">İmza</h2></div>
        <div className="card-b">
          <p className="int-p">Vercel’de <code>WEBHOOK_SECRET</code> tanımlıysa her istekte <code>X-Demleme-Signature</code> başlığı bulunur: gövdenin HMAC-SHA256 (hex) değeri. Alıcı tarafta aynı sırla hesaplayıp karşılaştır; uyuşmayan istekleri reddet.</p>
          <pre className="int-code">{VERIFY}</pre>
        </div>
      </section>
    </div>
  );
}

// ── Beslemeler ───────────────────────────────────────────────────────
function Feeds({ toast }: { toast: Toast }) {
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin));
  const feeds = [
    ['Google Merchant Center', '/feed/google.xml', 'Merchant Center → Ürünler → Beslemeler → zamanlanmış getirme (RSS/XML).'],
    ['Meta Catalog (Facebook / Instagram)', '/feed/meta.csv', 'Commerce Manager → Katalog → Veri kaynakları → Zamanlanmış besleme (CSV).'],
    ['Pazaryeri (Trendyol / Hepsiburada)', '/feed/pazaryeri.csv', 'SKU = ürün-renk-beden. Barkod boş gelir; pazaryerine yüklemeden önce doldur.'],
  ];
  return (
    <div className="int-stack">
      {feeds.map(([t, p, d]) => (
        <section className="card" key={p}>
          <div className="card-h"><h2 className="card-t">{t}</h2></div>
          <div className="card-b">
            <CopyField value={origin + p} toast={toast} />
            <p className="hint">{d}</p>
          </div>
        </section>
      ))}
      <p className="hint">Beslemeler yalnızca satıştaki (aktif, “yakında” olmayan) ürünleri içerir ve saatte bir yenilenir.</p>
    </div>
  );
}

// ── Kargo ────────────────────────────────────────────────────────────
function Carriers() {
  return (
    <section className="card">
      <div className="card-h"><h2 className="card-t">Kargo firmaları</h2><span className="card-m">Salt okunur · <code>lib/carriers.ts</code></span></div>
      <div className="tbl">
        <div className="tr hd cols-icar"><span>Firma</span><span>Takip adresi şablonu</span></div>
        {CARRIERS.map((c) => (
          <div className="tr cols-icar" key={c.name}>
            <span className="cell-strong">{c.name}</span>
            <span className="cell-muted cell-clip mono">{c.url || 'Bağlantı üretilmez'}</span>
          </div>
        ))}
      </div>
      <div className="card-b"><p className="hint" style={{ marginTop: 0 }}><code>{'{no}'}</code> takip numarasıyla değiştirilir. Liste ve şablonlar kodda tutulur; eklemek için <code>lib/carriers.ts</code> dosyasını düzenle.</p></div>
    </section>
  );
}

// ── Site doğrulama ───────────────────────────────────────────────────
const VKEYS = [
  ['verify_google', 'Google Search Console', 'google-site-verification meta etiketinin content değeri'],
  ['verify_meta', 'Meta (Facebook) alan adı doğrulama', 'facebook-domain-verification meta etiketinin content değeri'],
  ['verify_yandex', 'Yandex Webmaster', 'yandex-verification meta etiketinin content değeri'],
] as const;

function Verify({ toast }: { toast: Toast }) {
  const [f, setF] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase().from('shop_settings').select('key,value').in('key', VKEYS.map((k) => k[0]));
      const m = Object.fromEntries((data ?? []).map((r) => [r.key as string, String(r.value ?? '')]));
      setF(Object.fromEntries(VKEYS.map(([k]) => [k, m[k] ?? ''])));
    }, 0);
    return () => clearTimeout(t);
  }, []);
  async function save() {
    if (!f) return;
    const rows = VKEYS.map(([k]) => {
      const raw = f[k].trim();
      // Tüm <meta …> etiketi yapıştırıldıysa yalnızca content değerini al
      const v = raw.match(/content\s*=\s*["']([^"']+)["']/i)?.[1] ?? raw;
      return { key: k, value: v.trim(), is_public: true };
    });
    if (rows.some((r) => r.value && !/^[\w.\-=+/]{4,200}$/.test(r.value))) return toast('Doğrulama kodu geçersiz karakter içeriyor. Yalnızca content değerini yapıştır.', true);
    setBusy(true);
    const { error } = await supabase().from('shop_settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      setBusy(false);
      return toast('Kaydedilemedi: ' + error.message, true);
    }
    await refreshSite();
    setBusy(false);
    setF(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    toast('Doğrulama kodları kaydedildi, site güncellendi');
  }
  if (!f) return <Loading />;
  return (
    <section className="card">
      <div className="card-h"><h2 className="card-t">Site doğrulama etiketleri</h2><span className="card-m">Sitenin &lt;head&gt; bölümüne meta etiketi olarak eklenir</span></div>
      <div className="card-b">
        {VKEYS.map(([k, l, h]) => (
          <Field key={k} label={l} hint={h}>
            <input className="inp" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder="Yalnızca kod" />
          </Field>
        ))}
        <button className="btn" disabled={busy} onClick={save}><Save size={15} /> Kaydet</button>
      </div>
    </section>
  );
}

// ── Mesaj günlüğü ────────────────────────────────────────────────────
type Log = { id: number; at: string; channel: string; to_addr: string | null; template: string | null; subject: string | null; status: string; error: string | null; order_no: string | null };
const ST_TONE: Record<string, string> = { sent: 'b-green', failed: 'b-red', skipped: 'b-gray' };
const ST_LABEL: Record<string, string> = { sent: 'Gönderildi', failed: 'Hata', skipped: 'Atlandı' };
const CH_LABEL: Record<string, string> = { email: 'E-posta', sms: 'SMS', whatsapp: 'WhatsApp', webhook: 'Webhook' };

function LogTab() {
  const [rows, setRows] = useState<Log[] | null>(null);
  const [err, setErr] = useState('');
  const [ch, setCh] = useState('');
  const [st, setSt] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data, error } = await supabase().from('message_log').select('*').order('at', { ascending: false }).limit(200);
      if (error) return setErr('Günlük yüklenemedi.');
      setRows((data ?? []) as Log[]);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const list = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    return (rows ?? []).filter((r) => (!ch || r.channel === ch) && (!st || r.status === st) && (!k || [r.to_addr, r.order_no, r.template, r.subject, r.error].some((v) => (v ?? '').toLocaleLowerCase('tr-TR').includes(k))));
  }, [rows, ch, st, q]);
  return (
    <>
      <div className="toolbar">
        <input className="inp" style={{ maxWidth: 280 }} placeholder="Alıcı, sipariş no, şablon, hata…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="inp" style={{ width: 150 }} value={ch} onChange={(e) => setCh(e.target.value)}>
          <option value="">Tüm kanallar</option>
          {Object.entries(CH_LABEL).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
        </select>
        <select className="inp" style={{ width: 150 }} value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Tüm durumlar</option>
          {Object.entries(ST_LABEL).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
        </select>
      </div>
      <div className="card">
        {err ? (
          <div className="card-b"><div className="alert err" style={{ margin: 0 }}>{err}</div></div>
        ) : !rows ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title="Kayıt yok" text={rows.length ? 'Filtreyi değiştir.' : 'Bildirim gönderildikçe burada listelenir.'} />
        ) : (
          <div className="tbl">
            <div className="tr hd cols-ilog"><span>Tarih</span><span>Kanal</span><span>Alıcı</span><span>Şablon / konu</span><span>Durum</span><span>Sipariş / hata</span></div>
            {list.map((r) => (
              <div className="tr cols-ilog" key={r.id}>
                <span className="cell-muted">{dt(r.at, true)}</span>
                <span>{CH_LABEL[r.channel] ?? r.channel}</span>
                <span className="cell-clip">{r.to_addr || '—'}</span>
                <span className="cell-clip" title={r.subject ?? ''}><b className="cell-strong">{r.template || '—'}</b>{r.subject ? <span className="cell-muted"> · {r.subject}</span> : null}</span>
                <span><span className={`badge ${ST_TONE[r.status] ?? 'b-gray'}`}>{ST_LABEL[r.status] ?? r.status}</span></span>
                <span className="cell-clip cell-muted" title={r.error ?? ''}>{r.order_no ? <span className="mono">{r.order_no}</span> : null}{r.order_no && r.error ? ' · ' : ''}{r.error || (r.order_no ? '' : '—')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="hint">Son 200 kayıt gösterilir.</p>
    </>
  );
}

export default function Integrations() {
  const menu = useMenu();
  const [tab, setTab] = useState<Tab>('odeme');
  const { show, node } = useToast();
  return (
    <>
      <TopBar title="Entegrasyonlar" onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner" style={{ maxWidth: 940 }}><PageHero />
          <div className="tabs int-tabs">
            {TABS.map(([k, l]) => (
              <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          {tab === 'odeme' && <Payment />}
          {tab === 'mesaj' && <Messages toast={show} />}
          {tab === 'webhook' && <Webhook toast={show} />}
          {tab === 'besleme' && <Feeds toast={show} />}
          {tab === 'kargo' && <Carriers />}
          {tab === 'dogrulama' && <Verify toast={show} />}
          {tab === 'gunluk' && <LogTab />}
        </div>
      </div>
      {node}
    </>
  );
}
