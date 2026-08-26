const reel = document.getElementById('reel');
const reelContent = document.getElementById('reel-content');
const reelWrapper = document.getElementById('reel-wrapper');
const spinButton = document.getElementById('spin-button');
const spinStatus = document.getElementById('spin-status');
const progressSummary = document.getElementById('progress-summary');
const greetingText = document.getElementById('greeting-text');
const todaysQuestsToggle = document.getElementById('todays-quests-toggle');
const todaysQuestsPanel = document.getElementById('todays-quests-panel');
const todaysQuestsBadge = document.getElementById('todays-quests-badge');
const rerollButton = document.getElementById('reroll-button');

const questSpinLimiter = createSpinLimiter({
  storageKey: 'jsq-quest-spin-limit',
  maxSpins: 2,
  windowMs: 12 * 60 * 60 * 1000,
});

let countdownTimer = null;
let todaysQuestsTimer = null;

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

function applyReelRarityColors(rarity) {
  const equipped = getEquippedCosmetic();
  if (equipped === 'ark' || equipped === 'divine' || equipped === 'divine2' || equipped === 'world-over-heaven') {
    // These themes own the reel's background/border; rarity color stays out of it.
    reel.style.background = '';
    reel.style.borderColor = '';
    return;
  }
  reel.style.background = rarity.colorSoft;
  reel.style.borderColor = rarity.color;
}

function renderReelContent({ rarity, quest }, { isNew }) {
  reelContent.innerHTML = `
    <span class="reel-rarity" style="color:${rarity.color}">Rarity: ${rarity.name}</span>
    <span class="reel-quest">${quest.text}</span>
    <span class="reel-verse">${rarity.verse}</span>
    ${isNew ? '<span class="reel-badge">New!</span>' : ''}
  `;
  applyReelRarityColors(rarity);
}

function renderReelCycleFrame() {
  const { rarity, quest } = pickRandomQuest();
  reelContent.innerHTML = `
    <span class="reel-rarity" style="color:${rarity.color}">Rarity: ${rarity.name}</span>
    <span class="reel-quest">${quest.text}</span>
  `;
  applyReelRarityColors(rarity);
}

