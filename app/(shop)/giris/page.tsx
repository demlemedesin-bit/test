import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { LoginForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Giriş yap · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page page-narrow">
      <p className="eyebrow">Hesap</p>
      <h1 className="page-title">
        <D>Giriş yap</D>
      </h1>
      <p className="lead">Siparişlerini ve adreslerini görmek için hesabına gir.</p>
      <LoginForm />
    </main>
  );
}
