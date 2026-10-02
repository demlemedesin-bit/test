import { sendEmail, serviceClient } from './notify';
import { siteUrl } from './siteUrl';

/**
 * "Stok gelince haber ver": bir ürün için bekleyen (notified_at boş) kayıtlara e-posta yollar.
 * Yalnızca sunucu rotalarından çağrılır. Hiçbir koşulda fırlatmaz; sonuç { ok, sent, skipped, error? }.
 * Anahtar (Supabase servis / Resend) yoksa "atlandı" döner ve kayıtlar bekler durumda kalır.
 */
export type StockNotifyResult = { ok: boolean; sent: number; skipped: number; error?: string };

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);
const MAX = 500;

export async function notifyStock(slug: string): Promise<StockNotifyResult> {
  try {
    const sb = serviceClient();
    if (!sb) return { ok: true, sent: 0, skipped: 0, error: 'Atlandı: SUPABASE_SERVICE_ROLE_KEY tanımsız' };

    const { data: prod } = await sb.from('products').select('slug,name,stock,active,soon').eq('slug', slug).maybeSingle();
    if (!prod || !prod.active) return { ok: false, sent: 0, skipped: 0, error: 'Ürün bulunamadı veya satışta değil' };
    if (prod.soon) return { ok: false, sent: 0, skipped: 0, error: 'Ürün henüz satışa açılmadı' };
    if (prod.stock != null && Number(prod.stock) <= 0) return { ok: false, sent: 0, skipped: 0, error: 'Ürün stokta değil' };

    const { data: pending } = await sb.from('stock_alerts').select('id').eq('product_slug', slug).is('notified_at', null).limit(MAX);
    const ids = (pending ?? []).map((r) => r.id as string);
    if (!ids.length) return { ok: true, sent: 0, skipped: 0 };

    // Atomik sahiplenme: aynı anda iki istek gelirse her kayıt yalnızca birine düşer.
    const stamp = new Date().toISOString();
    const { data: claimed, error: ce } = await sb.from('stock_alerts').update({ notified_at: stamp }).in('id', ids).is('notified_at', null).select('id,email');
    if (ce) return { ok: false, sent: 0, skipped: 0, error: 'Kayıtlar alınamadı: ' + ce.message.slice(0, 200) };
    const rows = (claimed ?? []) as { id: string; email: string }[];

    const name = String(prod.name || 'Ürün');
    const subject = `${name} yeniden stokta`;
    const url = `${siteUrl()}/urun/${encodeURIComponent(slug)}`;
    const text = `Merhaba,\n\nBeklediğin “${name}” yeniden stokta. Tükenmeden göz atmak için:\n${url}\n\nBu e-postayı, ürün stoğa girince haber verilmesini istediğin için aldın.\n\nDemleme`;

    let sent = 0;
    let skipped = 0;
    let firstErr = '';
    const release: string[] = [];
    let stop = false;
    for (const r of rows) {
      if (stop) {
        skipped++;
        release.push(r.id);
        continue;
      }
      const res = await sendEmail({ to: r.email, subject, text });
      try {
        await sb.from('message_log').insert({ channel: 'email', to_addr: r.email, template: 'stock_alert', subject, status: res.status, error: res.error ?? null, order_no: null });
      } catch {
        /* günlük yazılamasa da akış sürer */
      }
      if (res.status === 'sent') sent++;
      else {
        release.push(r.id);
        if (res.status === 'skipped') {
          skipped++;
          stop = true; // anahtar yok: kalanların hepsi de atlanır
          firstErr = firstErr || `Atlandı: ${res.error ?? 'e-posta anahtarı tanımsız'}`;
        } else firstErr = firstErr || res.error || 'Gönderilemedi';
      }
    }
    // Gönderilemeyenler yeniden denenebilsin
    if (release.length) await sb.from('stock_alerts').update({ notified_at: null }).in('id', release);

    const failed = release.length - skipped;
    return { ok: failed === 0, sent, skipped, ...(firstErr ? { error: firstErr } : {}) };
  } catch (e) {
    return { ok: false, sent: 0, skipped: 0, error: msg(e) };
  }
}
