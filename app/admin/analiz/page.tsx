'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadData, PERIODS, kpis, productPerf, brandPerf, customers, campaignPerf, recPerf, REC_LABEL, DAY, startOfDay, type Data } from '@/lib/analytics';
import { tl } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Kpi, Loading, TopBar } from '@/components/admin/ui';
import { AreaChart, Donut } from '@/components/admin/Charts';
import { Activity, Banknote, ShoppingBag, ShoppingCart, Percent, UserPlus, Undo2, Users, Eye, Package } from 'lucide-react';
import { Card, Delta, Tabs, Tbl, n1 } from '@/components/admin/Tbl';

const TABS = [['ozet', 'Özet'], ['urun', 'Ürün performansı'], ['marka', 'Markalar'], ['stok', 'Stok'], ['iade', 'İade'], ['musteri', 'Müşteri'], ['kampanya', 'Kampanya'], ['oneri', 'Öneri performansı']] as const;
type Tab = (typeof TABS)[number][0];
const RETURN_REASONS: Record<string, string> = { beden: 'Beden uymadı', kusurlu: 'Kusurlu / hasarlı', yanlis: 'Yanlış ürün', begenmedi: 'Beğenmedi', gec: 'Geç teslim', diger: 'Diğer' };

export default function Analiz() {
  const menu = useMenu();
  const [d, setD] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>('ozet');
  const [pk, setPk] = useState('30');
  useEffect(() => { loadData().then(setD); }, []);
  const per = PERIODS.find((p) => p.key === pk)!;
  const r = useMemo(() => per.cur(), [per]);
  const pr = useMemo(() => per.prev?.() ?? per.cur(), [per]);

  const k = useMemo(() => (d ? kpis(d, r) : null), [d, r]);
  const kp = useMemo(() => (d ? kpis(d, pr) : null), [d, pr]);
  const rows = useMemo(() => (d ? productPerf(d, r) : []), [d, r]);
  const brands = useMemo(() => (d ? brandPerf(rows, d, r) : []), [d, rows, r]);
  const custs = useMemo(() => (d ? customers(d) : []), [d]);
  const camps = useMemo(() => (d ? campaignPerf(d) : []), [d]);
  const recs = useMemo(() => (d ? recPerf(d, r) : []), [d, r]);

  const ICONS = [<Banknote key="a" size={17} />, <ShoppingBag key="b" size={17} />, <ShoppingCart key="c" size={17} />, <Percent key="d" size={17} />, <Eye key="e" size={17} />, <Package key="f" size={17} />, <Activity key="g" size={17} />, <UserPlus key="h" size={17} />, <Users key="i" size={17} />, <Undo2 key="j" size={17} />];
  const daily = useMemo(() => {
    if (!d) return [];
    const days = Math.min(90, Math.max(1, Math.round((Math.min(r.to, Date.now() + DAY) - r.from) / DAY)));
    return Array.from({ length: days }, (_, i) => {
      const t0 = r.from + i * DAY;
      const os = d.orders.filter((o) => o.status !== 'iptal' && new Date(o.created_at).getTime() >= t0 && new Date(o.created_at).getTime() < t0 + DAY);
      return { label: new Date(t0).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), value: os.reduce((n, o) => n + Number(o.total), 0), note: `${os.length} sipariş` };
    });
  }, [d, r]);

  const body = () => {
    if (!d || !k || !kp) return <Loading />;
    if (tab === 'ozet') {
      const items: [string, string, number, number, boolean?][] = [
        ['Ciro', tl(k.revenue), k.revenue, kp.revenue], ['Sipariş', String(k.orders), k.orders, kp.orders],
        ['Ortalama sepet', tl(k.aov), k.aov, kp.aov], ['Conversion rate', `%${n1(k.conv)}`, k.conv, kp.conv],
        ['Sepete ekleme oranı', `%${n1(k.cartRate)}`, k.cartRate, kp.cartRate], ['Checkout oranı', `%${n1(k.checkoutRate)}`, k.checkoutRate, kp.checkoutRate],
        ['Checkout abandonment', `%${n1(k.abandon)}`, k.abandon, kp.abandon, true], ['Yeni müşteri', String(k.newCust), k.newCust, kp.newCust],
        ['Tekrar müşteri', String(k.repeatCust), k.repeatCust, kp.repeatCust], ['İade oranı', `%${n1(k.returnRate)}`, k.returnRate, kp.returnRate, true],
        ['Satılan adet', String(k.unitsSold), k.unitsSold, kp.unitsSold], ['Ziyaretçi (oturum)', String(k.visitors), k.visitors, kp.visitors],
      ];
      const f = [['Ürün görüntüleme', k.visitors], ['Sepete ekleme', k.carts], ['Checkout', k.checkout], ['Satın alma', k.orders]] as const;
      const mx = Math.max(...f.map((x) => x[1]), 1);
      return (
        <>
          <div className="kpis">
            {items.map(([l, v, c, p, inv], i) => (
              <Kpi key={l} label={l} value={v} tone={(['ac', 'green', 'blue', 'amber'] as const)[i % 4]} icon={ICONS[i % ICONS.length]}
                trend={p ? ((c - p) / p) * 100 * (inv ? -1 : 1) : undefined} sub="önceki dönem" spark={i < 2 ? daily.map((d) => (i === 0 ? d.value : Number(d.note?.split(' ')[0] ?? 0))) : undefined} />
            ))}
          </div>
          <Card title="Günlük ciro" meta={per.label}>
            <div style={{ padding: '14px 16px 6px' }}><AreaChart data={daily} fmt={tl} /></div>
          </Card>
          <div className="grid2 even">
            <Card title="Yeni / tekrar müşteri"><div style={{ padding: 18 }}><Donut size={130} center={{ big: String(k.newCust + k.repeatCust), small: 'müşteri' }} segs={[{ label: 'Yeni', value: k.newCust, color: '#f0674f' }, { label: 'Tekrar', value: k.repeatCust, color: '#25d6a0' }]} /></div></Card>
            <Card title="Dönem özeti"><div style={{ padding: 18, display: 'grid', gap: 8, fontSize: 13.5 }}>
              <div>Satılan adet: <b>{k.unitsSold}</b></div><div>İade tutarı: <b>{tl(k.retAmt)}</b></div><div>Ziyaretçi (oturum): <b>{k.visitors}</b></div><div>Sepete ekleyen: <b>{k.carts}</b> · Checkout: <b>{k.checkout}</b></div>
            </div></Card>
          </div>
          <Card title="Satış hunisi" meta={per.label}>
            <div style={{ padding: 18, display: 'grid', gap: 10 }}>
              {f.map(([l, v], i) => (
                <div key={l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>{l}</b><span>{v}{i > 0 && f[i - 1][1] ? ` · %${n1((v / f[i - 1][1]) * 100)}` : ''}</span></div>
                  <div style={{ height: 10, background: 'var(--s3)', borderRadius: 6, marginTop: 4 }}><div style={{ width: `${(v / mx) * 100}%`, height: '100%', background: 'var(--ac)', borderRadius: 6 }} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Tüm dönemlerin karşılaştırması" meta="Ciro · sipariş · sepet">
            <Tbl min={640} cols={[['Dönem', 'minmax(0,1.4fr)'], ['Ciro', '110px'], ['Sipariş', '80px'], ['Ort. sepet', '100px'], ['Conv.', '70px'], ['Önceki döneme göre', '130px']]}
              rows={PERIODS.map((p) => { const a = kpis(d, p.cur()); const b = kpis(d, p.prev!()); return [p.label, tl(a.revenue), a.orders, tl(a.aov), `%${n1(a.conv)}`, <Delta key="x" cur={a.revenue} prev={b.revenue} />]; })} />
          </Card>
        </>
      );
    }
    if (tab === 'urun') {
      const top = (f: (x: (typeof rows)[number]) => boolean, s: (a: (typeof rows)[number], b: (typeof rows)[number]) => number) => rows.filter(f).sort(s).slice(0, 5);
      const lists: [string, typeof rows, (x: (typeof rows)[number]) => string][] = [
        ['En çok görüntülenen', top((x) => x.views > 0, (a, b) => b.views - a.views), (x) => `${x.views} görüntüleme`],
        ['En çok satan', top((x) => x.sold > 0, (a, b) => b.sold - a.sold), (x) => `${x.sold} adet · ${tl(x.revenue)}`],
        ['Çok görüntülenip satılmayan', top((x) => x.views >= 10 && x.sold === 0, (a, b) => b.views - a.views), (x) => `${x.views} görüntüleme, 0 satış`],
        ['Yüksek sepete ekleme / düşük satış', top((x) => x.carts >= 3 && x.orders / x.carts < 0.3, (a, b) => b.carts - a.carts), (x) => `${x.carts} sepet → ${x.orders} sipariş`],
        ['Yüksek iade oranı', top((x) => x.sold >= 3 && x.retRate >= 15, (a, b) => b.retRate - a.retRate), (x) => `%${n1(x.retRate)} iade`],
        ['Uzun süredir bekleyen stok', top((x) => (x.stock ?? 0) > 0 && (!x.lastSale || Date.now() - x.lastSale > 60 * DAY), (a, b) => (b.stock ?? 0) - (a.stock ?? 0)), (x) => `${x.stock} adet, ${x.lastSale ? Math.floor((Date.now() - x.lastSale) / DAY) + ' gündür satış yok' : 'hiç satış yok'}`],
      ];
      return (
        <>
          <div className="grid2 even">
            {lists.map(([t, l, f]) => (
              <Card key={t} title={t}><Tbl min={0} cols={[['Ürün', 'minmax(0,1fr)'], ['Değer', 'minmax(0,1.2fr)']]} rows={l.map((x) => [x.p.name, f(x)])} empty="Şu an uyarı yok" /></Card>
            ))}
          </div>
          <Card title="Tüm ürünler" meta={per.label}>
            <Tbl min={1000} cols={[['Ürün', 'minmax(0,1.6fr)'], ['Görüntül.', '80px'], ['Sepet', '60px'], ['Sepet %', '70px'], ['Satış', '60px'], ['Ciro', '100px'], ['Conv.', '70px'], ['İade', '60px'], ['İade %', '70px'], ['Stok', '60px']]}
              rows={[...rows].sort((a, b) => b.revenue - a.revenue).map((x) => [x.p.name, x.views, x.carts, `%${n1(x.cartRate)}`, x.sold, tl(x.revenue), `%${n1(x.conv)}`, x.retQty, `%${n1(x.retRate)}`, x.stock ?? '∞'])} />
          </Card>
        </>
      );
    }
    if (tab === 'marka')
      return (
        <Card title="Marka performansı" meta={per.label}>
          <Tbl min={1000} cols={[['Marka', 'minmax(0,1.2fr)'], ['Ciro', '100px'], ['Sipariş', '70px'], ['Adet', '60px'], ['Ort. sepet', '90px'], ['Conv.', '70px'], ['İade %', '70px'], ['Stok', '60px'], ['Devir', '70px'], ['Görüntül.', '80px'], ['Sepet', '60px']]}
            rows={brands.map((b) => [b.brand, tl(b.revenue), b.orders, b.units, tl(b.aov), `%${n1(b.conv)}`, `%${n1(b.retRate)}`, b.stock, n1(b.turnover), b.views, b.carts])} />
        </Card>
      );
    if (tab === 'stok') {
      const act = rows.filter((x) => x.p.active);
      const crit = act.filter((x) => x.stock != null && x.stock <= ((x.p.data as { crit?: number }).crit ?? 5));
      const out = act.filter((x) => x.stock === 0);
      const unsold = act.filter((x) => (x.stock ?? 0) > 0 && !x.lastSale);
      const fast = [...act].filter((x) => x.perDay > 0).sort((a, b) => b.perDay - a.perDay).slice(0, 5);
      const slow = [...act].filter((x) => (x.stock ?? 0) > 0).sort((a, b) => a.perDay - b.perDay).slice(0, 5);
      return (
        <>
          <div className="kpis">
            <div className="kpi"><div className="kpi-top"><span className="kpi-label">Toplam stok</span></div><div className="kpi-val">{act.reduce((n, x) => n + (x.stock ?? 0), 0)}</div></div>
            <div className="kpi"><div className="kpi-top"><span className="kpi-label">Kritik stok</span></div><div className="kpi-val">{crit.length}</div></div>
            <div className="kpi"><div className="kpi-top"><span className="kpi-label">Tükenen</span></div><div className="kpi-val">{out.length}</div></div>
            <div className="kpi"><div className="kpi-top"><span className="kpi-label">Hiç satılmayan</span></div><div className="kpi-val">{unsold.length}</div></div>
          </div>
          <div className="grid2 even">
            <Card title="Hızlı satanlar"><Tbl min={0} cols={[['Ürün', 'minmax(0,1fr)'], ['Günlük', '80px']]} rows={fast.map((x) => [x.p.name, n1(x.perDay)])} empty="Veri yok" /></Card>
            <Card title="Yavaş satanlar"><Tbl min={0} cols={[['Ürün', 'minmax(0,1fr)'], ['Günlük', '80px']]} rows={slow.map((x) => [x.p.name, n1(x.perDay)])} empty="Veri yok" /></Card>
          </div>
          <Card title="Stok durumu ve tahmini bitiş" meta="Son 30 günlük satış hızına göre">
            <Tbl min={760} cols={[['Ürün', 'minmax(0,1.5fr)'], ['Stok', '70px'], ['Günlük hız', '90px'], ['Devir (30g)', '90px'], ['Tahmini bitiş', '150px']]}
              rows={[...act].sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9)).map((x) => [x.p.name, x.stock ?? '∞', n1(x.perDay), n1(x.turnover), x.daysLeft != null ? `${new Date(startOfDay() + x.daysLeft * DAY).toLocaleDateString('tr-TR')} (${x.daysLeft} gün)` : '—'])} />
          </Card>
        </>
      );
    }
    if (tab === 'iade') {
      const rs = d.returns.filter((x) => x.status !== 'red' && new Date(x.created_at).getTime() >= r.from && new Date(x.created_at).getTime() < r.to);
      const total = rs.reduce((n, x) => n + x.amount, 0);
      const by = (key: (x: (typeof rs)[number]) => string) => { const m = new Map<string, { n: number; a: number }>(); rs.forEach((x) => { const c = m.get(key(x)) ?? { n: 0, a: 0 }; c.n += x.qty; c.a += x.amount; m.set(key(x), c); }); return [...m.entries()].sort((a, b) => b[1].a - a[1].a); };
      const pm = new Map(d.products.map((p) => [p.slug, p]));
      const sect = (t: string, l: [string, { n: number; a: number }][]) => <Card key={t} title={t}><Tbl min={0} cols={[['', 'minmax(0,1fr)'], ['Adet', '60px'], ['Tutar', '100px']]} rows={l.map(([k2, v]) => [k2, v.n, tl(v.a)])} empty="Kayıt yok" /></Card>;
      return (
        <>
          <div className="kpis">
            <div className="kpi"><div className="kpi-top"><span className="kpi-label">Toplam iade/değişim</span></div><div className="kpi-val">{rs.length}</div></div>
            <div className="kpi"><div className="kpi-top"><span className="kpi-label">İade tutarı</span></div><div className="kpi-val">{tl(total)}</div></div>
            <div className="kpi"><div className="kpi-top"><span className="kpi-label">İade oranı (ciro)</span></div><div className="kpi-val">%{n1(k.returnRate)}</div></div>
          </div>
          <div className="grid2 even">
            {sect('İade sebepleri', by((x) => RETURN_REASONS[x.reason] ?? x.reason))}
            {sect('Ürün bazlı', by((x) => pm.get(x.product_slug)?.name ?? (x.product_slug || '—')).slice(0, 10))}
            {sect('Marka bazlı', by((x) => { const p = pm.get(x.product_slug); return p ? ((p.data as { brand?: string }).brand || 'Markasız') : '—'; }))}
            {sect('Kategori bazlı', by((x) => pm.get(x.product_slug)?.category ?? '—'))}
          </div>
          <p className="hint">İade kayıtları “İade ve değişim” sayfasından girilir.</p>
        </>
      );
    }
    if (tab === 'musteri') {
      const now = Date.now();
      const active = custs.filter((c) => now - c.last < 30 * DAY);
      const lapsed = custs.filter((c) => now - c.last > 90 * DAY);
      const repeat = custs.filter((c) => c.orders > 1);
      const spent = custs.reduce((n, c) => n + c.spent, 0);
      const orders = custs.reduce((n, c) => n + c.orders, 0);
      return (
        <>
          <div className="kpis">
            {[['Toplam müşteri', custs.length], ['Yeni (dönem)', k.newCust], ['Tekrar (dönem)', k.repeatCust], ['Son 30 gün alışveriş', active.length], ['90+ gündür almayan', lapsed.length], ['Tekrar alım oranı', `%${n1(custs.length ? (repeat.length / custs.length) * 100 : 0)}`], ['Ort. harcama', tl(custs.length ? spent / custs.length : 0)], ['Sipariş sıklığı', n1(custs.length ? orders / custs.length : 0) + ' sipariş/müşteri']].map(([l, v]) => (
              <div className="kpi" key={String(l)}><div className="kpi-top"><span className="kpi-label">{l}</span></div><div className="kpi-val">{v}</div></div>
            ))}
          </div>
          <Card title="En çok alışveriş yapanlar"><Tbl min={600} cols={[['Müşteri', 'minmax(0,1.3fr)'], ['E-posta', 'minmax(0,1.3fr)'], ['Sipariş', '70px'], ['Harcama', '110px'], ['Son sipariş', '110px']]}
            rows={[...custs].sort((a, b) => b.spent - a.spent).slice(0, 15).map((c) => [c.name, c.email, c.orders, tl(c.spent), new Date(c.last).toLocaleDateString('tr-TR')])} /></Card>
        </>
      );
    }
    if (tab === 'kampanya')
      return (
        <Card title="Kampanya / kupon performansı" meta="Önce/sonra: aynı uzunlukta önceki dönemle ciro karşılaştırması">
          <Tbl min={900} cols={[['Kupon', '110px'], ['Sipariş', '70px'], ['Ciro', '100px'], ['İndirim', '90px'], ['Ort. sepet', '90px'], ['Yeni', '60px'], ['Tekrar', '60px'], ['Öncesi → sırası', 'minmax(0,1fr)']]}
            rows={camps.map((c) => [c.code, c.orders, tl(c.revenue), tl(c.discount), tl(c.aov), c.fresh, c.repeat, <span key="a">{tl(c.before)} → {tl(c.during)} <Delta cur={c.during} prev={c.before} /></span>])} empty="Kuponlu sipariş yok" />
        </Card>
      );
    return (
      <>
        <Card title="Öneri modülleri" meta={per.label}>
          <Tbl min={640} cols={[['Modül', 'minmax(0,1.3fr)'], ['Tıklama (ürün görüntüleme)', '170px'], ['Sepete ekleme', '110px'], ['Satış (sipariş)', '110px'], ['Kaynaklı ciro', '110px']]}
            rows={recs.map((x) => [REC_LABEL[x.rec], x.clicks, x.carts, x.orders, tl(x.revenue)])} />
        </Card>
        <p className="hint">“Satış” ve “ciro”: öneriye tıklayan oturumun sonraki 30 dakikasında tamamlanan siparişler (öneri destekli).</p>
      </>
    );
  };

  return (
    <>
      <TopBar title="Analiz ve raporlar" sub="Satış, ürün, marka, stok, iade, müşteri, kampanya" onMenu={menu}>
        <select className="inp" style={{ width: 'auto' }} value={pk} onChange={(e) => setPk(e.target.value)}>{PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner">
        <Tabs items={TABS} value={tab} onChange={setTab} />
        {body()}
      </div></div>
    </>
  );
}
