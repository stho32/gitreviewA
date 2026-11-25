/* gitreviewA — Tastenschicht (R00030): ein `keydown` auf dem Dokument geht durch den Katalog (`tasten-werte.js`) und die
   Kontextregeln; ohne Treffer bleibt die Taste beim Browser. Eine gefundene Aktion löst dasselbe Bedienelement aus wie die Maus
   (Klick auf Kästchen, Umschalter, Knopf, Verweis) oder die reine Funktion dahinter (Abschnittswechsel, Lücke). Nach `j`/`k`,
   `u`, `[` und `]` steht der Fokus auf der neuen Wahl; Zustandsänderungen sagt die höfliche Live-Region an. Die Tastenschicht liest
   nur die schon geladene Seite — kein neuer Serverweg, kein neuer `git`-Aufruf. */
(function () {
  'use strict';

  const DIFFZEILE = 'tr[data-art]';
  const DATEIZEILE = '#datei-zeilen .datei-zeile';
  /** Eingabefelder, in denen allein das Feld wirkt; Kästchen und Optionsfelder sind Bedienelemente, keine Textfelder. */
  const TEXTFELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable=""], [contenteditable="true"]';

  /** `fokusNachSprung`: die neue Wahl bekommt den Fokus, sobald die Liste sie zeichnet (Sprung über einen Commit hinweg ist spät). */
  const zustand = { fokusNachSprung: false, ansageAusstehend: null };

  function init() {
    document.addEventListener('keydown', beiTaste);
    zeichneStatuszeile();
    document.addEventListener('modus-gewechselt', zeichneStatuszeile);
    document.addEventListener('datei-gewaehlt', () => {
      if (zustand.fokusNachSprung) {
        zustand.fokusNachSprung = false;
        fokussiereGewaehlteZeile();
      }
    });
    document.addEventListener('haken-geaendert', ansageNachHaken);
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
    if (fuehreAus(aktion)) {
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

  /** Kürzel wirken nur außerhalb von Textfeldern und Eingaben (R00030); offene Muster- und Suchfelder sind Eingaben. */
  function imEingabefeld(ziel) {
    if (!ziel || typeof ziel.closest !== 'function') {
      return false;
    }
    return ziel.closest(TEXTFELD) !== null;
  }

  /** Die Aktionen, deren Bedienelement schon gebaut ist — die Karte des Bedienelements setzt es, ohne diese Schicht umzubauen. */
  function vorhandeneAktionen() {
    return werte().EINTRAEGE
      .filter(eintrag => eintrag.ziel && document.querySelector(eintrag.ziel) !== null)
      .map(eintrag => eintrag.aktion);
  }

  /** Führt die Aktion aus; `false` heißt: nichts getan, die Taste bleibt beim Browser. */
  function fuehreAus(aktion) {
    switch (aktion) {
      case 'dateiWeiter': return schrittDatei(1);
      case 'dateiZurueck': return schrittDatei(-1);
      case 'naechsteUngepruefte': return springeZurNaechsten();
      case 'abhaken': return hakeAb();
      case 'modusWechseln': return wechsleModus();
      case 'commitWeiter': return schrittCommit(1);
      case 'commitZurueck': return schrittCommit(-1);
      case 'abgehakteAusblenden': return schalteAbgehakteAusblenden();
      case 'abschnittWeiter': return springeAbschnitt(1);
      case 'abschnittZurueck': return springeAbschnitt(-1);
      case 'zeileAnmerken': return merkeZeileAn();
      case 'ansichtWechseln': return wechsleAnsicht();
      case 'anordnungWechseln': return wechsleAnordnung();
      case 'umbruchWechseln': return schalteUmbruch();
      case 'leerraumWechseln': return schalteLeerraum();
      case 'naechsteLuecke': return springeZurLuecke();
      case 'inVsCode': return oeffneVsCode();
      case 'suche': return fokussiere('#suche-eingabe');
      case 'dateiAnmerken': return merkeDateiAn();
      case 'anmerkungAendern': return aendereAnmerkung();
      case 'hilfe': return oeffneHilfe();
      case 'schliessen': return schliesseHilfe();
      default: return false;
    }
  }

  /* ── Dateiliste: j/k, u, x, m, [ ] (B2902) ── */

  /** `j`/`k` gehen von der Wahl (oder der fokussierten Zeile) eine Zeile weiter und wählen sie; an den Enden bleiben sie stehen. */
  function schrittDatei(schritt) {
    const zeilen = dateizeilen();
    if (zeilen.length === 0) {
      return false;
    }
    let stelle = zeilen.findIndex(zeile => zeile.getAttribute('aria-current') === 'true');
    if (stelle < 0) {
      stelle = zeilen.findIndex(zeile => zeile === document.activeElement);
    }
    if (stelle < 0 && istInDerListe(document.activeElement)) {
      // Die Liste hat den Fokus, aber noch keine Wahl: der Zeiger steht auf der ersten Zeile.
      stelle = 0;
    }
    if (stelle < 0) {
      stelle = schritt > 0 ? -1 : zeilen.length;
    }
    const ziel = stelle + schritt;
    if (ziel < 0 || ziel >= zeilen.length) {
      return false;
    }
    waehleDateizeile(zeilen[ziel]);
    return true;
  }

  function istInDerListe(ziel) {
    const liste = document.getElementById('datei-zeilen');
    return Boolean(liste && ziel && liste.contains(ziel));
  }

  /** Die Wahl über denselben Weg wie die Maus (Klick auf die Zeile), danach der Fokus auf der Zeile (Entscheidung des PO). */
  function waehleDateizeile(zeileElement) {
    zeileElement.click();
    zeileElement.focus({ preventScroll: true });
    zeileElement.scrollIntoView({ block: 'nearest' });
  }

  /** `u` betätigt den Knopf „Nächste ungeprüfte“ und holt den Fokus auf die neue Wahl. */
  function springeZurNaechsten() {
    const knopf = document.getElementById('naechste-ungepruefte');
    if (!knopf || knopf.disabled || knopf.hidden) {
      return false;
    }
    zustand.fokusNachSprung = true;
    knopf.click();
    return true;
  }

  function fokussiereGewaehlteZeile() {
    const zeile = document.querySelector(`${DATEIZEILE}[aria-current="true"]`);
    if (zeile) {
      zeile.focus({ preventScroll: true });
      zeile.scrollIntoView({ block: 'nearest' });
    }
  }

  /** `x` betätigt das Kästchen der gewählten Datei (ohne Wahl das im Diff-Kopf); eine Sperre umgeht es nicht. */
  function hakeAb() {
    const zeile = document.querySelector(`${DATEIZEILE}[aria-current="true"]`);
    const kaestchen = zeile ? zeile.querySelector('input.haken') : document.getElementById('diff-haken');
    if (!kaestchen) {
      return false;
    }
    const warAbgehakt = kaestchen.checked;
    zustand.ansageAusstehend = { pfad: zeile ? zeile.dataset.pfad : pfadImDiff(), abgehakt: !warAbgehakt };
    kaestchen.click();
    return true;
  }

  function pfadImDiff() {
    const element = document.querySelector('#diff .diff-pfad');
    return element ? element.textContent : '';
  }

  /** Die Ansage kommt erst mit dem bestätigten Stand; ein gesperrtes Kästchen löst keine Änderung und keine Ansage aus. */
  function ansageNachHaken() {
    const ausstehend = zustand.ansageAusstehend;
    if (!ausstehend) {
      return;
    }
    zustand.ansageAusstehend = null;
    const pfad = sichtbarerName(ausstehend.pfad);
    ansagen(ausstehend.abgehakt ? `${pfad} abgehakt` : `Haken für ${pfad} entfernt`);
  }

  /** `m` schaltet den Modus wie ein Klick auf den Umschalter; die Wahl folgt der Regel beim Wechsel. */
  function wechsleModus() {
    const zusammen = window.gitreviewaModus ? window.gitreviewaModus.istZusammen() : false;
    const knopf = document.getElementById(zusammen ? 'modus-einzeln' : 'modus-zusammen');
    if (!knopf) {
      return false;
    }
    knopf.click();
    ansagen(zusammen ? 'Modus Einzeln' : 'Modus Zusammen');
    return true;
  }

  /** `[`/`]` betätigen den Commit-Wähler; der Fokus steht danach auf dem Commit-Feld (Entscheidung des PO). */
  function schrittCommit(schritt) {
    if (!window.gitreviewaModus || window.gitreviewaModus.istZusammen()) {
      return false;
    }
    const knopf = document.getElementById(schritt > 0 ? 'waehler-weiter' : 'waehler-zurueck');
    if (!knopf || knopf.disabled) {
      return false;
    }
    knopf.click();
    const wahl = document.getElementById('waehler-auswahl');
    if (wahl) {
      wahl.focus({ preventScroll: true });
    }
    return true;
  }

  /* ── Diff: Abschnitte, Anmerken, Umschalten, Sprünge (B2902/B2903) ── */

  /** Die erste Zeile des nächsten bzw. vorigen Abschnitts bekommt den Fokus; am ersten und letzten Abschnitt bleibt er stehen. */
  function springeAbschnitt(richtung) {
    const rollElement = rollbereich();
    if (!rollElement) {
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

  function rollbereich() {
    const rollElement = document.querySelector('#diff .df-sc');
    if (!rollElement || rollElement.hidden) {
      return null;
    }
    return rollElement;
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

  /** `Enter` merkt die fokussierte Diff-Zeile an — derselbe Weg wie ein Klick (Feld öffnet mit Fokus). */
  function merkeZeileAn() {
    const aktiv = document.activeElement;
    if (!aktiv || !aktiv.matches(DIFFZEILE) || !rollbereich() || !rollbereich().contains(aktiv)) {
      return false;
    }
    aktiv.click();
    return true;
  }

  /** `s` schaltet „nur Änderungen“/„ganze Datei“ wie das Optionsfeld im Diff-Kopf. */
  function wechsleAnsicht() {
    const offen = [...document.querySelectorAll('#diff input[name="diffansicht"]')].find(feld => !feld.checked);
    if (!offen) {
      return false;
    }
    offen.click();
    ansagen(`Ansicht: ${offen.value === 'ganz' ? 'ganze Datei' : 'nur Änderungen'}`);
    return true;
  }

  /** `v` schaltet die Anordnung wie die Gruppe „Anordnung“ aus I0007, sobald sie gebaut ist. */
  function wechsleAnordnung() {
    const gruppe = document.querySelector('[data-gruppe="anordnung"]');
    if (!gruppe) {
      return false;
    }
    const nichtGedrueckt = gruppe.querySelector('button[aria-pressed="false"]');
    const knopf = nichtGedrueckt || gruppe.querySelector('button');
    if (!knopf) {
      return false;
    }
    knopf.click();
    ansagen(`Anordnung: ${knopf.textContent.trim()}`);
    return true;
  }

  function schalteUmbruch() {
    const schalter = document.querySelector('#diff .umbruch-schalter');
    if (!schalter) {
      return false;
    }
    schalter.click();
    ansagen(`Umbruch ${schalter.checked ? 'an' : 'aus'}`);
    return true;
  }

  function schalteLeerraum() {
    const schalter = document.querySelector('#diff .leerraum-schalter');
    if (!schalter) {
      return false;
    }
    schalter.click();
    ansagen(`Leerraum ${schalter.checked ? 'ignorieren' : 'beachten'}`);
    return true;
  }

  /** `h` betätigt den Schalter „Abgehakte ausblenden“, sobald I0026 ihn baut. */
  function schalteAbgehakteAusblenden() {
    const schalter = document.getElementById('ausblenden');
    if (!schalter) {
      return false;
    }
    schalter.click();
    ansagen(`Abgehakte ${schalter.checked ? 'ausgeblendet' : 'sichtbar'}`);
    return true;
  }

  /** `g` springt zur nächsten Lücke: der Fokus steht auf ihrem Aufklapp-Knopf; ohne weitere Lücke bleibt er stehen. */
  function springeZurLuecke() {
    const rollElement = rollbereich();
    if (!rollElement) {
      return false;
    }
    const posten = [...rollElement.querySelectorAll(`tr[data-art], .dz-l-auf:not([data-ganz])`)];
    const luecken = posten.filter(postenElement => postenElement.matches('.dz-l-auf'));
    if (luecken.length === 0) {
      return false;
    }
    const aktiv = document.activeElement;
    const stelle = posten.indexOf(aktiv);
    const ziel = stelle < 0 ? luecken[0] : posten.slice(stelle + 1).find(postenElement => postenElement.matches('.dz-l-auf'));
    if (!ziel) {
      return true;
    }
    ziel.focus({ preventScroll: true });
    ziel.scrollIntoView({ block: 'nearest' });
    return true;
  }

  /** `o` betätigt den Verweis „In VS Code“ — dasselbe Ziel wie der Klick; ohne Ziel tut es nichts. */
  function oeffneVsCode() {
    const verweis = document.querySelector('#diff .sprung-knopf');
    if (!verweis || verweis.hidden || !verweis.getAttribute('href')) {
      return false;
    }
    verweis.click();
    return true;
  }

  /** `/` setzt den Fokus in das Suchfeld, sobald I0031 es baut. */
  function fokussiere(selektor) {
    const feld = document.querySelector(selektor);
    if (!feld) {
      return false;
    }
    feld.focus();
    return true;
  }

  /** `a` öffnet „Datei anmerken“ wie der Knopf im Diff-Kopf; an einer gesperrten Stelle bleibt er gesperrt. */
  function merkeDateiAn() {
    const knopf = [...document.querySelectorAll('#diff .datei-anmerken, #diff .datei-anmerken-hinweis')]
      .find(element => element.getClientRects().length > 0);
    if (!knopf || knopf.disabled) {
      return false;
    }
    knopf.click();
    return true;
  }

  /** `e` öffnet „Ändern“ nur, wenn der Fokus in einem Anmerkungskopf steht — sonst hat die Taste keine Wirkung. */
  function aendereAnmerkung() {
    const kopf = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.anm-kopf') : null;
    if (!kopf) {
      return false;
    }
    const aendern = [...kopf.querySelectorAll('button')].find(knopf => knopf.textContent === 'Ändern');
    if (!aendern) {
      return false;
    }
    aendern.click();
    return true;
  }

  function oeffneHilfe() {
    if (!window.gitreviewaHilfe) {
      return false;
    }
    window.gitreviewaHilfe.oeffnen();
    return true;
  }

  function schliesseHilfe() {
    if (!window.gitreviewaHilfe || !window.gitreviewaHilfe.istOffen()) {
      return false;
    }
    window.gitreviewaHilfe.schliessen();
    return true;
  }

  /* ── Statuszeile (B2904) ── */

  /** Die Fußzeile aus dem Katalog: die wichtigsten Kürzel des Bereichs; in „Einzeln“ zusätzlich `[`/`]`. Keine zweite Liste. */
  function zeichneStatuszeile() {
    const fuss = document.querySelector('footer.statuszeile');
    if (!fuss) {
      return;
    }
    const lage = {
      modus: window.gitreviewaModus ? window.gitreviewaModus.hole() : werte().EINZELN,
      vorhanden: vorhandeneAktionen(),
    };
    fuss.replaceChildren(...werte().statuszeile(lage).map(statuszeileElement));
  }

  /** Eine Zeile der Fußzeile: je Taste ein `<kbd>` (lesbar für Screenreader), danach ihr kurzer Text. */
  function statuszeileElement(zeile) {
    const element = document.createElement('span');
    if (zeile.rechts) {
      element.className = 'rechts';
    }
    for (const taste of zeile.anzeige) {
      const kbd = document.createElement('kbd');
      kbd.textContent = taste;
      element.append(kbd);
    }
    element.append(document.createTextNode(` ${zeile.text}`));
    return element;
  }

  /* ── Ansage ── */

  /** Eine höfliche Live-Region sagt die Zustandsänderung an; derselbe Text wird nicht zweimal gesetzt. */
  function ansagen(text) {
    const region = document.getElementById('tasten-ansage');
    if (!region) {
      return;
    }
    if (region.textContent === text) {
      region.textContent = '';
      queueMicrotask(() => {
        region.textContent = text;
      });
      return;
    }
    region.textContent = text;
  }

  function sichtbarerName(pfad) {
    return window.sichtbarerName ? window.sichtbarerName(pfad) : pfad;
  }

  function dateizeilen() {
    return [...document.querySelectorAll(DATEIZEILE)];
  }

  document.addEventListener('DOMContentLoaded', init);
}());