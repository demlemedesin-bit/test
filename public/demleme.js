
(function(){
  try{
    if(sessionStorage.getItem('demleme-intro-seen')){
      var l = document.getElementById('introLoader');
      if(l){ l.style.setProperty('display','none'); }
    } else {
      sessionStorage.setItem('demleme-intro-seen','1');
    }
  }catch(e){}
})();


{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Demleme",
  "description": "Demleme; sohbetin, çayın ve hikâyenin yavaş yavaş demlendiği bir masa. YouTube bölümleri, canlı topluluk ve kendi mağazasıyla sofradaki konuşmaları taşıyan bir YouTube programı.",
  "url": "https://claude.ai/code/artifact/0df3ac9c-f3bb-41ad-a166-7151886a8123",
  "founder": { "@type": "Person", "name": "Garen" }
}


(function(){
  "use strict";

  /* ---------- premium layer: GSAP + ScrollTrigger + Lenis smooth scroll ---------- */
  var premiumReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'){
    gsap.registerPlugin(ScrollTrigger);
  }
  if(!premiumReduce && typeof window.Lenis !== 'undefined'){
    try{
      var lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
      if(typeof window.gsap !== 'undefined'){
        lenis.on('scroll', function(){ if(window.ScrollTrigger) ScrollTrigger.update(); });
        gsap.ticker.add(function(time){ lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        (function lenisRaf(time){ lenis.raf(time); requestAnimationFrame(lenisRaf); })();
      }
    }catch(e){}
  }

  /* ---------- nav scroll shadow ---------- */
  var nav = document.getElementById('siteNav');
  function onScroll(){
    if(window.scrollY > 12){ nav.classList.add('scrolled'); } else { nav.classList.remove('scrolled'); }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* ---------- mobile side nav drawer ---------- */
  var hamburger = document.getElementById('hamburgerBtn');
  var navDrawer = document.getElementById('navDrawer');
  var navLinks = document.getElementById('navLinks');
  var navBackdrop = document.getElementById('navBackdrop');
  var navDrawerClose = document.getElementById('navDrawerClose');
  function openDrawer(){
    if(!navDrawer) return;
    navDrawer.classList.add('open');
    if(navBackdrop) navBackdrop.classList.add('open');
    document.documentElement.classList.add('nav-open');
  }
  function closeDrawer(){
    if(!navDrawer) return;
    navDrawer.classList.remove('open');
    if(navBackdrop) navBackdrop.classList.remove('open');
    document.documentElement.classList.remove('nav-open');
  }
  if(hamburger && navDrawer){
    hamburger.addEventListener('click', function(){
      navDrawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
    if(navDrawerClose) navDrawerClose.addEventListener('click', closeDrawer);
    if(navBackdrop) navBackdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeDrawer(); });
    if(navLinks) navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', closeDrawer);
    });
  }

  /* ---------- scroll-spy ---------- */
  var sections = ['hero','videos','shop','benkimim','iletisim'].map(function(id){
    return document.getElementById(id);
  }).filter(Boolean);
  var navMap = {};
  document.querySelectorAll('.nav-links a[data-nav]').forEach(function(a){
    navMap[a.getAttribute('data-nav')] = a;
  });
  if('IntersectionObserver' in window && sections.length){
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var id = entry.target.id;
          Object.keys(navMap).forEach(function(k){ navMap[k].classList.toggle('active', k === id); });
        }
      });
    }, {rootMargin:'-40% 0px -55% 0px', threshold:0});
    sections.forEach(function(s){ spy.observe(s); });
  }

  /* ---------- reveal on scroll ----------
     Elements carrying [data-intro-linked] (the hero's own headline/brew/stats/figure) are
     deliberately excluded here: they're sequenced by the continuous preloader timeline below
     instead of this generic observer, so the loader-dissolve and the hero wake-up read as one
     motion instead of two disconnected animations. */
  var revealEls = document.querySelectorAll('.reveal:not([data-intro-linked]), .reveal-scale:not([data-intro-linked])');
  if('IntersectionObserver' in window && revealEls.length){
    var ro = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, {threshold:0.01, rootMargin:'0px 0px 250px 0px'});
    revealEls.forEach(function(el){ ro.observe(el); });
    /* safety net: above-the-fold elements should never be stuck invisible if the
       observer's first callback misses them (font swap / layout shift race, etc.) */
    setTimeout(function(){
      revealEls.forEach(function(el){
        if(!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight){
          el.classList.add('in');
        }
      });
    }, 900);
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  /* ---------- continuous preloader -> hero reveal ----------
     Design purpose: the brief's core complaint about "standard" sites is a loader that plays,
     then vanishes, then a *separate* fade-in kicks off underneath -- two disconnected beats.
     Here the numeric counter, the loader's dissolve and the hero's wake-up all live on one
     GSAP timeline, so the hero visibly wakes up AS the loader lifts, not after.
     Interaction logic: a stepped counter (not a smooth tween) reads as a real progress readout;
     the loader's autoAlpha fade-out and the hero's staggered `.in` reveals are scheduled from
     the same timeline position so they're perceived as one gesture.
     Performance: only opacity/transform are touched (via the existing .reveal/.reveal-scale
     CSS transitions, driven purely by toggling the `.in` class) -- no layout
     properties are animated, and the whole sequence is skipped entirely under reduced-motion
     or on repeat visits (sessionStorage gate in body.html already hides the loader instantly). */
  (function(){
    var loader = document.getElementById('introLoader');
    var introEls = document.querySelectorAll('[data-intro-linked]');
    function wakeHero(){ introEls.forEach(function(el){ el.classList.add('in'); }); }

    if(!loader || getComputedStyle(loader).display === 'none' || premiumReduce){
      wakeHero();
    } else if(typeof window.gsap === 'undefined'){
      wakeHero();
      loader.style.transition = 'opacity .3s ease';
      loader.style.opacity = '0';
      setTimeout(function(){ loader.style.display = 'none'; }, 320);
    } else {
      try{
        var counter = document.getElementById('introCounter');
        var steps = [0, 12, 28, 47, 73, 100];
        var tl = gsap.timeline({ defaults: { ease: 'none' } });
        steps.forEach(function(val, i){
          tl.call(function(){ if(counter) counter.textContent = val; }, null, i * 0.135);
        });
        tl.to(loader, { autoAlpha: 0, scale: 1.05, duration: .55, ease: 'power2.inOut' }, '+=0.08')
          .set(loader, { display: 'none' })
          .call(function(){
            var head = document.querySelector('.hero-head[data-intro-linked]');
            if(head) head.classList.add('in');
          }, null, '<');
      }catch(e){
        wakeHero();
        loader.style.display = 'none';
      }
    }

    /* absolute safety net: whatever else happens, the loader must never block the page */
    setTimeout(function(){
      if(loader && getComputedStyle(loader).display !== 'none'){
        wakeHero();
        loader.style.display = 'none';
      }
    }, 3000);
  })();

  /* ---------- carousels (video / shop) ---------- */
  function wireCarousel(trackId, prevId, nextId){
    var track = document.getElementById(trackId);
    var prev = document.getElementById(prevId);
    var next = document.getElementById(nextId);
    if(!track) return;
    function step(){
      var card = track.querySelector(':scope > *');
      return card ? card.getBoundingClientRect().width + 24 : 300;
    }
    if(prev) prev.addEventListener('click', function(){ track.scrollBy({left:-step(), behavior:'smooth'}); });
    if(next) next.addEventListener('click', function(){ track.scrollBy({left:step(), behavior:'smooth'}); });
  }
  wireCarousel('shopTrack','shopPrev','shopNext');
  wireCarousel('highlightsTrack','highlightsPrev','highlightsNext');

  /* ---------- hero cycling icons: "İyi bir [x] sohbet, zamanla [x] demlenir." ----------
     Two named slots ('a' in line 1, 'b' in line 2) each hold the same 4 hand-drawn inline-SVG
     vignettes; a single advancing index drives both, offset by two, so the pair showing at
     once is always different -- a light, continuous "who's at the table today" flourish. */
  (function(){
    var slotA = document.querySelector('.hero-cycle-slot[data-slot="a"]');
    var slotB = document.querySelector('.hero-cycle-slot[data-slot="b"]');
    if(!slotA || !slotB) return;
    var iconsA = slotA.querySelectorAll('.hcs-icon');
    var iconsB = slotB.querySelectorAll('.hcs-icon');
    var n = iconsA.length;
    if(!n || iconsB.length !== n) return;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion) return;
    var i = 0;
    setInterval(function(){
      i = (i + 1) % n;
      var j = (i + 2) % n;
      iconsA.forEach(function(el, idx){ el.classList.toggle('is-active', idx === i); });
      iconsB.forEach(function(el, idx){ el.classList.toggle('is-active', idx === j); });
    }, 2600);
  })();

  /* ---------- ticker bar: live clock + a decorative countdown to daily 17:00 "çay saati" ---------- */
  (function(){
    var clockEls = document.querySelectorAll('.ticker-clock');
    var cdEls = document.querySelectorAll('.ticker-countdown');
    if(!clockEls.length && !cdEls.length) return;
    function pad(n){ return n < 10 ? '0' + n : '' + n; }
    function tick(){
      var now = new Date();
      var label = 'SAAT ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
      clockEls.forEach(function(el){ el.textContent = label; });
      var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0);
      if(now >= target) target.setDate(target.getDate() + 1);
      var diffMin = Math.max(0, Math.round((target - now) / 60000));
      var dh = Math.floor(diffMin / 60), dm = diffMin % 60;
      var cdLabel = 'ÇAY SAATİNE ' + (dh > 0 ? (dh + ' SAAT ' + dm + ' DAKİKA VAR') : (dm + ' DAKİKA VAR'));
      cdEls.forEach(function(el){ el.textContent = cdLabel; });
    }
    tick();
    setInterval(tick, 15000);
  })();

  /* ---------- signup form ---------- */
  var form = document.getElementById('signupForm');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(form.classList.contains('sent')) return;
      form.classList.add('sent');
      var msg = document.createElement('span');
      msg.className = 'signup-form-msg';
      msg.textContent = 'Katıldın! Sofrada görüşürüz ☺';
      form.appendChild(msg);
    });
  }

  /* ---------- email gate (first visit only) ---------- */
  (function(){
    var gate = document.getElementById('emailGate');
    if(!gate) return;
    var GATE_KEY = 'demleme-gate-seen';
    var alreadySeen = true;
    try{ alreadySeen = localStorage.getItem(GATE_KEY) === '1'; }catch(e){ alreadySeen = false; }
    if(alreadySeen) return;

    var skipBtn = document.getElementById('emailGateSkip');
    var gateForm = document.getElementById('emailGateForm');

    function markSeen(){ try{ localStorage.setItem(GATE_KEY, '1'); }catch(e){} }
    function closeGate(){
      gate.classList.remove('show');
      gate.setAttribute('aria-hidden', 'true');
      markSeen();
    }
    function openGate(){
      gate.classList.add('show');
      gate.removeAttribute('aria-hidden');
      var input = gateForm && gateForm.querySelector('input');
      if(input) setTimeout(function(){ input.focus(); }, 300);
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(openGate, reduceMotion ? 200 : 1500);

    if(skipBtn) skipBtn.addEventListener('click', closeGate);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && gate.classList.contains('show')) closeGate();
    });
    if(gateForm){
      gateForm.addEventListener('submit', function(e){
        e.preventDefault();
        if(gateForm.classList.contains('sent')) return;
        gateForm.classList.add('sent');
        var msg = document.createElement('p');
        msg.className = 'email-gate-msg';
        msg.textContent = 'Katıldın! Sofrada görüşürüz ☕';
        gateForm.insertAdjacentElement('afterend', msg);
        setTimeout(closeGate, 1100);
      });
    }
  })();

  /* ---------- staggered grid reveal ---------- */
  function assignStagger(selector){
    document.querySelectorAll(selector).forEach(function(el, i){
      el.style.setProperty('--stagger', i);
    });
  }
  assignStagger('.highlights-track .highlight-card');
  assignStagger('.shop-track .product-card');
  assignStagger('.guests-row .guest-chip');

  /* ---------- premium micro-interactions: magnetic buttons + card tilt ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion && window.matchMedia && window.matchMedia('(hover:hover)').matches){
    /* Magnetic pull with spring easing: the button chases the cursor's target offset via
       rAF-driven lerp (not an instant 1:1 snap) so the motion carries physical weight, and it
       eases back through the same loop on mouseleave instead of resetting instantly. transform
       is the only property touched, so this stays cheap even with several buttons active. */
    var magnets = document.querySelectorAll('.btn, .btn-circle');
    magnets.forEach(function(el){
      var m = { tx: 0, ty: 0, cx: 0, cy: 0, raf: null };
      function settle(){
        m.cx += (m.tx - m.cx) * 0.2;
        m.cy += (m.ty - m.cy) * 0.2;
        el.style.transform = 'translate(' + m.cx.toFixed(2) + 'px,' + m.cy.toFixed(2) + 'px)';
        if(Math.abs(m.tx - m.cx) > 0.05 || Math.abs(m.ty - m.cy) > 0.05){
          m.raf = requestAnimationFrame(settle);
        } else {
          m.raf = null;
        }
      }
      function wake(){ if(!m.raf) m.raf = requestAnimationFrame(settle); }
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        m.tx = (e.clientX - r.left - r.width / 2) * 0.32;
        m.ty = (e.clientY - r.top - r.height / 2) * 0.4;
        wake();
      });
      el.addEventListener('mouseleave', function(){ m.tx = 0; m.ty = 0; wake(); });
    });

    var tiltCards = document.querySelectorAll('.product-card, .highlight-card');
    tiltCards.forEach(function(el){
      el.style.willChange = 'transform';
      el.addEventListener('mousemove', function(e){
        /* a playing inline video holds a cross-origin YouTube iframe -- keeping this element
           under a live 3D transform forces the browser to keep re-syncing that iframe's
           out-of-process compositor layer on every mousemove, which is what read as the page
           "freezing" once a video was clicked while the cursor stayed over the card. Skip the
           tilt (and flatten it) while a video is playing. */
        if(el.querySelector('.highlight-thumb.playing, .video-thumb.playing')){
          if(el.style.transform) el.style.transform = '';
          return;
        }
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(700px) rotateX(' + (py*-6) + 'deg) rotateY(' + (px*8) + 'deg) translateY(-3px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
    });

    /* ---------- cursor-follow spotlight on dark sections ---------- */
    document.querySelectorAll('.spot-target').forEach(function(el){
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        el.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100) + '%');
        el.style.setProperty('--sy', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });

    /* ---------- context-aware cursor tag ----------
       Design purpose: a small companion badge that names what a hover will do (İzle/Gör/Keşfet)
       instead of a full custom-cursor replacement -- the OS pointer stays visible everywhere,
       so this adds a hint without any of the usual custom-cursor accessibility/usability risk.
       Interaction logic: the badge trails the real cursor via rAF lerp and only shows (a spring
       scale-in) while hovering a bound zone; leaving the zone eases it back to zero.
       Performance: one rAF loop, transform + opacity only, gated out entirely on touch/coarse
       pointers and reduced-motion via the CSS media query above and the guard this whole block
       already sits behind. */
    var cursorTag = document.getElementById('cursorTag');
    if(cursorTag){
      var ctLabel = cursorTag.querySelector('span');
      var ctPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      var ctCur = { x: ctPos.x, y: ctPos.y };
      var ctScale = 0, ctTargetScale = 0;
      document.addEventListener('mousemove', function(e){ ctPos.x = e.clientX; ctPos.y = e.clientY; });
      (function ctLoop(){
        ctCur.x += (ctPos.x - ctCur.x) * 0.22;
        ctCur.y += (ctPos.y - ctCur.y) * 0.22;
        ctScale += (ctTargetScale - ctScale) * 0.22;
        cursorTag.style.transform = 'translate3d(' + ctCur.x.toFixed(1) + 'px,' + ctCur.y.toFixed(1) + 'px,0) scale(' + ctScale.toFixed(3) + ')';
        requestAnimationFrame(ctLoop);
      })();
      function bindCursorTag(selector, text){
        document.querySelectorAll(selector).forEach(function(el){
          el.addEventListener('mouseenter', function(){
            if(ctLabel) ctLabel.textContent = text;
            cursorTag.classList.add('show');
            ctTargetScale = 1;
          });
          el.addEventListener('mouseleave', function(){
            cursorTag.classList.remove('show');
            ctTargetScale = 0;
          });
        });
      }
      bindCursorTag('.highlight-card.video', 'İzle');
      bindCursorTag('.product-card, .highlight-card.product', 'Gör');
      bindCursorTag('.guest-chip', 'Keşfet');
      bindCursorTag('.highlights-track-wrap', 'Kaydır');
    }
  }

  /* ---------- modal system (video + product) ---------- */
  function openModal(id){
    var m = document.getElementById(id);
    if(!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(m){
    if(!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(m.id === 'videoModal') stopVideoModal();
  }

  /* ---------- real YouTube playback ----------
     Real episodes play inline: clicking a card opens the video modal and drops a genuine
     youtube-nocookie.com iframe (autoplay) into the thumbnail slot, so the visit stays on this
     page and still counts as a real YouTube view. Note for wherever this file ends up hosted:
     a page published straight through Claude's own Artifact preview runs under a strict CSP
     that has no allowance for third-party iframes, so the embed will not render there -- that
     is a limitation of that one preview surface, not of this file. Once this index.html is
     deployed on its own domain (or opened directly) there is no such restriction and the
     embed plays normally. The modal's "YouTube'da Aç" link still opens the real watch page in
     a new tab as a fallback for visitors on a host that blocks the iframe. */
  function stopVideoModal(){
    var modalThumb = document.getElementById('videoModalThumb');
    if(!modalThumb) return;
    var iframe = modalThumb.querySelector('iframe');
    if(iframe) iframe.remove();
    modalThumb.classList.remove('playing');
  }

  /* ---------- shared-element (FLIP) transition: card photo -> modal photo ----------
     Design purpose: the brief explicitly asks that an element physically become part of the
     next scene instead of the old content fading out while the new content fades in separately.
     Opening a video/product modal is the one moment on this page where a small thumbnail
     legitimately becomes a large hero image, so it's the natural place for this technique.
     Interaction logic: capture the clicked card's photo rect (First), let the modal populate
     and lay out normally (Last), then play the inverted delta back to identity so the image
     visibly grows from the card into the modal slot instead of just appearing there.
     Technology: classic FLIP via GSAP fromTo on transform only (translate + scale) -- no
     layout properties touch, so it stays on the animate-transform/opacity performance rule.
     Falls back to the plain instant modal open under reduced-motion or without GSAP. */
  function flipIntoModal(sourceEl, modalId, targetSelector){
    if(!sourceEl || premiumReduce || typeof window.gsap === 'undefined'){ openModal(modalId); return; }
    var first = sourceEl.getBoundingClientRect();
    if(!first.width || !first.height){ openModal(modalId); return; }
    openModal(modalId);
    requestAnimationFrame(function(){
      var target = document.querySelector('#' + modalId + ' ' + targetSelector);
      if(!target){ return; }
      var last = target.getBoundingClientRect();
      if(!last.width || !last.height) return;
      var scaleX = first.width / last.width;
      var scaleY = first.height / last.height;
      var dx = (first.left + first.width / 2) - (last.left + last.width / 2);
      var dy = (first.top + first.height / 2) - (last.top + last.height / 2);
      gsap.fromTo(target,
        { x: dx, y: dy, scaleX: scaleX, scaleY: scaleY, transformOrigin: '50% 50%' },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .65, ease: 'power3.out', clearProps: 'transform' }
      );
    });
  }
  document.querySelectorAll('[data-close]').forEach(function(btn){
    btn.addEventListener('click', function(){
      closeModal(document.getElementById(btn.getAttribute('data-close')));
    });
  });
  document.querySelectorAll('.modal-backdrop, .search-overlay, .archive-overlay').forEach(function(ov){
    ov.addEventListener('click', function(e){
      if(e.target === ov) closeModal(ov);
    });
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      document.querySelectorAll('.modal-backdrop.open, .search-overlay.open, .archive-overlay.open').forEach(closeModal);
    }
  });

  function wireVideoCards(selector){
    /* Videos play inline, right inside the card -- no separate modal/screen.
       The small YouTube badge (top-right of each thumb) is the only way out to
       youtube.com, and it stops propagation so it never triggers inline play. */
    document.querySelectorAll(selector).forEach(function(card){
      var ytId = card.getAttribute('data-yt') || '';
      var ytBtn = card.querySelector('.highlight-yt-btn');
      if(ytBtn && ytId){ ytBtn.href = 'https://www.youtube.com/watch?v=' + ytId; }
      card.addEventListener('click', function(){
        var thumbEl = card.querySelector('.video-thumb, .highlight-thumb');
        var titleEl = card.querySelector('.video-title, .highlight-meta b');
        if(!ytId || !thumbEl || thumbEl.classList.contains('playing')) return;
        /* only one inline video may play at a time -- leaving old iframes running in the
           background (each decoding video + running its own JS) is what made the page
           bog down/"freeze" once a visitor had clicked a few of them. */
        document.querySelectorAll('.highlight-thumb.playing').forEach(function(other){
          var oldIframe = other.querySelector('.inline-yt-iframe');
          if(oldIframe) oldIframe.remove();
          other.classList.remove('playing');
        });
        var iframe = document.createElement('iframe');
        iframe.className = 'inline-yt-iframe';
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&rel=0&modestbranding=1';
        iframe.title = titleEl ? titleEl.textContent : 'Demleme bölümü';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', '');
        thumbEl.appendChild(iframe);
        thumbEl.classList.add('playing');
        card.style.transform = '';
      });
    });
  }
  wireVideoCards('.highlight-card.video');

  var productQty = 1;
  var currentProductId = null;
  function wireProductCards(selector){
    document.querySelectorAll(selector).forEach(function(card){
      card.addEventListener('click', function(){
        var photoEl = card.querySelector('.product-photo, .highlight-thumb');
        var nameEl = card.querySelector('.product-name, .highlight-meta b');
        var priceEl = card.querySelector('.product-price, .highlight-meta span');
        var modalPhoto = document.getElementById('productModalPhoto');
        if(modalPhoto && photoEl){
          modalPhoto.style.background = getComputedStyle(photoEl).backgroundColor;
          modalPhoto.innerHTML = '';
          var svg = photoEl.querySelector('svg');
          if(svg) modalPhoto.appendChild(svg.cloneNode(true));
        }
        var nameTarget = document.getElementById('productModalName');
        var priceTarget = document.getElementById('productModalPrice');
        var nameText = nameEl ? nameEl.textContent : 'Ürün';
        var priceText = priceEl ? priceEl.textContent : '';
        if(nameTarget) nameTarget.textContent = nameText;
        if(priceTarget) priceTarget.textContent = priceText;

        // Yeni premium elemanlar
        var descEl = document.getElementById('productModalDesc');
        var cardDesc = card.querySelector('.product-desc, .highlight-desc');
        if(descEl) descEl.textContent = cardDesc ? cardDesc.textContent : 'Sofranın tam ortasına layık, özenle üretilmiş Demleme ürünü.';

        var badgesEl = document.getElementById('productModalBadges');
        if(badgesEl) {
          var badgeEl = card.querySelector('.limited-badge, .product-badge');
          badgesEl.innerHTML = badgeEl
            ? '<span class="pm-badge" style="background:var(--rust);color:#fff">' + badgeEl.textContent + '</span>'
            : '<span class="pm-badge" style="background:rgba(39,174,96,.12);color:#27ae60">DEMLEME SHOP</span>';
        }

        var stockEl = document.getElementById('productModalStock');
        if(stockEl) stockEl.textContent = 'Stokta';

        var totalEl = document.getElementById('productModalTotal');
        if(totalEl) totalEl.textContent = priceText;

        var detailLink = document.getElementById('productModalDetailLink');
        if(detailLink) {
          var cardLink = card.querySelector('a[href*="/urunler/"]');
          if(cardLink) detailLink.href = cardLink.href;
        }

        // Fotoğraf dairesi arka plan rengi - ürün rengine göre
        if(modalPhoto) {
          var bg = getComputedStyle(photoEl).backgroundColor;
          modalPhoto.style.background = bg || 'var(--cream-deep)';
          modalPhoto.style.boxShadow = '0 8px 32px rgba(0,0,0,.1)';
        }

        var favBtnEl = card.querySelector('.fav-btn');
        currentProductId = favBtnEl ? favBtnEl.getAttribute('data-fav-id') : (nameEl ? nameEl.textContent : 'urun');
        productQty = 1;
        var qtyVal = document.getElementById('productQtyVal');
        if(qtyVal) qtyVal.textContent = productQty;
        var addMsg = document.getElementById('productAddMsg');
        if(addMsg) addMsg.hidden = true;
        var addBtn = document.getElementById('productAddBtn');
        if(addBtn) addBtn.classList.remove('added');
        flipIntoModal(photoEl, 'productModal', '#productModalPhoto');
      });
    });
  }
  wireProductCards('.product-card');
  wireProductCards('.highlight-card.product');

  var qtyMinus = document.getElementById('productQtyMinus');
  var qtyPlus = document.getElementById('productQtyPlus');
  var qtyValEl = document.getElementById('productQtyVal');
  if(qtyMinus && qtyPlus && qtyValEl){
    qtyMinus.addEventListener('click', function(){
      productQty = Math.max(1, productQty - 1);
      qtyValEl.textContent = productQty;
      var totalEl = document.getElementById('productModalTotal');
      var priceTarget = document.getElementById('productModalPrice');
      if(totalEl && priceTarget) {
        var num = parseInt(priceTarget.textContent.replace(/[^0-9]/g,'')) || 0;
        totalEl.textContent = '₺' + (num * productQty).toLocaleString('tr-TR');
      }
    });
    qtyPlus.addEventListener('click', function(){
      productQty = Math.min(9, productQty + 1);
      qtyValEl.textContent = productQty;
    });
  }
  var addBtn = document.getElementById('productAddBtn');
  if(addBtn){
    addBtn.addEventListener('click', function(){
      var msg = document.getElementById('productAddMsg');
      if(msg) msg.hidden = false;
      var nameTarget = document.getElementById('productModalName');
      var priceTarget = document.getElementById('productModalPrice');
      addToCart({
        id: currentProductId || (nameTarget ? nameTarget.textContent : 'urun'),
        name: nameTarget ? nameTarget.textContent : 'Ürün',
        price: priceTarget ? priceTarget.textContent : '',
        qty: productQty
      });
      // Premium: btn animasyonu
      var addBtnEl = document.getElementById('productAddBtn');
      var addBtnText = document.getElementById('productAddBtnText');
      if(addBtnEl) {
        addBtnEl.classList.add('added');
        addBtnEl.style.background = '#27ae60';
        if(addBtnText) addBtnText.textContent = '✓ Sepete Eklendi!';
        setTimeout(function(){
          addBtnEl.classList.remove('added');
          addBtnEl.style.background = '';
          if(addBtnText) addBtnText.textContent = 'Sepete Ekle';
          if(msg) msg.hidden = true;
        }, 2000);
      }
    });
  }

  /* ---------- FAQ accordion (single-open, accessible) ---------- */
  (function(){
    var faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function(item, i){
      var btn = item.querySelector('.faq-q');
      var panel = item.querySelector('.faq-a');
      if(!btn || !panel) return;
      var pid = 'faqPanel' + i;
      panel.id = pid;
      btn.setAttribute('aria-controls', pid);
      var isOpen = i === 0;
      item.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      btn.addEventListener('click', function(){
        var willOpen = !item.classList.contains('open');
        faqItems.forEach(function(other){
          if(other !== item){
            other.classList.remove('open');
            var ob = other.querySelector('.faq-q');
            if(ob) ob.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });
  })();

  /* ---------- search overlay ---------- */
  var searchBtn = document.getElementById('searchBtn');
  var searchOverlay = document.getElementById('searchOverlay');
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');
  var searchIndex = null;

  function buildSearchIndex(){
    var items = [];
    document.querySelectorAll('#highlightsTrack .highlight-card.video').forEach(function(card){
      var title = card.querySelector('.highlight-meta b');
      var sub = card.querySelector('.highlight-meta span');
      if(title) items.push({type:'Bölüm', title:title.textContent, sub: sub ? sub.textContent : '', target: card});
    });
    document.querySelectorAll('#shopTrack .product-card').forEach(function(card){
      var name = card.querySelector('.product-name');
      var price = card.querySelector('.product-price');
      if(name) items.push({type:'Ürün', title:name.textContent, sub: price ? price.textContent : '', target: card});
    });
    document.querySelectorAll('.guest-chip').forEach(function(chip){
      var name = chip.querySelector('.guest-chip-name');
      var role = chip.querySelector('.guest-chip-role');
      if(name) items.push({type:'Konuk', title:name.textContent, sub: role ? role.textContent : '', target: chip});
    });
    document.querySelectorAll('.faq-item').forEach(function(item){
      var q = item.querySelector('.faq-q');
      if(q){
        var qText = q.childNodes[0] ? q.childNodes[0].textContent.trim() : q.textContent.trim();
        items.push({type:'SSS', title: qText, sub:'', target:item});
      }
    });
    return items;
  }

  function renderSearchResults(query){
    if(!searchIndex) searchIndex = buildSearchIndex();
    if(!searchResults) return;
    searchResults.innerHTML = '';
    var q = query.trim().toLocaleLowerCase('tr');
    var matches = q ? searchIndex.filter(function(it){
      return it.title.toLocaleLowerCase('tr').indexOf(q) !== -1;
    }) : searchIndex.slice(0, 6);
    if(!matches.length){
      var p = document.createElement('p');
      p.className = 'search-empty';
      p.textContent = 'Sonuç bulunamadı.';
      searchResults.appendChild(p);
      return;
    }
    matches.forEach(function(it){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-result-item';
      var typeSpan = document.createElement('span');
      typeSpan.className = 'search-result-type';
      typeSpan.textContent = it.type;
      var titleSpan = document.createElement('span');
      titleSpan.className = 'search-result-title';
      titleSpan.textContent = it.title;
      var subSpan = document.createElement('span');
      subSpan.className = 'search-result-sub';
      subSpan.textContent = it.sub;
      btn.appendChild(typeSpan); btn.appendChild(titleSpan); btn.appendChild(subSpan);
      btn.addEventListener('click', function(){
        closeModal(searchOverlay);
        if(it.target && it.target.scrollIntoView){
          it.target.scrollIntoView({behavior:'smooth', block:'center'});
          var prevShadow = it.target.style.boxShadow;
          it.target.style.transition = (it.target.style.transition ? it.target.style.transition + ', ' : '') + 'box-shadow .3s';
          it.target.style.boxShadow = '0 0 0 3px var(--rust)';
          setTimeout(function(){ it.target.style.boxShadow = prevShadow; }, 1200);
        }
      });
      searchResults.appendChild(btn);
    });
  }

  if(searchBtn && searchOverlay){
    searchBtn.addEventListener('click', function(){
      openModal('searchOverlay');
      renderSearchResults('');
      setTimeout(function(){ if(searchInput) searchInput.focus(); }, 60);
    });
    if(searchInput){
      searchInput.addEventListener('input', function(){ renderSearchResults(searchInput.value); });
    }
    document.addEventListener('keydown', function(e){
      if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
        e.preventDefault();
        openModal('searchOverlay');
        renderSearchResults('');
        setTimeout(function(){ if(searchInput) searchInput.focus(); }, 60);
      }
    });
  }

  /* ---------- dark mode toggle ---------- */
  var themeToggle = document.getElementById('themeToggle');
  try{
    if(localStorage.getItem('demleme-theme') === 'dark'){ document.documentElement.classList.add('dark-mode'); }
  }catch(e){}
  if(themeToggle){
    themeToggle.addEventListener('click', function(){
      document.documentElement.classList.toggle('dark-mode');
      try{ localStorage.setItem('demleme-theme', document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light'); }catch(e){}
    });
  }

  /* ---------- parallax (whole-site depth layer) ----------
     Drives the independent CSS `translate` property (not `transform`)
     so a parallax offset composes cleanly with any element that
     already runs its own transform-based CSS keyframe animation
     (orb breathing, floating marks, hover states, etc.) instead of
     fighting it for the same property every frame. GSAP ScrollTrigger
     drives it when available (smoother scrub tied to Lenis), with a
     rAF-throttled scroll-listener fallback otherwise. data-speed on
     each .parallax element sets its depth: positive drifts opposite
     to scroll, negative drifts with it — mixing signs across a
     section is what reads as depth rather than everything sliding
     together. */
  var parallaxReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxEls = document.querySelectorAll('.parallax');
  var parallaxHasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if(!parallaxReduce && parallaxEls.length){
    if(parallaxHasGSAP){
      parallaxEls.forEach(function(el){
        var speed = parseFloat(el.getAttribute('data-speed')) || 0.1;
        var range = -speed * 220;
        ScrollTrigger.create({
          trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6,
          onUpdate: function(self){
            el.style.translate = '0px ' + (range * self.progress).toFixed(2) + 'px';
          }
        });
      });
    } else {
      var parallaxTicking = false;
      var updateParallax = function(){
        var vh = window.innerHeight;
        parallaxEls.forEach(function(el){
          var speed = parseFloat(el.getAttribute('data-speed')) || 0.1;
          var range = -speed * 220;
          var rect = el.getBoundingClientRect();
          // same 'top bottom' -> 'bottom top' 0..1 progress the GSAP/ScrollTrigger
          // branch above uses, so a fallback (no CDN, offline, blocked script)
          // moves elements exactly as far as the primary path -- never further,
          // which matters once data-speed gets large enough (real photo layers)
          // that an unbounded, position-proportional drift could pull the layer
          // past the oversized buffer it was cropped to.
          var progress = (vh - rect.top) / (vh + rect.height);
          if(progress < 0) progress = 0; else if(progress > 1) progress = 1;
          el.style.translate = '0px ' + (range * progress).toFixed(2) + 'px';
        });
        parallaxTicking = false;
      };
      window.addEventListener('scroll', function(){
        if(!parallaxTicking){ parallaxTicking = true; requestAnimationFrame(updateParallax); }
      }, {passive:true});
      updateParallax();
    }
  }

  /* ---------- hero exit: removed ----------
     This used to run a scroll-scrubbed fade/scale (and, before that, a pinned circular-mask
     wipe) as the hero left view. Both versions turned out fragile against real-world layout
     timing -- the pinned version could freeze mid-wipe as a stray disc on the seam with
     "Öne Çıkanlar", and the non-pinned scrub version could read as partial progress even
     near the very top of the page (any small scroll/layout offset shifted the trigger's
     start), leaving the headline and CTAs looking washed-out at rest instead of only while
     actually scrolling past. Two confirmed visible bugs from one effect is the signal to
     cut it, not iterate on it blindly without a way to test the real GSAP timing live.
     The hero still reads as "alive" via the ambient CSS rotation wash (.hero::after) and the
     amplified .reveal/.reveal-scale entrance -- both are guaranteed-safe, non-scroll-jacking
     effects that can't get stuck or fade content at rest. */

  /* ---------- highlights cards: staggered pop-in ----------
     Design purpose: "Öne Çıkanlar" cards previously had zero entrance animation of their own --
     they just appeared fully formed. This gives them one when GSAP + ScrollTrigger are
     available: a discrete (non-scrubbed, non-pinned) batch reveal with a slight 3D rotate-in
     and a small overshoot, staggered per card.
     "Discrete" matters here -- after two earlier scroll-*scrubbed* effects on this page caused
     visible bugs (a stuck mask, a fade that never fully finished), this deliberately avoids
     scrub/pin entirely: each card plays once when it enters view, so there's no continuous
     scroll-position math to desync from real layout and freeze mid-state.
     Safety: the hidden starting state (autoAlpha:0) is only ever set here, inside the same
     guarded block that already confirmed GSAP loaded -- so if GSAP/ScrollTrigger fail to load,
     this whole IIFE bails before touching the cards at all and they simply render at their
     plain, fully-visible default (no .reveal class in the HTML for them), never stuck hidden. */
  (function(){
    if(premiumReduce) return;
    if(typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
    var cards = document.querySelectorAll('.highlights-track .highlight-card');
    if(!cards.length) return;
    try{
      gsap.set(cards, { autoAlpha: 0, y: 34, scale: .9, rotateX: -12, transformPerspective: 700 });
      ScrollTrigger.batch(cards, {
        start: 'top 92%',
        once: true,
        onEnter: function(batch){
          gsap.to(batch, { autoAlpha: 1, y: 0, scale: 1, rotateX: 0, duration: .7, ease: 'back.out(1.6)', stagger: 0.08 });
        }
      });
      /* absolute safety net matching the pattern used by the preloader above: whatever else
         happens, these cards must never stay invisible forever */
      setTimeout(function(){ gsap.set(cards, { clearProps: 'all' }); }, 15000);
    }catch(e){}
  })();

  /* ---------- highlights: true scroll-linked horizontal panels ----------
     Design purpose: the brief explicitly asks for at least one section where vertical scroll
     becomes horizontal movement of large panels, continuous and scroll-linked, and explicitly
     NOT a classic carousel. "Öne Çıkanlar" already mixes editorial video/product panels in a
     single strip, making it the natural candidate rather than inventing a new section.
     Interaction logic: the section pins for exactly the track's own horizontal overflow
     distance; scroll progress maps 1:1 to translateX, so scrolling and "dragging" the strip feel
     like the same gesture instead of buttons stepping through pages.
     Technology: one ScrollTrigger (scrub + pin) writing transform directly in onUpdate --
     cheaper than a GSAP tween per frame and avoids fighting the track's own native scroll,
     which is switched off (via the [data-hscroll] flag below) only once this takes over.
     Responsive: desktop-only (ScrollTrigger.matchMedia, >900px). Below that breakpoint -- and
     under reduced-motion, where this IIFE returns before ever running -- the section keeps its
     original behavior untouched: native horizontal swipe/scroll with snap and the prev/next
     buttons, which is the right mobile interaction for a strip like this, not a shrunk pin. */
  (function(){
    if(premiumReduce) return;
    if(typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
    var sec = document.querySelector('.highlights-sec');
    var track = document.getElementById('highlightsTrack');
    if(!sec || !track) return;
    try{
      ScrollTrigger.matchMedia({
        '(min-width: 901px)': function(){
          sec.setAttribute('data-hscroll', '');
          function distance(){ return Math.max(0, track.scrollWidth - track.clientWidth); }
          var st = ScrollTrigger.create({
            trigger: sec, start: 'top top',
            end: function(){ return '+=' + (distance() + 260); },
            scrub: 0.5, pin: true, pinSpacing: true, invalidateOnRefresh: true,
            onUpdate: function(self){
              track.style.transform = 'translate3d(' + (-distance() * self.progress).toFixed(1) + 'px,0,0)';
            }
          });
          return function(){
            sec.removeAttribute('data-hscroll');
            track.style.transform = '';
            st.kill();
          };
        }
      });
    }catch(e){ sec.removeAttribute('data-hscroll'); }
  })();

  /* ---------- product zoom / magnifier ---------- */
  document.querySelectorAll('.product-photo.zoomable').forEach(function(photo){
    var svg = photo.querySelector('svg');
    if(!svg) return;
    photo.addEventListener('mousemove', function(e){
      var r = photo.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * 100;
      var py = (e.clientY - r.top) / r.height * 100;
      svg.style.transformOrigin = px + '% ' + py + '%';
      svg.style.transform = 'scale(1.6)';
    });
    photo.addEventListener('mouseleave', function(){ svg.style.transform = ''; });
  });

  /* ---------- favorites (localStorage) ---------- */
  var FAV_KEY = 'demleme-favs';
  function getFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }catch(e){ return []; } }
  function setFavs(arr){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }catch(e){} }
  function updateFavCount(){
    var favs = getFavs();
    var favCountEl = document.getElementById('favCount');
    if(favCountEl){ favCountEl.textContent = favs.length; favCountEl.hidden = favs.length === 0; }
  }
  document.querySelectorAll('.fav-btn').forEach(function(btn){
    var id = btn.getAttribute('data-fav-id');
    if(getFavs().indexOf(id) !== -1) btn.classList.add('active');
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var favs = getFavs();
      var idx = favs.indexOf(id);
      if(idx === -1){ favs.push(id); btn.classList.add('active'); }
      else { favs.splice(idx, 1); btn.classList.remove('active'); }
      setFavs(favs);
      updateFavCount();
    });
  });
  updateFavCount();

  function renderFavoritesList(){
    if(!searchResults) return;
    var favs = getFavs();
    searchResults.innerHTML = '';
    if(!favs.length){
      var p = document.createElement('p');
      p.className = 'search-empty';
      p.textContent = 'Henüz favori eklemedin — kartlardaki kalp ikonuna tıkla.';
      searchResults.appendChild(p);
      return;
    }
    favs.forEach(function(id){
      var card = document.querySelector('[data-fav-id="' + id + '"]');
      if(!card) return;
      var wrap = card.closest('.video-card, .product-card');
      if(!wrap) return;
      var titleEl = wrap.querySelector('.video-title, .product-name');
      var subEl = wrap.querySelector('.video-num, .product-price');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-result-item';
      var typeSpan = document.createElement('span');
      typeSpan.className = 'search-result-type';
      typeSpan.textContent = id.charAt(0) === 'v' ? 'Bölüm' : 'Ürün';
      var titleSpan = document.createElement('span');
      titleSpan.className = 'search-result-title';
      titleSpan.textContent = titleEl ? titleEl.textContent : '';
      var subSpan = document.createElement('span');
      subSpan.className = 'search-result-sub';
      subSpan.textContent = subEl ? subEl.textContent : '';
      btn.appendChild(typeSpan); btn.appendChild(titleSpan); btn.appendChild(subSpan);
      btn.addEventListener('click', function(){
        closeModal(searchOverlay);
        wrap.scrollIntoView({behavior:'smooth', block:'center'});
      });
      searchResults.appendChild(btn);
    });
  }
  var favBtn = document.getElementById('favBtn');
  if(favBtn && searchOverlay){
    favBtn.addEventListener('click', function(){
      openModal('searchOverlay');
      if(searchInput) searchInput.value = '';
      renderFavoritesList();
    });
  }

  /* ---------- cart (localStorage) ----------
     Same pattern as favorites above: a plain array persisted to localStorage, no backend.
     This is a single static HTML file with no server, so "checkout" can only ever be a
     client-side mock -- it never asks for payment details and never claims to charge
     anything; it just clears the cart with a friendly confirmation, same spirit as the
     existing "Sepete eklendi" message. */
  var CART_KEY = 'demleme-cart';
  function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }catch(e){ return []; } }
  function setCart(arr){ try{ localStorage.setItem(CART_KEY, JSON.stringify(arr)); }catch(e){} }
  function parsePrice(str){
    if(!str) return 0;
    var m = String(str).replace(/\./g,'').match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }
  function updateCartCount(){
    var cart = getCart();
    var total = cart.reduce(function(sum, it){ return sum + (it.qty || 1); }, 0);
    var el = document.getElementById('cartCount');
    if(el){ el.textContent = total; el.hidden = total === 0; }
  }
  function addToCart(item){
    var cart = getCart();
    var existing = cart.filter(function(it){ return it.id === item.id; })[0];
    if(existing){ existing.qty += item.qty || 1; }
    else { cart.push({ id: item.id, name: item.name, price: item.price, qty: item.qty || 1 }); }
    setCart(cart);
    updateCartCount();
    renderCartDrawer();
  }
  function renderCartDrawer(){
    var list = document.getElementById('cartList');
    var foot = document.getElementById('cartFoot');
    var subtotalEl = document.getElementById('cartSubtotal');
    if(!list) return;
    var cart = getCart();
    if(!cart.length){
      list.innerHTML = '<p class="cart-empty" id="cartEmptyMsg">Sepetin boş — <a href="#shop" data-close="cartDrawer">ürünlere göz at</a>.</p>';
      var emptyLink = list.querySelector('a[data-close]');
      if(emptyLink) emptyLink.addEventListener('click', function(){ closeModal(document.getElementById('cartDrawer')); });
      if(foot) foot.hidden = true;
      return;
    }
    if(foot) foot.hidden = false;
    list.innerHTML = '';
    var subtotal = 0;
    cart.forEach(function(item){
      subtotal += parsePrice(item.price) * item.qty;
      var row = document.createElement('div');
      row.className = 'cart-item';
      row.setAttribute('data-id', item.id);
      row.innerHTML =
        '<div class="cart-item-info"><b></b><span></span></div>' +
        '<div class="cart-item-qty"><button type="button" class="cart-qty-minus" aria-label="Azalt">–</button><span></span><button type="button" class="cart-qty-plus" aria-label="Arttır">+</button></div>' +
        '<button type="button" class="cart-item-remove" aria-label="Kaldır">&times;</button>';
      row.querySelector('.cart-item-info b').textContent = item.name;
      row.querySelector('.cart-item-info span').textContent = item.price;
      row.querySelector('.cart-item-qty span').textContent = item.qty;
      list.appendChild(row);
    });
    if(subtotalEl) subtotalEl.textContent = '₺' + formatTr(subtotal);
  }
  document.getElementById('cartList') && document.getElementById('cartList').addEventListener('click', function(e){
    var row = e.target.closest ? e.target.closest('.cart-item') : null;
    if(!row) return;
    var id = row.getAttribute('data-id');
    var cart = getCart();
    var item = cart.filter(function(it){ return it.id === id; })[0];
    if(!item) return;
    if(e.target.classList.contains('cart-qty-plus')){
      item.qty = Math.min(9, item.qty + 1);
    } else if(e.target.classList.contains('cart-qty-minus')){
      item.qty -= 1;
      if(item.qty <= 0) cart = cart.filter(function(it){ return it.id !== id; });
    } else if(e.target.classList.contains('cart-item-remove')){
      cart = cart.filter(function(it){ return it.id !== id; });
    } else {
      return;
    }
    setCart(cart);
    updateCartCount();
    renderCartDrawer();
  });
  var cartBtn = document.getElementById('cartBtn');
  if(cartBtn){
    cartBtn.addEventListener('click', function(){
      renderCartDrawer();
      openModal('cartDrawer');
    });
  }
  var cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
  if(cartCheckoutBtn){
    cartCheckoutBtn.addEventListener('click', function(){
      var cart = getCart();
      if(!cart.length) return;
      window.location.href = '/odeme';
    });
  }
  updateCartCount();

  /* ---------- guest bio modal ---------- */
  document.querySelectorAll('.guest-chip').forEach(function(chip){
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', function(){
      var name = chip.querySelector('.guest-chip-name');
      var role = chip.querySelector('.guest-chip-role');
      var avatar = chip.querySelector('.guest-chip-avatar');
      var bio = chip.getAttribute('data-bio');
      var mName = document.getElementById('guestModalName');
      var mRole = document.getElementById('guestModalRole');
      var mBio = document.getElementById('guestModalBio');
      var mAvatar = document.getElementById('guestModalAvatar');
      if(mName) mName.textContent = name ? name.textContent : '';
      if(mRole) mRole.textContent = role ? role.textContent : '';
      if(mBio) mBio.textContent = bio || '';
      if(mAvatar && avatar){ mAvatar.textContent = avatar.textContent; mAvatar.style.background = avatar.style.background; }
      openModal('guestModal');
    });
  });

  /* ---------- episode archive overlay ---------- */
  var archiveBtn = document.getElementById('archiveBtn');
  var archiveOverlay = document.getElementById('archiveOverlay');
  if(archiveBtn && archiveOverlay){
    archiveBtn.addEventListener('click', function(){ openModal('archiveOverlay'); });
  }
  document.querySelectorAll('.archive-filter').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.archive-filter').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var tag = btn.getAttribute('data-tag');
      document.querySelectorAll('.archive-row').forEach(function(row){
        row.hidden = !(tag === 'hepsi' || row.getAttribute('data-tag') === tag);
      });
    });
  });
  document.querySelectorAll('.archive-row').forEach(function(row){
    row.addEventListener('click', function(){ closeModal(archiveOverlay); });
  });


  /* ---------- QR code ---------- */
  var qrTarget = document.getElementById('qrCanvas');
  if(qrTarget){
    if(window.QRCode){
      try{ new QRCode(qrTarget, {text:'https://youtube.com', width:64, height:64, colorDark:'#16130E', colorLight:'#ffffff'}); }
      catch(e){ qrTarget.textContent = ''; }
    } else {
      qrTarget.innerHTML = '<div style="width:64px;height:64px;border-radius:8px;background:var(--cream);"></div>';
    }
  }

  /* ---------- poll widget ---------- */
  var POLL_KEY = 'demleme-poll-vote';
  var pollOpts = document.querySelectorAll('.poll-opt');
  var pollCounts = {a:42, b:35, c:23};
  var pollReduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countUpPct(el, from, to){
    if(pollReduceMotion || !el){ if(el) el.textContent = to + '%'; return; }
    var dur = 600, start = null;
    function step(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * eased) + '%';
      if(p < 1) requestAnimationFrame(step);
      else el.textContent = to + '%';
    }
    requestAnimationFrame(step);
  }
  function renderPoll(){
    var total = pollCounts.a + pollCounts.b + pollCounts.c;
    pollOpts.forEach(function(opt){
      var key = opt.getAttribute('data-poll');
      var pct = total ? Math.round(pollCounts[key] / total * 100) : 0;
      var fill = opt.querySelector('.poll-opt-fill');
      var pctEl = opt.querySelector('.poll-pct');
      if(fill) fill.style.width = pct + '%';
      if(pctEl){
        var from = parseInt(pctEl.textContent, 10) || 0;
        countUpPct(pctEl, from, pct);
      }
    });
  }
  if(pollOpts.length){
    var votedKey = null;
    try{ votedKey = localStorage.getItem(POLL_KEY); }catch(e){}
    if(votedKey && pollCounts.hasOwnProperty(votedKey)){
      pollCounts[votedKey] += 1;
      pollOpts.forEach(function(o){
        var isVoted = o.getAttribute('data-poll') === votedKey;
        o.classList.toggle('voted', isVoted);
        o.setAttribute('aria-checked', isVoted ? 'true' : 'false');
      });
      var pn = document.getElementById('pollNote');
      if(pn) pn.textContent = 'Oyun kaydedildi, teşekkürler!';
    }
    renderPoll();
    pollOpts.forEach(function(opt){
      opt.addEventListener('click', function(){
        if(votedKey) return;
        var key = opt.getAttribute('data-poll');
        pollCounts[key] = (pollCounts[key] || 0) + 1;
        votedKey = key;
        try{ localStorage.setItem(POLL_KEY, key); }catch(e){}
        pollOpts.forEach(function(o){ o.setAttribute('aria-checked', o === opt ? 'true' : 'false'); });
        opt.classList.add('voted');
        var note = document.getElementById('pollNote');
        if(note) note.textContent = 'Oyun kaydedildi, teşekkürler!';
        renderPoll();
      });
    });
  }

  /* ---------- mini quiz ---------- */
  var quizAnswers = {};
  var quizStepIndex = 0;
  var quizSteps = document.querySelectorAll('.quiz-step');
  var quizProgressDots = document.querySelectorAll('#quizProgress i');
  function showQuizStep(i){
    quizSteps.forEach(function(s){ s.classList.toggle('active', parseInt(s.getAttribute('data-step'), 10) === i); });
    quizProgressDots.forEach(function(d, idx){ d.classList.toggle('done', idx <= i); });
  }
  document.querySelectorAll('.quiz-opt').forEach(function(opt){
    opt.addEventListener('click', function(){
      var q = opt.getAttribute('data-q');
      var v = opt.getAttribute('data-v');
      quizAnswers[q] = v;
      var nextStep = parseInt(q, 10) + 1;
      if(nextStep < quizSteps.length){
        quizStepIndex = nextStep;
        showQuizStep(quizStepIndex);
      } else {
        var tally = {a:0, b:0, c:0};
        Object.keys(quizAnswers).forEach(function(k){ tally[quizAnswers[k]] = (tally[quizAnswers[k]] || 0) + 1; });
        var winner = 'b', max = -1;
        ['a','b','c'].forEach(function(k){ if(tally[k] > max){ max = tally[k]; winner = k; } });
        var results = {
          a: {title:'Herkesi Kandırabilirsin Ama Kendini Asla', desc:'Sana en yakın bölüm bu — mutfağın sıcaklığı ve iyi bir tarif kadar keyifli.'},
          b: {title:'Biz Ne İş Yapıyoruz', desc:'Sana en yakın bölüm bu — sıcak, samimi ve anılarla dolu.'},
          c: {title:'Düğün Hazırlığı Zor İş', desc:'Sana en yakın bölüm bu — yaratıcılık ve ilhamla dolu bir sohbet.'}
        };
        var r = results[winner];
        var titleEl = document.getElementById('quizResultTitle');
        var descEl = document.getElementById('quizResultDesc');
        if(titleEl) titleEl.textContent = r.title;
        if(descEl) descEl.textContent = r.desc;
        var qBody = document.getElementById('quizBody');
        var qResult = document.getElementById('quizResult');
        if(qBody) qBody.style.display = 'none';
        if(qResult) qResult.classList.add('show');
      }
    });
  });
  var quizRestart = document.getElementById('quizRestart');
  if(quizRestart){
    quizRestart.addEventListener('click', function(e){
      e.preventDefault();
      quizAnswers = {};
      quizStepIndex = 0;
      showQuizStep(0);
      var qBody = document.getElementById('quizBody');
      var qResult = document.getElementById('quizResult');
      if(qBody) qBody.style.display = '';
      if(qResult) qResult.classList.remove('show');
    });
  }

  /* ---------- tab title trick + logo easter egg ---------- */
  var originalTitle = document.title;
  document.addEventListener('visibilitychange', function(){
    document.title = document.hidden ? 'Sofraya dön ☕' : originalTitle;
  });
  var logoClicks = 0, logoClickTimer = null;
  document.querySelectorAll('.nav-logo').forEach(function(logo){
    logo.addEventListener('click', function(e){
      logoClicks++;
      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(function(){ logoClicks = 0; }, 1200);
      if(logoClicks >= 5){
        logoClicks = 0;
        e.preventDefault();
        logo.style.transition = 'transform .6s cubic-bezier(.3,1.6,.4,1)';
        logo.style.transform = 'rotate(360deg) scale(1.2)';
        setTimeout(function(){ logo.style.transform = ''; }, 650);
      }
    });
  });

  /* ---------- split-heading: char-by-char scroll reveal on major titles ---------- */
  (function(){
    if(premiumReduce) return;
    if(typeof window.SplitType === 'undefined' || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
    try{
      var headings = document.querySelectorAll('.split-heading');
      var allChars = [];
      headings.forEach(function(h){
        var split = new SplitType(h, { types: 'words, chars' });
        if(!split.chars || !split.chars.length) return;
        gsap.set(split.chars, { opacity: 0, y: '0.55em', rotateX: -35, transformOrigin: '50% 100% -18px' });
        split.chars.forEach(function(c){ allChars.push(c); });
        ScrollTrigger.create({
          trigger: h,
          start: 'top 88%',
          once: true,
          onEnter: function(){
            gsap.to(split.chars, { opacity: 1, y: '0em', rotateX: 0, duration: .75, ease: 'back.out(1.5)', stagger: 0.016 });
          }
        });
      });
      /* safety net: if a trigger never fires (e.g. very fast scroll past), reveal after a delay */
      if(allChars.length){
        setTimeout(function(){
          allChars.forEach(function(c){
            if(getComputedStyle(c).opacity === '0'){ gsap.to(c, { opacity: 1, y: '0em', rotateX: 0, duration: .4 }); }
          });
        }, 4500);
      }
    }catch(e){}
  })();

})();
