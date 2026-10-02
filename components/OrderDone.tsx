'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { fetchSettings } from '@/lib/shop';
import { CARD_PENDING_KEY, LAST_ORDER_KEY } from './CheckoutView';
import { writeCart } from '@/lib/cart';
import { OrderBody, type OrderRow } from './OrderParts';

type Placed = OrderRow & { email: string };

export function OrderDone() {
  const [cfg, setCfg] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchSettings()
      .then((s) => setCfg(s.map))
      .catch(() => {});
  }, []);
  const config = { contactEmail: cfg.contact_email || 'garen@demlemedesin.com' };
  const bank = { holder: cfg.bank_holder || '', bankName: cfg.bank_name || '', iban: cfg.bank_iban || '' };

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
  const qs = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => '',
  );
  const durum = new URLSearchParams(qs).get('durum') || '';
  const qno = new URLSearchParams(qs).get('no') || '';
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryErr, setRetryErr] = useState('');
  const order = useMemo<Placed | null | undefined>(() => {
    if (raw === undefined) return undefined;
    try {
      return raw ? (JSON.parse(raw) as Placed) : null;
    } catch {
      return null;
    }
  }, [raw]);

  // Satışı kaynağa (UTM / kısa link) bağlamak için bir kez bildir
  const ono = order?.order_no;
  const total = order?.total;
  const isCard = order?.payment_method === 'kart';
  // Kart ödemesi onaylanınca sepet temizlenir
  useEffect(() => {
    if (durum !== 'ok') return;
    try {
      if (sessionStorage.getItem(CARD_PENDING_KEY)) {
        sessionStorage.removeItem(CARD_PENDING_KEY);
        writeCart([]);
      }
    } catch {
      /* sorun değil */
    }
  }, [durum]);
  useEffect(() => {
    if (!ono) return;
    if (isCard && durum !== 'ok') return; // kart satışı yalnızca ödeme onayında sayılır
    try {
      if (sessionStorage.getItem('dm-tracked-' + ono)) return;
      sessionStorage.setItem('dm-tracked-' + ono, '1');
    } catch {
      /* sorun değil */
    }
    (window as unknown as { dmTrack?: (t: string, e: object) => void }).dmTrack?.('order', { order_no: ono, value: Number(total) });
  }, [ono, total, isCard, durum]);

  async function retry() {
    if (!order) return;
    setRetryBusy(true);
    setRetryErr('');
    try {
      const r = await fetch('/api/odeme/iyzico/baslat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_no: order.order_no, email: order.email }) });
      const j = (await r.json()) as { ok?: boolean; url?: string; error?: string };
      if (j.ok && j.url) {
        window.location.href = j.url;
        return;
      }
      setRetryErr(j.error || 'Ödeme sayfası açılamadı.');
    } catch {
      setRetryErr('Bağlantı hatası. Tekrar dene.');
    }
    setRetryBusy(false);
  }

  if (order === undefined) return <p className="loading">Yükleniyor…</p>;
  if (!order && durum === 'ok')
    return (
      <div className="done-box">
        <p className="eyebrow">Teşekkürler</p>
        {qno && <p className="ono">{qno}</p>}
        <p style={{ margin: 0 }}>Ödemen alındı, siparişini hazırlamaya başlıyoruz. Siparişini numaran ve e-postanla takip edebilirsin.</p>
        <p style={{ marginTop: 16 }}>
          <Link className="link" href="/siparis-takip">
            Sipariş takibi
          </Link>
        </p>
      </div>
    );
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

  const hasIban = !!bank.iban;

  return (
    <>
      <div className="done-box">
        <p className="eyebrow">{isCard && durum !== 'ok' ? 'Ödeme bekleniyor' : 'Teşekkürler'}</p>
        <p className="ono">{order.order_no}</p>
        <p style={{ margin: 0 }}>
          {isCard && durum === 'ok' ? 'Ödemen alındı, siparişin hazırlanıyor. Bu numarayı sipariş takibi için sakla.' : 'Siparişin alındı. Bu numarayı sipariş takibi için sakla.'}
        </p>
      </div>

      {isCard && durum !== 'ok' && (
        <div className="done-box">
          <h2 className="section-h">Ödeme: Kredi / banka kartı</h2>
          <p style={{ margin: '0 0 12px' }}>
            {durum === 'bekliyor'
              ? 'Ödemen doğrulanıyor. Sonuç birkaç dakika içinde siparişine yansır; bu sayfayı kapatabilirsin.'
              : durum === 'tutar'
                ? 'Ödemen alındı ancak otomatik doğrulanamadı. Ekibimiz siparişini elle kontrol edecek; gerekirse seninle iletişime geçeriz.'
                : durum === 'hata'
                  ? 'Ödeme tamamlanamadı. Kartından para çekilmedi. Tekrar deneyebilirsin.'
                  : 'Siparişin oluşturuldu, ödemeyi tamamlamak için kart sayfasına geçebilirsin.'}
          </p>
          {durum !== 'bekliyor' && durum !== 'tutar' && (
            <button type="button" className="btn btn--red" onClick={retry} disabled={retryBusy}>
              {retryBusy ? 'Yönlendiriliyor…' : 'Ödemeyi tamamla'}
            </button>
          )}
          {retryErr && <p className="fld-err">{retryErr}</p>}
        </div>
      )}

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
