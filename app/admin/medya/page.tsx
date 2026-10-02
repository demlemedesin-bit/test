'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Check, Copy, Folder, HardDrive, ImageDown, Images, RefreshCw, Search, Trash2, TrendingDown, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, refreshSite } from '@/lib/admin';
import {
  MEDIA_BUCKET as B,
  MEDIA_DEFAULTS,
  checkImageFile,
  cleanFolder,
  compressImage,
  fmtBytes,
  gainText,
  getMediaSettings,
  makeThumb,
  publicUrl,
  saveMediaSettings,
  storageMessage,
  uploadImageDetailed,
  validateMediaSettings,
  type MediaSettings,
} from '@/lib/media';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Kpi, Loading, TopBar, useToast } from '@/components/admin/ui';
import './medya.css';

const PAGE = 100;
const PLACEHOLDER = '.emptyFolderPlaceholder';
const IMG_RE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

type Item = { name: string; path: string; folder: boolean; size: number; mime: string; created: string | null };
type Row = { id: number; name: string; state: 'wait' | 'work' | 'ok' | 'skip' | 'err'; text: string; thumb?: string };

const join = (a: string, b: string) => (a ? a + '/' + b : b);

/* ═══ Sıkıştırma ayarları ═══ */

function Num({ value, onChange, min, max, step }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number }) {
  const [t, setT] = useState(String(value));
  return (
    <input
      className="inp"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step ?? 1}
      value={t}
      onChange={(e) => {
        setT(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const n = Math.min(max, Math.max(min, Number(t) || min));
        setT(String(n));
        onChange(n);
      }}
    />
  );
}

function estimate(s: MediaSettings): string {
  // Kaba tahmin: 4:3 oranında, ayrıntılı bir fotoğraf
  const w = s.max_px;
  const h = Math.round(w * 0.75);
  const bpp = (0.35 + 3.4 * Math.pow(s.quality - 0.5, 1.4)) * (s.format === 'jpeg' ? 1.3 : 1);
  const kb = Math.round((w * h * bpp) / 8 / 1024);
  return `${w}×${h} px, ≈ ${kb >= 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB'}`;
}

