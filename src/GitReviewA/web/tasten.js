/* gitreviewA — Tastenschicht (R00030): ein `keydown` auf dem Dokument geht durch den Katalog (`tasten-werte.js`) und die
   Kontextregeln; ohne Treffer bleibt die Taste beim Browser. Eine gefundene Aktion löst dasselbe Bedienelement aus wie die Maus
   oder die reine Funktion dahinter. Diese Fassung trägt den Abschnittswechsel (B2903); die übrigen Aktionen kommen mit B2902. */
(function () {
  'use strict';

  const DIFFZEILE = 'tr[data-art]';

  function init() {
    document.addEventListener('keydown', beiTaste);
  }

  function werte() {
    return window.gitreviewaTastenWerte;
  }

  function beiTaste(ereignis) {
    if (ereignis.defaultPrevented || ereignis.isComposing) {
      return;
    }
    const aktion = werte().aktionFuer(ereignis.key, lageJetzt(ereignis));
    if (aktion === null) {
      return;
    }
    if (fuehreAus(aktion, ereignis)) {
      ereignis.preventDefault();
    }
  }

  /** Die Lage des Tastendrucks: Feld im Fokus, Modifikatoren, offener Dialog, Modus und die gebauten Bedienelemente. */
  function lageJetzt(ereignis) {
    return {
      feldImFokus: imEingabefeld(ereignis.target),
      modifikatoren: {
        strg: ereignis.ctrlKey,
        alt: ereignis.altKey,
        meta: ereignis.metaKey,
        altGraph: typeof ereignis.getModifierState === 'function' && ereignis.getModifierState('AltGraph'),
      },
      offenerDialog: Boolean(window.gitreviewaHilfe && window.gitreviewaHilfe.istOffen()),
      modus: window.gitreviewaModus ? window.gitreviewaModus.hole() : werte().EINZELN,
      vorhanden: vorhandeneAktionen(),
    };
  }

  /** Kürzel wirken nur außerhalb von Eingabefeldern (R00030: `input`, `textarea`, `select`, `contenteditable`). */
  function imEingabefeld(ziel) {
    if (!ziel || typeof ziel.closest !== 'function') {
      return false;
    }
    return ziel.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null;
  }

  /** Die Aktionen, deren Bedienelement schon gebaut ist — die Karte des Bedienelements setzt es, ohne diese Schicht umzubauen. */
  function vorhandeneAktionen() {
    return werte().EINTRAEGE
      .filter(eintrag => eintrag.ziel && document.querySelector(eintrag.ziel) !== null)
      .map(eintrag => eintrag.aktion);
  }

  /** Führt die Aktion aus; `false` heißt: nichts getan, die Taste bleibt beim Browser. */
  function fuehreAus(aktion, ereignis) {
    if (aktion === 'abschnittWeiter') {
      return springeAbschnitt(1);
    }
    if (aktion === 'abschnittZurueck') {
      return springeAbschnitt(-1);
    }
    return false;
  }

  /* ── Abschnitt wechseln (B2903) ── */

  /** Die erste Zeile des nächsten bzw. vorigen Abschnitts bekommt den Fokus; am ersten und letzten Abschnitt bleibt er stehen. */
  function springeAbschnitt(richtung) {
    const rollElement = document.querySelector('#diff .df-sc');
    if (!rollElement || rollElement.hidden) {
      return false;
    }
    const zeilen = [...rollElement.querySelectorAll(DIFFZEILE)];
    if (zeilen.length === 0) {
      return false;
    }
    const anfaenge = werte().abschnittsanfaenge(zeilen.map(zeile => zeile.dataset.art));
    const ziel = werte().naechsterAbschnitt(anfaenge, aktuelleZeile(zeilen), richtung);
    if (ziel === null) {
      return true;
    }
    setzeZeilenfokus(zeilen[ziel]);
    return true;
  }

  /** Die Zeile mit dem Fokus, sonst `null` — dann beginnt der Wechsel am Dokumentanfang. */
  function aktuelleZeile(zeilen) {
    const aktiv = document.activeElement;
    if (!aktiv || !aktiv.matches(DIFFZEILE)) {
      return null;
    }
    const stelle = zeilen.indexOf(aktiv);
    return stelle < 0 ? null : stelle;
  }

  /** Wandernder Fokus der Diff-Zeilen wie in `anmerkungen.js`: nur die aktuelle Zeile ist fokussierbar. */
  function setzeZeilenfokus(zeileElement) {
    for (const andere of document.querySelectorAll(`${DIFFZEILE}[tabindex]`)) {
      andere.removeAttribute('tabindex');
    }
    zeileElement.tabIndex = -1;
    zeileElement.focus({ preventScroll: true });
    zeileElement.scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('DOMContentLoaded', init);
}());