/* gitreviewA — Seitenleiste ein- und ausklappen (R00035, I0036): der Knopf an der Grenze klappt die Seitenleiste ein und wieder
   aus. Der Zustand ist nur RAM (Start ausgeklappt) und bleibt beim Wechsel von Datei, Commit, Modus, Ansicht und Anordnung; er
   wirkt allein über das Layout — der Diff wird nicht neu gezeichnet (Lehre #23), und das Ausklappen bringt die gewählte Zeile in
   den Blick. Der Knopf trägt `aria-expanded` und `aria-controls`, sein Name und die Pfeilrichtung folgen dem Zustand; beim
   Einklappen wandert ein Fokus aus der Leiste auf den Knopf (nie ins Leere). Unter 566 px gibt es den Knopf nicht (eine Spalte,
   kein Einklappen). Der Mechanismus wird je Seitenleiste angelegt (`anlegen`) — eine zweite Seitenleiste (I0038) nutzt ihn ohne
   Kopie. Die reine Rechnung liegt in `einklappen-werte.js`. */
(function () {
  'use strict';

  const RAHMEN = '.gr-ansicht';
  const SEITENLEISTE = '#seitenleiste';
  const STREIFEN = '.gr-streifen';
  const WAEHLBARE_ZEILE = '#datei-zeilen .datei-zeile[aria-current="true"]';

  function werte() {
    return window.gitreviewaEinklappenWerte;
  }

  function zweispaltig() {
    return werte().passtZweiSpaltig(window.innerWidth);
  }

  /**
   * Eine Seitenleiste ein-/ausklappbar machen. `seite` nennt: `rahmen` (die Rahmenfläche, an der die Klasse wirkt), `leiste`
   * (die Seitenleiste), `streifen` (der Ort des Knopfes an der Grenze), `trenner` (der Trennzug, der beim Einklappen
   * verschwindet), `knopfId`, `klasse` (die Stellung am Rahmen), `bezeichnung` (Anfangs des Namens), `ereignis` (der
   * Zustandswechsel), `wahl` (die Zeile, die beim Ausklappen in den Blick kommt) und `medien` (die Mediengrenze des
   * zweispaltigen Aufbaus).
   */
  function anlegen(seite) {
    const zustand = { eingeklappt: werte().start() };
    let knopf = null;

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
      const rahmenElement = rahmen();
      return rahmenElement ? rahmenElement.querySelector(seite.trenner) : null;
    }

    function init() {
      const medien = window.matchMedia(seite.medien);
      if (typeof medien.addEventListener === 'function') {
        medien.addEventListener('change', anwenden);
      }
      window.addEventListener('resize', anwenden);
      anwenden();
    }

    /** Die sichtbare Stellung: der Zustand wirkt nur im zweispaltigen Aufbau (unter 566 px gilt eine Spalte). */
    function eingeklappt() {
      return zweispaltig() && zustand.eingeklappt;
    }

    /** Zustand → Layout und Bedienelement; erzeugt bzw. entfernt den Knopf je Aufbau. Die eingeklappte Leiste ist `hidden` und
        `inert`: sie ist weder sichtbar noch im Tab- oder Lese-Weg (kein unsichtbarer Stopp). */
    function anwenden() {
      sichereKnopf();
      const eingeklapptJetzt = eingeklappt();
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
    }

    /** Der Knopf gehört nur in den zweispaltigen Aufbau; unter 566 px gibt es ihn nicht (R00033: eine Spalte). */
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

    /** Zustand am Knopf: `aria-expanded`, `aria-controls`, Name und Pfeilrichtung — alle aus `einklappen-werte.js`. */
    function setzeKnopf(eingeklapptJetzt) {
      knopf.setAttribute('aria-expanded', werte().erweitert(eingeklapptJetzt));
      const leisteElement = leiste();
      if (leisteElement && leisteElement.id) {
        knopf.setAttribute('aria-controls', leisteElement.id);
      }
      const beschriftung = knopf.querySelector('.gr-einklappen-text');
      const pfeil = knopf.querySelector('.gr-einklappen-pfeil');
      if (beschriftung) {
        beschriftung.textContent = werte().name(seite.bezeichnung, eingeklapptJetzt);
      }
      if (pfeil) {
        pfeil.textContent = werte().pfeil(eingeklapptJetzt);
      }
    }

    /**
     * Die Betätigung (Klick oder Taste `b`, die denselben Knopf betätigt): Stellung wechseln, sonst nichts. Der Fokus geht nie
     * ins Leere: hatte er in einem Element gestanden, das jetzt verschwindet (Leiste `hidden`/`inert` oder Trennzug
     * `display:none`), oder war er nirgends, steht er danach auf dem Knopf; stand er anderswo (etwa im offenen Notizfeld des
     * Diffs), bleibt er dort — das Einklappen verwirft keine Eingabe (Lehre #23). Beim Ausklappen bleibt der Fokus auf demselben
     * Bedienelement.
     */
    function umschalten() {
      if (!zweispaltig()) {
        return;
      }
      // Der Fokusstand wird vor dem Anwenden gelesen: das Verbergen blurst das Element erst mit der nächsten Stilberechnung.
      const fokusWirdVerborgen = wirdVerborgen(document.activeElement);
      zustand.eingeklappt = werte().umschalten(zustand.eingeklappt);
      anwenden();
      if (knopf && (document.activeElement === knopf || fokusWirdVerborgen || fokusNirgends())) {
        knopf.focus({ preventScroll: true });
      }
      if (!zustand.eingeklappt) {
        bringeWahlInDenBlick();
      }
      document.dispatchEvent(new CustomEvent(seite.ereignis, { detail: { eingeklappt: zustand.eingeklappt } }));
    }

    /**
     * Wird dieses Element durch das Einklappen verborgen? Die Leiste verschwindet per `hidden`/`inert`, der Trennzug per CSS
     * (`display:none`); ein Fokus in einem von beiden fällt sonst auf `BODY`. Nachbarn der Leiste haben eigene Tab-Stopps und
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
      const zeile = document.querySelector(seite.wahl);
      if (zeile) {
        zeile.scrollIntoView({ block: 'nearest' });
      }
    }

    init();

    return {
      umschalten,
      anwenden,
      istEingeklappt: () => zustand.eingeklappt,
      knopf: () => knopf,
    };
  }

  const api = { anlegen, seitenleiste: null };
  document.addEventListener('DOMContentLoaded', () => {
    api.seitenleiste = anlegen({
      rahmen: RAHMEN,
      leiste: SEITENLEISTE,
      streifen: STREIFEN,
      trenner: '.gr-trenner',
      knopfId: 'einklappen',
      klasse: 'gr-eingeklappt',
      bezeichnung: 'Seitenleiste',
      ereignis: 'eingeklappt-geaendert',
      wahl: WAEHLBARE_ZEILE,
      medien: `(min-width:${werte().mindestFensterBreite()}px)`,
    });
  });
  window.gitreviewaEinklappen = api;
}());