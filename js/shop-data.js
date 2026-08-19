// Cosmetics catalog. "classic" is always owned and free; others are purchased
// with Cross Points. Applies to the side quest spin reel on the home page.
const COSMETICS = [
  {
    id: 'classic',
    name: 'Classic',
    price: 0,
    description: 'The original clean look.',
  },
  {
    id: 'ark',
    name: 'Ark of the Covenant',
    price: 50,
    description: 'Golden, with two cherubim watching over your quest.',
    // Not purchasable — earned as the grand reward for completing all 7
    // achievements (see achievements.js). Hidden from the regular shop
    // listing but kept in this array since it's still a real cosmetic:
    // ownable, equippable, and rendered like any other.
    hidden: true,
  },
  {
    id: 'divine',
    name: 'Divine Glory',
    price: 50,
    description: 'Blinding white and gold, with embers rising from the seat.',
  },
  {
    id: 'divine2',
    name: 'Divine Glory 2',
    price: 1,
    description: 'Same glory, with a light that actually travels the frame in a figure-eight.',
  },
];

// Cosmetics ownership/equip state. Lives here (rather than shop.js) so pages
// that render a cosmetic's effect, like the home page reel, can read it
// before shop.js — which only wires up the modal UI — has loaded.
const OWNED_COSMETICS_KEY = 'jsq-owned-cosmetics';
const EQUIPPED_COSMETIC_KEY = 'jsq-equipped-cosmetic';

function getOwnedCosmetics() {
  try {
    const raw = localStorage.getItem(OWNED_COSMETICS_KEY);
    const list = raw ? JSON.parse(raw) : ['classic'];
    return new Set(Array.isArray(list) && list.length ? list : ['classic']);
  } catch (e) {
    return new Set(['classic']);
  }
}

function isCosmeticOwned(id) {
  return id === 'classic' || getOwnedCosmetics().has(id);
}

function getEquippedCosmetic() {
  try {
    return localStorage.getItem(EQUIPPED_COSMETIC_KEY) || 'classic';
  } catch (e) {
    return 'classic';
  }
}

function setEquippedCosmetic(id) {
  try {
    localStorage.setItem(EQUIPPED_COSMETIC_KEY, id);
  } catch (e) {
    // ignore
  }
  if (typeof refreshEquippedCosmeticVisual === 'function') {
    refreshEquippedCosmeticVisual();
  }
}

function buyCosmetic(id) {
  const item = COSMETICS.find((c) => c.id === id);
  if (!item || isCosmeticOwned(id)) return false;
  if (getPoints() < item.price) return false;

  addPoints(-item.price);
  const owned = getOwnedCosmetics();
  owned.add(id);
  try {
    localStorage.setItem(OWNED_COSMETICS_KEY, JSON.stringify([...owned]));
  } catch (e) {
    // ignore
  }
  setEquippedCosmetic(id);
  return true;
}

// Upgrades catalog. Permanent, one-time purchases (no equip step, unlike
// cosmetics).
const UPGRADES = [
  {
    id: 'quest-luck-1',
    name: 'Quest Luck 1',
    price: 30,
    description: 'Improves your odds of landing a rarer side quest.',
  },
  {
    id: 'quest-luck-2',
    name: 'Quest Luck 2',
    price: 70,
    description: 'Improves your odds even further, stacking with Quest Luck 1.',
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    price: 15,
    description: 'Earn a bonus point on any day you complete both side quests and slay a lie.',
  },
  {
    id: 'divine-gambling',
    name: 'Divine Gambling😏',
    price: 25,
    description: "Land Mustard Seed and there's a 1-in-3 chance a Reroll button appears.",
  },
];

const OWNED_UPGRADES_KEY = 'jsq-owned-upgrades';

function getOwnedUpgrades() {
  try {
    const raw = localStorage.getItem(OWNED_UPGRADES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch (e) {
    return new Set();
  }
}

function isUpgradeOwned(id) {
  return getOwnedUpgrades().has(id);
}

function buyUpgrade(id) {
  const item = UPGRADES.find((u) => u.id === id);
  if (!item || isUpgradeOwned(id)) return false;
  if (getPoints() < item.price) return false;

  addPoints(-item.price);
  const owned = getOwnedUpgrades();
  owned.add(id);
  try {
    localStorage.setItem(OWNED_UPGRADES_KEY, JSON.stringify([...owned]));
  } catch (e) {
    // ignore
  }
  return true;
}
