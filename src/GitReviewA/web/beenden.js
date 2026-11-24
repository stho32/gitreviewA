(function () {
  'use strict';

  function init() {
    const knopfElement = document.getElementById('beenden');
    knopfElement.addEventListener('click', () => beendeDenReview(knopfElement));
  }

  async function beendeDenReview(knopfElement) {
    const statusElement = document.getElementById('beenden-status');
    knopfElement.disabled = true;
    statusElement.textContent = '';
    try {
      await beendenAnfordern();
      zeigeBeendet(knopfElement);
    } catch (fehler) {
      statusElement.textContent = `Beenden ist gescheitert: ${fehler.message}`;
      knopfElement.disabled = false;
    }
  }

  async function beendenAnfordern() {
    const antwort = await fetch('api/beenden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
  }

  /** Ersetzt die Bedienung: nach dem Beenden antwortet der Server nicht mehr. */
  function zeigeBeendet(knopfElement) {
    const meldungElement = document.createElement('p');
    meldungElement.className = 'gr-beendet';
    meldungElement.setAttribute('role', 'status');
    meldungElement.textContent = 'Review beendet';
    const hinweisElement = document.createElement('p');
    hinweisElement.className = 'gr-beendet-hinweis muted';
    hinweisElement.textContent = 'Das Ergebnis steht in der Konsole. Dieses Fenster kann geschlossen werden.';
    knopfElement.remove();
    document.querySelector('main').replaceChildren(meldungElement, hinweisElement);
  }

  document.addEventListener('DOMContentLoaded', init);
}());
