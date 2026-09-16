#!/usr/bin/env node
/* ============================================================
   Majesty Tours — static tour page generator
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

/* ---------- helpers ---------- */
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
      a: 'Your chauffeur guide accompanies you throughout and can guide the Sigiriya climb, though the pace up the rock is entirely yours — there’s no fixed group schedule.'
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
    lede: 'A 3-day private safari and coastal escape — choose Udawalawe’s elephant herds or Yala’s leopards — with your own driver-guide and hotels arranged throughout.',
    regionKeys: ['coast'],
    seasonNote: 'Both Udawalawe and the southern coast are driest and best for game viewing from December to March, with Yala’s block-one section typically closed for its annual break in September.',
    faqExtra: {
      q: 'Can I choose between Udawalawe and Yala National Park?',
      a: 'Yes — Day 2 can be arranged at either park: Udawalawe for reliably large wild elephant herds, or Yala for one of the world’s highest leopard densities. Let us know your preference when you enquire.'
    }
  },
  { // 3 Southern Coast
    h1: 'Southern Coast Private Tour: Galle, Mirissa &amp; Unawatuna',
    lede: 'A 3-day private coastal journey through mangroves, Galle Fort, whale watching in Mirissa and the beaches of Unawatuna, with your own driver-guide and hotels arranged throughout.',
    regionKeys: ['coast'],
    seasonNote: 'The south coast is driest and calmest from December to March — also peak season for whale watching out of Mirissa.',
    faqExtra: {
      q: 'Is whale watching guaranteed?',
      a: 'Sightings on any single trip are never guaranteed since these are wild animals, but Mirissa’s December–April season has some of the most consistent blue whale and spinner dolphin sightings in the world.'
    }
  },
  { // 4 East Coast Escape
    h1: 'East Coast Private Tour: Trincomalee, Pigeon Island &amp; Pasikuda',
    lede: 'A 4-day private journey to Sri Lanka’s quieter East Coast — whale watching, Koneswaram Temple, coral reefs and white-sand beaches — with your own driver-guide and hotels arranged throughout.',
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
    seasonNote: 'Arugam Bay’s surf season runs May to September, the same dry stretch that favours the whole East Coast — outside those months the swell and weather are far less reliable.',
    faqExtra: {
      q: 'Do I need to be an experienced surfer?',
      a: 'No — Arugam Bay has breaks and board/lesson arrangements suited to beginners as well as its famous experienced-surfer points; let us know your level when you enquire.'
    }
  },
  { // 6 Grand Island
    h1: 'The Grand Island: 14-Day Private Tour of Sri Lanka',
    lede: 'The complete island, coast to summit: culture, tea country, wildlife safari, whales and both coastlines on one carefully sequenced 14-day private journey.',
    regionKeys: ['culture', 'hill', 'coast', 'trinco'],
    seasonNote: 'Because this itinerary crosses both monsoon zones, some stretch of it is in season whenever you travel — we sequence the East Coast days into the May–September window and the west/south/hill country days into December–March where your dates allow.',
    faqExtra: {
      q: 'Is 14 days enough to see all of this without feeling rushed?',
      a: 'Yes — this itinerary is deliberately sequenced to avoid backtracking and repeated experiences, with two or more nights in most stops so each region gets unhurried time rather than a checklist pace.'
    }
  }
];

