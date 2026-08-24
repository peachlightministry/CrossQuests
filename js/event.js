(function () {
  const USERNAME_KEY = 'jsq-event-username';

  const formCard = document.getElementById('event-username-form');
  const statusCard = document.getElementById('event-status-card');
  const input = document.getElementById('event-username-input');
  const saveButton = document.getElementById('event-username-save');
  const errorEl = document.getElementById('event-username-error');
  const usernameDisplay = document.getElementById('event-username-display');
  const changeButton = document.getElementById('event-username-change');

  function render() {
    const existing = localStorage.getItem(USERNAME_KEY);
    if (existing) {
      formCard.hidden = true;
      statusCard.hidden = false;
      usernameDisplay.textContent = existing;
    } else {
      formCard.hidden = false;
      statusCard.hidden = true;
      input.value = '';
      errorEl.textContent = '';
    }
  }

  function saveUsername() {
    const value = input.value.trim();
    if (value.length < 4 || value.length > 12) {
      errorEl.textContent = 'Username must be 4–12 characters.';
      return;
    }
    errorEl.textContent = '';
    localStorage.setItem(USERNAME_KEY, value);
    if (typeof window.jsqSyncUsername === 'function') window.jsqSyncUsername(value);
    render();
  }

  saveButton.addEventListener('click', saveUsername);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveUsername();
  });
  changeButton.addEventListener('click', () => {
    localStorage.removeItem(USERNAME_KEY);
    render();
  });

  render();
})();
