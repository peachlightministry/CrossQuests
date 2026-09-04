// Achievements: a fixed catalog of 7 milestones. Each is "earned" once its
// condition is met, then must be manually claimed for +10 Cross Points.
// Completing all 7 unlocks the Ark of the Covenant cosmetic as a grand
// reward (pulled out of the regular purchasable Cosmetics shop listing).
const ACHIEVEMENT_REWARD_POINTS = 10;
const ACHIEVEMENTS_CLAIMED_KEY = 'jsq-achievements-claimed';
const ACHIEVEMENT_GRAND_REWARD_CLAIMED_KEY = 'jsq-achievements-grand-reward-claimed';
const TOTAL_QUESTS_COMPLETED_KEY = 'jsq-total-quests-completed';
const GRAND_REWARD_COSMETIC_ID = 'ark';
const HOLY_GAMBLER_UPGRADE_IDS = ['quest-luck-1', 'quest-luck-2', 'divine-gambling'];
const FASHIONIST_COSMETIC_COUNT = 3;

// All-time completed-quest counter. Separate from todays-quests.js, which
// only tracks the current 12h window and resets — Missionary needs a count
// that never resets.
function getTotalQuestsCompletedEver() {
  try {
    const raw = localStorage.getItem(TOTAL_QUESTS_COMPLETED_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}

// Firestore data isn't reachable from this plain script, so event-points.js
// (a module, loaded on every page) periodically caches whether the signed-in
// player is currently in the event leaderboard's top 10, and this just reads
// that cache. Once claimed, the achievement stays claimed even if a later
// event or a drop in rank makes the condition go false again.
function isInEventTop10() {
  try {
    return JSON.parse(localStorage.getItem('jsq-event-cache') || '{}').inTop10 === true;
  } catch (e) {
    return false;
  }
}

function recordQuestCompletionForAchievements() {
  const next = getTotalQuestsCompletedEver() + 1;
  try {
    localStorage.setItem(TOTAL_QUESTS_COMPLETED_KEY, String(next));
  } catch (e) {
    // ignore — counter just won't persist
  }
  return next;
}

const ACHIEVEMENTS = [
  {
    id: 'missionary',
    name: 'Missionary',
    description: 'Complete 100 side quests.',
    condition: () => getTotalQuestsCompletedEver() >= 100,
    progress: () => `${Math.min(getTotalQuestsCompletedEver(), 100)} / 100`,
  },
  {
    id: 'platinum-trophy',
    name: 'Platinum Trophy',
    description: 'Collect all 48 side quests in your Quest Log.',
    condition: () => totalDiscovered() >= totalQuests(),
    progress: () => `${totalDiscovered()} / ${totalQuests()}`,
  },
  {
    id: 'race-marked-out',
    name: 'The Race Marked Out',
    description: 'Place top 10 in an event.',
    condition: () => isInEventTop10(),
    progress: () => (isInEventTop10() ? "You're in the Top 10!" : 'Check the Event leaderboard'),
  },
  {
    id: 'doom-slayer',
    name: 'Doom Slayer',
    description: 'Conquer every false belief.',
    condition: () => countConquered() >= totalBeliefs(),
    progress: () => `${Math.min(countConquered(), totalBeliefs())} / ${totalBeliefs()}`,
  },
  {
    id: 'holy-gambler',
    name: 'Holy Gambler',
    description: 'Own every Quest Luck upgrade and Divine Gambling😏.',
    condition: () => HOLY_GAMBLER_UPGRADE_IDS.every(isUpgradeOwned),
    progress: () => `${HOLY_GAMBLER_UPGRADE_IDS.filter(isUpgradeOwned).length} / ${HOLY_GAMBLER_UPGRADE_IDS.length}`,
  },
  {
    id: 'fashionist',
    name: 'Fashionist',
    description: `Own ${FASHIONIST_COSMETIC_COUNT} cosmetics.`,
    condition: () => getOwnedCosmetics().size >= FASHIONIST_COSMETIC_COUNT,
    progress: () => `${Math.min(getOwnedCosmetics().size, FASHIONIST_COSMETIC_COUNT)} / ${FASHIONIST_COSMETIC_COUNT}`,
  },
  {
    id: 'brotherhood',
    name: 'Brotherhood',
    description: 'Join the Discord community.',
    condition: () => true,
    progress: () => 'Ready to claim!',
  },
];

function getClaimedAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_CLAIMED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch (e) {
    return new Set();
  }
}

function isAchievementClaimed(id) {
  return getClaimedAchievements().has(id);
}

function isAchievementEarned(achievement) {
  try {
    return !!achievement.condition();
  } catch (e) {
    return false;
  }
}

function claimAchievement(id) {
  const achievement = ACHIEVEMENTS.find((a) => a.id === id);
  if (!achievement || isAchievementClaimed(id) || !isAchievementEarned(achievement)) return false;

  const claimed = getClaimedAchievements();
  claimed.add(id);
  try {
    localStorage.setItem(ACHIEVEMENTS_CLAIMED_KEY, JSON.stringify([...claimed]));
  } catch (e) {
    // ignore
  }
  addPoints(ACHIEVEMENT_REWARD_POINTS);
  if (typeof window.jsqContributeEventPoints === "function" && typeof window.jsqEventPointsInfo === "function") {
    window.jsqContributeEventPoints(window.jsqEventPointsInfo().achievementClaim);
  }
  return true;
}

function countCompletedAchievements() {
  return ACHIEVEMENTS.filter(isAchievementEarned).length;
}

function isGrandRewardClaimed() {
  try {
    return localStorage.getItem(ACHIEVEMENT_GRAND_REWARD_CLAIMED_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function claimGrandReward() {
  if (isGrandRewardClaimed()) return false;
  if (countCompletedAchievements() < ACHIEVEMENTS.length) return false;

  const owned = getOwnedCosmetics();
  owned.add(GRAND_REWARD_COSMETIC_ID);
  try {
    localStorage.setItem(OWNED_COSMETICS_KEY, JSON.stringify([...owned]));
    localStorage.setItem(ACHIEVEMENT_GRAND_REWARD_CLAIMED_KEY, '1');
  } catch (e) {
    // ignore
  }
  return true;
}

// Self-contained medallion coin icon with a unique gradient id, safe to use
// multiple times on the same page. Gold when earned, gray when locked —
// one consistent design reused for every achievement rather than a unique
// icon per achievement.
let medallionIconUidCounter = 0;

function medallionIconSVG(size, earned) {
  medallionIconUidCounter += 1;
  const uid = medallionIconUidCounter;
  const rimId = `medallionRim-${uid}`;
  const faceId = `medallionFace-${uid}`;
  const s = size || 48;

  const rimStops = earned ? ['#FFE9A8', '#D9A521', '#8a6100'] : ['#eaeaea', '#b7b7b7', '#7a7a7a'];
  const faceStops = earned ? ['#FFD54F', '#E8912B'] : ['#d6d6d6', '#a3a3a3'];
  const tickColor = earned ? '#8a6100' : '#7a7a7a';
  const strokeColor = earned ? '#8a6100' : '#7a7a7a';
  const crossColor = '#ffffff';

  let ticks = '';
  const tickCount = 16;
  for (let i = 0; i < tickCount; i += 1) {
    const angle = (i / tickCount) * Math.PI * 2;
    const x1 = (30 + Math.cos(angle) * 27.5).toFixed(2);
    const y1 = (30 + Math.sin(angle) * 27.5).toFixed(2);
    const x2 = (30 + Math.cos(angle) * 24).toFixed(2);
    const y2 = (30 + Math.sin(angle) * 24).toFixed(2);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${tickColor}" stroke-width="1.3" stroke-linecap="round" opacity="0.5"/>`;
  }

  return `<svg class="medallion-icon${earned ? '' : ' locked'}" viewBox="0 0 60 60" width="${s}" height="${s}" aria-hidden="true">
    <defs>
      <linearGradient id="${rimId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${rimStops[0]}"/>
        <stop offset="55%" stop-color="${rimStops[1]}"/>
        <stop offset="100%" stop-color="${rimStops[2]}"/>
      </linearGradient>
      <linearGradient id="${faceId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${faceStops[0]}"/>
        <stop offset="100%" stop-color="${faceStops[1]}"/>
      </linearGradient>
    </defs>
    <circle cx="30" cy="30" r="28" fill="url(#${rimId})"/>
    ${ticks}
    <circle cx="30" cy="30" r="21.5" fill="url(#${faceId})" stroke="${strokeColor}" stroke-width="1.2"/>
    <path d="M28 12h4v12h12v4H32v12h-4V28H16v-4h12V12z" fill="${crossColor}"/>
  </svg>`;
}

function renderAchievementsGrid() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;

  grid.innerHTML = ACHIEVEMENTS.map((a) => {
    const earned = isAchievementEarned(a);
    const claimed = isAchievementClaimed(a.id);

    let actionHtml;
    if (claimed) {
      actionHtml = `<span class="achievement-status claimed">✅ Claimed</span>`;
    } else if (earned) {
      actionHtml = `<button class="achievement-claim-button" data-id="${a.id}">Claim +${ACHIEVEMENT_REWARD_POINTS} ${crossIconSVG(13)}</button>`;
    } else {
      actionHtml = `<span class="achievement-status locked">${a.progress ? a.progress() : 'Locked'}</span>`;
    }

    return `
      <div class="achievement-card${earned ? ' earned' : ''}">
        ${medallionIconSVG(52, earned)}
        <span class="achievement-name">${a.name}</span>
        <span class="achievement-description">${a.description}</span>
        <div class="achievement-action">${actionHtml}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.achievement-claim-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (claimAchievement(btn.dataset.id)) {
        if (typeof playSound === 'function') playSound('click', { volume: 0.4 });
        renderAchievements();
      }
    });
  });
}

function renderAchievementsProgress() {
  const completed = countCompletedAchievements();
  const total = ACHIEVEMENTS.length;
  const textEl = document.getElementById('achievements-progress-text');
  const fillEl = document.getElementById('achievements-progress-fill');
  if (textEl) textEl.textContent = `${completed} / ${total} achievements completed`;
  if (fillEl) fillEl.style.width = `${(completed / total) * 100}%`;
}

function renderAchievementsGrandReward() {
  const btn = document.getElementById('achievements-grand-reward-claim');
  if (!btn) return;
  const completed = countCompletedAchievements();
  const total = ACHIEVEMENTS.length;
  const claimed = isGrandRewardClaimed();

  btn.disabled = claimed || completed < total;
  if (claimed) {
    btn.textContent = '✅ Claimed';
  } else if (completed < total) {
    btn.textContent = `Locked — complete all ${total} achievements`;
  } else {
    btn.textContent = 'Claim the Ark of the Covenant Skin';
  }
}

function renderAchievements() {
  renderAchievementsGrid();
  renderAchievementsProgress();
  renderAchievementsGrandReward();
}

const achievementsButton = document.getElementById('achievements-button');
const achievementsBackdrop = document.getElementById('achievements-modal-backdrop');
const achievementsClose = document.getElementById('achievements-modal-close');
const achievementsGrandRewardButton = document.getElementById('achievements-grand-reward-claim');

function openAchievements() {
  renderAchievements();
  achievementsBackdrop.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeAchievements() {
  achievementsBackdrop.classList.remove('open');
  document.body.classList.remove('modal-open');
}

achievementsButton.addEventListener('click', () => {
  if (typeof playSound === 'function') playSound('click', { volume: 0.4 });
  openAchievements();
});
achievementsClose.addEventListener('click', closeAchievements);
achievementsBackdrop.addEventListener('click', (e) => {
  if (e.target === achievementsBackdrop) closeAchievements();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && achievementsBackdrop.classList.contains('open')) closeAchievements();
});
achievementsGrandRewardButton.addEventListener('click', () => {
  if (claimGrandReward()) {
    if (typeof playSound === 'function') playSound('click', { volume: 0.5 });
    renderAchievementsGrandReward();
    if (typeof refreshEquippedCosmeticVisual === 'function') refreshEquippedCosmeticVisual();
  }
});
