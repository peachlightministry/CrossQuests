// Quest selection uses a sequence of independent rolls, rarest tier first, rather than
// splitting 100% across all six tiers. Each roll is a literal, unmodified 1-in-oddsN
// check with no rescaling, so "1 in 110" always means exactly that. The first roll that
// hits wins the spin. Mustard Seed is never rolled for directly — it's the guaranteed
// result when none of the rarer checks hit, since it's the everyday/default tier.
const RARITY_CHECK_ORDER = [...RARITIES].sort((a, b) => b.oddsN - a.oddsN);
const FALLBACK_RARITY = RARITY_CHECK_ORDER[RARITY_CHECK_ORDER.length - 1];
const ROLLED_RARITIES = RARITY_CHECK_ORDER.slice(0, -1);

// Quest Luck upgrades (shop-data.js) tighten the odds on the five rolled tiers.
// Luck 2's numbers already represent the fully-stacked result, so owning it
// takes priority over Luck 1 regardless of purchase order. Mustard Seed isn't
// listed here on purpose - it just keeps absorbing whatever's left over.
const QUEST_LUCK_ODDS = {
  luck1: { 'loaves-and-fishes': 4, 'widows-mite': 8, 'wilderness-wanderer': 24, 'refiners-fire': 40, 'burning-bush': 90 },
  luck2: { 'loaves-and-fishes': 3, 'widows-mite': 6, 'wilderness-wanderer': 18, 'refiners-fire': 30, 'burning-bush': 85 },
};

function effectiveOddsN(rarity) {
  const owned = typeof isUpgradeOwned === 'function' ? isUpgradeOwned : () => false;
  const tier = owned('quest-luck-2') ? QUEST_LUCK_ODDS.luck2 : owned('quest-luck-1') ? QUEST_LUCK_ODDS.luck1 : null;
  return (tier && tier[rarity.id]) || rarity.oddsN;
}

function randomQuestFrom(rarity) {
  return rarity.quests[Math.floor(Math.random() * rarity.quests.length)];
}

function pickRandomQuest() {
  for (const rarity of ROLLED_RARITIES) {
    const oddsN = effectiveOddsN(rarity);
    if (rarity.secret) {
      // Each secret quest gets its own independent 1-in-oddsN roll.
      for (const quest of rarity.quests) {
        if (Math.random() < 1 / oddsN) {
          return { rarity, quest };
        }
      }
    } else if (Math.random() < 1 / oddsN) {
      return { rarity, quest: randomQuestFrom(rarity) };
    }
  }
  return { rarity: FALLBACK_RARITY, quest: randomQuestFrom(FALLBACK_RARITY) };
}
