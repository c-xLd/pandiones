function galleryOffset(offset, distance, width) {
  return width > 0 ? ((offset + distance) % width + width) % width : 0;
}

function galleryAutoplays(mobile, paused, hovered = false, focused = false) {
  return !mobile && !paused && !hovered && !focused;
}

function galleryCycleWidth(itemWidths, gap) {
  return itemWidths.reduce((total, width) => total + width, 0) + gap * itemWidths.length;
}

function initFlowGallery(gallery) {
  const track = gallery.querySelector('.pdp-gallery-track');
  const shots = [...track.children];
  const controls = gallery.querySelector('.pdp-gallery-control');
  const count = gallery.querySelector('#pdp-gallery-count');
  const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  controls.querySelector('[data-pdp-prev]').innerHTML = icon('<path d="m14 6-6 6 6 6M8 12h12"/>');
  controls.querySelector('[data-pdp-next]').innerHTML = icon('<path d="m10 6 6 6-6 6M4 12h12"/>');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 900px)');
  let offset = 0, cycleWidth = 0, frame = 0, lastTime = 0;
  let paused = reduced.matches, drag = null, moved = false, visible = true;
  let hovered = false, focused = false, inspectedIndex = null;

  shots.forEach((shot, index) => {
    shot.dataset.flowIndex = index;
    shot.tabIndex = -1;
    shot.querySelector('img').draggable = false;
  });
  for (let copy = 0; copy < 3; copy += 1) {
    shots.forEach(shot => {
      const clone = shot.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      clone.setAttribute('aria-hidden', 'true');
      clone.dataset.flowClone = 'true';
      track.append(clone);
    });
  }
  count.removeAttribute('aria-live');
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'pdp-flow-pause';
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.innerHTML = icon('<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>');
  expand.setAttribute('aria-label', 'Görseli büyüt');
  const actions = document.createElement('div');
  actions.className = 'pdp-gallery-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Görsel işlemleri');
  const favorite = document.querySelector('.pdp-favorite');
  actions.append(favorite, pause, expand);
  gallery.append(actions);
  gallery.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; lastTime = 0; }
  });
  gallery.addEventListener('pointerleave', () => { hovered = false; lastTime = 0; });
  gallery.addEventListener('focusin', () => { focused = true; lastTime = 0; });
  gallery.addEventListener('focusout', event => {
    focused = gallery.contains(event.relatedTarget); lastTime = 0;
  });
  track.addEventListener('pointerover', event => {
    const shot = event.target.closest('[data-flow-index]');
    if (shot) inspectedIndex = Number(shot.dataset.flowIndex);
  });

  const zoom = document.createElement('dialog');
  zoom.className = 'pdp-flow-zoom';
  zoom.setAttribute('aria-label', 'Büyük ürün görseli');
  zoom.innerHTML = '<button type="button" class="pdp-zoom-close" aria-label="Büyük görseli kapat">Kapat ×</button><img alt="">';
  document.body.append(zoom);
  zoom.querySelector('button').addEventListener('click', () => zoom.close());
  zoom.addEventListener('click', event => { if (event.target === zoom) zoom.close(); });
  zoom.addEventListener('close', () => { expand.focus(); lastTime = 0; });

  function render() {
    track.style.transform = mobile.matches ? 'none' : `translate3d(${-offset}px,0,0)`;
    const index = currentIndex();
    count.textContent = `${index + 1} / ${shots.length}`;
    controls.querySelector('[data-pdp-prev]').disabled = mobile.matches && index === 0;
    controls.querySelector('[data-pdp-next]').disabled = mobile.matches && index === shots.length - 1;
  }
  function currentIndex() {
    return mobile.matches
      ? Math.min(shots.length - 1, Math.max(0, Math.round(track.scrollLeft / (track.clientWidth || 1))))
      : cycleWidth ? Math.floor(offset / (cycleWidth / shots.length)) : 0;
  }
  function measure() {
    const styles = getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const nextWidth = galleryCycleWidth(shots.map(shot => shot.getBoundingClientRect().width), gap);
    offset = cycleWidth ? offset / cycleWidth * nextWidth : 0;
    cycleWidth = nextWidth;
    render();
  }
  function syncPause() {
    pause.hidden = mobile.matches;
    pause.innerHTML = icon(paused ? '<path d="m8 5 11 7-11 7Z"/>' : '<path d="M8 5v14M16 5v14"/>');
    pause.setAttribute('aria-label', paused ? 'Galeri akışını başlat' : 'Galeri akışını duraklat');
    pause.setAttribute('aria-pressed', String(paused));
    lastTime = 0;
  }
  pause.addEventListener('click', () => { paused = !paused; syncPause(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; syncPause(); });
  mobile.addEventListener('change', () => {
    offset = 0;
    inspectedIndex = null;
    track.scrollLeft = 0;
    drag = null;
    measure(); syncPause();
  });
  track.addEventListener('scroll', () => { if (mobile.matches) render(); }, { passive: true });
  function openZoom(index) {
    const original = shots[index].querySelector('img');
    const image = zoom.querySelector('img');
    image.src = original.src;
    image.alt = original.alt;
    zoom.showModal();
  }
  expand.addEventListener('click', () => openZoom(mobile.matches ? currentIndex() : inspectedIndex ?? currentIndex()));
  track.addEventListener('click', event => {
    const shot = event.target.closest('[data-flow-index]');
    if (shot && !moved) openZoom(Number(shot.dataset.flowIndex));
  });
  function step(direction) {
    if (mobile.matches) {
      const index = Math.max(0, Math.min(shots.length - 1, currentIndex() + direction));
      track.scrollTo({ left: index * track.clientWidth, behavior: reduced.matches ? 'instant' : 'smooth' });
      return;
    }
    offset = galleryOffset(offset, direction * cycleWidth / shots.length, cycleWidth);
    render();
  }
  controls.querySelector('[data-pdp-prev]').addEventListener('click', () => step(-1));
  controls.querySelector('[data-pdp-next]').addEventListener('click', () => step(1));
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  gallery.addEventListener('pointerdown', event => {
    if (!event.target.closest('.pdp-gallery-track') || event.button !== 0) return;
    moved = false;
    drag = { id: event.pointerId, x: event.clientX, start: event.clientX };
  });
  gallery.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (mobile.matches) {
      if (Math.abs(event.clientX - drag.start) > 6) moved = true;
      return;
    }
    if (Math.abs(event.clientX - drag.start) > 6) {
      moved = true;
      if (!gallery.hasPointerCapture(event.pointerId)) gallery.setPointerCapture(event.pointerId);
    }
    if (moved) { offset = galleryOffset(offset, drag.x - event.clientX, cycleWidth); render(); }
    drag.x = event.clientX;
  });
  const release = () => { drag = null; lastTime = 0; };
  gallery.addEventListener('pointerup', release);
  gallery.addEventListener('pointercancel', release);
  gallery.addEventListener('lostpointercapture', release);
  gallery.addEventListener('pointerleave', () => { if (!moved) release(); });
  new ResizeObserver(measure).observe(gallery);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; lastTime = 0; }).observe(gallery);
  function tick(time) {
    const elapsed = lastTime ? Math.min(time - lastTime, 64) : 0;
    lastTime = time;
    if (galleryAutoplays(mobile.matches, paused, hovered, focused) && !drag && visible && !document.hidden && !document.querySelector('dialog[open]')) {
      offset = galleryOffset(offset, elapsed * 0.032, cycleWidth);
      render();
    }
    frame = requestAnimationFrame(tick);
  }
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', () => { if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); } });
  measure(); syncPause();
  frame = requestAnimationFrame(tick);
}
