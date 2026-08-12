const reel = document.getElementById('reel');
const spinButton = document.getElementById('spin-button');
const spinStatus = document.getElementById('spin-status');
const progressSummary = document.getElementById('progress-summary');
const greetingText = document.getElementById('greeting-text');

const questSpinLimiter = createSpinLimiter({
  storageKey: 'jsq-quest-spin-limit',
  maxSpins: 2,
  windowMs: 12 * 60 * 60 * 1000,
});

let countdownTimer = null;

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = "Hey, still glad you stopped by tonight.";
  if (hour < 12) greeting = "Morning — glad you're here.";
  else if (hour < 18) greeting = 'Hey, good to see you today.';
  greetingText.textContent = greeting;
}

function updateProgressSummary() {
  progressSummary.innerHTML =
    `You've discovered <strong>${totalDiscovered()}</strong> of <strong>${totalQuests()}</strong> side quests — ` +
    `<a href="log.html">view your Quest Log</a>`;
}

function refreshSpinStatus() {
  const state = questSpinLimiter.getState();

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
    const msLeft = questSpinLimiter.msUntilReset();
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

function renderReelContent({ rarity, quest }, { isNew }) {
  reel.innerHTML = `
    <span class="reel-rarity" style="color:${rarity.color}">Rarity: ${rarity.name}</span>
    <span class="reel-quest">${quest.text}</span>
    <span class="reel-verse">${rarity.verse}</span>
    ${isNew ? '<span class="reel-badge">New!</span>' : ''}
  `;
  reel.style.background = rarity.colorSoft;
  reel.style.borderColor = rarity.color;
}

function renderReelCycleFrame() {
  const { rarity, quest } = pickRandomQuest();
  reel.innerHTML = `
    <span class="reel-rarity" style="color:${rarity.color}">Rarity: ${rarity.name}</span>
    <span class="reel-quest">${quest.text}</span>
  `;
  reel.style.background = rarity.colorSoft;
  reel.style.borderColor = rarity.color;
}

function spin() {
  if (!questSpinLimiter.canSpin()) return;

  spinButton.disabled = true;
  reel.classList.remove('idle', 'revealed', 'secret-revealed');
  reel.classList.add('spinning');

  const result = pickRandomQuest();
  const steps = 16;
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
    // ease out: delay grows as we approach the final step
    const progress = step / steps;
    const delay = baseDelay + Math.pow(progress, 3) * 260;
    setTimeout(tick, delay);
  }

  tick();
}

function finishSpin({ rarity, quest }) {
  questSpinLimiter.useSpin();

  const isNew = markDiscovered(quest.id);
  renderReelContent({ rarity, quest }, { isNew });

  reel.classList.remove('spinning');
  reel.classList.add(rarity.secret ? 'secret-revealed' : 'revealed');

  playSound(rarity.soundKey, { volume: 0.7 });

  updateProgressSummary();
  refreshSpinStatus();
}

spinButton.addEventListener('click', () => {
  if (!questSpinLimiter.canSpin()) return;
  playSound('click', { volume: 0.4 });
  spin();
});

setGreeting();
updateProgressSummary();
refreshSpinStatus();
