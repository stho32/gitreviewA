/* gitreviewA — Hülle des einen Dialogs „Beenden“/„Abbrechen“ (R00050, B4602): Zeichnen aus `beenden-werte.js`, modaler
   Rahmen mit Scrim, Hintergrund inert, Fokusfalle und Fokusrückgabe wie die Hilfe (R00030), Esc/Zurück/Scrim schließen,
   Enter wirkt auf den fokussierten Knopf, sonst als Vorgabe der Beschreibung. Die Fokusfalle fragt ihre Elemente bei jedem
   Tab neu ab (Anschluss I0042); `schliesse({ grund })` ist der eine Weg zum Schließen. Nur `textContent`. */
(function () {
  'use strict';

  /** `ausloeser`: der Knopf, der den Dialog öffnete (Fokus kehrt dorthin zurück); `beschreibung`: dieselbe Beschreibung,
      die Anzeige, Fokus, Enter-Verhalten und Endzustand tragen; `beiBestaetigen`: was der Bestätigungsknopf auslöst. */
  const zustand = { offen: false, ausloeser: null, beschreibung: null, beiBestaetigen: null };

  function init() {
    document.getElementById('beenden-zurueck').addEventListener('click', () => schliesse({ grund: 'zurueck' }));
    document.getElementById('beenden-bestaetigen').addEventListener('click', bestaetigen);
    document.getElementById('beenden-scrim').addEventListener('click', () => schliesse({ grund: 'scrim' }));
    dialogElement().addEventListener('keydown', beiTaste);
  }

  /**
   * Öffnet den Dialog mit einer Beschreibung aus `dialogBeschreibung` und einem Rückruf für den Bestätigungsknopf.
   * Der Vorgabeknopf der Beschreibung bekommt den Fokus („Beenden“ bestätigt, „Abbrechen“ steht auf „Zurück“).
   */
  function oeffnen(ausloeser, beschreibung, beiBestaetigen) {
    zustand.ausloeser = ausloeser && ausloeser !== document.body ? ausloeser : null;
    zustand.beschreibung = beschreibung;
    zustand.beiBestaetigen = beiBestaetigen;
    zeichne(beschreibung);
    scrimElement().hidden = false;
    dialogElement().hidden = false;
    zustand.offen = true;
    setzeHintergrundInert(true);
    fokusVorgabe();
  }

  function zeichne(beschreibung) {
    document.getElementById('beenden-titel').textContent = beschreibung.titel;
    const hinweise = dialogElement().querySelector('.beenden-hinweise');
    hinweise.replaceChildren(...beschreibung.zeilen.map(hinweisElement));
    const abschnitte = dialogElement().querySelector('.beenden-abschnitte');
    abschnitte.replaceChildren();
    abschnitte.hidden = beschreibung.abschnitte.length === 0;
    document.getElementById('beenden-zurueck').textContent = beschreibung.zurueck;
    document.getElementById('beenden-bestaetigen').textContent = beschreibung.bestaetigen;
    zeigeFehler('');
    setzeBestaetigenGesperrt(false);
  }

  function hinweisElement(text) {
    const absatz = document.createElement('p');
    absatz.textContent = text;
    return absatz;
  }

  function fokusVorgabe() {
    const vorgabe = zustand.beschreibung.vorgabe === 'bestaetigen' ? bestaetigenKnopf() : zurueckKnopf();
    vorgabe.focus();
  }

  /** Der Bestätigungsknopf löst den Rückruf aus; der Rückruf entscheidet über Schließen, Fehler und Endzustand. */
  function bestaetigen() {
    const rueckruf = zustand.beiBestaetigen;
    if (typeof rueckruf !== 'function') {
      schliesse({ grund: 'bestaetigen' });
      return;
    }
    rueckruf();
  }

  /**
   * Schließt den Dialog; Esc, „Zurück“ und der Scrim geben den Fokus an den Auslöser zurück („endzustand“ nicht — dann
   * ist der Auslöser samt Bedienung ersetzt).
   */
  function schliesse({ grund } = {}) {
    if (!zustand.offen) {
      return;
    }
    zustand.offen = false;
    setzeHintergrundInert(false);
    scrimElement().hidden = true;
    dialogElement().hidden = true;
    const ausloeser = zustand.ausloeser;
    zustand.ausloeser = null;
    zustand.beschreibung = null;
    zustand.beiBestaetigen = null;
    if (grund !== 'endzustand' && ausloeser && ausloeser.isConnected && typeof ausloeser.focus === 'function') {
      ausloeser.focus();
    }
  }

  function istOffen() {
    return zustand.offen;
  }

  function zeigeFehler(text) {
    document.getElementById('beenden-fehler').textContent = text;
  }

  function setzeBestaetigenGesperrt(gesperrt) {
    bestaetigenKnopf().disabled = gesperrt;
    bestaetigenKnopf().setAttribute('aria-busy', String(gesperrt));
  }

  /** Hintergrund inert: Kopf, Inhalt und Fußzeile sind weder zu bedienen noch vorzulesen (wie die Hilfe). */
  function setzeHintergrundInert(inert) {
    for (const selektor of ['header.kz', 'main.gr-inhalt', 'footer.statuszeile', '[data-hilfe-hintergrund]']) {
      for (const element of document.querySelectorAll(selektor)) {
        if (inert) {
          element.setAttribute('inert', '');
        } else {
          element.removeAttribute('inert');
        }
      }
    }
  }

  function beiTaste(ereignis) {
    if (!zustand.offen) {
      return;
    }
    if (ereignis.key === 'Tab') {
      fokusfalle(ereignis);
      return;
    }
    if (ereignis.key === 'Escape') {
      ereignis.preventDefault();
      schliesse({ grund: 'esc' });
      return;
    }
    if (ereignis.key === 'Enter' && !istBedienelementFokussiert()) {
      ereignis.preventDefault();
      if (zustand.beschreibung.vorgabe === 'bestaetigen') {
        bestaetigen();
      } else {
        schliesse({ grund: 'vorgabe-zurueck' });
      }
    }
  }

  /** Steht der Fokus auf einem Knopf oder Eintrag des Dialogs, wirkt Enter dort (I0042 hängt Einträge an). */
  function istBedienelementFokussiert() {
    const aktiv = document.activeElement;
    return Boolean(aktiv) && aktiv !== dialogElement() && dialogElement().contains(aktiv);
  }

  /** Tab bleibt im Dialog: die Elemente werden bei jedem Tab neu abgefragt, damit später eingefügte Einträge erreichbar sind. */
  function fokusfalle(ereignis) {
    const anlaufpunkte = fokussierbare();
    if (anlaufpunkte.length === 0) {
      return;
    }
    ereignis.preventDefault();
    const stelle = anlaufpunkte.indexOf(document.activeElement);
    const schritt = ereignis.shiftKey ? -1 : 1;
    const naechste = (stelle + schritt + anlaufpunkte.length) % anlaufpunkte.length;
    anlaufpunkte[naechste].focus();
  }

  function fokussierbare() {
    return [...dialogElement().querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(element => element.getClientRects().length > 0);
  }

  function dialogElement() {
    return document.getElementById('beenden-dialog');
  }

  function scrimElement() {
    return document.getElementById('beenden-scrim');
  }

  function zurueckKnopf() {
    return document.getElementById('beenden-zurueck');
  }

  function bestaetigenKnopf() {
    return document.getElementById('beenden-bestaetigen');
  }

  window.gitreviewaBeendenDialog = { oeffnen, schliesse, istOffen, zeigeFehler, setzeBestaetigenGesperrt };

  document.addEventListener('DOMContentLoaded', init);
}());