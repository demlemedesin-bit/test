import type { Metadata } from 'next';
import { products } from '@/lib/products';
import NavBar from '@/app/components/NavBar';
import ProductGrid from '@/app/components/ProductGrid';

export const metadata: Metadata = {
  title: 'Demleme Shop — Sofra Mağazası',
  description: 'Demleme\'nin el yapımı ürünleri: kupa, tişört, defter ve daha fazlası.',
};

export default function UrunlerPage() {
  return (
    <>
      <NavBar />
      <main style={{ minHeight: '100vh', background: 'var(--cream)', paddingTop: '72px', paddingBottom: '80px' }}>

        {/* Hero banner */}
        <div style={{
          background: 'var(--ink)',
          padding: 'clamp(32px,6vw,56px) var(--pad) clamp(28px,5vw,48px)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ maxWidth: 'var(--wrap)', margin: '0 auto', position: 'relative' }}>
            <p style={{ fontFamily: 'var(--font-mark)', fontSize: '.68rem', letterSpacing: '.2em', opacity: .45, margin: '0 0 10px', color: 'var(--cream-fixed)' }}>
              DEMLEME SHOP
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 6vw, 4rem)',
              margin: '0 0 10px',
              lineHeight: 1.05,
              color: 'var(--cream-fixed)',
            }}>
              Sofra <span style={{ color: '#e07048' }}>Mağazası</span>
            </h1>
            <p style={{ opacity: .6, fontSize: '.9rem', margin: 0, color: 'var(--cream-fixed)', lineHeight: 1.6 }}>
              El yapımı, sofraya yakışan ürünler.
            </p>

            {/* İstatistikler — yatay, sığışık */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '16px' }}>
              {[
                { n: '7', l: 'ürün' },
                { n: '200+', l: 'alışveriş' },
                { n: '4.9★', l: 'puan' },
              ].map(s => (
                <div key={s.l} style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: '#e07048' }}>{s.n}</span>
                  <span style={{ fontSize: '.7rem', color: 'rgba(243,238,225,.45)', fontWeight: 600 }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ürün grid */}
        <div style={{ maxWidth: 'var(--wrap)', margin: '0 auto', padding: '48px var(--pad) 0' }}>
          <ProductGrid products={products} />
        </div>
      </main>
    </>
  );
}
