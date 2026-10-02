// Demleme ziyaret / kaynak takibi: UTM + kısa link (/t/kod) atfı, sepete ekleme ve sipariş olayları.
(function(){
  if(/^\/admin/.test(location.pathname)) return;
  var ls=function(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } };
  var q=new URLSearchParams(location.search);
  var sid=q.get('dmsid') || ls('dm-sid');
  if(!sid){ sid=Math.random().toString(36).slice(2,12)+Date.now().toString(36); }
  ls('dm-sid',sid);
  var a=null;
  if(q.get('utm_source')||q.get('utm_campaign')||q.get('utm_medium')){
    a={ts:Date.now(), source:q.get('utm_source')||'', medium:q.get('utm_medium')||'', campaign:q.get('utm_campaign')||'', term:q.get('utm_term')||'', content:q.get('utm_content')||'', link_code:q.get('tl')||''};
    ls('dm-attr',JSON.stringify(a));
  } else {
    try{ a=JSON.parse(ls('dm-attr')||'null'); if(a && Date.now()-a.ts>30*864e5) a=null; }catch(e){ a=null; }
    if(!a && document.referrer){ try{ var h=new URL(document.referrer).hostname; if(h && h!==location.hostname) a={source:h.replace(/^www\./,''), medium:'referral'}; }catch(e){} }
  }
  var send=function(type, extra){
    var b={type:type, sid:sid, path:location.pathname, referrer:(document.referrer||'').slice(0,200)};
    if(a){ for(var k in a){ if(k!=='ts') b[k]=a[k]; } }
    if(extra){ for(var j in extra){ b[j]=extra[j]; } }
    var s=JSON.stringify(b);
    try{ if(navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([s],{type:'application/json'}))) return; }catch(e){}
    try{ fetch('/api/track',{method:'POST',headers:{'content-type':'application/json'},body:s,keepalive:true}).catch(function(){}); }catch(e){}
  };
  // ── Üçüncü taraf olaylar (GA4 / GTM / Google Ads / Meta / TikTok) ───────────────────────────
  // Hiçbir çağrı onaysız gitmez: window.dmAds bayraklarını çerez onayı sonrası components/Consent.tsx (AdsLoader) kurar.
  var price=function(v){ if(typeof v==='number') return isFinite(v)?v:0; var t=String(v==null?'':v).replace(/[^\d.,]/g,''); if(!t) return 0;
    if(t.indexOf(',')>-1) t=t.replace(/\./g,'').replace(',','.'); else if(!/^\d+\.\d{1,2}$/.test(t)) t=t.replace(/\./g,'');
    var n=parseFloat(t); return isFinite(n)?n:0; };
  var pending=[];
  var dispatch=function(name, d){
    var f=window.dmAds; if(!f) return false;
    var items=d.items && d.items.length ? d.items : (d.item_id||d.item_name ? [{item_id:d.item_id||'', item_name:d.item_name||'', price:d.price||0, quantity:d.quantity||1}] : []);
    var value=d.value!=null ? +d.value : items.reduce(function(t,i){ return t+(+i.price||0)*(+i.quantity||1); },0);
    var cur=d.currency||'TRY';
    try{
      if(window.gtag && (f.ga4||f.ads)){
        var gp={currency:cur, value:value}; if(items.length) gp.items=items; if(d.transaction_id) gp.transaction_id=d.transaction_id;
        gtag('event',name,gp);
        if(name==='purchase' && f.ads && f.adsLabel) gtag('event','conversion',{send_to:f.adsId+'/'+f.adsLabel, value:value, currency:cur, transaction_id:d.transaction_id||''});
      }
    }catch(e){}
    try{
      if(f.gtm){ window.dataLayer=window.dataLayer||[]; dataLayer.push({ecommerce:null});
        var ec={currency:cur, value:value, items:items}; if(d.transaction_id) ec.transaction_id=d.transaction_id;
        dataLayer.push({event:name, ecommerce:ec}); }
    }catch(e){}
    try{
      if(window.fbq && f.meta){
        var m={view_item:'ViewContent', add_to_cart:'AddToCart', begin_checkout:'InitiateCheckout', purchase:'Purchase'}[name];
        if(m){ var fp={currency:cur, value:value, content_type:'product', content_ids:items.map(function(i){ return i.item_id; }).filter(Boolean)};
          if(items[0] && items[0].item_name) fp.content_name=items[0].item_name; if(name==='purchase' && d.transaction_id) fp.order_id=d.transaction_id;
          if(name==='purchase' && d.transaction_id) fbq('track',m,fp,{eventID:String(d.transaction_id)}); else fbq('track',m,fp); }
      }
    }catch(e){}
    try{
      if(window.ttq && f.tiktok){
        var t={view_item:'ViewContent', add_to_cart:'AddToCart', begin_checkout:'InitiateCheckout', purchase:'CompletePayment'}[name];
        if(t) ttq.track(t,{content_type:'product', currency:cur, value:value, contents:items.map(function(i){ return {content_id:i.item_id, content_name:i.item_name, quantity:i.quantity, price:i.price}; })});
      }
    }catch(e){}
    return true;
  };
  window.addEventListener('dm-ads-loaded', function(){ var q=pending; pending=[]; q.forEach(function(x){ dispatch(x[0], x[1]); }); });
  // dmEvent('view_item'|'add_to_cart'|'begin_checkout'|'purchase', {item_id,item_name,price,quantity,items,value,currency,transaction_id})
  window.dmEvent=function(name, data){
    var d=data||{};
    try{ if(!dispatch(name, d) && pending.length<20) pending.push([name, d]); }catch(e){}
  };

  // Ürün bilgisi: ürün sayfasında DOM'dan; ana sayfada son tıklanan "sepete ekle" düğmesinden
  var last=null;
  document.addEventListener('click', function(e){ var b=e.target && e.target.closest && e.target.closest('.add-to-cart');
    if(b) last={item_id:b.getAttribute('data-slug')||'', item_name:b.getAttribute('data-name')||'', price:price(b.getAttribute('data-price')), quantity:1}; }, true);
  var pm=location.pathname.match(/^\/urun\/([^/]+)/);
  var pageItem=function(){ if(!pm) return null; var n=document.getElementById('ppName'), p=document.getElementById('ppPrice');
    if(!n || !n.textContent) return null; return {item_id:decodeURIComponent(pm[1]), item_name:n.textContent.trim(), price:p ? price(p.textContent) : 0, quantity:1}; };
  var viewed=false;
  var viewItem=function(d){ if(viewed) return; viewed=true; window.dmEvent('view_item', d||pageItem()||{}); };

  // Öneri kaynağı: [data-rec] kartına tıklanınca saklanır; ürün sayfasında rec_click, sepete eklemede rec etiketi gider
  var rec=null; try{ rec=JSON.parse(sessionStorage.getItem('dm-rec')||'null'); if(rec && Date.now()-rec.ts>30*6e4) rec=null; }catch(e){ rec=null; }
  document.addEventListener('click', function(e){ var c=e.target && e.target.closest && e.target.closest('[data-rec]'); if(!c) return;
    var m=(c.getAttribute('href')||'').match(/\/urun\/([^/?#]+)/); if(!m) return;
    try{ sessionStorage.setItem('dm-rec', JSON.stringify({slug:decodeURIComponent(m[1]), rec:c.getAttribute('data-rec'), ts:Date.now()})); }catch(x){} }, true);
  window.dmTrack=function(type, extra){
    var d0=extra||{}, prod=d0.product||d0.item_id||'';
    if(!prod && type==='add_to_cart'){ var i0=pageItem()||last; prod=(i0&&i0.item_id)||''; }
    if(!prod && pm) prod=decodeURIComponent(pm[1]);
    var ex={}; for(var kk in d0) ex[kk]=d0[kk];
    if(type==='order'){ ex.url=location.href; }
    if(prod && type!=='order') ex.product=prod;
    if(type==='order' && rec) ex.rec=rec.rec;
    if(rec && prod && rec.slug===prod && (type==='add_to_cart'||type==='view')) ex.rec=rec.rec;
    send(type, ex);
    try{
      var d=extra||{};
      if(type==='view'){ viewItem(d.item_id ? d : null); }
      else if(type==='add_to_cart'){ var it=d.item_id ? d : (pageItem() || last || {}); last=null; window.dmEvent('add_to_cart', it); }
      else if(type==='order'){ window.dmEvent('purchase', {transaction_id:d.order_no, value:+d.value||0, currency:'TRY'}); }
    }catch(e){}
  };
  // Ürün sayfası açılışı: ürün adı/fiyatı betik tarafından çizilince view_item
  if(pm){ var tries=0, iv=setInterval(function(){ var it=pageItem(); if(it || ++tries>25){ clearInterval(iv); if(it) viewItem(it); } }, 200); }
  // Ödeme sayfası açılışı: begin_checkout (sepetten)
  if(/^\/odeme\/?$/.test(location.pathname)){
    var cart=[]; try{ cart=JSON.parse(ls('demleme-cart')||'[]'); }catch(e){ cart=[]; }
    if(cart && cart.length) window.dmEvent('begin_checkout', {items:cart.map(function(x){ return {item_id:x.slug||'', item_name:x.name||'', price:price(x.price), quantity:+x.qty||1}; })});
  }
  if(/^\/odeme\/?$/.test(location.pathname)) send('begin_checkout');
  send('view');
  if(pm && rec && rec.slug===decodeURIComponent(pm[1])) send('rec_click',{product:rec.slug, rec:rec.rec});
})();
