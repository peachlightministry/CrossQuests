// Quest selection uses a sequence of independent rolls, rarest tier first, rather than
// splitting 100% across all six tiers. Each roll is a literal, unmodified 1-in-oddsN
// check with no rescaling, so "1 in 125" always means exactly that. The first roll that
// hits wins the spin. Mustard Seed is never rolled for directly — it's the guaranteed
// result when none of the rarer checks hit, since it's the everyday/default tier.
const RARITY_CHECK_ORDER = [...RARITIES].sort((a, b) => b.oddsN - a.oddsN);
const FALLBACK_RARITY = RARITY_CHECK_ORDER[RARITY_CHECK_ORDER.length - 1];
const ROLLED_RARITIES = RARITY_CHECK_ORDER.slice(0, -1);

function randomQuestFrom(rarity) {
  return rarity.quests[Math.floor(Math.random() * rarity.quests.length)];
}

function pickRandomQuest() {
  for (const rarity of ROLLED_RARITIES) {
    if (rarity.secret) {
      // Each secret quest gets its own independent 1-in-oddsN roll.
      for (const quest of rarity.quests) {
        if (Math.random() < 1 / rarity.oddsN) {
          return { rarity, quest };
        }
      }
    } else if (Math.random() < 1 / rarity.oddsN) {
      return { rarity, quest: randomQuestFrom(rarity) };
    }
  }
  return { rarity: FALLBACK_RARITY, quest: randomQuestFrom(FALLBACK_RARITY) };
}
