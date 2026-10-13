import type { Metadata, Viewport } from 'next';
import { AdminShell } from '@/components/admin/Shell';
import './admin.css';
import './pro.css';

export const metadata: Metadata = {
  title: 'Yönetim paneli · Demleme',
  robots: { index: false, follow: false },
  // Ana ekrana eklenebilir panel (yalnızca /admin; ön yüze dokunmaz, servis çalışanı yok)
  manifest: '/admin-manifest.webmanifest',
  icons: { apple: '/admin-apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Demleme', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#F8F4EA' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
