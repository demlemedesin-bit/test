'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authMessage, safeNext, useAuth } from '@/lib/auth';
import { Alert, Field, emailOk, phoneOk } from './ui';

export function LoginForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(safeNext());
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setInfo('');
    setUnconfirmed(false);
    if (!emailOk(email) || !pw) {
      setErr('E-posta adresini ve şifreni gir.');
      return;
    }
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) {
      setErr(authMessage(error));
      setUnconfirmed(error.code === 'email_not_confirmed');
      setBusy(false);
      return;
    }
    router.replace(safeNext());
  }

  async function resend() {
    setErr('');
    const { error } = await supabase().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${location.origin}/giris` } });
    if (error) setErr(authMessage(error));
    else setInfo('Doğrulama e-postasını yeniden gönderdik.');
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      {err && <Alert kind="err">{err}</Alert>}
      {info && <Alert kind="ok">{info}</Alert>}
      {unconfirmed && (
        <p>
          <button type="button" className="btn-text" onClick={resend}>
            Doğrulama e-postasını tekrar gönder
          </button>
        </p>
      )}
      <Field id="email" label="E-posta" type="email" autoComplete="email" value={email} onChange={setEmail} required />
      <Field id="password" label="Şifre" type="password" autoComplete="current-password" value={pw} onChange={setPw} required />
      <button className="btn btn--solid btn--block" type="submit" disabled={busy}>
        {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
      <div className="form-foot">
        <Link className="link" href="/sifremi-unuttum" style={{ alignSelf: 'flex-start' }}>
          Şifremi unuttum
        </Link>
        <span>
          Hesabın yok mu?{' '}
          <Link className="link" href="/kayit">
            Üye ol
          </Link>
        </span>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [v, setV] = useState({ full_name: '', email: '', phone: '', password: '', password2: '' });
  const [agree, setAgree] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  useEffect(() => {
    if (!loading && user && !sent) router.replace(safeNext());
  }, [loading, user, sent, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const x: Record<string, string> = {};
    if (v.full_name.trim().length < 3) x.full_name = 'Adını ve soyadını yaz.';
    if (!emailOk(v.email)) x.email = 'Geçerli bir e-posta gir.';
    if (v.phone && !phoneOk(v.phone)) x.phone = 'Geçerli bir telefon numarası gir.';
    if (v.password.length < 8) x.password = 'Şifren en az 8 karakter olmalı.';
    if (v.password2 !== v.password) x.password2 = 'Şifreler aynı değil.';
    if (!agree) x.agree = 'Devam etmek için onaylaman gerekiyor.';
    setErrs(x);
    if (Object.keys(x).length) return;

    setBusy(true);
    const { data, error } = await supabase().auth.signUp({
      email: v.email.trim(),
      password: v.password,
      options: { data: { full_name: v.full_name.trim(), phone: v.phone.trim() }, emailRedirectTo: `${location.origin}/giris` },
    });
    setBusy(false);
    if (error) {
      setErr(authMessage(error));
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setErr('Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.');
      return;
    }
    if (data.session) {
      router.replace(safeNext());
      return;
    }
    setSent(v.email.trim());
  }

  if (sent)
    return (
      <div className="done-box">
        <h2 className="section-h">Neredeyse tamam</h2>
        <p style={{ margin: 0 }}>
          <b>{sent}</b> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin. Gelmediyse gereksiz (spam) klasörüne de bak.
        </p>
        <p style={{ margin: '16px 0 0' }}>
          <Link className="link" href="/giris">
            Giriş sayfasına git
          </Link>
        </p>
      </div>
    );

  return (
    <form className="form" onSubmit={submit} noValidate>
      {err && <Alert kind="err">{err}</Alert>}
      <Field id="full_name" label="Ad soyad" autoComplete="name" value={v.full_name} onChange={set('full_name')} error={errs.full_name} required />
      <Field id="email" label="E-posta" type="email" autoComplete="email" value={v.email} onChange={set('email')} error={errs.email} required />
      <Field id="phone" label="Telefon (isteğe bağlı)" type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} error={errs.phone} placeholder="05xx xxx xx xx" />
      <Field id="password" label="Şifre" type="password" autoComplete="new-password" value={v.password} onChange={set('password')} error={errs.password} hint="En az 8 karakter." required />
      <Field id="password2" label="Şifre (tekrar)" type="password" autoComplete="new-password" value={v.password2} onChange={set('password2')} error={errs.password2} required />
      <label className="check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          <Link href="/kullanim-sartlari" target="_blank">
            Kullanım şartlarını
          </Link>{' '}
          ve{' '}
          <Link href="/kvkk" target="_blank">
            KVKK aydınlatma metnini
          </Link>{' '}
          okudum, kabul ediyorum.
        </span>
      </label>
      {errs.agree && <p className="fld-err" style={{ marginTop: -8, marginBottom: 16 }}>{errs.agree}</p>}
      <button className="btn btn--solid btn--block" type="submit" disabled={busy}>
        {busy ? 'Hesabın oluşturuluyor…' : 'Üye ol'}
      </button>
      <div className="form-foot">
        <span>
          Zaten üye misin?{' '}
          <Link className="link" href="/giris">
            Giriş yap
          </Link>
        </span>
      </div>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!emailOk(email)) {
      setErr('Geçerli bir e-posta gir.');
      return;
    }
    setBusy(true);
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/sifre-sifirla` });
    setBusy(false);
    if (error && (error.status === 429 || error.code === 'over_email_send_rate_limit')) {
      setErr(authMessage(error));
      return;
    }
    // Hesap var mı yok mu belli etmemek için her durumda aynı yanıt
    setDone(true);
  }

  if (done)
    return (
      <div className="done-box">
        <p style={{ margin: 0 }}>
          Bu e-posta ile kayıtlı bir hesap varsa, şifreni sıfırlamak için bir bağlantı gönderdik. Gelmediyse gereksiz (spam) klasörüne de bak.
        </p>
        <p style={{ margin: '16px 0 0' }}>
          <Link className="link" href="/giris">
            Giriş sayfasına dön
          </Link>
        </p>
      </div>
    );

  return (
    <form className="form" onSubmit={submit} noValidate>
      {err && <Alert kind="err">{err}</Alert>}
      <Field id="email" label="E-posta" type="email" autoComplete="email" value={email} onChange={setEmail} required />
      <button className="btn btn--solid btn--block" type="submit" disabled={busy}>
        {busy ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
      </button>
      <div className="form-foot">
        <Link className="link" href="/giris" style={{ alignSelf: 'flex-start' }}>
          Girişe dön
        </Link>
      </div>
    </form>
  );
}

