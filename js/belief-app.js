const reel = document.getElementById('reel');
const spinButton = document.getElementById('spin-button');
const conquerButton = document.getElementById('conquer-button');
const spinStatus = document.getElementById('spin-status');
const progressSummary = document.getElementById('progress-summary');

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

function renderReelContent(belief) {
  const conquered = isConquered(belief.id);
  reel.innerHTML = `
    <span class="belief-quote">"${belief.belief}"</span>
    <span class="belief-explanation">${belief.explanation}</span>
    <span class="belief-reference">${belief.reference}</span>
    ${conquered ? '<span class="reel-badge belief-badge">Conquered</span>' : ''}
  `;
}

function renderReelCycleFrame() {
  const belief = randomBelief();
  reel.innerHTML = `<span class="belief-quote">"${belief.belief}"</span>`;
}

function updateConquerButton(belief) {
  const conquered = isConquered(belief.id);
  conquerButton.style.display = 'inline-block';
  conquerButton.disabled = conquered;
  conquerButton.textContent = conquered ? '✅ Conquered' : '✅ We Conquered It';
}

function spin() {
  if (!beliefSpinLimiter.canSpin()) return;

  spinButton.disabled = true;
  conquerButton.style.display = 'none';
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
  currentBelief = belief;

  renderReelContent(belief);
  reel.classList.remove('spinning');
  reel.classList.add('revealed');

  playSound('beliefReveal', { volume: 0.7 });
  updateConquerButton(belief);
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

updateProgressSummary();
refreshSpinStatus();
