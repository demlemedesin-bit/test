'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert, Field, emailOk } from './ui';
import { ReturnRequest } from './ReturnRequest';
import { OrderBody, StatusBadge, StatusSteps, dateTr, type OrderRow } from './OrderParts';

export function TrackView({ initialNo = '', initialEmail = '' }: { initialNo?: string; initialEmail?: string }) {
  const [no, setNo] = useState(initialNo);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState<OrderRow | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setOrder(null);
    if (!no.trim() || !emailOk(email)) {
      setErr('Sipariş numaranı ve sipariş verirken kullandığın e-postayı gir.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase().rpc('get_order', { p_order_no: no, p_email: email });
    setBusy(false);
    if (error) {
      setErr('Şu an sorgulanamıyor. Biraz sonra tekrar dene.');
      return;
    }
    if (!data) {
      setErr('Bu bilgilerle eşleşen bir sipariş bulamadık. Numarayı (DM-1001 gibi) ve e-postayı kontrol et.');
      return;
    }
    setOrder(data as OrderRow);
  }

  return (
    <>
      <form className="form" onSubmit={submit} noValidate style={{ maxWidth: 480 }}>
        {err && <Alert kind="err">{err}</Alert>}
        <Field id="order_no" label="Sipariş numarası" value={no} onChange={setNo} placeholder="DM-1001" autoCapitalize="characters" required />
        <Field id="email" label="E-posta" type="email" autoComplete="email" value={email} onChange={setEmail} required />
        <button className="btn btn--solid" type="submit" disabled={busy}>
          {busy ? 'Aranıyor…' : 'Siparişi göster'}
        </button>
      </form>

      {order && (
        <div className="order" style={{ marginTop: 32, maxWidth: 640 }}>
          <div className="order-h">
            <span>
              <b>{order.order_no}</b> <span className="muted">· {dateTr(order.created_at)}</span>
            </span>
            <StatusBadge status={order.status} />
          </div>
          <div className="order-b">
            <StatusSteps status={order.status} payment={order.payment_method} />
            <OrderBody o={order} extra={<ReturnRequest order={order} email={email.trim().toLowerCase()} />} />
          </div>
        </div>
      )}
    </>
  );
}
