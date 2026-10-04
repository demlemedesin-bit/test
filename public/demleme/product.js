(function(){
  var P=JSON.parse(document.getElementById('productData').textContent), $=function(id){ return document.getElementById(id); };
  var cur=null, col=0, size=-1, q=1, KEY='demleme-cart', items=[];
  try{ items=(JSON.parse(localStorage.getItem(KEY))||[]).filter(function(x){ return x && x.slug; }); }catch(e){ items=[]; }
  var saveCart=function(){ try{ localStorage.setItem(KEY, JSON.stringify(items)); }catch(e){} };
  var countCart=function(){ var n=0; items.forEach(function(it){ n+=it.qty; }); var cc=$('cartCount'); cc.textContent=n; cc.classList.toggle('on', n>0); };
  var esc=function(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var glyph=function(el){ /* Strenuous Turkish letters, same as the homepage */ // Turkish glyphs for Strenuous (see CSS): wrap Ş ş Ğ ğ İ ı and every lowercase i in display text
  (function(){
    var SEL='h1, h2, .pn-logo span';   // only the Strenuous roles need the rebuilt Turkish glyphs
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
      } else if(node.nodeType===1 && node.tagName!=='SCRIPT' && node.tagName!=='STYLE' && !node.classList.contains('tg') && !node.classList.contains('pv-h') && !node.classList.contains('pv-jump')){
        [].slice.call(node.childNodes).forEach(walk);
      }
    };
    [].forEach.call(document.querySelectorAll(SEL), walk);
  })(); };
  var render=function(){ var slug=location.pathname.replace(/\/+$/,'').split('/').pop(), p=P.filter(function(x){ return x.slug===slug; })[0]||P[0]; cur=p; col=0; size=-1; q=1;
    document.title=p.name+' · Demleme Mağaza';
    $('crumb').innerHTML='<a href="/#magaza">Mağaza</a><span>/</span>'+esc(p.cat)+'<span>/</span>'+esc(p.name);
    $('ppCat').textContent=p.cat; $('ppName').textContent=p.name; (function(){ var e=$('ppPrice'); e.textContent=''; if(p.was){ var w=document.createElement('s'); w.textContent=p.was; w.style.cssText='opacity:.5;margin-right:8px;font-weight:400'; e.appendChild(w); } if(p.was){ var nb=document.createElement('b'); nb.textContent=p.price; nb.style.cssText='color:#DD262C;font-weight:600'; e.appendChild(nb); } else { e.appendChild(document.createTextNode(p.price)); }
      var pc=$('pxPct'); if(pc) pc.remove(); if(p.was && p.salePct){ pc=document.createElement('span'); pc.id='pxPct'; pc.setAttribute('aria-label','%'+p.salePct+' indirim'); pc.innerHTML='<b>-%'+p.salePct+'</b><small>indirim</small>'; pc.style.cssText='position:absolute;top:14px;right:14px;z-index:3;width:68px;height:68px;border-radius:50%;background:#DD262C;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;box-shadow:0 6px 18px rgba(221,38,44,.35);transform:rotate(8deg);pointer-events:none'; pc.querySelector('b').style.cssText='font-size:18px;font-weight:700'; pc.querySelector('small').style.cssText='font-size:10px;letter-spacing:.04em'; var pm=$('ppImg').parentNode; if(getComputedStyle(pm).position==='static') pm.style.position='relative'; pm.appendChild(pc); } var o=$('pxSale'); if(o) o.remove(); if(p.was && p.saleEnds){ o=document.createElement('div'); o.id='pxSale'; o.className='sale-card';
        var num=function(v){ return parseFloat(String(v).replace(/[^\d,]/g,'').replace(',','.'))||0; }; var save=Math.max(0,num(p.was)-num(p.price));
        o.innerHTML='<div class="sc-top"><span class="sc-fire" aria-hidden="true">🔥</span><span class="sc-t"><b>Süreli indirim</b><small>Süre dolunca fiyat eski haline döner</small></span>'+(save>0?'<span class="sc-save">'+save.toLocaleString("tr-TR")+' ₺<small>kazanç</small></span>':'')+'</div>'
          +'<div class="sc-cd" role="timer" aria-label="Kampanya bitimine kalan süre"><div><b data-u="d">00</b><small>gün</small></div><i>:</i><div><b data-u="h">00</b><small>saat</small></div><i>:</i><div><b data-u="m">00</b><small>dk</small></div><i>:</i><div><b data-u="s">00</b><small>sn</small></div></div>'
          +'<div class="sc-bar" aria-hidden="true"><span></span></div>';
        e.parentNode.insertBefore(o,e.nextSibling); var end=new Date(p.saleEnds).getTime(); var span=Math.max(end-Date.now(),1); var total=Math.max(span,7*864e5);
        var q=function(u){ return o.querySelector('[data-u="'+u+'"]'); }; var z=function(n){ return (n<10?'0':'')+n; }; var prev={};
        var set=function(u,v){ var el=q(u); if(!el||prev[u]===v) return; prev[u]=v; el.textContent=v; if(u==='s'){ el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); } };
        var tick=function(){ var ms=end-Date.now(); if(ms<=0){ o.className='sale-card ended'; o.innerHTML='<div class="sc-top"><span class="sc-fire">⏱</span><span class="sc-t"><b>Kampanya sona erdi</b></span></div>'; clearInterval(window.__pxSaleT); return; }
          var sec=Math.floor(ms/1e3); set('d',z(Math.floor(sec/86400))); set('h',z(Math.floor(sec%86400/3600))); set('m',z(Math.floor(sec%3600/60))); set('s',z(sec%60));
          o.querySelector('.sc-bar span').style.width=Math.max(4,Math.min(100,ms/total*100))+'%'; o.classList.toggle('urgent', ms<864e5); };
        tick(); if(window.__pxSaleT) clearInterval(window.__pxSaleT); window.__pxSaleT=setInterval(tick,1000); } })();  $('ppDesc').textContent=p.desc; (function(){ var e=$('pxEp'); if(e) e.remove(); if(p.episode){ e=document.createElement('a'); e.id='pxEp'; e.href=p.episode.url; e.target='_blank'; e.rel='noopener'; e.textContent='🎧 Podcastte konuşuldu: '+p.episode.title; e.style.cssText='display:inline-block;margin:6px 0 2px;padding:8px 14px;border:1px solid currentColor;border-radius:99px;font-size:13px;text-decoration:none;color:inherit'; $('ppDesc').parentNode.insertBefore(e,$('ppDesc').nextSibling); } })(); $('ppBadge').textContent=p.badge||''; (function(){ var jb=document.getElementById('pxVidBtn'); if(jb) jb.remove(); var box=document.getElementById('pxVideo'); if(!box) return; var v=p.video; if(!v){ box.hidden=true; box.innerHTML=''; return; }   var jump=document.createElement('button'); jump.type='button'; jump.id='pxVidBtn'; jump.className='pv-jump'; jump.innerHTML='Arka planını gör <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'; jump.addEventListener('click', function(){ box.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth', block:'center'}); }); $('ppDesc').parentNode.insertBefore(jump,$('ppDesc').nextSibling);
  box.hidden=false; box.innerHTML='<h2 class="pv-h">Ürünü videoda gör</h2><div class="pv-frame"></div>'; var f=box.querySelector('.pv-frame');   if(v.src){ f.innerHTML='<video controls playsinline preload="metadata"></video>'; f.firstChild.src=v.src; return; }   f.innerHTML='<button type="button" class="pv-play" aria-label="Videoyu oynat"><img alt="" loading="lazy" src="https://i.ytimg.com/vi/'+v.yt+'/hqdefault.jpg"><span class="pv-btn"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span></button>';   f.firstChild.addEventListener('click', function(){ f.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+v.yt+'?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="Ürün videosu" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'; }); })();
    // colours: swatches + one thumbnail per colour (the photo swaps)
    var c=p.colors;
    if(!(p.showColors!=null ? p.showColors : c.length>1)){ $('ppColors').innerHTML='<span id="colName" hidden></span>'; } else
    $('ppColors').innerHTML='<div class="pp-opt-h"><b>Renk</b><span id="colName"></span></div>'+(c.length>1 ? '<div class="sw">'+c.map(function(x,i){ return '<button type="button" data-i="'+i+'" style="background:'+x.hex+'" aria-label="'+esc(x.name)+'"></button>'; }).join('')+'</div>' : '');
    $('ppThumbs').innerHTML=c.length>1 ? c.map(function(x,i){ return '<button type="button" data-i="'+i+'" aria-label="'+esc(x.name)+'"><img src="'+x.img+'" alt="">'+(x.imgs&&x.imgs.length ? '<em class="th-n" title="Bu renkte '+x.imgs.length+' ek görsel var">+'+x.imgs.length+'</em>' : '')+'</button>'; }).join('') : '';
    $('ppThumbs').innerHTML+='<span id="ppXtra" class="th-x"></span>';
    xtra();
    [].forEach.call(document.querySelectorAll('#ppColors .sw button, #ppThumbs button[data-i]'), function(b){ b.addEventListener('click', function(){ setCol(+b.getAttribute('data-i')); }); });
    // sizes: either real sizes to pick (t-shirt) or links to the sibling product (jar / tray sizes) or a single fixed size
    var s=p.sizes, h='';
    if(s){ h='<div class="pp-opt-h"><b>'+s.label+'</b>'+(p.chart ? '<button type="button" class="pp-chart-btn" id="chartBtn">Beden tablosu</button>' : '')+'</div><div class="sz">'+s.items.map(function(it,i){
        if(it[1]) return '<a href="/urun/'+it[1]+'" class="'+(it[1]===p.slug?'on':'')+'">'+esc(it[0])+'</a>';
        return s.pick ? '<button type="button" data-i="'+i+'">'+esc(it[0])+'</button>' : '<a class="on" aria-current="true">'+esc(it[0])+'</a>'; }).join('')+'</div>';
      if(p.chart) h+='<div id="chart" hidden><table class="chart"><tr>'+p.chart.head.map(function(x){ return '<th>'+x+'</th>'; }).join('')+'</tr>'+p.chart.rows.map(function(r){ return '<tr>'+r.map(function(x){ return '<td>'+x+'</td>'; }).join('')+'</tr>'; }).join('')+'</table><p class="chart-note">'+esc(p.chart.note)+'</p></div>'; }
    $('ppSizes').innerHTML=h; $('ppSizes').hidden=!s;
    [].forEach.call(document.querySelectorAll('#ppSizes button[data-i]'), function(b){ b.addEventListener('click', function(){ size=+b.getAttribute('data-i'); [].forEach.call(document.querySelectorAll('#ppSizes button[data-i]'), function(x){ x.classList.toggle('on', x===b); }); $('ppMsg').textContent=''; $('ppMsg').classList.remove('warn'); }); });
    if($('chartBtn')) $('chartBtn').addEventListener('click', function(){ var t=$('chart'); t.hidden=!t.hidden; });
    $('ppDet').innerHTML=p.details.map(function(d,i){ return '<details'+(i===0?' open':'')+'><summary>'+esc(d[0])+'</summary><p>'+esc(d[1])+'</p></details>'; }).join('');
    $('qN').textContent=q; $('ppAdd').disabled=!!(p.soon||p.out); $('ppMsg').textContent=p.soon ? 'Çok yakında. Stoklara girince haber vereceğiz.' : p.out ? 'Şu an stokta yok.' : p.left ? 'Son '+p.left+' ürün kaldı!' : ''; $('ppMsg').classList.remove('warn');
    /* "Bunu da beğenebilirsin" kartları artık sunucuda çiziliyor (#more yalnızca eski sayfa kalıplarında olabilir) */
    if($('more')){ var start=P.indexOf(p), pick=[]; for(var k=1;k<=4;k++) pick.push(P[(start+k)%P.length]);
      $('more').innerHTML=pick.map(function(x){ return '<a href="/urun/'+x.slug+'"><div class="th"><img src="'+x.colors[0].img+'" alt="" loading="lazy"></div><p>'+esc(x.name)+'</p><span>'+x.price+'</span></a>'; }).join(''); }
    setCol(0, true); glyph(); scrollTo(0,0); };
  var xtra=function(){ var box=$('ppXtra'); if(!box) return; var x=(cur.colors[col]||{}), list=[]; (x.imgs||[]).forEach(function(u){ list.push(['c',u]); }); (cur.gallery||[]).forEach(function(u){ list.push(['g',u]); });
    box.innerHTML=list.map(function(it,k){ return '<button type="button" data-x="'+k+'" class="'+(it[0]==='c' ? 'th-c' : 'th-g')+'" aria-label="Görsel '+(k+1)+'"><img src="'+esc(it[1])+'" alt="" loading="lazy"></button>'; }).join('');
    [].forEach.call(box.querySelectorAll('button'), function(b){ b.addEventListener('click', function(){ var im=$('ppImg'), u=list[+b.getAttribute('data-x')][1]; [].forEach.call(document.querySelectorAll('#ppThumbs button'), function(y){ y.classList.remove('on'); }); b.classList.add('on'); im.classList.add('fade'); setTimeout(function(){ im.src=u; im.classList.remove('fade'); },180); }); }); };
  var setCol=function(i, now){ col=i; var x=cur.colors[i], im=$('ppImg'); $('colName').textContent=x.name; xtra();
    [].forEach.call(document.querySelectorAll('#ppColors .sw button, #ppThumbs button[data-i]'), function(b){ b.classList.toggle('on', +b.getAttribute('data-i')===i); });
    if(now){ im.src=x.img; im.alt=cur.name+', '+x.name; return; }
    im.classList.add('fade'); setTimeout(function(){ im.src=x.img; im.alt=cur.name+', '+x.name; im.classList.remove('fade'); }, 180); };
  $('qMinus').addEventListener('click', function(){ q=Math.max(1,q-1); $('qN').textContent=q; });
  $('qPlus').addEventListener('click', function(){ q=Math.min(9,q+1); $('qN').textContent=q; });
  $('ppAdd').addEventListener('click', function(){ var m=$('ppMsg');
    if(cur.sizes && cur.sizes.pick && size<0){ m.textContent='Önce bedenini seç.'; m.classList.add('warn'); return; }
    var nm=cur.name+' ('+cur.colors[col].name+(size>=0 ? ', '+cur.sizes.items[size][0] : '')+')', sz=size>=0 ? cur.sizes.items[size][0] : '', cl=cur.colors[col].key,
        hit=items.filter(function(x){ return x.slug===cur.slug && x.color===cl && (x.size||'')===sz; })[0];
    if(hit){ hit.qty=Math.min(9, hit.qty+q); } else { items.push({slug:cur.slug, color:cl, size:sz, name:nm, price:cur.price, qty:q, img:cur.colors[col].img}); }
    saveCart(); countCart(); m.classList.remove('warn'); if(window.dmTrack) dmTrack('add_to_cart');
    m.textContent=''; added(cur.colors[col].img, cur.name, cur.colors[col].name+(size>=0 ? ', '+cur.sizes.items[size][0] : ''), q, cur.price); });

  // Add-to-cart feedback: the product photo flies into the cart, the counter pops and a card slides in
  var toastT=0;
  var added=function(img, name, variant, qty, price){
    var reduce=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var btn=$('ppAdd'); btn.classList.remove('done'); void btn.offsetWidth; btn.classList.add('done'); setTimeout(function(){ btn.classList.remove('done'); }, 1600);
    var src=$('ppImg'), cart=document.querySelector('.pn-cart img'), cc=$('cartCount');
    if(!reduce && src && cart && src.getBoundingClientRect){
      var a=src.getBoundingClientRect(), b=cart.getBoundingClientRect(), s=Math.min(120, a.width*0.35);
      var f=document.createElement('img'); f.src=src.currentSrc||src.src; f.alt=''; f.className='fly-img';
      f.style.cssText='left:'+(a.left+a.width/2-s/2)+'px;top:'+(a.top+a.height/2-s/2)+'px;width:'+s+'px;height:'+s+'px';
      document.body.appendChild(f);
      var dx=b.left+b.width/2-(a.left+a.width/2), dy=b.top+b.height/2-(a.top+a.height/2);
      var an=f.animate([{transform:'translate(0,0) scale(1) rotate(0)',opacity:1},{transform:'translate('+dx*0.6+'px,'+(dy*0.6-80)+'px) scale(.7) rotate(-8deg)',opacity:1,offset:.55},{transform:'translate('+dx+'px,'+dy+'px) scale(.12) rotate(10deg)',opacity:.2}],{duration:760,easing:'cubic-bezier(.5,.05,.4,1)'});
      an.onfinish=function(){ f.remove(); bump(); };
    } else bump();
    function bump(){ var c=document.querySelector('.pn-cart'); if(!c) return; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    var old=document.querySelector('.add-toast'); if(old) old.remove(); clearTimeout(toastT);
    var n=0, total=0; items.forEach(function(it){ n+=it.qty; total+=it.qty*(parseFloat(String(it.price).replace(/[^\d,]/g,'').replace(',','.'))||0); });
    var t=document.createElement('div'); t.className='add-toast'; t.setAttribute('role','status');
    var esc=function(x){ var d=document.createElement('div'); d.textContent=x; return d.innerHTML; };
    t.innerHTML='<div class="at-row"><span class="at-img"><img src="'+esc(img)+'" alt=""><i class="at-ok"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i></span>'
      +'<span class="at-txt"><b>Sepete eklendi</b><span>'+qty+' × '+esc(name)+'</span><small>'+esc(variant)+'</small></span>'
      +'<button type="button" class="at-x" aria-label="Kapat">×</button></div>'
      +'<div class="at-sum">Sepetinde <b>'+n+' ürün</b> · '+(Math.round(total)).toLocaleString('tr-TR')+' ₺</div>'
      +'<div class="at-btns"><a class="at-go" href="/sepet">Sepeti gör</a><button type="button" class="at-more">Alışverişe devam</button></div><i class="at-bar"></i>';
    document.body.appendChild(t);
    var close=function(){ t.classList.add('out'); setTimeout(function(){ t.remove(); }, 260); };
    t.querySelector('.at-x').addEventListener('click', close); t.querySelector('.at-more').addEventListener('click', close);
    requestAnimationFrame(function(){ t.classList.add('in'); });
    toastT=setTimeout(close, 6500);
  };
  render(); countCart();
})();
