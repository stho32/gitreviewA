/* gitreviewA — Hilfe-Overlay (R00030, B2905): `?` und der Knopf „Kürzel“ im Kopf öffnen einen modalen Dialog mit allen Kürzeln aus
   dem Katalog (`tasten-werte.js`), gruppiert nach Bereich. Im aktuellen Modus nicht verfügbare Aktionen sind markiert. Esc, der
   Schließen-Knopf und ein Klick daneben schließen; der Fokus ist im Dialog gefangen und kehrt zum Auslöser zurück, der Hintergrund
   ist inert und abgeschirmt (Scrim). Kein Serverweg, kein `git`-Aufruf. */
(function () {
  'use strict';

  const zustand = { offen: false, ausloeser: null };

  function init() {
    const knopf = document.getElementById('hilfe-knopf');
    if (knopf) {
      knopf.addEventListener('click', () => oeffnen());
    }
    const schliessenKnopf = document.getElementById('hilfe-zu');
    if (schliessenKnopf) {
      schliessenKnopf.addEventListener('click', schliessen);
    }
    const scrim = document.getElementById('hilfe-scrim');
    if (scrim) {
      scrim.addEventListener('click', schliessen);
    }
    const dialog = dialogElement();
    if (dialog) {
      dialog.addEventListener('keydown', beiTasteImDialog);
    }
    document.addEventListener('modus-gewechselt', () => {
      if (zustand.offen) {
        zeichneInhalt();
      }
    });
  }

  /** Öffnet den Dialog (ein zweiter Aufruf schließt ihn wieder); der Fokus geht hinein, der Hintergrund wird inert. */
  function oeffnen() {
    if (zustand.offen) {
      schliessen();
      return;
    }
    const aktiv = document.activeElement;
    zustand.ausloeser = aktiv && aktiv !== document.body ? aktiv : null;
    zeichneInhalt();
    document.getElementById('hilfe-scrim').hidden = false;
    dialogElement().hidden = false;
    zustand.offen = true;
    setzeHintergrundInert(true);
    const erstes = fokussierbare()[0];
    if (erstes) {
      erstes.focus();
    }
  }

  /** Schließt den Dialog; der Fokus kehrt zum Auslöser zurück (R00030, Entscheidung des PO). */
  function schliessen() {
    if (!zustand.offen) {
      return;
    }
    zustand.offen = false;
    setzeHintergrundInert(false);
    dialogElement().hidden = true;
    document.getElementById('hilfe-scrim').hidden = true;
    const ausloeser = zustand.ausloeser;
    zustand.ausloeser = null;
    if (ausloeser && ausloeser.isConnected && typeof ausloeser.focus === 'function') {
      ausloeser.focus();
    }
  }

  function istOffen() {
    return zustand.offen;
  }

  /** Hintergrund inert: Kopf, Inhalt und Fußzeile sind weder zu bedienen noch vorzulesen. */
  function setzeHintergrundInert(inert) {
    for (const selektor of ['header.kz', 'main.gr-inhalt', 'footer.statuszeile']) {
      const element = document.querySelector(selektor);
      if (!element) {
        continue;
      }
      if (inert) {
        element.setAttribute('inert', '');
      } else {
        element.removeAttribute('inert');
      }
    }
  }

  /** Die Hilfe aus dem Katalog: je Bereich eine Gruppe mit ihren Einträgen; nicht verfügbare sind als solche markiert. */
  function zeichneInhalt() {
    const inhalt = dialogElement().querySelector('.hilfe-inhalt');
    const lage = { modus: window.gitreviewaModus ? window.gitreviewaModus.hole() : window.gitreviewaTastenWerte.EINZELN, vorhanden: [] };
    inhalt.replaceChildren(...window.gitreviewaTastenWerte.belegung(lage).map(gruppeElement));
  }

  function gruppeElement(gruppe) {
    const bereich = document.createElement('section');
    bereich.className = 'hilfe-gruppe';
    bereich.dataset.gruppe = gruppe.kennung;
    const titel = document.createElement('h3');
    titel.textContent = gruppe.titel;
    const liste = document.createElement('ul');
    liste.append(...gruppe.eintraege.map(eintragElement));
    bereich.append(titel, liste);
    return bereich;
  }

  /** Ein Eintrag: die Tasten als `<kbd>`, der Text daneben, bei fehlender Aktion der sichtbare Vermerk. */
  function eintragElement(eintrag) {
    const zeile = document.createElement('li');
    zeile.dataset.verfuegbar = String(eintrag.verfuegbar);
    const tasten = document.createElement('span');
    tasten.className = 'hilfe-tasten';
    for (const taste of eintrag.anzeige) {
      const kbd = document.createElement('kbd');
      kbd.textContent = taste;
      tasten.append(kbd);
    }
    zeile.append(tasten, document.createTextNode(` ${eintrag.text}`));
    if (!eintrag.verfuegbar) {
      const vermerk = document.createElement('span');
      vermerk.className = 'hilfe-vermerk';
      vermerk.textContent = ' (hier nicht verfügbar)';
      zeile.append(vermerk);
    }
    return zeile;
  }

  /** Tab bleibt im Dialog: der Fokus läuft zwischen den fokussierbaren Elementen um. */
  function beiTasteImDialog(ereignis) {
    if (ereignis.key !== 'Tab') {
      return;
    }
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
    return document.getElementById('hilfe');
  }

  window.gitreviewaHilfe = { oeffnen, schliessen, istOffen };

  document.addEventListener('DOMContentLoaded', init);
}());