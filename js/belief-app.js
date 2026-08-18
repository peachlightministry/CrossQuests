const reel = document.getElementById('reel');
const reelContent = document.getElementById('reel-content');
const reelWrapper = document.getElementById('reel-wrapper');
const spinButton = document.getElementById('spin-button');
const spinStatus = document.getElementById('spin-status');
const progressSummary = document.getElementById('progress-summary');

const modalBackdrop = document.getElementById('belief-modal-backdrop');
const modalClose = document.getElementById('belief-modal-close');
const modalQuote = document.getElementById('modal-belief-quote');
const modalExplanation = document.getElementById('modal-belief-explanation');
const modalReference = document.getElementById('modal-belief-reference');
const modalChallenge = document.getElementById('modal-belief-challenge');
const conquerButton = document.getElementById('conquer-button');

const beliefSpinLimiter = createSpinLimiter({
  storageKey: 'jsq-belief-spin-limit',
  maxSpins: 1,
  windowMs: 12 * 60 * 60 * 1000,
});

let countdownTimer = null;
let currentBelief = null;

function updateProgressSummary() {
  progressSummary.innerHTML =
    `You've conquered <strong>${countConquered()}</strong> of <strong>${totalBeliefs()}</strong> false beliefs — ` +
    `<a href="beliefs-log.html">view your Belief Log</a>`;
}

function refreshSpinStatus() {
  const state = beliefSpinLimiter.getState();

  if (state.remaining > 0) {
    spinStatus.textContent = `${state.remaining} spin${state.remaining === 1 ? '' : 's'} left`;
    spinButton.disabled = false;
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    return;
  }

  spinButton.disabled = true;
  const tick = () => {
    const msLeft = beliefSpinLimiter.msUntilReset();
    if (msLeft <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      refreshSpinStatus();
      return;
    }
    spinStatus.textContent = `0 spins left, spins refresh in ${formatCountdown(msLeft)}`;
  };
  tick();
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(tick, 1000);
}

function randomBelief() {
  return FALSE_BELIEFS[Math.floor(Math.random() * FALSE_BELIEFS.length)];
}

function renderReelCycleFrame() {
  const belief = randomBelief();
  reelContent.innerHTML = `<span class="belief-quote">"${belief.belief}"</span>`;
}

function refreshEquippedCosmeticVisual() {
  const equipped = getEquippedCosmetic();
  reelWrapper.classList.toggle('ark-theme', equipped === 'ark');
  reelWrapper.classList.toggle('divine-theme', equipped === 'divine');
  reelWrapper.classList.toggle('divine2-theme', equipped === 'divine2');
}

function updateConquerButton(belief) {
  const conquered = isConquered(belief.id);
  conquerButton.disabled = conquered;
  conquerButton.textContent = conquered ? '✅ Conquered' : '✅ We Conquered It';
}

function openModal(belief) {
  currentBelief = belief;
  modalQuote.textContent = `"${belief.belief}"`;
  modalExplanation.textContent = belief.explanation;
  modalReference.textContent = belief.reference;
  if (belief.challenge) {
    modalChallenge.textContent = `Challenge: ${belief.challenge}`;
    modalChallenge.style.display = 'block';
  } else {
    modalChallenge.textContent = '';
    modalChallenge.style.display = 'none';
  }
  updateConquerButton(belief);

  modalBackdrop.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  document.body.classList.remove('modal-open');
}

function spin() {
  if (!beliefSpinLimiter.canSpin()) return;

  spinButton.disabled = true;
  reel.classList.remove('idle', 'revealed');
  reel.classList.add('spinning');

  const result = randomBelief();
  const steps = 14;
  const baseDelay = 60;
  let step = 0;

  function tick() {
    if (step >= steps) {
      finishSpin(result);
      return;
    }
    renderReelCycleFrame();
    playSound('tick', { volume: 0.5 });
    step++;
    const progress = step / steps;
    const delay = baseDelay + Math.pow(progress, 3) * 260;
    setTimeout(tick, delay);
  }

  tick();
}

function finishSpin(belief) {
  beliefSpinLimiter.useSpin();

  reelContent.innerHTML = `<span class="belief-quote">"${belief.belief}"</span>`;
  reel.classList.remove('spinning');
  reel.classList.add('revealed');

  playSound('beliefReveal', { volume: 0.75 });
  openModal(belief);
  refreshSpinStatus();
}

spinButton.addEventListener('click', () => {
  if (!beliefSpinLimiter.canSpin()) return;
  playSound('click', { volume: 0.4 });
  spin();
});

conquerButton.addEventListener('click', () => {
  if (!currentBelief || conquerButton.disabled) return;
  markConquered(currentBelief.id);
  playSound('conquered', { volume: 0.7 });
  updateConquerButton(currentBelief);
  updateProgressSummary();
});

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('test-spin-button').addEventListener('click', () => {
  grantTestSpin();
  refreshSpinStatus();
});

updateProgressSummary();
refreshSpinStatus();
refreshEquippedCosmeticVisual();
