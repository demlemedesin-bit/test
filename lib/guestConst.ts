// Konuk başvurusu sabitleri (tarayıcı ve sunucu ortak; sunucuya özel bağımlılık içermez).
export const GUEST_BUCKET = 'konuk-basvuru';
export const GUEST_MAX_MB = 50;
export const GUEST_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp'];
export const GUEST_EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'm4v', 'video/3gpp': '3gp' };
export const GUEST_PATH_RE = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.(mp4|mov|webm|m4v|3gp)$/;