/* Real, already-published seasonal fit data (same source as the homepage's
   "When to go" widget in app.js) — reused here rather than re-invented. */
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
      a: `Yes. Every Majesty Tours itinerary, including ${tour.name}, is private — your own air-conditioned vehicle and English-speaking chauffeur guide, with no other travellers on your schedule.`
    },
    {
      q: 'Can I customise this itinerary?',
      a: 'Yes. This is a sample itinerary — the route, pace, hotel category and stops can all be adjusted to your interests and travel dates. Tell us what you’d like changed when you enquire.'
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
      a: 'Yes — every Majesty Tours booking includes a complimentary open-top double-decker sightseeing tour of Colombo at no extra cost.'
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

function headBlock({ title, description, canonical, ogImage, robots = 'index, follow' }) {
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
  return `<nav class="legal-nav">
  <div class="wrap">
    <a href="/index.html" class="legal-logo" aria-label="Majesty Tours home">
      <img src="/assets/logo-shield-dark.png" alt="" width="34" height="41">
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
      <a href="/index.html">Home</a>
      <a href="/tours/">All Tours</a>
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
      <a href="/cancellation.html">Cancellation Policy</a>
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
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
      }
    ]
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title: tour.seo_title, description: tour.meta_description, canonical, ogImage })}
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
      <a href="/index.html">Home</a><span aria-hidden="true">›</span><a href="/tours/">Tours</a><span aria-hidden="true">›</span>${esc(tour.name)}
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
      <a class="btn btn-gold" href="${whatsappHref(tour.name)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp →</a>
      <a class="btn btn-ghost" href="/index.html#contact">Enquire online</a>
    </div>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">

    <section class="tour-section tour-overview">
      <h2>Overview</h2>
      <p>${esc(tour.overview)}</p>
      <ul class="tour-included-grid">
        ${(tour.inclusions || []).map(i => `<li>${esc(i)}</li>`).join('\n        ')}
      </ul>
    </section>

    ${tour.images?.length ? `<section class="tour-section tour-gallery">
      <h2>Gallery</h2>
      <div class="tour-gallery-grid">
        ${tour.images.map(img => `<img src="/${img.image}" alt="${esc(img.caption || tour.name)}" loading="lazy" width="400" height="300">`).join('\n        ')}
      </div>
    </section>` : ''}

    <section class="tour-section tour-itinerary">
      <h2>Day-by-day itinerary</h2>
      ${tour.itinerary.map(renderItineraryDay).join('\n      ')}
    </section>

    <section class="tour-section tour-season">
      <h2>Best time to go</h2>
      <div class="tour-season-box">
        <p>${extra.seasonNote}</p>
        ${bestMonths.length ? `<p><strong>Best months for this route:</strong> ${bestMonths.join(', ')}.</p>` : ''}
      </div>
    </section>

    <section class="tour-section tour-faq">
      <h2>Frequently asked questions</h2>
      ${faqs.map(f => `<details>
        <summary>${esc(f.q)}</summary>
        <p>${f.a.replace(/&/g, '&amp;')}</p>
      </details>`).join('\n      ')}
    </section>

    <section class="tour-section tour-related">
      <h2>Related tours</h2>
      <div class="tour-related-grid">
        ${relatedIdx.map(ri => {
          const rt = tours[ri];
          return `<a class="tour-related-card" href="${tourUrl(rt.slug)}">
          <h3>${esc(rt.name)}</h3>
          <div class="rel-meta">${esc(rt.price)} · ${esc(rt.duration)}</div>
        </a>`;
        }).join('\n        ')}
      </div>
    </section>

    <div class="tour-cta-band">
      <h2>Ready to plan ${esc(tour.name)}?</h2>
      <p>Tell us your travel dates and we'll confirm availability and a final quote.</p>
      <div class="tour-cta-row">
        <a class="btn btn-gold" href="${whatsappHref(tour.name)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp →</a>
        <a class="btn btn-ghost" href="/index.html#contact">Enquire online</a>
      </div>
    </div>

  </div>
</main>

${siteFooter()}

</body>
</html>
`;
  return html;
}

/* ---------- /tours/ index page ---------- */
function buildToursIndexPage() {
  const canonical = `${SITE_URL}/tours/`;
  const description = 'Seven private, fully customisable Sri Lanka tour packages: the cultural triangle, hill country and tea, wildlife safaris, both coasts, Arugam Bay surf and the 14-day Grand Island. Hotels and a driver-guide included throughout.';
  const title = 'Sri Lanka Private Tour Packages | Majesty Tours';
  const ogImage = `${SITE_URL}/assets/og-image.jpg`;

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
        itemListElement: tours.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}${tourUrl(t.slug)}`,
          name: t.name
        }))
      }
    ]
  };

  const cards = tours.map(t => `<a class="tours-index-card" href="${tourUrl(t.slug)}">
        <h2>${esc(t.name)}</h2>
        <div class="tic-tags">${esc(t.tags)}</div>
        <div class="tic-meta"><span>${esc(t.price)}</span><span>${esc(t.duration)}</span></div>
      </a>`).join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title, description, canonical, ogImage })}
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

${siteNav('/index.html', '← Back to site')}

<header class="tour-head">
  <div class="wrap">
    <nav class="tour-crumb" aria-label="Breadcrumb">
      <a href="/index.html">Home</a><span aria-hidden="true">›</span>Tours
    </nav>
    <div class="tour-eyebrow">Private tours · Est. 2009</div>
    <h1>Sri Lanka Private Tour Packages</h1>
    <p class="tour-lede">Seven sample routes, each fully customisable to your pace and interests — every journey is private, with your own vehicle, driver-guide and hotels included throughout.</p>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">
    <section class="tour-section">
      <div class="tours-index-grid">
      ${cards}
      </div>
    </section>
  </div>
</main>

${siteFooter()}

</body>
</html>
`;
}

