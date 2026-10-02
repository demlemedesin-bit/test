'use client';

import { useMemo, type ReactNode } from 'react';
import { Banknote, Boxes, CircleDollarSign, Clock, PackageCheck, PackageX, ShoppingBag, TrendingUp, UserCheck, UserPlus, Users, AlertTriangle } from 'lucide-react';
import { AreaChart, Donut, HBars, type Pt } from './Charts';
import { Kpi } from './ui';
import { tl, type AdminOrder, type AdminProduct, type Customer } from '@/lib/admin';

const DAY = 86400000;
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Son n gün için günlük toplamlar (iptaller hariç). */
function series(rows: { at: string; v: number }[], n: number, now: number): Pt[] {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = key(new Date(r.at));
    m.set(k, (m.get(k) ?? 0) + r.v);
  });
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now - (n - 1 - i) * DAY);
    return { label: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), value: m.get(key(d)) ?? 0 };
  });
}

export function Card({ title, meta, children, className = '' }: { title: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      <div className="card-h">
        <span className="card-t">{title}</span>
        {meta && <span className="card-m">{meta}</span>}
      </div>
      <div className="card-b">{children}</div>
    </div>
  );
}

const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);

export function OrdersInsight({ orders, now }: { orders: AdminOrder[]; now: number }) {
  const d = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'iptal');
    const rev = series(live.map((o) => ({ at: o.created_at, v: Number(o.total) })), 14, now);
    const cnt = series(live.map((o) => ({ at: o.created_at, v: 1 })), 14, now);
    const cur = rev.slice(7).reduce((n, p) => n + p.value, 0);
    const prev = rev.slice(0, 7).reduce((n, p) => n + p.value, 0);
    const total = live.reduce((n, o) => n + Number(o.total), 0);
    const by = (s: string) => orders.filter((o) => o.status === s).length;
    return { rev, cnt, trend: pct(cur, prev), total, live: live.length, aov: live.length ? total / live.length : 0, wait: by('odeme_bekleniyor'), prep: by('hazirlaniyor'), ship: by('kargoda'), done: by('teslim_edildi'), cancel: by('iptal') };
  }, [orders, now]);
  return (
    <>
      <div className="kpis">
        <Kpi label="Toplam ciro" value={tl(d.total)} sub="iptaller hariç" tone="ac" icon={<Banknote size={17} />} spark={d.rev.map((p) => p.value)} trend={d.trend} />
        <Kpi label="Sipariş" value={String(d.live)} sub={`${d.cancel} iptal`} tone="green" icon={<ShoppingBag size={17} />} spark={d.cnt.map((p) => p.value)} />
        <Kpi label="Ortalama sepet" value={tl(d.aov)} sub="sipariş başına" tone="blue" icon={<TrendingUp size={17} />} />
        <Kpi label="Bekleyen iş" value={String(d.wait + d.prep)} sub={`${d.wait} ödeme · ${d.prep} hazırlık`} tone="amber" icon={<Clock size={17} />} />
      </div>
      <div className="grid2">
        <Card title="Son 14 gün ciro" meta={tl(d.rev.reduce((n, p) => n + p.value, 0))}>
          <AreaChart data={d.rev} height={200} fmt={tl} />
        </Card>
        <Card title="Durum dağılımı" meta={`${orders.length} sipariş`}>
          <Donut size={138} center={{ big: String(orders.length), small: 'sipariş' }} segs={[
            { label: 'Ödeme bekliyor', value: d.wait, color: 'var(--amber)' },
            { label: 'Hazırlanıyor', value: d.prep, color: 'var(--blue)' },
            { label: 'Kargoda', value: d.ship, color: 'var(--ac)' },
            { label: 'Teslim edildi', value: d.done, color: 'var(--green)' },
            { label: 'İptal', value: d.cancel, color: 'var(--tx3)' },
          ]} />
        </Card>
      </div>
    </>
  );
}

