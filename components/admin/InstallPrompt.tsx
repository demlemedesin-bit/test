'use client';

import { useEffect, useState } from 'react';

// Panel için "Uygulamayı yükle" önerisi. Android/Chrome'da tek dokunuşla yükler,
// iPhone'da Apple buna izin vermediği için adımları gösterir. Kuruluysa ya da kapatıldıysa görünmez.
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = 'dm-admin-install-hide';

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [hide, setHide] = useState(true);

  useEffect(() => {
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      const closedAt = Number(localStorage.getItem(KEY) || 0);
      const recently = closedAt && Date.now() - closedAt < 14 * 24 * 3600 * 1000;
      if (standalone || recently) return;
      const ua = navigator.userAgent;
      const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
      const isMobile = isIos || /Android/.test(ua);
      if (!isMobile) return; // bilgisayarda gösterme
      setIos(isIos);
      setHide(false);
    } catch {
      /* sorun değil */
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIP);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const onInstalled = () => setHide(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hide) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* sorun değil */
    }
    setHide(true);
  };
  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const r = await evt.userChoice.catch(() => null);
    setEvt(null);
    if (r?.outcome === 'accepted') setHide(true);
  };
  // Android'de tarayıcı henüz yükleme olayını vermediyse (ya da başka tarayıcıdaysa) menü yolu gösterilir.
  return (
    <div role="region" aria-label="Uygulamayı yükle" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 60, background: '#1f1b16', color: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 8px 30px rgba(0,0,0,.25)', display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, lineHeight: 1.35 }}>
      <div style={{ flex: 1 }}>
        <b>Paneli uygulama olarak ekle</b>
        <div style={{ opacity: 0.85, marginTop: 2 }}>
          {ios ? 'Safari’de Paylaş simgesine dokun, sonra “Ana Ekrana Ekle”yi seç.' : evt ? 'Ana ekrana eklenir, tam ekran açılır.' : 'Tarayıcı menüsünden (⋮) “Ana ekrana ekle” ya da “Uygulamayı yükle”yi seç.'}
        </div>
      </div>
      {!ios && evt && (
        <button onClick={install} style={{ background: '#fff', color: '#1f1b16', border: 0, borderRadius: 10, padding: '9px 14px', fontWeight: 600 }}>
          Yükle
        </button>
      )}
      <button onClick={close} aria-label="Kapat" style={{ background: 'transparent', color: '#fff', border: 0, fontSize: 20, lineHeight: 1, padding: 6, opacity: 0.8 }}>
        ×
      </button>
    </div>
  );
}
