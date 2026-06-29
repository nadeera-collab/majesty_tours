/* ============================================================
   MAJESTY TOURS interactivity
   ============================================================ */

/* ---------- CONTENT LOADER ---------- */
(function(){
  function applyContent(data){
    const c = data.contact || {};
    const p = data.platforms || {};
    const s = data.stats || {};
    const tours = data.tours || [];

    const set = (sel, val) => { const el = document.querySelector(sel); if(el && val) el.textContent = val; };
    const href = (sel, val) => { const el = document.querySelector(sel); if(el && val && val !== '#') el.href = val; };

    set('[data-c="phone_primary"]', c.phone_primary);
    set('[data-c="phone_secondary"]', c.phone_secondary);
    set('[data-c="email"]', c.email);
    set('[data-c="location"]', c.location);

    href('[data-p="google"]', p.google);
    href('[data-p="tripadvisor"]', p.tripadvisor);
    href('[data-p="airbnb"]', p.airbnb);
    href('[data-p="getyourguide"]', p.getyourguide);
    href('[data-p="viator"]', p.viator);
    href('[data-p="tourradar"]', p.tourradar);

    if(s.years)   { const el = document.querySelector('[data-count="17"]'); if(el){ el.dataset.count = s.years; el.textContent = s.years; el.nextElementSibling && (el.nextElementSibling.textContent = s.years); } }
    if(s.routes)  { const el = document.querySelector('[data-count="40"]'); if(el){ el.dataset.count = s.routes; el.textContent = s.routes; el.nextElementSibling && (el.nextElementSibling.textContent = s.routes); } }
    if(s.rating)  { const el = document.querySelector('[data-count="4.9"]'); if(el){ el.dataset.count = s.rating; el.textContent = s.rating; el.nextElementSibling && (el.nextElementSibling.textContent = s.rating); } }

    tours.forEach((t, i) => {
      const wrap = document.querySelector(`[data-tour-index="${i}"]`);
      if(!wrap) return;
      const nameEl = wrap.querySelector('.name');
      const tagsEl = wrap.querySelector('.tags');
      const priceEl = wrap.querySelector('.meta b');
      const durEl = wrap.querySelector('.meta');
      if(nameEl && t.name) nameEl.textContent = t.name;
      if(tagsEl && t.tags) tagsEl.textContent = t.tags;
      if(priceEl && t.price) priceEl.textContent = t.price;
      if(durEl && t.duration) {
        const b = durEl.querySelector('b');
        durEl.textContent = '';
        if(b) durEl.appendChild(b);
        durEl.appendChild(document.createTextNode(t.duration));
      }
    });

    tours.forEach((t, i) => {
      if(!t.images || !t.images.length) return;
      const wrap = document.querySelector('[data-tour-index="' + i + '"]');
      if(!wrap) return;
      const slides = [...wrap.querySelectorAll('.media-slide')];
      const capEl = wrap.querySelector('.badge-cap');
      t.images.forEach((img, si) => {
        if(!img.image || !slides[si]) return;
        slides[si].style.backgroundImage = "url('" + img.image + "')";
        if(img.caption) slides[si].dataset.cap = img.caption;
      });
      if(t.images[0] && t.images[0].caption && capEl) capEl.textContent = t.images[0].caption;
    });
  }

  fetch('/content.json')
    .then(r => r.ok ? r.json() : null)
    .then(d => { if(d) applyContent(d); })
    .catch(() => {});
})();

