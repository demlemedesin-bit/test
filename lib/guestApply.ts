import { rest } from './catalog';

/** Konuk başvuru sayfası ayarlardaki düğmeyle açılır (shop_settings.guest_apply_on = '1'). */
export async function guestApplyOn(): Promise<boolean> {
  const r = await rest<{ value: string | number }[]>('shop_settings?select=value&key=eq.guest_apply_on');
  return String(r?.[0]?.value ?? '') === '1';
}
