#!/usr/bin/env node
/* ============================================================
   Majesty Tours: static tour page generator
   Reads content.json and writes:
     tours/<slug>/index.html   (one per tour)
     tours/index.html          (tour index / listing page)
   Also refreshes sitemap.xml with the generated URLs.
   Run with: node scripts/build-pages.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = 'https://majestytourssrilanka.com';
const GA_ID = 'G-V924557NG6';
const WHATSAPP = '94755499691';
const TODAY = new Date().toISOString().slice(0, 10);

const content = JSON.parse(readFileSync(join(ROOT, 'content.json'), 'utf8'));
const tours = content.tours;

/* Every generated product page in one list, annotated with the URL it
   will be written to. Used for the cross-links at the bottom of each
   page and for the hub sections on /tours/. Without them the day-trip
   and experience pages sat in the sitemap with nothing linking to them. */
const ALL_PRODUCTS = [
  ...(content.dayTrips || []).map(i => ({ item: i, group: 'dayTrips', href: `/${i.urlPrefix || 'day-trips'}/${i.slug}/` })),
  ...(content.experiences || []).map(i => ({ item: i, group: 'experiences', href: `/${i.urlPrefix || 'experiences'}/${i.slug}/` })),
  ...(content.extendedTours || []).map(i => ({ item: i, group: 'extendedTours', href: `/tours/${i.slug}/` }))
];
const productFor = item => ALL_PRODUCTS.find(p => p.item === item);

/* ---------- helpers ---------- */
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- responsive images ----------
   assets/image-manifest.json is written by scripts/optimize-images.mjs
   and committed. It maps each source photo to its intrinsic size and
   the WebP derivative widths that exist in assets/opt/. If it's missing
   (fresh clone before the optimizer has ever run) every helper below
   degrades to a plain <img> pointing at the original file, so the build
   never depends on it. */
const MANIFEST = (() => {
  try { return JSON.parse(readFileSync(join(ROOT, 'assets', 'image-manifest.json'), 'utf8')); }
  catch { return {}; }
})();

/* Photos are stored as "assets/foo.jpeg" in content.json but referenced
   from the site root as "/assets/foo.jpeg". */
const rootPath = src => (src.startsWith('/') ? src : `/${src}`);

function picture(src, alt, { sizes = '100vw', eager = false, priority = false, cls = '' } = {}) {
  const entry = MANIFEST[src];
  const dims = entry ? ` width="${entry.w}" height="${entry.h}"` : '';
  // `priority` is for the one LCP candidate per page. Above-the-fold
  // chrome (the logo) is eager but must not compete with it.
  const loading = (eager || priority)
    ? ` loading="eager"${priority ? ' fetchpriority="high"' : ''} decoding="async"`
    : ' loading="lazy" decoding="async"';
  const img = `<img src="${rootPath(src)}" alt="${esc(alt)}"${dims}${loading}${cls ? ` class="${cls}"` : ''}>`;
  if (!entry || !entry.widths?.length) return img;
  const srcset = entry.widths.map(w => `/assets/opt/${entry.stem}-${w}.webp ${w}w`).join(', ');
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}">${img}</picture>`;
}

/* The <link rel=preload> for a hero, so the LCP image starts downloading
   from the HTML rather than after the stylesheet. */
function preloadHero(src, sizes) {
  const entry = MANIFEST[src];
  if (!entry || !entry.widths?.length) return `<link rel="preload" as="image" href="${rootPath(src)}">`;
  const srcset = entry.widths.map(w => `/assets/opt/${entry.stem}-${w}.webp ${w}w`).join(', ');
  return `<link rel="preload" as="image" type="image/webp" imagesrcset="${srcset}" imagesizes="${sizes}">`;
}

const HERO_SIZES = '(max-width:820px) 92vw, 440px';
const TILE_SIZES = '(max-width:640px) 45vw, 220px';

/* ---------- reusable page sections ---------- */
function heroBlock(src, alt) {
  if (!src) return '';
  return `<div class="tour-hero">${picture(src, alt, { sizes: HERO_SIZES, priority: true })}</div>`;
}

/* Gallery tiles are buttons so the lightbox is reachable by keyboard.
   Without JS they're inert but the photos still render, which is the
   behaviour we want for crawlers and for file:// previews. */
function galleryBlock(images, fallbackAlt, heading = 'Gallery') {
  if (!images?.length) return '';
  const tiles = images.map((im, i) => {
    const caption = im.caption || fallbackAlt;
    return `<button type="button" class="tg-item" data-full="${rootPath(im.image)}" data-cap="${esc(caption)}" aria-label="Open photo ${i + 1}: ${esc(caption)}">
          ${picture(im.image, caption, { sizes: TILE_SIZES })}
          <span class="tg-cap">${esc(caption)}</span>
        </button>`;
  }).join('\n        ');
  return `<section class="tour-section tour-gallery" id="gallery">
      <h2>${esc(heading)}</h2>
      <div class="tour-gallery-grid" data-lightbox>
        ${tiles}
      </div>
    </section>`;
}

function highlightsBlock(items, heading = 'Trip highlights') {
  if (!items?.length) return '';
  return `<section class="tour-section tour-highlights">
      <h2>${esc(heading)}</h2>
      <ul class="tour-highlight-grid">
        ${items.map(h => `<li>${esc(h)}</li>`).join('\n        ')}
      </ul>
    </section>`;
}

/* The `facts` object and `destinationsCovered` list already exist in
   content.json for the seven main tours (the homepage shows them) but
   the landing pages were throwing them away. */
