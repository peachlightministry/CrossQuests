const reel = document.getElementById('reel');
const reelContent = document.getElementById('reel-content');
const reelWrapper = document.getElementById('reel-wrapper');
const spinButton = document.getElementById('spin-button');
const spinStatus = document.getElementById('spin-status');
const progressSummary = document.getElementById('progress-summary');
const greetingText = document.getElementById('greeting-text');
const greetingVerse = document.getElementById('greeting-verse');
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

const GREETINGS = [
  'Hey, grace and peace from our Lord Jesus Christ.',
  'Glad to have you here🫡',
  'Welcome tooo.... *drumroll* Competitive Christianity',
];

// Book, chapter, and verse only — no quoted text, so it stays a nudge to go
// look it up rather than the whole thing being handed over.
const MOTIVATION_VERSES = ['Philippians 4:13', 'Joshua 1:9', 'Isaiah 40:31', 'Colossians 3:23', 'Galatians 6:9'];

function setGreeting() {
  greetingText.textContent = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  if (greetingVerse) {
    greetingVerse.textContent = MOTIVATION_VERSES[Math.floor(Math.random() * MOTIVATION_VERSES.length)];
  }
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
      if (typeof window.jsqFireSpinResetNotification === 'function') window.jsqFireSpinResetNotification('quest');
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
  if (typeof window.jsqContributeEventPoints === "function" && typeof window.jsqEventPointsInfo === "function") {
    window.jsqContributeEventPoints(window.jsqEventPointsInfo().questLogged);
  }
  if (typeof window.jsqCheckBounties === "function") {
    window.jsqCheckBounties("quest-logged", { rarity });
  }

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

function formatExpiryCountdown(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

// Identity (questId + spunAt) of the entry currently showing the "Are you
// sure?" abandon prompt, if any -- tracked by identity rather than array
// index so completing/abandoning some OTHER entry (which shifts indices)
// can't make the prompt jump onto the wrong card.
let abandonConfirmKey = null;

function todaysQuestEntryKey(entry) {
  return `${entry.questId}:${entry.spunAt}`;
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
    if (abandonConfirmKey === todaysQuestEntryKey(entry)) {
      actionHtml = `
        <span class="quest-abandon-confirm-text">Are you sure?</span>
        <button class="quest-abandon-confirm-button" data-index="${index}">Yes, remove it</button>
        <button class="quest-abandon-cancel-button" data-index="${index}">Cancel</button>
      `;
    } else if (canCompleteEntry(entry)) {
      actionHtml = `
        <button class="quest-done-button" data-index="${index}">✅ Side quest is done!</button>
        <span class="quest-reward-label">+${rarity.points} ${crossIconSVG(14)}</span>
        <button class="quest-abandon-button" data-index="${index}">I can't do it</button>
      `;
    } else {
      actionHtml = `
        <button class="quest-done-button" disabled>Ready in <span class="quest-cooldown" data-index="${index}">${formatMMSS(msUntilEntryReady(entry))}</span></button>
        <span class="quest-reward-label">+${rarity.points} ${crossIconSVG(14)}</span>
        <button class="quest-abandon-button" data-index="${index}">I can't do it</button>
      `;
    }

    return `
      <div class="todays-quest-card" style="border-left-color:${rarity.color}">
        <span class="todays-quest-rarity" style="color:${rarity.color}">${rarity.name}</span>
        <span class="todays-quest-text">${quest.text}</span>
        <span class="todays-quest-expiry" data-index="${index}">Expires in ${formatExpiryCountdown(msUntilEntryExpires(entry))}</span>
        <div class="todays-quest-action">${actionHtml}</div>
      </div>
    `;
  }).join('');

  todaysQuestsPanel.querySelectorAll('.quest-done-button:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => completeQuestEntry(parseInt(btn.dataset.index, 10), btn));
  });
  todaysQuestsPanel.querySelectorAll('.quest-abandon-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.index, 10);
      const current = getTodaysQuestsState().entries[i];
      if (current) abandonConfirmKey = todaysQuestEntryKey(current);
      renderTodaysQuestsPanel();
    });
  });
  todaysQuestsPanel.querySelectorAll('.quest-abandon-cancel-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      abandonConfirmKey = null;
      renderTodaysQuestsPanel();
    });
  });
  todaysQuestsPanel.querySelectorAll('.quest-abandon-confirm-button').forEach((btn) => {
    btn.addEventListener('click', () => abandonQuestEntry(parseInt(btn.dataset.index, 10)));
  });

  if (todaysQuestsTimer) clearInterval(todaysQuestsTimer);
  todaysQuestsTimer = setInterval(() => {
    const fresh = getTodaysQuestsState();
    if (fresh.entries.length !== state.entries.length) {
      renderTodaysQuestsPanel();
      return;
    }
    let needsFullRerender = false;
    fresh.entries.forEach((entry, index) => {
      if (canCompleteEntry(entry)) {
        needsFullRerender = true;
      } else {
        const el = todaysQuestsPanel.querySelector(`.quest-cooldown[data-index="${index}"]`);
        if (el) el.textContent = formatMMSS(msUntilEntryReady(entry));
      }
      const expiryEl = todaysQuestsPanel.querySelector(`.todays-quest-expiry[data-index="${index}"]`);
      if (expiryEl) expiryEl.textContent = `Expires in ${formatExpiryCountdown(msUntilEntryExpires(entry))}`;
    });
    if (needsFullRerender) renderTodaysQuestsPanel();
  }, 1000);
}

function completeQuestEntry(index, buttonEl) {
  const state = getTodaysQuestsState();
  const entry = state.entries[index];
  if (!entry || !canCompleteEntry(entry)) return;

  const found = findRarityAndQuest(entry.rarityId, entry.questId);
  removeTodaysQuestEntryAt(index);

  if (found) {
    addPoints(found.rarity.points);
    if (typeof window.jsqContributeEventPoints === "function") {
      window.jsqContributeEventPoints(found.rarity.oddsN);
    }
    if (typeof window.jsqCheckBounties === "function") {
      window.jsqCheckBounties("quest-completed", { rarity: found.rarity });
    }
  }
  recordQuestCompletionForPerfectionist();
  recordQuestCompletionForAchievements();
  playSound('questComplete', { volume: 0.45 });
  if (buttonEl) triggerSubtleConfetti(buttonEl);

  refreshTodaysQuestsBadge();
  renderTodaysQuestsPanel();
}

// Abandoning a quest just removes it -- no points, no completion tracking.
function abandonQuestEntry(index) {
  const state = getTodaysQuestsState();
  if (!state.entries[index]) return;
  removeTodaysQuestEntryAt(index);
  abandonConfirmKey = null;
  playSound('click', { volume: 0.4 });
  refreshTodaysQuestsBadge();
  renderTodaysQuestsPanel();
}

todaysQuestsToggle.addEventListener('click', () => {
  const isOpen = todaysQuestsPanel.classList.contains('open');
  if (isOpen) {
    abandonConfirmKey = null;
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
