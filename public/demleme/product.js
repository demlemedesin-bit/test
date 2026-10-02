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
      } else if(node.nodeType===1 && node.tagName!=='SCRIPT' && node.tagName!=='STYLE' && !node.classList.contains('tg')){
        [].slice.call(node.childNodes).forEach(walk);
      }
    };
    [].forEach.call(document.querySelectorAll(SEL), walk);
  })(); };
  var render=function(){ var slug=location.pathname.replace(/\/+$/,'').split('/').pop(), p=P.filter(function(x){ return x.slug===slug; })[0]||P[0]; cur=p; col=0; size=-1; q=1;
    document.title=p.name+' · Demleme Mağaza';
    $('crumb').innerHTML='<a href="/#magaza">Mağaza</a><span>/</span>'+esc(p.cat)+'<span>/</span>'+esc(p.name);
    $('ppCat').textContent=p.cat; $('ppName').textContent=p.name; $('ppPrice').textContent=p.price; $('ppDesc').textContent=p.desc; $('ppBadge').textContent=p.badge||'';
    // colours: swatches + one thumbnail per colour (the photo swaps)
    var c=p.colors;
    $('ppColors').innerHTML='<div class="pp-opt-h"><b>Renk</b><span id="colName"></span></div>'+(c.length>1 ? '<div class="sw">'+c.map(function(x,i){ return '<button type="button" data-i="'+i+'" style="background:'+x.hex+'" aria-label="'+esc(x.name)+'"></button>'; }).join('')+'</div>' : '');
    $('ppThumbs').innerHTML=c.length>1 ? c.map(function(x,i){ return '<button type="button" data-i="'+i+'" aria-label="'+esc(x.name)+'"><img src="'+x.img+'" alt=""></button>'; }).join('') : '';
    [].forEach.call(document.querySelectorAll('#ppColors .sw button, #ppThumbs button'), function(b){ b.addEventListener('click', function(){ setCol(+b.getAttribute('data-i')); }); });
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
    $('qN').textContent=q; $('ppAdd').disabled=!!(p.soon||p.out); $('ppMsg').textContent=p.soon ? 'Çok yakında. Stoklara girince haber vereceğiz.' : p.out ? 'Şu an stokta yok.' : ''; $('ppMsg').classList.remove('warn');
    var others=P.filter(function(x){ return x.slug!==p.slug; }), start=P.indexOf(p); var pick=[]; for(var k=1;k<=4;k++) pick.push(P[(start+k)%P.length]);
    $('more').innerHTML=pick.map(function(x){ return '<a href="/urun/'+x.slug+'"><div class="th"><img src="'+x.colors[0].img+'" alt="" loading="lazy"></div><p>'+esc(x.name)+'</p><span>'+x.price+'</span></a>'; }).join('');
    setCol(0, true); glyph(); scrollTo(0,0); };
  var setCol=function(i, now){ col=i; var x=cur.colors[i], im=$('ppImg'); $('colName').textContent=x.name;
    [].forEach.call(document.querySelectorAll('#ppColors .sw button, #ppThumbs button'), function(b){ b.classList.toggle('on', +b.getAttribute('data-i')===i); });
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
    m.textContent=q+' × '+cur.name+' ('+cur.colors[col].name+(size>=0 ? ', '+cur.sizes.items[size][0] : '')+') sepete eklendi.'; });
  render(); countCart();
})();
