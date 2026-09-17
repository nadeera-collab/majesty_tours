/* ============================================================
   MAJESTY TOURS: tour / day-trip / experience landing pages
   Two small jobs, no dependencies, loaded with `defer`:
     1. a lightbox for the photo grids
     2. the GA4 generate_lead event on WhatsApp clicks
   The grids render and read fine without any of this; the
   lightbox is an enhancement layered on top.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- GA4: WhatsApp enquiries ----------
     Matches the form_id convention already used by the homepage's
     floating cart and contact form in assets/app.js. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-lead="whatsapp"]');
    if (!link) return;
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', {
        form_id: 'whatsapp_tour_page',
        page_path: location.pathname
      });
    }
  });

  /* ---------- Lightbox ---------- */
  var grids = document.querySelectorAll('[data-lightbox]');
  if (!grids.length) return;

  var items = [];
  grids.forEach(function (grid) {
    grid.querySelectorAll('.tg-item').forEach(function (btn) {
      items.push(btn);
      btn.addEventListener('click', function () { open(items.indexOf(btn)); });
    });
  });
  if (!items.length) return;

  var index = 0;
  var box = null;
  var stage = null;
  var caption = null;
  var counter = null;

  function build() {
    box = document.createElement('div');
    box.className = 'tlb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.hidden = true;
    box.innerHTML =
      '<button type="button" class="tlb-x" aria-label="Close">&#10005;</button>' +
      '<button type="button" class="tlb-nav tlb-prev" aria-label="Previous photo">&#8249;</button>' +
      '<button type="button" class="tlb-nav tlb-next" aria-label="Next photo">&#8250;</button>' +
      '<div class="tlb-stage"></div>' +
      '<div class="tlb-bar"><span class="tlb-cap"></span><span class="tlb-count"></span></div>';
    document.body.appendChild(box);

    stage = box.querySelector('.tlb-stage');
    caption = box.querySelector('.tlb-cap');
    counter = box.querySelector('.tlb-count');

    box.querySelector('.tlb-x').addEventListener('click', close);
    box.querySelector('.tlb-prev').addEventListener('click', function () { step(-1); });
    box.querySelector('.tlb-next').addEventListener('click', function () { step(1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) close(); });
  }

  function show(i) {
    var btn = items[i];
    var full = btn.getAttribute('data-full');
    var cap = btn.getAttribute('data-cap') || '';
    var img = new Image();
    img.alt = cap;
    img.src = full;
    stage.innerHTML = '';
    stage.appendChild(img);
    caption.textContent = cap;
    counter.textContent = (i + 1) + ' / ' + items.length;

    // Warm the neighbours so paging through the set feels instant.
    [items[i - 1], items[i + 1]].forEach(function (n) {
      if (!n) return;
      var pre = new Image();
      pre.src = n.getAttribute('data-full');
    });
  }

  function open(i) {
    if (!box) build();
    index = i;
    box.hidden = false;
    document.documentElement.classList.add('tlb-open');
    show(index);
    box.querySelector('.tlb-x').focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    box.hidden = true;
    document.documentElement.classList.remove('tlb-open');
    stage.innerHTML = '';
    document.removeEventListener('keydown', onKey);
    // Focus lands on whichever tile is showing when the viewer closes,
    // so paging through photos leaves the keyboard where the eye is.
    if (items[index]) items[index].focus();
  }

  function step(delta) {
    index = (index + delta + items.length) % items.length;
    show(index);
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { step(-1); return; }
    if (e.key === 'ArrowRight') { step(1); return; }
    if (e.key !== 'Tab') return;
    // Keep tabbing inside the dialog while it's open.
    var focusable = box.querySelectorAll('button');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* Swipe between photos on touch devices. */
  var touchX = null;
  document.addEventListener('touchstart', function (e) {
    if (!box || box.hidden) return;
    touchX = e.changedTouches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!box || box.hidden || touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });
})();