function tourFactsBlock(tour) {
  const f = tour.facts || {};
  const rows = [
    f.duration && { label: 'Duration', value: f.duration },
    f.type && { label: 'Tour type', value: f.type },
    f.start && { label: 'Starts', value: f.start },
    f.end && { label: 'Ends', value: f.end },
    f.destinations && { label: 'Destinations', value: String(f.destinations) },
    f.unesco && { label: 'UNESCO World Heritage Sites', value: String(f.unesco) },
    f.parks && { label: 'National parks', value: String(f.parks) },
    f.bestFor && { label: 'Best for', value: f.bestFor.replace(/\s*•\s*/g, ' · ') }
  ].filter(Boolean);
  if (!rows.length && !tour.destinationsCovered?.length) return '';
  return `<section class="tour-section tour-practical">
      <h2>Trip at a glance</h2>
      ${rows.length ? `<dl class="tour-practical-list">
        ${rows.map(r => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('\n        ')}
      </dl>` : ''}
      ${tour.destinationsCovered?.length ? `<h3 class="tour-subhead">Destinations covered</h3>
      <ul class="tour-chip-list">
        ${tour.destinationsCovered.map(d => `<li>${esc(d)}</li>`).join('\n        ')}
      </ul>` : ''}
      ${tour.route ? `<p class="tour-route"><strong>Route:</strong> ${esc(tour.route)}</p>` : ''}
    </section>`;
}

function practicalBlock(rows, heading = 'Good to know') {
  if (!rows?.length) return '';
  return `<section class="tour-section tour-practical">
      <h2>${esc(heading)}</h2>
      <dl class="tour-practical-list">
        ${rows.map(r => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('\n        ')}
      </dl>
    </section>`;
}

function seasonBlock(note, months) {
  if (!note) return '';
  return `<section class="tour-section tour-season">
      <h2>Best time to go</h2>
      <div class="tour-season-box">
        <p>${esc(note)}</p>
        ${months?.length ? `<p><strong>Best months for this route:</strong> ${months.join(', ')}.</p>` : ''}
      </div>
    </section>`;
}

function faqBlock(faqs) {
  if (!faqs?.length) return '';
  return `<section class="tour-section tour-faq">
      <h2>Frequently asked questions</h2>
      ${faqs.map(f => `<details>
        <summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
      </details>`).join('\n      ')}
    </section>`;
}

function fleetBlock(fleet) {
  if (!fleet?.length) return '';
  return `<section class="tour-section tour-fleet">
      <h2>Choose your vehicle</h2>
      <p>Every transfer is priced per vehicle, not per seat, so pick by the size of your party and your luggage.</p>
      <div class="tour-fleet-grid">
        ${fleet.map(v => `<div class="tour-fleet-card">
          ${picture(v.image, `${v.name}, ${v.capacity}`, { sizes: '(max-width:640px) 45vw, 260px' })}
          <h3>${esc(v.name)}</h3>
          <div class="tf-cap">${esc(v.capacity)}</div>
          <p>${esc(v.note)}</p>
        </div>`).join('\n        ')}
      </div>
    </section>`;
}

function relatedBlock(cards, heading = 'Related tours') {
  if (!cards?.length) return '';
  return `<section class="tour-section tour-related">
      <h2>${esc(heading)}</h2>
      <div class="tour-related-grid">
        ${cards.map(c => `<a class="tour-related-card" href="${c.href}">
          <h3>${esc(c.name)}</h3>
          <div class="rel-meta">${esc(c.meta)}</div>
        </a>`).join('\n        ')}
      </div>
    </section>`;
}

function ctaBand(name, whatsapp) {
  return `<div class="tour-cta-band">
      <h2>Ready to plan ${esc(name)}?</h2>
      <p>Tell us your travel dates and we'll confirm availability and a final quote.</p>
      <div class="tour-cta-row">
        <a class="btn btn-gold" href="${whatsapp}" target="_blank" rel="noopener noreferrer" data-lead="whatsapp">Enquire on WhatsApp →</a>
        <a class="btn btn-ghost" href="/#contact">Enquire online</a>
      </div>
    </div>`;
}

const faqSchema = faqs => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a }
  }))
});

/* Every page's TouristTrip sets provider: {"@id": ".../#agency"}, but
   that node was only ever defined on the homepage. Google parses
   structured data one page at a time, so on a tour page the reference
   resolved to nothing and the provider was dropped. This emits a
   compact TravelAgency alongside it, built from content.json so the
   phone number and address cannot drift from the homepage's copy. */
