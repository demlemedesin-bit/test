'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { tl } from '@/lib/shop';
import { dateTr } from './OrderParts';
import './Loyalty.css';

type Reward = { points: number; value: number; min_total: number; valid_days: number };
type Cfg = { on?: boolean; earn_per_tl?: number; earn_on?: string; review_points?: number; signup_points?: number; rewards?: Reward[] };
type Me = { balance: number; ledger: { id: string; points: number; reason: string; note: string; created_at: string }[]; coupons: { code: string; value: number; min_total: number; ends_at: string | null; used: boolean; active: boolean }[] };
const WHY: Record<string, string> = { order: 'Sipariş', order_reverse: 'Sipariş iptali', review: 'Ürün yorumu', review_reverse: 'Yorum geri alındı', signup: 'Üyelik hediyesi', redeem: 'Hediye çeki', adjust: 'Düzeltme' };

export async function loadLoyaltyCfg(): Promise<Cfg | null> {
  const { data } = await supabase().from('site_content').select('value').eq('key', 'loyalty').maybeSingle();
  const c = (data?.value ?? null) as Cfg | null;
  return c && c.on ? c : null;
}

export function LoyaltyTab() {
  const [cfg, setCfg] = useState<Cfg | null | undefined>(undefined);
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(-1);
  const [now] = useState(() => Date.now());
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const load = useCallback(async () => {
    const [c, m] = await Promise.all([loadLoyaltyCfg(), supabase().rpc('my_loyalty')]);
    setCfg(c);
    setMe((m.data ?? null) as Me | null);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function redeem(i: number) {
    setBusy(i); setMsg(null);
    const { data, error } = await supabase().rpc('redeem_points', { p_idx: i });
    setBusy(-1);
    if (error) return setMsg({ t: error.message, err: true });
    setMsg({ t: `Hediye çekin hazır: ${data}. Ödeme adımında kupon kodu alanına yaz.` });
    load();
  }

  if (cfg === undefined) return <p className="loading">Yükleniyor…</p>;
  const bal = me?.balance ?? 0;
  return (
    <div className="loy">
      <div className="loy-top">
        <div className="loy-bal"><span>Puanım</span><b>{bal.toLocaleString('tr-TR')}</b></div>
        {cfg ? (
          <ul className="loy-how">
            {cfg.earn_per_tl ? <li>Her 100 ₺ alışverişte <b>{Math.floor(100 * cfg.earn_per_tl)} puan</b></li> : null}
            {cfg.review_points ? <li>Onaylanan her yorumda <b>{cfg.review_points} puan</b></li> : null}
            {cfg.signup_points ? <li>Üyelik hediyesi <b>{cfg.signup_points} puan</b></li> : null}
          </ul>
        ) : <p className="muted">Puan sistemi şu an kapalı. Mevcut puanların ve çeklerin saklanır.</p>}
      </div>

      {msg && <p className={`loy-msg${msg.err ? ' err' : ''}`} role="status">{msg.t}</p>}

      {cfg && (cfg.rewards ?? []).length > 0 && (
        <>
          <h3 className="loy-h">Puanını hediye çekine çevir</h3>
          <div className="loy-rw">
            {(cfg.rewards ?? []).map((r, i) => (
              <div key={i} className="loy-card">
                <b>{tl(r.value)}</b>
                <span>hediye çeki</span>
                <small>{r.min_total ? `${tl(r.min_total)} ve üzeri sepette · ` : ''}{r.valid_days} gün geçerli</small>
                <button className="btn btn--solid" disabled={bal < r.points || busy >= 0} onClick={() => redeem(i)}>
                  {busy === i ? 'Hazırlanıyor…' : bal < r.points ? `${r.points - bal} puan eksik` : `${r.points} puana al`}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {me && me.coupons.length > 0 && (
        <>
          <h3 className="loy-h">Çeklerim</h3>
          <ul className="loy-list">
            {me.coupons.map((c) => (
              <li key={c.code}>
                <code>{c.code}</code>
                <span>{tl(c.value)}{c.min_total ? ` · min. ${tl(c.min_total)}` : ''}</span>
                <small>{c.used ? 'Kullanıldı' : c.ends_at && Date.parse(c.ends_at) < now ? 'Süresi doldu' : c.ends_at ? `${dateTr(c.ends_at)} tarihine kadar` : ''}</small>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="loy-h">Puan geçmişi</h3>
      {me && me.ledger.length > 0 ? (
        <ul className="loy-list">
          {me.ledger.map((l) => (
            <li key={l.id}>
              <b className={l.points > 0 ? 'pos' : 'neg'}>{l.points > 0 ? '+' : ''}{l.points}</b>
              <span>{WHY[l.reason] ?? l.reason}{l.note ? ` · ${l.note}` : ''}</span>
              <small>{dateTr(l.created_at)}</small>
            </li>
          ))}
        </ul>
      ) : <p className="muted">Henüz puan hareketin yok. İlk siparişinde ve ilk yorumunda puan kazanmaya başlarsın.</p>}
    </div>
  );
}

/** Sepet/ödeme ve yorum formu için tek satırlık ipucu. */
export function LoyaltyHint({ kind, amount }: { kind: 'order' | 'review'; amount?: number }) {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  useEffect(() => { const t = setTimeout(() => { loadLoyaltyCfg().then(setCfg).catch(() => {}); }, 0); return () => clearTimeout(t); }, []);
  if (!cfg) return null;
  if (kind === 'order') {
    const p = Math.floor((amount ?? 0) * (cfg.earn_per_tl ?? 0));
    if (p <= 0) return null;
    return <p className="loy-hint">Bu siparişle <b>{p} puan</b> kazanırsın. Puanlarını hesabından hediye çekine çevirebilirsin.</p>;
  }
  if (!cfg.review_points) return null;
  return <p className="loy-hint">Üye olarak yorum yaz, onaylanınca <b>{cfg.review_points} puan</b> kazan.</p>;
}
