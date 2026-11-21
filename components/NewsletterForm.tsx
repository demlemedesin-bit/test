'use client';

import { useId, useState, type FormEvent } from 'react';
import { DEFAULT_CONSENT, markSubscribed } from '@/lib/popups';
import './Popups.css';

const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) && v.trim().length <= 120;

/**
 * Bülten kayıt formu (altbilgi ve popup ortak kullanır). E-posta + zorunlu KVKK onay kutusu;
 * kayıt anon RPC `subscribe_newsletter` ile yapılır.
 */
export function NewsletterForm({
  source = 'footer',
  consentText,
  label = 'Abone ol',
  tone = 'dark',
  disabled = false,
  onSuccess,
}: {
  source?: string;
  consentText?: string;
  label?: string;
  tone?: 'dark' | 'light';
  /** Önizlemede gönderimi kapatır. */
  disabled?: boolean;
  onSuccess?: () => void;
}) {
  const uid = useId();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (disabled || busy) return;
    if (!emailOk(email)) return setErr('Geçerli bir e-posta adresi yaz.');
    if (!consent) return setErr('Devam etmek için onay kutusunu işaretlemelisin.');
    setErr('');
    if (trap) {
      // Bot tuzağı: sessizce başarılı say
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/bulten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source: source.slice(0, 40), consent: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; already?: boolean };
      if (!r.ok || !j.ok) {
        setErr(j.error || 'Kaydın alınamadı. Biraz sonra tekrar dene.');
        setBusy(false);
        return;
      }
      markSubscribed();
      setAlready(!!j.already);
      setDone(true);
      onSuccess?.();
    } catch {
      setErr('Kaydın alınamadı. Biraz sonra tekrar dene.');
    }
    setBusy(false);
  }

  if (done) {
    return (
      <p className={`nl-ok nl--${tone}`} role="status">
        {already ? 'Bu adres zaten abone.' : 'Teşekkürler! Kaydın alındı.'}
      </p>
    );
  }

  return (
    <form className={`nl nl--${tone}`} onSubmit={submit} noValidate>
      <div className="nl-row">
        <label className="nl-sr" htmlFor={`${uid}-e`}>
          E-posta adresin
        </label>
        <input
          id={`${uid}-e`}
          className="nl-in"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="E-posta adresin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={err && !emailOk(email) ? true : undefined}
          aria-describedby={err ? `${uid}-err` : undefined}
        />
        <button className="nl-btn" type="submit" disabled={busy || disabled}>
          {busy ? 'Gönderiliyor…' : label}
        </button>
      </div>
      <input className="nl-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} />
      <label className="nl-chk">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          {(consentText || '').trim() || DEFAULT_CONSENT}{' '}
          <a href="/acik-riza-ticari-ileti" target="_blank" rel="noopener">
            İzin metni
          </a>
        </span>
      </label>
      <p className="nl-note">
        E-posta adresin bu amaçla <a href="/kvkk" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a> kapsamında işlenir. İznini istediğin zaman geri alabilirsin.
      </p>
      {err && (
        <p className="nl-err" id={`${uid}-err`} role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