function agencyNode() {
  const c = content.contact || {};
  const [street, cityLine] = (c.location || '').split(',').map(s => s.trim());
  const postal = (cityLine || '').match(/\d{5}/)?.[0];
  const city = (cityLine || '').replace(/\d{5}/, '').trim();
  return {
    '@type': 'TravelAgency',
    '@id': `${SITE_URL}/#agency`,
    name: 'Majesty Tours',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo-shield.png`,
    image: `${SITE_URL}/assets/og-image.jpg`,
    ...(c.phone_primary ? { telephone: c.phone_primary.replace(/\s/g, '') } : {}),
    ...(c.email ? { email: c.email } : {}),
    ...(street ? {
      address: {
        '@type': 'PostalAddress',
        streetAddress: street,
        ...(city ? { addressLocality: city } : {}),
        ...(postal ? { postalCode: postal } : {}),
        addressCountry: 'LK'
      }
    } : {}),
    areaServed: { '@type': 'Country', name: 'Sri Lanka' },
    foundingDate: '2009',
    priceRange: '$390-$1990'
  };
}

/* The hero photo is the first gallery photo, so rendering both put the
   same image on the page twice with identical alt text. The grid drops
   whichever photo the hero is using. */
const withoutHero = (images, heroSrc) => (images || []).filter(i => i.image !== heroSrc);

/* heroImage can point at any photo in the set, not just the first, so
   the alt has to come from that photo's own caption. */
const captionOf = (images, src, fallback) =>
  (images || []).find(i => i.image === src)?.caption || fallback;

const priceNumber = (price = '') => (price.match(/[\d,]+/) || ['0'])[0].replace(/,/g, '');

const nightsFromInclusions = (inclusions = []) => {
  const m = inclusions.find(i => /night/i.test(i));
  return m ? m.match(/\d+/)?.[0] : null;
};

/* Per-tour static copy that isn't in content.json (kept here, next to the
   template, rather than duplicated as near-identical JSON across 7 entries). */
const EXTRA = [
  { // 0 Cultural Triangle
    h1: 'Cultural Triangle Private Tour: Dambulla, Sigiriya, Polonnaruwa &amp; Kandy',
    lede: 'A 5-day private introduction to Sri Lanka’s ancient kingdoms, rock fortresses and cave temples, with your own driver-guide and hotels arranged throughout.',
    regionKeys: ['culture'],
    seasonNote: 'The Cultural Triangle is dry-zone territory and pleasant most of the year, with its best, driest stretch from January to April and again in July–August.',
    faqExtra: {
      q: 'Do we climb Sigiriya Rock ourselves, or is it guided?',
      a: 'Your chauffeur guide accompanies you throughout and can guide the Sigiriya climb, though the pace up the rock is entirely yours, and there’s no fixed group schedule.'
    }
  },
  { // 1 Hill Country & Tea
    h1: 'Hill Country &amp; Tea Private Tour: Kandy, Nuwara Eliya &amp; Ella',
    lede: 'A 4-day private journey through Sri Lanka’s tea highlands, aboard the famous blue train, with your own driver-guide and hotels arranged throughout.',
    regionKeys: ['hill'],
    seasonNote: 'The hill country is cool and scenic year-round, but driest and clearest from January to April, with a second good spell in July–August.',
    faqExtra: {
      q: 'Is the scenic train journey guaranteed?',
      a: 'Second-class observation tickets on the Nanu Oya → Ella line are booked in advance but remain subject to availability; if seats aren’t available on your date we’ll arrange the same route by road with extra stops at the viewpoints.'
    }
  },
  { // 2 Wildlife & Safari
    h1: 'Wildlife &amp; Safari Private Tour: Udawalawe or Yala &amp; Galle Fort',
    lede: 'A 3-day private safari and coastal escape, taking in Udawalawe’s elephant herds or Yala’s leopards, with your own driver-guide and hotels arranged throughout.',
    regionKeys: ['coast'],
    seasonNote: 'Both Udawalawe and the southern coast are driest and best for game viewing from December to March, with Yala’s block-one section typically closed for its annual break in September.',
    faqExtra: {
      q: 'Can I choose between Udawalawe and Yala National Park?',
      a: 'Yes. Day 2 can be arranged at either park: Udawalawe for reliably large wild elephant herds, or Yala for one of the world’s highest leopard densities. Let us know your preference when you enquire.'
    }
  },
  { // 3 Southern Coast
    h1: 'Southern Coast Private Tour: Galle, Mirissa &amp; Unawatuna',
    lede: 'A 3-day private coastal journey through mangroves, Galle Fort, whale watching in Mirissa and the beaches of Unawatuna, with your own driver-guide and hotels arranged throughout.',
    regionKeys: ['coast'],
    seasonNote: 'The south coast is driest and calmest from December to March, which is also peak season for whale watching out of Mirissa.',
    faqExtra: {
      q: 'Is whale watching guaranteed?',
      a: 'Sightings on any single trip are never guaranteed since these are wild animals, but Mirissa’s December–April season has some of the most consistent blue whale and spinner dolphin sightings in the world.'
    }
  },
  { // 4 East Coast Escape
    h1: 'East Coast Private Tour: Trincomalee, Pigeon Island &amp; Pasikuda',
    lede: 'A 4-day private journey to Sri Lanka’s quieter East Coast, taking in whale watching, Koneswaram Temple, coral reefs and white-sand beaches, with your own driver-guide and hotels arranged throughout.',
    regionKeys: ['trinco'],
    seasonNote: 'The East Coast runs on the opposite monsoon to the west and south, so it’s at its best from May to September, when the west coast is at its wettest.',
    faqExtra: {
      q: 'Why is the East Coast best visited at a different time of year than the rest of Sri Lanka?',
      a: 'Sri Lanka has two monsoons on opposite cycles. The East Coast (Trincomalee, Pasikuda, Arugam Bay) is driest from May to September, while the west and south coasts and hill country are driest from December to March.'
    }
  },
  { // 5 Arugam Bay Surf Escape
    h1: 'Arugam Bay Surf Private Tour: Surfing, Pottuvil Lagoon &amp; Kumana Safari',
    lede: 'A 3-day private trip to Sri Lanka’s surf capital, with a Kumana National Park safari and Pottuvil Lagoon along the way, and your own driver-guide and hotels arranged throughout.',
    regionKeys: ['trinco'],
    seasonNote: 'Arugam Bay’s surf season runs May to September, the same dry stretch that favours the whole East Coast. Outside those months the swell and weather are far less reliable.',
    faqExtra: {
      q: 'Do I need to be an experienced surfer?',
      a: 'No. Arugam Bay has breaks and board/lesson arrangements suited to beginners as well as its famous experienced-surfer points; let us know your level when you enquire.'
    }
  },
  { // 6 Grand Island
    h1: 'The Grand Island: 14-Day Private Tour of Sri Lanka',
    lede: 'The complete island, coast to summit: culture, tea country, wildlife safari, whales and both coastlines on one carefully sequenced 14-day private journey.',
    regionKeys: ['culture', 'hill', 'coast', 'trinco'],
    seasonNote: 'Because this itinerary crosses both monsoon zones, some stretch of it is in season whenever you travel, so we sequence the East Coast days into the May–September window and the west/south/hill country days into December–March where your dates allow.',
    faqExtra: {
      q: 'Is 14 days enough to see all of this without feeling rushed?',
      a: 'Yes. This itinerary is deliberately sequenced to avoid backtracking and repeated experiences, with two or more nights in most stops so each region gets unhurried time rather than a checklist pace.'
    }
  }
];

/* Real, already-published seasonal fit data (same source as the homepage's
   "When to go" widget in app.js), reused here rather than re-invented. */
const SEASON_SCORES = {
  coast: [92, 94, 90, 72, 55, 45, 55, 60, 62, 82, 88, 90],
  culture: [88, 90, 88, 80, 72, 70, 72, 75, 78, 82, 80, 85],
  hill: [82, 86, 88, 80, 70, 62, 60, 64, 72, 78, 72, 78],
  trinco: [55, 60, 68, 82, 92, 94, 95, 94, 88, 72, 58, 52]
};

function tourUrl(slug) { return `/tours/${slug}/`; }

function faqsFor(tour, extra) {
  const nights = nightsFromInclusions(tour.inclusions);
  return [
    {
      q: `Is ${tour.name} a private tour?`,
      a: `Yes. Every Majesty Tours itinerary, including ${tour.name}, is private: your own air-conditioned vehicle and English-speaking chauffeur guide, with no other travellers on your schedule.`
    },
    {
      q: 'Can I customise this itinerary?',
      a: 'Yes. This is a sample itinerary: the route, pace, hotel category and stops can all be adjusted to your interests and travel dates. Tell us what you’d like changed when you enquire.'
    },
    {
      q: 'Are hotels included?',
      a: nights
        ? `Yes. ${nights} night${nights === '1' ? '' : 's'} of accommodation are included, along with daily breakfast and dinner, as listed above.`
        : 'Yes. Accommodation is included throughout, along with daily breakfast and dinner, as listed above.'
    },
    {
      q: 'Where does the tour start and end?',
      a: `Pickup and drop-off are at ${tour.facts?.start || 'Bandaranaike International Airport (BIA)'}. We meet you at arrivals and transfer you back for your departure flight.`
    },
    {
      q: 'Do I get the free Colombo City Tour with this package?',
      a: 'Yes. Every Majesty Tours booking includes a complimentary open-top double-decker sightseeing tour of Colombo at no extra cost.'
    },
    extra
  ];
}

function seasonNoteAndMonths(regionKeys) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const best = new Set();
  regionKeys.forEach(key => {
    (SEASON_SCORES[key] || []).forEach((score, i) => { if (score >= 80) best.add(months[i]); });
  });
  return months.filter(m => best.has(m));
}

function renderItineraryDay(day, i) {
  let optionsHtml = '';
  if (Array.isArray(day.options)) {
    optionsHtml = day.options.map(opt => `
      <div class="tour-day-option">
        <b>${esc(opt.label)}</b>
        <ul>${(opt.highlights || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
        ${opt.overnight ? `<span class="tour-overnight">Overnight: ${esc(opt.overnight)}</span>` : ''}
      </div>`).join('');
  }
  return `
    <div class="tour-day">
      <div class="tour-day-num">${i + 1}</div>
      <div class="tour-day-body">
        <h3>${esc(day.day)}: ${esc(day.title)}</h3>
        <p>${esc(day.text)}</p>
        ${Array.isArray(day.highlights) ? `<ul>${day.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        ${optionsHtml}
        ${day.overnight ? `<span class="tour-overnight">Overnight: ${esc(day.overnight)}</span>` : ''}
      </div>
    </div>`;
}

function headBlock({ title, description, canonical, ogImage, robots = 'index, follow', preload = '' }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${robots}">${robots.includes('noindex') ? `
<!-- draft page: excluded from the sitemap and set to noindex until the "draft" flag is cleared in the CMS -->` : ''}

<meta property="og:type" content="website">
<meta property="og:site_name" content="Majesty Tours">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:locale" content="en_US">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">

<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="icon" type="image/png" href="/assets/logo-shield-dark.png">
<link rel="apple-touch-icon" href="/assets/logo-shield-dark.png">
<meta name="theme-color" content="#0e233e">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap"></noscript>
<link rel="stylesheet" href="/assets/legal.css">
<link rel="stylesheet" href="/assets/tours.css">
${preload}
<script src="/assets/tour-page.js" defer></script>

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>`;
}

function siteNav(backHref, backLabel) {
  // The source shield is a 200x200 PNG; CSS draws it at 34px wide with
  // height:auto, so the old width="34" height="41" reserved the wrong
  // box and the full 39KB PNG was fetched on every page.
  return `<nav class="legal-nav">
  <div class="wrap">
    <a href="/" class="legal-logo" aria-label="Majesty Tours home">
      ${picture('assets/logo-shield-dark.png', '', { sizes: '34px', eager: true })}
      <span>
        <span class="name">Majesty Tours</span>
        <span class="tag">Your travel with our care</span>
      </span>
    </a>
    <a href="${backHref}" class="legal-back">${backLabel}</a>
  </div>
</nav>`;
}

function siteFooter() {
  return `<footer class="legal-foot">
  <div class="wrap">
    <span>&copy; 2026 Majesty Tours Sri Lanka. All rights reserved.</span>
    <span class="foot-links">
      <a href="/">Home</a>
      <a href="/tours/">All Tours</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/cancellation">Cancellation Policy</a>
    </span>
  </div>
</footer>`;
}

function whatsappHref(tourName) {
  const text = encodeURIComponent(`Hi Majesty Tours! I'd like to enquire about the ${tourName} tour.`);
  return `https://wa.me/${WHATSAPP}?text=${text}`;
}

/* ---------- per-tour page ---------- */
function buildTourPage(tour, index) {
  const extra = EXTRA[index];
  const canonical = `${SITE_URL}${tourUrl(tour.slug)}`;
  const ogImage = tour.images?.[0] ? `${SITE_URL}/${tour.images[0].image}` : `${SITE_URL}/assets/og-image.jpg`;
  const priceNum = priceNumber(tour.price);
  const relatedIdx = [1, 2].map(off => (index + off) % tours.length);
  const bestMonths = seasonNoteAndMonths(extra.regionKeys);

  const faqs = faqsFor(tour, extra.faqExtra);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristTrip',
        '@id': `${canonical}#trip`,
        name: tour.name,
        description: tour.overview,
        ...(tour.images?.length ? { image: tour.images.slice(0, 6).map(i => `${SITE_URL}/${i.image}`) } : {}),
        touristType: tour.facts?.bestFor ? tour.facts.bestFor.split('•').map(s => s.trim()).filter(Boolean) : undefined,
        itinerary: {
          '@type': 'ItemList',
          itemListElement: (tour.destinationsCovered || []).map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d }))
        },
        offers: {
          '@type': 'Offer',
          price: priceNum,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: canonical
        },
        provider: { '@id': `${SITE_URL}/#agency` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Tours', item: `${SITE_URL}/tours/` },
          { '@type': 'ListItem', position: 3, name: tour.name, item: canonical }
        ]
      },
      faqSchema(faqs),
      agencyNode()
    ]
  };

  const heroSrc = tour.images?.[0]?.image;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({
    title: tour.seo_title, description: tour.meta_description, canonical, ogImage,
    preload: heroSrc ? preloadHero(heroSrc, HERO_SIZES) : ''
  })}
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

