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

// Mustard Seed's overall share of ALL spins, once nothing rarer hits.
const MUSTARD_TARGET_SHARE = 0.45;

// "Pillar" is a placeholder rarity that exists only here, code-side — it's
// never in RARITIES, never shows in the spinbox or quest log, and can never
// itself be the result of a spin. Whenever the roll would land on it, that's
// silently discarded and the ENTIRE spin (all five rarer-tier checks, then
// this same Mustard-Seed-vs-Pillar split) is rolled again from scratch —
// exactly like drawing another card instead of keeping a blank one.
//
// Because a reroll can loop right back around to real Mustard Seed, Pillar's
// own raw per-roll chance has to be bigger than the simple "old fallback
// share minus the new target" would suggest, to land Mustard Seed's real,
// final share on MUSTARD_TARGET_SHARE. mustardShareOfFallback() solves for
// that exactly, re-derived every roll since Quest Luck upgrades change how
// big the fallback pool even is.
function rarityHitWeight(rarity, oddsN) {
  if (rarity.secret) {
    return 1 - Math.pow(1 - 1 / oddsN, rarity.quests.length);
  }
  return 1 / oddsN;
}

function mustardShareOfFallback(pFallbackReached) {
  if (pFallbackReached <= MUSTARD_TARGET_SHARE) {
    // Even sending 100% of the fallback pool to Mustard Seed can't reach
    // the target (e.g. Quest Luck 2 makes the other five tiers big enough
    // that fallback itself is smaller than 45%) — so skip Pillar entirely.
    return 1;
  }
  return (
    (MUSTARD_TARGET_SHARE * (1 - pFallbackReached)) /
    (pFallbackReached * (1 - MUSTARD_TARGET_SHARE))
  );
}

function pickRandomQuest() {
  for (;;) {
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

    // Nothing rarer hit — decide between real Mustard Seed and Pillar.
    const pFallbackReached = ROLLED_RARITIES.reduce((acc, rarity) => {
      return acc * (1 - rarityHitWeight(rarity, effectiveOddsN(rarity)));
    }, 1);

    if (Math.random() < mustardShareOfFallback(pFallbackReached)) {
      return { rarity: FALLBACK_RARITY, quest: randomQuestFrom(FALLBACK_RARITY) };
    }
    // Pillar — silently roll the whole spin again.
  }
}
