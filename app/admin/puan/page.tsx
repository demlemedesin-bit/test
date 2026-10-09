'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Gift, Coins, Star, Plus, Trash2, UserPlus, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { tl } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Field, Kpi, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import { Card, Tbl } from '@/components/admin/Tbl';
import { PageHero } from '@/components/admin/PageHero';

type Reward = { points: number; value: number; min_total: number; valid_days: number };
type Cfg = {
  on: boolean; earn_per_tl: number; earn_on: 'hazirlaniyor' | 'kargoda' | 'teslim_edildi';
  review_points: number; review_verified_only: boolean; review_min_chars: number; signup_points: number; rewards: Reward[];
};
const DEF: Cfg = {
  on: false, earn_per_tl: 0.1, earn_on: 'teslim_edildi', review_points: 25, review_verified_only: false, review_min_chars: 20, signup_points: 50,
  rewards: [{ points: 100, value: 20, min_total: 200, valid_days: 90 }, { points: 250, value: 60, min_total: 500, valid_days: 90 }],
};
type Member = { user_id: string; email: string; full_name: string | null; balance: number; earned: number; spent: number; last_at: string };
type Row = { id: string; email: string | null; points: number; reason: string; note: string; created_at: string };
const WHY: Record<string, string> = { order: 'Sipariş', order_reverse: 'Sipariş iptali', review: 'Yorum', review_reverse: 'Yorum geri alındı', signup: 'Üyelik', redeem: 'Çeke çevrildi', adjust: 'Elle düzeltme' };
const num = (v: string, d = 0) => { const n = Number(v); return isFinite(n) && n >= 0 ? n : d; };

