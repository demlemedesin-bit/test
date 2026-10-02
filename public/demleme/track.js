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
  window.dmTrack=function(type, extra){
    send(type, extra);
    try{
      if(type==='add_to_cart'){ if(window.gtag) gtag('event','add_to_cart'); if(window.fbq) fbq('track','AddToCart'); }
      if(type==='order' && extra){ var v=+extra.value||0;
        if(window.gtag) gtag('event','purchase',{transaction_id:extra.order_no, value:v, currency:'TRY'});
        if(window.fbq) fbq('track','Purchase',{value:v, currency:'TRY'}); }
    }catch(e){}
  };
  send('view');
})();
