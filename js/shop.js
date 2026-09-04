// Shop modal UI: tab switching and cosmetics panel rendering. Ownership/equip
// state and purchase logic live in shop-data.js (loaded earlier).
const shopButton = document.getElementById('shop-button');
const shopBackdrop = document.getElementById('shop-modal-backdrop');
const shopClose = document.getElementById('shop-modal-close');
const shopTabs = document.querySelectorAll('.shop-tab');
const shopPanels = document.querySelectorAll('.shop-panel');

function openShop() {
  renderCosmeticsPanel();
  renderUpgradesPanel();
  shopBackdrop.classList.add('open');
  document.body.classList.add('modal-open');
}

// "!" alerts: Upgrades/Cosmetics light up while something in them is
// affordable and not yet owned; Event lights up while an event is live
// (cached by event-points.js, since this plain script can't reach Firestore
// itself). The Shop button lights up if any of the three do.
function computeUpgradesAlert() {
  const points = getPoints();
  return UPGRADES.some(
    (item) =>
      !isUpgradeOwned(item.id) &&
      !item.comingSoon &&
      !item.disabledLabel &&
      !(item.requires && !isUpgradeOwned(item.requires)) &&
      points >= item.price
  );
}

function computeCosmeticsAlert() {
  const points = getPoints();
  const equipped = getEquippedCosmetic();
  return COSMETICS.filter(
    (item) => !item.hidden || isCosmeticOwned(item.id) || (item.revealCheck && item.revealCheck())
  ).some((item) => !isCosmeticOwned(item.id) && equipped !== item.id && points >= item.price);
}

// The Event alert dismisses once its tab has been opened, rather than
// staying lit for the entire event — otherwise it never goes away while an
// event is running. Re-lights automatically for a genuinely NEW event, since
// that has a different startAt than whatever was last marked seen.
function computeEventAlert() {
  try {
    const cache = JSON.parse(localStorage.getItem('jsq-event-cache') || '{}');
    if (!cache.active) return false;
    const seen = localStorage.getItem('jsq-shop-event-seen');
    return String(cache.startAt || 0) !== seen;
  } catch (e) {
    return false;
  }
}

function markEventTabSeen() {
  try {
    const cache = JSON.parse(localStorage.getItem('jsq-event-cache') || '{}');
    localStorage.setItem('jsq-shop-event-seen', String(cache.startAt || 0));
  } catch (e) {
    // ignore
  }
  refreshShopBadges();
}

function refreshShopBadges() {
  const upgradesAlert = computeUpgradesAlert();
  const cosmeticsAlert = computeCosmeticsAlert();
  const eventAlert = computeEventAlert();

  const tabAlerts = {
    upgrades: document.querySelector('[data-tab-alert="upgrades"]'),
    cosmetics: document.querySelector('[data-tab-alert="cosmetics"]'),
    event: document.querySelector('[data-tab-alert="event"]'),
  };
  if (tabAlerts.upgrades) tabAlerts.upgrades.hidden = !upgradesAlert;
  if (tabAlerts.cosmetics) tabAlerts.cosmetics.hidden = !cosmeticsAlert;
  if (tabAlerts.event) tabAlerts.event.hidden = !eventAlert;

  const shopAlertBadge = document.getElementById('shop-alert-badge');
  if (shopAlertBadge) shopAlertBadge.hidden = !(upgradesAlert || cosmeticsAlert || eventAlert);
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

  panel.innerHTML = COSMETICS.filter((item) => !item.hidden || isCosmeticOwned(item.id) || (item.revealCheck && item.revealCheck())).map((item) => {
    const owned = isCosmeticOwned(item.id);
    const isEquipped = equipped === item.id;

    let actionHtml;
    if (isEquipped) {
      actionHtml = `<span class="cosmetic-status equipped">✅ Equipped</span>`;
    } else if (owned) {
      actionHtml = `<button class="cosmetic-action-button" data-action="equip" data-id="${item.id}">Equip</button>`;
    } else if (item.price === 0 && points >= item.price) {
      actionHtml = `<button class="cosmetic-action-button buy" data-action="buy" data-id="${item.id}">Claim (Free)</button>`;
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
  refreshShopBadges();
}

function renderUpgradesPanel() {
  const panel = document.getElementById('shop-panel-upgrades');
  if (!panel) return;

  const points = getPoints();

  panel.innerHTML = UPGRADES.map((item) => {
    const owned = isUpgradeOwned(item.id);

    const requiredItem = item.requires ? UPGRADES.find((u) => u.id === item.requires) : null;
    const requirementMet = !item.requires || isUpgradeOwned(item.requires);

    let actionHtml;
    if (owned) {
      actionHtml = `<span class="cosmetic-status equipped">✅ Owned</span>`;
    } else if (item.comingSoon) {
      actionHtml = `<button class="cosmetic-action-button" disabled>Coming Soon</button>`;
    } else if (item.disabledLabel) {
      actionHtml = `<button class="cosmetic-action-button" disabled>${item.disabledLabel}</button>`;
    } else if (!requirementMet) {
      actionHtml = `<span class="cosmetic-status locked">Requires ${requiredItem ? requiredItem.name : 'a prior upgrade'}</span>`;
    } else if (points >= item.price) {
      actionHtml = `<button class="cosmetic-action-button buy" data-action="buy-upgrade" data-id="${item.id}">Buy for ${item.price} ${crossIconSVG(14)}</button>`;
    } else {
      actionHtml = `<span class="cosmetic-status locked">Need ${item.price} ${crossIconSVG(14)} — you have ${points}</span>`;
    }

    return `
      <div class="cosmetic-card${owned ? ' equipped-card' : ''}">
        <div class="cosmetic-info">
          <span class="cosmetic-name">${item.name}</span>
          <span class="cosmetic-description">${item.description}</span>
        </div>
        <div class="cosmetic-action">${actionHtml}</div>
      </div>
    `;
  }).join('');

  panel.querySelectorAll('[data-action="buy-upgrade"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (buyUpgrade(btn.dataset.id)) {
        renderUpgradesPanel();
      }
    });
  });
  refreshShopBadges();
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
  btn.addEventListener('click', () => {
    switchShopTab(btn.dataset.tab);
    if (btn.dataset.tab === 'event') markEventTabSeen();
  });
});

refreshShopBadges();
setInterval(refreshShopBadges, 5000);
