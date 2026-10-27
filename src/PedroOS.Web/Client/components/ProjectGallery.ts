const hydrated = new WeakSet<HTMLElement>();

/** Every project owns its gallery and modal; no document listeners or shared selection. */
export function hydrateProjectGallery(project: HTMLElement): void {
  const gallery = project.querySelector<HTMLElement>('[data-project-gallery]');
  if (!gallery || hydrated.has(gallery)) return;
  hydrated.add(gallery);
  const shots = [...gallery.querySelectorAll<HTMLButtonElement>('[data-project-shot]')];
  if (!shots.length) return;
  const preview = gallery.querySelector<HTMLImageElement>('[data-project-preview-image]')!;
  const previewLink = gallery.querySelector<HTMLAnchorElement>('a[data-project-enlarge]')!;
  const caption = gallery.querySelector<HTMLElement>('[data-project-caption]')!;
  const counter = gallery.querySelector<HTMLElement>('[data-project-counter]')!;
  const viewer = gallery.querySelector<HTMLDialogElement>('[data-project-viewer]')!;
  const fullImage = viewer.querySelector<HTMLImageElement>('[data-project-viewer-image]')!;
  const originalLink = viewer.querySelector<HTMLAnchorElement>('[data-project-original]')!;
  const zoom = viewer.querySelector<HTMLButtonElement>('[data-project-zoom]')!;
  const stage = viewer.querySelector<HTMLElement>('.project-viewer-stage')!;
  let selected = 0;
  let opener: HTMLElement | null = null;

  const watchImage = (image: HTMLImageElement, error: HTMLElement): void => {
    const update = (): void => {
      const failed = image.complete && image.naturalWidth === 0;
      image.hidden = failed; error.hidden = !failed;
    };
    image.addEventListener('load', update);
    image.addEventListener('error', update);
    if (image.hasAttribute('src')) update();
  };
  watchImage(preview, gallery.querySelector<HTMLElement>('[data-project-preview-error]')!);
  watchImage(fullImage, gallery.querySelector<HTMLElement>('[data-project-viewer-error]')!);

  const fit = (): void => {
    viewer.classList.remove('is-original');
    zoom.setAttribute('aria-pressed', 'false');
    zoom.textContent = 'Tamanho original';
    stage.scrollTop = 0; stage.scrollLeft = 0;
  };
  const renderViewer = (): void => {
    const shot = shots[selected];
    fullImage.hidden = false;
    viewer.querySelector<HTMLElement>('[data-project-viewer-error]')!.hidden = true;
    fullImage.src = shot.dataset.src!;
    fullImage.alt = shot.dataset.alt || '';
    originalLink.href = shot.dataset.src!;
    viewer.querySelector<HTMLElement>('[data-project-viewer-caption]')!.textContent = shot.dataset.caption || '';
    viewer.querySelector<HTMLElement>('[data-project-viewer-counter]')!.textContent = `${selected + 1} de ${shots.length}`;
    fit();
  };
  const select = (index: number): void => {
    selected = (index + shots.length) % shots.length;
    const shot = shots[selected];
    preview.hidden = false;
    gallery.querySelector<HTMLElement>('[data-project-preview-error]')!.hidden = true;
    preview.src = shot.dataset.src!; preview.alt = shot.dataset.alt || '';
    previewLink.href = shot.dataset.src!;
    previewLink.setAttribute('aria-label', `Ampliar imagem ${selected + 1}: ${shot.dataset.alt || ''}`);
    caption.textContent = shot.dataset.caption || '';
    counter.textContent = `${selected + 1} de ${shots.length}`;
    shots.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    if (viewer.open) renderViewer();
  };
  const enlarge = (from: HTMLElement): void => {
    opener = from;
    renderViewer();
    viewer.showModal();
    stage.focus({ preventScroll: true });
  };
  gallery.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const thumbnail = target.closest<HTMLButtonElement>('[data-project-shot]');
    if (thumbnail) { select(Number(thumbnail.dataset.projectShot)); return; }
    const enlargeButton = target.closest<HTMLElement>('[data-project-enlarge]');
    if (enlargeButton) { event.preventDefault(); enlarge(enlargeButton); return; }
    if (target.closest('[data-project-previous]')) select(selected - 1);
    else if (target.closest('[data-project-next]')) select(selected + 1);
    else if (target.closest('[data-project-viewer-close]')) viewer.close();
    else if (target.closest('[data-project-zoom]')) {
      if (viewer.classList.contains('is-original')) fit();
      else { viewer.classList.add('is-original'); zoom.setAttribute('aria-pressed', 'true'); zoom.textContent = 'Ajustar à janela'; }
    }
  });
  gallery.addEventListener('keydown', event => {
    const thumbnail = (event.target as HTMLElement).closest('[data-project-shot]');
    if (!viewer.open && !thumbnail) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (delta || event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); event.stopPropagation();
      select(event.key === 'Home' ? 0 : event.key === 'End' ? shots.length - 1 : selected + delta);
      if (thumbnail) shots[selected].focus({ preventScroll: true });
    }
    if (viewer.open && event.key === 'Escape') event.stopPropagation();
  });
  viewer.addEventListener('close', () => { fit(); if (opener?.isConnected) opener.focus({ preventScroll: true }); });
}
