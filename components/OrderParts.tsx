'use client';

import type { ReactNode } from 'react';
import { tl } from '@/lib/shop';
import { carrierUrl } from '@/lib/carriers';

export const STATUS: Record<string, string> = {
  odeme_bekleniyor: 'Ödeme bekleniyor',
  hazirlaniyor: 'Hazırlanıyor',
  kargoda: 'Kargoda',
  teslim_edildi: 'Teslim edildi',
  iptal: 'İptal edildi',
};

export const PAY: Record<string, string> = { havale: 'Havale / EFT', kapida: 'Kapıda ödeme', kart: 'Kredi/banka kartı' };

export type OrderItem = { name: string; color_name?: string | null; size?: string | null; qty: number; unit_price: number; line_total: number };
export type OrderRow = {
  order_no: string;
  status: string;
  created_at?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  coupon?: string | null;
  total: number;
  payment_method: string;
  full_name?: string;
  tracking_carrier?: string | null;
  tracking_no?: string | null;
  address?: { city?: string; district?: string; address?: string; zip?: string; title?: string };
};

export const dateTr = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export const variant = (i: OrderItem) => [i.color_name, i.size].filter(Boolean).join(' · ');

export function OrderBody({ o, extra }: { o: OrderRow; extra?: ReactNode }) {
  return (
    <>
      <ul>
        {o.items.map((i, k) => (
          <li key={k}>
            <span>
              {i.qty} × {i.name}
              {variant(i) ? <span className="muted"> ({variant(i)})</span> : null}
            </span>
            <span>{tl(Number(i.line_total))}</span>
          </li>
        ))}
      </ul>
      <div className="sum-row muted">
        <span>Ara toplam</span>
        <span>{tl(Number(o.subtotal))}</span>
      </div>
      <div className="sum-row muted">
        <span>Kargo</span>
        <span>{Number(o.shipping) === 0 ? 'Ücretsiz' : tl(Number(o.shipping))}</span>
      </div>
      {Number(o.discount) > 0 && (
        <div className="sum-row muted">
          <span>İndirim{o.coupon ? ` (${o.coupon})` : ''}</span>
          <span>−{tl(Number(o.discount))}</span>
        </div>
      )}
      <div className="sum-row sum-total">
        <span>Toplam</span>
        <span>{tl(Number(o.total))}</span>
      </div>
      <p className="small" style={{ margin: '12px 0 0' }}>
        Ödeme: {PAY[o.payment_method] ?? o.payment_method}
        {o.address?.city ? ` · Teslimat: ${o.address.district ? o.address.district + ', ' : ''}${o.address.city}` : ''}
      </p>
      {o.tracking_no || o.tracking_carrier ? (
        <p className="small" style={{ margin: '6px 0 0' }}>
          Kargo: <b>{[o.tracking_carrier, o.tracking_no].filter(Boolean).join(' · ')}</b>
          {carrierUrl(o.tracking_carrier, o.tracking_no) ? (
            <>
              {' · '}
              <a href={carrierUrl(o.tracking_carrier, o.tracking_no)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                Kargoyu takip et
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {extra}
    </>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge--${status}`}>{STATUS[status] ?? status}</span>;
}

const FLOW = ['odeme_bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim_edildi'];

export function StatusSteps({ status, payment }: { status: string; payment: string }) {
  if (status === 'iptal')
    return (
      <p className="alert alert--err" style={{ marginTop: 16 }}>
        Bu sipariş iptal edildi.
      </p>
    );
  const flow = payment === 'kapida' ? FLOW.slice(1) : FLOW;
  const at = flow.indexOf(status);
  return (
    <ol className="steps">
      {flow.map((s, k) => (
        <li key={s} className={k <= at ? 'done' : ''}>
          {STATUS[s]}
        </li>
      ))}
    </ol>
  );
}
