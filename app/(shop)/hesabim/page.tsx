import type { Metadata } from 'next';
import { AccountView } from '@/components/AccountView';

export const metadata: Metadata = { title: 'Hesabım · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page page-wide">
      <AccountView />
    </main>
  );
}
