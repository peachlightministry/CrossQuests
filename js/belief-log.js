const beliefProgress = document.getElementById('belief-progress');
const beliefList = document.getElementById('belief-list');

function renderBeliefLog() {
  beliefProgress.textContent = `${countConquered()} out of ${totalBeliefs()} conquered`;

  beliefList.innerHTML = FALSE_BELIEFS.map((belief) => {
    const conquered = isConquered(belief.id);
    if (!conquered) {
      return `<li class="unknown">???</li>`;
    }
    return `
      <li class="found belief-entry">
        <span class="belief-quote">"${belief.belief}"</span>
        <span class="belief-explanation">${belief.explanation}</span>
        <span class="belief-reference">${belief.reference}</span>
        ${belief.challenge ? `<span class="belief-challenge">Challenge: ${belief.challenge}</span>` : ''}
      </li>
    `;
  }).join('');
}

renderBeliefLog();
