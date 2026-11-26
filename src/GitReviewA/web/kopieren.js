/* gitreviewA — die eine Kopierstelle der Dateiansicht (R00043 B4207, R00044 B4223): schreibt den Text byte-genau über die
   Zwischenablage-API. Das **Kopierziel** (Datei oder Bereich) bestimmt der Aufrufer an einer Stelle und übergibt `text` und
   Bestätigung; Knopf, Kürzel und Ersatzweg nutzen nur sie. Fehlt die API oder verweigert sie, erscheint der Ersatzweg: das
   Kopierziel ist markiert, und das `copy`-Ereignis des Browsers legt denselben Text ab (darf ohne Berechtigung schreiben).
   Ohne Geste wird nie geschrieben und nie gelesen — kein `readText`. Nach einem Erfolg bleibt der Knopf bedienbar.
   Nur `text/plain`: kein `text/html`, kein `text/uri-list` (Angriffsmatrix B7/B8). */
(function (ziel) {
  'use strict';

  const VERWEIGERT = 'Zwischenablage verweigert — Strg+C kopiert die Datei';
  const KOPIERZIEL_KLASSE = 'da-kopierziel';

  let ersatz = null;
  let zielHolen = null;
  let hoerer = false;

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

  /** Das Kopierziel für Strg+C (eine Stelle): `holen()` liefert `{text, bestaetigung, optionen}` oder `null`. */
  function zielQuelle(holen) {
    zielHolen = holen;
    hoereAufKopieren();
  }

  /** Nach einer Verweigerung: das Kopierziel markieren; Strg+C legt denselben Text ab, freie Auswahl bleibt dem Browser. */
  function markiereErsatz(text, bestaetigung, anlage) {
    ersatz = { text, bestaetigung, optionen: anlage };
    if (!anlage.kopierziel) {
      return;
    }
    anlage.kopierziel.classList.add(KOPIERZIEL_KLASSE);
    hoereAufKopieren();
  }

  function hoereAufKopieren() {
    if (hoerer) {
      return;
    }
    hoerer = true;
    document.addEventListener('copy', beiKopieren);
  }

  /** Strg+C ohne freie Auswahl legt das Kopierziel ab: den markierten Bereich, sonst den Ersatzweg nach einer Verweigerung. */
  function beiKopieren(ereignis) {
    const auswahl = typeof window.getSelection === 'function' ? window.getSelection() : null;
    const freieAuswahl = auswahl && !auswahl.isCollapsed && auswahl.toString().length > 0;
    if (freieAuswahl) {
      return;
    }
    const aktuell = (zielHolen && zielHolen()) || ersatz;
    if (!aktuell) {
      return;
    }
    ereignis.clipboardData.setData('text/plain', aktuell.text);
    ereignis.preventDefault();
    melde(aktuell.optionen.status, aktuell.bestaetigung, false);
    melde(aktuell.optionen.ansage, aktuell.bestaetigung, false);
  }

  function melde(element, text, istFehler) {
    if (!element) {
      return;
    }
    element.textContent = text;
    element.classList.toggle('fehler', Boolean(istFehler));
  }

  const api = { kopiere, zielQuelle, VERWEIGERT };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaKopieren = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
