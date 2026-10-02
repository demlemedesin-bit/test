'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, ShoppingBag, Clock, PackageCheck, AlertTriangle, ArrowRight, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, useAdmin, type AdminOrder, type AdminProduct } from '@/lib/admin';
import { STATUS } from '@/components/OrderParts';
import { useMenu } from '@/components/admin/Shell';
import { AreaChart, Donut, HBars } from '@/components/admin/Charts';
import { DashAlerts } from '@/components/admin/Alerts';
import { Empty, Kpi, Loading, STATUS_TONE, TopBar } from '@/components/admin/ui';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function FullDashboard() {
  const menu = useMenu();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const sb = supabase();
    const [o, p] = await Promise.all([
      sb.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
      sb.from('products').select('*').order('sort'),
    ]);
    if (o.error || p.error) {
      setErr('Veriler yüklenemedi. Sayfayı yenile.');
      return;
    }
    setErr('');
    setOrders((o.data ?? []) as AdminOrder[]);
    setProducts((p.data ?? []) as AdminProduct[]);
  }, []);

  useEffect(() => {
    // ilk yükleme + 60 sn'de bir yenile
    const first = setTimeout(load, 0);
    const t = setInterval(load, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const s = useMemo(() => {
    const live = (orders ?? []).filter((o) => o.status !== 'iptal');
    const now = new Date();
    const today = dayKey(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const todayOrders = live.filter((o) => dayKey(new Date(o.created_at)) === today);
    const month = live.filter((o) => new Date(o.created_at).getTime() >= monthStart);
    const pay = (orders ?? []).filter((o) => o.status === 'odeme_bekleniyor');
    const ship = (orders ?? []).filter((o) => o.status === 'hazirlaniyor');
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
      const k = dayKey(d);
      const list = live.filter((o) => dayKey(new Date(o.created_at)) === k);
      return { label: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), total: list.reduce((n, o) => n + Number(o.total), 0), count: list.length };
    });
    const sold = new Map<string, { name: string; qty: number; sum: number }>();
    const since = now.getTime() - 30 * 86400000;
    live
      .filter((o) => new Date(o.created_at).getTime() >= since)
      .forEach((o) =>
        o.items.forEach((i) => {
          const k = i.name;
          const r = sold.get(k) ?? { name: k, qty: 0, sum: 0 };
          r.qty += i.qty;
          r.sum += Number(i.line_total);
          sold.set(k, r);
        }),
      );
    const since30 = orders ? now.getTime() - 30 * 86400000 : 0;
    const last30 = (orders ?? []).filter((o) => new Date(o.created_at).getTime() >= since30);
    const stLabel: Record<string, [string, string]> = { odeme_bekleniyor: ['Ödeme bekliyor', '#f3ad4a'], hazirlaniyor: ['Hazırlanıyor', '#5aaefc'], kargoda: ['Kargoda', '#f0674f'], teslim_edildi: ['Teslim edildi', '#25d6a0'], iptal: ['İptal', '#6c6c85'] };
    const statusSegs = Object.entries(stLabel).map(([k, [label, color]]) => ({ label, color, value: last30.filter((o) => o.status === k).length }));
    const payMap = new Map<string, number>();
    last30.filter((o) => o.status !== 'iptal').forEach((o) => payMap.set(o.payment_method, (payMap.get(o.payment_method) ?? 0) + Number(o.total)));
    const payName: Record<string, string> = { havale: 'Havale / EFT', kapida: 'Kapıda ödeme', kart: 'Kredi kartı' };
    const payRows = [...payMap.entries()].map(([k, v]) => ({ label: payName[k] ?? k, value: v })).sort((a, b) => b.value - a.value);
    const w1 = days.slice(7).reduce((n, d) => n + d.total, 0), w0 = days.slice(0, 7).reduce((n, d) => n + d.total, 0);
    const trend = w0 ? ((w1 - w0) / w0) * 100 : w1 ? 100 : 0;
    const lowStock = products.filter((p) => p.active && !p.soon && p.stock != null && p.stock <= 5);
    return {
      todayCount: todayOrders.length,
      todaySum: todayOrders.reduce((n, o) => n + Number(o.total), 0),
      monthSum: month.reduce((n, o) => n + Number(o.total), 0),
      monthCount: month.length,
      pay,
      ship,
      days,
      statusSegs,
      payRows,
      trend,
      top: [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
      lowStock,
      avg: month.length ? month.reduce((n, o) => n + Number(o.total), 0) / month.length : 0,
    };
  }, [orders, products]);

  const max = Math.max(...s.days.map((d) => d.total), 1);
  const topMax = Math.max(...s.top.map((t) => t.qty), 1);

  return (
    <>
      <TopBar title="Genel bakış" sub={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner">
          {err && <div className="alert err">{err}</div>}
          {!orders ? (
            <Loading />
          ) : (
            <>
              <DashAlerts />
              <div className="kpis">
                <Kpi label="Bugün" value={String(s.todayCount)} sub={`${tl(s.todaySum)} ciro`} tone="ac" icon={<ShoppingBag size={17} />} spark={s.days.map((d) => d.count)} />
                <Kpi label="Bu ay ciro" value={tl(s.monthSum)} sub={`${s.monthCount} sipariş · ort. ${tl(Math.round(s.avg))}`} tone="green" icon={<Banknote size={17} />} spark={s.days.map((d) => d.total)} trend={s.trend} />
                <Kpi label="Ödeme bekleyen" value={String(s.pay.length)} sub={tl(s.pay.reduce((n, o) => n + Number(o.total), 0))} tone="amber" icon={<Clock size={17} />} />
                <Kpi label="Hazırlanacak" value={String(s.ship.length)} sub="kargoya verilecek" tone="blue" icon={<PackageCheck size={17} />} />
              </div>

              <div className="grid2">
                <section className="card">
                  <div className="card-h">
                    <h2 className="card-t">Son 14 gün ciro</h2>
                    <span className="card-m">{tl(s.days.reduce((n, d) => n + d.total, 0))}</span>
                  </div>
                  <div className="card-b">
                    <AreaChart data={s.days.map((d) => ({ label: d.label, value: d.total, note: `${d.count} sipariş` }))} fmt={tl} />
                  </div>
                </section>

                <section className="card">
                  <div className="card-h">
                    <h2 className="card-t">Dikkat gerekenler</h2>
                  </div>
                  {!s.pay.length && !s.ship.length && !s.lowStock.length ? (
                    <Empty title="Her şey yolunda" text="Bekleyen iş yok." icon={<Wallet size={28} strokeWidth={1.5} />} />
                  ) : (
                    <div>
                      {s.pay.length > 0 && (
                        <Link href="/admin/siparisler?durum=odeme_bekleniyor" className="attn">
                          <span className="kpi-ic tone-amber"><Clock size={16} /></span>
                          <div style={{ flex: 1 }}>
                            <b>{s.pay.length} siparişin ödemesi bekleniyor</b>
                            <span className="m">Havale geldiyse “Ödeme alındı” de</span>
                          </div>
                          <ArrowRight size={16} color="var(--tx3)" />
                        </Link>
                      )}
                      {s.ship.length > 0 && (
                        <Link href="/admin/siparisler?durum=hazirlaniyor" className="attn">
                          <span className="kpi-ic tone-blue"><PackageCheck size={16} /></span>
                          <div style={{ flex: 1 }}>
                            <b>{s.ship.length} sipariş kargoya hazır</b>
                            <span className="m">Takip numarasını girip kargoya ver</span>
                          </div>
                          <ArrowRight size={16} color="var(--tx3)" />
                        </Link>
                      )}
                      {s.lowStock.map((p) => (
                        <Link key={p.slug} href="/admin/urunler" className="attn">
                          <span className="kpi-ic tone-red"><AlertTriangle size={16} /></span>
                          <div style={{ flex: 1 }}>
                            <b>{p.name}</b>
                            <span className="m">{p.stock === 0 ? 'Stok tükendi' : `Stokta ${p.stock} adet kaldı`}</span>
                          </div>
                          <ArrowRight size={16} color="var(--tx3)" />
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="grid2 even">
                <section className="card">
                  <div className="card-h"><h2 className="card-t">Sipariş durumları</h2><span className="card-m">son 30 gün</span></div>
                  <div className="card-b">
                    <Donut size={150} center={{ big: String(s.statusSegs.reduce((n, x) => n + x.value, 0)), small: 'sipariş' }} segs={s.statusSegs} />
                  </div>
                </section>
                <section className="card">
                  <div className="card-h"><h2 className="card-t">Ödeme yöntemleri</h2><span className="card-m">son 30 gün · ciro</span></div>
                  <div className="card-b"><HBars rows={s.payRows} fmt={tl} /></div>
                </section>
              </div>

              <div className="grid2">
                <section className="card">
                  <div className="card-h">
                    <h2 className="card-t">Son siparişler</h2>
                    <Link href="/admin/siparisler" className="card-m link-btn">Tümü</Link>
                  </div>
                  {orders.length === 0 ? (
                    <Empty title="Henüz sipariş yok" text="İlk sipariş geldiğinde burada görünür." />
                  ) : (
                    <div className="tbl">
                      {orders.slice(0, 7).map((o) => (
                        <Link href={`/admin/siparisler?no=${o.order_no}`} className="tr click cols-mini" key={o.id}>
                          <span className="mono">{o.order_no}</span>
                          <span className="cell-clip">{o.full_name}</span>
                          <span className="num hide-m">{tl(o.total)}</span>
                          <span>
                            <span className={`badge ${STATUS_TONE[o.status]}`}>{STATUS[o.status]}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                <section className="card">
                  <div className="card-h">
                    <h2 className="card-t">Çok satanlar</h2>
                    <span className="card-m">son 30 gün</span>
                  </div>
                  {s.top.length === 0 ? (
                    <Empty title="Veri yok" text="Satış oldukça burada sıralanır." />
                  ) : (
                    <div className="card-b rank">
                      {s.top.map((t) => (
                        <div className="rank-r" key={t.name}>
                          <span className="cell-clip">{t.name}</span>
                          <b className="num">{t.qty} adet</b>
                          <div className="rank-bar"><i style={{ width: `${(t.qty / topMax) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              <p className="cell-muted" style={{ textAlign: 'center' }}>Son güncelleme: {dt(new Date().toISOString(), true)} · iptal edilen siparişler ciroya dahil değildir</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const menu = useMenu();
  const { perms, loading } = useAdmin();
  if (loading) return <Loading />;
  if (perms.includes('orders') && perms.includes('products')) return <FullDashboard />;
  return (
    <>
      <TopBar title="Hoş geldin" onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner">
          <Empty title="Panele hoş geldin" text="Sol menüden yetkin olan bölümlere geçebilirsin." />
        </div>
      </div>
    </>
  );
}