export function ResetForm() {
  const { session, loading } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('Şifren en az 8 karakter olmalı.');
    if (pw !== pw2) return setErr('Şifreler aynı değil.');
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(authMessage(error));
    setDone(true);
  }

  if (loading) return <p className="loading">Yükleniyor…</p>;
  if (done)
    return (
      <div className="done-box">
        <p style={{ margin: 0 }}>Şifren güncellendi.</p>
        <p style={{ margin: '16px 0 0' }}>
          <Link className="link" href="/hesabim">
            Hesabıma git
          </Link>
        </p>
      </div>
    );
  if (!session)
    return (
      <div className="done-box">
        <p style={{ margin: 0 }}>Bu bağlantı geçersiz ya da süresi dolmuş. Yeni bir sıfırlama bağlantısı isteyebilirsin.</p>
        <p style={{ margin: '16px 0 0' }}>
          <Link className="link" href="/sifremi-unuttum">
            Yeni bağlantı iste
          </Link>
        </p>
      </div>
    );

  return (
    <form className="form" onSubmit={submit} noValidate>
      {err && <Alert kind="err">{err}</Alert>}
      <Field id="password" label="Yeni şifre" type="password" autoComplete="new-password" value={pw} onChange={setPw} hint="En az 8 karakter." required />
      <Field id="password2" label="Yeni şifre (tekrar)" type="password" autoComplete="new-password" value={pw2} onChange={setPw2} required />
      <button className="btn btn--solid btn--block" type="submit" disabled={busy}>
        {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
      </button>
    </form>
  );
}
