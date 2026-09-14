import type { Metadata } from 'next';
import NavBar from '@/app/components/NavBar';

export const metadata: Metadata = {
  title: 'Demleme — Masaya Hoşgeldin',
  description: 'Demleme; sohbetin, çayın ve hikâyenin yavaş yavaş demlendiği bir masa.',
};

export default function Home() {
  return (
    <>
      <NavBar />
      <div dangerouslySetInnerHTML={{ __html: `

<!-- ══ PRELOADER ══ -->
<div id="preloader" style="position:fixed;inset:0;z-index:9000;background:var(--ink);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0">
  <div id="preloader-text" style="overflow:hidden;display:flex;gap:0">
    <span class="pre-char" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,6vw,4rem);font-weight:700;letter-spacing:.12em;color:var(--cream-fixed);transform:translateY(100%);display:inline-block;transition:transform .6s cubic-bezier(.16,1,.3,1)">d</span>
    <span class="pre-char" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,6vw,4rem);font-weight:700;letter-spacing:.12em;color:var(--cream-fixed);transform:translateY(100%);display:inline-block;transition:transform .6s cubic-bezier(.16,1,.3,1);transition-delay:.06s">e</span>
    <span class="pre-char" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,6vw,4rem);font-weight:700;letter-spacing:.12em;color:var(--cream-fixed);transform:translateY(100%);display:inline-block;transition:transform .6s cubic-bezier(.16,1,.3,1);transition-delay:.12s">m</span>
    <span class="pre-char" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,6vw,4rem);font-weight:700;letter-spacing:.12em;color:var(--cream-fixed);transform:translateY(100%);display:inline-block;transition:transform .6s cubic-bezier(.16,1,.3,1);transition-delay:.18s">l</span>
    <span class="pre-char" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,6vw,4rem);font-weight:700;letter-spacing:.12em;color:var(--cream-fixed);transform:translateY(100%);display:inline-block;transition:transform .6s cubic-bezier(.16,1,.3,1);transition-delay:.24s">e</span>
    <span class="pre-char" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,6vw,4rem);font-weight:700;letter-spacing:.12em;color:var(--cream-fixed);transform:translateY(100%);display:inline-block;transition:transform .6s cubic-bezier(.16,1,.3,1);transition-delay:.30s">m</span>
    <span class="pre-char" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,6vw,4rem);font-weight:700;letter-spacing:.12em;color:var(--cream-fixed);transform:translateY(100%);display:inline-block;transition:transform .6s cubic-bezier(.16,1,.3,1);transition-delay:.36s">e</span>
  </div>
  <div id="preloader-line" style="width:0;height:2px;background:var(--rust);margin-top:16px;transition:width 1s ease .8s;max-width:200px"></div>
</div>

<!-- ══ CUSTOM CURSOR ══ -->
<div id="cursor" style="position:fixed;pointer-events:none;z-index:8999;width:20px;height:20px;border-radius:50%;background:var(--rust);mix-blend-mode:multiply;transform:translate(-50%,-50%);transition:transform .15s ease,width .3s ease,height .3s ease,opacity .3s ease;opacity:0;top:0;left:0"></div>
<div id="cursor-follower" style="position:fixed;pointer-events:none;z-index:8998;width:40px;height:40px;border-radius:50%;border:1.5px solid var(--rust);transform:translate(-50%,-50%);transition:top .12s ease,left .12s ease,width .3s ease,height .3s ease,opacity .3s ease;opacity:0;top:0;left:0"></div>

<!-- ══ WRAPPER ══ -->
<div id="smooth-wrapper">
<div id="smooth-content">

<!-- ══════════════════════════════════════════════
     1. HERO
══════════════════════════════════════════════ -->
<section id="hero" style="min-height:100svh;display:flex;flex-direction:column;justify-content:center;padding:80px var(--pad) 60px;position:relative;overflow:hidden;background:var(--cream)">

  <!-- Büyük arka plan yazısı -->
  <div id="hero-bg-text" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Kodchasan',sans-serif;font-size:clamp(8rem,22vw,22rem);font-weight:800;color:rgba(26,18,8,.04);white-space:nowrap;pointer-events:none;line-height:1;user-select:none">
    DEMLEME
  </div>

  <!-- Çay animasyonu — sağ üst -->
  <div id="hero-gif" style="position:absolute;top:-60px;right:-20px;width:50%;height:55%;display:flex;align-items:flex-start;justify-content:center;pointer-events:none">
    <img src="/images/cay-animasyon.webp" alt="" style="width:90%;max-width:520px;object-fit:contain;transform:translateY(20px);opacity:0;transition:transform 1.2s cubic-bezier(.16,1,.3,1) .4s,opacity 1s ease .4s" id="hero-gif-img">
  </div>

  <!-- Sol içerik -->
  <div style="position:relative;z-index:2;max-width:600px">
    <div style="overflow:hidden;margin-bottom:8px">
      <p id="hero-eyebrow" style="font-size:.7rem;letter-spacing:.25em;color:var(--rust);font-weight:800;margin:0;transform:translateY(100%);transition:transform .8s cubic-bezier(.16,1,.3,1)">MASAYA HOŞGELDİN</p>
    </div>
    <div style="overflow:hidden">
      <h1 id="hero-h1" style="font-family:'Kodchasan',sans-serif;font-size:clamp(2.8rem,6.5vw,6rem);font-weight:800;line-height:.9;margin:0 0 32px;transform:translateY(110%);transition:transform 1s cubic-bezier(.16,1,.3,1) .1s">
        MASAYA<br><em style="color:var(--rust);font-style:normal">HOŞGELDİN</em>
      </h1>
    </div>
    <div id="hero-cta" style="display:flex;gap:20px;align-items:center;opacity:0;transform:translateY(20px);transition:opacity .8s ease .5s,transform .8s ease .5s">
      <a href="https://youtube.com/@demleme" target="_blank" rel="noopener" aria-label="YouTube'da İzle"
        style="display:block;transition:transform .2s"
        onmouseover="this.style.transform='scale(1.1) rotate(-3deg)'"
        onmouseout="this.style.transform='scale(1)'">
        <img src="/images/yt-btn.png" width="72" height="54" alt="YouTube" style="object-fit:contain;display:block">
      </a>
      <a href="/urunler" aria-label="Mağaza"
        style="display:block;transition:transform .2s"
        onmouseover="this.style.transform='scale(1.1) rotate(3deg)'"
        onmouseout="this.style.transform='scale(1)'">
        <img src="/images/sepet-btn.png" width="60" height="60" alt="Mağaza" style="object-fit:contain;display:block">
      </a>
    </div>
  </div>

  <!-- Scroll hint -->
  <div style="position:absolute;bottom:28px;right:var(--pad);display:flex;flex-direction:column;align-items:center;gap:8px;opacity:.4" id="scroll-hint">
    <span style="font-size:.65rem;letter-spacing:.15em;writing-mode:vertical-rl">SCROLL</span>
    <div style="width:1px;height:48px;background:var(--ink);transform-origin:top;animation:scrollLine 1.8s ease-in-out infinite"></div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     2. FULL-BLEED SAHNE — mutfak
══════════════════════════════════════════════ -->
<div class="scene-banner reveal-section" style="overflow:hidden;position:relative;height:clamp(300px,45vw,560px)">
  <img src="/images/scene_kitchen.webp" alt="Mutfak sahnesi"
    style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;transform:scale(1.08);transition:transform 8s ease" id="scene-kitchen-img">
  <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(26,18,8,.55) 0%,transparent 60%)"></div>
  <div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 var(--pad)">
    <div>
      <p style="font-size:.65rem;letter-spacing:.22em;color:var(--rust);font-weight:800;margin:0 0 12px">DEMLEME NEDİR</p>
      <h2 style="font-family:'Kodchasan',sans-serif;font-size:clamp(2.2rem,5vw,5rem);font-weight:800;color:var(--cream-fixed);line-height:.9;margin:0">SOFRADA<br>BAŞLAR,<br><em style="color:var(--rust);font-style:normal">HAYATA</em><br>YAYILIR</h2>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════
     3. İSTATİSTİKLER
══════════════════════════════════════════════ -->
<section id="stats" style="background:var(--cream-deep);border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden">
  <div style="max-width:var(--wrap);margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);width:100%" class="stats-grid">
    <div style="padding:64px 40px;display:flex;flex-direction:column;align-items:center;gap:8px;border-right:1px solid var(--line)">
      <div class="stat-count" data-target="11999" style="font-family:'Kodchasan',sans-serif;font-size:clamp(3rem,6vw,6rem);font-weight:800;color:var(--rust);line-height:1">0</div>
      <div style="font-size:.65rem;letter-spacing:.18em;color:var(--ink-faint);font-weight:700">DİNLEYEN</div>
    </div>
    <div style="padding:64px 40px;display:flex;flex-direction:column;align-items:center;gap:8px;border-right:1px solid var(--line)">
      <div class="stat-count" data-target="84" style="font-family:'Kodchasan',sans-serif;font-size:clamp(3rem,6vw,6rem);font-weight:800;color:var(--ink);line-height:1">0</div>
      <div style="font-size:.65rem;letter-spacing:.18em;color:var(--ink-faint);font-weight:700">BÖLÜM</div>
    </div>
    <div style="padding:64px 40px;display:flex;flex-direction:column;align-items:center;gap:8px">
      <div class="stat-count" data-target="199" style="font-family:'Kodchasan',sans-serif;font-size:clamp(3rem,6vw,6rem);font-weight:800;color:var(--ink);line-height:1">0</div>
      <div style="font-size:.65rem;letter-spacing:.18em;color:var(--ink-faint);font-weight:700">TOPLULUK</div>
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     4. GIF ANİMASYON BÖLÜMÜ — "Anlar"
══════════════════════════════════════════════ -->
<section id="anlar" style="padding:100px var(--pad);background:var(--cream);overflow:hidden">
  <div style="max-width:var(--wrap);margin:0 auto">
    <div class="reveal-section" style="margin-bottom:60px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px">
      <div>
        <p style="font-size:.65rem;letter-spacing:.22em;color:var(--rust);font-weight:800;margin:0 0 12px">DEMLEME'DEN ANLAR</p>
        <h2 style="font-family:'Kodchasan',sans-serif;font-size:clamp(2.5rem,5.5vw,5rem);font-weight:800;line-height:.9;margin:0">HER YER<br><em style="color:var(--rust);font-style:normal">SOFRA</em></h2>
      </div>
      <p style="font-size:1rem;color:var(--ink-faint);max-width:340px;line-height:1.7;margin:0">
        Mutfakta, arabada, sofrada — çay eşliğinde her an bir hikâye doğuyor.
      </p>
    </div>

    <!-- 2x2 GIF grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" class="gif-grid">

      <div class="gif-card reveal-section" style="position:relative;overflow:hidden;border-radius:20px;background:var(--cream-deep)">
        <video autoplay loop muted playsinline style="width:100%;display:block;object-fit:cover">
          <source src="/images/demleme_mutfak_640.webm" type="video/webm">
        </video>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 24px;background:linear-gradient(to top,rgba(26,18,8,.7) 0%,transparent 100%)">
          <p style="margin:0;font-family:'Kodchasan',sans-serif;font-size:1.1rem;font-weight:700;color:var(--cream-fixed)">Mutfakta</p>
        </div>
      </div>

      <div class="gif-card reveal-section" style="position:relative;overflow:hidden;border-radius:20px;background:var(--cream-deep)">
        <video autoplay loop muted playsinline style="width:100%;display:block;object-fit:cover">
          <source src="/images/demleme_kalabalik_2s_640.webm" type="video/webm">
        </video>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 24px;background:linear-gradient(to top,rgba(26,18,8,.7) 0%,transparent 100%)">
          <p style="margin:0;font-family:'Kodchasan',sans-serif;font-size:1.1rem;font-weight:700;color:var(--cream-fixed)">Sofrada</p>
        </div>
      </div>

      <div class="gif-card reveal-section" style="position:relative;overflow:hidden;border-radius:20px;background:var(--cream-deep)">
        <video autoplay loop muted playsinline style="width:100%;display:block;object-fit:cover">
          <source src="/images/demleme_araba_640.webm" type="video/webm">
        </video>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 24px;background:linear-gradient(to top,rgba(26,18,8,.7) 0%,transparent 100%)">
          <p style="margin:0;font-family:'Kodchasan',sans-serif;font-size:1.1rem;font-weight:700;color:var(--cream-fixed)">Yolda</p>
        </div>
      </div>

      <div class="gif-card reveal-section" style="position:relative;overflow:hidden;border-radius:20px;background:var(--cream-deep)">
        <video autoplay loop muted playsinline style="width:100%;display:block;object-fit:cover">
          <source src="/images/demleme_cay_loop10s_720.webm" type="video/webm">
        </video>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 24px;background:linear-gradient(to top,rgba(26,18,8,.7) 0%,transparent 100%)">
          <p style="margin:0;font-family:'Kodchasan',sans-serif;font-size:1.1rem;font-weight:700;color:var(--cream-fixed)">Demlerken</p>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     5. DEMLEYEN KİM — iki sütun, scene görseller
══════════════════════════════════════════════ -->
<section id="demleyen" style="padding:0;background:var(--cream);overflow:hidden">

  <!-- Araba sahnesi — full bleed separator -->
  <div class="reveal-section" style="position:relative;height:clamp(260px,38vw,480px);overflow:hidden">
    <img src="/images/scene_car.webp" alt="Yolda sohbet"
      style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block">
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,var(--cream) 100%)"></div>
  </div>

  <div style="max-width:var(--wrap);margin:0 auto;padding:60px var(--pad) 100px">
    <div class="reveal-section" style="margin-bottom:60px">
      <p style="font-size:.65rem;letter-spacing:.22em;color:var(--rust);font-weight:800;margin:0 0 12px">DEMLEYEN KİM</p>
      <h2 style="font-family:'Kodchasan',sans-serif;font-size:clamp(2.5rem,6vw,5rem);font-weight:800;line-height:.9;margin:0">GAREN<br>KÖSEDAĞ</h2>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start" class="two-col">
      <div class="reveal-section" style="position:relative">
        <img src="/images/garen-foto.png" alt="Garen Kösedağ"
          style="width:100%;border-radius:20px;object-fit:cover;aspect-ratio:3/4;display:block" />
        <div style="position:absolute;bottom:16px;left:16px;background:var(--rust);color:var(--cream-fixed);padding:12px 18px;border-radius:12px;font-weight:800;font-size:.9rem">
          84 Bölüm
        </div>
      </div>
      <div class="reveal-section" style="display:flex;flex-direction:column;gap:24px;padding-top:20px">
        <p style="font-size:1rem;color:var(--ink-faint);line-height:1.8;margin:0">
          İçeriği bu hafta geliyor. Garen'in hikâyesi, sofrası ve demlemesi burada olacak.
        </p>
        <a href="/ben-kimim" style="display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--rust);text-decoration:none;font-size:.9rem">
          Daha fazla oku →
        </a>
      </div>
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     6. SOFRA ILLUSTRATION — tam genişlik
══════════════════════════════════════════════ -->
<div class="reveal-section" style="background:var(--cream-deep);padding:80px var(--pad);overflow:hidden;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
  <div style="max-width:var(--wrap);margin:0 auto;display:grid;grid-template-columns:1fr 1.4fr;gap:60px;align-items:center" class="two-col">
    <div>
      <p style="font-size:.65rem;letter-spacing:.22em;color:var(--rust);font-weight:800;margin:0 0 12px">SOFRANIN RUHİ</p>
      <h2 style="font-family:'Kodchasan',sans-serif;font-size:clamp(2.2rem,5vw,4.5rem);font-weight:800;line-height:.9;margin:0 0 24px">BİRLİKTE<br>YİYİNK,<br><em style="color:var(--rust);font-style:normal">KONUŞALIM</em></h2>
      <p style="color:var(--ink-faint);font-size:.95rem;line-height:1.75;max-width:380px;margin:0">
        Demleme, bir yemek masasının etrafında dönen bir podcast. Her bölüm, yeni bir konuk. Her konuk, yeni bir hikâye.
      </p>
    </div>
    <div>
      <img src="/images/sofra.png" alt="Sofra illüstrasyonu"
        style="width:100%;max-width:700px;display:block;object-fit:contain">
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════
     7. SHOP
══════════════════════════════════════════════ -->
<section id="shop-pin" style="background:var(--cream);padding:80px 0 0;overflow:hidden">
  <div style="max-width:var(--wrap);margin:0 auto;padding:0 var(--pad);display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:40px">
    <div class="reveal-section">
      <p style="font-size:.65rem;letter-spacing:.22em;color:var(--rust);font-weight:800;margin:0 0 10px">DEMLEME SHOP</p>
      <h2 style="font-family:'Kodchasan',sans-serif;font-size:clamp(2.5rem,5vw,5rem);font-weight:800;margin:0;line-height:.9">SOFRADAN<br>GELİYOR</h2>
    </div>
    <a href="/urunler" style="font-weight:700;color:var(--ink);text-decoration:none;font-size:.82rem;letter-spacing:.06em;white-space:nowrap">Tümünü Gör →</a>
  </div>

  <div class="shop-strip" style="padding:0 var(--pad) 60px;gap:20px">
    <a href="/urunler/demleme-kupasi" class="shop-card shop-card-cream tilt-card">
      <div class="shop-card-img"><img src="/images/demleme-kupasi.webp" alt="Demleme Kupası" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="shop-card-info"><div class="shop-card-name">Demleme Kupası</div><div class="shop-card-price">₺290</div></div>
    </a>
    <a href="/urunler/sofra-tisortu" class="shop-card shop-card-lav tilt-card">
      <span class="shop-new-badge">YENİ</span>
      <div class="shop-card-img"><img src="/images/sofra-tisortu.webp" alt="Sofra Tişörtü" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="shop-card-info"><div class="shop-card-name">Sofra Tişörtü</div><div class="shop-card-price">₺450</div></div>
    </a>
    <a href="/urunler/mini-cay-seti" class="shop-card shop-card-rust tilt-card">
      <div class="shop-card-img"><img src="/images/mini-cay-seti.webp" alt="Mini Çay Seti" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="shop-card-info"><div class="shop-card-name">Mini Çay Seti</div><div class="shop-card-price">₺620</div></div>
    </a>
    <a href="/urunler/demleme-defteri" class="shop-card shop-card-green tilt-card">
      <div class="shop-card-img"><img src="/images/demleme-defteri.webp" alt="Demleme Defteri" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="shop-card-info"><div class="shop-card-name">Demleme Defteri</div><div class="shop-card-price">₺180</div></div>
    </a>
    <a href="/urunler/kupa-altligi-seti" class="shop-card shop-card-cream tilt-card">
      <div class="shop-card-img"><img src="/images/kupa-altligi.webp" alt="Kupa Altlığı" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="shop-card-info"><div class="shop-card-name">Kupa Altlığı Seti</div><div class="shop-card-price">₺140</div></div>
    </a>
    <a href="/urunler/bolum-posteri" class="shop-card shop-card-lav tilt-card">
      <div class="shop-card-img"><img src="/images/bolum-posteri.webp" alt="Bölüm Posteri" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="shop-card-info"><div class="shop-card-name">Bölüm Posteri</div><div class="shop-card-price">₺120</div></div>
    </a>
    <a href="/urunler" class="shop-card shop-card-dark" style="min-height:260px;align-items:center;justify-content:center">
      <div style="font-family:'Kodchasan',sans-serif;font-size:1.8rem;font-weight:800;color:var(--cream-fixed);text-align:center;line-height:1;padding:20px">TÜMÜNÜ<br>GÖR</div>
      <div style="color:rgba(243,238,225,.35);font-size:1.4rem;margin-top:8px">→</div>
    </a>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     8. SOFRA SCENE — table
══════════════════════════════════════════════ -->
<div style="position:relative;height:clamp(300px,42vw,540px);overflow:hidden">
  <img src="/images/scene_table.webp" alt="Sofra sahnesi"
    id="scene-table-img"
    style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;transform:scale(1.06);transition:transform 8s ease">
  <div style="position:absolute;inset:0;background:linear-gradient(to left,rgba(26,18,8,.5) 0%,transparent 55%)"></div>
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;padding:0 var(--pad)">
    <div style="text-align:right">
      <p style="font-size:.65rem;letter-spacing:.22em;color:var(--rust);font-weight:800;margin:0 0 12px">BU HAFTAKİ BÖLÜM</p>
      <h2 style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,4.5vw,4.5rem);font-weight:800;color:var(--cream-fixed);line-height:.9;margin:0">KULAKLIĞINI TAK,<br><em style="color:var(--rust);font-style:normal">SOFRAYA OTUR</em></h2>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════
     9. BU HAFTAKİ BÖLÜM
══════════════════════════════════════════════ -->
<section id="bu-hafta" style="padding:80px var(--pad);background:var(--cream)">
  <div style="max-width:var(--wrap);margin:0 auto;width:100%">
    <div class="episode-main reveal-section">
      <div style="position:relative;aspect-ratio:16/9;background:#000">
        <iframe src="https://www.youtube.com/embed/aK_btqNLtE0" title="Bölüm 84" frameborder="0" allowfullscreen style="width:100%;height:100%;position:absolute;top:0;left:0"></iframe>
      </div>
      <div style="padding:40px;display:flex;flex-direction:column;justify-content:center;gap:16px;background:var(--cream-deep)">
        <span style="font-size:.65rem;letter-spacing:.15em;color:var(--rust);font-weight:800">SON BÖLÜM</span>
        <h3 style="font-family:'Kodchasan',sans-serif;font-size:clamp(1.8rem,3vw,2.8rem);font-weight:800;margin:0;line-height:.95">YİNE OLSA<br>YİNE YAPARDIM</h3>
        <p style="color:var(--ink-faint);font-size:.9rem;margin:0">Bölüm 84 · 42 dk</p>
        <a href="https://youtube.com/@demleme" target="_blank" rel="noopener"
          style="display:inline-flex;align-items:center;gap:10px;padding:12px 20px;background:var(--ink);color:var(--cream-fixed);border-radius:40px;font-weight:700;font-size:.85rem;text-decoration:none;width:fit-content">
          <img src="/images/yt_icon.png" width="20" height="16" alt="" style="object-fit:contain">
          YouTube'da İzle
        </a>
      </div>
    </div>

    <p style="font-size:.65rem;letter-spacing:.15em;color:var(--ink-faint);font-weight:700;margin:40px 0 20px">ESKİ BÖLÜMLER</p>
    <div class="episodes-strip">
      <div style="flex:0 0 280px;scroll-snap-align:start;background:var(--cream-deep);border-radius:16px;overflow:hidden">
        <div style="position:relative;aspect-ratio:16/9;background:#000">
          <iframe src="https://www.youtube.com/embed/R_2epNt1xi4" title="Bölüm 83" frameborder="0" allowfullscreen style="width:100%;height:100%;position:absolute;top:0;left:0"></iframe>
        </div>
        <div style="padding:14px"><div style="font-weight:700;font-size:.85rem;margin-bottom:4px">Hangi İlin İnsanı Nasıl?</div><div style="color:var(--ink-faint);font-size:.75rem">Bölüm 83 · 38 dk</div></div>
      </div>
      <div style="flex:0 0 280px;scroll-snap-align:start;background:var(--cream-deep);border-radius:16px;overflow:hidden">
        <div style="position:relative;aspect-ratio:16/9;background:#000">
          <iframe src="https://www.youtube.com/embed/dsgQ1lz4hRU" title="Bölüm 82" frameborder="0" allowfullscreen style="width:100%;height:100%;position:absolute;top:0;left:0"></iframe>
        </div>
        <div style="padding:14px"><div style="font-weight:700;font-size:.85rem;margin-bottom:4px">Düğün Hazırlığı Zor İş</div><div style="color:var(--ink-faint);font-size:.75rem">Bölüm 82 · 51 dk</div></div>
      </div>
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     10. ANKET
══════════════════════════════════════════════ -->
<section id="anket" style="padding:120px var(--pad);background:var(--cream-deep);border-top:1px solid var(--line)">
  <div style="max-width:600px;margin:0 auto;text-align:center;display:flex;flex-direction:column;gap:32px" class="reveal-section">
    <div>
      <p style="font-size:.65rem;letter-spacing:.22em;color:var(--rust);font-weight:800;margin:0 0 12px">SOFRA ANKETİ</p>
      <h2 style="font-family:'Kodchasan',sans-serif;font-size:clamp(2rem,5vw,4rem);font-weight:800;margin:0;line-height:.9">BİR SONRAKI<br>BÖLÜM NE OLSUN?</h2>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px" id="pollOptions">
      <button onclick="demlemeVote(this)" style="padding:16px 24px;border:1.5px solid var(--line);border-radius:40px;background:transparent;cursor:pointer;font-size:.95rem;font-weight:600;font-family:var(--font-body);text-align:left;display:flex;justify-content:space-between;align-items:center;transition:all .2s">Yemek kültürü <span>—</span></button>
      <button onclick="demlemeVote(this)" style="padding:16px 24px;border:1.5px solid var(--line);border-radius:40px;background:transparent;cursor:pointer;font-size:.95rem;font-weight:600;font-family:var(--font-body);text-align:left;display:flex;justify-content:space-between;align-items:center;transition:all .2s">Çocukluk anıları <span>—</span></button>
      <button onclick="demlemeVote(this)" style="padding:16px 24px;border:1.5px solid var(--line);border-radius:40px;background:transparent;cursor:pointer;font-size:.95rem;font-weight:600;font-family:var(--font-body);text-align:left;display:flex;justify-content:space-between;align-items:center;transition:all .2s">İş hayatı <span>—</span></button>
      <button onclick="demlemeVote(this)" style="padding:16px 24px;border:1.5px solid var(--line);border-radius:40px;background:transparent;cursor:pointer;font-size:.95rem;font-weight:600;font-family:var(--font-body);text-align:left;display:flex;justify-content:space-between;align-items:center;transition:all .2s">Aşk ve ilişkiler <span>—</span></button>
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     FOOTER
══════════════════════════════════════════════ -->
<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <a href="#hero" class="footer-logo">
        <img class="footer-logo-img" src="/images/logo_still_foot.png" alt="Demleme" style="height:56px;width:auto;object-fit:contain">
      </a>
      <p>İyi bir sohbet, iyi bir dünyaya katkı olsun.</p>
      <div class="footer-social">
        <a href="https://youtube.com/@demleme" target="_blank" rel="noopener" aria-label="YouTube">
          <img src="/images/yt_icon.png" width="28" height="22" alt="YouTube" style="object-fit:contain">
        </a>
        <a href="https://instagram.com/demleme" target="_blank" rel="noopener" aria-label="Instagram">
          <img src="/images/ig_icon_dark.png" width="24" height="24" alt="Instagram" style="object-fit:contain">
        </a>
        <a href="mailto:merhaba@demleme.com" aria-label="E-posta">
          <img src="/images/mail_icon_dark.png" width="26" height="20" alt="Mail" style="object-fit:contain;opacity:.8">
        </a>
      </div>
    </div>
    <div class="footer-col">
      <h5>Keşfet</h5>
      <ul>
        <li><a href="/">Ana Sayfa</a></li>
        <li><a href="/#bu-hafta">YouTube</a></li>
        <li><a href="/#demleyen">Hakkımızda</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h5>Mağaza</h5>
      <ul>
        <li><a href="/urunler">Tüm Ürünler</a></li>
        <li><a href="/urunler">Tişört</a></li>
        <li><a href="/urunler">Kupa</a></li>
        <li><a href="/urunler">Çay Seti</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h5>Yardım</h5>
      <ul>
        <li><a href="#">Kargo & Teslimat</a></li>
        <li><a href="#">İade & Değişim</a></li>
        <li><a href="/iletisim">İletişim</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p class="footer-copy">© 2026 Demleme. Tüm hakları saklıdır.</p>
    <div class="footer-legal">
      <a href="#">KVKK</a>
      <a href="#">Kullanım Şartları</a>
      <a href="#">Gizlilik Politikası</a>
    </div>
  </div>
</footer>

</div><!-- smooth-content -->
</div><!-- smooth-wrapper -->

<style>
@keyframes scrollLine { 0%{transform:scaleY(0);transform-origin:top} 50%{transform:scaleY(1);transform-origin:top} 51%{transform-origin:bottom} 100%{transform:scaleY(0);transform-origin:bottom} }

.reveal-section { opacity:0; transform:translateY(40px); transition:opacity .9s ease, transform .9s cubic-bezier(.16,1,.3,1); }
.reveal-section.in { opacity:1; transform:translateY(0); }

/* GIF kartları hover */
.gif-card { cursor:pointer; transition:transform .3s ease,box-shadow .3s ease; }
.gif-card:hover { transform:scale(1.02); box-shadow:0 16px 48px rgba(26,18,8,.18); }

/* Hero mobil: tek kolon */
@media (max-width:700px) {
  #hero { grid-template-columns:1fr !important; padding-top:60px !important; }
  #hero-visual { display:none !important; }
  .gif-grid { grid-template-columns:1fr !important; }
  .two-col { grid-template-columns:1fr !important; }
}
</style>

<script>
// ══ PRELOADER ══
(function(){
  var pre = document.getElementById('preloader');
  var chars = document.querySelectorAll('.pre-char');
  var line = document.getElementById('preloader-line');
  setTimeout(function(){ chars.forEach(function(c){ c.style.transform = 'translateY(0)'; }); line.style.width = '160px'; }, 100);
  var preHidden = false;
  function hidePreloader(){
    if(preHidden) return; preHidden = true;
    pre.style.transition = 'opacity .7s ease'; pre.style.opacity = '0';
    setTimeout(function(){ pre.style.display = 'none'; initHero(); }, 700);
  }
  setTimeout(hidePreloader, 2200);
  if(document.readyState === 'complete'){ setTimeout(hidePreloader, 300); }
  else { window.addEventListener('load', function(){ setTimeout(hidePreloader, 300); }); }
})();

// ══ HERO REVEAL ══
function initHero(){
  var eyebrow = document.getElementById('hero-eyebrow');
  var h1 = document.getElementById('hero-h1');
  var sub = document.getElementById('hero-sub');
  var cta = document.getElementById('hero-cta');
  var visual = document.getElementById('hero-visual');
  if(eyebrow){ eyebrow.style.transform = 'translateY(0)'; }
  if(h1){ h1.style.transform = 'translateY(0)'; }
  if(sub){ sub.style.opacity = '1'; }
  if(cta){ cta.style.opacity = '1'; cta.style.transform = 'translateY(0)'; }
  if(visual){ visual.style.opacity = '1'; visual.style.transform = 'translateY(0) scale(1)'; }
  var gif = document.getElementById('hero-gif-img');
  if(gif){ gif.style.transform = 'translateY(0)'; gif.style.opacity = '1'; }
  // Scene image parallax başlat
  var sk = document.getElementById('scene-kitchen-img');
  var st = document.getElementById('scene-table-img');
  if(sk) sk.style.transform = 'scale(1)';
  if(st) st.style.transform = 'scale(1)';
}

// ══ CUSTOM CURSOR ══
(function(){
  var cursor = document.getElementById('cursor');
  var follower = document.getElementById('cursor-follower');
  if(!cursor||!follower||'ontouchstart' in window) return;
  var mx=0,my=0,fx=0,fy=0;
  cursor.style.opacity='1'; follower.style.opacity='1';
  document.addEventListener('mousemove',function(e){ mx=e.clientX;my=e.clientY;cursor.style.left=mx+'px';cursor.style.top=my+'px'; });
  (function loop(){ fx+=(mx-fx)*.12;fy+=(my-fy)*.12;follower.style.left=fx+'px';follower.style.top=fy+'px';requestAnimationFrame(loop); })();
  document.querySelectorAll('a,button').forEach(function(el){
    el.addEventListener('mouseenter',function(){ cursor.style.width='12px';cursor.style.height='12px';follower.style.width='60px';follower.style.height='60px'; });
    el.addEventListener('mouseleave',function(){ cursor.style.width='20px';cursor.style.height='20px';follower.style.width='40px';follower.style.height='40px'; });
  });
})();

// ══ SCROLL REVEAL ══
(function(){
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(!e.isIntersecting) return; e.target.classList.add('in'); obs.unobserve(e.target); });
  },{threshold:0.08, rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll('.reveal-section').forEach(function(el){ obs.observe(el); });

  var statObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var cnt=e.target, tgt=parseInt(cnt.getAttribute('data-target')), t0=performance.now();
      (function tick(now){ var p=Math.min((now-t0)/1800,1),ease=1-Math.pow(1-p,3); cnt.textContent=Math.round(ease*tgt).toLocaleString('tr-TR'); if(p<1) requestAnimationFrame(tick); })(t0);
      statObs.unobserve(cnt);
    });
  },{threshold:0.05});
  document.querySelectorAll('.stat-count').forEach(function(el){ statObs.observe(el); });
})();

// ══ PARALLAX ══
(function(){
  var heroBg = document.getElementById('hero-bg-text');
  window.addEventListener('scroll', function(){
    var sy = window.scrollY;
    if(heroBg) heroBg.style.transform='translate(-50%,calc(-50% + '+(sy*.2)+'px))';
  },{passive:true});
})();

// ══ TILT CARDS ══
document.querySelectorAll('.tilt-card').forEach(function(card){
  card.addEventListener('mousemove',function(e){ var r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform='perspective(500px) rotateY('+(x*14)+'deg) rotateX('+(-y*14)+'deg) scale(1.04)'; });
  card.addEventListener('mouseleave',function(){ card.style.transform=''; });
});

// ══ ANKET ══
function demlemeVote(btn){
  document.querySelectorAll('#pollOptions button').forEach(function(b){ b.disabled=true;b.style.opacity='.5'; });
  btn.style.opacity='1';btn.style.background='var(--ink)';btn.style.color='var(--cream-fixed)';btn.style.borderColor='var(--ink)';
  btn.querySelector('span').textContent='✓';
}
</script>
` }} />
    </>
  );
}
