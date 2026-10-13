'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Dev = { label: string | null; last_ok_at: string | null; last_error: string | null; here: boolean };
type St = { configured: boolean; devices: number; thisDevice: boolean; list: Dev[] };
type TestRes = { ok: boolean; results?: { label: string | null; ok: boolean; status?: number; error?: string }[]; error?: string };

const b64 = (s: string) => {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Cihaz';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Tarayıcı';
  const app = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true ? ' (uygulama)' : '';
  return `${os} · ${br}${app}`;
}

async function call(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await supabase().auth.getSession();
  const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok && !j.error) j.error = `Sunucu hatası (${r.status})`;
  return j;
}

export function PushSettings({ toast }: { toast: (t: string, err?: boolean) => void }) {
  const [support, setSupport] = useState<'yok' | 'ios-uygulama' | 'tamam' | null>(null);
  const [perm, setPerm] = useState<NotificationPermission>('default');
  const [st, setSt] = useState<St | null>(null);
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<TestRes | null>(null);

  const refresh = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/admin');
      const sub = await reg?.pushManager.getSubscription();
      const j = (await call({ action: 'status', endpoint: sub?.endpoint ?? '' })) as unknown as St & { ok?: boolean };
      if (j.ok) setSt(j);
    } catch {
      /* sorun değil */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const ua = navigator.userAgent;
      const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!ok) setSupport(ios && !standalone ? 'ios-uygulama' : 'yok');
      else setSupport('tamam');
      if ('Notification' in window) setPerm(Notification.permission);
      if (ok) refresh();
    }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  async function enable() {
    setBusy(true);
    setTest(null);
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== 'granted') {
        toast('Bildirim izni verilmedi. Tarayıcı ayarlarından siteye izin vermen gerekiyor.', true);
        return;
      }
      const k = (await fetch('/api/push', { cache: 'no-store' }).then((r) => r.json())) as { ok?: boolean; key?: string; error?: string };
      if (!k.ok || !k.key) throw new Error(k.error || 'Anahtar alınamadı');
      const reg = await navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' });
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) });
      const j = await call({ action: 'subscribe', subscription: sub.toJSON(), label: deviceLabel() });
      if (!j.ok) throw new Error(String(j.error || 'Kaydedilemedi'));
      toast('Bildirimler açıldı. Şimdi test gönder.');
      await refresh();
    } catch (e) {
      toast('Açılamadı: ' + ((e as Error).message || 'bilinmeyen hata'), true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setTest(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/admin');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await call({ action: 'unsubscribe', endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      toast('Bu cihazda bildirimler kapatıldı.');
      await refresh();
    } catch (e) {
      toast('Kapatılamadı: ' + ((e as Error).message || 'hata'), true);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setTest(null);
    try {
      setTest((await call({ action: 'test' })) as unknown as TestRes);
    } finally {
      setBusy(false);
      refresh();
    }
  }

  const on = !!st?.thisDevice && perm === 'granted';

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-h">
        <h2 className="card-t">Sipariş bildirimleri</h2>
        {on ? <Bell size={16} color="var(--tx3)" /> : <BellOff size={16} color="var(--tx3)" />}
      </div>
      <div className="card-b">
        <p className="hint" style={{ marginTop: 0 }}>
          Yeni sipariş gelince bu cihaza anlık bildirim düşer. Havale ve kapıda ödeme siparişleri oluşunca, kartlı siparişler ödeme onaylanınca bildirilir. Her cihazda ayrıca açman gerekir.
        </p>
        {support === null && <p className="hint">Kontrol ediliyor…</p>}
        {support === 'yok' && <p className="alert err">Bu tarayıcı anlık bildirimi desteklemiyor. Chrome, Edge veya Safari (iPhone’da uygulama olarak yüklenmiş) kullan.</p>}
        {support === 'ios-uygulama' && (
          <p className="alert err">iPhone’da bildirim için paneli önce ana ekrana eklemen gerekir: Safari’de Paylaş → “Ana Ekrana Ekle”, sonra oradan açıp bu sayfaya gel.</p>
        )}
        {support === 'tamam' && st && !st.configured && <p className="alert err">Sunucuda bildirim anahtarları tanımlı değil.</p>}
        {support === 'tamam' && perm === 'denied' && (
          <p className="alert err">Bu site için bildirimler engellenmiş. Tarayıcı (veya telefon) ayarlarında siteye bildirim iznini aç, sonra sayfayı yenile.</p>
        )}
        {support === 'tamam' && perm !== 'denied' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {on ? (
              <>
                <button className="btn" onClick={sendTest} disabled={busy}><Send size={15} /> {busy ? 'Gönderiliyor…' : 'Test bildirimi gönder'}</button>
                <button className="btn ghost" onClick={disable} disabled={busy}><BellOff size={15} /> Bu cihazda kapat</button>
              </>
            ) : (
              <button className="btn" onClick={enable} disabled={busy}><Bell size={15} /> {busy ? 'Açılıyor…' : 'Bu cihazda bildirimleri aç'}</button>
            )}
            {on && <span className="hint" style={{ margin: 0 }}>Bu cihazda açık</span>}
          </div>
        )}
        {test && (
          <div className={test.ok ? 'alert ok' : 'alert err'} style={{ marginTop: 12 }}>
            {test.error && <div>{test.error}</div>}
            {test.results?.map((r, i) => (
              <div key={i}>
                {r.label || 'Cihaz'}: {r.ok ? 'gönderildi, cihazına birkaç saniye içinde düşmeli.' : `gönderilemedi (${r.status ?? ''} ${r.error ?? ''})`}
              </div>
            ))}
          </div>
        )}
        {st && st.devices > 0 && (
          <ul className="hint" style={{ margin: '12px 0 0', paddingLeft: 18 }}>
            {st.list.map((d, i) => (
              <li key={i}>
                {d.label || 'Cihaz'}
                {d.here ? ' (bu cihaz)' : ''}
                {d.last_error ? ` · son hata: ${d.last_error.slice(0, 80)}` : d.last_ok_at ? ` · son başarılı gönderim ${new Date(d.last_ok_at).toLocaleString('tr-TR')}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