${siteNav('/tours/', '← All tours')}

<header class="tour-head">
  <div class="wrap">
    <nav class="tour-crumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span aria-hidden="true">›</span><a href="/tours/">Tours</a><span aria-hidden="true">›</span>${esc(tour.name)}
    </nav>
    <div class="tour-eyebrow">Private tour · Est. 2009</div>
    <h1>${extra.h1}</h1>
    <div class="tour-tags">${esc(tour.tags)}</div>
    <p class="tour-lede">${extra.lede}</p>
    <div class="tour-facts">
      <span class="tour-fact"><b>${esc(tour.price)}</b> per person</span>
      <span class="tour-fact">${esc(tour.duration)}</span>
      <span class="tour-fact">Private vehicle &amp; driver-guide</span>
      <span class="tour-fact">Hotels included</span>
      <span class="tour-fact">Free Colombo City Tour</span>
    </div>
    <div class="tour-cta-row">
      <a class="btn btn-gold" href="${whatsappHref(tour.name)}" target="_blank" rel="noopener noreferrer" data-lead="whatsapp">Enquire on WhatsApp →</a>
      <a class="btn btn-ghost" href="/#contact">Enquire online</a>
    </div>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">

    <section class="tour-section tour-overview">
      <div class="tour-intro">
        <div class="tour-intro-text">
          <h2>Overview</h2>
          <p>${esc(tour.overview)}</p>
          ${tour.whyChoose ? `<p>${esc(tour.whyChoose)}</p>` : ''}
        </div>
        ${heroBlock(heroSrc, captionOf(tour.images, heroSrc, tour.name))}
      </div>
      <h3 class="tour-subhead">What's included</h3>
      <ul class="tour-included-grid">
        ${(tour.inclusions || []).map(i => `<li>${esc(i)}</li>`).join('\n        ')}
      </ul>
    </section>

    ${highlightsBlock(tour.highlights)}

    ${tourFactsBlock(tour)}

    ${galleryBlock(withoutHero(tour.images, heroSrc), tour.name)}

    <section class="tour-section tour-itinerary">
      <h2>Day-by-day itinerary</h2>
      ${tour.itinerary.map(renderItineraryDay).join('\n      ')}
    </section>

    ${seasonBlock(extra.seasonNote, bestMonths)}

    ${faqBlock(faqs)}

    ${relatedBlock(relatedIdx.map(ri => {
      const rt = tours[ri];
      return { href: tourUrl(rt.slug), name: rt.name, meta: `${rt.price} · ${rt.duration}` };
    }))}

    ${ctaBand(tour.name, whatsappHref(tour.name))}

  </div>
