'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminProduct } from '@/lib/admin';
import { DAY, kpis, qualityIssues, startOfDay, loadData } from '@/lib/analytics';

type A = { text: string; href: string; tone: 'red' | 'amber' };

/** Yönetici ana ekranı: bugünün hunisi ve aksiyon gerektiren uyarılar. */
export function DashAlerts() {
  const [al, setAl] = useState<A[] | null>(null);
  const [fn, setFn] = useState<[string, number][]>([]);
  useEffect(() => {
    (async () => {
      const sb = supabase();
      const [d, nf] = await Promise.all([loadData(), sb.from('not_found_log').select('path', { count: 'exact', head: true }).gte('last_seen', new Date(Date.now() - 7 * DAY).toISOString())]);
      const out: A[] = [];
      const ps: AdminProduct[] = d.products.filter((p) => p.active);
      const cnt = (k: string) => ps.filter((p) => qualityIssues(p).some((i) => i.key === k)).length;
      const c = (n: number, text: string, href: string, tone: A['tone'] = 'amber') => n > 0 && out.push({ text: `${n} ${text}`, href, tone });
      c(cnt('desc'), 'üründe açıklama eksik', '/admin/kalite');
      c(ps.filter((p) => qualityIssues(p).some((i) => ['mt', 'md', 'url'].includes(i.key))).length, 'üründe SEO bilgisi eksik', '/admin/kalite');
      c(cnt('img'), 'üründe görsel eksik', '/admin/kalite', 'red');
      c(ps.filter((p) => p.stock != null && p.stock > 0 && p.stock <= (((p.data as { crit?: number }).crit) ?? 5)).length, 'ürün kritik stok seviyesinde', '/admin/analiz');
      c(ps.filter((p) => p.stock === 0).length, 'ürün tükendi', '/admin/urunler', 'red');
      c(nf.count ?? 0, 'URL son 7 günde 404 verdi', '/admin/seo');
      c(d.returns.filter((r) => r.status === 'talep').length, 'iade talebi onay bekliyor', '/admin/iadeler');
      const t = kpis(d, { from: startOfDay(), to: startOfDay() + DAY });
      const y = kpis(d, { from: startOfDay() - DAY, to: startOfDay() });
      const w = kpis(d, { from: startOfDay() - 6 * DAY, to: startOfDay() + DAY });
      const pw = kpis(d, { from: startOfDay() - 13 * DAY, to: startOfDay() - 6 * DAY });
      if (pw.abandon > 0 && w.abandon > pw.abandon * 1.15 && w.checkout >= 5) out.push({ text: `Checkout terk oranı yükseldi (%${w.abandon.toFixed(0)}, önceki hafta %${pw.abandon.toFixed(0)})`, href: '/admin/analiz', tone: 'red' });
      if (pw.conv > 0 && w.conv < pw.conv * 0.85 && w.visitors >= 30) out.push({ text: `Conversion rate düştü (%${w.conv.toFixed(1)}, önceki hafta %${pw.conv.toFixed(1)})`, href: '/admin/analiz', tone: 'red' });
      void y;
      setFn([['Ürün görüntüleme', t.visitors], ['Sepete ekleme', t.carts], ['Checkout', t.checkout], ['Satın alma', t.orders]]);
      setAl(out);
    })();
  }, []);
  if (!al) return null;
  const mx = Math.max(...fn.map((x) => x[1]), 1);
  return (
    <div className="grid2 even" style={{ marginBottom: 18 }}>
      <section className="card"><div className="card-h"><h2 className="card-t">Bugünün hunisi</h2></div>
        <div className="card-b" style={{ display: 'grid', gap: 10 }}>
          {fn.map(([l, v], i) => (
            <div key={l}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>{l}</b><span>{v}{i > 0 && fn[i - 1][1] ? ` · %${((v / fn[i - 1][1]) * 100).toFixed(0)}` : ''}</span></div>
              <div style={{ height: 8, background: 'var(--s3)', borderRadius: 6, marginTop: 4 }}><div style={{ width: `${(v / mx) * 100}%`, height: '100%', background: 'var(--ac)', borderRadius: 6 }} /></div></div>
          ))}
        </div></section>
      <section className="card"><div className="card-h"><h2 className="card-t">Aksiyon gerektirenler</h2></div>
        <div className="card-b">
          {al.length === 0 && <p className="hint">Her şey yolunda 🎉</p>}
          {al.map((a) => (
            <Link key={a.text} href={a.href} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', fontSize: 13.5, color: 'inherit', borderBottom: '1px solid var(--bdr)' }}>
              <AlertTriangle size={14} color={a.tone === 'red' ? '#c2410c' : '#b45309'} /> {a.text}
            </Link>
          ))}
        </div></section>
    </div>
  );
}
