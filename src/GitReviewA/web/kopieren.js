/* gitreviewA — die eine Kopierstelle der Dateiansicht (R00043, B4207): schreibt den Text byte-genau über die Zwischenablage-API.
   Fehlt sie oder verweigert sie, erscheint der Ersatzweg: die Datei ist Kopierziel, und das `copy`-Ereignis des Browsers legt
   denselben Text ab (darf ohne Berechtigung schreiben). Ohne Geste wird nie geschrieben und nie gelesen — kein `readText`.
   Nach einem Erfolg bleibt der Knopf bedienbar: jede Geste kopiert erneut.
   Nur `text/plain`: kein `text/html`, kein `text/uri-list` (Angriffsmatrix B7/B8). */
(function (ziel) {
  'use strict';

  const VERWEIGERT = 'Zwischenablage verweigert — Strg+C kopiert die Datei';
  const KOPIERZIEL_KLASSE = 'da-kopierziel';

  let ersatz = null;

  /** Kopiert `text`; `true` bei Erfolg. `optionen`: `{knopf, status, ansage, kopierziel, verweigert}`. */
  function kopiere(text, bestaetigung, optionen) {
    const anlage = optionen || {};
    if (anlage.knopf) {
      anlage.knopf.disabled = true;
    }
    return schreibe(text).then(erfolg => {
      if (erfolg) {
        melde(anlage.status, bestaetigung, false);
        melde(anlage.ansage, bestaetigung, false);
        if (anlage.kopierziel) {
          anlage.kopierziel.classList.remove(KOPIERZIEL_KLASSE);
        }
        if (anlage.knopf) {
          anlage.knopf.disabled = false;
        }
        return true;
      }
      const meldung = anlage.verweigert || VERWEIGERT;
      melde(anlage.status, meldung, true);
      melde(anlage.ansage, meldung, false);
      markiereErsatz(text, bestaetigung, anlage);
      if (anlage.knopf) {
        anlage.knopf.disabled = false;
      }
      return false;
    });
  }

  /** Nur `writeText`; fehlt die API oder wirft sie, gilt das als Verweigerung. */
  function schreibe(text) {
    const zwischenablage = navigator.clipboard;
    const fehlt = !zwischenablage || typeof zwischenablage.writeText !== 'function';
    if (fehlt) {
      return Promise.resolve(false);
    }
    return zwischenablage.writeText(text).then(() => true, () => false);
  }

  /** Nach einer Verweigerung: Datei als Kopierziel markieren; Strg+C legt denselben Text ab, freie Auswahl bleibt dem Browser. */
  function markiereErsatz(text, bestaetigung, anlage) {
    ersatz = { text, bestaetigung, status: anlage.status, ansage: anlage.ansage };
    if (!anlage.kopierziel) {
      return;
    }
    anlage.kopierziel.classList.add(KOPIERZIEL_KLASSE);
    if (anlage.kopierziel.dataset.kopierbereit === 'ja') {
      return;
    }
    anlage.kopierziel.dataset.kopierbereit = 'ja';
    document.addEventListener('copy', beiKopieren);
  }

  function beiKopieren(ereignis) {
    if (!ersatz) {
      return;
    }
    const auswahl = typeof window.getSelection === 'function' ? window.getSelection() : null;
    const freieAuswahl = auswahl && !auswahl.isCollapsed && auswahl.toString().length > 0;
    if (freieAuswahl) {
      return;
    }
    ereignis.clipboardData.setData('text/plain', ersatz.text);
    ereignis.preventDefault();
    melde(ersatz.status, ersatz.bestaetigung, false);
    melde(ersatz.ansage, ersatz.bestaetigung, false);
  }

  function melde(element, text, istFehler) {
    if (!element) {
      return;
    }
    element.textContent = text;
    element.classList.toggle('fehler', Boolean(istFehler));
  }

  const api = { kopiere, VERWEIGERT };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaKopieren = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