</main>

${siteFooter()}

</body>
</html>
`;
  return html;
}

/* ---------- /tours/ index page ---------- */
const CARD_SIZES = '(max-width:640px) 92vw, 280px';

function hubCard(href, name, tags, meta, image, caption, eager = false) {
  return `<a class="tours-index-card" href="${href}">
        ${image ? `<div class="tic-media">${picture(image, caption || name, { sizes: CARD_SIZES, eager })}</div>` : ''}
        <div class="tic-body">
          <h3>${esc(name)}</h3>
          ${tags ? `<div class="tic-tags">${esc(tags)}</div>` : ''}
          <div class="tic-meta"><span>${esc(meta.left)}</span><span>${esc(meta.right)}</span></div>
        </div>
      </a>`;
}

function buildToursIndexPage() {
  const canonical = `${SITE_URL}/tours/`;
  const description = 'Every Majesty Tours itinerary in one place: seven private multi-day tours, four day trips from Colombo, whale watching, tea tastings and transfers.';
  const title = 'Sri Lanka Tours & Day Trips | Majesty Tours';
  const heroSrc = tours[0]?.images?.[0]?.image;
  const ogImage = `${SITE_URL}/assets/og-image.jpg`;

  const published = group => ALL_PRODUCTS.filter(p => p.group === group && !p.item.draft);
  const dayTrips = published('dayTrips');
  const experiences = published('experiences');
  const combos = published('extendedTours');

  const listed = [
    ...tours.map(t => ({ url: `${SITE_URL}${tourUrl(t.slug)}`, name: t.name })),
    ...combos.map(p => ({ url: `${SITE_URL}${p.href}`, name: p.item.name })),
    ...dayTrips.map(p => ({ url: `${SITE_URL}${p.href}`, name: p.item.name })),
    ...experiences.map(p => ({ url: `${SITE_URL}${p.href}`, name: p.item.name }))
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Tours', item: canonical }
        ]
      },
      {
        '@type': 'ItemList',
        itemListElement: listed.map((t, i) => ({
          '@type': 'ListItem', position: i + 1, url: t.url, name: t.name
        }))
      },
      agencyNode()
    ]
  };

  const tourCards = tours.map((t, i) => hubCard(
    tourUrl(t.slug), t.name, t.tags,
    { left: t.price, right: t.duration },
    t.images?.[0]?.image, t.images?.[0]?.caption, i < 2
  )).join('\n      ');

  const productCards = list => list.map(p => hubCard(
    p.href, p.item.name, p.item.tags,
    { left: p.item.price || 'Priced on request', right: p.item.duration || 'Private' },
    p.item.heroImage || p.item.images?.[0]?.image,
    p.item.images?.[0]?.caption
  )).join('\n      ');

  const section = (id, heading, lede, cards) => cards ? `<section class="tour-section" id="${id}">
      <h2>${esc(heading)}</h2>
      <p class="hub-lede">${esc(lede)}</p>
      <div class="tours-index-grid">
      ${cards}
      </div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title, description, canonical, ogImage, preload: heroSrc ? preloadHero(heroSrc, CARD_SIZES) : '' })}
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

${siteNav('/', '← Back to site')}

<header class="tour-head">
  <div class="wrap">
    <nav class="tour-crumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span aria-hidden="true">›</span>Tours
    </nav>
    <div class="tour-eyebrow">Private tours · Est. 2009</div>
    <h1>Sri Lanka Private Tours &amp; Day Trips</h1>
    <p class="tour-lede">Everything we run, in one place: multi-day journeys, day trips out of Colombo, and standalone experiences. Every one of them is private, with your own vehicle and driver-guide, and every itinerary can be reshaped around your dates and interests.</p>
    <nav class="hub-jump" aria-label="Jump to a section">
      <a href="#multi-day">Multi-day tours</a>
      ${combos.length ? '<a href="#combinations">Longer combinations</a>' : ''}
      ${dayTrips.length ? '<a href="#day-trips">Day trips</a>' : ''}
      ${experiences.length ? '<a href="#experiences">Experiences</a>' : ''}
    </nav>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">
    ${section('multi-day', 'Multi-day private tours', 'Seven sample routes with hotels, daily breakfast and dinner, and a chauffeur guide throughout. Each one is a starting point. Tell us what you would change.', tourCards)}

    ${section('combinations', 'Longer combinations', 'Two of the routes above, sequenced back to back so the driving makes sense and nothing repeats.', productCards(combos))}

    ${section('day-trips', 'Day trips from Colombo', 'Out and back in a day, with a private vehicle, a chauffeur guide, entrance fees and lunch included.', productCards(dayTrips))}

    ${section('experiences', 'Experiences & transfers', 'Single experiences and transport, arranged on their own, with no multi-day booking required.', productCards(experiences))}

    <div class="tour-cta-band">
      <h2>Not sure which one fits?</h2>
      <p>Tell us how long you have, when you're travelling and what you'd like to see, and we'll put a route together and quote it.</p>
      <div class="tour-cta-row">
        <a class="btn btn-gold" href="${whatsappHref('Sri Lanka')}" target="_blank" rel="noopener noreferrer" data-lead="whatsapp">Ask us on WhatsApp →</a>
        <a class="btn btn-ghost" href="/#contact">Enquire online</a>
      </div>
    </div>
  </div>
</main>

${siteFooter()}

