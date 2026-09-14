import type { Metadata } from 'next';
import NavBar from '@/app/components/NavBar';
import CartContent from '@/app/components/CartContent';

export const metadata: Metadata = {
  title: 'Sepetim — Demleme Shop',
};

export default function SepetPage() {
  return (
    <>
      <NavBar />
      <main style={{minHeight:'100vh', background:'var(--cream)', paddingTop:'72px', paddingBottom:'80px'}}>
        <div style={{maxWidth:'900px', margin:'0 auto', padding:'40px var(--pad)'}}>
          <div style={{marginBottom:'32px'}}>
            <p style={{fontFamily:'var(--font-mark)', fontSize:'.72rem', letterSpacing:'.16em', color:'var(--ink-faint)', marginBottom:'8px'}}>DEMLEME SHOP</p>
            <h1 style={{fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,4vw,2.8rem)', margin:0, color:'var(--ink)'}}>Sepetim</h1>
          </div>
          <CartContent />
        </div>
      </main>
    </>
  );
}
