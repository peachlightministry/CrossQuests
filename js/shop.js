// Shop modal UI: tab switching and cosmetics panel rendering. Ownership/equip
// state and purchase logic live in shop-data.js (loaded earlier).
const shopButton = document.getElementById('shop-button');
const shopBackdrop = document.getElementById('shop-modal-backdrop');
const shopClose = document.getElementById('shop-modal-close');
const shopTabs = document.querySelectorAll('.shop-tab');
const shopPanels = document.querySelectorAll('.shop-panel');

function openShop() {
  renderCosmeticsPanel();
  shopBackdrop.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeShop() {
  shopBackdrop.classList.remove('open');
  document.body.classList.remove('modal-open');
}

function switchShopTab(tabId) {
  shopTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
  shopPanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tabId));
}

function renderCosmeticsPanel() {
  const panel = document.getElementById('shop-panel-cosmetics');
  if (!panel) return;

  const equipped = getEquippedCosmetic();
  const points = getPoints();

  panel.innerHTML = COSMETICS.map((item) => {
    const owned = isCosmeticOwned(item.id);
    const isEquipped = equipped === item.id;

    let actionHtml;
    if (isEquipped) {
      actionHtml = `<span class="cosmetic-status equipped">✅ Equipped</span>`;
    } else if (owned) {
      actionHtml = `<button class="cosmetic-action-button" data-action="equip" data-id="${item.id}">Equip</button>`;
    } else if (points >= item.price) {
      actionHtml = `<button class="cosmetic-action-button buy" data-action="buy" data-id="${item.id}">Buy for ${item.price} ${crossIconSVG(14)}</button>`;
    } else {
      actionHtml = `<span class="cosmetic-status locked">Need ${item.price} ${crossIconSVG(14)} — you have ${points}</span>`;
    }

    return `
      <div class="cosmetic-card${isEquipped ? ' equipped-card' : ''}">
        <div class="cosmetic-swatch cosmetic-swatch-${item.id}"></div>
        <div class="cosmetic-info">
          <span class="cosmetic-name">${item.name}</span>
          <span class="cosmetic-description">${item.description}</span>
        </div>
        <div class="cosmetic-action">${actionHtml}</div>
      </div>
    `;
  }).join('');

  panel.querySelectorAll('[data-action="equip"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setEquippedCosmetic(btn.dataset.id);
      renderCosmeticsPanel();
    });
  });
  panel.querySelectorAll('[data-action="buy"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (buyCosmetic(btn.dataset.id)) {
        renderCosmeticsPanel();
      }
    });
  });
}

shopButton.addEventListener('click', () => {
  playSound('click', { volume: 0.4 });
  openShop();
});
shopClose.addEventListener('click', closeShop);
shopBackdrop.addEventListener('click', (e) => {
  if (e.target === shopBackdrop) closeShop();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && shopBackdrop.classList.contains('open')) closeShop();
});
shopTabs.forEach((btn) => {
  btn.addEventListener('click', () => switchShopTab(btn.dataset.tab));
});
