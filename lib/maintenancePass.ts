import { createHmac, timingSafeEqual } from 'crypto';

/** Bakım modunda yöneticinin siteyi görebilmesi için imzalı, süreli çerez. Anahtar sunucuda kalır. */
export const PASS_COOKIE = 'dm_onizleme';
export const PASS_TTL_S = 12 * 3600;

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sig = (exp: string) => createHmac('sha256', secret()).update('onizleme.' + exp).digest('hex');

export function makePass(): string | null {
  if (!secret()) return null;
  const exp = String(Math.floor(Date.now() / 1000) + PASS_TTL_S);
  return `${exp}.${sig(exp)}`;
}

export function checkPass(v: string | undefined | null): boolean {
  if (!v || !secret()) return false;
  const [exp, s] = v.split('.');
  if (!exp || !s || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(s), b = Buffer.from(sig(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
