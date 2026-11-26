(function () {
  'use strict';

  const KOPIERT = 'Ergebnis kopiert';
  const ABRUF_GESCHEITERT = 'Kopieren nicht möglich: Ergebnis nicht abrufbar';
  const ZWISCHENABLAGE_FEHLT = 'Kopieren nicht möglich: Zwischenablage nicht verfügbar';
  const ZWISCHENABLAGE_VERWEIGERT = 'Kopieren nicht möglich: Zwischenablage verweigert';

  function init() {
    const knopfElement = document.getElementById('ergebnis-kopieren');
    knopfElement.addEventListener('click', () => kopiereErgebnis(knopfElement));
  }

  async function kopiereErgebnis(knopfElement) {
    const statusElement = document.getElementById('kopieren-status');
    knopfElement.disabled = true;
    zeigeStatus(statusElement, '', false);
    try {
      const ergebnis = await fordereErgebnisAn();
      const meldung = await schreibeInZwischenablage(ergebnis);
      const istFehler = meldung.length > 0;
      if (istFehler) {
        zeigeStatus(statusElement, meldung, true);
      } else {
        zeigeStatus(statusElement, KOPIERT, false);
      }
    } catch {
      zeigeStatus(statusElement, ABRUF_GESCHEITERT, true);
    }
    knopfElement.disabled = false;
  }

  /** Liefert das Markdown-Ergebnis aus `GET /api/ergebnis`; die Seite zeigt es in der Ergebnis-Spalte an (R00037). */
  async function fordereErgebnisAn() {
    const antwort = await fetch('api/ergebnis', { headers: { Accept: 'application/json' } });
    const istErfolg = antwort.ok;
    if (!istErfolg) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    const inhalt = await antwort.json();
    return inhalt.ergebnis;
  }

  /** Leer, wenn der Text in der Zwischenablage liegt; sonst die Meldung für den Menschen. */
  async function schreibeInZwischenablage(text) {
    const zwischenablage = navigator.clipboard;
    const fehlt = !zwischenablage || typeof zwischenablage.writeText !== 'function';
    if (fehlt) {
      return ZWISCHENABLAGE_FEHLT;
    }
    try {
      await zwischenablage.writeText(text);
      return '';
    } catch {
      return ZWISCHENABLAGE_VERWEIGERT;
    }
  }

  function zeigeStatus(statusElement, text, istFehler) {
    statusElement.textContent = text;
    statusElement.classList.toggle('fehler', istFehler);
  }

  document.addEventListener('DOMContentLoaded', init);
}());