</body>
</html>
`;
}

/* ---------- Phase 3: day-trip / experience / combination pages ---------- */
function findTour(slug) { return tours.find(t => t.slug === slug); }

const productMeta = item => (item.price && item.duration)
  ? `${item.price} · ${item.duration}`
  : (item.duration || 'Priced on request');

/* The related tour first, then a couple of siblings from the same
   section so every product page links onward to two or three others. */
function relatedCardsFor(item) {
  const cards = [];
  const rt = item.relatedTourSlug && findTour(item.relatedTourSlug);
  if (rt) cards.push({ href: tourUrl(rt.slug), name: rt.name, meta: `${rt.price} · ${rt.duration}` });

  const self = productFor(item);
  const siblings = ALL_PRODUCTS
    .filter(p => p.item !== item && !p.item.draft && p.group === self?.group)
    .slice(0, cards.length ? 2 : 3);
  for (const s of siblings) cards.push({ href: s.href, name: s.item.name, meta: productMeta(s.item) });
  return cards;
}

function draftFactsRow(item) {
  // No price/duration on file (day trips & experiences): priced on request,
  // point straight to WhatsApp rather than showing a placeholder figure.
  if (!item.price && !item.duration) {
    return `<div class="tour-facts">
      <span class="tour-fact">Private vehicle &amp; driver-guide</span>
      <span class="tour-fact">Priced on request</span>
    </div>
    <p class="price-note">Price and duration depend on group size, season and exact stops. Message us on WhatsApp for a personal quote.</p>`;
  }
  // Price/duration on file (the combination tours: real sums of published prices).
  const notes = [item.priceNote, item.durationNote].filter(Boolean);
  return `<div class="tour-facts">
      <span class="tour-fact">${esc(item.price)}</span>
      <span class="tour-fact">${esc(item.duration)}</span>
      <span class="tour-fact">Private vehicle &amp; driver-guide</span>
    </div>
    ${notes.length ? `<p class="price-note">${notes.map(esc).join(' ')}</p>` : ''}`;
}

function inclusionsList(inclusions) {
  const items = inclusions?.length ? inclusions : ['TODO(owner): confirm what’s included (vehicle, guide, entrance fees, meals?)'];
  return items.map(i => {
    const isTodo = /^TODO\(owner\)/.test(i);
    return `<li${isTodo ? ' class="todo-item"' : ''}>${esc(i)}</li>`;
  }).join('\n        ');
}

const EYEBROW_BY_PREFIX = { 'day-trips': 'Day trip', experiences: 'Experience', tours: 'Tour' };

function buildSimplePage(item, urlPrefixDefault) {
  const urlPrefix = item.urlPrefix || urlPrefixDefault;
  const canonical = `${SITE_URL}/${urlPrefix}/${item.slug}/`;
  const ogImage = item.images?.[0] ? `${SITE_URL}/${item.images[0].image}` : `${SITE_URL}/assets/og-image.jpg`;
  const related = item.relatedTourSlug ? findTour(item.relatedTourSlug) : null;
  const robots = item.draft ? 'noindex, follow' : 'index, follow';

  const heroSrc = item.heroImage || item.images?.[0]?.image;
  const itineraryHeading = urlPrefix === 'day-trips' ? 'How the day runs' : 'What to expect';

  const jsonLdGraph = [
    {
      '@type': 'TouristTrip',
      name: item.name,
      description: item.overview,
      ...(item.images?.length ? { image: item.images.slice(0, 6).map(i => `${SITE_URL}/${i.image}`) } : {}),
      ...(item.itinerary?.length ? {
        itinerary: {
          '@type': 'ItemList',
          itemListElement: item.itinerary.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.title }))
        }
      } : {}),
      ...(item.price ? {
        offers: {
          '@type': 'Offer',
          price: priceNumber(item.price),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: canonical
        }
      } : {}),
      provider: { '@id': `${SITE_URL}/#agency` }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Tours', item: `${SITE_URL}/tours/` },
        { '@type': 'ListItem', position: 3, name: item.name, item: canonical }
      ]
    },
    ...(item.faqs?.length ? [faqSchema(item.faqs)] : []),
    agencyNode()
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({
    title: item.seo_title, description: item.meta_description, canonical, ogImage, robots,
    preload: heroSrc ? preloadHero(heroSrc, HERO_SIZES) : ''
  })}
${item.draft ? '' : `<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph }, null, 2)}
</script>`}
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

${siteNav('/tours/', '← All tours')}

<header class="tour-head">
  <div class="wrap">
    <nav class="tour-crumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span aria-hidden="true">›</span><a href="/tours/">Tours</a><span aria-hidden="true">›</span>${esc(item.name)}
    </nav>
    <div class="tour-eyebrow">${EYEBROW_BY_PREFIX[urlPrefix] || 'Experience'} · Est. 2009</div>
    <h1>${esc(item.name)}</h1>
    <div class="tour-tags">${esc(item.tags)}</div>
    ${draftFactsRow(item)}
    <div class="tour-cta-row">
      <a class="btn btn-gold" href="${whatsappHref(item.name)}" target="_blank" rel="noopener noreferrer" data-lead="whatsapp">Enquire on WhatsApp →</a>
      <a class="btn btn-ghost" href="/#contact">Enquire online</a>
    </div>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">

    ${item.draft ? `<div class="draft-banner"><strong>Draft page, not yet published.</strong> This page is set to <code>noindex</code> and left out of the sitemap. Fill in the TODOs below in the CMS (Day Trips / Experiences), then uncheck &ldquo;Draft&rdquo; to publish.</div>` : ''}

    <section class="tour-section tour-overview">
      <div class="tour-intro">
        <div class="tour-intro-text">
          <h2>Overview</h2>
          <p>${esc(item.overview)}</p>
        </div>
        ${heroBlock(heroSrc, captionOf(item.images, heroSrc, item.name))}
      </div>
      <h3 class="tour-subhead">What's included</h3>
      <ul class="tour-included-grid">
        ${inclusionsList(item.inclusions)}
      </ul>
    </section>

    ${highlightsBlock(item.highlights, 'Highlights')}

    ${item.itinerary?.length ? `<section class="tour-section tour-itinerary">
      <h2>${esc(itineraryHeading)}</h2>
      ${item.itinerary.map(renderItineraryDay).join('\n      ')}
    </section>` : ''}

    ${galleryBlock(withoutHero(item.images, heroSrc), item.name)}

    ${fleetBlock(item.fleet)}

    ${practicalBlock(item.practical)}

    ${seasonBlock(item.bestTime)}

    ${faqBlock(item.faqs)}

    ${relatedBlock(relatedCardsFor(item), related ? 'Related tour' : 'You might also like')}

    ${ctaBand(item.name, whatsappHref(item.name))}

  </div>
</main>

${siteFooter()}

