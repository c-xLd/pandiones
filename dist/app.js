'use strict';
const products={lace:{name:'Dantel Takım',price:1890,color:'Siyah',category:'lingerie',image:'assets/lace.webp',description:'Dantelin ince çizgileri, siyahın zamansız duruşuyla bir arada. Sütyen ve yüksek bel külot ikilisi.'},ivory:{name:'Fildişi Takım',price:1790,color:'Fildişi',category:'lingerie',image:'assets/hero.webp',description:'Fildişi tonları ve zarif dantel detayları. Günün en kişisel anlarına eşlik eden iki parça.'},satin:{name:'Saten Pijama',price:2490,color:'Şampanya',category:'sleep',image:'assets/satin.webp',description:'Şampanya tonunda satenin ışıkla buluşması. Kendine ayırdığın sakin anlar için bir pijama takımı.'}};
products.robe={name:'Saten Sabahlık',price:2790,color:'Kahve',category:'sleep',image:'assets/campaign-chocolate.webp',description:'Kahverengi saten sabahlık. Koleksiyon tasarımını göstermek için hazırlanmış konsept parça.'};
const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(n);
let selected=null,bag=[],toastTimer;const $=s=>document.querySelector(s);
function showProduct(id){selected=id;const p=products[id];$('#product-title').textContent=p.name;$('#product-price').textContent=money(p.price);$('#product-description').textContent=p.description;$('#product-color').textContent='Renk: '+p.color;$('#product-image').src=p.image;$('#product-image').alt=p.name;$('#add-form').reset();$('#product-dialog').showModal()}
document.querySelectorAll('[data-product]').forEach(b=>b.addEventListener('click',()=>showProduct(b.dataset.product)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
function filter(value){document.querySelectorAll('[data-category]').forEach(p=>p.hidden=value!=='all'&&p.dataset.category!==value);document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>filter(b.dataset.filter)));document.querySelectorAll('[data-footer-filter]').forEach(b=>b.addEventListener('click',()=>filter(b.dataset.footerFilter)));
$('#add-form').addEventListener('submit',e=>{e.preventDefault();const size=new FormData(e.target).get('size');if(!size)return;const found=bag.find(i=>i.id===selected&&i.size===size);if(found)found.qty++;else bag.push({id:selected,size,qty:1});renderBag();$('#product-dialog').close();$('#toast').textContent=products[selected].name+' çantana eklendi.';$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500)});
function renderBag(){const count=bag.reduce((s,i)=>s+i.qty,0);$('#bag-count').textContent=count;$('#bag-open').setAttribute('aria-label','Çantanı aç, '+count+' ürün');$('#bag-items').innerHTML=bag.length?bag.map((i,n)=>{const p=products[i.id];return `<article class="bag-item"><img src="${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>${p.color} · Beden ${i.size}</p><p>${money(p.price*i.qty)}</p><div class="quantity"><button data-qty="${n}" data-delta="-1" aria-label="${p.name} adedini azalt">−</button><span>${i.qty}</span><button data-qty="${n}" data-delta="1" aria-label="${p.name} adedini artır">+</button><button data-remove="${n}">Kaldır</button></div></div></article>`}).join(''):'<p class="bag-empty">Çantan henüz boş.<br>Sana eşlik edecek parçaları keşfet.</p>';$('#bag-total').innerHTML=bag.length?'<span>Toplam</span><span>'+money(bag.reduce((s,i)=>s+products[i.id].price*i.qty,0))+'</span>':''}
$('#bag-items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.remove!==undefined)bag.splice(Number(b.dataset.remove),1);else if(b.dataset.qty!==undefined){const n=Number(b.dataset.qty);bag[n].qty+=Number(b.dataset.delta);if(bag[n].qty===0)bag.splice(n,1)}renderBag()});$('#bag-open').addEventListener('click',()=>{renderBag();$('#bag-dialog').showModal()});
function normalizeSearch(value){return value.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i')}
function findProducts(query){const terms=normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);return Object.entries(products).filter(([id,p])=>{const text=normalizeSearch(p.name+' '+p.color+' '+(p.category==='lingerie'?'iç giyim takım':'ev giyim pijama'));return terms.every(term=>text.includes(term))})}
function search(){const q=$('#search-input').value.trim();const results=findProducts(q);$('#search-clear').hidden=!q;$('#search-summary').textContent=q?results.length+' parça bulundu':'Senin için seçtik';$('.result-heading>span').hidden=results.length===0;$('#search-results').innerHTML=results.length?results.map(([id,p])=>`<button class="search-product" data-search-product="${id}"><div class="search-product-image"><img src="${p.image}" alt="" width="768" height="1024"><span aria-hidden="true">↗</span></div><div class="search-product-info"><span><strong>${p.name}</strong><small>${p.color}</small></span><span>${money(p.price)}</span></div></button>`).join(''):'<div class="search-empty"><h3>Bu parça henüz burada değil.</h3><p>Daha kısa bir kelimeyle tekrar dene veya koleksiyonun tamamını keşfet.</p><button data-reset-search>Tüm parçaları göster ↗</button></div>'}
$('#search-clear').addEventListener('click',()=>{$('#search-input').value='';search();$('#search-input').focus()});
document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{$('#search-input').value=b.dataset.query;search()}));
$('#search-results').addEventListener('click',e=>{if(e.target.closest('[data-reset-search]')){$('#search-input').value='';search();$('#search-input').focus()}});

