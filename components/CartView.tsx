'use client';

import Link from 'next/link';
import { useCart, lineKey, MAX_QTY } from '@/lib/cart';
import { tl, usePricedCart } from '@/lib/shop';
import { Alert } from './ui';

export function CartView() {
  const { items, ready, setQty, remove } = useCart();
  const { priced, error, loading } = usePricedCart(items, ready);

  if (!ready) return <p className="loading">Sepetin yükleniyor…</p>;

  if (!items.length)
    return (
      <div className="empty">
        <h2>Sepetin boş</h2>
        <p>Sofranı kurmak için mağazaya göz atabilirsin.</p>
        <a className="btn btn--solid" href="/#magaza">
          Alışverişe başla
        </a>
      </div>
    );

  if (loading) return <p className="loading">Fiyatlar yükleniyor…</p>;
  if (error || !priced) return <Alert kind="err">{error ?? 'Sepet yüklenemedi.'}</Alert>;

  return (
    <div className="shop-grid">
      <div>
        {priced.hasProblem && <Alert kind="err">Sepetinde satın alınamayan ürünler var. Devam etmek için onları kaldır.</Alert>}
        <ul className="lines">
          {priced.lines.map((l) => (
            <li className="line" key={l.key}>
              <div className="line-img">{l.item.img ? <img src={l.item.img} alt="" /> : null}</div>
              <div>
                <p className="line-name">
                  <a href={`/urun/${l.item.slug}`}>{l.item.name}</a>
                </p>
                <p className="line-meta">{l.problem ? '' : `Birim fiyat ${tl(l.unit)}`}</p>
                {l.problem && <p className="line-warn">{l.problem}</p>}
              </div>
              <div className="line-end">
                <div className="qty" role="group" aria-label="Adet">
                  <button type="button" aria-label="Azalt" onClick={() => setQty(lineKey(l.item), l.item.qty - 1)}>
                    –
                  </button>
                  <span aria-live="polite">{l.item.qty}</span>
                  <button type="button" aria-label="Arttır" disabled={l.item.qty >= MAX_QTY} onClick={() => setQty(lineKey(l.item), l.item.qty + 1)}>
                    +
                  </button>
                </div>
                <span className="line-total">{l.problem ? '—' : tl(l.total)}</span>
                <button type="button" className="btn-text" onClick={() => remove(lineKey(l.item))}>
                  Kaldır
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 24 }}>
          <a className="link" href="/#magaza">
            ← Alışverişe devam et
          </a>
        </p>
      </div>

      <aside className="summary" aria-label="Sipariş özeti">
        <h2>Özet</h2>
        <div className="sum-row">
          <span>Ara toplam</span>
          <span>{tl(priced.subtotal)}</span>
        </div>
        <div className="sum-row">
          <span>Kargo</span>
          <span>{priced.subtotal === 0 ? '—' : priced.shipping === 0 ? 'Ücretsiz' : tl(priced.shipping)}</span>
        </div>
        {priced.remainingForFree > 0 && <p className="free-note">{tl(priced.remainingForFree)} daha ekle, kargo ücretsiz olsun.</p>}
        <div className="sum-row sum-total">
          <span>Toplam</span>
          <span>{tl(priced.total)}</span>
        </div>
        <p className="small" style={{ margin: '8px 0 20px' }}>
          Ödeme seçeneğini bir sonraki adımda seçersin.
        </p>
        {priced.hasProblem || priced.subtotal === 0 ? (
          <button className="btn btn--solid btn--block" disabled>
            Ödemeye geç
          </button>
        ) : (
          <Link className="btn btn--solid btn--block" href="/odeme">
            Ödemeye geç
          </Link>
        )}
      </aside>
    </div>
  );
}
