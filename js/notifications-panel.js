// Bell panel: three one-time special unlocks, each granting an equippable
// title once its condition is met. Also owns the actual browser-notification
// firing used when a spin cooldown resets (app.js / belief-app.js call
// window.jsqFireSpinResetNotification once permission is granted).
const PWA_INSTALLED_KEY = 'jsq-pwa-installed';
const STREAK_TITLE_GOAL = 30;

function isNotificationsGranted() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function isPwaInstalled() {
  try {
    if (localStorage.getItem(PWA_INSTALLED_KEY) === '1') return true;
  } catch (e) {
    // ignore
  }
  const standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (standalone) {
    try {
      localStorage.setItem(PWA_INSTALLED_KEY, '1');
    } catch (e) {
      // ignore
    }
    return true;
  }
  return false;
}

window.addEventListener('appinstalled', () => {
  try {
    localStorage.setItem(PWA_INSTALLED_KEY, '1');
  } catch (e) {
    // ignore
  }
  if (typeof renderNotificationsPanel === 'function') renderNotificationsPanel();
});

async function fireSpinResetNotification(kind) {
  if (!isNotificationsGranted()) return;
  const body =
    kind === 'belief'
      ? 'Your Slay a Lie spin has reset — go slay another lie! ⚔️'
      : 'Your Side Quest spins have reset — go spin something new! 🎲';
  const options = { body, icon: 'img/peachlight-mark.png', badge: 'img/peachlight-mark.png' };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification('CrossQuests', options);
        return;
      }
    }
    new Notification('CrossQuests', options);
  } catch (e) {
    console.error('Notification failed:', e);
  }
}
window.jsqFireSpinResetNotification = fireSpinResetNotification;

const NOTIF_QUESTS = [
  {
    id: 'prepared',
    title: 'Enable Notifications',
    description: 'Enable notifications to receive a notification when your spins reset.',
    titleId: 'prepared',
    isEarned: isNotificationsGranted,
    actionLabel: 'Enable Notifications',
    async onAction() {
      if (typeof Notification === 'undefined') return 'Notifications aren’t supported in this browser.';
      const result = await Notification.requestPermission();
      if (result !== 'granted') return 'Notifications are blocked — enable them in your browser settings to claim this.';
      return null;
    },
  },
  {
    id: 'questbound',
    title: 'Add to Home Screen',
    description: 'Add CrossQuests to your homescreen.',
    titleId: 'questbound',
    isEarned: isPwaInstalled,
    actionLabel: "I've added it",
    async onAction() {
      // We can't always detect this programmatically (iOS Safari in
      // particular never fires an install event), so a manual claim is
      // the honest fallback once someone's actually done it.
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, '1');
      } catch (e) {
        // ignore
      }
      return null;
    },
  },
  {
    id: 'mythic-truth-seeker',
    title: 'Streak Master',
    description: `Reach a login streak of ${STREAK_TITLE_GOAL}.`,
    titleId: 'mythic-truth-seeker',
    isEarned: () => (typeof window.jsqGetStreakCount === 'function' ? window.jsqGetStreakCount() : 0) >= STREAK_TITLE_GOAL,
    actionLabel: null,
  },
];

const notifButton = document.getElementById('notifications-button');
const notifBackdrop = document.getElementById('notifications-modal-backdrop');
const notifClose = document.getElementById('notifications-modal-close');
const notifList = document.getElementById('notifications-list');
const notifBadge = document.getElementById('notifications-badge');

function renderNotificationsPanel() {
  if (!notifList) return;
  notifList.innerHTML = NOTIF_QUESTS.map((q) => {
    const claimed = window.jsqIsTitleClaimed && window.jsqIsTitleClaimed(q.titleId);
    const earned = !claimed && q.isEarned();
    const title = window.jsqTitleInfo ? window.jsqTitleInfo(q.titleId) : null;
    let actionHtml;
    if (claimed) {
      actionHtml = '<span class="notif-quest-status">✅ Claimed</span>';
    } else if (earned) {
      actionHtml = `<button class="notif-quest-claim" data-id="${q.id}">Claim title</button>`;
    } else if (q.actionLabel) {
      actionHtml = `<button class="notif-quest-action-button" data-id="${q.id}">${q.actionLabel}</button>`;
    } else {
      actionHtml = '<span class="notif-quest-status">Locked</span>';
    }
    return `
      <div class="notif-quest-card">
        <div class="notif-quest-title">${q.title}</div>
        <p class="notif-quest-desc">${q.description}</p>
        <p class="notif-quest-reward">🎖️ Reward: <span style="color:${title ? title.color : 'inherit'}; font-weight:800;">${title ? title.name : ''}</span> title</p>
        <div class="notif-quest-action-row">${actionHtml}</div>
        <p class="notif-quest-feedback" data-id="${q.id}"></p>
      </div>`;
  }).join('');

  notifList.querySelectorAll('.notif-quest-claim').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = NOTIF_QUESTS.find((n) => n.id === btn.dataset.id);
      if (!q || !window.jsqClaimTitle) return;
      window.jsqClaimTitle(q.titleId);
      renderNotificationsPanel();
      refreshNotificationsBadge();
    });
  });
  notifList.querySelectorAll('.notif-quest-action-button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const q = NOTIF_QUESTS.find((n) => n.id === btn.dataset.id);
      if (!q) return;
      btn.disabled = true;
      const error = await q.onAction();
      const feedback = notifList.querySelector(`.notif-quest-feedback[data-id="${q.id}"]`);
      if (error) {
        if (feedback) feedback.textContent = error;
        btn.disabled = false;
      } else {
        renderNotificationsPanel();
        refreshNotificationsBadge();
      }
    });
  });
}

function refreshNotificationsBadge() {
  if (!notifBadge) return;
  const count = NOTIF_QUESTS.filter((q) => window.jsqIsTitleClaimed && !window.jsqIsTitleClaimed(q.titleId) && q.isEarned()).length;
  notifBadge.textContent = String(count);
  notifBadge.hidden = count === 0;
}

if (notifButton && notifBackdrop && notifClose) {
  notifButton.addEventListener('click', () => {
    notifBackdrop.classList.add('open');
    renderNotificationsPanel();
  });
  notifClose.addEventListener('click', () => notifBackdrop.classList.remove('open'));
  notifBackdrop.addEventListener('click', (e) => {
    if (e.target === notifBackdrop) notifBackdrop.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && notifBackdrop.classList.contains('open')) notifBackdrop.classList.remove('open');
  });
}

refreshNotificationsBadge();
setInterval(refreshNotificationsBadge, 15000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('Service worker registration failed:', err));
  });
}
