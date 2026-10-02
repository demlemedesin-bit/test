'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { AdminProduct } from '@/lib/admin';
import { CHECKS, qualityIssues, seoScore } from '@/lib/analytics';
import { useMenu } from '@/components/admin/Shell';
import { Loading, TopBar } from '@/components/admin/ui';
import { Card, Tabs, Tbl } from '@/components/admin/Tbl';

const TABS = [['ozet', 'Özet'], ['icerik', 'İçerik'], ['katalog', 'Katalog'], ['seo', 'SEO skoru']] as const;

export default function Kalite() {
  const menu = useMenu();
  const [ps, setPs] = useState<AdminProduct[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('ozet');
  const [only, setOnly] = useState('');
  useEffect(() => { supabase().from('products').select('*').order('sort').then(({ data }) => setPs((data ?? []) as AdminProduct[])); }, []);

  const info = useMemo(() => (ps ?? []).map((p) => ({ p, issues: qualityIssues(p), seo: seoScore(p) })), [ps]);
  if (!ps) return (<><TopBar title="Ürün kalitesi" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  const count = (k: string) => info.filter((x) => x.issues.some((i) => i.key === k)).length;
  const seoMissing = info.filter((x) => x.issues.some((i) => ['mt', 'md', 'url'].includes(i.key))).length;
  const avg = info.length ? Math.round(info.reduce((n, x) => n + x.seo.score, 0) / info.length) : 0;
  const link = (slug: string) => <Link href={`/admin/urunler?edit=${slug}`} style={{ color: 'var(--ac)' }}>Düzenle</Link>;

  const kp = [['Toplam ürün', info.length], ['Açıklaması eksik', count('desc')], ['SEO bilgisi eksik', seoMissing], ['Görseli eksik', count('img')], ['Ortalama SEO skoru', `${avg}/100`]];
  const list = (group: 'icerik' | 'katalog') => {
    const checks = CHECKS.filter((c) => c.group === group);
    const rows = info.filter((x) => x.issues.some((i) => i.group === group) && (!only || x.issues.some((i) => i.key === only)));
    return (
      <>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className={`tab${!only ? ' on' : ''}`} onClick={() => setOnly('')}>Hepsi</button>
          {checks.map((c) => <button key={c.key} type="button" className={`tab${only === c.key ? ' on' : ''}`} onClick={() => setOnly(c.key)}>{c.label} ({count(c.key)})</button>)}
        </div>
        <Card title={`${rows.length} üründe sorun var`}>
          <Tbl min={640} cols={[['Ürün', 'minmax(0,1.2fr)'], ['Sorunlar', 'minmax(0,2fr)'], ['', '70px']]}
            rows={rows.map((x) => [x.p.name, x.issues.filter((i) => i.group === group).map((i) => i.label).join(' · '), link(x.p.slug)])} empty="Sorun yok 🎉" />
        </Card>
      </>
    );
  };

  return (
    <>
      <TopBar title="Ürün kalitesi ve SEO" sub="Eksik ve hatalı ürün içeriklerini otomatik tespit eder" onMenu={menu} />
      <div className="adm-scroll"><div className="adm-inner">
        <div className="kpis">{kp.map(([l, v]) => <div className="kpi" key={String(l)}><div className="kpi-top"><span className="kpi-label">{l}</span></div><div className="kpi-val">{v}</div></div>)}</div>
        <Tabs items={TABS} value={tab} onChange={(v) => { setTab(v); setOnly(''); }} />
        {tab === 'ozet' && (
          <Card title="Kontrol listesi" meta="Her satır ürün düzenleyicide düzeltilir">
            <Tbl min={0} cols={[['Kontrol', 'minmax(0,1fr)'], ['Etkilenen ürün', '120px']]} rows={CHECKS.map((c) => [c.label, count(c.key) ? <b key="b" style={{ color: '#c2410c' }}>{count(c.key)}</b> : '0'])} />
          </Card>
        )}
        {tab === 'icerik' && list('icerik')}
        {tab === 'katalog' && list('katalog')}
        {tab === 'seo' && (
          <Card title="Ürün SEO skoru" meta="Meta title · description · URL · schema · ALT · açıklama">
            <Tbl min={820} cols={[['Ürün', 'minmax(0,1.3fr)'], ['Skor', '70px'], ['Title', '60px'], ['Desc.', '60px'], ['URL', '60px'], ['Schema', '70px'], ['ALT', '60px'], ['Açıklama', '80px'], ['', '70px']]}
              rows={[...info].sort((a, b) => a.seo.score - b.seo.score).map((x) => {
                const ok = (b: boolean) => <span key={String(b) + x.p.slug} style={{ color: b ? 'var(--green)' : '#c2410c' }}>{b ? '✓' : '✗'}</span>;
                const c = x.seo.checks;
                return [x.p.name, <b key="s" style={{ color: x.seo.score >= 80 ? 'var(--green)' : x.seo.score >= 50 ? '#b45309' : '#c2410c' }}>{x.seo.score}</b>, ok(c.mt), ok(c.md), ok(c.url), ok(c.schema), ok(c.alt), ok(c.desc), link(x.p.slug)];
              })} />
          </Card>
        )}
      </div></div>
    </>
  );
}