function Seg<T extends string | number | boolean>({ value, opts, onChange }: { value: T; opts: [T, string][]; onChange: (v: T) => void }) {
  return <div className="seg">{opts.map(([v, l]) => <button key={String(v)} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

export default function Puan() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [log, setLog] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [adj, setAdj] = useState<Member | null>(null);
  const [adjForm, setAdjForm] = useState({ points: '', note: '' });

  const load = useCallback(async () => {
    const sb = supabase();
    const [c, m, l] = await Promise.all([
      sb.from('site_content').select('value').eq('key', 'loyalty').maybeSingle(),
      sb.rpc('admin_loyalty_members'),
      sb.from('loyalty_ledger').select('id,email,points,reason,note,created_at').order('created_at', { ascending: false }).limit(60),
    ]);
    setCfg({ ...DEF, ...((c.data?.value as Partial<Cfg>) ?? {}), rewards: ((c.data?.value as Partial<Cfg>)?.rewards ?? DEF.rewards) });
    setMembers((m.data ?? []) as Member[]);
    setLog((l.data ?? []) as Row[]);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const stats = useMemo(() => {
    const out = members.reduce((s, m) => s + Math.max(m.balance, 0), 0);
    const issued = members.reduce((s, m) => s + m.earned, 0);
    const spent = members.reduce((s, m) => s + m.spent, 0);
    const best = (cfg?.rewards ?? []).reduce((b, r) => (r.points > 0 ? Math.max(b, r.value / r.points) : b), 0);
    return { out, issued, spent, liab: Math.round(out * best) };
  }, [members, cfg]);

  if (!cfg) return <Loading />;
  const set = (p: Partial<Cfg>) => setCfg({ ...cfg, ...p });
  const setR = (i: number, p: Partial<Reward>) => set({ rewards: cfg.rewards.map((r, j) => (j === i ? { ...r, ...p } : r)) });

  async function save() {
    if (!cfg) return;
    if (cfg.rewards.some((r) => !(r.points > 0 && r.value > 0))) return show('Her ödülde puan ve TL değeri 0’dan büyük olmalı.', true);
    setBusy(true);
    const { error } = await supabase().from('site_content').upsert({ key: 'loyalty', value: cfg });
    setBusy(false);
    if (error) return show(error.message, true);
    show('Puan kuralları kaydedildi.');
  }
  async function adjust() {
    if (!adj) return;
    const p = Math.trunc(Number(adjForm.points));
    if (!p) return show('Puan 0 olamaz (çıkarmak için eksi yaz).', true);
    const { error } = await supabase().rpc('admin_adjust_points', { p_user: adj.user_id, p_points: p, p_note: adjForm.note });
    if (error) return show(error.message, true);
    show('Puan güncellendi.');
    setAdj(null); setAdjForm({ points: '', note: '' });
    load();
  }

  const per100 = Math.floor(100 * cfg.earn_per_tl);
  return (
    <>
      <TopBar title="Puan ve hediye çeki" sub="Alışveriş ve yorumdan puan kazandır, puanı çeke çevirsin" onMenu={menu}>
        <button className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <div className="kpis">
          <Kpi label="Dağıtılan puan" value={stats.issued.toLocaleString('tr-TR')} sub="toplam kazanılan" tone="ac" icon={<Coins size={17} />} />
          <Kpi label="Çeke çevrilen" value={stats.spent.toLocaleString('tr-TR')} sub="harcanan puan" tone="green" icon={<Gift size={17} />} />
          <Kpi label="Bekleyen bakiye" value={stats.out.toLocaleString('tr-TR')} sub="üyelerde duran puan" tone="amber" icon={<Star size={17} />} />
          <Kpi label="Tahmini yükümlülük" value={tl(stats.liab)} sub="hepsi çeke çevrilirse" tone="red" icon={<ShoppingBag size={17} />} />
        </div>

        <Card title="Durum" meta="Kapalıyken yeni puan verilmez ve çek alınamaz; mevcut bakiyeler korunur">
          <div style={{ padding: 16 }}>
            <Seg value={cfg.on} opts={[[true, 'Puan sistemi açık'], [false, 'Kapalı']]} onChange={(v) => set({ on: v })} />
          </div>
        </Card>

        <Card title="Alışverişten puan" meta="Puan, indirim düşüldükten sonraki ürün tutarı (kargo hariç) üzerinden hesaplanır">
          <div style={{ padding: 16, display: 'grid', gap: 16 }}>
            <Field label="Her 1 ₺ için kaç puan?" hint={`Örnek: 100 ₺’lik sipariş = ${per100} puan`}>
              <div style={{ display: 'grid', gap: 8 }}>
                <Seg value={cfg.earn_per_tl} opts={[[0.05, '0,05'], [0.1, '0,1'], [0.2, '0,2'], [0.5, '0,5'], [1, '1']]} onChange={(v) => set({ earn_per_tl: v })} />
                <input className="inp" style={{ maxWidth: 140 }} type="number" min={0} step={0.01} value={cfg.earn_per_tl} onChange={(e) => set({ earn_per_tl: num(e.target.value) })} />
              </div>
            </Field>
            <Field label="Puan ne zaman yüklensin?" hint="İptal edilen siparişin puanı otomatik geri alınır">
              <Seg value={cfg.earn_on} opts={[['hazirlaniyor', 'Hazırlanırken'], ['kargoda', 'Kargoya verilince'], ['teslim_edildi', 'Teslim edilince']]} onChange={(v) => set({ earn_on: v })} />
            </Field>
          </div>
        </Card>

        <Card title="Yorumdan ve üyelikten puan" meta="Yorum, yönetici onayladığında yorumdaki e-postayla eşleşen üyeye puan verir">
          <div style={{ padding: 16, display: 'grid', gap: 16 }}>
            <Field label="Onaylanan yorum başına puan">
              <div style={{ display: 'grid', gap: 8 }}>
                <Seg value={cfg.review_points} opts={[[0, 'Yok'], [10, '10'], [25, '25'], [50, '50'], [100, '100']]} onChange={(v) => set({ review_points: v })} />
                <input className="inp" style={{ maxWidth: 140 }} type="number" min={0} value={cfg.review_points} onChange={(e) => set({ review_points: Math.floor(num(e.target.value)) })} />
              </div>
            </Field>
            <Field label="Kimin yorumu puan kazansın?">
              <Seg value={cfg.review_verified_only} opts={[[false, 'Her onaylı yorum'], [true, 'Sadece satın alanlar']]} onChange={(v) => set({ review_verified_only: v })} />
            </Field>
            <Field label="En az kaç karakter?" hint="Çok kısa yorumlar puan kazanmaz">
              <Seg value={cfg.review_min_chars} opts={[[0, 'Sınır yok'], [20, '20'], [50, '50'], [100, '100']]} onChange={(v) => set({ review_min_chars: v })} />
            </Field>
            <Field label="Üyelik hediyesi (yeni üyeye)">
              <div style={{ display: 'grid', gap: 8 }}>
                <Seg value={cfg.signup_points} opts={[[0, 'Yok'], [25, '25'], [50, '50'], [100, '100']]} onChange={(v) => set({ signup_points: v })} />
                <input className="inp" style={{ maxWidth: 140 }} type="number" min={0} value={cfg.signup_points} onChange={(e) => set({ signup_points: Math.floor(num(e.target.value)) })} />
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Hediye çeki ödülleri" meta="Üye bu seçeneklerden birini seçip puanıyla tek kullanımlık çek alır">
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            {cfg.rewards.map((r, i) => (
              <div key={i} className="card" style={{ padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
                <label className="fld" style={{ width: 120 }}><span className="lbl">Gereken puan</span><input className="inp" type="number" min={1} value={r.points} onChange={(e) => setR(i, { points: Math.floor(num(e.target.value)) })} /></label>
                <label className="fld" style={{ width: 120 }}><span className="lbl">Çek değeri (₺)</span><input className="inp" type="number" min={1} value={r.value} onChange={(e) => setR(i, { value: num(e.target.value) })} /></label>
                <label className="fld" style={{ width: 150 }}><span className="lbl">Min. sepet (₺)</span><input className="inp" type="number" min={0} value={r.min_total} onChange={(e) => setR(i, { min_total: num(e.target.value) })} /></label>
                <label className="fld" style={{ width: 120 }}><span className="lbl">Geçerlilik (gün)</span><input className="inp" type="number" min={1} value={r.valid_days} onChange={(e) => setR(i, { valid_days: Math.max(1, Math.floor(num(e.target.value, 90))) })} /></label>
                <span style={{ color: 'var(--tx3)', fontSize: 12, flex: 1, minWidth: 140 }}>{r.points} puan → {tl(r.value)} çek{r.min_total ? `, ${tl(r.min_total)} üstü sepette` : ''}</span>
                <button type="button" className="btn ghost" onClick={() => set({ rewards: cfg.rewards.filter((_, j) => j !== i) })} aria-label="Ödülü sil"><Trash2 size={15} /></button>
              </div>
            ))}
            <div><button type="button" className="btn ghost" onClick={() => set({ rewards: [...cfg.rewards, { points: 500, value: 150, min_total: 750, valid_days: 90 }] })}><Plus size={15} /> Ödül ekle</button></div>
          </div>
        </Card>

        <Card title="Üyeler" meta="Bakiyesi olan veya puan hareketi görenler">
          <Tbl min={760} empty="Henüz puan hareketi yok." cols={[['Üye', 'minmax(0,1.4fr)'], ['Bakiye', '90px'], ['Kazanılan', '90px'], ['Harcanan', '90px'], ['Son hareket', '120px'], ['', '110px']]}
            rows={members.map((m) => [
              <span key="u"><b>{m.full_name || '—'}</b> <span style={{ color: 'var(--tx3)' }}>{m.email}</span></span>,
              <b key="b">{m.balance}</b>, m.earned, m.spent, new Date(m.last_at).toLocaleDateString('tr-TR'),
              <button key="a" type="button" className="btn ghost" onClick={() => setAdj(m)}><SlidersHorizontal size={14} /> Düzelt</button>,
            ])} />
        </Card>

        <Card title="Son hareketler">
          <Tbl min={720} empty="Kayıt yok." cols={[['Tarih', '130px'], ['Üye', 'minmax(0,1.2fr)'], ['Puan', '80px'], ['Neden', '140px'], ['Not', 'minmax(0,1fr)']]}
            rows={log.map((r) => [
              new Date(r.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }), r.email ?? '—',
              <b key="p" style={{ color: r.points > 0 ? 'var(--green)' : 'var(--red)' }}>{r.points > 0 ? '+' : ''}{r.points}</b>, WHY[r.reason] ?? r.reason, r.note,
            ])} />
        </Card>
      </div></div>

      {adj && (
        <Panel title={<><UserPlus size={16} /> Puan düzelt</>} onClose={() => setAdj(null)}
          footer={<button className="btn" onClick={adjust}>Uygula</button>}>
          <p style={{ margin: '0 0 12px', color: 'var(--tx2)' }}>{adj.full_name || adj.email} · mevcut bakiye <b>{adj.balance}</b></p>
          <Field label="Eklenecek puan" hint="Çıkarmak için eksi yaz (ör. -50)">
            <input className="inp" type="number" value={adjForm.points} onChange={(e) => setAdjForm({ ...adjForm, points: e.target.value })} />
          </Field>
          <Field label="Not">
            <input className="inp" value={adjForm.note} onChange={(e) => setAdjForm({ ...adjForm, note: e.target.value })} placeholder="Örn. memnuniyet jesti" />
          </Field>
        </Panel>
      )}
      {node}
    </>
  );
}
