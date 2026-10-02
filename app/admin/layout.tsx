import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/Shell';
import './admin.css';

export const metadata: Metadata = {
  title: 'Yönetim paneli · Demleme',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
