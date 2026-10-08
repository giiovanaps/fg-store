const initialized = new WeakSet();

/** The prepared MP4 contains both directions; the browser loops it without seeks. */
export function initializeHeroVideo(video, fallbackFrame, stage, motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  if (!video || !fallbackFrame || !stage || initialized.has(video)) return;
  initialized.add(video);

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.controls = false;

  let unavailable = false;
  let frameReady = false;
  stage.dataset.playback = 'loading';

  // Picked here instead of <source media>, which some mobile browsers ignore and then play the desktop film.
  const mobileQuery = globalThis.matchMedia?.('(max-width:650px)');
  function pickSource() {
    const src = mobileQuery?.matches ? video.dataset.srcMobile : video.dataset.srcDesktop;
    if (!src || video.getAttribute('src') === src) return;
    video.src = src;
    video.load();
  }
  pickSource();
  mobileQuery?.addEventListener?.('change', () => {
    pickSource();
    applyMotionPreference();
  });

  function revealFallback() {
    if (frameReady && unavailable) fallbackFrame.hidden = false;
  }

  function frameDecoded() {
    if (!fallbackFrame.naturalWidth) return;
    frameReady = true;
    revealFallback();
  }

  function useFallback() {
    unavailable = true;
    stage.dataset.playback = 'fallback';
    revealFallback();
  }

  function applyMotionPreference() {
    if (motionPreference?.matches) {
      video.autoplay = false;
      video.pause();
      unavailable = true;
      stage.dataset.playback = 'reduced-motion';
      revealFallback();
    } else if (video.error) {
      useFallback();
    } else {
      video.autoplay = true;
      if (!video.paused) {
        stage.dataset.playback = 'playing';
        return;
      }
      try {
        video.play()?.catch(useFallback);
      } catch {
        useFallback();
      }
    }
  }

  video.addEventListener('error', useFallback);
  video.addEventListener('playing', () => {
    if (motionPreference?.matches) {
      applyMotionPreference();
      return;
    }
    unavailable = false;
    fallbackFrame.hidden = true;
    stage.dataset.playback = 'playing';
  });

  // Keep the native poster visible until the fallback image has actually decoded.
  if (typeof fallbackFrame.decode === 'function') {
    fallbackFrame.decode().then(frameDecoded).catch(() => { /* Retain native poster. */ });
  } else if (fallbackFrame.complete && fallbackFrame.naturalWidth) {
    frameDecoded();
  } else {
    fallbackFrame.addEventListener('load', frameDecoded, { once: true });
  }

  motionPreference?.addEventListener?.('change', applyMotionPreference);
  applyMotionPreference();
  // Native looping never swaps src/poster, calls load(), or overlays a final frame.
}
