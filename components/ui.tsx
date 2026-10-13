'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { TR_ADDRESS, TR_CITIES } from '@/lib/trAddress';

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  onChange: (v: string) => void;
};

export function Field({ id, label, error, hint, onChange, ...rest }: FieldProps) {
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} {...rest} />
      {error ? (
        <p className="fld-err" id={`${id}-e`}>
          {error}
        </p>
      ) : hint ? (
        <p className="fld-hint" id={`${id}-h`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({ kind, children }: { kind: 'err' | 'ok'; children: ReactNode }) {
  return (
    <div className={`alert alert--${kind}`} role={kind === 'err' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
export const phoneOk = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 13;
};

/** İl + ilçe seçimi (Türkiye il/ilçe listesi). Kayıtlı adreste listede olmayan değer varsa korunur. */
export function CityDistrict({ idPrefix = '', city, district, onCity, onDistrict, errCity, errDistrict }: { idPrefix?: string; city: string; district: string; onCity: (v: string) => void; onDistrict: (v: string) => void; errCity?: string; errDistrict?: string }) {
  const list = TR_ADDRESS[city] ?? [];
  const dist = district && !list.includes(district) ? [district, ...list] : list;
  const cities = city && !TR_ADDRESS[city] ? [city, ...TR_CITIES] : TR_CITIES;
  return (
    <div className="row2">
      <div className="fld">
        <label htmlFor={idPrefix + 'city'}>İl</label>
        <select id={idPrefix + 'city'} name={idPrefix + 'city'} autoComplete="address-level1" value={city} onChange={(e) => { onCity(e.target.value); onDistrict(''); }} aria-invalid={errCity ? true : undefined} required>
          <option value="">İl seç…</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errCity && <p className="fld-err">{errCity}</p>}
      </div>
      <div className="fld">
        <label htmlFor={idPrefix + 'district'}>İlçe</label>
        <select id={idPrefix + 'district'} name={idPrefix + 'district'} autoComplete="address-level2" value={district} onChange={(e) => onDistrict(e.target.value)} disabled={!city} aria-invalid={errDistrict ? true : undefined} required>
          <option value="">{city ? 'İlçe seç…' : 'Önce il seç'}</option>
          {dist.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {errDistrict && <p className="fld-err">{errDistrict}</p>}
      </div>
    </div>
  );
}