function SettingsCard({ saved, onSaved, toast }: { saved: MediaSettings; onSaved: (s: MediaSettings) => void; toast: (t: string, e?: boolean) => void }) {
  const [d, setD] = useState<MediaSettings>(saved);
  const [busy, setBusy] = useState(false);
  const [rev, setRev] = useState(0);
  const set = <K extends keyof MediaSettings>(k: K, v: MediaSettings[K]) => setD((s) => ({ ...s, [k]: v }));
  const dirty = JSON.stringify(validateMediaSettings(d)) !== JSON.stringify(saved);
  const v = validateMediaSettings(d);

  async function save() {
    setBusy(true);
    try {
      const s = await saveMediaSettings(d);
      setD(s);
      setRev((r) => r + 1);
      onSaved(s);
      toast('Sıkıştırma ayarları kaydedildi');
    } catch (e) {
      toast('Ayarlar kaydedilemedi: ' + (e instanceof Error ? e.message : 'bilinmeyen hata'), true);
    }
    setBusy(false);
  }
  const fmtName = v.format === 'jpeg' ? 'JPEG' : v.format === 'webp' ? 'WebP' : 'WebP (desteklenmezse JPEG)';

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-h">
        <h2 className="card-t">Sıkıştırma ayarları</h2>
        <span className="card-m">Yüklenen her görsele otomatik uygulanır</span>
      </div>
      <div className="md-set" key={rev}>
        <Field label="En uzun kenar (px)" hint="Daha büyük görseller bu ölçüye küçültülür.">
          <Num value={d.max_px} min={320} max={6000} step={100} onChange={(n) => set('max_px', n)} />
        </Field>
        <Field label="Kalite" hint="0,50 – 0,95 arası. 0,80 – 0,85 çoğu görsel için idealdir.">
          <div className="md-range">
            <input type="range" min={0.5} max={0.95} step={0.01} value={d.quality} onChange={(e) => set('quality', Number(e.target.value))} />
            <b>{d.quality.toFixed(2).replace('.', ',')}</b>
          </div>
        </Field>
        <Field label="Çıktı biçimi">
          <select className="inp" value={d.format} onChange={(e) => set('format', e.target.value as MediaSettings['format'])}>
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="auto">Otomatik (WebP, olmazsa JPEG)</option>
          </select>
        </Field>
        <Field label="Küçük dosya sınırı (KB)" hint="Bunun altındaki dosyalar olduğu gibi yüklenir.">
          <Num value={d.skip_below_kb} min={0} max={5000} step={10} onChange={(n) => set('skip_below_kb', n)} />
        </Field>
        <Field label="En büyük yükleme (MB)" hint="Bunu aşan dosyalar reddedilir.">
          <Num value={d.max_upload_mb} min={1} max={50} onChange={(n) => set('max_upload_mb', n)} />
        </Field>
        <Field label="Küçük önizleme (px)" hint="Önizleme küçük resimlerinin kenarı.">
          <Num value={d.thumb_px} min={120} max={1200} step={40} onChange={(n) => set('thumb_px', n)} />
        </Field>
      </div>
      <div style={{ padding: '0 20px' }}>
        <label className="md-check">
          <input type="checkbox" checked={d.keep_png_transparency} onChange={(e) => set('keep_png_transparency', e.target.checked)} />
          <span>
            Şeffaf PNG’yi koru
            <small>Şeffaflığı olan görseller JPEG’e çevrilip beyaz zemine düzleştirilmez; WebP’de kalite en az 0,90 tutulur.</small>
          </span>
        </label>
        <label className="md-check" style={{ cursor: 'default' }}>
          <input type="checkbox" checked disabled readOnly />
          <span>
            Konum ve kamera bilgisini sil (EXIF)
            <small>Görsel yeniden çizildiği için bu bilgiler her zaman silinir; fotoğrafın yönü ise doğru kalır.</small>
          </span>
        </label>
      </div>
      <div className="md-live">
        <b>Ne olacak?</b> {v.skip_below_kb > 0 ? `${v.skip_below_kb} KB altı dosyalar olduğu gibi yüklenir. ` : ''}Diğer görseller en uzun kenarı en çok <b>{v.max_px} px</b> olacak şekilde küçültülür ve <b>{fmtName}</b> olarak %{Math.round(v.quality * 100)} kaliteyle kaydedilir. Örnek: 4000×3000 px’lik bir fotoğraf → {estimate(v)} (yaklaşık). SVG ve GIF’e dokunulmaz; sonuç orijinalden büyük çıkarsa orijinal yüklenir.
      </div>
      <div className="md-foot">
        <button type="button" className="btn" onClick={save} disabled={busy || !dirty}>
          <Check size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setD(MEDIA_DEFAULTS);
            setRev((r) => r + 1);
          }}
          disabled={busy}
        >
          Varsayılana dön
        </button>
        {dirty && <span className="hint" style={{ margin: 0 }}>Kaydedilmemiş değişiklik var; yüklemeler kayıtlı ayarları kullanır.</span>}
      </div>
    </section>
  );
}

/* ═══ Sayfa ═══ */