(function(){
'use strict';
const $=(s,c)=>(c||document).querySelector(s);
const $$=(s,c)=>[...(c||document).querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
let heroGoTo=null;

/* ---------- HERO LOADER ---------- */
const heroLoader=document.getElementById('heroLoader');
if(heroLoader){
  const t0=performance.now();
  function dismiss(){
    const delay=Math.max(0,800-(performance.now()-t0));
    setTimeout(()=>{
      heroLoader.classList.add('done');
      const cleanup=()=>heroLoader.remove();
      heroLoader.addEventListener('transitionend',cleanup,{once:true});
      setTimeout(cleanup,1100);
    },delay);
  }
  const probe=new Image();
  probe.onload=dismiss;
  probe.onerror=dismiss;
  probe.src='https://commons.wikimedia.org/wiki/Special:FilePath/Sigiriya%20Fortress%2C%20Sri%20Lanka.jpg?width=2400';
  setTimeout(dismiss,5000);
}

/* ---------- HERO SLIDESHOW ---------- */
(function(){
  const LABELS=['Sigiriya','Ella tea country','Yala leopards','Galle Fort','Kandy','Mirissa whales'];
  const INTERVAL=7000;
  const slides=$$('.hero-slide');
  const dots=$$('.hsd');
  const label=$('#heroSlideLabel');
  if(!slides.length)return;
  let current=0,paused=false;
  document.documentElement.style.setProperty('--slide-dur',(INTERVAL/1000)+'s');

  function restartKenBurns(el){el.style.animation='none';el.offsetHeight;el.style.animation='';}

  function goTo(i,manual){
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current=(i+LABELS.length)%LABELS.length;
    restartKenBurns(slides[current]);
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    $$('.dest-item').forEach((d,idx)=>d.classList.toggle('active',idx===current));
    if(label){label.classList.remove('visible');setTimeout(()=>{label.textContent=LABELS[current];label.classList.add('visible');},200);}
    if(manual){clearInterval(timer);startTimer();}
  }
  heroGoTo=goTo;

  dots.forEach((d,i)=>d.addEventListener('click',()=>{d.blur();goTo(i,true);}));
  const heroBg=$('#heroBg');
  if(heroBg){heroBg.addEventListener('mouseenter',()=>{paused=true;});heroBg.addEventListener('mouseleave',()=>{paused=false;});}

  if(reduce){if(label)label.classList.add('visible');return;}
  if(label)setTimeout(()=>label.classList.add('visible'),1400);

  let timer;
  function startTimer(){timer=setInterval(()=>{if(!paused)goTo(current+1,false);},INTERVAL);}
  startTimer();

  ['202312%20Nine%20Arches%20Bridge%2C%20Sri%20Lanka.jpg',
   'Sri%20Lankan%20leopard%20(Panthera%20pardus%20kotiya)%20male.jpg',
   'Galle%20Fort.jpg',
   'Temple%20of%20the%20Tooth%2C%20Kandy.jpg',
   'Unawatuna%20beach.jpg'].forEach((f,i)=>
    setTimeout(()=>{new Image().src='https://commons.wikimedia.org/wiki/Special:FilePath/'+f+'?width=2400';},2000+i*1000));
})();

/* ---------- DESTINATIONS STRIP → HERO WIRING ---------- */
$$('.dest-item')[0]?.classList.add('active');
$$('.dest-item').forEach((item,i)=>{
  function activate(){
    if(heroGoTo)heroGoTo(i,true);
    document.getElementById('top').scrollIntoView({behavior:'smooth'});
  }
  item.addEventListener('click',activate);
  item.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}
  });
});

/* ---------- HERO HEADLINE LETTER REVEAL ---------- */
const h1=$('#heroH1');
if(h1){
  const words=["The","island","that","keeps","its","promises."];
  let html='';
  words.forEach((w,wi)=>{
    html+='<span style="display:inline-block;white-space:nowrap">';
    [...w].forEach((c,ci)=>{const d=(wi*0.06+ci*0.03+0.3).toFixed(2);html+=`<span class="lt" style="animation-delay:${d}s">${c}</span>`;});
    html+='</span> ';
  });
  h1.innerHTML=html;
}
// Safety net: if the animation timeline never advances (frozen/background tab),
// force hero entrance content visible so nothing stays stuck at opacity:0.
setTimeout(()=>{
  document.querySelectorAll('#heroH1 .lt').forEach(l=>{l.style.opacity='1';l.style.transform='none';});
  document.querySelectorAll('.hero-sub,.hero-tags,.hero-meta').forEach(e=>{e.style.opacity='1';});
},2600);

/* ---------- SPLIT HEADINGS (word reveal) ---------- */
$$('[data-split]').forEach(el=>{
  const words=el.textContent.trim().split(/\s+/);
  el.innerHTML=words.map(w=>`<span class="w"><i>${w}</i></span>`).join(' ');
  el.classList.add('split');
});

/* ---------- NAV ---------- */
const nav=$('#nav');
const prog=$('#scrollProg');
function onScroll(){
  nav.classList.toggle('scrolled',scrollY>40);
  const h=document.documentElement.scrollHeight-innerHeight;
  if(prog)prog.style.transform='scaleX('+(scrollY/h)+')';
}
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* ---------- PARALLAX ---------- */
(function(){
  if(reduce)return;

  const LAYERS=[
    ['.hero-bg',    0.08],
    ['.hero-inner', 0.20],
    ['#interPar',   0.35],
  ];

  const layers=LAYERS.map(([sel,spd])=>{
    const el=document.querySelector(sel);
    return el?{el,spd}:null;
  }).filter(Boolean);

  if(!layers.length)return;

  let parTick=false;

  function updateParallax(){
    parTick=false;
    const vh=window.innerHeight;
    layers.forEach(({el,spd})=>{
      const r=el.getBoundingClientRect();
      if(r.bottom<-vh||r.top>vh*2)return;
      const centerOffset=(r.top+r.height/2)-vh/2;
      el.style.transform='translateY('+((centerOffset*spd*-1).toFixed(2))+'px)';
    });
  }

  window.addEventListener('scroll',()=>{
    if(!parTick){parTick=true;requestAnimationFrame(updateParallax);}
  },{passive:true});

  requestAnimationFrame(updateParallax);
})();

const burger=$('#burger'),links=$('#links');
burger.onclick=()=>{
  const isOpen=links.classList.toggle('open');
  burger.classList.toggle('open');
  burger.setAttribute('aria-expanded',String(isOpen));
  burger.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu');
  if(isOpen){const first=links.querySelector('a');if(first)setTimeout(()=>first.focus(),50);}
};
$$('a',links).forEach(a=>a.onclick=()=>{
  links.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded','false');
  burger.setAttribute('aria-label','Open navigation menu');
  burger.focus();
});