/* ---------- Phase 3: draft day-trip / experience pages ---------- */
function findTour(slug) { return tours.find(t => t.slug === slug); }

function draftFactsRow(item) {
  return `<div class="tour-facts">
      <span class="tour-fact todo-chip">${item.price ? esc(item.price) : 'TODO(owner): price'}</span>
      <span class="tour-fact todo-chip">${item.duration ? esc(item.duration) : 'TODO(owner): duration'}</span>
      <span class="tour-fact">Private vehicle &amp; driver-guide</span>
    </div>`;
}

function buildSimplePage(item, urlPrefix) {
  const canonical = `${SITE_URL}/${urlPrefix}/${item.slug}/`;
  const ogImage = `${SITE_URL}/assets/og-image.jpg`;
  const related = item.relatedTourSlug ? findTour(item.relatedTourSlug) : null;
  const robots = item.draft ? 'noindex, follow' : 'index, follow';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title: item.seo_title, description: item.meta_description, canonical, ogImage, robots })}
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

${siteNav('/tours/', '← All tours')}

<header class="tour-head">
  <div class="wrap">
    <nav class="tour-crumb" aria-label="Breadcrumb">
      <a href="/index.html">Home</a><span aria-hidden="true">›</span><a href="/tours/">Tours</a><span aria-hidden="true">›</span>${esc(item.name)}
    </nav>
    <div class="tour-eyebrow">${urlPrefix === 'day-trips' ? 'Day trip' : 'Experience'} · Est. 2009</div>
    <h1>${esc(item.name)}</h1>
    <div class="tour-tags">${esc(item.tags)}</div>
    ${draftFactsRow(item)}
    <div class="tour-cta-row">
      <a class="btn btn-gold" href="${whatsappHref(item.name)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp →</a>
      <a class="btn btn-ghost" href="/index.html#contact">Enquire online</a>
    </div>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">

    ${item.draft ? `<div class="draft-banner"><strong>Draft page — not yet published.</strong> This page is set to <code>noindex</code> and left out of the sitemap. Fill in the TODOs below in the CMS (Day Trips / Experiences), then uncheck &ldquo;Draft&rdquo; to publish.</div>` : ''}

    <section class="tour-section tour-overview">
      <h2>Overview</h2>
      <p>${esc(item.overview)}</p>
      <ul class="tour-included-grid todo-list">
        ${(item.inclusions?.length ? item.inclusions.map(i => `<li>${esc(i)}</li>`) : ['<li>TODO(owner): confirm what’s included (vehicle, guide, entrance fees, meals?)</li>']).join('\n        ')}
      </ul>
    </section>

    ${related ? `<section class="tour-section tour-related">
      <h2>Related tour</h2>
      <div class="tour-related-grid">
        <a class="tour-related-card" href="${tourUrl(related.slug)}">
          <h3>${esc(related.name)}</h3>
          <div class="rel-meta">${esc(related.price)} · ${esc(related.duration)}</div>
        </a>
      </div>
    </section>` : ''}

    <div class="tour-cta-band">
      <h2>Ready to plan ${esc(item.name)}?</h2>
      <p>Tell us your travel dates and we'll confirm availability and a final quote.</p>
      <div class="tour-cta-row">
        <a class="btn btn-gold" href="${whatsappHref(item.name)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp →</a>
        <a class="btn btn-ghost" href="/index.html#contact">Enquire online</a>
      </div>
    </div>

  </div>