export default function Media() {
  const menu = useMenu();
  const { show: toast, node } = useToast();

  const [settings, setSettings] = useState<MediaSettings | null>(null);
  const [path, setPath] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');
  const [busyList, setBusyList] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'yeni' | 'eski' | 'buyuk' | 'kucuk' | 'ad'>('yeni');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [rootFolders, setRootFolders] = useState<string[]>([]);
  const [usage, setUsage] = useState<{ files: number; bytes: number; capped: boolean } | null>(null);

  const [upFolder, setUpFolder] = useState('site');
  const [over, setOver] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [gain, setGain] = useState({ before: 0, after: 0, n: 0 });
  const [confirm, setConfirm] = useState<null | { kind: 'del' | 'recompress'; paths: string[] }>(null);
  const [work, setWork] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    getMediaSettings(true).then(setSettings);
  }, []);

  const list = useCallback(async (p: string, offset = 0) => {
    const id = ++reqId.current;
    setBusyList(true);
    const { data, error } = await supabase().storage.from(B).list(p, { limit: PAGE, offset, sortBy: { column: 'created_at', order: 'desc' } });
    if (id !== reqId.current) return;
    setBusyList(false);
    if (error) return setErr('Dosyalar listelenemedi: ' + error.message);
    setErr('');
    const got: Item[] = (data ?? [])
      .filter((o) => o.name !== PLACEHOLDER)
      .map((o) => {
        const m = (o.metadata ?? {}) as { size?: number; mimetype?: string };
        return { name: o.name, path: join(p, o.name), folder: o.id === null, size: m.size ?? 0, mime: m.mimetype ?? '', created: o.created_at ?? o.updated_at ?? null };
      });
    setMore((data ?? []).length === PAGE);
    setItems((cur) => (offset === 0 || !cur ? got : [...cur, ...got]));
    if (p === '' && offset === 0) setRootFolders(got.filter((g) => g.folder).map((g) => g.name));
  }, []);

  const calcUsage = useCallback(async () => {
    const sb = supabase();
    let calls = 0;
    let files = 0;
    let bytes = 0;
    let capped = false;
    const walk = async (prefix: string, depth: number): Promise<void> => {
      let offset = 0;
      for (;;) {
        if (calls >= 300) {
          capped = true;
          return;
        }
        calls++;
        const { data, error } = await sb.storage.from(B).list(prefix, { limit: 1000, offset });
        if (error || !data) return;
        const subs: string[] = [];
        for (const o of data) {
          if (o.name === PLACEHOLDER) continue;
          if (o.id === null) {
            if (depth < 4) subs.push(join(prefix, o.name));
          } else {
            files++;
            bytes += ((o.metadata ?? {}) as { size?: number }).size ?? 0;
          }
        }
        await Promise.all(subs.map((s) => walk(s, depth + 1)));
        if (data.length < 1000) return;
        offset += 1000;
      }
    };
    await walk('', 0);
    setUsage({ files, bytes, capped });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      list(path);
    }, 0);
    return () => clearTimeout(t);
  }, [list, path]);
  useEffect(() => {
    const t = setTimeout(calcUsage, 0);
    return () => clearTimeout(t);
  }, [calcUsage]);

  const go = (p: string) => {
    setItems(null);
    setSel(new Set());
    setQ('');
    setPath(p);
    if (p) setUpFolder(p);
  };
  const reload = () => {
    list(path);
    calcUsage();
  };

  const view = useMemo(() => {
    const t = q.trim().toLocaleLowerCase('tr-TR');
    const f = (items ?? []).filter((i) => !t || i.name.toLocaleLowerCase('tr-TR').includes(t));
    const cmp: Record<typeof sort, (a: Item, b: Item) => number> = {
      yeni: (a, b) => (b.created ?? '').localeCompare(a.created ?? ''),
      eski: (a, b) => (a.created ?? '').localeCompare(b.created ?? ''),
      buyuk: (a, b) => b.size - a.size,
      kucuk: (a, b) => a.size - b.size,
      ad: (a, b) => a.name.localeCompare(b.name, 'tr'),
    };
    return [...f].sort((a, b) => (a.folder === b.folder ? cmp[sort](a, b) : a.folder ? -1 : 1));
  }, [items, q, sort]);
  const files = view.filter((i) => !i.folder);
  const crumbs = path ? path.split('/') : [];

  const toggle = (p: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  async function copy(p: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(p));
      toast('Adres kopyalandı');
    } catch {
      toast('Adres kopyalanamadı; tarayıcı izin vermedi.', true);
    }
  }

  /* ── Yükleme ── */
  async function runUploads(list: File[]) {
    if (running || !list.length) return;
    const s = settings ?? (await getMediaSettings());
    const folder = cleanFolder(upFolder) || 'site';
    const base = Date.now();
    const initial: Row[] = list.map((f, i) => ({ id: base + i, name: f.name, state: 'wait', text: 'Sırada' }));
    setRows(initial);
    setRunning(true);
    let b = 0;
    let a = 0;
    let n = 0;
    let fail = 0;
    const patch = (id: number, p: Partial<Row>) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...p } : r)));
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const id = base + i;
      patch(id, { state: 'work', text: 'Sıkıştırılıp yükleniyor…' });
      try {
        checkImageFile(f, s);
        const thumb = await makeThumb(f, 96);
        if (thumb) patch(id, { thumb: URL.createObjectURL(thumb) });
        const r = await uploadImageDetailed(f, folder, s);
        b += r.before;
        a += r.after;
        if (r.after < r.before) {
          n++;
          patch(id, { state: 'ok', text: gainText(r.before, r.after) });
        } else {
          patch(id, { state: 'skip', text: `${fmtBytes(r.after)} · olduğu gibi yüklendi` });
        }
      } catch (e) {
        fail++;
        patch(id, { state: 'err', text: e instanceof Error ? storageMessage(e.message) : 'Yüklenemedi' });
      }
    }
    setGain((g) => ({ before: g.before + b, after: g.after + a, n: g.n + n }));
    setRunning(false);
    toast(fail ? `${list.length - fail} görsel yüklendi, ${fail} hata var` : `${list.length} görsel yüklendi`, fail > 0);
    if (cleanFolder(upFolder) === path || path === '') reload();
    else calcUsage();
  }
  function pickFiles(fl: FileList | null) {
    if (fl && fl.length) runUploads(Array.from(fl));
    if (fileRef.current) fileRef.current.value = '';
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    pickFiles(e.dataTransfer.files);
  }

  /* ── Sil / yeniden sıkıştır ── */
  async function doDelete(paths: string[]) {
    setWork(true);
    const { error } = await supabase().storage.from(B).remove(paths);
    setWork(false);
    setConfirm(null);
    if (error) return toast('Silinemedi: ' + storageMessage(error.message), true);
    toast(`${paths.length} dosya silindi`);
    setSel(new Set());
    refreshSite();
    reload();
  }

  async function doRecompress(paths: string[]) {
    const s = settings ?? (await getMediaSettings());
    setConfirm(null);
    const targets = paths.filter((p) => IMG_RE.test(p));
    const base = Date.now();
    setRows(targets.map((p, i) => ({ id: base + i, name: p, state: 'wait', text: 'Sırada' })));
    setRunning(true);
    let b = 0;
    let a = 0;
    let n = 0;
    const patch = (id: number, p: Partial<Row>) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...p } : r)));
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      const id = base + i;
      patch(id, { state: 'work', text: 'İndiriliyor ve sıkıştırılıyor…' });
      try {
        const res = await fetch(publicUrl(p), { cache: 'no-store' });
        if (!res.ok) throw new Error('Dosya indirilemedi');
        const blob = await res.blob();
        const file = new File([blob], p.split('/').pop() ?? 'gorsel', { type: blob.type || 'image/jpeg' });
        const r = await compressImage(file, s, { force: true });
        if (r.untouched || r.after >= file.size * 0.97) {
          patch(id, { state: 'skip', text: `${fmtBytes(file.size)} · zaten optimize, atlandı` });
          continue;
        }
        const up = await supabase().storage.from(B).upload(p, r.blob, { contentType: r.mime, upsert: true, cacheControl: '3600' });
        if (up.error) throw new Error(storageMessage(up.error.message, r.after));
        b += file.size;
        a += r.after;
        n++;
        patch(id, { state: 'ok', text: gainText(file.size, r.after) });
      } catch (e) {
        patch(id, { state: 'err', text: e instanceof Error ? e.message : 'Yeniden sıkıştırılamadı' });
      }
    }
    setGain((g) => ({ before: g.before + b, after: g.after + a, n: g.n + n }));
    setRunning(false);
    setSel(new Set());
    toast(n ? `${n} görsel yeniden sıkıştırıldı (${fmtBytes(b - a)} kazanç)` : 'Küçülebilecek görsel bulunamadı');
    reload();
  }

  const done = rows.filter((r) => r.state !== 'wait' && r.state !== 'work').length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const selFiles = [...sel].filter((p) => items?.some((i) => i.path === p && !i.folder));
  const saved = gain.before - gain.after;

  return (
    <>
      <TopBar title="Medya" sub="Görseller, otomatik sıkıştırma ve depolama" onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner">
          <div className="kpis">
            <Kpi label="Toplam dosya" value={usage ? (usage.capped ? '≥ ' : '') + usage.files.toLocaleString('tr-TR') : '…'} sub="Tüm klasörlerde" tone="ac" icon={<Images size={17} />} />
            <Kpi label="Depolama kullanımı" value={usage ? fmtBytes(usage.bytes) : '…'} sub={usage?.capped ? 'Klasör sayısı çok; kısmi sonuç' : 'product-images alanı'} tone="blue" icon={<HardDrive size={17} />} />
            <Kpi label="Bu oturumda kazanç" value={saved > 0 ? fmtBytes(saved) : '0 KB'} sub={gain.before ? `%${Math.round((saved / gain.before) * 100)} küçüldü` : 'Yükleme yapınca görünür'} tone="green" icon={<TrendingDown size={17} />} />
            <Kpi label="Sıkıştırılan görsel" value={String(gain.n)} sub="Bu oturumda" tone="amber" icon={<ImageDown size={17} />} />
          </div>

          {settings ? <SettingsCard saved={settings} onSaved={setSettings} toast={toast} /> : <Loading />}

          <section className="card" style={{ marginBottom: 18 }}>
            <div className="card-h">
              <h2 className="card-t">Görsel yükle</h2>
              <span className="card-m">Birden fazla dosya sürükleyebilirsin</span>
            </div>
            <div className="md-up-top">
              <Field label="Yüklenecek klasör" hint="Yeni bir ad yazarsan klasör otomatik oluşur.">
                <input className="inp" list="md-folders" value={upFolder} onChange={(e) => setUpFolder(e.target.value)} placeholder="site" />
                <datalist id="md-folders">
                  {rootFolders.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </Field>
            </div>
            {settings && (
              <p className="md-sum">
                Kayıtlı ayarlar: en çok {settings.max_px} px · {settings.format === 'jpeg' ? 'JPEG' : settings.format === 'auto' ? 'WebP/JPEG' : 'WebP'} · kalite %{Math.round(settings.quality * 100)} · {settings.skip_below_kb} KB altı atlanır · en çok {settings.max_upload_mb} MB
              </p>
            )}
            <div
              className={`md-drop${over ? ' over' : ''}`}
              onClick={() => !running && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !running && fileRef.current?.click()}
            >
              <Upload size={24} />
              <b>{running ? 'İşleniyor…' : 'Görselleri buraya bırak ya da seç'}</b>
              <span>JPG, PNG, WebP · her biri en çok {settings?.max_upload_mb ?? 15} MB</span>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => pickFiles(e.target.files)} />
            </div>
            {rows.length > 0 && (
              <>
                <div className="md-bar" aria-label="İlerleme">
                  <i style={{ width: pct + '%' }} />
                </div>
                <div className="md-q">
                  {rows.map((r) => (
                    <div className="md-qr" key={r.id}>
                      {r.thumb ? <img src={r.thumb} alt="" /> : <span className="ph">{r.state === 'ok' ? <Check size={16} /> : r.state === 'err' ? <X size={16} /> : <Images size={16} />}</span>}
                      <div style={{ minWidth: 0 }}>
                        <div className="n">{r.name}</div>
                        <div className={`m${r.state === 'ok' ? ' ok' : r.state === 'err' ? ' bad' : ''}`}>{r.text}</div>
                      </div>
                      <span className="cell-muted">{r.state === 'work' ? '…' : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card">
            <div className="card-h">
              <h2 className="card-t">Dosyalar</h2>
              <span className="card-m">{items ? `${view.filter((i) => !i.folder).length} dosya${view.some((i) => i.folder) ? `, ${view.filter((i) => i.folder).length} klasör` : ''}` : ''}</span>
              <button type="button" className="icon-btn" onClick={reload} title="Yenile" disabled={busyList}>
                <RefreshCw size={15} />
              </button>
            </div>
            <div className="md-bar2">
              <div className="md-crumb">
                <button type="button" onClick={() => go('')}>Tüm klasörler</button>
                {crumbs.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    /{i === crumbs.length - 1 ? <b>{c}</b> : <button type="button" onClick={() => go(crumbs.slice(0, i + 1).join('/'))}>{c}</button>}
                  </span>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--tx3)' }} />
                <input className="inp" style={{ paddingLeft: 30 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dosya ara…" />
              </div>
              <select className="inp" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sırala">
                <option value="yeni">En yeni</option>
                <option value="eski">En eski</option>
                <option value="buyuk">En büyük</option>
                <option value="kucuk">En küçük</option>
                <option value="ad">Ada göre</option>
              </select>
              {files.length > 0 && (
                <button type="button" className="btn ghost sm" onClick={() => setSel(selFiles.length === files.length ? new Set() : new Set(files.map((f) => f.path)))}>
                  {selFiles.length === files.length ? 'Seçimi kaldır' : 'Hepsini seç'}
                </button>
              )}
            </div>
            {selFiles.length > 0 && (
              <div className="md-sel">
                <b>{selFiles.length} dosya seçili</b>
                <button type="button" className="btn ghost sm" disabled={running} onClick={() => setConfirm({ kind: 'recompress', paths: selFiles })}>
                  <ImageDown size={14} /> Yeniden sıkıştır
                </button>
                <button type="button" className="btn danger sm" onClick={() => setConfirm({ kind: 'del', paths: selFiles })}>
                  <Trash2 size={14} /> Sil
                </button>
              </div>
            )}
            {err && (
              <div className="alert err" style={{ margin: 16 }}>
                {err}
              </div>
            )}
            {!items && !err ? (
              <Loading />
            ) : view.length === 0 && !err ? (
              <Empty title={q ? 'Eşleşen dosya yok' : 'Bu klasör boş'} text={q ? 'Aramayı değiştirmeyi dene.' : 'Yukarıdan görsel yükleyebilirsin.'} />
            ) : (
              <div className="md-grid">
                {view.map((i) =>
                  i.folder ? (
                    <button type="button" key={i.path} className="md-it md-folder" onClick={() => go(i.path)}>
                      <Folder size={30} strokeWidth={1.5} />
                      {i.name}
                    </button>
                  ) : (
                    <div key={i.path} className={`md-it${sel.has(i.path) ? ' on' : ''}`}>
                      <input type="checkbox" className="md-ck" checked={sel.has(i.path)} onChange={() => toggle(i.path)} aria-label={`${i.name} seç`} />
                      <button type="button" className="md-img" onClick={() => copy(i.path)} title="Adresi kopyalamak için tıkla">
                        {IMG_RE.test(i.name) ? <img src={publicUrl(i.path)} alt={i.name} loading="lazy" /> : <Images size={26} />}
                      </button>
                      <div className="md-meta">
                        <b title={i.name}>{i.name}</b>
                        <span>
                          {fmtBytes(i.size)} · {dt(i.created)}
                        </span>
                      </div>
                      <div className="md-act">
                        <button type="button" className="icon-btn" onClick={() => copy(i.path)} title="Adresi kopyala">
                          <Copy size={14} />
                        </button>
                        <button type="button" className="icon-btn" onClick={() => setConfirm({ kind: 'del', paths: [i.path] })} title="Sil">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
            {more && (
              <div className="md-more">
                <button type="button" className="btn ghost" disabled={busyList} onClick={() => list(path, items?.length ?? 0)}>
                  {busyList ? 'Yükleniyor…' : 'Daha fazla göster'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {confirm?.kind === 'del' && (
        <Confirm
          title={confirm.paths.length > 1 ? `${confirm.paths.length} dosya silinsin mi?` : 'Dosya silinsin mi?'}
          text="Silinen görseller geri getirilemez. Sitede bu adresleri kullanan yerlerde görsel kırık görünür."
          confirmText="Sil"
          busy={work}
          onConfirm={() => doDelete(confirm.paths)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === 'recompress' && (
        <Confirm
          title={`${confirm.paths.length} görsel yeniden sıkıştırılsın mı?`}
          text="Dosyalar indirilip kayıtlı ayarlarla yeniden sıkıştırılır ve aynı adrese yazılır. Yalnızca küçülenler değiştirilir; eski hali geri alınamaz. Tarayıcı önbelleği nedeniyle sitede görünmesi birkaç dakika sürebilir."
          confirmText="Sıkıştır"
          danger={false}
          onConfirm={() => doRecompress(confirm.paths)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {node}
    </>
  );
}