/* ---------- NAV KEYBOARD: ESCAPE + FOCUS TRAP ---------- */
document.addEventListener('keydown',e=>{
  if(!links.classList.contains('open'))return;
  if(e.key==='Escape'){
    links.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded','false');
    burger.setAttribute('aria-label','Open navigation menu');
    burger.focus();
  }
});
document.addEventListener('focusin',e=>{
  if(links.classList.contains('open')&&!links.contains(e.target)&&e.target!==burger){
    const first=$$('a',links)[0];if(first)first.focus();
  }
});

/* active section highlight */
const navMap={};
$$('.navlinks a[href^="#"]').forEach(a=>{const id=a.getAttribute('href').slice(1);if(id)navMap[id]=a;});
const secObserver=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(e.isIntersecting){
      $$('.navlinks a').forEach(a=>{a.classList.remove('current');a.removeAttribute('aria-current');});
      const a=navMap[e.target.id];if(a){a.classList.add('current');a.setAttribute('aria-current','true');}
    }
  });
},{rootMargin:'-45% 0px -50% 0px'});
['about','tours','map','season','gallery','fleet','contact'].forEach(id=>{const s=$('#'+id);if(s)secObserver.observe(s);});


/* ---------- REVEAL ON SCROLL ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}
}),{threshold:.16});
$$('.reveal,.split').forEach(el=>io.observe(el));

/* ---------- STAT COUNTERS ---------- */
function animateCount(el){
  const target=parseFloat(el.dataset.count);
  const dec=(el.dataset.count.indexOf('.')>-1)?1:0;
  const suffix=el.dataset.suffix||'';
  const dur=1400;const t0=performance.now();
  function step(t){
    const p=Math.min((t-t0)/dur,1);
    const eased=1-Math.pow(1-p,3);
    const val=(target*eased).toFixed(dec);
    el.textContent=val+suffix;
    if(p<1)requestAnimationFrame(step);else el.textContent=target.toFixed(dec)+suffix;
  }
  requestAnimationFrame(step);
}
const countIo=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){animateCount(e.target);countIo.unobserve(e.target);}
}),{threshold:.6});
$$('[data-count]').forEach(el=>countIo.observe(el));

/* ---------- TOURS: expand + hover thumb ---------- */
const thumb=$('#thumb'),thumbPh=$('#thumbPh');
$$('.tour-wrap').forEach(wrap=>{
  const tour=$('.tour',wrap);
  tour.addEventListener('click',()=>{
    const open=wrap.classList.toggle('open');
    if(open){
      $$('.tour-wrap.open').forEach(o=>{if(o!==wrap)o.classList.remove('open');});
    }
    tour.setAttribute('aria-expanded',String(open));
  });
  tour.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();tour.click();}
  });
  if(fine&&thumb){
    tour.addEventListener('mouseenter',()=>{if(wrap.classList.contains('open'))return;thumbPh.className='ph '+tour.dataset.ph;thumb.classList.add('show');});
    tour.addEventListener('mouseleave',()=>thumb.classList.remove('show'));
    tour.addEventListener('mousemove',e=>{thumb.style.left=(e.clientX+26)+'px';thumb.style.top=(e.clientY-165)+'px';});
  }
});

/* ============================================================
   MAP
   ============================================================ */
const M=window.MAP;
const routes={
  culture:{label:'The Cultural Triangle',days:'4 days',stops:['Colombo','Dambulla','Sigiriya','Polonnaruwa','Kandy'],blurb:'Dry-zone kingdoms rock fortress, cave temples and the last royal capital.',color:'#c9a227'},
  hill:{label:'Hill Country & Tea',days:'3 days',stops:['Kandy','NuwaraEliya','Ella'],blurb:'The misted tea highlands, the blue train and the bridge at Ella.',color:'#7fae5e'},
  wild:{label:'Wildlife & Safari',days:'2 days',stops:['Colombo','Ella','Yala'],blurb:'Leopard country at the southern edge of the dry forest.',color:'#d8954a'},
  coast:{label:'Southern Coast',days:'3 days',stops:['Colombo','Galle','Mirissa'],blurb:'Dutch ramparts, stilt fishers and the whales off Mirissa.',color:'#4aa3a0'},
  grand:{label:'The Grand Island',days:'14 days',stops:['Colombo','Dambulla','Sigiriya','Polonnaruwa','Kandy','NuwaraEliya','Ella','Yala','Mirissa','Galle'],blurb:'Everything coast to summit, north to south, unhurried over two weeks.',color:'#e0703a'}
};
const cityInfo={
  Colombo:{label:'Colombo',sub:'Capital · arrival',ph:'ph-beach'},
  Negombo:{label:'Negombo',sub:'Lagoon & beach',ph:'ph-beach'},
  Kandy:{label:'Kandy',sub:'Hill capital · Tooth Temple',ph:'ph-kandy'},
  Dambulla:{label:'Dambulla',sub:'Golden cave temples',ph:'ph-temple'},
  Sigiriya:{label:'Sigiriya',sub:'Lion Rock fortress',ph:'ph-sigiriya'},
  NuwaraEliya:{label:'Nuwara Eliya',sub:'Tea country',ph:'ph-tea'},
  Ella:{label:'Ella',sub:'Nine Arches · the blue train',ph:'ph-train'},
  Yala:{label:'Yala',sub:'Leopard safari',ph:'ph-leopard'},
  Galle:{label:'Galle',sub:'Dutch fort & ramparts',ph:'ph-gal'},
  Anuradhapura:{label:'Anuradhapura',sub:'Ancient capital',ph:'ph-temple'},
  Trincomalee:{label:'Trincomalee',sub:'East coast harbour',ph:'ph-beach'},
  Jaffna:{label:'Jaffna',sub:'Northern peninsula',ph:'ph-temple'},
  Mirissa:{label:'Mirissa',sub:'Whales & surf',ph:'ph-beach'},
  Polonnaruwa:{label:'Polonnaruwa',sub:'Medieval ruins',ph:'ph-temple'},
  Batticaloa:{label:'Batticaloa',sub:'Lagoon city',ph:'ph-beach'},
  Mannar:{label:'Mannar',sub:'Baobabs & birds',ph:'ph-beach'}
};

