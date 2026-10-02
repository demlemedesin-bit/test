'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, Ban, Banknote, Download, ShoppingBag, Tag, Truck, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { tl } from '@/lib/admin';
import { downloadCsv } from '@/lib/csv';
import { STATUS } from '@/components/OrderParts';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Kpi, Loading, TopBar } from '@/components/admin/ui';
import './raporlar.css';
import { PageHero } from '@/components/admin/PageHero';

type Summary = { orders: number; revenue: number; discount: number; shipping: number; customers: number; aov: number };
type Sales = {
  summary: Summary;
  cancelled: number;
  daily: { day: string; orders: number; revenue: number }[];
  products: { name: string; slug: string | null; qty: number; revenue: number }[];
  payments: { method: string; orders: number; revenue: number }[];
  cities: { city: string | null; orders: number; revenue: number }[];
  statuses: { status: string; orders: number }[];
  coupons: { name: string; code: string; uses: number; amount: number }[];
  low_stock: { slug: string; name: string; stock: number }[];
};
type SrcRow = { source: string; medium: string; campaign: string; clicks: number; views: number; visitors: number; carts: number; orders: number; revenue: number };

type Preset = 'bugun' | '7' | '30' | 'buay' | 'gecenay' | 'ozel';
const PRESETS: [Preset, string][] = [
  ['bugun', 'Bugün'],
  ['7', 'Son 7 gün'],
  ['30', 'Son 30 gün'],
  ['buay', 'Bu ay'],
  ['gecenay', 'Geçen ay'],
  ['ozel', 'Özel aralık'],
];
const PAY_LABEL: Record<string, string> = { havale: 'Havale / EFT', kapida: 'Kapıda ödeme', kart: 'Kredi / banka kartı' };