function refreshEquippedCosmeticVisual() {
  const equipped = getEquippedCosmetic();
  reelWrapper.classList.toggle('ark-theme', equipped === 'ark');
  reelWrapper.classList.toggle('divine-theme', equipped === 'divine');
  reelWrapper.classList.toggle('divine2-theme', equipped === 'divine2');
  reelWrapper.classList.toggle('woh-theme', equipped === 'world-over-heaven');
  // Re-apply so a live-equipped theme immediately clears any rarity
  // background/border currently sitting on the reel as inline styles.
  reel.style.background = '';
  reel.style.borderColor = '';

  spinButton.classList.remove('ark-button', 'divine-button', 'woh-button');
  if (equipped === 'ark') {
    spinButton.classList.add('ark-button');
    spinButton.innerHTML = '📜 Open the Ark';
  } else if (equipped === 'divine' || equipped === 'divine2') {
    spinButton.classList.add('divine-button');
    spinButton.innerHTML = '🙏 Pray for a Quest';
  } else if (equipped === 'world-over-heaven') {
    spinButton.classList.add('woh-button');
    spinButton.innerHTML = '🎲 Spin a Side Quest';
  } else {
    spinButton.innerHTML = '🎲 Spin a Side Quest';
  }

  const secondaryButton = document.querySelector('.secondary-button');
  if (secondaryButton) {
    secondaryButton.classList.toggle('woh-button', equipped === 'world-over-heaven');
    if (equipped === 'world-over-heaven') {
      secondaryButton.innerHTML = '⚔️ Crush Deception';
    } else {
      secondaryButton.innerHTML = '⚔️ Slay a Lie';
    }
  }

  const reelPlaceholder = document.getElementById('reel-placeholder');
  if (reelPlaceholder) {
    reelPlaceholder.textContent = equipped === 'world-over-heaven'
      ? 'Shatter the skies above the earth'
      : 'Tap the button below to spin!';
  }
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

function refreshTodaysQuestsBadge({ pop } = {}) {
  const count = getTodaysQuestsState().entries.length;
  todaysQuestsBadge.textContent = count;
  todaysQuestsBadge.classList.toggle('visible', count > 0);
  if (pop && count > 0) {
    todaysQuestsBadge.classList.remove('pop');
    void todaysQuestsBadge.offsetWidth;
    todaysQuestsBadge.classList.add('pop');
  }
}

function finishSpin({ rarity, quest }) {
  questSpinLimiter.useSpin();

  const isNew = markDiscovered(quest.id);
  renderReelContent({ rarity, quest }, { isNew });
  addTodaysQuestEntry(rarity, quest);
  refreshTodaysQuestsBadge({ pop: true });
  if (typeof window.jsqContributeEventPoints === "function") window.jsqContributeEventPoints(1);

  reel.classList.remove('spinning');
  reel.classList.add(rarity.secret ? 'secret-revealed' : 'revealed');

  playSound(rarity.soundKey, { volume: 0.7 });

  updateProgressSummary();
  refreshSpinStatus();
  if (todaysQuestsPanel.classList.contains('open')) {
    renderTodaysQuestsPanel();
  }

  maybeShowRerollButton(rarity);
}

function maybeShowRerollButton(rarity) {
  rerollButton.classList.remove('visible');
  rerollButton.onclick = null;

  if (rarity.id !== 'mustard-seed') return;
  if (!isUpgradeOwned('divine-gambling')) return;
  if (Math.random() >= 1 / 3) return;

  rerollButton.classList.add('visible');
  rerollButton.onclick = () => {
    rerollButton.classList.remove('visible');
    rerollButton.onclick = null;
    playSound('click', { volume: 0.4 });

    const result = pickRandomQuest();
    replaceLastTodaysQuestEntry(result.rarity, result.quest);
    const isNew = markDiscovered(result.quest.id);
    renderReelContent(result, { isNew });
    playSound(result.rarity.soundKey, { volume: 0.7 });

    reel.classList.remove('revealed', 'secret-revealed');
    reel.classList.add(result.rarity.secret ? 'secret-revealed' : 'revealed');

    updateProgressSummary();
    refreshTodaysQuestsBadge();
    if (todaysQuestsPanel.classList.contains('open')) {
      renderTodaysQuestsPanel();
    }
  };
}

spinButton.addEventListener('click', () => {
  if (!questSpinLimiter.canSpin()) return;
  playSound('click', { volume: 0.4 });
  spin();
});

// --- Today's Quests panel ---

function formatMMSS(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function triggerSubtleConfetti(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const colors = ['#F2A541', '#66BB6A', '#4FC3F7', '#F06292'];
  for (let i = 0; i < 7; i++) {
    const dot = document.createElement('span');
    dot.className = 'confetti-dot';
    dot.style.left = `${rect.left + rect.width / 2 + (Math.random() * 40 - 20)}px`;
    dot.style.top = `${rect.top + window.scrollY}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.setProperty('--dx', `${Math.random() * 30 - 15}px`);
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 700);
  }
}

function renderTodaysQuestsPanel() {
  const state = getTodaysQuestsState();

  if (state.entries.length === 0) {
    todaysQuestsPanel.innerHTML = `<p class="todays-quests-empty">You didn't spin quests yet.</p>`;
    if (todaysQuestsTimer) {
      clearInterval(todaysQuestsTimer);
      todaysQuestsTimer = null;
    }
    return;
  }

  todaysQuestsPanel.innerHTML = state.entries.map((entry, index) => {
    const found = findRarityAndQuest(entry.rarityId, entry.questId);
    if (!found) return '';
    const { rarity, quest } = found;

    let actionHtml;
    if (entry.completed) {
      actionHtml = `<span class="todays-quest-done-badge">✅ Completed — +${rarity.points} earned</span>`;
    } else if (canCompleteEntry(entry)) {
      actionHtml = `
        <button class="quest-done-button" data-index="${index}">✅ Side quest is done!</button>
        <span class="quest-reward-label">+${rarity.points} ${crossIconSVG(14)}</span>
      `;
    } else {
      actionHtml = `
        <button class="quest-done-button" disabled>Ready in <span class="quest-cooldown" data-index="${index}">${formatMMSS(msUntilEntryReady(entry))}</span></button>
        <span class="quest-reward-label">+${rarity.points} ${crossIconSVG(14)}</span>
      `;
    }

    const justCompleted = entry.completed && entry.completedAt && Date.now() - entry.completedAt < 1500;

    return `
      <div class="todays-quest-card${justCompleted ? ' just-completed' : ''}" style="border-left-color:${rarity.color}">
        <span class="todays-quest-rarity" style="color:${rarity.color}">${rarity.name}</span>
        <span class="todays-quest-text">${quest.text}</span>
        <div class="todays-quest-action">${actionHtml}</div>
      </div>
    `;
  }).join('');

  todaysQuestsPanel.querySelectorAll('.quest-done-button:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => completeQuestEntry(parseInt(btn.dataset.index, 10), btn));
  });

  if (todaysQuestsTimer) clearInterval(todaysQuestsTimer);
  todaysQuestsTimer = setInterval(() => {
    const fresh = getTodaysQuestsState();
    let needsFullRerender = false;
    fresh.entries.forEach((entry, index) => {
      if (entry.completed) return;
      if (canCompleteEntry(entry)) {
        needsFullRerender = true;
      } else {
        const el = todaysQuestsPanel.querySelector(`.quest-cooldown[data-index="${index}"]`);
        if (el) el.textContent = formatMMSS(msUntilEntryReady(entry));
      }
    });
    if (needsFullRerender) renderTodaysQuestsPanel();
  }, 1000);
}

function completeQuestEntry(index, buttonEl) {
  const state = getTodaysQuestsState();
  const entry = state.entries[index];
  if (!entry || entry.completed || !canCompleteEntry(entry)) return;

  const found = findRarityAndQuest(entry.rarityId, entry.questId);
  completeTodaysQuestEntryAt(index);

  if (found) {
    addPoints(found.rarity.points);
    if (typeof window.jsqContributeEventPoints === "function") window.jsqContributeEventPoints(found.rarity.points);
  }
  recordQuestCompletionForPerfectionist();
  recordQuestCompletionForAchievements();
  playSound('questComplete', { volume: 0.45 });
  if (buttonEl) triggerSubtleConfetti(buttonEl);

  renderTodaysQuestsPanel();
}

todaysQuestsToggle.addEventListener('click', () => {
  const isOpen = todaysQuestsPanel.classList.contains('open');
  if (isOpen) {
    todaysQuestsPanel.classList.remove('open');
    if (todaysQuestsTimer) {
      clearInterval(todaysQuestsTimer);
      todaysQuestsTimer = null;
    }
  } else {
    renderTodaysQuestsPanel();
    todaysQuestsPanel.classList.add('open');
  }
});


setGreeting();
updateProgressSummary();
refreshSpinStatus();
refreshEquippedCosmeticVisual();
refreshTodaysQuestsBadge();
