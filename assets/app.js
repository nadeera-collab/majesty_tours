/* ============================================================
   MAJESTY TOURS interactivity
   ============================================================ */
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
  item.addEventListener('click',()=>{
    if(heroGoTo)heroGoTo(i,true);
    document.getElementById('top').scrollIntoView({behavior:'smooth'});
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
  if(prog)prog.style.width=(scrollY/h*100)+'%';
}
addEventListener('scroll',onScroll,{passive:true});onScroll();

const burger=$('#burger'),links=$('#links');
burger.onclick=()=>{links.classList.toggle('open');burger.classList.toggle('open');};
$$('a',links).forEach(a=>a.onclick=()=>{links.classList.remove('open');burger.classList.remove('open');});

/* active section highlight */
const navMap={};
$$('.navlinks a[href^="#"]').forEach(a=>{const id=a.getAttribute('href').slice(1);if(id)navMap[id]=a;});
const secObserver=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(e.isIntersecting){
      $$('.navlinks a').forEach(a=>a.classList.remove('current'));
      const a=navMap[e.target.id];if(a)a.classList.add('current');
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
const monthsBox=$('#months'),seasonReadout=$('#seasonReadout'),seasonNote=$('#seasonNote');
if(monthsBox){
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  MO.forEach((m,i)=>{
    const b=document.createElement('button');b.className='mo';b.textContent=m;b.dataset.i=i;
    b.onclick=()=>setMonth(i);monthsBox.appendChild(b);
  });
  function setMonth(i){
    $$('.mo',monthsBox).forEach(b=>b.classList.toggle('active',+b.dataset.i===i));
    seasonReadout.innerHTML=seasonData.regions.map((r,ri)=>{
      const v=seasonData.scores[ri][i];
      const tag=v>=85?'Excellent':v>=70?'Good':v>=58?'Fair':'Off-season';
      return `<div class="reg"><span class="rn">${r}</span><span class="gauge"><i style="width:0" data-w="${v}"></i></span><span class="rv">${tag}</span></div>`;
    }).join('');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{$$('#seasonReadout .gauge i').forEach(g=>g.style.width=g.dataset.w+'%');}));
    seasonNote.innerHTML=`<b>${MO[i]} </b> ${seasonData.notes[i]}`;
  }
  const now=new Date().getMonth();
  setMonth(now); // populate immediately so it's never empty
  const seasonIo=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){setMonth(now);seasonIo.disconnect();}}),{threshold:.12});
  seasonIo.observe($('#season'));
}

/* ============================================================
   GALLERY LIGHTBOX (prev/next + keyboard)
   ============================================================ */
const lb=$('#lb');
if(lb){
  const items=$$('.gitem');
  const data=items.map(g=>({ph:g.dataset.ph,cap:$('.cap',g)?.textContent||''}));
  const stage=$('.lb-stage',lb);
  let cur=0,lastFocus=null;
  // build two stacked layers for crossfade
  const layerA=document.createElement('div'),layerB=document.createElement('div');
  layerA.className='ph active';layerB.className='ph';
  stage.append(layerA,layerB);
  let front=layerA,back=layerB;
  function render(i){
    cur=(i+data.length)%data.length;
    back.className='ph '+data[cur].ph;
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
    lb.setAttribute('role','dialog');
    lb.setAttribute('aria-modal','true');
    document.body.style.overflow='hidden';
    lastFocus=document.activeElement;
    setTimeout(()=>$('#lbNext').focus(),50);
  }
  function close(){
    lb.classList.remove('open');
    document.body.style.overflow='';
    lastFocus?.focus();
  }
  items.forEach((g,i)=>g.onclick=()=>open(i));
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
   ============================================================ */
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
  }
  function clearErr(field){field.closest('.field')?.classList.remove('invalid');}
  $$('input,textarea',form).forEach(i=>i.addEventListener('input',()=>clearErr(i)));
  form.onsubmit=e=>{
    e.preventDefault();
    if(form.company_website.value)return; // honeypot
    let ok=true;
    const name=form.name,email=form.email;
    if(!name.value.trim()){setErr(name,'Please tell us your name.');ok=false;}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)){setErr(email,'A valid email lets us reply.');ok=false;}
    if(!ok){const first=$('.field.invalid input,.field.invalid textarea');first?.focus();return;}
    // success
    form.style.display='none';
    $('#formSuccess').classList.add('show');
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

})();