const svg=$('#islandSvg');
let activeRoute='culture',travelRAF=null;
if(svg&&M){
  svg.setAttribute('viewBox',M.viewBox);
  const NS='http://www.w3.org/2000/svg';
  // island
  const island=document.createElementNS(NS,'path');
  island.setAttribute('d',M.path);island.setAttribute('class','island');
  svg.appendChild(island);
  // inner contour (decorative)
  const inner=document.createElementNS(NS,'path');
  inner.setAttribute('d',M.path);inner.setAttribute('class','island-inner');
  inner.setAttribute('transform',`translate(${M.vbW*0.012} ${M.vbH*0.012}) scale(0.976)`);
  inner.style.transformOrigin='center';
  svg.appendChild(inner);

  // route path group
  const routeEl=document.createElementNS(NS,'path');
  routeEl.setAttribute('class','route-path');routeEl.id='routePath';
  svg.appendChild(routeEl);
  const dot=document.createElementNS(NS,'circle');
  dot.setAttribute('class','travel-dot');dot.setAttribute('r','5');
  svg.appendChild(dot);

  // smooth path through points (Catmull-Rom -> bezier)
  function smooth(pts){
    if(pts.length<2)return '';
    let d=`M${pts[0][0]} ${pts[0][1]}`;
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||pts[i+1];
      const c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6;
      const c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6;
      d+=` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  // pins + labels
  const labelOffsets={Galle:[-6,14,'end'],Mirissa:[8,16,'start'],Ella:[10,4,'start'],NuwaraEliya:[-10,-8,'end'],Mannar:[12,4,'start'],Jaffna:[12,2,'start'],Dambulla:[-9,14,'end'],Yala:[10,4,'start']};
  Object.keys(cityInfo).forEach(key=>{
    const c=M.cities[key];if(!c)return;
    const g=document.createElementNS(NS,'g');g.setAttribute('class','pin');g.dataset.city=key;
    g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',cityInfo[key].label+' — view location');
    const halo=document.createElementNS(NS,'circle');halo.setAttribute('class','halo');halo.setAttribute('cx',c[0]);halo.setAttribute('cy',c[1]);halo.setAttribute('r','4');
    const core=document.createElementNS(NS,'circle');core.setAttribute('class','core');core.setAttribute('cx',c[0]);core.setAttribute('cy',c[1]);core.setAttribute('r','3.4');
    g.appendChild(halo);g.appendChild(core);
    svg.appendChild(g);
    const off=labelOffsets[key]||[7,3.5,'start'];
    const t=document.createElementNS(NS,'text');t.setAttribute('class','city-label');
    t.setAttribute('x',c[0]+off[0]);t.setAttribute('y',c[1]+off[1]);t.setAttribute('text-anchor',off[2]);
    t.textContent=cityInfo[key].label;
    svg.appendChild(t);
    g.addEventListener('click',ev=>{ev.stopPropagation();showTip(key);});
    g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();showTip(key);}});
  });

  // tooltip
  const tip=$('#mapTip');
  let tipKey=null;
  function showTip(key){
    const info=cityInfo[key];const c=M.cities[key];if(!info)return;
    if(tipKey===key){hideTip();return;}
    tipKey=key;
    $('.tip-img',tip).className='tip-img '+info.ph;
    $('.tip-img',tip).style.backgroundImage='';
    $('#tipName').textContent=info.label;
    $('#tipSub').textContent=info.sub;
    // position relative to mapbox
    const box=$('.mapbox').getBoundingClientRect();
    const svgRect=svg.getBoundingClientRect();
    const sx=svgRect.left-box.left+(c[0]/M.vbW)*svgRect.width;
    const sy=svgRect.top-box.top+(c[1]/M.vbH)*svgRect.height;
    let left=sx+14,top=sy-60;
    if(left+188>box.width)left=sx-202;
    if(top<0)top=sy+14;
    tip.style.left=left+'px';tip.style.top=top+'px';
    tip.classList.add('show');
  }
  function hideTip(){tip.classList.remove('show');tipKey=null;}
  svg.addEventListener('click',hideTip);
  $('#mapTipClose')?.addEventListener('click',e=>{e.stopPropagation();hideTip();});

  // draw route
  function drawRoute(name,instant){
    const r=routes[name];if(!r)return;
    activeRoute=name;
    cancelAnimationFrame(travelRAF);
    const pts=r.stops.map(s=>M.cities[s]).filter(Boolean);
    routeEl.setAttribute('d',smooth(pts));
    routeEl.style.stroke=r.color;
    dot.style.stroke=r.color;
    const len=routeEl.getTotalLength();
    routeEl.style.transition='none';
    routeEl.style.strokeDasharray=len;
    routeEl.style.strokeDashoffset=len;
    routeEl.classList.add('show');
    dot.classList.add('show');
    // highlight pins
    $$('.pin').forEach(p=>p.classList.toggle('on',r.stops.includes(p.dataset.city)));
    // route meta
    const rm=$('#routeMeta');
    rm.innerHTML=`<b>${r.stops.map(s=>cityInfo[s].label).join(' → ')}</b><br>${r.blurb}`;
    rm.classList.add('show');
    // active button
    $$('.route-btn').forEach(b=>b.classList.toggle('active',b.dataset.route===name));

    const dur=reduce?0:1600;
    const t0=performance.now();
    function frame(t){
      const p=instant?1:Math.min((t-t0)/dur,1);
      const eased=1-Math.pow(1-p,2.2);
      routeEl.style.strokeDashoffset=len*(1-eased);
      const pt=routeEl.getPointAtLength(len*eased);
      dot.setAttribute('cx',pt.x);dot.setAttribute('cy',pt.y);
      if(p<1)travelRAF=requestAnimationFrame(frame);
      else loopDot(len);
    }
    if(instant||reduce){routeEl.style.strokeDashoffset=0;const pt=routeEl.getPointAtLength(len);dot.setAttribute('cx',pt.x);dot.setAttribute('cy',pt.y);}
    else travelRAF=requestAnimationFrame(frame);
  }
  // gentle continuous travel after draw
  function loopDot(len){
    if(reduce)return;
    const dur=5200;let t0=performance.now();
    function frame(t){
      const p=((t-t0)%dur)/dur;
      const pt=routeEl.getPointAtLength(len*p);
      dot.setAttribute('cx',pt.x);dot.setAttribute('cy',pt.y);
      travelRAF=requestAnimationFrame(frame);
    }
    travelRAF=requestAnimationFrame(frame);
  }
  $$('.route-btn').forEach(b=>b.onclick=()=>{hideTip();drawRoute(b.dataset.route);});

  // auto-draw first route when map enters view
  const mapIo=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){drawRoute('culture');mapIo.disconnect();}
  }),{threshold:.35});
  mapIo.observe($('#map'));
}

/* ============================================================
   WHEN TO GO
   ============================================================ */
const seasonData={
  // score 0-100 per region per month index 0=Jan
  regions:['West & South coast','Cultural Triangle','Hill Country','East coast'],
  scores:[
    [92,94,90,72,55,45,55,60,62,82,88,90], // west/south
    [88,90,88,80,72,70,72,75,78,82,80,85], // cultural triangle
    [82,86,88,80,70,62,60,64,72,78,72,78], // hill
    [55,60,68,82,92,94,95,94,88,72,58,52]  // east
  ],
  notes:[
    'Peak season on the south and west coasts dry, sunny, the whales are running off Mirissa.',
    'Peak season continues ideal across the cultural triangle and the south.',
    'Lovely island-wide; the hill country is crisp and clear before the heat.',
    'Shoulder the east coast wakes up as the south begins to soften.',
    'The east coast hits its stride; Trincomalee and Arugam Bay are at their best.',
    'East-coast season quieter, cheaper everywhere else, with afternoon showers in the south.',
    'Prime east-coast surf and sun; cultural sites remain very doable.',
    'East coast still excellent; the Kandy Esala Perahera lights up the hills.',
    'Transition month good light island-wide as the southwest monsoon eases.',
    'The south and west reopen; warm seas return to Galle and Mirissa.',
    'Coast season building again; clear, golden days return to the southwest.',
    'High season opens festive, dry and bright along the south and west.'
  ]
};
const monthsBox=$('#months'),seasonReadout=$('#seasonReadout');
if(monthsBox){
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  MO.forEach((m,i)=>{
    const b=document.createElement('button');b.className='mo';b.textContent=m;b.dataset.i=i;
    if(seasonData.scores[0][i]>=70)b.classList.add('mo-west');
    if(seasonData.scores[3][i]>=70)b.classList.add('mo-east');
    b.onclick=()=>setMonth(i);monthsBox.appendChild(b);
  });
  function setMonth(i){
    $$('.mo',monthsBox).forEach(b=>b.classList.toggle('active',+b.dataset.i===i));
    const scored=seasonData.regions.map((r,ri)=>({r,v:seasonData.scores[ri][i]}));
    const best=scored.reduce((a,b)=>b.v>a.v?b:a);
    const bestTag=best.v>=85?'Excellent':best.v>=70?'Good':best.v>=58?'Fair':'Off-season';
    const rows=scored.map(({r,v})=>{
      const tag=v>=85?'Excellent':v>=70?'Good':v>=58?'Fair':'Off-season';
      const cls=v>=85?'q-exc':v>=70?'q-good':v>=58?'q-fair':'q-off';
      return `<div class="reg"><span class="rn">${r}</span><span class="gauge"><i class="${cls}" data-w="${v}"></i></span><span class="rv">${tag}</span></div>`;
    }).join('');
    seasonReadout.innerHTML=`<div class="best-pick"><div class="bp-label">Best this month</div><div class="bp-region">${best.r}<span class="bp-tag">${bestTag}</span></div></div>${rows}`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{$$('#seasonReadout .gauge i').forEach(g=>g.style.transform='scaleX('+g.dataset.w/100+')');}));
  }
  const now=new Date().getMonth();
  setMonth(now);
  const seasonIo=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){setMonth(now);seasonIo.disconnect();}}),{threshold:.12});
  seasonIo.observe($('#season'));
}

/* ============================================================
   GALLERY — render, lightbox, lazy-load, expand/collapse
   ============================================================ */
function renderGallery(items){
  const grid=document.getElementById('galleryGrid');
  if(!grid)return;
  grid.innerHTML='';
  const IMG_TO_PH={'img-sigiriya.jpg':'ph-sigiriya-group'};
  items.forEach((item,i)=>{
    const filename=(item.image||'').replace(/^.*\//,'');
    const ph=IMG_TO_PH[filename]||'ph-'+filename.replace(/^img-/,'').replace(/\.[^.]+$/,'');
    const delay=(i%3===1)?' d1':(i%3===2)?' d2':'';
    const el=document.createElement('div');
    el.className='gitem g'+(i+1)+' reveal'+delay;
    el.dataset.ph=ph;
    el.dataset.img=item.image||'';
    el.setAttribute('role','button');
    el.setAttribute('tabindex','0');
    el.setAttribute('aria-label',(item.caption||'')+' — open full screen');
    el.innerHTML='<div class="ph '+ph+'"></div><div class="cap">'+(item.caption||'')+'</div><div class="plus" aria-hidden="true">+</div>';
    grid.appendChild(el);
  });
}

function initLightbox(){
  const lb=$('#lb');
  if(!lb)return;
  const items=$$('.gitem');
  if(!items.length)return;
  const data=items.map(g=>({ph:g.dataset.ph,img:g.dataset.img||'',cap:$('.cap',g)?.textContent||''}));
  const stage=$('.lb-stage',lb);
  let cur=0,lastFocus=null;
  stage.innerHTML='';
  const layerA=document.createElement('div'),layerB=document.createElement('div');
  layerA.className='ph active';layerB.className='ph';
  stage.append(layerA,layerB);
  let front=layerA,back=layerB;
  function render(i){
    cur=(i+data.length)%data.length;
    back.className='ph '+data[cur].ph;
    back.style.backgroundImage=data[cur].img?"url('"+data[cur].img+"')":'';
    back.offsetWidth;
    front.classList.remove('active');back.classList.add('active');
    [front,back]=[back,front];
    $('#lbCap').textContent=data[cur].cap;
    $('#lbCount').textContent=String(cur+1).padStart(2,'0')+' / '+String(data.length).padStart(2,'0');
  }
  function shakeArrow(el){
    el.classList.remove('edge-hit');
    el.offsetWidth;
    el.classList.add('edge-hit');
    el.addEventListener('animationend',()=>el.classList.remove('edge-hit'),{once:true});
  }
  function open(i){
    render(i);
    lb.classList.add('open');
    lb.removeAttribute('aria-hidden');
    document.body.style.overflow='hidden';
    lastFocus=document.activeElement;
    setTimeout(()=>$('#lbx').focus(),50);
  }
  function close(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    lastFocus?.focus();
  }
  items.forEach((g,i)=>{
    g.onclick=()=>open(i);
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(i);}});
  });
  $('#lbx').onclick=close;
  $('#lbPrev').onclick=e=>{
    e.stopPropagation();
    if(cur===0){shakeArrow($('#lbPrev'));return;}
    render(cur-1);
  };
  $('#lbNext').onclick=e=>{
    e.stopPropagation();
    if(cur===data.length-1){shakeArrow($('#lbNext'));return;}
    render(cur+1);
  };
  lb.onclick=e=>{if(e.target===lb||e.target===stage)close();};
  addEventListener('keydown',e=>{
    if(!lb.classList.contains('open'))return;
    if(e.key==='Escape'){close();return;}
    if(e.key==='ArrowLeft'){
      if(cur===0){shakeArrow($('#lbPrev'));return;}
      render(cur-1);
    }
    if(e.key==='ArrowRight'){
      if(cur===data.length-1){shakeArrow($('#lbNext'));return;}
      render(cur+1);
    }
    if(e.key==='Tab'){
      const focusable=[...$('#lbPrev,#lbNext,#lbx').parentElement.querySelectorAll('button,[tabindex]:not([tabindex="-1"])')];
      const lbFocusable=focusable.filter(el=>lb.contains(el));
      if(!lbFocusable.length)return;
      const first=lbFocusable[0],last=lbFocusable[lbFocusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
}

function initGalleryLazy(){
  const lazyBg=new IntersectionObserver(es=>{
    es.forEach(e=>{
      if(!e.isIntersecting)return;
      const phEl=e.target.querySelector('.ph');
      if(phEl&&!phEl.style.backgroundImage){
        const imgPath=e.target.dataset.img;
        phEl.style.backgroundImage=imgPath?"url('"+imgPath+"')":'';
      }
      lazyBg.unobserve(e.target);
    });
  },{rootMargin:'400px 0px'});
  $$('.gitem[data-ph]').forEach(g=>lazyBg.observe(g));
}

function initGalleryExpand(){
  const galWrap=document.querySelector('.gallery-wrap');
  const galGrid=document.querySelector('.gallery');
  const galBtn=document.querySelector('.gal-toggle');
  if(!galBtn||!galGrid||!galWrap)return;
  galBtn.onclick=()=>{
    const expanded=galGrid.classList.toggle('expanded');
    galWrap.classList.toggle('expanded',expanded);
    galBtn.setAttribute('aria-expanded',expanded);
    if(expanded){
      galGrid.style.maxHeight=galGrid.scrollHeight+'px';
      galBtn.textContent='Show less';
    }else{
      galGrid.style.maxHeight='460px';
      galBtn.textContent='View all '+document.querySelectorAll('.gitem').length+' photos';
    }
  };
}

fetch('/gallery.json')
  .then(r=>r.ok?r.json():null)
  .then(data=>{
    if(!data||!data.items)return;
    renderGallery(data.items);
    $$('#galleryGrid .gitem').forEach(el=>io.observe(el));
    initLightbox();
    initGalleryLazy();
    initGalleryExpand();
    const galBtn=document.querySelector('.gal-toggle');
    if(galBtn)galBtn.textContent='View all '+data.items.length+' photos';
  })
  .catch(()=>{});

/* ============================================================
   TOUR MEDIA SLIDESHOW
   ============================================================ */
$$('.media-dots').forEach(dotsEl=>{
  const media=dotsEl.closest('.media');
  const slides=$$('.media-slide',media);
  const capEl=$('.badge-cap',media);
  if(!slides.length)return;
  slides.forEach((_,i)=>{
    const b=document.createElement('button');
    b.className='media-dot'+(i===0?' active':'');
    b.setAttribute('aria-label','Photo '+(i+1));
    b.onclick=e=>{
      e.stopPropagation();
      slides.forEach(s=>s.classList.remove('active'));
      dotsEl.querySelectorAll('.media-dot').forEach(d=>d.classList.remove('active'));
      slides[i].classList.add('active');
      b.classList.add('active');
      if(capEl)capEl.textContent=slides[i].dataset.cap||'';
    };
    dotsEl.append(b);
  });
});

/* ============================================================
   TESTIMONIAL CAROUSEL
   ============================================================ */
const qSlides=$$('.q-slide'),qNav=$('#qNav');
if(qSlides.length&&qNav){
  let qi=0,qTimer;
  qSlides[0].classList.add('active');
  qSlides.forEach((_,i)=>{
    const b=document.createElement('button');
    if(i===0)b.classList.add('active');
    b.setAttribute('aria-label','Review '+(i+1));
    b.onclick=()=>go(i,true);
    qNav.appendChild(b);
  });
  const dots=$$('button',qNav);
  function go(i,manual){
    qSlides[qi].classList.remove('active');
    dots[qi].classList.remove('active');
    qi=(i+qSlides.length)%qSlides.length;
    qSlides[qi].classList.add('active');
    dots[qi].classList.add('active');
    if(manual)restart();
  }
  function restart(){clearInterval(qTimer);qTimer=setInterval(()=>go(qi+1),6500);}
  restart();
}

/* ============================================================
   CONTACT FORM
   Set up: create a free form at https://formspree.io pointing
   to info@majestytourssrilanka.com, then replace YOUR_FORM_ID
   below with the ID from your Formspree dashboard.
   ============================================================ */
const FORM_ENDPOINT='https://formspree.io/f/YOUR_FORM_ID';

const form=$('#inquiryForm');
if(form){
  // journey chips
  $$('.chip').forEach(ch=>ch.onclick=()=>{
    $$('.chip').forEach(c=>c.classList.remove('sel'));
    ch.classList.add('sel');
    $('#tourField').value=ch.dataset.tour;
  });
  function setErr(field,msg){
    const f=field.closest('.field');f.classList.add('invalid');$('.err',f).textContent=msg;
    field.setAttribute('aria-invalid','true');
  }
  function clearErr(field){
    field.closest('.field')?.classList.remove('invalid');
    field.removeAttribute('aria-invalid');
  }
  $$('input,textarea',form).forEach(i=>i.addEventListener('input',()=>clearErr(i)));

  const submitBtn=form.querySelector('[type="submit"]');
  const errBanner=$('#formError');

  form.onsubmit=async(e)=>{
    e.preventDefault();
    if(form.company_website.value)return; // honeypot
    let ok=true;
    const name=form.name,email=form.email;
    if(!name.value.trim()){setErr(name,'Please tell us your name.');ok=false;}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)){setErr(email,'A valid email lets us reply.');ok=false;}
    if(!ok){const first=$('.field.invalid input,.field.invalid textarea');first?.focus();return;}

    // loading state — prevent double-submit
    submitBtn.disabled=true;
    submitBtn.innerHTML='Sending <span class="arr">&#8230;</span>';
    if(errBanner)errBanner.hidden=true;

    try{
      const fd=new FormData(form);
      const res=await fetch(FORM_ENDPOINT,{method:'POST',body:fd,headers:{'Accept':'application/json'}});
      if(res.ok){
        form.style.display='none';
        const successEl=$('#formSuccess');
        successEl.classList.add('show');
        const successH=successEl.querySelector('h3');
        if(successH){successH.setAttribute('tabindex','-1');successH.focus();}
      }else{
        const data=await res.json().catch(()=>({}));
        throw new Error(data.error||'The server returned an error.');
      }
    }catch(err){
      if(errBanner){
        errBanner.textContent='Something went wrong — please try again, or reach us directly at info@majestytourssrilanka.com';
        errBanner.hidden=false;
        errBanner.focus();
      }
      submitBtn.disabled=false;
      submitBtn.innerHTML='Send inquiry <span class="arr">→</span>';
    }
  };
}

/* ============================================================
   COOKIE
   ============================================================ */
const cookie=$('#cookie');
if(cookie&&!localStorage.getItem('mt_cookie')){setTimeout(()=>cookie.classList.add('show'),2000);}
$('#cookieOk')?.addEventListener('click',()=>{localStorage.setItem('mt_cookie','1');cookie.classList.remove('show');});

/* ============================================================
   IMAGE FALLBACK
   ============================================================ */
$$('[style*="background-image"]').forEach(el=>{
  const m=el.style.backgroundImage.match(/url\(['"]?([^'")]+)['"]?\)/);
  if(!m)return;const img=new Image();img.onerror=()=>{el.style.backgroundImage='none';};img.src=m[1];
});

/* ============================================================
   CUSTOM MAGNETIC CURSOR
   ============================================================ */
if(fine&&!reduce){
  document.body.classList.add('has-cursor');
  const dot=$('#curDot'),ring=$('#curRing'),lab=$('#curLabel');
  let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my,vx=0,vy=0;
  addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`;});
  (function loop(){
    const stiffness=0.12,damping=0.75;
    vx=(vx+(mx-rx)*stiffness)*damping;
    vy=(vy+(my-ry)*stiffness)*damping;
    rx+=vx;ry+=vy;
    ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  const hotSel='a,button,.tour,.gitem,.pin,.mo,.chip,.route-btn,.q-nav button';
  document.addEventListener('mouseover',e=>{
    const t=e.target.closest(hotSel);
    if(t){ring.classList.add('hot');if(t.matches('.btn,.nav-cta'))ring.classList.add('invert');
      const l=t.getAttribute('data-cursor');if(l){lab.textContent=l;lab.classList.add('show');}
    }
  });
  document.addEventListener('mouseout',e=>{
    if(e.target.closest(hotSel)){ring.classList.remove('hot','invert');lab.classList.remove('show');}
  });
  addEventListener('mousemove',e=>{if(lab.classList.contains('show'))lab.style.transform=`translate(${e.clientX}px,${e.clientY+28}px) translate(-50%,-50%)`;});
  document.addEventListener('mouseleave',()=>{dot.style.opacity=0;ring.style.opacity=0;});
  document.addEventListener('mouseenter',()=>{dot.style.opacity=1;ring.style.opacity=.55;});
}

/* Reveal safety net: ensure content is never permanently hidden if IntersectionObserver
   doesn't fire (background tab, headless renderer, slow connection). */
setTimeout(()=>{
  document.querySelectorAll('.reveal:not(.in)').forEach(el=>el.classList.add('in'));
  document.querySelectorAll('.split:not(.in)').forEach(el=>el.classList.add('in'));
},3500);

})();
