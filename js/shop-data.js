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
  },
  {
    id: 'divine',
    name: 'Divine Glory',
    price: 50,
    description: 'Blinding white and gold, with embers rising from the seat.',
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