/* ── Europe/Istanbul gün sınırları ── */
const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
const todayYmd = () => ymdFmt.format(new Date());
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const diffDays = (a: string, b: string) => {
  const t = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 864e5);
};
/** Yerel (İstanbul) gün başlangıcı -> ISO. */
const iso = (ymd: string) => new Date(`${ymd}T00:00:00+03:00`).toISOString();
const trDay = (ymd: string) => new Date(`${ymd}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

/** [from, to) gün aralığı (to hariç). */
function span(preset: Preset, cf: string, ct: string): { from: string; to: string } | null {
  const t = todayYmd();
  switch (preset) {
    case 'bugun':
      return { from: t, to: addDays(t, 1) };
    case '7':
      return { from: addDays(t, -6), to: addDays(t, 1) };
    case '30':
      return { from: addDays(t, -29), to: addDays(t, 1) };
    case 'buay': {
      const f = t.slice(0, 8) + '01';
      return { from: f, to: addDays(t, 1) };
    }
    case 'gecenay': {
      const f = t.slice(0, 8) + '01';
      const last = addDays(f, -1);
      return { from: last.slice(0, 8) + '01', to: f };
    }
    default:
      if (!cf || !ct || cf > ct) return null;
      return { from: cf, to: addDays(ct, 1) };
  }
}

const num = (v: unknown) => Number(v) || 0;
const pctFmt = (n: number) => n.toFixed(1).replace('.', ',') + '%';
function delta(cur: number, prev: number | undefined): string | undefined {
  if (prev === undefined) return undefined;
  if (prev === 0) return cur > 0 ? '▲ yeni' : '= 0';
  const p = ((cur - prev) / prev) * 100;
  if (Math.abs(p) < 0.05) return '= değişmedi';
  return `${p > 0 ? '▲' : '▼'} ${pctFmt(Math.abs(p))}`;
}

type Data = { cur: Sales; prev: Sales | null; src: SrcRow[] | null; from: string; to: string };

function Chart({ data, from, to, mode }: { data: Sales['daily']; from: string; to: string; mode: 'cubuk' | 'cizgi' }) {
  const days = useMemo(() => {
    const m = new Map(data.map((d) => [String(d.day).slice(0, 10), d]));
    const n = Math.min(400, Math.max(1, diffDays(from, to)));
    return Array.from({ length: n }, (_, i) => {
      const day = addDays(from, i);
      const d = m.get(day);
      return { day, revenue: num(d?.revenue), orders: num(d?.orders) };
    });
  }, [data, from, to]);
  const W = 720;
  const H = 230;
  const L = 52;
  const B = 26;
  const T = 10;
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const iw = W - L - 8;
  const ih = H - B - T;
  const step = iw / days.length;
  const x = (i: number) => L + step * (i + 0.5);
  const y = (v: number) => T + ih - (v / max) * ih;
  const every = Math.max(1, Math.ceil(days.length / 10));
  const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`);
  const tip = (d: (typeof days)[number]) => `${trDay(d.day)}: ${tl(d.revenue)} · ${d.orders} sipariş`;
  return (
    <svg className="rp-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Günlük ciro grafiği">
      {[0, 0.5, 1].map((k) => (
        <g key={k}>
          <line className="rp-grid" x1={L} x2={W - 8} y1={y(max * k)} y2={y(max * k)} />
          <text x={L - 6} y={y(max * k) + 3.5} textAnchor="end">
            {tl(Math.round(max * k))}
          </text>
        </g>
      ))}
      {mode === 'cubuk' ? (
        days.map((d, i) => (
          <rect key={d.day} className="rp-b" x={x(i) - Math.max(1, step * 0.36)} width={Math.max(2, step * 0.72)} y={y(d.revenue)} height={Math.max(d.revenue ? 2 : 0, T + ih - y(d.revenue))} rx={Math.min(4, step * 0.2)}>
            <title>{tip(d)}</title>
          </rect>
        ))
      ) : (
        <>
          <polygon className="rp-a" points={`${x(0)},${T + ih} ${pts.join(' ')} ${x(days.length - 1)},${T + ih}`} />
          <polyline className="rp-l" points={pts.join(' ')} />
          {days.map((d, i) => (
            <circle key={d.day} className="rp-dot" cx={x(i)} cy={y(d.revenue)} r={days.length > 45 ? 2 : 3.5}>
              <title>{tip(d)}</title>
            </circle>
          ))}
        </>
      )}
      {days.map((d, i) =>
        i % every === 0 ? (
          <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle">
            {trDay(d.day)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function Card({ title, meta, onCsv, children, empty }: { title: string; meta?: string; onCsv?: () => void; children: ReactNode; empty?: boolean }) {
  return (
    <section className="card">
      <div className="card-h">
        <h2 className="card-t">{title}</h2>
        {meta && <span className="card-m">{meta}</span>}
        {onCsv && !empty && (
          <button type="button" className="btn ghost" style={{ marginLeft: 'auto', padding: '5px 11px', fontSize: 12.5 }} onClick={onCsv}>
            <Download size={14} /> CSV indir
          </button>
        )}
      </div>
      {empty ? <Empty title="Bu dönemde veri yok" /> : children}
    </section>
  );
}

export default function Reports() {
  const menu = useMenu();
  const [preset, setPreset] = useState<Preset>('30');
  const [cf, setCf] = useState('');
  const [ct, setCt] = useState('');
  const [cmp, setCmp] = useState(false);
  const [mode, setMode] = useState<'cubuk' | 'cizgi'>('cubuk');
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = span(preset, cf, ct);
    if (!r) return;
    setBusy(true);
    const sb = supabase();
    const n = diffDays(r.from, r.to);
    const pf = addDays(r.from, -n);
    const [a, b, s] = await Promise.all([
      sb.rpc('report_sales', { p_from: iso(r.from), p_to: iso(r.to) }),
      cmp ? sb.rpc('report_sales', { p_from: iso(pf), p_to: iso(r.from) }) : Promise.resolve(null),
      sb.rpc('track_report', { p_from: iso(r.from), p_to: iso(r.to) }),
    ]);
    setBusy(false);
    if (a.error || !a.data) return setErr('Rapor yüklenemedi: ' + (a.error?.message ?? 'veri yok'));
    setErr('');
    const sr = !s.error && s.data && Array.isArray((s.data as { rows?: unknown }).rows) ? ((s.data as { rows: SrcRow[] }).rows ?? []) : null;
    setData({ cur: a.data as Sales, prev: b && !b.error && b.data ? (b.data as Sales) : null, src: sr, from: r.from, to: r.to });
  }, [preset, cf, ct, cmp]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const label = data ? `${trDay(data.from)} – ${trDay(addDays(data.to, -1))}` : '';
  const stamp = data ? `${data.from}_${addDays(data.to, -1)}` : '';
  const c = data?.cur;
  const p = data?.prev ?? undefined;
  const sm = c?.summary;
  const pm = p?.summary;
  const maxProd = Math.max(1, ...(c?.products ?? []).map((x) => num(x.revenue)));
  const statTotal = (c?.statuses ?? []).reduce((n, x) => n + num(x.orders), 0);
  const payTotal = (c?.payments ?? []).reduce((n, x) => n + num(x.revenue), 0);

  return (
    <>
      <TopBar title="Raporlar" sub={label} onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner"><PageHero />
          {err && <div className="alert err">{err}</div>}
          <div className="rp-bar">
            <div className="tabs">
              {PRESETS.map(([k, l]) => (
                <button key={k} type="button" className={`tab${preset === k ? ' on' : ''}`} onClick={() => setPreset(k)}>
                  {l}
                </button>
              ))}
            </div>
            {preset === 'ozel' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="inp" type="date" value={cf} max={ct || undefined} onChange={(e) => setCf(e.target.value)} aria-label="Başlangıç tarihi" />
                <span className="cell-muted">–</span>
                <input className="inp" type="date" value={ct} min={cf || undefined} onChange={(e) => setCt(e.target.value)} aria-label="Bitiş tarihi" />
              </div>
            )}
            <label className="rp-cmp">
              <input type="checkbox" checked={cmp} onChange={(e) => setCmp(e.target.checked)} /> Önceki dönemle karşılaştır
            </label>
          </div>
          {preset === 'ozel' && !span(preset, cf, ct) && <div className="alert warn">Başlangıç ve bitiş tarihini seç.</div>}

          {!data || !c || !sm ? (
            !err && <Loading />
          ) : (
            <div style={{ opacity: busy ? 0.6 : 1, transition: 'opacity .15s' }}>
              <div className="kpis" style={{ marginBottom: 18 }}>
                <Kpi label="Ciro" value={tl(num(sm.revenue))} sub={delta(num(sm.revenue), pm && num(pm.revenue)) ?? `kargo dahil · ${tl(num(sm.shipping))} kargo`} tone="green" icon={<Banknote size={17} />} />
                <Kpi label="Sipariş" value={String(num(sm.orders))} sub={delta(num(sm.orders), pm && num(pm.orders)) ?? 'iptaller hariç'} tone="ac" icon={<ShoppingBag size={17} />} />
                <Kpi label="Ortalama sepet" value={tl(num(sm.aov))} sub={delta(num(sm.aov), pm && num(pm.aov)) ?? 'sipariş başına'} tone="blue" icon={<Truck size={17} />} />
                <Kpi label="Toplam indirim" value={tl(num(sm.discount))} sub={delta(num(sm.discount), pm && num(pm.discount)) ?? 'kupon ve kampanyalar'} tone="amber" icon={<Tag size={17} />} />
                <Kpi label="Müşteri" value={String(num(sm.customers))} sub={delta(num(sm.customers), pm && num(pm.customers)) ?? 'tekil e-posta'} tone="blue" icon={<Users size={17} />} />
                <Kpi label="İptal" value={String(num(c.cancelled))} sub={delta(num(c.cancelled), p && num(p.cancelled)) ?? 'iptal edilen sipariş'} tone="red" icon={<Ban size={17} />} />
              </div>
              {p && pm && (
                <p className="hint" style={{ margin: '-6px 0 16px' }}>
                  Önceki dönem ({trDay(addDays(data.from, -diffDays(data.from, data.to)))} – {trDay(addDays(data.from, -1))}): {tl(num(pm.revenue))} ciro, {num(pm.orders)} sipariş.
                </p>
              )}
              {cmp && !p && <div className="alert warn">Önceki dönem verisi alınamadı.</div>}

              <section className="card" style={{ marginBottom: 18 }}>
                <div className="card-h">
                  <h2 className="card-t">Günlük ciro</h2>
                  <span className="card-m">{tl(num(sm.revenue))}</span>
                  <div className="tabs rp-mode">
                    <button type="button" className={`tab${mode === 'cubuk' ? ' on' : ''}`} onClick={() => setMode('cubuk')}>Çubuk</button>
                    <button type="button" className={`tab${mode === 'cizgi' ? ' on' : ''}`} onClick={() => setMode('cizgi')}>Çizgi</button>
                  </div>
                  {c.daily.length > 0 && (
                    <button type="button" className="btn ghost" style={{ padding: '5px 11px', fontSize: 12.5 }} onClick={() => downloadCsv(`gunluk-ciro_${stamp}.csv`, ['gun', 'siparis', 'ciro'], c.daily.map((d) => [String(d.day).slice(0, 10), num(d.orders), num(d.revenue)]))}>
                      <Download size={14} /> CSV indir
                    </button>
                  )}
                </div>
                <div className="card-b">{c.daily.length === 0 ? <Empty title="Bu dönemde sipariş yok" /> : <Chart data={c.daily} from={data.from} to={data.to} mode={mode} />}</div>
              </section>

              <div className="grid2 even">
                <Card title="En çok satan ürünler" meta="ciroya göre" empty={c.products.length === 0} onCsv={() => downloadCsv(`urunler_${stamp}.csv`, ['urun', 'slug', 'adet', 'ciro'], c.products.map((x) => [x.name, x.slug, num(x.qty), num(x.revenue)]))}>
                  <div className="card-b rank">
                    {c.products.slice(0, 10).map((x) => (
                      <div className="rank-r" key={(x.slug ?? '') + x.name}>
                        <span className="cell-clip">{x.name}</span>
                        <span className="num">{tl(num(x.revenue))} <span className="cell-muted" style={{ fontWeight: 400 }}>· {num(x.qty)} adet</span></span>
                        <div className="rank-bar"><i style={{ width: `${(num(x.revenue) / maxProd) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Ödeme yöntemi" empty={c.payments.length === 0} onCsv={() => downloadCsv(`odeme-yontemi_${stamp}.csv`, ['yontem', 'siparis', 'ciro'], c.payments.map((x) => [PAY_LABEL[x.method] ?? x.method, num(x.orders), num(x.revenue)]))}>
                  <div className="card-b rank">
                    {c.payments.map((x) => (
                      <div className="rank-r" key={x.method}>
                        <span>{PAY_LABEL[x.method] ?? x.method}</span>
                        <span className="num">{tl(num(x.revenue))} <span className="cell-muted" style={{ fontWeight: 400 }}>· {num(x.orders)} sipariş · {payTotal ? pctFmt((num(x.revenue) / payTotal) * 100) : '—'}</span></span>
                        <div className="rank-bar"><i style={{ width: `${payTotal ? (num(x.revenue) / payTotal) * 100 : 0}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid2 even">
                <Card title="Şehirler" meta="ilk 15" empty={c.cities.length === 0} onCsv={() => downloadCsv(`sehirler_${stamp}.csv`, ['sehir', 'siparis', 'ciro'], c.cities.map((x) => [x.city || '(belirtilmemiş)', num(x.orders), num(x.revenue)]))}>
                  <div className="tbl">
                    <div className="tr hd" style={{ gridTemplateColumns: 'minmax(0,1fr) 80px 110px' }}><span>Şehir</span><span>Sipariş</span><span>Ciro</span></div>
                    {c.cities.map((x, i) => (
                      <div className="tr" key={i} style={{ gridTemplateColumns: 'minmax(0,1fr) 80px 110px' }}>
                        <span className="cell-strong cell-clip">{x.city || '(belirtilmemiş)'}</span><span className="num">{num(x.orders)}</span><span className="num">{tl(num(x.revenue))}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Sipariş durumları" meta="iptaller dahil" empty={c.statuses.length === 0} onCsv={() => downloadCsv(`durumlar_${stamp}.csv`, ['durum', 'siparis'], c.statuses.map((x) => [STATUS[x.status] ?? x.status, num(x.orders)]))}>
                  <div className="card-b rank">
                    {c.statuses.map((x) => (
                      <div className="rank-r" key={x.status}>
                        <span>{STATUS[x.status] ?? x.status}</span>
                        <span className="num">{num(x.orders)} <span className="cell-muted" style={{ fontWeight: 400 }}>· {statTotal ? pctFmt((num(x.orders) / statTotal) * 100) : '—'}</span></span>
                        <div className="rank-bar"><i style={{ width: `${statTotal ? (num(x.orders) / statTotal) * 100 : 0}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid2 even">
                <Card title="Kupon performansı" empty={c.coupons.length === 0} onCsv={() => downloadCsv(`kuponlar_${stamp}.csv`, ['kupon', 'kod', 'kullanim', 'indirim_tutari'], c.coupons.map((x) => [x.name, x.code, num(x.uses), num(x.amount)]))}>
                  <div className="tbl">
                    <div className="tr hd" style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 80px 100px' }}><span>Kupon</span><span>Kod</span><span>Kullanım</span><span>İndirim</span></div>
                    {c.coupons.map((x) => (
                      <div className="tr" key={x.code} style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 80px 100px' }}>
                        <span className="cell-strong cell-clip">{x.name}</span><span className="mono cell-clip">{x.code}</span><span className="num">{num(x.uses)}</span><span className="num">{tl(num(x.amount))}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <section className="card">
                  <div className="card-h">
                    <h2 className="card-t">Düşük stok</h2>
                    <span className="card-m">stok ≤ 5</span>
                    <Link href="/admin/urunler" className="link-btn" style={{ marginLeft: 'auto' }}>Ürünlere git</Link>
                  </div>
                  {c.low_stock.length === 0 ? (
                    <Empty title="Stok sorunu yok" text="Tüm aktif ürünlerin stoğu yeterli." />
                  ) : (
                    c.low_stock.map((x) => (
                      <Link href="/admin/urunler" className="attn" key={x.slug}>
                        <span className={`kpi-ic ${num(x.stock) === 0 ? 'tone-red' : 'tone-amber'}`}><AlertTriangle size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b className="cell-clip" style={{ display: 'block' }}>{x.name}</b>
                          <span className="m">{num(x.stock) === 0 ? 'Tükendi' : `${num(x.stock)} adet kaldı`}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </section>
              </div>

              {data.src && (
                <section className="card" style={{ marginBottom: 18 }}>
                  <div className="card-h">
                    <h2 className="card-t">Kaynak performansı</h2>
                    <span className="card-m">takip (UTM) verisi</span>
                    {data.src.length > 0 && (
                      <button type="button" className="btn ghost" style={{ marginLeft: 'auto', padding: '5px 11px', fontSize: 12.5 }} onClick={() => downloadCsv(`kaynaklar_${stamp}.csv`, ['kaynak', 'mecra', 'kampanya', 'tiklama', 'goruntuleme', 'ziyaretci', 'sepet', 'siparis', 'ciro'], (data.src ?? []).map((x) => [x.source, x.medium, x.campaign, num(x.clicks), num(x.views), num(x.visitors), num(x.carts), num(x.orders), num(x.revenue)]))}>
                        <Download size={14} /> CSV indir
                      </button>
                    )}
                  </div>
                  {data.src.length === 0 ? (
                    <Empty title="Bu dönemde takip verisi yok" />
                  ) : (
                    <div className="rp-scroll">
                      <div className="tbl" style={{ minWidth: 700 }}>
                        <div className="tr hd" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.2fr) 80px 70px 70px 100px' }}>
                          <span>Kaynak</span><span>Mecra</span><span>Kampanya</span><span>Ziyaretçi</span><span>Sepet</span><span>Sipariş</span><span>Ciro</span>
                        </div>
                        {data.src.map((x, i) => (
                          <div className="tr" key={i} style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.2fr) 80px 70px 70px 100px' }}>
                            <span className="cell-strong cell-clip">{x.source}</span><span className="cell-muted cell-clip">{x.medium || '—'}</span><span className="cell-clip">{x.campaign || '—'}</span>
                            <span className="num">{num(x.visitors)}</span><span className="num">{num(x.carts)}</span><span className="num">{num(x.orders)}</span><span className="num">{tl(num(x.revenue))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
