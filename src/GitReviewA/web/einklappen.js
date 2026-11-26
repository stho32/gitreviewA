/* gitreviewA — Seitenleiste und Ergebnis-Spalte ein- und ausklappen (R00035/R00037/R00042, I0036/I0038/B4104): der Knopf an der
   Grenze klappt den Bereich ein und wieder aus. Der Zustand ist nur RAM und bleibt beim Wechsel von Datei, Commit, Modus, Ansicht
   und Anordnung; er wirkt allein über das Layout — der Diff wird nicht neu gezeichnet (Lehre #23), und das Ausklappen bringt die
   gewählte Zeile in den Blick. Der Knopf trägt `aria-expanded` und `aria-controls`, sein Name und die Pfeilrichtung folgen dem
   Zustand; beim Einklappen wandert ein Fokus aus dem Bereich auf den Knopf (nie ins Leere). Unter 590 px gibt es den Knopf nicht
   (eine Spalte, kein Einklappen). Die Mechanik wird je Bereich angelegt (`anlegen`) — die Ergebnis-Spalte (I0038) nutzt sie ohne
   Kopie. Eine Seite nennt zusätzlich `ausklappbar` (darf ausgeklappt werden) und `grund` (warum nicht).

   Die Stellung kommt aus der einen Breitenregel (B4101/B4104): sie liegt im gemeinsamen Breitenzustand `window.gitreviewaBreiten`
   (geführt von `trenner.js`) und wird über `klappeUm` gewechselt — die zweite Grenze 812 und das selbständige Einklappen sind
   damit Teil derselben Rechnung. Das Fokusretten greift auch, wenn die Spalte beim Verkleinern von selbst einklappt (R00042,
   Kriterium 9). Die reine Rechnung liegt in `einklappen-werte.js`. */
