(function () {
  'use strict';

  const ABRUF_GESCHEITERT = 'Kopieren nicht möglich: Ergebnis nicht abrufbar';

  function init() {
    const knopfElement = document.getElementById('ergebnis-kopieren');
    knopfElement.addEventListener('click', () => kopiereErgebnis(knopfElement));
  }

  async function kopiereErgebnis(knopfElement) {
    const statusElement = document.getElementById('kopieren-status');
    knopfElement.disabled = true;
    statusElement.classList.remove('fehler');
    statusElement.textContent = '';
    try {
      await fordereErgebnisAn();
    } catch {
      statusElement.classList.add('fehler');
      statusElement.textContent = ABRUF_GESCHEITERT;
    }
    knopfElement.disabled = false;
  }

  /** Liefert das Markdown-Ergebnis aus `GET /api/ergebnis`; die Seite zeigt es nie an. */
  async function fordereErgebnisAn() {
    const antwort = await fetch('api/ergebnis', { headers: { Accept: 'application/json' } });
    const istErfolg = antwort.ok;
    if (!istErfolg) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    const inhalt = await antwort.json();
    return inhalt.ergebnis;
  }

  document.addEventListener('DOMContentLoaded', init);
}());