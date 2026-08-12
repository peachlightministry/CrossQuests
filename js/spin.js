// Weighted-random quest selection. Every rarity tier (including the secret one) has
// weight 1/oddsN for the tier as a whole, so the stated "1 in N" odds are always
// directly comparable across tiers and rarer tiers are always less likely to hit.
// A quest is then picked at random within the chosen tier.
function rarityWeight(rarity) {
  return 1 / rarity.oddsN;
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