</body>
</html>
`;
  return html;
}

const PART_LABELS = ['Part one', 'Part two', 'Part three', 'Part four'];

/* A combination page is built from its component tours rather than
   from copy written twice: the itinerary, gallery and inclusions below
   are all pulled straight out of the published routes it combines, so
   editing a component tour updates every combination that uses it. */
function comboGallery(components, limit = 16) {
  const lists = components.map(c => [...(c.images || [])]);
  const out = [];
  while (out.length < limit && lists.some(l => l.length)) {
    for (const list of lists) {
      if (!list.length || out.length >= limit) continue;
      out.push(list.shift());
    }
  }
  return out;
}

function comboInclusions(components) {
  const seen = new Set();
  const out = [];
  for (const c of components) {
    for (const inc of c.inclusions || []) {
      // "4 Nights Accommodation" differs per component, so keep the generic
      // wording once rather than listing contradictory night counts.
      const key = inc.replace(/^\d+\s+/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(/^\d+\s+Nights?\s+Accommodation/i.test(inc) ? 'Accommodation Throughout' : inc);
    }
  }
  return out;
}

function comboFaqs(item, components) {
  const names = components.map(c => c.name);
  const list = names.length === 2 ? `${names[0]} and ${names[1]}` : names.join(', ');
  const faqs = [
    {
      q: `Is ${item.name} a private tour?`,
      a: `Yes. Like every Majesty Tours itinerary, it is private throughout: your own air-conditioned vehicle and English-speaking chauffeur guide, with no other travellers on your schedule.`
    },
    {
      q: 'How is this itinerary put together?',
      a: `It combines two routes we already run and publish in full: ${list}. Rather than invent a new itinerary, we sequence those proven routes back to back so the driving makes geographic sense and nothing is repeated.`
    },
    {
      q: 'Can I change the order or swap a section?',
      a: 'Yes. The component routes are the starting point, not a fixed package. Swap one for another of our tours, add or drop a region, or change the pace. Tell us what you have in mind when you enquire.'
    }
  ];
  if (item.price && item.priceNote) {
    faqs.push({
      q: 'How is the price calculated?',
      a: `${item.priceNote} The final quote depends on your dates, party size and hotel category, and we confirm it before anything is booked.`
    });
  }
  if (item.durationNote) {
    faqs.push({ q: 'How many days is it exactly?', a: item.durationNote });
  } else {
    faqs.push({
      q: 'What happens on the day the two routes join?',
      a: 'The join becomes a single travel day rather than a departure and a fresh arrival, so you do not go back to the airport in the middle of the trip. That is the one day we adjust when sequencing the plan around your dates.'
    });
  }
  faqs.push({
    q: 'Are hotels included?',
    a: 'Yes. Accommodation is included throughout, along with daily breakfast and dinner, the private vehicle and chauffeur guide, fuel, parking, highway tolls and government taxes.'
  });
  return faqs;
}

function buildCombinationPage(item) {
  const canonical = `${SITE_URL}/tours/${item.slug}/`;
  const components = (item.componentSlugs || []).map(findTour).filter(Boolean);
  const images = item.images?.length ? item.images : comboGallery(components);
  const heroSrc = item.heroImage || images[0]?.image;
  const ogImage = heroSrc ? `${SITE_URL}/${heroSrc}` : `${SITE_URL}/assets/og-image.jpg`;
  const robots = item.draft ? 'noindex, follow' : 'index, follow';
  const inclusions = comboInclusions(components);
  const faqs = comboFaqs(item, components);

  const destinations = [...new Set(components.flatMap(c => c.destinationsCovered || []))];

  const jsonLdGraph = [
    {
      '@type': 'TouristTrip',
      name: item.name,
      description: item.overview,
      ...(images.length ? { image: images.slice(0, 6).map(i => `${SITE_URL}/${i.image}`) } : {}),
      ...(destinations.length ? {
        itinerary: {
          '@type': 'ItemList',
          itemListElement: destinations.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d }))
        }
      } : {}),
      ...(item.price ? {
        offers: {
          '@type': 'Offer',
          price: priceNumber(item.price),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: canonical
        }
      } : {}),
      provider: { '@id': `${SITE_URL}/#agency` }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Tours', item: `${SITE_URL}/tours/` },
        { '@type': 'ListItem', position: 3, name: item.name, item: canonical }
      ]
    },
    faqSchema(faqs),
    agencyNode()
  ];

  // Days are renumbered continuously across the components so the
  // circles read 1..n over the whole trip rather than restarting.
  let dayCounter = 0;
  const parts = components.map((c, ci) => {
    const days = (c.itinerary || []).map(d => {
      const n = ++dayCounter;
      return renderItineraryDay({ ...d, day: `Day ${n}` }, n - 1);
    }).join('\n        ');
    return `<div class="tour-combo-part">
        <div class="combo-part-head">
          <span class="combo-part-num">${PART_LABELS[ci] || `Part ${ci + 1}`}</span>
          <h3>${esc(c.name)}</h3>
          <span class="combo-part-meta">${esc(c.duration)}</span>
          <a class="combo-part-link" href="${tourUrl(c.slug)}">See the full route →</a>
        </div>
        ${days}
      </div>`;
  }).join('\n      ');

  const relatedCards = [
    ...components.map(c => ({ href: tourUrl(c.slug), name: c.name, meta: `${c.price} · ${c.duration}` })),
    ...ALL_PRODUCTS
      .filter(p => p.group === 'extendedTours' && p.item !== item && !p.item.draft)
      .slice(0, 2)
      .map(p => ({ href: p.href, name: p.item.name, meta: productMeta(p.item) }))
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({
    title: item.seo_title, description: item.meta_description, canonical, ogImage, robots,
    preload: heroSrc ? preloadHero(heroSrc, HERO_SIZES) : ''
  })}
${item.draft ? '' : `<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph }, null, 2)}
</script>`}
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

${siteNav('/tours/', '← All tours')}

