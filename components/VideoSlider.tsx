'use client';

import { useRef, useState } from 'react';

/** Konuk sayfası videoları: tek video düz görünür; birden fazlaysa yana kaydırmalı (oklar + noktalar). */
export default function VideoSlider({ ids, name }: { ids: string[]; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const n = Math.max(0, Math.min(ids.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  };
  const frames = ids.map((id) => (
    <div className="kp-video" key={id}>
      <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={`${name} videosu`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    </div>
  ));
  if (ids.length < 2) return <>{frames}</>;
  return (
    <div className="kp-slider">
      <div className="kp-track" ref={ref} onScroll={(e) => setCur(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {frames}
      </div>
      <div className="kp-ctl">
        <button type="button" aria-label="Önceki video" onClick={() => go(cur - 1)} disabled={cur === 0}>←</button>
        <span className="kp-dots">
          {ids.map((id, i) => (
            <button key={id} type="button" aria-label={`${i + 1}. video`} aria-current={i === cur} onClick={() => go(i)} />
          ))}
        </span>
        <button type="button" aria-label="Sonraki video" onClick={() => go(cur + 1)} disabled={cur === ids.length - 1}>→</button>
      </div>
    </div>
  );
}
