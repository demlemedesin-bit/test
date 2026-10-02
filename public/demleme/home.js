(function(){
  // Panelden gelen animasyon ayarları (#animCfg); yoksa tasarımdaki varsayılanlar
  var AN={}; try{ AN=JSON.parse(document.getElementById('animCfg').textContent)||{}; }catch(e){}
  var an=function(k,d){ var v=AN[k]; return (typeof v==='number' && isFinite(v) && v>=0) ? v : d; };
  if(AN.off){ var mm=window.matchMedia.bind(window); window.matchMedia=function(q){ var o=mm(q); return /prefers-reduced-motion/.test(q) ? {matches:true,media:q,addEventListener:function(){},removeEventListener:function(){},addListener:function(){},removeListener:function(){}} : o; }; }
  // Mobile nav
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var toggleIcon = document.getElementById('navToggleIcon').querySelector('use');
  toggle.addEventListener('click', function(){
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleIcon.setAttribute('href', open ? '#i-x' : '#i-menu');
  });
  nav.querySelectorAll('.nav-mobile a').forEach(function(a){
    a.addEventListener('click', function(){
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggleIcon.setAttribute('href', '#i-menu');
    });
  });

  // FAQ accordion (one open at a time)
  var items = document.querySelectorAll('#faq .faq-item');
  items.forEach(function(item){
    var q = item.querySelector('.faq-q');
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('is-open');
      items.forEach(function(i){ i.classList.remove('is-open'); i.querySelector('.faq-q').setAttribute('aria-expanded','false'); });
      if(!isOpen){ item.classList.add('is-open'); q.setAttribute('aria-expanded','true'); }
    });
  });

  // Version D pour: one small image per frame (no sheet to decode). The resting frame is drawn as soon as it
  // loads and the scroll is live from that moment; the other frames decode in the background. Pinned for the
  // first PIN px of scroll while the wrist tilts; released when the tea starts; the stream then runs down over
  // POUR px; after that the last stretch keeps cycling so the stream never freezes.
  (function(){
    var cv=document.getElementById('pourCanvas'), meta=document.getElementById('pourMeta'), art=document.getElementById('pourArt'), stage=document.getElementById('stage'), hero=document.getElementById('heroB');
    if(!cv || !meta) return;
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SRCS=["/demleme/02-hero-pour/pour-frames/frame-000.png", "/demleme/02-hero-pour/pour-frames/frame-001.png", "/demleme/02-hero-pour/pour-frames/frame-002.png", "/demleme/02-hero-pour/pour-frames/frame-003.png", "/demleme/02-hero-pour/pour-frames/frame-004.png", "/demleme/02-hero-pour/pour-frames/frame-005.png", "/demleme/02-hero-pour/pour-frames/frame-006.png", "/demleme/02-hero-pour/pour-frames/frame-007.png", "/demleme/02-hero-pour/pour-frames/frame-008.png", "/demleme/02-hero-pour/pour-frames/frame-009.png", "/demleme/02-hero-pour/pour-frames/frame-010.png", "/demleme/02-hero-pour/pour-frames/frame-011.png", "/demleme/02-hero-pour/pour-frames/frame-012.png", "/demleme/02-hero-pour/pour-frames/frame-013.png", "/demleme/02-hero-pour/pour-frames/frame-014.png", "/demleme/02-hero-pour/pour-frames/frame-015.png", "/demleme/02-hero-pour/pour-frames/frame-016.png", "/demleme/02-hero-pour/pour-frames/frame-017.png", "/demleme/02-hero-pour/pour-frames/frame-018.png", "/demleme/02-hero-pour/pour-frames/frame-019.png", "/demleme/02-hero-pour/pour-frames/frame-020.png", "/demleme/02-hero-pour/pour-frames/frame-021.png", "/demleme/02-hero-pour/pour-frames/frame-022.png", "/demleme/02-hero-pour/pour-frames/frame-023.png", "/demleme/02-hero-pour/pour-frames/frame-024.png", "/demleme/02-hero-pour/pour-frames/frame-025.png", "/demleme/02-hero-pour/pour-frames/frame-026.png", "/demleme/02-hero-pour/pour-frames/frame-027.png", "/demleme/02-hero-pour/pour-frames/frame-028.png", "/demleme/02-hero-pour/pour-frames/frame-029.png", "/demleme/02-hero-pour/pour-frames/frame-030.png", "/demleme/02-hero-pour/pour-frames/frame-031.png", "/demleme/02-hero-pour/pour-frames/frame-032.png", "/demleme/02-hero-pour/pour-frames/frame-033.png", "/demleme/02-hero-pour/pour-frames/frame-034.png", "/demleme/02-hero-pour/pour-frames/frame-035.png", "/demleme/02-hero-pour/pour-frames/frame-036.png", "/demleme/02-hero-pour/pour-frames/frame-037.png", "/demleme/02-hero-pour/pour-frames/frame-038.png", "/demleme/02-hero-pour/pour-frames/frame-039.png", "/demleme/02-hero-pour/pour-frames/frame-040.png", "/demleme/02-hero-pour/pour-frames/frame-041.png", "/demleme/02-hero-pour/pour-frames/frame-042.png", "/demleme/02-hero-pour/pour-frames/frame-043.png", "/demleme/02-hero-pour/pour-frames/frame-044.png", "/demleme/02-hero-pour/pour-frames/frame-045.png", "/demleme/02-hero-pour/pour-frames/frame-046.png", "/demleme/02-hero-pour/pour-frames/frame-047.png", "/demleme/02-hero-pour/pour-frames/frame-048.png", "/demleme/02-hero-pour/pour-frames/frame-049.png", "/demleme/02-hero-pour/pour-frames/frame-050.png", "/demleme/02-hero-pour/pour-frames/frame-051.png", "/demleme/02-hero-pour/pour-frames/frame-052.png", "/demleme/02-hero-pour/pour-frames/frame-053.png", "/demleme/02-hero-pour/pour-frames/frame-054.png", "/demleme/02-hero-pour/pour-frames/frame-055.png", "/demleme/02-hero-pour/pour-frames/frame-056.png", "/demleme/02-hero-pour/pour-frames/frame-057.png", "/demleme/02-hero-pour/pour-frames/frame-058.png", "/demleme/02-hero-pour/pour-frames/frame-059.png", "/demleme/02-hero-pour/pour-frames/frame-060.png", "/demleme/02-hero-pour/pour-frames/frame-061.png", "/demleme/02-hero-pour/pour-frames/frame-062.png", "/demleme/02-hero-pour/pour-frames/frame-063.png", "/demleme/02-hero-pour/pour-frames/frame-064.png", "/demleme/02-hero-pour/pour-frames/frame-065.png", "/demleme/02-hero-pour/pour-frames/frame-066.png", "/demleme/02-hero-pour/pour-frames/frame-067.png", "/demleme/02-hero-pour/pour-frames/frame-068.png", "/demleme/02-hero-pour/pour-frames/frame-069.png", "/demleme/02-hero-pour/pour-frames/frame-070.png", "/demleme/02-hero-pour/pour-frames/frame-071.png", "/demleme/02-hero-pour/pour-frames/frame-072.png", "/demleme/02-hero-pour/pour-frames/frame-073.png", "/demleme/02-hero-pour/pour-frames/frame-074.png", "/demleme/02-hero-pour/pour-frames/frame-075.png", "/demleme/02-hero-pour/pour-frames/frame-076.png", "/demleme/02-hero-pour/pour-frames/frame-077.png", "/demleme/02-hero-pour/pour-frames/frame-078.png", "/demleme/02-hero-pour/pour-frames/frame-079.png", "/demleme/02-hero-pour/pour-frames/frame-080.png", "/demleme/02-hero-pour/pour-frames/frame-081.png", "/demleme/02-hero-pour/pour-frames/frame-082.png", "/demleme/02-hero-pour/pour-frames/frame-083.png", "/demleme/02-hero-pour/pour-frames/frame-084.png", "/demleme/02-hero-pour/pour-frames/frame-085.png", "/demleme/02-hero-pour/pour-frames/frame-086.png", "/demleme/02-hero-pour/pour-frames/frame-087.png", "/demleme/02-hero-pour/pour-frames/frame-088.png", "/demleme/02-hero-pour/pour-frames/frame-089.png", "/demleme/02-hero-pour/pour-frames/frame-090.png", "/demleme/02-hero-pour/pour-frames/frame-091.png", "/demleme/02-hero-pour/pour-frames/frame-092.png", "/demleme/02-hero-pour/pour-frames/frame-093.png", "/demleme/02-hero-pour/pour-frames/frame-094.png", "/demleme/02-hero-pour/pour-frames/frame-095.png"], N=SRCS.length, ctx=cv.getContext('2d');
    var TIPS=(meta.getAttribute('data-tips')||'').split(',').map(Number); if(TIPS.length!==N) TIPS=null;
    art.style.setProperty('--sx', meta.getAttribute('data-spout-x')||.5);
    var DROP=Math.round(N*0.35); if(TIPS){ for(var q=0;q<N;q++){ if(TIPS[q]>0){ DROP=q; break; } } }   // first frame with tea leaving the spout
    var START0=0, PIN=Math.max(120, Math.round(DROP*an('pourPin',3))), POUR=an('pourPx',520), last=-1, curF=START0, done=false, want=START0;   // the wrist moves from the first scroll pixel (≈3px per frame at 24 fps) and the pot fills as it pours; the page releases when the tea leaves the spout
    var imgs=SRCS.map(function(src){ var im=new Image(); im.src=src; return im; });
    var mobile=function(){ return matchMedia('(max-width: 768px)').matches; };
    var about=document.querySelector('.hero-about'), landing=document.getElementById('landing'), stats=document.getElementById('stats');
    var FW0=cv.width, FH0=cv.height, EXT=0, EXTS=0, fill=0;                    // EXT = extra stream length in CSS px, EXTS in frame px
    var REACH=N-1; if(TIPS){ for(var q2=0;q2<N;q2++){ if(TIPS[q2]>=0.99){ REACH=q2; break; } } }
    var setExt=function(d){ EXT=d; var w=cv.clientWidth||1; EXTS=Math.round(d*FW0/w); cv.height=FH0+EXTS; cv.style.aspectRatio=FW0+' / '+(FH0+EXTS); art.style.setProperty('--ext', d+'px'); last=-1; };
    var align=function(){ if(!about || !landing || mobile()){ if(EXT) setExt(0); if(about) about.style.marginTop=''; if(stats) stats.style.marginTop=''; art.style.marginTop=''; hero.style.paddingBottom=''; return; }
      art.style.marginTop='0px'; hero.style.paddingBottom=''; if(stats) stats.style.marginTop='';
      // the photo (top cropped 40 px) starts level with "Merhaba. Ben Garen.": the stream is extended by exactly the
      // difference, so the pot stays where it is and the glass still catches the tea
      about.style.marginTop='0px'; setExt(0);
      var ptop=landing.getBoundingClientRect().top + 40, floor=about.getBoundingClientRect().top;
      setExt(Math.max(0, Math.round(floor - ptop)));
      var top=landing.getBoundingClientRect().top + 40;
      about.style.marginTop=Math.max(0, Math.round(top - about.getBoundingClientRect().top))+'px';
      // the stats strip runs under both the copy and the photo
      if(stats){ var gap=parseFloat(getComputedStyle(stats).marginTop)||64, need=landing.getBoundingClientRect().bottom + gap - stats.getBoundingClientRect().top;
        if(need>0) stats.style.marginTop=Math.round(gap + need)+'px'; }
      var pb=landing.getBoundingClientRect().bottom - hero.getBoundingClientRect().bottom; if(pb>0) hero.style.paddingBottom=Math.round(pb + 24)+'px'; };
    var size=function(){ align(); if(stage && hero) stage.style.height = mobile() ? '' : (hero.offsetHeight + PIN)+'px'; };
    var draw=function(i){ i=Math.max(0,Math.min(N-1,i)); want=i; var im=imgs[i];
      if(!im.complete || !im.naturalWidth){ im.addEventListener('load', function(){ if(want===i) draw(i); }, {once:true}); return; }   // not there yet: draw it when it lands
      var key=i+':'+fill.toFixed(3); if(key===last) return; last=key; cv.dataset.f=i; ctx.clearRect(0,0,cv.width,cv.height); ctx.drawImage(im,0,0,FW0,FH0);
      if(EXTS>0 && fill>0){ var band=8, h=Math.round(EXTS*fill); ctx.drawImage(im, 0, im.naturalHeight-band-2, im.naturalWidth, band, 0, FH0-1, FW0, h+1); } };   // the straight stream, stretched down into the extension
    var update=function(){
      var y=scrollY, f;
      if(y<PIN){ f=START0+Math.round((y/PIN)*(DROP-START0)); fill=0; }         // pinned: the wrist tilts
      else {                                                                   // page moves: the tea runs down the frame, then on down the extension
        var FHd=cv.clientWidth*FH0/FW0, t0=TIPS?TIPS[DROP]:0, run=(1-t0)*FHd; if(run<20) run=0; var L=run+EXT, u=Math.min(1,(y-PIN)/(POUR*(run>0 ? L/run : 1))), d=u*L;   // run 0 = the clip's stream is already full length at the first drop
        if(EXT<=0){ f=DROP+Math.round(u*(N-1-DROP)); fill=0; }   // no room for an extension at this window size: the clip itself plays out, so the pot still fills
        else if(d<=run){ var want2=t0+d/FHd; f=DROP; if(TIPS){ for(var q3=DROP;q3<=REACH;q3++){ if(TIPS[q3]<=want2) f=q3; else break; } } else f=DROP+Math.round(u*(N-1-DROP)); fill=0; }
        else { fill=(d-run)/EXT; f=REACH+Math.round(fill*(N-1-REACH)); }
      }
      curF=f; done=f>=N-1 && (EXT<=0 || fill>=.999); draw(f); art.classList.toggle('tea-in', done || fill>.92);
    };
    var TAIL=Math.min(14, Math.max(6, Math.round(N*0.2))), li=0, dir=1, tick=0;
    var live=function(){
      if(reduce) return;
      if(done){ fill=1; li+=dir; if(li>=TAIL-1 || li<=0) dir=-dir; draw(N-TAIL+li); }
      else if(curF>DROP && fill===0){ tick=(tick+1)%3; draw(curF+tick); }
    };
    size(); update(); setInterval(live, 100);
    addEventListener('scroll', update, {passive:true}); addEventListener('resize', function(){ size(); update(); });
    // warm the decoder: the frames in play order, one after another, without blocking anything
    (function warm(i){ if(i>=N) return; var im=imgs[(START0+i)%N]; var next=function(){ warm(i+1); }; (im.decode ? im.decode() : Promise.resolve()).then(next, next); })(0);
  })();

  // Turkish glyphs for Strenuous (see CSS): wrap Ş ş Ğ ğ İ ı and every lowercase i in display text
  (function(){
    var SEL='.title, h2, h3, h4, .card-title, .product-name, .faq-q, .footer-logo, .nav-logo, .cart-head h3, .rl-name, .shop-cats button, .nav-mobile a, .kc, .kb-list button span';   // only the Strenuous roles need the rebuilt Turkish glyphs
    var MAP={'Ş':['S','tg-ced'],'ş':['s','tg-ced'],'Ğ':['G','tg-brv'],'ğ':['g','tg-brv'],'İ':['I','tg-dot'],'i':['I','tg-dot'],'ı':['I','']};   // every i/ı is the full-height I of this unicase face; only i and İ get the dot  // unicase face: lowercase i needs its dot too; capital I stays bare (= Turkish I)
    var walk=function(node){
      if(node.nodeType===3){
        if(!/[ŞşĞğİıi]/.test(node.nodeValue)) return;
        var frag=document.createDocumentFragment();
        node.nodeValue.split(/([ŞşĞğİıi])/).forEach(function(part){
          if(MAP[part]){ var s=document.createElement('span'); s.className='tg '+MAP[part][1]; s.textContent=MAP[part][0]; s.setAttribute('data-ch', part); frag.appendChild(s); }
          else if(part) frag.appendChild(document.createTextNode(part));
        });
        node.parentNode.replaceChild(frag, node);
      } else if(node.nodeType===1 && node.tagName!=='SCRIPT' && node.tagName!=='STYLE' && !node.classList.contains('tg')){
        [].slice.call(node.childNodes).forEach(walk);
      }
    };
    [].forEach.call(document.querySelectorAll(SEL), walk);
    // text that scripts fill in later (guest list, the chosen guest, name cards, cart) gets the same fix: re-walk what changed
    if('MutationObserver' in window) new MutationObserver(function(ms){ var set=[];
      ms.forEach(function(m){ var el=m.target.nodeType===3 ? m.target.parentElement : m.target, t=el && el.closest ? el.closest(SEL) : null; if(t && set.indexOf(t)<0) set.push(t);
        [].forEach.call(m.addedNodes||[], function(n){ if(n.nodeType!==1) return; if(n.matches && n.matches(SEL)) set.push(n); if(n.querySelectorAll) [].push.apply(set, n.querySelectorAll(SEL)); }); });
      set.forEach(walk); }).observe(document.body, {childList:true, subtree:true, characterData:true});
  })();

  // Logo intro: wordmark first, then the man lifts the glass and sips (frames), then the original still
  (function(){
    var nav=document.getElementById('navLogo'); if(!nav || reduce) return;
    var FR=["/demleme/01-brand/logo/animation-frames/frame-00.png", "/demleme/01-brand/logo/animation-frames/frame-01.png", "/demleme/01-brand/logo/animation-frames/frame-02.png", "/demleme/01-brand/logo/animation-frames/frame-03.png", "/demleme/01-brand/logo/animation-frames/frame-04.png", "/demleme/01-brand/logo/animation-frames/frame-05.png", "/demleme/01-brand/logo/animation-frames/frame-06.png", "/demleme/01-brand/logo/animation-frames/frame-07.png", "/demleme/01-brand/logo/animation-frames/frame-08.png", "/demleme/01-brand/logo/animation-frames/frame-09.png", "/demleme/01-brand/logo/animation-frames/frame-10.png", "/demleme/01-brand/logo/animation-frames/frame-11.png", "/demleme/01-brand/logo/animation-frames/frame-12.png", "/demleme/01-brand/logo/animation-frames/frame-13.png", "/demleme/01-brand/logo/animation-frames/frame-14.png", "/demleme/01-brand/logo/animation-frames/frame-15.png", "/demleme/01-brand/logo/animation-frames/frame-16.png", "/demleme/01-brand/logo/animation-frames/frame-17.png", "/demleme/01-brand/logo/animation-frames/frame-18.png", "/demleme/01-brand/logo/animation-frames/frame-19.png", "/demleme/01-brand/logo/animation-frames/frame-20.png", "/demleme/01-brand/logo/animation-frames/frame-21.png", "/demleme/01-brand/logo/animation-frames/frame-22.png", "/demleme/01-brand/logo/animation-frames/frame-23.png", "/demleme/01-brand/logo/animation-frames/frame-24.png", "/demleme/01-brand/logo/animation-frames/frame-25.png", "/demleme/01-brand/logo/animation-frames/frame-26.png", "/demleme/01-brand/logo/animation-frames/frame-27.png", "/demleme/01-brand/logo/animation-frames/frame-28.png", "/demleme/01-brand/logo/animation-frames/frame-29.png", "/demleme/01-brand/logo/animation-frames/frame-30.png"], fr=nav.querySelector('.fr'), st=nav.querySelector('.st'); if(!fr || !st || !FR.length) return;
    var imgs=FR.map(function(src){ var im=new Image(); im.src=src; return im; });
    nav.classList.add('intro'); fr.style.opacity=1; st.style.opacity=0; var i=0;
    setTimeout(function(){ var t=setInterval(function(){ i++; if(i<FR.length){ fr.src=FR[i]; } else { clearInterval(t); fr.style.transition='opacity 350ms'; st.style.transition='opacity 350ms'; fr.style.opacity=0; st.style.opacity=1; } }, 90); }, an('logoDelay',1300));
  })();

  // Konuklar (video): the table is one looping video made of clips joined with short crossfades; in each clip a guest
  // gets up and leaves and a new guest sits down, while the others keep chatting. It plays continuously while on screen.
  // Arrows: next = skip to the next change, prev = back to the previous one. Name cards and click areas follow the
  // table state (guestData.states = which drawing sits in which seat after each clip).
  (function(){
    var stage=document.getElementById('konukStage'), host=document.getElementById('konukSeats'), v=document.getElementById('konukVideo'), dataEl=document.getElementById('guestData');
    if(!stage || !v || !dataEl) return;
    var D=JSON.parse(dataEl.textContent), ST=D.states, SEG=D.segment, SEATS=D.seats, SY=D.seatY, n=ST.length-1;   // states[0] = start, states[n] = back to start
    var cards=[], zones=[], vis=false, shown=[];
    v.loop=true;
    SEATS.forEach(function(x,i){ var z=document.createElement('a'); z.className='ks'; host.appendChild(z); zones.push(z);
      var c=document.createElement('a'); c.className='kc'; host.appendChild(c); cards.push(c); });
    var put=function(){ var W=stage.clientWidth, H=stage.clientHeight;
      SEATS.forEach(function(x,i){ var y=SY[i]*H, z=zones[i], c=cards[i], zw=W*.15;
        z.style.left=(x*W-zw/2)+'px'; z.style.width=zw+'px'; z.style.top=(y-H*.42)+'px'; z.style.height=(H*.42)+'px';
        c.style.left=(x*W)+'px'; c.style.top=(y+W*.045)+'px'; var sl=(SY[Math.min(i+1,SEATS.length-1)]-SY[Math.max(i-1,0)])*H/((SEATS[Math.min(i+1,SEATS.length-1)]-SEATS[Math.max(i-1,0)])*W);
        c.style.transform='translateX(-50%) rotate('+(Math.atan(sl)*180/Math.PI)+'deg)'; }); };
    var setSeat=function(i, g, show){ var G=D.guests[g]||{name:'',url:'#'};
      if(shown[i]!==g){ shown[i]=g; cards[i].textContent=G.name; cards[i].href=G.url; zones[i].href=G.url; zones[i].setAttribute('aria-label',G.name); }
      cards[i].style.opacity=show?1:0; zones[i].style.pointerEvents=show?'':'none'; };
    // which guest sits where at time t: in clip k seat s changes from ST[k][s] to ST[k+1][s]; the leaving guest's card
    // fades out as they stand up (18 % into the clip) and the new name fades in once they have sat down (80 %)
    var sync=function(){ var t=v.currentTime||0, k=Math.min(n-1, Math.floor(t/SEG)), u=t/SEG-k;
      SEATS.forEach(function(x,i){ var a=ST[k][i], b=ST[k+1][i];
        if(a===b) setSeat(i,a,true); else if(u<.18) setSeat(i,a,true); else if(u<.8) setSeat(i,a,false); else setSeat(i,b,true); }); };
    var loop=function(){ sync(); if(!v.paused) requestAnimationFrame(loop); };
    v.addEventListener('play', function(){ requestAnimationFrame(loop); });
    v.addEventListener('timeupdate', sync); v.addEventListener('seeked', sync);   // keeps cards right where animation frames are throttled
    var go=function(){ if(vis && !document.hidden){ var p=v.play(); if(p && p.catch) p.catch(function(){}); } else v.pause(); };
    var seek=function(d){ var k=Math.floor((v.currentTime||0)/SEG), u=(v.currentTime||0)/SEG-k;
      if(d<0 && u>.25) d=0;                                     // prev inside a change: back to its start first
      k=((k+d)%n+n)%n; v.currentTime=k*SEG+.02; sync(); go(); };
    shown=[]; sync(); put(); addEventListener('resize', put);
    document.getElementById('konukNext').addEventListener('click', function(){ seek(1); });
    document.getElementById('konukPrev').addEventListener('click', function(){ seek(-1); });
    if('IntersectionObserver' in window){ new IntersectionObserver(function(es){ vis=es[0].isIntersecting; go(); }, {threshold:.25}).observe(stage); } else { vis=true; go(); }
    document.addEventListener('visibilitychange', go);
  })();

  // Reels row: the arrows scroll it by one card (own block, so it works on every Konuklar version)
  (function(){
    var rt=document.getElementById('reelTrack'), rp=document.getElementById('reelPrev'), rn=document.getElementById('reelNext');
    if(rt){ var rs=function(d){ var c=rt.querySelector('.rl-card'); rt.scrollBy({left:d*((c?c.getBoundingClientRect().width:200)+16), behavior:'smooth'}); };
      rp.addEventListener('click', function(){ rs(-1); }); rn.addEventListener('click', function(){ rs(1); });
      var ra=function(){ rp.disabled=rt.scrollLeft<4; rn.disabled=rt.scrollLeft+rt.clientWidth>rt.scrollWidth-4; }; rt.addEventListener('scroll', ra, {passive:true}); ra(); }
  })();

  // Shop: categories filter the rail (the red circle moves), arrows scroll it by one card
  (function(){
    var cats=document.getElementById('shopCats'), track=document.getElementById('shopTrack'); if(!cats || !track) return;
    var prev=document.getElementById('shopPrev'), next=document.getElementById('shopNext');
    var cards=[].slice.call(track.querySelectorAll('.sh-card'));
    var setArrows=function(){ prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4; };
    cats.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b) return;
      [].forEach.call(cats.querySelectorAll('button'), function(x){ x.classList.toggle('is-active', x===b); });
      var c=b.getAttribute('data-cat'); cards.forEach(function(el){ el.hidden = el.getAttribute('data-cat')!==c; }); track.scrollLeft=0; setArrows(); });
    var step=function(d){ var card=cards.filter(function(el){ return !el.hidden; })[0]; var w=card ? card.getBoundingClientRect().width + 16 : 240; track.scrollBy({left:d*w, behavior:'smooth'}); };
    prev.addEventListener('click', function(){ step(-1); }); next.addEventListener('click', function(){ step(1); });
    track.addEventListener('scroll', setArrows, {passive:true}); addEventListener('resize', setArrows);
    cards.forEach(function(el){ el.hidden = el.getAttribute('data-cat')!=='sofra'; }); setArrows();
  })();

  // Konuklar reel: play each scene for its data-dur, then the next; the img is re-inserted so the loop restarts
  (function(){
    var reel=document.getElementById('reel'); if(!reel) return;
    var i=0;
    var step=function(){
      var scenes=reel.querySelectorAll('.reel-scene'); if(!scenes.length) return;
      i=i%scenes.length; var cur=scenes[i];
      [].forEach.call(scenes, function(s){ s.classList.remove('is-current'); });
      var fresh=cur.cloneNode(true); fresh.classList.add('is-current'); cur.parentNode.replaceChild(fresh, cur);
      var d=+fresh.getAttribute('data-dur')||2000; i++; setTimeout(step, d);
    };
    if(!reduce) step();
  })();

  // Title relay: slot A opens → its loop plays for 2s → closes → 1.5s → slot B … repeat.
  // The img is re-inserted on each open so the animated WebP restarts from frame 1.
  (function(){
    var slots = [].slice.call(document.querySelectorAll('.title .slot'));
    if(slots.length !== 2 || reduce) return;
    var OPEN = 480, GAP = 1500;
    var play = function(i){
      var s = slots[i], imgs = s.querySelectorAll('img');
      var dur = +s.getAttribute('data-dur') || 5000;
      if(imgs.length){
        var n = (+s.getAttribute('data-scene') || 0) % imgs.length;      // rotate scenes: car → table → kitchen → …
        [].forEach.call(imgs, function(im, k){ im.classList.toggle('is-current', k === n); });
        var img = imgs[n], fresh = img.cloneNode(true); img.parentNode.replaceChild(fresh, img);   // restart from frame 1
        s.setAttribute('data-scene', n + 1);
      }
      s.classList.add('is-open');
      setTimeout(function(){
        s.classList.remove('is-open');
        setTimeout(function(){ play((i + 1) % slots.length); }, OPEN + GAP);
      }, OPEN + dur);
    };
    setTimeout(function(){ play(0); }, 900);
  })();

  // v15 Konuklar: the round table turns. Guests (#krData, in seat order) sit on a circle; the seat angle decides x
  // (sin), how big they are (the rim is lower at the sides = nearer), and whether they are in view: past the window
  // they sink behind the table rim and fade, which is where they walk round to the front half. → = one seat
  // clockwise seen from above: everyone moves right, the next guest comes up on the left. The turn is one eased value
  // (rot), so any number of presses queue smoothly and the circle never ends. The middle guest drives the reels.
  (function(){
    var stage=document.getElementById('krStage'), host=document.getElementById('krSeats'), el=document.getElementById('krData'); if(!stage || !el) return;
    var D=JSON.parse(el.textContent), G=D.guests, COV=D.covers, TEAS=D.teas||[], N=G.length, STEP=2*Math.PI/N, R=[0.7569, 0.6953, 0.6502, 0.6146, 0.5833, 0.5565, 0.5339, 0.513, 0.4939, 0.4766, 0.4618, 0.4488, 0.4375, 0.4288, 0.421, 0.4149, 0.4087, 0.405, 0.4028, 0.4019, 0.401, 0.4028, 0.4054, 0.4097, 0.4158, 0.4227, 0.4314, 0.4427, 0.454, 0.467, 0.4826, 0.4991, 0.5179, 0.5381, 0.5599, 0.5851, 0.6155, 0.6502, 0.6927, 0.7465, 0.8264], TAR=2.3333;
    var cups=TEAS.map(function(t,i){ var dl=(i*.83)%3.4;   // one steam per tea glass on the table, each on its own beat
      stage.insertAdjacentHTML('beforeend','<svg class="kr-steam kr-steam--cup" viewBox="0 0 100 160" aria-hidden="true"><path class="w1" style="animation-delay:-'+dl.toFixed(2)+'s" d="M58 150 C44 128 70 112 54 90 C40 70 60 56 46 34"/><path class="w2" style="animation-delay:'+(1.7-dl).toFixed(2)+'s" d="M42 152 C30 132 50 118 36 98 C24 80 40 66 28 46"/></svg>'); return stage.lastElementChild; });
    var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var edge=function(x){ x=Math.min(1,Math.max(0,x))*(R.length-1); var i=Math.min(R.length-2,Math.floor(x)), f=x-i; return R[i]*(1-f)+R[i+1]*f; };
    var slope=function(x){ return (edge(x+.01)-edge(x-.01))/.02; };
    var ss=function(a,b,x){ var t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
    var mob=function(){ return matchMedia('(max-width: 768px)').matches; };
    var els=G.map(function(g,i){ var a=document.createElement('a'); a.className='kr-g'; a.href=g.url; a.setAttribute('aria-label', g.name);
      a.style.setProperty('--bd',(3.6+(i*0.37)%1.4).toFixed(2)+'s'); a.style.setProperty('--bdl',(-(i*0.61)%3).toFixed(2)+'s'); a.style.setProperty('--br',((i%2?-1:1)*(.25+(i*.13)%.35)).toFixed(2)+'deg');
      var h='<img src="'+g.img+'" alt="" draggable="false">';
      if(g.steam) h+='<svg class="kr-steam" viewBox="0 0 100 160" aria-hidden="true" style="left:'+((g.steam[0]-g.steam[2]*1.1)*100).toFixed(2)+'%;top:'+((g.steam[1]*100)-(g.steam[2]*1.8*100/g.ar)).toFixed(2)+'%;width:'+(g.steam[2]*2.2*100).toFixed(2)+'%"><path class="w1" d="M58 150 C44 128 70 112 54 90 C40 70 60 56 46 34"/><path class="w2" d="M42 152 C30 132 50 118 36 98 C24 80 40 66 28 46" style="animation-delay:'+(1.2+(i*.29)%1.2).toFixed(2)+'s"/></svg>';
      a.innerHTML=h; host.appendChild(a);
      var c=document.createElement('a'); c.className='kc'; c.href=g.url; c.textContent=g.name; host.appendChild(c); var v=document.createElement('video'); v.className='kr-v'; v.muted=true; v.playsInline=true; v.preload='auto'; v.setAttribute('aria-hidden','true'); host.appendChild(v);
      return {g:a, c:c, v:v, i:i, vid:false, ar:+g.ar||1.1}; });
    var rot=0, from=0, target=0, t0=0, DUR=an('tableMs',1000), raf=0, W=1, th=1, Hs=1, VIS=2, A=.486;
    var layout=function(){ var m=mob(); VIS=m?1:2; A=m?.69:.486;
      var calc=function(W){ var th=W/TAR, need=0; for(var k=-VIS;k<=VIS;k++){ var x=.5-A*Math.sin(k*STEP), e=edge(x), sc=.9+(e-edge(.5))/(edge(0)-edge(.5))*.22, gw=W*(m?.27:.165)*sc;
          need=Math.max(need, th-e*th-W*(m?.035:.026)+gw*1.2); if(Math.abs(k)===VIS) need=Math.max(need, th-e*th-W*(m?.035:.026)+gw*1.3*1.343*.86); }   // room for a guest standing up at the edge seats
        return Math.ceil(need+W*.015); };
      // the section title, the table and the buttons under it fit on one screen: the height grows with the width,
      // so the table gets as wide as the leftover height allows (centred; its cut ends fade out when narrower)
      var cw=stage.parentNode.clientWidth, full=calc(cw), sec=stage.closest('.konuk'), head=sec ? sec.querySelector('.konuk-head') : null, ctr=sec ? sec.querySelector('.kr-controls') : null;
      var navH=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))||64, padT=sec ? parseFloat(getComputedStyle(sec).paddingTop)||0 : 0;
      var avail=innerHeight-navH-padT-(head?head.offsetHeight:0)-(ctr?ctr.offsetHeight+parseFloat(getComputedStyle(ctr).marginTop):0)-parseFloat(getComputedStyle(stage.parentNode).marginTop||0)-24;
      W=(!m && avail>260 && full>avail) ? Math.floor(cw*avail/full) : cw;
      stage.style.width=W+'px'; stage.style.marginLeft='auto'; stage.style.marginRight='auto'; stage.classList.toggle('is-narrow', W<cw-2);
      th=W/TAR; Hs=calc(W); stage.style.height=Hs+'px';
      cups.forEach(function(cs,i){ var t=TEAS[i], cw=t[2]*W*.95; cs.style.width=cw+'px'; cs.style.left=(t[0]*W-cw*.55)+'px'; cs.style.top=(Hs-th+t[1]*th-cw*1.6+cw*.2)+'px'; });
      place(); };
    var place=function(){ var m=mob(), top0=Hs-th, a0=(VIS+.3)*STEP, a1=(VIS+.85)*STEP, mid=((Math.round(rot)%N)+N)%N;
      els.forEach(function(o,i){ var d=((i-rot)%N+N)%N; if(d>N/2) d-=N; var ang=d*STEP, aa=Math.abs(ang);
        if(aa>Math.PI/2+.2){ o.g.style.visibility='hidden'; o.c.style.visibility='hidden'; o.v.style.opacity='0'; return; }
        var x=.5-A*Math.sin(ang), xe=Math.min(1,Math.max(0,x)), e=edge(xe), sc=.9+(e-edge(.5))/(edge(0)-edge(.5))*.22, gw=W*(m?.27:.165)*sc, gh=gw*o.ar;
        var hide=ss(a0,a1,aa), sink=W*(m?.035:.026)+hide*gh*.55, op=1-ss(a0,a1-(a1-a0)*.1,aa), y=top0+e*th;   // leaving = a soft fade while sliding a little behind the rim (no standing up)
        o.g.style.visibility=op>.01?'visible':'hidden'; o.g.style.width=gw+'px'; o.g.style.opacity=op.toFixed(3); o.g.style.zIndex=10+Math.round(Math.abs(Math.sin(ang))*20);
        o.g.style.transform='translate('+(x*W-gw/2).toFixed(1)+'px,'+(y+sink-gh).toFixed(1)+'px)';
        o.g.tabIndex=(op>.5?0:-1);
        var vw=gw*1.3, var_=(o.v.videoWidth ? o.v.videoHeight/o.v.videoWidth : 1.343), vh=vw*var_;
        o.v.style.width=vw.toFixed(1)+'px'; o.v.style.zIndex=o.g.style.zIndex; o.v.style.opacity=o.vid ? op.toFixed(3) : '0';
        o.v.style.transform='translate('+(x*W-vw/2).toFixed(1)+'px,'+(y+sink-vh).toFixed(1)+'px)';
        var cop=1-ss(a0*.8,a0*1.05,aa); o.c.style.visibility=cop>.01?'visible':'hidden'; o.c.style.opacity=cop.toFixed(3); o.c.tabIndex=-1;
        o.c.style.transform='translate('+(x*W).toFixed(1)+'px,'+(y+W*(m?.06:.045)).toFixed(1)+'px) translateX(-50%) rotate('+(Math.atan(slope(xe)*th/W)*180/Math.PI).toFixed(2)+'deg) scale('+sc.toFixed(3)+')';
        o.c.classList.toggle('is-mid', i===mid); }); };
    var ease=function(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; };
    var done=null, dur=DUR;
    var frame=function(now){ var t=Math.min(1,(now-t0)/dur); rot=from+(target-from)*ease(t); place(); if(t<1) raf=requestAnimationFrame(frame); else { raf=0; rot=target; place(); var cb=done; done=null; if(cb) cb(); } };
    var rotate=function(dir, ms, cb){ from=rot; target=Math.round(target)+dir; t0=performance.now(); dur=ms; done=cb; if(reduce){ rot=target; place(); done=null; cb(); return; } if(!raf) raf=requestAnimationFrame(frame); };
    // stand-up / sit-down clips (one generated clip per guest; sitting = the same clip reversed). Only on a click.
    var RATE=1.6;
    var ready=function(o, kind){ return new Promise(function(res){ var src=G[o.i][kind]; if(!src){ res(false); return; }
      if(o.v.dataset.k===kind && o.v.readyState>=2){ res(true); return; } o.v.dataset.k=kind; o.v.src=src;
      var ok=function(){ o.v.removeEventListener('loadeddata', ok); res(true); }; o.v.addEventListener('loadeddata', ok); setTimeout(function(){ res(o.v.readyState>=2); }, 1500); }); };
    var play=function(o){ return new Promise(function(res){ o.v.currentTime=0; o.v.playbackRate=RATE; var p=o.v.play(); if(p && p.catch) p.catch(function(){ res(); });
      var end=function(){ o.v.removeEventListener('ended', end); res(); }; o.v.addEventListener('ended', end); setTimeout(res, 3200/RATE+600); }); };
    var vid=function(o,on){ o.vid=on; o.g.classList.toggle('is-vid', on); place(); };
    var queue=[], busy=false;
    var step=function(){ if(!queue.length){ busy=false; return; } busy=true;
      var dir=queue.shift(), r=Math.round(target), L=els[((r+(dir>0?-VIS:VIS))%N+N)%N], E=els[((r+(dir>0?VIS+1:-VIS-1))%N+N)%N];
      if(queue.length || reduce){ rotate(dir, 600, function(){ reels(); step(); }); return; }   // several presses in a row: just turn
      Promise.all([ready(L,'stand'), ready(E,'sit')]).then(function(ok){
        if(ok[0]){ vid(L,true); play(L); }                           // 1. the guest on the edge stands up
        setTimeout(function(){
          if(ok[1]){ E.v.pause(); E.v.currentTime=0; vid(E,true); }   //    the arriving guest comes in standing
          rotate(dir, DUR, function(){                                                // 2. the table turns one seat
            vid(L,false); L.v.pause();
            (ok[1] ? play(E) : Promise.resolve()).then(function(){ vid(E,false); reels(); step(); });   // 3. and sits down
          }); }, ok[0] ? 850 : 0); }); };
    var turn=function(dir){ queue.push(dir); if(!busy) step(); };
    document.getElementById('krNext').addEventListener('click', function(){ turn(1); });
    document.getElementById('krPrev').addEventListener('click', function(){ turn(-1); });
    stage.tabIndex=0; stage.addEventListener('keydown', function(e){ if(e.key==='ArrowRight'){ e.preventDefault(); turn(1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); turn(-1); } });
    // reels under the table follow the guest in the middle
    var track=document.getElementById('reelTrack'), rname=document.getElementById('krReelName'), shown=-1;
    var reels=function(){ var mid=((Math.round(rot)%N)+N)%N; if(mid===shown || !track) return; var first=shown<0; shown=mid; var g=G[mid];
      var fill=function(){ rname.textContent=g.name; track.innerHTML=(g.reels||[]).map(function(r){ return '<a class="rl-card" href="'+r.url+'" target="_blank" rel="noopener"><img class="rl-cover" src="'+COV[r.c]+'" alt="" loading="lazy"><img class="rl-play" src="/demleme/04-konuklar/svg/icon-play.svg" alt=""><span class="rl-name">'+g.name+'</span><span class="rl-bar"><i style="width:'+r.p+'%"></i></span></a>'; }).join(''); track.scrollLeft=0; track.dispatchEvent(new Event('scroll')); };
      if(first){ fill(); return; } track.classList.add('is-swap'); setTimeout(function(){ fill(); track.classList.remove('is-swap'); }, 260); };
    layout(); reels(); addEventListener('resize', layout);
    // idle only while the table is on screen
    if('IntersectionObserver' in window){ new IntersectionObserver(function(es){ stage.style.setProperty('--ps', es[0].isIntersecting?'running':'paused'); [].forEach.call(stage.querySelectorAll('.kr-steam path'), function(n){ n.style.animationPlayState=es[0].isIntersecting?'running':'paused'; }); }).observe(stage); }
  })();

  // Ayın demleyenleri: the 5 photos of the month, either hanging on a washing line (#dmLine: drawn to the page width,
  // sags in the middle; hover = a breeze moves the polaroid on its peg and, less, its neighbours) or lying on the
  // tray of the Demleme sehpa (#dmTray: a flat plane squashed to the tray's perspective).
  // Click / Enter on a polaroid: the page blurs behind a glass layer and the polaroid flies up big (FLIP from its place);
  // ‹ › / ← → switch photos, Esc, × or a click outside closes.
  (function(){
    var dataEl=document.getElementById('demleyenData'), line=document.getElementById('dmLine'), tray=document.getElementById('dmTray'), str=document.getElementById('dmString');
    if(!dataEl || !(line || tray)) return;
    var D=JSON.parse(dataEl.textContent), P=D.photos, pols=[], ICON={heart:'/demleme/05-demleyenler/svg/heart-outline.svg', mug:'/demleme/05-demleyenler/svg/icon-mug.svg'};
    var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    // on the tray: centre of each polaroid in tray units (tray radius = 620, 0,0 = centre; +y = towards the viewer) and its turn
    var TRAY=[[-300,-240,-10],[300,-250,8],[-380,100,-6],[380,95,9],[0,410,-3]];
    var tilt=function(i){ return tray ? (TRAY[i%TRAY.length][2]) : (P[i].tilt||0); };
    var mo=document.getElementById('dmMonth'); if(mo) mo.textContent=D.month;
    P.forEach(function(p,i){ var b=document.createElement('button'); b.type='button'; b.className='dm-pol'; b.setAttribute('aria-label', p.name+' / '+p.city+' — büyüt');
      b.innerHTML=(line ? '<img class="dm-peg" src="'+(i===Math.floor(P.length/2)?'/demleme/05-demleyenler/svg/peg-red.svg':'/demleme/05-demleyenler/svg/peg-ink.svg')+'" alt="">' : '')+'<img class="ph" src="'+p.img+'" alt="'+p.name+', '+p.city+'"><span class="dm-cap"><span>'+p.name+' / '+p.city+'</span><img src="'+(ICON[p.icon]||ICON.heart)+'" alt=""></span>';
      if(tray){ var t=TRAY[i%TRAY.length]; b.style.left=(50+t[0]/12.4)+'%'; b.style.top=(50+t[1]/12.4)+'%'; b.style.transform='translate(-50%,-50%) rotate('+t[2]+'deg)'; }
      b.addEventListener('click', function(){ open(i); }); (line||tray).appendChild(b); pols.push(b); });
    if(line){
      var sagY=function(x, W, top, sag){ var t=(x-W/2)/(W/2); return top + sag*(1-t*t); };
      var layout=function(){ var mob=matchMedia('(max-width: 768px)').matches, vw=line.clientWidth, n=P.length;
        var w=mob ? Math.min(210, vw*.62) : Math.min(260, (vw - 64) / (n + .5)), gap=mob ? 28 : (vw - n*w) / (n + 1);
        var W=mob ? Math.round(n*w + (n+1)*gap) : vw, top=34, sag=mob ? 26 : Math.min(60, vw*.04), hmax=0;
        pols.forEach(function(b,i){ var cx=gap + w/2 + i*(w+gap), y=sagY(cx, W, top, sag); b.style.width=w+'px'; b.style.left=(cx-w/2)+'px'; b.style.top=(y+14)+'px';
          b.style.transform='rotate('+(P[i].tilt||0)+'deg)'; hmax=Math.max(hmax, y + 14 + w + 64 + 12); });
        str.setAttribute('width', W); str.setAttribute('height', hmax); str.style.width=W+'px'; str.setAttribute('viewBox','0 0 '+W+' '+hmax);
        var d='', seg=24; for(var k=0;k<=seg;k++){ var x=-20 + k*(W+40)/seg, y=sagY(x, W, top, sag) + Math.sin(k*1.7)*.8; d+=(k?' L':'M')+x.toFixed(1)+' '+y.toFixed(1); }
        str.querySelector('path').setAttribute('d', d); line.style.setProperty('--dm-h', Math.ceil(hmax)+'px'); };
      layout(); addEventListener('resize', layout);
      // breeze: each polaroid is a damped pendulum on its peg. While the mouse is over one, a gusty wind pushes it and,
      // weaker and a moment later, its neighbours; when the mouse leaves they swing out and settle.
      if(!reduce){
        var th=P.map(function(){ return 0; }), om=P.map(function(){ return 0; }), hov=-1, run=false, t0=performance.now(), prev=t0, gust=1;
        var tick=function(now){ var dt=Math.min(.033,(now-prev)/1000), t=(now-t0)/1000, moving=hov>=0; prev=now;
          pols.forEach(function(b,i){ var F=0;
            if(hov>=0){ var dist=Math.abs(i-hov), k=dist===0?1:dist===1?.45:dist===2?.18:0;
              if(k){ var ph=t*1.9 - dist*.55 + i*.7; F=k*gust*(78*Math.sin(ph) + 34*Math.sin(ph*2.3+1.1) + 18*Math.sin(ph*4.1+.4)); } }
            om[i]+=(-38*th[i] - 2.6*om[i] + F)*dt; th[i]+=om[i]*dt; if(Math.abs(th[i])>.02 || Math.abs(om[i])>.05) moving=true;
            b.style.rotate=th[i].toFixed(3)+'deg'; });
          if(moving) requestAnimationFrame(tick); else run=false; };
        var wake=function(){ if(!run){ run=true; prev=performance.now(); requestAnimationFrame(tick); } };
        pols.forEach(function(b,i){ b.addEventListener('pointerenter', function(e){ if(e.pointerType==='touch') return; hov=i; gust=.85+Math.random()*.35; wake(); });
          b.addEventListener('pointerleave', function(){ if(hov===i) hov=-1; wake(); }); });
      }
    }
    // zoom view
    var lb=document.getElementById('dmLb'), card=document.getElementById('dmLbCard'), im=document.getElementById('dmLbImg'), cap=document.getElementById('dmLbCap'), ic=document.getElementById('dmLbIcon'), cur=-1, last=null;
    var fill=function(i){ cur=i; im.src=P[i].img; im.alt=P[i].name+', '+P[i].city; cap.textContent=P[i].name+' / '+P[i].city; ic.src=ICON[P[i].icon]||ICON.heart; };
    var from=function(i){ var a=pols[i].getBoundingClientRect(), b=card.getBoundingClientRect(), s=Math.min(a.width,a.height*1.2)/b.width;
      return 'translate('+(a.left+a.width/2-(b.left+b.width/2))+'px,'+(a.top+a.height/2-(b.top+b.height/2))+'px) scale('+s+') rotate('+tilt(i)+'deg)'; };
    var open=function(i){ last=document.activeElement; fill(i); lb.hidden=false; document.documentElement.style.overflow='hidden';
      requestAnimationFrame(function(){ lb.classList.add('is-open');
        if(!reduce){ card.style.transition='none'; card.style.transform=from(i); void card.offsetWidth; card.style.transition='transform 520ms cubic-bezier(.2,.9,.25,1)'; card.style.transform='rotate(-1.5deg)'; }
        document.getElementById('dmLbClose').focus({preventScroll:true}); }); };
    var close=function(){ if(lb.hidden) return; var i=cur; lb.classList.remove('is-open'); document.documentElement.style.overflow='';
      if(!reduce) card.style.transform=from(i);
      setTimeout(function(){ lb.hidden=true; card.style.transition='none'; card.style.transform=''; }, reduce ? 0 : 300); if(last && last.focus) last.focus({preventScroll:true}); };
    var step=function(d){ var i=(cur+d+P.length)%P.length; card.style.transition='none'; card.style.transform='translateX('+(d*40)+'px) rotate('+(-1.5+d)+'deg)'; card.style.opacity=.2; fill(i);
      void card.offsetWidth; card.style.transition='transform 360ms cubic-bezier(.2,.9,.25,1), opacity 260ms ease'; card.style.transform='rotate(-1.5deg)'; card.style.opacity=1; };
    document.getElementById('dmLbClose').addEventListener('click', close);
    document.getElementById('dmLbPrev').addEventListener('click', function(e){ e.stopPropagation(); step(-1); });
    document.getElementById('dmLbNext').addEventListener('click', function(e){ e.stopPropagation(); step(1); });
    lb.addEventListener('click', function(e){ if(e.target===lb || e.target.classList.contains('dm-lb-inner')) close(); });
    document.addEventListener('keydown', function(e){ if(lb.hidden) return; if(e.key==='Escape') close(); else if(e.key==='ArrowRight') step(1); else if(e.key==='ArrowLeft') step(-1); });
  })();

  // Stats: count up once when the strip enters the viewport
  var stats = document.getElementById('stats');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function(n, d){ return d ? n.toFixed(d).replace('.', ',') : Math.round(n).toLocaleString('tr-TR'); };   // 3,3M with the Turkish decimal comma
  var counters = stats ? [].slice.call(stats.querySelectorAll('[data-count]')) : [];
  var runStats = function(){
    stats.classList.add('is-in');
    counters.forEach(function(el, i){
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '', dec = +el.getAttribute('data-decimals') || 0;
      if(reduce){ el.textContent = fmt(target, dec) + suffix; return; }
      var delay = i * an('countStagger',110), dur = an('countMs',1400), start = null;
      var ease = function(t){ return 1 - Math.pow(1 - t, 3); };
      var step = function(ts){
        if(start === null) start = ts;
        var t = Math.min(1, (ts - start - delay) / dur);
        if(t < 0){ requestAnimationFrame(step); return; }
        el.textContent = fmt(target * ease(t), dec) + suffix;
        if(t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting){ io.disconnect(); runStats(); }
    }, { threshold:.4 });
    if(stats) io.observe(stats);
  } else if(stats){ runStats(); }

  // Steeping. The page goes white → cream-light on a real steeping curve (tau 40s),
  // with a small gain on every dip (3.5s, the same rhythm as the bag in the mark).
  // Start time is kept per session so a reload keeps steeping.
  (function(){
    var root = document.documentElement;
    var WHITE = [248,244,234], LIGHT = [243,238,225];   // cream-light → cream
    var TAU = 40000, DIP = 3500, PULSE = .06;
    var start;
    try{ start = +sessionStorage.getItem('demleme-steep') || 0; }catch(e){ start = 0; }
    if(!start){ start = Date.now(); try{ sessionStorage.setItem('demleme-steep', start); }catch(e){} }
    var elapsed = function(){ return Date.now() - start; };
    var mix = function(a,b,t){ return a.map(function(v,i){ return Math.round(v + (b[i]-v)*t); }); };
    var paint = function(k){
      var c = mix(WHITE, LIGHT, k);
      root.style.setProperty('--bg', 'rgb(' + c.join(',') + ')');
    };
    if(reduce){ paint(1); return; }
    var last = 0;
    var tick = function(now){
      if(now - last > 90){
        last = now;
        var t = elapsed();
        var base = 1 - Math.exp(-t / TAU);
        var phase = (t % DIP) / DIP;
        var dip = Math.pow(Math.sin(Math.PI * phase), 2);
        var k = Math.min(1, base + PULSE * dip * (1 - base));
        paint(k);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  // Tea time is always 17:00. Local time + countdown in the marquee, refreshed every 15s.
  (function(){
    var els = [].slice.call(document.querySelectorAll('.tea-timer'));
    if(!els.length) return;
    var pad = function(n){ return (n < 10 ? '0' : '') + n; };
    var text = function(){
      var now = new Date();
      var h = now.getHours(), m = now.getMinutes();
      var clock = 'Saat ' + pad(h) + ':' + pad(m);
      if(h === 17) return clock + ' · Çay saati — afiyet olsun';
      var target = new Date(now); target.setHours(17, 0, 0, 0);
      if(h > 17) target.setDate(target.getDate() + 1);
      var mins = Math.ceil((target - now) / 60000);
      var hh = Math.floor(mins / 60), mm = mins % 60;
      var left = hh === 0 ? mm + ' dakika' : mm === 0 ? hh + ' saat' : hh + ' saat ' + mm + ' dakika';
      return clock + ' · Çay saatine ' + left + ' var';
    };
    var update = function(){ var t = text(); els.forEach(function(e){ e.textContent = t; }); };
    update(); setInterval(update, 15000);
  })();

  // Cart: localStorage, opens from the nav drawing
  (function(){
    var KEY='demleme-cart', items=[];
    try{ items = (JSON.parse(localStorage.getItem(KEY)) || []).filter(function(x){ return x && x.slug; }); }catch(e){ items=[]; }
    var panel=document.getElementById('cartPanel'), backdrop=document.getElementById('cartBackdrop'),
        btn=document.getElementById('cartBtn'), list=document.getElementById('cartList'),
        empty=document.getElementById('cartEmpty'), foot=document.getElementById('cartFoot'),
        count=document.getElementById('cartCount'), subtotal=document.getElementById('cartSubtotal');
    var MAXQ=9;
    var price=function(p){ var m=String(p).replace(/\./g,'').match(/\d+/); return m ? +m[0] : 0; };
    var fmt=function(n){ return '₺' + n.toLocaleString('tr-TR'); };
    var save=function(){ try{ localStorage.setItem(KEY, JSON.stringify(items)); }catch(e){} };
    var render=function(){
      list.innerHTML='';
      var n=0, sum=0;
      var cards=[].slice.call(document.querySelectorAll('.add-to-cart[data-slug]'));
      var cardOf=function(slug){ return cards.filter(function(c){ return c.getAttribute('data-slug')===slug; })[0]; };
      items.forEach(function(it, i){
        n+=it.qty; sum+=price(it.price)*it.qty;
        var c=cardOf(it.slug), img=it.img||(c&&c.getAttribute('data-img'))||'';
        var pr=/₺/.test(String(it.price)) ? String(it.price) : (price(it.price) ? fmt(price(it.price)) : '');
        var li=document.createElement('li'); li.className='cart-li';
        li.innerHTML='<a class="cart-th" href="/urun/'+encodeURIComponent(it.slug)+'" tabindex="-1" aria-hidden="true"></a>'+
          '<div class="cart-info"><span class="cart-item-name"></span><span class="meta"></span>'+
          '<span class="cart-qty"><button type="button" aria-label="Azalt">–</button><span></span><button type="button" aria-label="Arttır">+</button></span></div>'+
          '<button type="button" class="cart-remove">Kaldır</button>';
        if(img){ var im=document.createElement('img'); im.src=img; im.alt=''; im.loading='lazy'; li.children[0].appendChild(im); }
        var info=li.children[1];
        info.children[0].textContent=it.name; info.children[1].textContent=pr;
        info.children[2].children[1].textContent=it.qty;
        info.children[2].children[0].onclick=function(){ if(it.qty>1){ it.qty--; } else { items.splice(i,1); } save(); render(); };
        info.children[2].children[2].onclick=function(){ if(it.qty<MAXQ){ it.qty++; save(); render(); } };
        li.children[2].onclick=function(){ items.splice(i,1); save(); render(); };
        list.appendChild(li);
      });
      // Sepet önerileri: sepette olmayan, stokta ve seçim gerektirmeyen ürünler
      var recs=document.getElementById('cartRecs');
      if(!recs){ recs=document.createElement('div'); recs.id='cartRecs'; list.parentNode.insertBefore(recs, foot); }
      var inCart={}; items.forEach(function(x){ inCart[x.slug]=1; });
      var seen={}, pick=cards.filter(function(c){ var sl=c.getAttribute('data-slug'); if(inCart[sl]||seen[sl]) return false; seen[sl]=1; return true; }).slice(0,3);
      recs.hidden=!items.length||!pick.length;
      recs.innerHTML=pick.length?'<p class="cart-recs-t">Sepetine yakışır</p><div class="cart-recs-g"></div>':'';
      pick.forEach(function(c){
        var a=document.createElement('div'); a.className='cart-rec';
        var sl=c.getAttribute('data-slug'), choose=c.hasAttribute('data-choose');
        a.innerHTML='<a class="cart-rec-i" href="/urun/'+encodeURIComponent(sl)+'"><img alt="" loading="lazy"></a><span class="cart-rec-n"></span><span class="cart-rec-p"></span><button type="button" class="cart-rec-b"></button>';
        a.querySelector('img').src=c.getAttribute('data-img')||'';
        a.querySelector('.cart-rec-n').textContent=c.getAttribute('data-name')||'';
        a.querySelector('.cart-rec-p').textContent=c.getAttribute('data-price')||'';
        var bt=a.querySelector('button'); bt.textContent=choose?'Seç':'Ekle';
        bt.onclick=function(){ c.click(); };
        recs.lastChild.appendChild(a);
      });
      count.textContent=n; count.hidden=!n; empty.hidden=!!n; foot.hidden=!n; subtotal.textContent=fmt(sum);
    };
    var open=function(o){
      panel.classList.toggle('is-open', o); panel.setAttribute('aria-hidden', o?'false':'true');
      btn.setAttribute('aria-expanded', o?'true':'false'); backdrop.hidden=!o;
      document.body.style.overflow = o ? 'hidden' : '';
    };
    btn.addEventListener('click', function(){ open(!panel.classList.contains('is-open')); });
    document.getElementById('cartClose').addEventListener('click', function(){ open(false); });
    backdrop.addEventListener('click', function(){ open(false); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') open(false); });
    [].forEach.call(document.querySelectorAll('[data-cart-close]'), function(a){ a.addEventListener('click', function(){ open(false); }); });
    [].forEach.call(document.querySelectorAll('.add-to-cart'), function(b){
      b.addEventListener('click', function(){
        var slug=b.getAttribute('data-slug');
        if(!slug) return;
        // Renk / beden seçilmesi gereken ürünler ve yakında gelenler ürün sayfasına gider
        if(b.hasAttribute('data-choose')){ location.href='/urun/'+slug; return; }
        var color=b.getAttribute('data-color')||'', name=b.getAttribute('data-name'), pr=b.getAttribute('data-price');
        var hit=items.filter(function(x){ return x.slug===slug && x.color===color && !x.size; })[0];
        if(hit){ hit.qty=Math.min(MAXQ, hit.qty+1); }
        else { items.push({slug:slug, color:color, size:'', name:name, price:pr, qty:1, img:b.getAttribute('data-img')||''}); }
        save(); render(); open(true);
        if(window.dmTrack) dmTrack('add_to_cart');
      });
    });
    render();
    if(/[?&]sepet=1/.test(location.search)) open(true);
  })();

  // Newsletter (no backend yet)
  var form = document.getElementById('newsletterForm');
  var note = document.getElementById('newsletterNote');
  if(form) form.addEventListener('submit', function(e){
    e.preventDefault();
    note.textContent = 'Teşekkürler, sofradasın.';
    form.reset();
  });
})();
