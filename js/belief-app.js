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
const dismissLieButton = document.getElementById('dismiss-lie-button');

const pendingLieToggle = document.getElementById('pending-lie-toggle');
const pendingLiePanel = document.getElementById('pending-lie-panel');
const pendingLieBadge = document.getElementById('pending-lie-badge');

const IDLE_PLACEHOLDER = 'Tap below to surface a lie worth slaying.';
const BLOCKED_PLACEHOLDER = 'Come back once conquered!';

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
  if (isUnlimitedSpins()) {
    spinButton.disabled = false;
    spinStatus.textContent = '♾️ Unlimited spins (dev)';
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    return;
  }

  if (getPendingBeliefId()) {
    spinButton.disabled = true;
    spinStatus.textContent = 'Conquer your pending lie to spin again.';
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    return;
  }

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

function unspunBeliefsPool() {
  const spunIds = getSpunBeliefIds();
  return FALSE_BELIEFS.filter((b) => !spunIds.has(b.id));
}

function renderReelCycleFrame() {
  const belief = randomBelief();
  reelContent.innerHTML = `<span class="belief-quote">"${belief.belief}"</span>`;
}

function showIdleReelState() {
  reel.classList.remove('spinning', 'revealed');
  reel.classList.add('idle');
  reelContent.innerHTML = `<span class="reel-placeholder" id="reel-placeholder">${IDLE_PLACEHOLDER}</span>`;
}

function showBlockedReelState() {
  reel.classList.remove('spinning', 'revealed');
  reel.classList.add('idle');
  reelContent.innerHTML = `<span class="reel-placeholder" id="reel-placeholder">${BLOCKED_PLACEHOLDER}</span>`;
}

function refreshEquippedCosmeticVisual() {
  const equipped = getEquippedCosmetic();
  reelWrapper.classList.toggle('ark-theme', equipped === 'ark');
  reelWrapper.classList.toggle('divine-theme', equipped === 'divine');
  reelWrapper.classList.toggle('divine2-theme', equipped === 'divine2');
  reelWrapper.classList.toggle('woh-theme', equipped === 'world-over-heaven');

  spinButton.classList.toggle('woh-button', equipped === 'world-over-heaven');
  if (equipped === 'world-over-heaven') {
    spinButton.innerHTML = '⚔️ Crush Deception';
  } else {
    spinButton.innerHTML = '⚔️ Slay a Lie';
  }
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

  modalBackdrop.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  document.body.classList.remove('modal-open');
  if (currentBelief && getPendingBeliefId() === currentBelief.id) {
    showBlockedReelState();
  }
}

function conquerBelief(belief) {
  markConquered(belief.id);
  if (getPendingBeliefId() === belief.id) {
    setPendingBeliefId(null);
  }
  recordBeliefConquestForPerfectionist();
  playSound('conquered', { volume: 0.7 });
  updateProgressSummary();
  refreshSpinStatus();
  showIdleReelState();
  refreshPendingLieBadge();
  if (pendingLiePanel.classList.contains('open')) {
    renderPendingLiePanel();
  }
}

function spin() {
  if (!beliefSpinLimiter.canSpin()) return;
  if (getPendingBeliefId() && !isUnlimitedSpins()) return;

  const pool = unspunBeliefsPool();
  if (pool.length === 0) {
    spinStatus.textContent = "You've drawn every lie — nothing new to slay right now.";
    return;
  }

  spinButton.disabled = true;
  reel.classList.remove('idle', 'revealed');
  reel.classList.add('spinning');

  const result = pool[Math.floor(Math.random() * pool.length)];
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
  if (!isUnlimitedSpins()) {
    markSpun(belief.id);
    setPendingBeliefId(belief.id);
  }

  reelContent.innerHTML = `<span class="belief-quote">"${belief.belief}"</span>`;
  reel.classList.remove('spinning');
  reel.classList.add('revealed');

  playSound('beliefReveal', { volume: 0.75 });
  openModal(belief);
  refreshSpinStatus();
  refreshPendingLieBadge({ pop: true });
  if (pendingLiePanel.classList.contains('open')) {
    renderPendingLiePanel();
  }
}

spinButton.addEventListener('click', () => {
  if (!beliefSpinLimiter.canSpin()) return;
  if (getPendingBeliefId() && !isUnlimitedSpins()) return;
  playSound('click', { volume: 0.4 });
  spin();
});

modalClose.addEventListener('click', closeModal);
dismissLieButton.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// --- Pending Lie panel ---

function refreshPendingLieBadge({ pop } = {}) {
  const hasPending = !!getPendingBeliefId();
  pendingLieBadge.textContent = hasPending ? '1' : '';
  pendingLieBadge.classList.toggle('visible', hasPending);
  if (pop && hasPending) {
    pendingLieBadge.classList.remove('pop');
    void pendingLieBadge.offsetWidth;
    pendingLieBadge.classList.add('pop');
  }
}

function renderPendingLiePanel() {
  const pendingId = getPendingBeliefId();
  const belief = pendingId ? FALSE_BELIEFS.find((b) => b.id === pendingId) : null;

  if (!belief) {
    if (pendingId) setPendingBeliefId(null); // stale reference safety net
    pendingLiePanel.innerHTML = `<p class="todays-quests-empty">No lie awaiting conquest right now.</p>`;
    return;
  }

  pendingLiePanel.innerHTML = `
    <div class="pending-lie-card">
      <span class="pending-lie-quote">"${belief.belief}"</span>
      <button class="pending-lie-conquer-button" id="pending-lie-conquer-button">✅ We've Conquered It!</button>
    </div>
  `;

  document.getElementById('pending-lie-conquer-button').addEventListener('click', () => {
    conquerBelief(belief);
  });
}

pendingLieToggle.addEventListener('click', () => {
  const isOpen = pendingLiePanel.classList.contains('open');
  if (isOpen) {
    pendingLiePanel.classList.remove('open');
  } else {
    renderPendingLiePanel();
    pendingLiePanel.classList.add('open');
  }
});

updateProgressSummary();
refreshSpinStatus();
refreshEquippedCosmeticVisual();
refreshPendingLieBadge();
if (getPendingBeliefId()) {
  showBlockedReelState();
}
