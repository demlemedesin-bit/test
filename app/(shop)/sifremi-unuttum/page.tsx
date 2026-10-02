import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { ForgotForm } from '@/components/AuthForms';

export const metadata: Metadata = { title: 'Şifremi unuttum · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page page-narrow">
      <p className="eyebrow">Hesap</p>
      <h1 className="page-title">
        <D>Şifremi unuttum</D>
      </h1>
      <p className="lead">E-posta adresini yaz, şifreni yenilemen için sana bir bağlantı gönderelim.</p>
      <ForgotForm />
    </main>
  );
}
