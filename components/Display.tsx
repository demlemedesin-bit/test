import type { ReactNode } from 'react';

// Strenuous'ta Ş ş Ğ ğ İ ı yok; handoff'taki betik bunları çizerek tamamlıyordu.
// Aynısı burada React ile yapılır (DOM'a dokunmadan), yalnızca başlıklar için.
const MAP: Record<string, [string, string]> = {
  Ş: ['S', 'tg-ced'],
  ş: ['s', 'tg-ced'],
  Ğ: ['G', 'tg-brv'],
  ğ: ['g', 'tg-brv'],
  İ: ['I', 'tg-dot'],
  i: ['I', 'tg-dot'],
  ı: ['I', ''],
};

export function D({ children }: { children: string }): ReactNode {
  return children.split(/([ŞşĞğİıi])/).map((part, k) => {
    const m = MAP[part];
    return m ? (
      <span key={k} className={`tg ${m[1]}`.trim()} data-ch={part}>
        {m[0]}
      </span>
    ) : (
      part
    );
  });
}
