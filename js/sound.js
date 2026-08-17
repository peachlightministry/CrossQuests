// Small helper around the sound-effect files. Fails silently if audio can't play
// (e.g. before the user has interacted with the page, per browser autoplay rules).
const SOUND_FILES = {
  tick: 'sounds/tick.wav',
  click: 'sounds/click.wav',
  reveal1: 'sounds/reveal-1.wav',
  reveal2: 'sounds/reveal-2.wav',
  reveal3: 'sounds/reveal-3.wav',
  reveal4: 'sounds/reveal-4.wav',
  reveal5: 'sounds/reveal-5.wav',
  reveal6: 'sounds/reveal-6.wav',
  beliefReveal: 'sounds/belief-reveal.wav',
  conquered: 'sounds/conquered.wav',
  questComplete: 'sounds/quest-complete.wav',
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
