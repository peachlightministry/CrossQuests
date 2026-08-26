const logContainer = document.getElementById('log-container');

function renderRaritySection(rarity) {
  const unlocked = hasDiscoveredAnyInRarity(rarity);
  const found = countDiscoveredInRarity(rarity);
  const total = rarity.quests.filter((q) => !q.locked).length;

  const section = document.createElement('section');
  section.className = `rarity-section${unlocked ? '' : ' locked'}`;
  section.style.borderLeftColor = unlocked ? rarity.color : '#ccc';

  const questItems = rarity.quests
    .map((q) => {
      if (q.locked) {
        return `<li class="coming-soon">Coming soon</li>`;
      }
      const found = isDiscovered(q.id);
      return `<li class="${found ? 'found' : 'unknown'}">${found ? q.text : '???'}</li>`;
    })
    .join('');

  section.innerHTML = `
    <div class="rarity-header">
      <span class="rarity-name" style="color:${unlocked ? rarity.color : '#999'}">
        Rarity: ${unlocked ? rarity.name : '?'}
      </span>
      <span class="rarity-chance">Chance: ${unlocked ? rarity.chanceLabel : '?'}</span>
    </div>
    ${unlocked ? `<div class="rarity-verse">${rarity.verse}</div>` : ''}
    <div class="rarity-progress">${found} out of ${total} quests found</div>
    <ul class="quest-list">${questItems}</ul>
  `;

  return section;
}

function renderLog() {
  logContainer.innerHTML = '';
  RARITIES.forEach((rarity) => {
    logContainer.appendChild(renderRaritySection(rarity));
  });
}

renderLog();
