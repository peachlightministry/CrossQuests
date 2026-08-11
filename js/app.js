const reel = document.getElementById('reel');
const spinButton = document.getElementById('spin-button');
const progressSummary = document.getElementById('progress-summary');
const greetingText = document.getElementById('greeting-text');

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good evening!';
  if (hour < 12) greeting = 'Good morning!';
  else if (hour < 18) greeting = 'Good afternoon!';
  greetingText.textContent = `${greeting} Grace and peace to you today. 🙏`;
}

function updateProgressSummary() {
  progressSummary.innerHTML =
    `You've discovered <strong>${totalDiscovered()}</strong> of <strong>${totalQuests()}</strong> side quests — ` +
    `<a href="log.html">view your Quest Log</a>`;
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
  const isNew = markDiscovered(quest.id);
  renderReelContent({ rarity, quest }, { isNew });

  reel.classList.remove('spinning');
  reel.classList.add(rarity.secret ? 'secret-revealed' : 'revealed');

  playSound(rarity.secret ? 'revealSecret' : 'reveal', { volume: 0.7 });

  updateProgressSummary();
  spinButton.disabled = false;
}

spinButton.addEventListener('click', () => {
  playSound('click', { volume: 0.4 });
  spin();
});

setGreeting();
updateProgressSummary();