export function ProductsInsight({ list }: { list: AdminProduct[] }) {
  const d = useMemo(() => {
    const act = list.filter((p) => p.active && !p.soon);
    const low = list.filter((p) => p.stock !== null && p.stock > 0 && p.stock <= 5);
    const out = list.filter((p) => p.stock === 0);
    const ok = list.filter((p) => p.stock !== null && p.stock > 5);
    const unl = list.filter((p) => p.stock === null);
    const worth = list.reduce((n, p) => n + (p.stock ?? 0) * Number(p.price), 0);
    const top = [...list].filter((p) => p.stock !== null).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)).slice(0, 5);
    return { act, low, out, ok, unl, worth, top, soon: list.filter((p) => p.soon).length, hidden: list.filter((p) => !p.active).length };
  }, [list]);
  return (
    <>
      <div className="kpis">
        <Kpi label="Toplam ürün" value={String(list.length)} sub={`${d.soon} yakında · ${d.hidden} gizli`} tone="ac" icon={<Boxes size={17} />} />
        <Kpi label="Satışta" value={String(d.act.length)} sub="yayında ve satın alınabilir" tone="green" icon={<PackageCheck size={17} />} />
        <Kpi label="Kritik stok" value={String(d.low.length)} sub="5 adet ve altı" tone="amber" icon={<AlertTriangle size={17} />} />
        <Kpi label="Tükenen" value={String(d.out.length)} sub={`stok değeri ${tl(d.worth)}`} tone="red" icon={<PackageX size={17} />} />
      </div>
      <div className="grid2 even">
        <Card title="Stok durumu" meta={`${list.length} ürün`}>
          <Donut size={138} center={{ big: String(list.length), small: 'ürün' }} segs={[
            { label: 'Yeterli', value: d.ok.length, color: 'var(--green)' },
            { label: 'Kritik', value: d.low.length, color: 'var(--amber)' },
            { label: 'Tükendi', value: d.out.length, color: 'var(--red)' },
            { label: 'Sınırsız', value: d.unl.length, color: 'var(--blue)' },
          ]} />
        </Card>
        <Card title="En az stoklu ürünler" meta="adet">
          {d.top.length ? <HBars rows={d.top.map((p) => ({ label: p.name, value: p.stock ?? 0 }))} /> : <p className="muted">Stok takibi yapılan ürün yok.</p>}
        </Card>
      </div>
    </>
  );
}

export function CustomersInsight({ list, now }: { list: Customer[]; now: number }) {
  const d = useMemo(() => {
    const buyers = list.filter((c) => c.orders > 0);
    const rep = buyers.filter((c) => c.orders > 1).length;
    const fresh = list.filter((c) => c.joined_at && now - new Date(c.joined_at).getTime() < 30 * DAY).length;
    const top = [...list].sort((a, b) => Number(b.spent) - Number(a.spent)).filter((c) => Number(c.spent) > 0).slice(0, 5);
    const rev = series(list.filter((c) => c.joined_at).map((c) => ({ at: c.joined_at as string, v: 1 })), 14, now);
    return { buyers: buyers.length, rep, one: buyers.length - rep, never: list.length - buyers.length, fresh, top, rev, rate: buyers.length ? (rep / buyers.length) * 100 : 0, avg: buyers.length ? list.reduce((n, c) => n + Number(c.spent), 0) / buyers.length : 0 };
  }, [list, now]);
  return (
    <>
      <div className="kpis">
        <Kpi label="Toplam müşteri" value={String(list.length)} sub={`${d.buyers} alışveriş yapan`} tone="ac" icon={<Users size={17} />} spark={d.rev.map((p) => p.value)} />
        <Kpi label="Yeni (30 gün)" value={String(d.fresh)} sub="son üyelikler" tone="green" icon={<UserPlus size={17} />} />
        <Kpi label="Tekrar alım" value={`%${d.rate.toFixed(0)}`} sub={`${d.rep} müşteri 2+ sipariş`} tone="blue" icon={<UserCheck size={17} />} />
        <Kpi label="Müşteri başı harcama" value={tl(d.avg)} sub="alışveriş yapanlar" tone="amber" icon={<CircleDollarSign size={17} />} />
      </div>
      <div className="grid2 even">
        <Card title="Müşteri dağılımı" meta={`${list.length} kişi`}>
          <Donut size={138} center={{ big: `%${d.rate.toFixed(0)}`, small: 'tekrar' }} segs={[
            { label: 'Tekrar eden', value: d.rep, color: 'var(--green)' },
            { label: 'Tek sipariş', value: d.one, color: 'var(--ac)' },
            { label: 'Siparişsiz', value: d.never, color: 'var(--tx3)' },
          ]} />
        </Card>
        <Card title="En çok harcayanlar" meta="toplam ₺">
          {d.top.length ? <HBars rows={d.top.map((c) => ({ label: c.name || c.email, value: Number(c.spent) }))} fmt={tl} /> : <p className="muted">Henüz harcama yok.</p>}
        </Card>
      </div>
    </>
  );
}
