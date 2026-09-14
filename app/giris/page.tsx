'use client';
import { useState } from 'react';
import { login, register } from '@/lib/auth';
import NavBar from '@/app/components/NavBar';

export default function GirisPage() {
  const [tab, setTab] = useState<'giris' | 'kayit'>('giris');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Tüm alanları doldurun.'); return; }
    if (tab === 'kayit' && !name) { setError('Adınızı girin.'); return; }
    try {
      if (tab === 'giris') login(email, password);
      else register(name, email, password);
      const ref = new URLSearchParams(window.location.search).get('ref');
      window.location.href = ref || '/hesap';
    } catch {
      setError('Bir hata oluştu.');
    }
  };

  const inp: React.CSSProperties = {
    width:'100%',padding:'14px 16px',borderRadius:'12px',
    border:'1.5px solid var(--line)',background:'var(--cream)',
    fontFamily:'var(--font-body)',fontSize:'1rem',color:'var(--ink)',
    outline:'none',boxSizing:'border-box',
  };

  return (
    <>
      <NavBar />
      <main style={{minHeight:'100vh',background:'var(--cream)',paddingTop:'72px',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px var(--pad)'}}>
        <div style={{width:'100%',maxWidth:'420px'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:'2rem',color:'var(--ink)'}}>demleme</span>
            <p style={{color:'var(--ink-soft)',marginTop:'8px',fontSize:'.95rem'}}>Sofranıza hoş geldiniz</p>
          </div>

          {/* Tab */}
          <div style={{display:'flex',background:'var(--paper)',borderRadius:'40px',padding:'4px',marginBottom:'28px',border:'1px solid var(--line)'}}>
            {(['giris','kayit'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex:1,padding:'10px',borderRadius:'36px',border:'none',cursor:'pointer',
                fontFamily:'var(--font-body)',fontWeight:600,fontSize:'.9rem',
                background: tab === t ? 'var(--ink)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--ink-soft)',
                transition:'all .2s',
              }}>
                {t === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
            ))}
          </div>

          <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:'14px',background:'var(--paper)',borderRadius:'20px',padding:'28px',boxShadow:'var(--shadow-sm)'}}>
            {tab === 'kayit' && (
              <input style={inp} type="text" placeholder="Adınız Soyadınız" value={name} onChange={e => setName(e.target.value)} />
            )}
            <input style={inp} type="email" placeholder="E-posta adresiniz" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={inp} type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} />

            {error && <p style={{color:'var(--rust)',fontSize:'.85rem',margin:0}}>{error}</p>}

            <button type="submit" style={{
              background:'var(--ink)',color:'#fff',border:'none',borderRadius:'40px',
              padding:'15px',cursor:'pointer',fontWeight:700,fontSize:'1rem',
              fontFamily:'var(--font-body)',marginTop:'4px',transition:'background .2s',
            }}>
              {tab === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>

            {tab === 'giris' && (
              <p style={{textAlign:'center',fontSize:'.82rem',color:'var(--ink-faint)',margin:0}}>
                Demo modda her e-posta/şifre kabul edilir.
              </p>
            )}
          </form>

          <p style={{textAlign:'center',marginTop:'20px',fontSize:'.85rem',color:'var(--ink-soft)'}}>
            {tab === 'giris' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
            <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--rust)',fontWeight:600,fontSize:'.85rem',fontFamily:'var(--font-body)',padding:0}} onClick={() => setTab(tab === 'giris' ? 'kayit' : 'giris')}>
              {tab === 'giris' ? 'Kayıt ol' : 'Giriş yap'}
            </button>
          </p>
        </div>
      </main>
    </>
  );
}
