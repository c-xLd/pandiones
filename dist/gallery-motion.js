function galleryOffset(offset, distance, width) {
  return width > 0 ? ((offset + distance) % width + width) % width : 0;
}

function initFlowGallery(gallery) {
  const track = gallery.querySelector('.pdp-gallery-track');
  const shots = [...track.children];
  const controls = gallery.querySelector('.pdp-gallery-control');
  const count = gallery.querySelector('#pdp-gallery-count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let offset = 0, cycleWidth = 0, frame = 0, lastTime = 0;
  let paused = reduced.matches, drag = null, moved = false, visible = true;

  shots.forEach((shot, index) => {
    shot.dataset.flowIndex = index;
    shot.tabIndex = -1;
    shot.querySelector('img').draggable = false;
    const clone = shot.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    clone.setAttribute('aria-hidden', 'true');
    track.append(clone);
  });
  count.removeAttribute('aria-live');
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'pdp-flow-pause';
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.textContent = '⛶';
  expand.setAttribute('aria-label', 'Görseli büyüt');
  controls.append(pause, expand);

  const zoom = document.createElement('dialog');
  zoom.className = 'pdp-flow-zoom';
  zoom.setAttribute('aria-label', 'Büyük ürün görseli');
  zoom.innerHTML = '<button type="button" class="pdp-zoom-close" aria-label="Büyük görseli kapat">Kapat ×</button><img alt="">';
  document.body.append(zoom);
  zoom.querySelector('button').addEventListener('click', () => zoom.close());
  zoom.addEventListener('click', event => { if (event.target === zoom) zoom.close(); });
  zoom.addEventListener('close', () => { expand.focus(); lastTime = 0; });

  function render() {
    track.style.transform = `translate3d(${-offset}px,0,0)`;
    const index = cycleWidth ? Math.floor(offset / (cycleWidth / shots.length)) : 0;
    count.textContent = `${index + 1} / ${shots.length}`;
  }
  function measure() {
    const nextWidth = shots.reduce((width, shot) => width + shot.getBoundingClientRect().width, 0);
    offset = cycleWidth ? offset / cycleWidth * nextWidth : 0;
    cycleWidth = nextWidth;
    render();
  }
  function syncPause() {
    pause.textContent = paused ? '▶' : 'Ⅱ';
    pause.setAttribute('aria-label', paused ? 'Galeri akışını başlat' : 'Galeri akışını duraklat');
    pause.setAttribute('aria-pressed', String(paused));
    lastTime = 0;
  }
  pause.addEventListener('click', () => { paused = !paused; syncPause(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; syncPause(); });
  function openZoom(index) {
    const original = shots[index].querySelector('img');
    const image = zoom.querySelector('img');
    image.src = original.src;
    image.alt = original.alt;
    zoom.showModal();
  }
  expand.addEventListener('click', () => openZoom(cycleWidth ? Math.floor(offset / (cycleWidth / shots.length)) : 0));
  track.addEventListener('click', event => {
    const shot = event.target.closest('[data-flow-index]');
    if (shot && !moved) openZoom(Number(shot.dataset.flowIndex));
  });
  function step(direction) {
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
    if (!paused && !drag && visible && !document.hidden && !document.querySelector('dialog[open]')) {
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
