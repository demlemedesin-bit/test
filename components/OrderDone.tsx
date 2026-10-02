'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import config from '@/content/shop-config.json';
import { LAST_ORDER_KEY } from './CheckoutView';
import { OrderBody, type OrderRow } from './OrderParts';

type Placed = OrderRow & { email: string };

export function OrderDone() {
  // Sunucuda undefined (yükleniyor), tarayıcıda kayıtlı sipariş ya da null
  const raw = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(LAST_ORDER_KEY);
      } catch {
        return null;
      }
    },
    () => undefined,
  );
  const order = useMemo<Placed | null | undefined>(() => {
    if (raw === undefined) return undefined;
    try {
      return raw ? (JSON.parse(raw) as Placed) : null;
    } catch {
      return null;
    }
  }, [raw]);

  if (order === undefined) return <p className="loading">Yükleniyor…</p>;
  if (!order)
    return (
      <div className="empty">
        <h2>Siparişini bulamadık</h2>
        <p>Az önce verdiğin bir sipariş varsa durumunu sipariş numarası ve e-postanla öğrenebilirsin.</p>
        <Link className="btn btn--solid" href="/siparis-takip">
          Sipariş takibi
        </Link>
      </div>
    );

  const bank = config.bank;
  const hasIban = !!bank.iban;

  return (
    <>
      <div className="done-box">
        <p className="eyebrow">Teşekkürler</p>
        <p className="ono">{order.order_no}</p>
        <p style={{ margin: 0 }}>
          Siparişin alındı. Bu numarayı sipariş takibi için sakla.
        </p>
      </div>

      {order.payment_method === 'havale' && (
        <div className="done-box">
          <h2 className="section-h">Ödeme: Havale / EFT</h2>
          <p style={{ margin: '0 0 8px' }}>
            Tutarı <b>{Number(order.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</b> olarak gönder, açıklamaya sipariş numaranı (<b>{order.order_no}</b>) yaz. Ödemen onaylanınca siparişin hazırlanır.
          </p>
          {hasIban ? (
            <dl className="kv">
              {bank.holder && (
                <>
                  <dt>Hesap sahibi</dt>
                  <dd>{bank.holder}</dd>
                </>
              )}
              {bank.bankName && (
                <>
                  <dt>Banka</dt>
                  <dd>{bank.bankName}</dd>
                </>
              )}
              <dt>IBAN</dt>
              <dd>{bank.iban}</dd>
            </dl>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Hesap bilgileri için sipariş numaranla birlikte{' '}
              <a className="link" href={`mailto:${config.contactEmail}?subject=${encodeURIComponent('Havale bilgisi ' + order.order_no)}`}>
                {config.contactEmail}
              </a>{' '}
              adresine yazman yeterli.
            </p>
          )}
        </div>
      )}
      {order.payment_method === 'kapida' && (
        <div className="done-box">
          <h2 className="section-h">Ödeme: Kapıda</h2>
          <p style={{ margin: 0 }}>Siparişin hazırlanıp kargoya verilir; ödemeyi ürünler sana ulaştığında yaparsın.</p>
        </div>
      )}

      <div className="summary" style={{ position: 'static' }}>
        <h2>Sipariş özeti</h2>
        <OrderBody o={order} />
      </div>

      <p style={{ marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <a className="link" href="/#magaza">
          Alışverişe devam et
        </a>
        <Link className="link" href="/siparis-takip">
          Sipariş takibi
        </Link>
        <Link className="link" href="/hesabim">
          Siparişlerim
        </Link>
      </p>
    </>
  );
}
