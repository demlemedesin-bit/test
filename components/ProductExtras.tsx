'use client';

import { LoyaltyHint } from './Loyalty';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { pushRecent } from '@/lib/storefront';
import { RecentlyViewed } from './RecentlyViewed';
import './ProductExtras.css';

/**
 * Ürün sayfasındaki React adaları. Sayfa gövdesi handoff HTML'i olduğundan bileşenler,
 * HTML'deki boş kaplara (#pxHeart, #pxStock, #pxReviewForm, #pxRecent) portal ile yerleşir.
 */
type Props = {
  slug: string;
  name: string;
  /** Satışa yakında girecek ya da stoğu bitmiş: "Gelince haber ver" gösterilir. */
  unavailable: boolean;
  reviewsOn: boolean;
  wishlistOn: boolean;
  stockAlertOn: boolean;
  recentOn: boolean;
};

const IDS = ['pxHeart', 'pxStock', 'pxReviewForm', 'pxRecent'] as const;
type Slots = Partial<Record<(typeof IDS)[number], HTMLElement>>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GENERIC = 'Şu an işlem yapılamadı. Biraz sonra tekrar dene.';
// RPC'lerin kullanıcıya gösterilecek Türkçe hataları errcode 22023 ile gelir
const rpcMsg = (e: { code?: string; message?: string }) => (e.code === '22023' && e.message ? e.message : GENERIC);

export function ProductExtras({ slug, name, unavailable, reviewsOn, wishlistOn, stockAlertOn, recentOn }: Props) {
  const [slots, setSlots] = useState<Slots>({});

  useEffect(() => {
    const t = setTimeout(() => {
      const s: Slots = {};
      for (const id of IDS) {
        const el = document.getElementById(id);
        if (el) s[id] = el;
      }
      setSlots(s);
    }, 0);
    return () => clearTimeout(t);
  }, [slug]);

  useEffect(() => {
    if (recentOn) pushRecent(slug);
  }, [slug, recentOn]);

  return (
    <>
      {wishlistOn && slots.pxHeart && createPortal(<Heart slug={slug} />, slots.pxHeart)}
      {stockAlertOn && unavailable && slots.pxStock && createPortal(<StockAlert slug={slug} name={name} />, slots.pxStock)}
      {reviewsOn && slots.pxReviewForm && createPortal(<ReviewForm slug={slug} name={name} />, slots.pxReviewForm)}
      {recentOn && slots.pxRecent && createPortal(<RecentlyViewed exclude={[slug]} enabled />, slots.pxRecent)}
    </>
  );
}

// ═══ Favori kalbi ═════════════════════════════════════════════════════
function Heart({ slug }: { slug: string }) {
  const { user, loading } = useAuth();
  const uid = user?.id;
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!uid) return;
    let off = false;
    supabase()
      .from('wishlists')
      .select('product_slug')
      .eq('user_id', uid)
      .eq('product_slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!off) setOn(!!data);
      });
    return () => {
      off = true;
    };
  }, [uid, slug]);

  const active = !!uid && on;

  async function toggle() {
    if (loading || busy) return;
    if (!uid) {
      window.location.href = '/giris?next=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const next = !active;
    setBusy(true);
    setOn(next);
    setMsg('');
    const sb = supabase();
    const { error } = next
      ? await sb.from('wishlists').insert({ user_id: uid, product_slug: slug })
      : await sb.from('wishlists').delete().eq('user_id', uid).eq('product_slug', slug);
    setBusy(false);
    if (error && !(next && error.code === '23505')) {
      setOn(!next);
      setMsg('Favorilerin güncellenemedi. Biraz sonra tekrar dene.');
      return;
    }
    setMsg(next ? 'Favorilerine eklendi.' : 'Favorilerinden çıkarıldı.');
  }

  return (
    <div className="px px-fav">
      <button type="button" className={`px-heart${active ? ' on' : ''}`} onClick={toggle} aria-pressed={active} disabled={busy}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.4 5 6.4 5c1.9 0 3.4 1 4.2 2.4h.8C12.2 6 13.7 5 15.6 5c3 0 4.8 2.9 3.6 6.2-1.7 4.7-7.2 9.3-7.2 9.3z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span>{active ? 'Favorilerde' : 'Favorilere ekle'}</span>
      </button>
      <span className="px-fav-msg" role="status" aria-live="polite">
        {msg}
      </span>
    </div>
  );
}

