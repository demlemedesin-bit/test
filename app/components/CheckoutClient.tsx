'use client';
import { useState, useEffect } from 'react';
import { getCart, cartTotal, clearCart, type CartItem } from '@/lib/cart';

type Step = 'adres' | 'kargo' | 'odeme' | 'onay';

const CITIES = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Gaziantep','Mersin','Kayseri','Eskişehir','Trabzon','Samsun','Denizli','Diyarbakır','Diğer'];

export default function CheckoutClient() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>('adres');
  const [mounted, setMounted] = useState(false);

  // Adres
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [adres, setAdres] = useState('');
  const [il, setIl] = useState('');
  const [ilce, setIlce] = useState('');
  const [posta, setPosta] = useState('');
  const [adresBilgi, setAdresBilgi] = useState('');

  // Kargo
  const [kargo, setKargo] = useState<'standart'|'hizli'>('standart');

  // Ödeme
  const [kartNo, setKartNo] = useState('');
  const [kartAd, setKartAd] = useState('');
  const [skt, setSkt] = useState('');
  const [cvv, setCvv] = useState('');
  const [odemeYontemi, setOdemeYontemi] = useState<'kart'|'kapida'>('kart');

  useEffect(() => {
    setMounted(true);
    setCart(getCart());
  }, []);

  if (!mounted) return null;

  const ara = cartTotal(cart);
  const kargoFiyat = ara >= 200 ? 0 : (kargo === 'hizli' ? 79 : 39);
  const toplam = ara + kargoFiyat;

  const steps: {key: Step; label: string}[] = [
    {key:'adres', label:'Adres'},
    {key:'kargo', label:'Kargo'},
    {key:'odeme', label:'Ödeme'},
    {key:'onay', label:'Onay'},
  ];
  const stepIdx = steps.findIndex(s => s.key === step);

  const inputStyle = {
    width:'100%', border:'1.5px solid var(--line)', borderRadius:'10px',
    padding:'12px 14px', fontSize:'.92rem', fontFamily:'var(--font-body)',
    background:'var(--paper)', color:'var(--ink)', outline:'none',
    boxSizing:'border-box' as const, transition:'border .2s',
  };
  const labelStyle = {
    fontSize:'.75rem', fontWeight:700, letterSpacing:'.06em',
    color:'var(--ink-faint)', marginBottom:'6px', display:'block' as const,
  };
  const btnPrimary = {
    background:'var(--ink)', color:'#fff', border:'none', borderRadius:'40px',
    padding:'15px 32px', fontWeight:700, fontSize:'1rem', cursor:'pointer',
    fontFamily:'var(--font-body)', transition:'background .2s',
  };

  // Format kart no
  const fmtKart = (v: string) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fmtSkt  = (v: string) => {
    const d = v.replace(/\D/g,'').slice(0,4);
    return d.length > 2 ? d.slice(0,2)+'/'+d.slice(2) : d;
  };

  if (step === 'onay') {
    return (
      <div style={{maxWidth:'520px',margin:'60px auto',padding:'40px var(--pad)',textAlign:'center'}}>
        <div style={{
          width:72,height:72,borderRadius:'50%',background:'var(--green)',
          display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',
        }}>
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12l5 5L19 7"/>
          </svg>
        </div>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:'2rem',marginBottom:'12px'}}>Siparişin Alındı!</h1>
        <p style={{color:'var(--ink-soft)',marginBottom:'8px'}}>Sipariş onayı <b>{email}</b> adresine gönderildi.</p>
        <p style={{color:'var(--ink-soft)',marginBottom:'32px',fontSize:'.9rem'}}>Tahmini teslimat: <b>{kargo === 'hizli' ? '1-2 iş günü' : '2-4 iş günü'}</b></p>
        <div style={{background:'var(--paper)',borderRadius:'16px',padding:'24px',textAlign:'left',marginBottom:'28px',border:'1px solid var(--line)'}}>
          <p style={{fontWeight:700,marginBottom:'12px'}}>Sipariş Özeti</p>
          {cart.map(c => (
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',fontSize:'.9rem',marginBottom:'6px',color:'var(--ink-soft)'}}>
              <span>{c.name} × {c.qty}</span>
              <span>₺{(c.price*c.qty).toLocaleString('tr-TR')}</span>
            </div>
          ))}
          <div style={{borderTop:'1px solid var(--line)',marginTop:'12px',paddingTop:'12px',display:'flex',justifyContent:'space-between',fontWeight:700}}>
            <span>Toplam</span><span>₺{toplam.toLocaleString('tr-TR')}</span>
          </div>
        </div>
        <a href="/" onClick={() => clearCart()} style={{...btnPrimary, display:'inline-block', textDecoration:'none'}}>Ana Sayfaya Dön</a>
      </div>
    );
  }

  return (
    <div style={{maxWidth:'1000px',margin:'0 auto',padding:'40px var(--pad)'}}>

      {/* Başlık */}
      <div style={{marginBottom:'32px'}}>
        <p style={{fontFamily:'var(--font-mark)',fontSize:'.72rem',letterSpacing:'.16em',color:'var(--ink-faint)',marginBottom:'8px'}}>DEMLEME SHOP</p>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(1.8rem,4vw,2.8rem)',margin:0}}>Sipariş Tamamla</h1>
      </div>

      {/* Step bar */}
      <div style={{display:'flex',gap:'0',marginBottom:'40px',borderBottom:'1px solid var(--line)'}}>
        {steps.filter(s => s.key !== 'onay').map((s, i) => (
          <div key={s.key} style={{
            padding:'12px 20px 12px 0', fontSize:'.82rem', fontWeight:700,
            color: i <= stepIdx ? 'var(--rust)' : 'var(--ink-faint)',
            borderBottom: i === stepIdx ? '2px solid var(--rust)' : '2px solid transparent',
            marginBottom:'-1px', cursor: i < stepIdx ? 'pointer' : 'default',
            transition:'color .2s',
          }} onClick={() => i < stepIdx && setStep(s.key)}>
            <span style={{
              display:'inline-flex',alignItems:'center',justifyContent:'center',
              width:20,height:20,borderRadius:'50%',marginRight:8,fontSize:'.7rem',
              background: i < stepIdx ? 'var(--rust)' : i === stepIdx ? 'var(--rust)' : 'var(--line)',
              color: i <= stepIdx ? '#fff' : 'var(--ink-faint)',
            }}>{i < stepIdx ? '✓' : i+1}</span>
            {s.label}
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'32px',alignItems:'start'}} className="checkout-grid">

        {/* SOL: Form */}
        <div>

          {/* ADRES */}
          {step === 'adres' && (
            <div style={{background:'var(--paper)',borderRadius:'20px',padding:'28px',boxShadow:'var(--shadow-sm)'}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'24px'}}>Teslimat Adresi</h2>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                <div>
                  <label style={labelStyle}>AD</label>
                  <input style={inputStyle} value={ad} onChange={e=>setAd(e.target.value)} placeholder="Adınız" />
                </div>
                <div>
                  <label style={labelStyle}>SOYAD</label>
                  <input style={inputStyle} value={soyad} onChange={e=>setSoyad(e.target.value)} placeholder="Soyadınız" />
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                <div>
                  <label style={labelStyle}>TELEFON</label>
                  <input style={inputStyle} value={tel} onChange={e=>setTel(e.target.value)} placeholder="0555 000 00 00" type="tel" />
                </div>
                <div>
                  <label style={labelStyle}>E-POSTA</label>
                  <input style={inputStyle} value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@email.com" type="email" />
                </div>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={labelStyle}>ADRES</label>
                <textarea style={{...inputStyle,minHeight:'80px',resize:'vertical'}} value={adres} onChange={e=>setAdres(e.target.value)} placeholder="Mahalle, cadde, sokak, bina no, daire no" />
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                <div>
                  <label style={labelStyle}>İL</label>
                  <select style={{...inputStyle,appearance:'none'}} value={il} onChange={e=>setIl(e.target.value)}>
                    <option value="">Seçiniz</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>İLÇE</label>
                  <input style={inputStyle} value={ilce} onChange={e=>setIlce(e.target.value)} placeholder="İlçe" />
                </div>
                <div>
                  <label style={labelStyle}>POSTA KODU</label>
                  <input style={inputStyle} value={posta} onChange={e=>setPosta(e.target.value)} placeholder="34000" maxLength={5} />
                </div>
              </div>

              <div style={{marginBottom:'24px'}}>
                <label style={labelStyle}>ADRES BAŞLIĞI (İSTEĞE BAĞLI)</label>
                <input style={inputStyle} value={adresBilgi} onChange={e=>setAdresBilgi(e.target.value)} placeholder="Ev, İş, vb." />
              </div>

              <button style={{
                ...btnPrimary,
                opacity: (!ad||!soyad||!tel||!email||!adres||!il||!ilce) ? 0.5 : 1,
              }}
                onClick={() => {
                  if(!ad||!soyad||!tel||!email||!adres||!il||!ilce){
                    alert('Lütfen tüm zorunlu alanları doldurun.');
                    return;
                  }
                  setStep('kargo');
                }}
              >
                Kargoya Geç →
              </button>
            </div>
          )}

          {/* KARGO */}
          {step === 'kargo' && (
            <div style={{background:'var(--paper)',borderRadius:'20px',padding:'28px',boxShadow:'var(--shadow-sm)'}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'24px'}}>Kargo Seçimi</h2>

              {[
                {key:'standart' as const, label:'Standart Teslimat', sure:'2-4 iş günü', fiyat: ara >= 200 ? 'Ücretsiz' : '₺39', icon:'📦'},
                {key:'hizli' as const, label:'Hızlı Teslimat', sure:'1-2 iş günü', fiyat:'₺79', icon:'⚡'},
              ].map(opt => (
                <div key={opt.key} onClick={() => setKargo(opt.key)} style={{
                  border: kargo===opt.key ? '2px solid var(--rust)' : '1.5px solid var(--line)',
                  borderRadius:'14px', padding:'18px 20px', marginBottom:'14px',
                  cursor:'pointer', transition:'all .2s',
                  background: kargo===opt.key ? 'rgba(var(--rust-rgb,139,58,26),.04)' : 'transparent',
                  display:'flex', alignItems:'center', gap:'16px',
                }}>
                  <span style={{fontSize:'1.5rem'}}>{opt.icon}</span>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:700,margin:0,fontSize:'.95rem'}}>{opt.label}</p>
                    <p style={{margin:0,fontSize:'.82rem',color:'var(--ink-soft)'}}>{opt.sure}</p>
                  </div>
                  <span style={{fontWeight:700,color: opt.fiyat==='Ücretsiz' ? 'var(--green)' : 'var(--ink)'}}>{opt.fiyat}</span>
                  <div style={{
                    width:20,height:20,borderRadius:'50%',border:'2px solid',
                    borderColor: kargo===opt.key ? 'var(--rust)' : 'var(--line)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    {kargo===opt.key && <div style={{width:10,height:10,borderRadius:'50%',background:'var(--rust)'}}/>}
                  </div>
                </div>
              ))}

              {/* Adres özeti */}
              <div style={{background:'var(--cream-deep)',borderRadius:'12px',padding:'16px',marginTop:'20px',marginBottom:'24px',fontSize:'.85rem',color:'var(--ink-soft)'}}>
                <p style={{fontWeight:700,color:'var(--ink)',marginBottom:'4px',fontSize:'.82rem',letterSpacing:'.06em'}}>TESLİMAT ADRESİ</p>
                <p style={{margin:0}}>{ad} {soyad} · {tel}</p>
                <p style={{margin:0}}>{adres}, {ilce} / {il} {posta}</p>
                <button onClick={()=>setStep('adres')} style={{background:'none',border:'none',color:'var(--rust)',cursor:'pointer',fontSize:'.82rem',fontWeight:700,padding:'4px 0 0',fontFamily:'var(--font-body)'}}>
                  Değiştir
                </button>
              </div>

              <div style={{display:'flex',gap:'12px'}}>
                <button style={{...btnPrimary,background:'var(--paper)',color:'var(--ink)',border:'1.5px solid var(--line)'}} onClick={()=>setStep('adres')}>← Geri</button>
                <button style={btnPrimary} onClick={()=>setStep('odeme')}>Ödemeye Geç →</button>
              </div>
            </div>
          )}

          {/* ÖDEME */}
          {step === 'odeme' && (
            <div style={{background:'var(--paper)',borderRadius:'20px',padding:'28px',boxShadow:'var(--shadow-sm)'}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'24px'}}>Ödeme</h2>

              {/* Yöntem seç */}
              <div style={{display:'flex',gap:'12px',marginBottom:'24px'}}>
                {([['kart','💳 Kredi / Banka Kartı'],['kapida','🏠 Kapıda Ödeme']] as [typeof odemeYontemi, string][]).map(([k,l]) => (
                  <button key={k} onClick={()=>setOdemeYontemi(k)} style={{
                    flex:1, padding:'12px', borderRadius:'12px', cursor:'pointer',
                    border: odemeYontemi===k ? '2px solid var(--rust)' : '1.5px solid var(--line)',
                    background: odemeYontemi===k ? 'rgba(139,58,26,.04)' : 'var(--paper)',
                    fontFamily:'var(--font-body)', fontWeight:600, fontSize:'.88rem',
                    color: odemeYontemi===k ? 'var(--rust)' : 'var(--ink)',
                    transition:'all .2s',
                  }}>{l}</button>
                ))}
              </div>

              {odemeYontemi === 'kart' && (<>
                {/* Kart önizleme */}
                <div style={{
                  background:'linear-gradient(135deg,var(--ink),#3a3a3a)',
                  borderRadius:'16px', padding:'24px', marginBottom:'24px',
                  color:'#fff', fontFamily:'monospace',
                }}>
                  <p style={{fontSize:'.7rem',opacity:.7,margin:'0 0 16px',letterSpacing:'.1em'}}>DEMLEME SHOP</p>
                  <p style={{fontSize:'1.3rem',letterSpacing:'.12em',margin:'0 0 16px',minHeight:'1.6em'}}>
                    {kartNo || '•••• •••• •••• ••••'}
                  </p>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'.78rem'}}>
                    <div><p style={{opacity:.6,margin:0,fontSize:'.65rem'}}>KART SAHİBİ</p><p style={{margin:0}}>{kartAd||'AD SOYAD'}</p></div>
                    <div><p style={{opacity:.6,margin:0,fontSize:'.65rem'}}>SON KUL.</p><p style={{margin:0}}>{skt||'AA/YY'}</p></div>
                  </div>
                </div>

                <div style={{marginBottom:'16px'}}>
                  <label style={labelStyle}>KART NUMARASI</label>
                  <input style={inputStyle} value={kartNo} onChange={e=>setKartNo(fmtKart(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} />
                </div>
                <div style={{marginBottom:'16px'}}>
                  <label style={labelStyle}>KART ÜZERİNDEKİ İSİM</label>
                  <input style={inputStyle} value={kartAd} onChange={e=>setKartAd(e.target.value.toUpperCase())} placeholder="AD SOYAD" />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
                  <div>
                    <label style={labelStyle}>SON KULLANMA</label>
                    <input style={inputStyle} value={skt} onChange={e=>setSkt(fmtSkt(e.target.value))} placeholder="AA/YY" maxLength={5} />
                  </div>
                  <div>
                    <label style={labelStyle}>CVV</label>
                    <input style={inputStyle} value={cvv} onChange={e=>setCvv(e.target.value.replace(/\D/g,'').slice(0,3))} placeholder="•••" maxLength={3} type="password" />
                  </div>
                </div>

                {/* Güvenlik rozeti */}
                <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'24px',padding:'12px',background:'var(--cream-deep)',borderRadius:'10px'}}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"/><path d="M9 12l2 2 4-4"/></svg>
                  <span style={{fontSize:'.78rem',color:'var(--ink-soft)'}}>256-bit SSL şifrelemesi ile güvenli ödeme</span>
                </div>
              </>)}

              {odemeYontemi === 'kapida' && (
                <div style={{background:'var(--cream-deep)',borderRadius:'12px',padding:'20px',marginBottom:'24px'}}>
                  <p style={{fontWeight:700,marginBottom:'8px'}}>Kapıda Ödeme Bilgisi</p>
                  <p style={{color:'var(--ink-soft)',fontSize:'.9rem',margin:0}}>Kapıda ödeme için +₺15 hizmet bedeli uygulanır. Nakit veya kredi kartı ile ödeme yapabilirsiniz.</p>
                </div>
              )}

              <div style={{display:'flex',gap:'12px'}}>
                <button style={{...btnPrimary,background:'var(--paper)',color:'var(--ink)',border:'1.5px solid var(--line)'}} onClick={()=>setStep('kargo')}>← Geri</button>
                <button style={{...btnPrimary,flex:1}} onClick={()=>{clearCart(); setStep('onay');}}>
                  {odemeYontemi==='kart' ? `₺${toplam.toLocaleString('tr-TR')} Öde` : 'Siparişi Tamamla'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SAĞ: Özet */}
        <div style={{background:'var(--paper)',borderRadius:'20px',padding:'24px',boxShadow:'var(--shadow-sm)',position:'sticky',top:'24px'}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.15rem',marginBottom:'20px'}}>Sipariş Özeti</h2>

          {cart.map(item => (
            <div key={item.id} style={{display:'flex',gap:'12px',alignItems:'center',marginBottom:'14px'}}>
              <div style={{width:48,height:48,borderRadius:'10px',background:'var(--cream-deep)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{color:item.color,width:'28px',height:'28px',display:'block'}} dangerouslySetInnerHTML={{__html:item.svgIcon}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:600,fontSize:'.85rem',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</p>
                <p style={{fontSize:'.78rem',color:'var(--ink-faint)',margin:0}}>× {item.qty}</p>
              </div>
              <span style={{fontWeight:700,fontSize:'.9rem',color:'var(--rust)',flexShrink:0}}>₺{(item.price*item.qty).toLocaleString('tr-TR')}</span>
            </div>
          ))}

          <div style={{borderTop:'1px solid var(--line)',paddingTop:'16px',marginTop:'4px',display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.88rem',color:'var(--ink-soft)'}}>
              <span>Ara toplam</span><span>₺{ara.toLocaleString('tr-TR')}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.88rem',color:'var(--ink-soft)'}}>
              <span>Kargo</span>
              <span style={{color:kargoFiyat===0?'var(--green)':undefined}}>
                {kargoFiyat===0 ? 'Ücretsiz 🎉' : `₺${kargoFiyat}`}
              </span>
            </div>
            {odemeYontemi==='kapida' && (
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'.88rem',color:'var(--ink-soft)'}}>
                <span>Kapıda ödeme bedeli</span><span>₺15</span>
              </div>
            )}
            <div style={{borderTop:'1px solid var(--line)',paddingTop:'12px',display:'flex',justifyContent:'space-between',fontFamily:'var(--font-display)',fontSize:'1.15rem',fontWeight:700}}>
              <span>Toplam</span>
              <span>₺{(toplam + (odemeYontemi==='kapida'?15:0)).toLocaleString('tr-TR')}</span>
            </div>
          </div>

          <div style={{marginTop:'20px',borderTop:'1px solid var(--line)',paddingTop:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
            {[
              {icon:'🔒', t:'Güvenli ödeme'},
              {icon:'📦', t:`${kargo==='hizli'?'1-2':'2-4'} iş günü teslimat`},
              {icon:'↩️', t:'14 gün koşulsuz iade'},
            ].map(b => (
              <p key={b.t} style={{fontSize:'.78rem',color:'var(--ink-faint)',margin:0,display:'flex',gap:'6px',alignItems:'center'}}>
                <span>{b.icon}</span>{b.t}
              </p>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
