'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

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