// ═══ Gelince haber ver ════════════════════════════════════════════════
function StockAlert({ slug, name }: { slug: string; name: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const val = email ?? user?.email ?? '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!EMAIL.test(val.trim())) return setState({ ok: false, text: 'Geçerli bir e-posta yaz.' });
    setBusy(true);
    setState(null);
    try {
      const { error } = await supabase().rpc('subscribe_stock', { p_email: val.trim(), p_slug: slug });
      setState(error ? { ok: false, text: rpcMsg(error) } : { ok: true, text: 'Tamam, stoğa girince sana e-posta ile haber vereceğiz.' });
    } catch {
      setState({ ok: false, text: GENERIC });
    }
    setBusy(false);
  }

  return (
    <form className="px px-stock" onSubmit={submit} noValidate>
      <p className="px-stock-t">
        <b>{name}</b> için gelince haber verelim mi?
      </p>
      {state?.ok ? (
        <p className="px-ok" role="status">
          {state.text}
        </p>
      ) : (
        <>
          <div className="px-inline">
            <input type="email" className="px-inp" placeholder="E-posta adresin" autoComplete="email" value={val} onChange={(e) => setEmail(e.target.value)} aria-label="E-posta adresin" />
            <button type="submit" className="px-btn" disabled={busy}>
              {busy ? 'Gönderiliyor…' : 'Gelince haber ver'}
            </button>
          </div>
          {state && (
            <p className="px-err" role="alert">
              {state.text}
            </p>
          )}
        </>
      )}
    </form>
  );
}

// ═══ Yorum yaz ════════════════════════════════════════════════════════
function ReviewForm({ slug, name: productName }: { slug: string; name: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [nm, setNm] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const metaName = typeof user?.user_metadata?.full_name === 'string' ? (user.user_metadata.full_name as string) : '';
  const nameVal = nm ?? metaName;
  const emailVal = email ?? user?.email ?? '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!rating) return setErr('Önce yıldız ver.');
    if (nameVal.trim().length < 2) return setErr('Adını yaz.');
    if (!EMAIL.test(emailVal.trim())) return setErr('Geçerli bir e-posta yaz.');
    if (body.trim().length < 5) return setErr('Yorumunu biraz daha ayrıntılı yaz.');
    setBusy(true);
    setErr('');
    try {
      const { data, error } = await supabase().rpc('submit_review', {
        p_slug: slug,
        p_name: nameVal.trim(),
        p_email: emailVal.trim(),
        p_rating: rating,
        p_title: title.trim(),
        p_body: body.trim(),
      });
      if (error) setErr(rpcMsg(error));
      else if (data === 'var') setErr('Bu ürüne zaten yorum yazdın.');
      else setDone('Teşekkürler, yorumun onaylandıktan sonra yayınlanır.');
    } catch {
      setErr(GENERIC);
    }
    setBusy(false);
  }

  if (done)
    return (
      <p className="px px-ok" role="status">
        {done}
      </p>
    );

  if (!open)
    return (
      <div className="px">
        <button type="button" className="px-btn" onClick={() => setOpen(true)}>
          Yorum yaz
        </button>
      </div>
    );

  return (
    <form className="px px-form" onSubmit={submit} noValidate>
      <LoyaltyHint kind="review" />
      <h3 className="px-form-t">{productName} için yorum yaz</h3>
      <div className="px-field">
        <span className="px-lbl" id="pxRateLbl">
          Puanın
        </span>
        <div className="px-stars-in" role="radiogroup" aria-labelledby="pxRateLbl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} yıldız`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="px-two">
        <label className="px-field">
          <span className="px-lbl">Adın</span>
          <input className="px-inp" value={nameVal} maxLength={60} autoComplete="name" onChange={(e) => setNm(e.target.value)} />
        </label>
        <label className="px-field">
          <span className="px-lbl">E-posta</span>
          <input type="email" className="px-inp" value={emailVal} maxLength={120} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
          <span className="px-hint">Yayınlanmaz; yalnızca yorumunu doğrulamak için.</span>
        </label>
      </div>
      <label className="px-field">
        <span className="px-lbl">Başlık (isteğe bağlı)</span>
        <input className="px-inp" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="px-field">
        <span className="px-lbl">Yorumun</span>
        <textarea className="px-inp" rows={5} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
        <span className="px-hint">{body.length}/2000</span>
      </label>
      {err && (
        <p className="px-err" role="alert">
          {err}
        </p>
      )}
      <div className="px-actions">
        <button type="submit" className="px-btn px-btn-solid" disabled={busy}>
          {busy ? 'Gönderiliyor…' : 'Yorumu gönder'}
        </button>
        <button type="button" className="px-link" onClick={() => setOpen(false)}>
          Vazgeç
        </button>
      </div>
      <p className="px-hint">Yorumlar kontrol edildikten sonra yayınlanır.</p>
    </form>
  );
}
