// Weighted-random quest selection. Each rarity tier's weight is 1/oddsN, except the
// secret tier, where every quest in it is individually 1/oddsN (so the tier's total
// weight is quests.length/oddsN). A quest is then picked at random within the chosen tier.
function rarityWeight(rarity) {
  return rarity.secret ? rarity.quests.length / rarity.oddsN : 1 / rarity.oddsN;
}

function pickRandomRarity() {
  const weights = RARITIES.map(rarityWeight);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RARITIES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITIES[i];
  }
  return RARITIES[RARITIES.length - 1];
}

function pickRandomQuest() {
  const rarity = pickRandomRarity();
  const quest = rarity.quests[Math.floor(Math.random() * rarity.quests.length)];
  return { rarity, quest };
}