$('#search-open').addEventListener('click',()=>{$('#search-input').value='';search();$('#search-dialog').showModal();$('#search-input').focus()});$('#search-input').addEventListener('input',search);$('#search-results').addEventListener('click',e=>{const b=e.target.closest('[data-search-product]');if(b){$('#search-dialog').close();showProduct(b.dataset.searchProduct)}});
$('#menu-open').addEventListener('click',()=>$('#menu-dialog').showModal());
document.querySelectorAll('[data-shop]').forEach(a=>a.addEventListener('click',()=>{filter(a.dataset.shop);if($('#menu-dialog').open)$('#menu-dialog').close()}));
$('[data-menu-story]').addEventListener('click',()=>$('#menu-dialog').close());
const siteHeader=$('#site-header');
function headerScrollState(previous,y,locked){
 const delta=y-previous.y,direction=Math.sign(delta);
 const travel=direction===previous.direction?previous.travel+Math.abs(delta):Math.abs(delta);
 let hidden=previous.hidden;
 if(y<=96||locked)hidden=false;
 else if(travel>=12&&direction!==0)hidden=direction>0;
 return {y,direction:direction||previous.direction,travel,hidden};
}
let headerState={y:Math.max(0,window.scrollY),direction:0,travel:0,hidden:false},headerFrame=0;
function updateHeader(){
 headerFrame=0;
 const y=Math.max(0,Math.min(window.scrollY,Math.max(0,document.documentElement.scrollHeight-window.innerHeight)));
 const keyboardFocus=siteHeader.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');
 headerState=headerScrollState(headerState,y,Boolean(document.querySelector('dialog[open]'))||keyboardFocus);
 siteHeader.classList.toggle('scrolled',y>40);
 siteHeader.classList.toggle('header-hidden',headerState.hidden);
}
window.addEventListener('scroll',()=>{if(!headerFrame)headerFrame=requestAnimationFrame(updateHeader)},{passive:true});
window.addEventListener('pageshow',()=>{headerState={y:Math.max(0,window.scrollY),direction:0,travel:0,hidden:false};updateHeader()});
siteHeader.addEventListener('focusin',()=>{headerState.hidden=false;siteHeader.classList.remove('header-hidden')});
updateHeader();

for(const [triggerId,dialogId] of [['menu-open','menu-dialog'],['search-open','search-dialog'],['bag-open','bag-dialog']]){const trigger=document.getElementById(triggerId),panel=document.getElementById(dialogId);trigger.addEventListener('click',()=>trigger.setAttribute('aria-expanded',String(panel.open)));panel.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));}

// Editorial guide tiles share native dialog focus and close behavior.
document.querySelectorAll('[data-guide]').forEach(button=>{
 button.addEventListener('click',()=>document.getElementById(button.dataset.guide+'-guide').showModal());
});

const collectionCanvas=document.querySelector('.collection-canvas');
if(collectionCanvas){
 const category=new URLSearchParams(location.search).get('category');
 if(['all','lingerie','sleep'].includes(category))filter(category);
 document.querySelectorAll('[data-columns]').forEach(button=>{if(button.tagName!=='BUTTON')return;button.addEventListener('click',()=>{collectionCanvas.dataset.columns=button.dataset.columns;document.querySelectorAll('button[data-columns]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});});
}
// Keep the concept shopping bag available while navigating between pages.
try{const saved=JSON.parse(sessionStorage.getItem('pandiones-bag')||'[]');if(Array.isArray(saved))bag=saved.filter(i=>products[i.id]&&['S','M','L','XL'].includes(i.size)&&Number.isInteger(i.qty)&&i.qty>0);renderBag();}catch{}
window.addEventListener('pagehide',()=>{try{sessionStorage.setItem('pandiones-bag',JSON.stringify(bag));}catch{}});

// Compact collection cards expose both product gallery views with arrows and swipe.
document.querySelectorAll('.collection-piece-gallery').forEach(gallery=>{
 gallery.dataset.slide='0';
 const controls=document.createElement('div');
 controls.className='collection-gallery-controls';
 controls.setAttribute('aria-label','Ürün görselleri');
 controls.innerHTML='<button type="button" data-gallery-prev aria-label="Önceki görsel">←</button><span class="collection-gallery-position" aria-live="polite">1 / 2</span><button type="button" data-gallery-next aria-label="Sonraki görsel">→</button>';
 gallery.append(controls);
 const setSlide=index=>{gallery.dataset.slide=String(index);gallery.dataset.manual='true';controls.querySelector('.collection-gallery-position').textContent=(index+1)+' / 2';};
 controls.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;event.preventDefault();event.stopPropagation();setSlide(button.hasAttribute('data-gallery-next')?1:0);});
 let touchX=0;
 gallery.addEventListener('touchstart',event=>{touchX=event.changedTouches[0].clientX},{passive:true});
 gallery.addEventListener('touchend',event=>{const delta=event.changedTouches[0].clientX-touchX;if(Math.abs(delta)<35)return;event.preventDefault();event.stopPropagation();setSlide(delta<0?1:0);},{passive:false});
});