</main>

${siteFooter()}

</body>
</html>
`;
  return html;
}

function buildCombinationPage(item) {
  const canonical = `${SITE_URL}/tours/${item.slug}/`;
  const ogImage = `${SITE_URL}/assets/og-image.jpg`;
  const components = (item.componentSlugs || []).map(findTour).filter(Boolean);
  const robots = item.draft ? 'noindex, follow' : 'index, follow';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title: item.seo_title, description: item.meta_description, canonical, ogImage, robots })}
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

${siteNav('/tours/', '← All tours')}

<header class="tour-head">
  <div class="wrap">
    <nav class="tour-crumb" aria-label="Breadcrumb">
      <a href="/index.html">Home</a><span aria-hidden="true">›</span><a href="/tours/">Tours</a><span aria-hidden="true">›</span>${esc(item.name)}
    </nav>
    <div class="tour-eyebrow">Private tour · Suggested combination</div>
    <h1>${esc(item.name)}</h1>
    <div class="tour-tags">${esc(item.tags)}</div>
    ${draftFactsRow(item)}
    <div class="tour-cta-row">
      <a class="btn btn-gold" href="${whatsappHref(item.name)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp →</a>
      <a class="btn btn-ghost" href="/index.html#contact">Enquire online</a>
    </div>
  </div>
</header>

<main id="main" class="tour-body">
  <div class="wrap">

    ${item.draft ? `<div class="draft-banner"><strong>Draft page — not yet published.</strong> This is a suggested combination of existing tours, not a confirmed product. This page is set to <code>noindex</code> and left out of the sitemap. Confirm final routing, hotel nights and combined pricing in the CMS (Extended / Combination Tours), then uncheck &ldquo;Draft&rdquo; to publish.</div>` : ''}

    <section class="tour-section tour-overview">
      <h2>Overview</h2>
      <p>${esc(item.overview)}</p>
      ${components.length ? `<div class="tour-component-list">
        ${components.map(c => `<a href="${tourUrl(c.slug)}">${esc(c.name)} (${esc(c.duration)})</a>`).join('\n        ')}
      </div>` : ''}
    </section>

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
const dayTripsDir = join(ROOT, 'day-trips');
const experiencesDir = join(ROOT, 'experiences');
const publishedUrls = []; // non-draft Phase 3 pages only, for the sitemap

(content.dayTrips || []).forEach(item => {
  const dir = join(dayTripsDir, item.slug);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), buildSimplePage(item, 'day-trips'));
  generatedUrls.push(`/day-trips/${item.slug}/`);
  if (!item.draft) publishedUrls.push({ loc: `/day-trips/${item.slug}/`, changefreq: 'monthly', priority: '0.6' });
  console.log('wrote', `day-trips/${item.slug}/index.html`, item.draft ? '(draft, noindex)' : '(published)');
});

(content.experiences || []).forEach(item => {
  const dir = join(experiencesDir, item.slug);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), buildSimplePage(item, 'experiences'));
  generatedUrls.push(`/experiences/${item.slug}/`);
  if (!item.draft) publishedUrls.push({ loc: `/experiences/${item.slug}/`, changefreq: 'monthly', priority: '0.6' });
  console.log('wrote', `experiences/${item.slug}/index.html`, item.draft ? '(draft, noindex)' : '(published)');
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
const staticEntries = [
  { loc: '/', changefreq: 'weekly', priority: '1.0', lastmod: '2026-07-23' },
  { loc: '/privacy.html', changefreq: 'yearly', priority: '0.3', lastmod: '2026-07-23' },
  { loc: '/terms.html', changefreq: 'yearly', priority: '0.3', lastmod: '2026-07-23' },
  { loc: '/cancellation.html', changefreq: 'yearly', priority: '0.3', lastmod: '2026-07-23' }
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