(function () {
  'use strict';

  const RAHMEN = '.gr-ansicht';

  function werte() {
    return window.gitreviewaEinklappenWerte;
  }

  function breiten() {
    return window.gitreviewaBreiten;
  }

  function zweispaltig() {
    return werte().passtZweiSpaltig(window.innerWidth);
  }

  /**
   * Einen Bereich ein-/ausklappbar machen. `seite` nennt: `rahmen` (die Rahmenfläche, an der die Klasse wirkt), `leiste`
   * (der Bereich), `streifen` (der Ort des Knopfes an der Grenze), `trenner` (der Trennzug, der beim Einklappen verschwindet),
   * `breite` (der Schlüssel im Breitenzustand: `'links'`/`'rechts'`), `knopfId`, `klasse` (die Stellung am Rahmen), `bezeichnung`
   * (Anfangs des Namens), `ereignis` (der Zustandswechsel), `wahl` (die Zeile, die beim Ausklappen in den Blick kommt; null,
   * wenn keine), `medien` (die Mediengrenze des zweispaltigen Aufbaus), `rechts` (Pfeilrichtung) und `ausklappbar` (darf zur
   * aktuellen Fensterbreite ausgeklappt werden) samt `grund`.
   */
  function anlegen(seite) {
    let knopf = null;
    let letzteStellung = null;

    function rahmen() {
      return document.querySelector(seite.rahmen);
    }

    function leiste() {
      return document.querySelector(seite.leiste);
    }

    function streifen() {
      return document.querySelector(seite.streifen);
    }

    function trenner() {
      if (!seite.trenner) {
        return null;
      }
      const rahmenElement = rahmen();
      return rahmenElement ? rahmenElement.querySelector(seite.trenner) : null;
    }

    /** Die Stellung der Seite aus dem einen Breitenzustand (die Regel führt sie; kein zweiter Zustand). */
    function eingeklapptZustand() {
      const gezeigt = breiten().gezeigt();
      return Boolean(gezeigt[`${seite.breite}Ein`]);
    }

    /** Darf der Bereich zur aktuellen Fensterbreite ausgeklappt werden? (Ergebnis-Spalte erst ab 812 px.) */
    function ausklappbar() {
      if (typeof seite.ausklappbar === 'function') {
        return seite.ausklappbar(window.innerWidth);
      }
      return true;
    }

    function init() {
      const medien = window.matchMedia(seite.medien);
      if (typeof medien.addEventListener === 'function') {
        medien.addEventListener('change', anwenden);
      }
      window.addEventListener('resize', anwenden);
      // Eine Änderung der Breitenstellung (etwa der anderen Seite) wirkt auch auf diesen Bereich (B4104).
      document.addEventListener('breiten-geaendert', anwenden);
      letzteStellung = eingeklappt();
      anwenden();
    }

    /** Die sichtbare Stellung: der Zustand wirkt nur im zweispaltigen Aufbau (unter 590 px gilt eine Spalte); ist der Bereich
        nicht ausklappbar, bleibt er eingeklappt, egal was der Mensch zuletzt gewählt hat. */
    function eingeklappt() {
      if (!zweispaltig()) {
        return false;
      }
      return eingeklapptZustand() || !ausklappbar();
    }

    /** Zustand → Layout und Bedienelement; erzeugt bzw. entfernt den Knopf je Aufbau. Der eingeklappte Bereich ist `hidden`
        und `inert`: er ist weder sichtbar noch im Tab- oder Lese-Weg (kein unsichtbarer Stopp). Klappt die Spalte selbständig
        ein (Fenster schmaler), rettet dieselbe Stelle den Fokus auf den Knopf (R00042, Kriterium 9). */
    function anwenden() {
      sichereKnopf();
      const eingeklapptJetzt = eingeklappt();
      const wurdeEingeklappt = eingeklapptJetzt && letzteStellung === false;
      letzteStellung = eingeklapptJetzt;
      const fokusWirdVerborgen = wirdVerborgen(document.activeElement);
      const rahmenElement = rahmen();
      if (rahmenElement) {
        rahmenElement.classList.toggle(seite.klasse, eingeklapptJetzt);
      }
      const leisteElement = leiste();
      if (leisteElement) {
        leisteElement.hidden = eingeklapptJetzt;
        if (eingeklapptJetzt) {
          leisteElement.setAttribute('inert', '');
        } else {
          leisteElement.removeAttribute('inert');
        }
      }
      if (knopf) {
        setzeKnopf(eingeklapptJetzt);
      }
      if (eingeklapptJetzt && wurdeEingeklappt && (fokusWirdVerborgen || fokusNirgends()) && knopf) {
        knopf.focus({ preventScroll: true });
      }
      document.dispatchEvent(new CustomEvent(seite.ereignis, { detail: { eingeklappt: eingeklapptJetzt } }));
    }

    /** Der Knopf gehört nur in den zweispaltigen Aufbau; unter 590 px gibt es ihn nicht (R00033: eine Spalte). */
    function sichereKnopf() {
      if (!zweispaltig()) {
        entferneKnopf();
        return;
      }
      if (knopf !== null) {
        return;
      }
      erzeugeKnopf();
    }

    function erzeugeKnopf() {
      const behaelter = streifen();
      if (!behaelter) {
        return;
      }
      knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.id = seite.knopfId;
      knopf.className = 'gr-einklappen';
      const pfeil = document.createElement('span');
      pfeil.className = 'gr-einklappen-pfeil';
      pfeil.setAttribute('aria-hidden', 'true');
      const beschriftung = document.createElement('span');
      beschriftung.className = 'gr-einklappen-text';
      knopf.append(pfeil, beschriftung);
      // Der Zeiger nimmt dem Knopf nicht den Fokus: mit `preventDefault` bleibt ein Fokus stehen, wo er war (etwa im offenen
      // Notizfeld des Diffs, Lehre #23); ein Fokus in der Leiste wandert in `umschalten` auf den Knopf, ein verlorener auch.
      knopf.addEventListener('pointerdown', ereignis => ereignis.preventDefault());
      knopf.addEventListener('click', umschalten);
      behaelter.append(knopf);
      // Der Katalog legt den Hinweis (`<kbd>` und `aria-keyshortcuts`) an das Bedienelement, sobald es gebaut ist.
      if (window.gitreviewaTasten && typeof window.gitreviewaTasten.zeichneHinweise === 'function') {
        window.gitreviewaTasten.zeichneHinweise();
      }
    }

    function entferneKnopf() {
      if (knopf === null) {
        return;
      }
      knopf.remove();
      knopf = null;
    }

    /** Zustand am Knopf: `aria-expanded`, `aria-controls`, Name und Pfeilrichtung — alle aus `einklappen-werte.js`; ist der
        Bereich nicht ausklappbar, ist der Knopf gesperrt und nennt den Grund. */
    function setzeKnopf(eingeklapptJetzt) {
      knopf.setAttribute('aria-expanded', werte().erweitert(eingeklapptJetzt));
      const leisteElement = leiste();
      if (leisteElement && leisteElement.id) {
        knopf.setAttribute('aria-controls', leisteElement.id);
      }
      const gesperrt = !ausklappbar();
      knopf.setAttribute('aria-disabled', String(gesperrt));
      if (gesperrt && seite.grund) {
        knopf.title = seite.grund;
      } else {
        knopf.removeAttribute('title');
      }
      const beschriftung = knopf.querySelector('.gr-einklappen-text');
      const pfeil = knopf.querySelector('.gr-einklappen-pfeil');
      if (beschriftung) {
        beschriftung.textContent = werte().name(seite.bezeichnung, eingeklapptJetzt);
      }
      if (pfeil) {
        pfeil.textContent = werte().pfeil(eingeklapptJetzt, seite.rechts);
      }
    }

    /**
     * Die Betätigung (Klick oder Kürzel, das denselben Knopf betätigt): die Stellung im gemeinsamen Breitenzustand wechseln
     * (`klappeUm` — dieselbe Regel wie Ziehen, Fenster und Ausklappen), sonst nichts. Der Fokus geht nie ins Leere: hatte er in
     * einem Element gestanden, das jetzt verschwindet (Bereich `hidden`/`inert` oder Trennzug `display:none`), oder war er
     * nirgends, steht er danach auf dem Knopf; stand er anderswo (etwa im offenen Notizfeld des Diffs), bleibt er dort — das
     * Einklappen verwirft keine Eingabe (Lehre #23). Beim Ausklappen bleibt der Fokus auf demselben Bedienelement.
     */
    function umschalten() {
      if (!zweispaltig() || !ausklappbar()) {
        return;
      }
      // Der Fokusstand wird vor dem Anwenden gelesen: das Verbergen blurst das Element erst mit der nächsten Stilberechnung.
      const fokusWirdVerborgen = wirdVerborgen(document.activeElement);
      const klapptEin = !eingeklappt();
      breiten().klappeUm(seite.breite);
      anwenden();
      if (knopf && (document.activeElement === knopf || (klapptEin && fokusWirdVerborgen) || fokusNirgends())) {
        knopf.focus({ preventScroll: true });
      }
      if (!eingeklappt()) {
        bringeWahlInDenBlick();
      }
    }

    /**
     * Wird dieses Element durch das Einklappen verborgen? Der Bereich verschwindet per `hidden`/`inert`, der Trennzug per CSS
     * (`display:none`); ein Fokus in einem von beiden fällt sonst auf `BODY`. Nachbarn des Bereichs haben eigene Tab-Stopps und
     * gehören darum in dieselbe Prüfung.
     */
    function wirdVerborgen(element) {
      if (element === null) {
        return false;
      }
      const leisteElement = leiste();
      const trennerElement = trenner();
      return (leisteElement !== null && leisteElement.contains(element))
        || (trennerElement !== null && trennerElement.contains(element));
    }

    /** Hat der Fokus keinen Halter mehr (das Element war in einem eben verborgenen Teil, oder es war keiner gesetzt)? */
    function fokusNirgends() {
      const aktiv = document.activeElement;
      return aktiv === null || aktiv === document.body || aktiv === document.documentElement;
    }

    /** Das Ausklappen bringt die gewählte Zeile in den Blick (R00033): kleinste Bewegung, kein Sprung, wenn sie schon steht. */
    function bringeWahlInDenBlick() {
      if (!seite.wahl) {
        return;
      }
      const zeile = document.querySelector(seite.wahl);
      if (zeile) {
        zeile.scrollIntoView({ block: 'nearest' });
      }
    }

    init();

    return {
      umschalten,
      anwenden,
      istEingeklappt: eingeklappt,
      knopf: () => knopf,
    };
  }

  const api = { anlegen, seitenleiste: null, ergebnis: null };
  document.addEventListener('DOMContentLoaded', () => {
    api.seitenleiste = anlegen({
      rahmen: RAHMEN,
      leiste: '#seitenleiste',
      streifen: '.gr-streifen',
      trenner: '.gr-trenner',
      breite: 'links',
      knopfId: 'einklappen',
      klasse: 'gr-eingeklappt',
      bezeichnung: 'Seitenleiste',
      ereignis: 'eingeklappt-geaendert',
      wahl: '#datei-zeilen .datei-zeile[aria-current="true"]',
      medien: `(min-width:${werte().mindestFensterBreite()}px)`,
    });
    api.ergebnis = anlegen({
      rahmen: RAHMEN,
      leiste: '#ergebnis',
      streifen: '.gr-ergebnis-streifen',
      trenner: '.gr-ergebnis-trenner',
      breite: 'rechts',
      knopfId: 'ergebnis-einklappen',
      klasse: 'gr-ergebnis-eingeklappt',
      bezeichnung: 'Ergebnis-Spalte',
      ereignis: 'ergebnis-eingeklappt-geaendert',
      wahl: null,
      medien: `(min-width:${werte().mindestFensterBreite()}px)`,
      rechts: true,
      ausklappbar: fensterBreite => werte().ergebnisAusklappbar(fensterBreite),
      grund: 'Fenster zu schmal',
    });
  });
  window.gitreviewaEinklappen = api;
}());
