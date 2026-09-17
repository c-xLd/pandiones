function productBarState(pageScrollY) {
  return pageScrollY > 24 ? 'compact' : 'expanded';
}

function productBarPresentation(pageScrollY) {
  return { docked: 'bottom', state: productBarState(pageScrollY) };
}

function initProductBar() {
  const bar = document.querySelector('[data-product-bar]');
  if (!bar) return;
  let frame = 0;

  function update() {
    frame = 0;
    const presentation = productBarPresentation(Math.max(0, scrollY));
    bar.dataset.docked = presentation.docked;
    bar.dataset.state = presentation.state;
    bar.classList.toggle('is-compact', presentation.state === 'compact');
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', update);
  update();
}

if (typeof document !== 'undefined') initProductBar();
