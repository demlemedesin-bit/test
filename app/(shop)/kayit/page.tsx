import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { RegisterForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Üye ol · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page page-narrow">
      <p className="eyebrow">Hesap</p>
      <h1 className="page-title">
        <D>Üye ol</D>
      </h1>
      <p className="lead">Siparişlerini takip et, adreslerini kaydet, bir sonraki alışverişte vakit kazan.</p>
      <RegisterForm />
    </main>
  );
}
