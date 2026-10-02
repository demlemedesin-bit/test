'use client';

import { useState } from 'react';
import { tl, type Quote } from '@/lib/shop';

/** Kupon kodu alanı + uygulanan kampanya bilgisi. */
export function CouponBox({ code, setCode, quote, busy }: { code: string; setCode: (c: string) => void; quote: Quote | null; busy: boolean }) {
  const [v, setV] = useState('');
  const applied = quote?.coupon;
  return (
    <div className="coupon" style={{ margin: '14px 0' }}>
      {code ? (
        <p className="small" style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            Kupon: <b>{code}</b>
            {quote?.error ? <span style={{ color: 'var(--red, #b3261e)' }}> — {quote.error}</span> : applied && quote && quote.discount > 0 ? <span> — {tl(quote.discount)} indirim</span> : null}
          </span>
          <button type="button" className="btn-text" onClick={() => setCode('')}>
            Kaldır
          </button>
        </p>
      ) : (
        <form
          style={{ display: 'flex', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (v.trim()) {
              setCode(v);
              setV('');
            }
          }}
        >
          <input aria-label="Kupon kodu" placeholder="Kupon kodu" value={v} onChange={(e) => setV(e.target.value.toUpperCase())} maxLength={32} style={{ flex: 1, minWidth: 0 }} />
          <button type="submit" className="btn btn--ghost" disabled={busy || !v.trim()}>
            Uygula
          </button>
        </form>
      )}
      {applied?.auto && !code && quote && quote.discount > 0 && (
        <p className="free-note" style={{ marginTop: 8 }}>
          {applied.name} uygulandı: −{tl(quote.discount)}
        </p>
      )}
    </div>
  );
}
