'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GUEST_BUCKET, GUEST_MAX_MB, GUEST_MIMES } from '@/lib/guestConst';

type St = { kind: 'idle' | 'busy' | 'ok' | 'err'; text?: string };

export function KonukForm({ t }: { t: Record<string, string> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [who, setWho] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [st, setSt] = useState<St>({ kind: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    if (!f) return setFile(null);
    if (!GUEST_MIMES.includes(f.type.toLowerCase())) {
      setSt({ kind: 'err', text: 'Lütfen bir video dosyası seç (MP4, MOV veya WebM).' });
      if (fileRef.current) fileRef.current.value = '';
      return setFile(null);
    }
    if (f.size > GUEST_MAX_MB * 1024 * 1024) {
      setSt({ kind: 'err', text: `Video en fazla ${GUEST_MAX_MB} MB olabilir. Daha kısa ya da daha düşük çözünürlüklü bir video dene.` });
      if (fileRef.current) fileRef.current.value = '';
      return setFile(null);
    }
    setSt({ kind: 'idle' });
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (st.kind === 'busy') return;
    if (name.trim().length < 2) return setSt({ kind: 'err', text: 'Adını ve soyadını yaz.' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setSt({ kind: 'err', text: 'Geçerli bir e-posta adresi yaz.' });
    if (who.trim().length < 2) return setSt({ kind: 'err', text: 'Kimin hikayesini dinlemek istediğini yaz.' });
    if (!consent) return setSt({ kind: 'err', text: 'Devam etmek için aydınlatma metnini onaylaman gerekiyor.' });
    setSt({ kind: 'busy', text: file ? 'Video yükleniyor, lütfen sayfayı kapatma…' : 'Gönderiliyor…' });
    try {
      let video: { path: string; name: string; size: number } | null = null;
      if (file) {
        const r = await fetch('/api/konuk-ol/yukle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ size: file.size, type: file.type }) });
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; path?: string; token?: string; error?: string };
        if (!r.ok || !j.ok || !j.path || !j.token) return setSt({ kind: 'err', text: j.error || 'Video yüklenemedi. Tekrar dene.' });
        const up = await supabase().storage.from(GUEST_BUCKET).uploadToSignedUrl(j.path, j.token, file, { contentType: file.type });
        if (up.error) return setSt({ kind: 'err', text: 'Video yüklenemedi. Bağlantını kontrol edip tekrar dene.' });
        video = { path: j.path, name: file.name, size: file.size };
      }
      const r = await fetch('/api/konuk-ol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, wanted_guest: who, consent, website: hp, video_path: video?.path ?? '', video_name: video?.name ?? '', video_size: video?.size ?? 0 }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) return setSt({ kind: 'err', text: j.error || 'Başvuru gönderilemedi. Tekrar dene.' });
      setSt({ kind: 'ok', text: t.ko_ok });
      setName(''); setEmail(''); setWho(''); setConsent(false); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setSt({ kind: 'err', text: 'Bağlantı hatası. Tekrar dene.' });
    }
  }

  const busy = st.kind === 'busy';
  return (
    <form onSubmit={submit} noValidate>
      <div className="ko-bar">
        <label className="ko-f ko-n">
          {t.ko_f_name} *
          <input className="ko-inp" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.ko_f_name_ph} autoComplete="name" maxLength={120} />
        </label>
        <label className="ko-f ko-e">
          {t.ko_f_email} *
          <input className="ko-inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.ko_f_email_ph} autoComplete="email" maxLength={200} />
        </label>
        <label className="ko-f ko-w">
          {t.ko_f_who} *
          <input className="ko-inp" value={who} onChange={(e) => setWho(e.target.value)} placeholder={t.ko_f_who_ph} maxLength={600} />
        </label>
        <div className="ko-v">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3" /></svg>
          <b>{t.ko_v_title}</b>
          <small>{t.ko_v_sub} · en fazla {GUEST_MAX_MB} MB</small>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <button type="button" className="ko-file" onClick={() => fileRef.current?.click()} disabled={busy}>
            {file ? 'Değiştir' : t.ko_v_btn}
          </button>
          {file && <span className="ko-fn">{file.name} · {(file.size / 1048576).toFixed(1)} MB</span>}
        </div>
        <div className="ko-b">
          <button type="submit" className="ko-send" disabled={busy}>
            {busy ? 'Gönderiliyor…' : t.ko_send}
          </button>
        </div>
      </div>
      <input className="ko-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={hp} onChange={(e) => setHp(e.target.value)} />
      <label className="ko-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          <a href="/kvkk" target="_blank" rel="noopener">{t.ko_consent_link}</a>{t.ko_consent}
        </span>
      </label>
      {st.text && <div className={`ko-msg ${st.kind === 'ok' ? 'ok' : st.kind === 'err' ? 'err' : ''}`} role="status">{st.text}</div>}
    </form>
  );
}
