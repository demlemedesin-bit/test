import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { ResetForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Yeni şifre · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page page-narrow">
      <p className="eyebrow">Hesap</p>
      <h1 className="page-title">
        <D>Yeni şifre</D>
      </h1>
      <p className="lead">Hesabın için yeni bir şifre belirle.</p>
      <ResetForm />
    </main>
  );
}