<header class="tour-head">
  <div class="wrap">
    <nav class="tour-crumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span aria-hidden="true">›</span><a href="/tours/">Tours</a><span aria-hidden="true">›</span>${esc(item.name)}
    </nav>
    <div class="tour-eyebrow">Private tour · Suggested combination</div>
    <h1>${esc(item.name)}</h1>
    <div class="tour-tags">${esc(item.tags)}</div>
    ${item.lede ? `<p class="tour-lede">${esc(item.lede)}</p>` : ''}
    ${draftFactsRow(item)}
    <div class="tour-cta-row">
      <a class="btn btn-gold" href="${whatsappHref(item.name)}" target="_blank" rel="noopener noreferrer" data-lead="whatsapp">Enquire on WhatsApp →</a>
      <a class="btn btn-ghost" href="/#contact">Enquire online</a>
    </div>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">

    ${item.draft ? `<div class="draft-banner"><strong>Draft page, not yet published.</strong> This is a suggested combination of existing tours, not a confirmed product. This page is set to <code>noindex</code> and left out of the sitemap. Confirm final routing, hotel nights and combined pricing in the CMS (Extended / Combination Tours), then uncheck &ldquo;Draft&rdquo; to publish.</div>` : ''}

    <section class="tour-section tour-overview">
      <div class="tour-intro">
        <div class="tour-intro-text">
          <h2>Overview</h2>
          <p>${esc(item.overview)}</p>
        </div>
        ${heroBlock(heroSrc, captionOf(images, heroSrc, item.name))}
      </div>
      ${components.length ? `<h3 class="tour-subhead">Built from these routes</h3>
      <div class="tour-component-list">
        ${components.map(c => `<a href="${tourUrl(c.slug)}">${esc(c.name)} (${esc(c.duration)})</a>`).join('\n        ')}
      </div>` : ''}
      ${inclusions.length ? `<h3 class="tour-subhead">What's included</h3>
      <ul class="tour-included-grid">
        ${inclusions.map(i => `<li>${esc(i)}</li>`).join('\n        ')}
      </ul>` : ''}
    </section>

    ${highlightsBlock(item.whyThis, 'Why this combination')}

    ${destinations.length ? `<section class="tour-section tour-practical">
      <h2>Destinations covered</h2>
      <ul class="tour-chip-list">
        ${destinations.map(d => `<li>${esc(d)}</li>`).join('\n        ')}
      </ul>
    </section>` : ''}

    ${parts ? `<section class="tour-section tour-itinerary">
      <h2>The itinerary, route by route</h2>
      <p>These are the published routes this trip is built from, in the order we would run them. When we sequence them around your dates the join between the two becomes a single travel day rather than a departure and a fresh arrival.</p>
      ${parts}
    </section>` : ''}

    ${galleryBlock(withoutHero(images, heroSrc), item.name)}

    ${highlightsBlock(item.addOns, 'Romantic add-ons, on request')}

    ${seasonBlock(item.bestTime)}

    ${faqBlock(faqs)}

    ${relatedBlock(relatedCards, 'Related tours')}

    ${ctaBand(item.name, whatsappHref(item.name))}

  </div>
</main>

${siteFooter()}

</body>
</html>
`;
  return html;
}

/* ---------- write files ---------- */
function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

const toursDir = join(ROOT, 'tours');
ensureDir(toursDir);

const generatedUrls = [];

tours.forEach((tour, i) => {
  const dir = join(toursDir, tour.slug);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), buildTourPage(tour, i));
  generatedUrls.push(`/tours/${tour.slug}/`);
  console.log('wrote', `tours/${tour.slug}/index.html`);
});

writeFileSync(join(toursDir, 'index.html'), buildToursIndexPage());
generatedUrls.push('/tours/');
console.log('wrote', 'tours/index.html');

/* Phase 3: day trips, experiences, extended/combination tours.
   All start life with draft:true (noindex, excluded from sitemap) until
   the owner fills in the TODOs and unchecks Draft in the CMS. */
const publishedUrls = []; // non-draft Phase 3 pages only, for the sitemap

(content.dayTrips || []).forEach(item => {
  const prefix = item.urlPrefix || 'day-trips';
  const dir = join(ROOT, prefix, item.slug);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), buildSimplePage(item, 'day-trips'));
  generatedUrls.push(`/${prefix}/${item.slug}/`);
  if (!item.draft) publishedUrls.push({ loc: `/${prefix}/${item.slug}/`, changefreq: 'monthly', priority: '0.6' });
  console.log('wrote', `${prefix}/${item.slug}/index.html`, item.draft ? '(draft, noindex)' : '(published)');
});

(content.experiences || []).forEach(item => {
  const prefix = item.urlPrefix || 'experiences';
  const dir = join(ROOT, prefix, item.slug);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), buildSimplePage(item, 'experiences'));
  generatedUrls.push(`/${prefix}/${item.slug}/`);
  if (!item.draft) publishedUrls.push({ loc: `/${prefix}/${item.slug}/`, changefreq: 'monthly', priority: '0.6' });
  console.log('wrote', `${prefix}/${item.slug}/index.html`, item.draft ? '(draft, noindex)' : '(published)');
});

(content.extendedTours || []).forEach(item => {
  const dir = join(toursDir, item.slug);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), buildCombinationPage(item));
  generatedUrls.push(`/tours/${item.slug}/`);
  if (!item.draft) publishedUrls.push({ loc: `/tours/${item.slug}/`, changefreq: 'monthly', priority: '0.7' });
  console.log('wrote', `tours/${item.slug}/index.html`, item.draft ? '(draft, noindex)' : '(published)');
});

/* ---------- sitemap.xml ---------- */

/* The legal pages print their own effective date ("Last updated: 23 July
   2026"). Read lastmod straight off that line instead of hardcoding it,
   so the sitemap and the visible date can never disagree and neither
   goes stale when the other is edited. A reworded clause changes both;
   a typo or punctuation fix changes neither, which is the behaviour
   Google's lastmod is meant to have. */
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'];

function publishedDateOf(file, fallback) {
  try {
    const html = readFileSync(join(ROOT, file), 'utf8');
    const m = html.match(/class="legal-updated">\s*Last updated:\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (!m) return fallback;
    const month = MONTHS.indexOf(m[2].toLowerCase());
    if (month < 0) return fallback;
    return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  } catch { return fallback; }
}

/* The homepage has no such marker, so this is bumped by hand when its
   content actually changes. It is not TODAY: that would re-date the
   homepage on every deploy and make the signal worthless. */
const HOME_LASTMOD = '2026-09-17';

const staticEntries = [
  { loc: '/', changefreq: 'weekly', priority: '1.0', lastmod: HOME_LASTMOD },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3', lastmod: publishedDateOf('privacy.html', '2026-07-23') },
  { loc: '/terms', changefreq: 'yearly', priority: '0.3', lastmod: publishedDateOf('terms.html', '2026-07-23') },
  { loc: '/cancellation', changefreq: 'yearly', priority: '0.3', lastmod: publishedDateOf('cancellation.html', '2026-07-23') }
  // register.html intentionally omitted: it's a partner registration page, not a
  // booking page, so it's left indexable (robots.txt/meta unchanged) but out of the sitemap.
];
const tourEntries = [
  { loc: '/tours/', changefreq: 'weekly', priority: '0.9', lastmod: TODAY },
  ...tours.map(t => ({ loc: `/tours/${t.slug}/`, changefreq: 'monthly', priority: '0.8', lastmod: TODAY }))
];
const allEntries = [...staticEntries, ...tourEntries, ...publishedUrls.map(e => ({ ...e, lastmod: TODAY }))];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.map(e => `  <url>
    <loc>${SITE_URL}${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemapXml);
console.log('wrote sitemap.xml with', allEntries.length, 'URLs');

console.log(`\nDone. Generated ${generatedUrls.length} pages.`);
