#!/usr/bin/env node
/* ============================================================
   Majesty Tours: photo derivative generator

   The source photos in assets/ are full-size camera/WhatsApp JPEGs
   (~1280px, 100–330KB each). The tour pages show them as ~190px
   grid tiles, so a page like the 19-photo Grand Island tour was
   pulling ~3.6MB of image data to render ~0.05MB worth of pixels.

   This script writes width-limited WebP derivatives to assets/opt/
   and records every source photo's intrinsic size in
   assets/image-manifest.json, which build-pages.mjs reads to emit
   <picture> markup with a correct srcset and correct width/height.

   IMPORTANT: this is NOT part of the Netlify build. The derivatives
   and the manifest are committed, so scripts/build-pages.mjs (the
   actual build command) stays dependency-free. Run this by hand
   after adding or replacing photos:

     npm install sharp        # once, anywhere on your machine
     node scripts/optimize-images.mjs

   Pass --force to re-encode derivatives that already exist.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPT_DIR = join(ROOT, 'assets', 'opt');
const MANIFEST = join(ROOT, 'assets', 'image-manifest.json');
const FORCE = process.argv.includes('--force');

/* The widths the pages actually request. Gallery tiles and cards render
   between ~170 and ~400 CSS px, so 400 is the workhorse and 800 covers
   the same tiles on 2x displays. Nothing larger is generated: the
   lightbox and the <picture> fallback both point at the original JPEG,
   which is already in the repo and only fetched when it's opened. */
const WIDTHS = [400, 800];
const QUALITY = 72;

/* Both the full-size camera/WhatsApp JPEGs and the older .webp photo
   library are worth deriving from: the .webp files are already in a
   modern format but were saved at full display width, so several of
   them are 500–800KB for a thumbnail slot. Videos and their posters
   are left alone. */
const SOURCE_RE = /\.(jpe?g|png|webp)$/i;

/* Site chrome that isn't a photo and needs its own, much smaller set of
   widths. The shield logo is a 200x200 PNG weighing 39KB and is drawn
   at 34px on every generated page, and 68/136 covers 2x and 4x displays
   for a couple of KB. */
const CHROME_WIDTHS = {
  'assets/logo-shield-dark.png': [68, 136],
  'assets/logo-shield.png': [68, 136]
};

/* sharp is a local-only tool, not a site dependency. Resolve it from
   wherever it happens to be installed rather than requiring a
   package.json in the repo. */
function loadSharp() {
  const require = createRequire(import.meta.url);
  const candidates = [
    () => require('sharp'),
    () => createRequire(join(process.env.APPDATA || process.env.HOME || ROOT, 'npm', 'node_modules', 'x.js'))('sharp')
  ];
  for (const attempt of candidates) {
    try { return attempt(); } catch { /* try the next location */ }
  }
  if (process.env.SHARP_PATH) {
    try { return createRequire(join(process.env.SHARP_PATH, 'x.js'))('sharp'); } catch { /* fall through */ }
  }
  console.error('Could not load sharp.\n  Install it with:  npm install sharp\n  or point SHARP_PATH at a node_modules directory that has it.');
  process.exit(1);
}

/* ---------- which photos to process ---------- */
function sourcePhotos() {
  const found = new Set();

  // Exactly what the generated pages reference, and nothing else. The
  // derivatives are committed, so deriving from every photo on disk would
  // put megabytes of files nothing links to into the repo. Wire a new
  // photo into content.json first, then run this.
  const content = JSON.parse(readFileSync(join(ROOT, 'content.json'), 'utf8'));
  for (const group of ['tours', 'dayTrips', 'experiences', 'extendedTours']) {
    for (const item of content[group] || []) {
      for (const img of item.images || []) if (img.image) found.add(img.image);
      for (const v of item.fleet || []) if (v.image) found.add(v.image);
      if (item.heroImage) found.add(item.heroImage);
    }
  }

  // Plus the site chrome the page template emits directly.
  for (const p of Object.keys(CHROME_WIDTHS)) found.add(p);

  return [...found]
    .filter(p => SOURCE_RE.test(p) && existsSync(join(ROOT, p)))
    .sort();
}

/* ---------- run ---------- */
const sharp = loadSharp();
if (!existsSync(OPT_DIR)) mkdirSync(OPT_DIR, { recursive: true });

const manifest = {};
let written = 0, skipped = 0, sourceBytes = 0, optBytes = 0;

for (const rel of sourcePhotos()) {
  const abs = join(ROOT, rel);
  const stem = basename(rel, extname(rel));
  const meta = await sharp(abs).metadata();
  const srcW = meta.width, srcH = meta.height;
  if (!srcW || !srcH) { console.warn('skip (no dimensions):', rel); continue; }

  sourceBytes += statSync(abs).size;

  // Never upscale. A source narrower than the smallest target gets a
  // single derivative at its own width so every photo has at least one.
  const targets = CHROME_WIDTHS[rel] || WIDTHS;
  const widths = targets.filter(w => w < srcW);
  if (!widths.length) widths.push(srcW);

  const variants = [];
  for (const w of widths) {
    const outRel = `assets/opt/${stem}-${w}.webp`;
    const outAbs = join(ROOT, outRel);
    if (FORCE || !existsSync(outAbs) || statSync(outAbs).mtimeMs < statSync(abs).mtimeMs) {
      await sharp(abs).rotate().resize({ width: w, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5, alphaQuality: 90 }).toFile(outAbs);
      written++;
    } else {
      skipped++;
    }
    optBytes += statSync(outAbs).size;
    variants.push(w);
  }

  manifest[rel] = { w: srcW, h: srcH, widths: variants, stem };
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');

const mb = n => (n / 1024 / 1024).toFixed(1) + 'MB';
console.log(`\n${Object.keys(manifest).length} photos · ${written} derivatives written, ${skipped} up to date`);
console.log(`sources ${mb(sourceBytes)} → derivatives ${mb(optBytes)} (all widths combined)`);
console.log(`manifest: assets/image-manifest.json`);
