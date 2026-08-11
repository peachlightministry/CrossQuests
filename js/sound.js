// Small helper around the sound-effect files. Fails silently if audio can't play
// (e.g. before the user has interacted with the page, per browser autoplay rules).
const SOUND_FILES = {
  tick: 'sounds/tick.wav',
  reveal: 'sounds/reveal.wav',
  revealSecret: 'sounds/reveal-secret.wav',
  click: 'sounds/click.wav',
};

const soundCache = {};

function playSound(name, { volume = 1 } = {}) {
  const src = SOUND_FILES[name];
  if (!src) return;
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (e) {
    // ignore
  }
}
