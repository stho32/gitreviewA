/* gitreviewA — Trenner beider Seitenleisten (R00034, R00037, R00042, B4102): die Mechanik je Seite (`anlegen(seite)`) — Zustand,
   Element, Zug, Tasten, Doppelklick und `aria-*` hängen an der Seite, nicht am Modul. Vorbild der Verallgemeinerung ist
   `einklappen.js` `anlegen(seite)`; ein gemeinsamer Breitenzustand `{wunsch, gezeigt, vorrang}` trägt beide Wünsche, weil die
   eine Regel (`trenner-werte.js`) beide braucht. Die gezeigten Breiten wirken allein über CSS-Variablen am Rahmen
   (`--gr-leiste-breite`, `--gr-ergebnis-breite`), ohne den Diff oder das Ergebnis neu zu zeichnen (Lehre #23). Nach dem Neuladen
   gelten die Startbreiten — nichts wird gespeichert. Der Zustand ist die eine Quelle für `einklappen.js`: es liest und schreibt
   die Stellung der Spalte über `window.gitreviewaBreiten` (B4104). */
(function () {
  'use strict';

  const RAHMEN = '.gr-ansicht';
  const werte = window.gitreviewaTrennerWerte;
  const MEDIEN = `(min-width:${werte.mindestFensterBreite()}px)`;

  /** Der eine Breitenzustand beider Seiten (nur RAM): beide Wünsche, der gezeigte Stand und die klebende Stellung der Spalte. */
  const zustand = {
    wunsch: { links: werte.START, rechts: werte.ERGEBNIS },
    gezeigt: { links: werte.START, rechts: werte.ERGEBNIS, linksEin: false, rechtsEin: false },
    vorrang: null,
    ziehen: null,
  };
  const seiten = [];

  function rahmen() {
    return document.querySelector(RAHMEN);
  }

  /** Die Entscheidung kommt aus der einen Quelle in `trenner-werte.js`; `MEDIEN` dient nur dem Grenzübertritt. */
  function zweispaltig() {
    return werte.passtZweiSpaltig(window.innerWidth);
  }

  /** Die eine Rechnung; ihr Ergebnis ist der gezeigte Stand und die klebende Stellung der Spalte (B4101). */
  function rechne() {
    zustand.gezeigt = werte.anzeige(window.innerWidth, zustand.wunsch, {
      linksEin: zustand.gezeigt.linksEin,
      rechtsEin: zustand.gezeigt.rechtsEin,
      vorrang: zustand.vorrang,
    });
    zustand.vorrang = zustand.gezeigt.vorrang;
    return zustand.gezeigt;
  }

  /** Die gezeigten Breiten als CSS-Variablen am Rahmen setzen — das Layout folgt, der Diff zeichnet nicht neu. */
  function anwenden() {
    const rahmenElement = rahmen();
    if (rahmenElement) {
      rahmenElement.style.setProperty('--gr-leiste-breite', `${zustand.gezeigt.links}px`);
      rahmenElement.style.setProperty('--gr-ergebnis-breite', `${zustand.gezeigt.rechts}px`);
    }
    for (const seite of seiten) {
      seite.aktualisiere();
    }
  }

  /** Bei jeder Größenänderung neu rechnen und anwenden — in beide Richtungen; die Wünsche bleiben erhalten. */
  function beiGroesse() {
    rechne();
    anwenden();
  }

  /**
   * Eine Seite ein-/ausklappen (der Knopf der Seitenleiste oder der Ergebnis-Spalte ruft das): die Stellung wechseln. Ein
   * ausdrückliches Ausklappen der Spalte setzt den Vorrang (R00042, Kriterium 7), ein Einklappen oder das Ausklappen der
   * Seitenleiste löscht ihn (dann gilt wieder die Reihenfolge beim Schrumpfen).
   */
  function klappeUm(seite) {
    const schluessel = `${seite}Ein`;
    zustand.gezeigt[schluessel] = !zustand.gezeigt[schluessel];
    zustand.vorrang = seite === 'rechts' && !zustand.gezeigt.rechtsEin ? werte.VORRANG_RECHTS : null;
    rechne();
    anwenden();
    return zustand.gezeigt[schluessel];
  }

  /**
   * Einen Trenner anlegen. `seite` nennt: `seite` (der Schlüssel im Breitenzustand: `'links'`/`'rechts'`), `klasse` (die Klasse
   * des Elements), `steuert` (`aria-controls`), `name` (`aria-label`), `start` (Doppelklick), `richtung` (Pfeilrichtung: `1`
   * links, `-1` rechts), `ereignis` (der Breitenwechsel) und `vor` (der Selektor, vor dem das Element eingefügt wird).
   */
  function anlegen(seite) {
    function selektor() {
      return `${RAHMEN} .${seite.klasse}`;
    }

    function trenner() {
      return document.querySelector(selektor());
    }

    function hoechste() {
      return seite.seite === 'rechts'
        ? werte.hoechstRechts(window.innerWidth, zustand.gezeigt)
        : werte.hoechstLinks(window.innerWidth, zustand.gezeigt);
    }

    function gezeigt() {
      return zustand.gezeigt[seite.seite];
    }

    /** Die gewählte Breite als Wunsch setzen (auf die feste Spanne geklemmt) und die gezeigten Breiten neu rechnen. */
    function setzen(neu) {
      const wunsch = werte.klemme(Number(neu), werte.KLEINSTE, werte.GROESSTE);
      if (!Number.isFinite(wunsch) || wunsch === zustand.wunsch[seite.seite]) {
        return;
      }
      zustand.wunsch[seite.seite] = wunsch;
      rechne();
      anwenden();
      document.dispatchEvent(new CustomEvent(seite.ereignis, { detail: { breite: gezeigt() } }));
    }

    /** Die ARIA-Angaben des Trennzugs an die gezeigte Breite und die tatsächliche Höchstbreite angleichen. Im einspaltigen
        Rückfall gibt es keinen Trenner; dann bleibt auch keine verletzte Spanne stehen. */
    function aktualisiere() {
      sichere();
      const element = trenner();
      if (!element || !zweispaltig()) {
        return;
      }
      element.setAttribute('aria-valuenow', String(gezeigt()));
      element.setAttribute('aria-valuemin', String(werte.KLEINSTE));
      element.setAttribute('aria-valuemax', String(hoechste()));
    }

    /** Der Trenner gehört nur in den zweispaltigen Aufbau; unter 566 px gibt es ihn nicht (R00033). */
    function sichere() {
      if (zweispaltig()) {
        if (!trenner()) {
          erzeuge();
        }
      } else if (trenner()) {
        trenner().remove();
      }
    }

    function erzeuge() {
      const element = document.createElement('div');
      element.className = seite.klasse;
      element.setAttribute('role', 'separator');
      element.setAttribute('aria-orientation', 'vertical');
      element.setAttribute('aria-controls', seite.steuert);
      element.setAttribute('aria-label', seite.name);
      element.setAttribute('tabindex', '0');
      element.addEventListener('pointerdown', ereignis => beginneZug(ereignis));
      element.addEventListener('pointermove', ereignis => ziehe(ereignis));
      element.addEventListener('pointerup', ereignis => beendeZug(ereignis));
      element.addEventListener('pointercancel', ereignis => beendeZug(ereignis));
      element.addEventListener('keydown', ereignis => beiTaste(ereignis));
      element.addEventListener('dblclick', () => setzen(seite.start));
      rahmen().insertBefore(element, rahmen().querySelector(seite.vor));
      aktualisiere();
    }

    /** Die Tasten am Trenner (R00034/R00042): ein Pfeil verstellt um 16 px in die Richtung der Seite, Pos1/Ende auf die
        Grenzen; sonst bleibt die Taste beim Browser. */
    function beiTaste(ereignis) {
      if (ereignis.defaultPrevented || ereignis.isComposing) {
        return;
      }
      if (ereignis.key !== 'ArrowRight' && ereignis.key !== 'ArrowLeft' && ereignis.key !== 'Home' && ereignis.key !== 'End') {
        return;
      }
      ereignis.preventDefault();
      setzen(werte.breiteNachTaste(gezeigt(), ereignis.key, hoechste(), seite.richtung));
    }

    /** Der Beginn eines Zugs: den Zeiger am Trenner festhalten (Pointer-Capture), damit auch ein schneller Sprung ankommt. */
    function beginneZug(ereignis) {
      const element = trenner();
      if (!element) {
        return;
      }
      const rahmenRechteck = rahmen().getBoundingClientRect();
      zustand.ziehen = {
        id: ereignis.pointerId,
        links: rahmenRechteck.left,
        rechts: rahmenRechteck.right,
        griff: ereignis.clientX - element.getBoundingClientRect().left,
      };
      element.setPointerCapture(ereignis.pointerId);
      element.classList.add('aktiv');
      ereignis.preventDefault();
    }

    /** Der Zeiger bewegt sich: die Breite folgt der Zeigerposition (die Trennerkante steht unter dem Griff). */
    function ziehe(ereignis) {
      const zug = zustand.ziehen;
      if (!zug || ereignis.pointerId !== zug.id) {
        return;
      }
      const kante = ereignis.clientX - zug.griff;
      const neu = seite.seite === 'rechts'
        ? werte.breiteNachZugRechts(kante, zug.rechts, hoechste(), gezeigt())
        : werte.breiteNachZug(kante, zug.links, hoechste(), gezeigt());
      setzen(neu);
    }

    /** Der Zug ist zu Ende: den Zeiger freigeben. */
    function beendeZug(ereignis) {
      const zug = zustand.ziehen;
      if (!zug || ereignis.pointerId !== zug.id) {
        return;
      }
      zustand.ziehen = null;
      const element = trenner();
      if (element) {
        element.classList.remove('aktiv');
        if (element.hasPointerCapture && element.hasPointerCapture(ereignis.pointerId)) {
          element.releasePointerCapture(ereignis.pointerId);
        }
      }
    }

    const api = {
      hole: gezeigt,
      setzen,
      hoechste,
      wunsch: () => zustand.wunsch[seite.seite],
      aktualisiere,
      sichere,
    };
    seiten.push(api);
    return api;
  }

  const SEITEN = {
    links: {
      seite: 'links',
      klasse: 'gr-trenner',
      steuert: 'seitenleiste',
      name: 'Breite der Dateiliste',
      start: werte.START,
      richtung: 1,
      ereignis: 'breite-geaendert',
      vor: '#diff',
    },
    rechts: {
      seite: 'rechts',
      klasse: 'gr-ergebnis-trenner',
      steuert: 'ergebnis',
      name: 'Breite der Ergebnis-Spalte',
      start: werte.ERGEBNIS,
      richtung: -1,
      ereignis: 'ergebnis-breite-geaendert',
      vor: '.gr-ergebnis-streifen',
    },
  };

  function init() {
    // Die Spalte startet ausgeklappt ab 1012 px (R00037); darunter bleibt sie zu, bis der Mensch sie ausklappt.
    zustand.gezeigt.rechtsEin = !werte.ergebnisStartetAusgeklappt(window.innerWidth);
    rechne();
    anwenden();
    const medien = window.matchMedia(MEDIEN);
    if (typeof medien.addEventListener === 'function') {
      medien.addEventListener('change', beiGroesse);
    }
    window.addEventListener('resize', beiGroesse);
    document.addEventListener('eingeklappt-geaendert', beiGroesse);
    document.addEventListener('ergebnis-eingeklappt-geaendert', beiGroesse);
  }

  const api = anlegen(SEITEN.links);
  const ergebnisApi = anlegen(SEITEN.rechts);

  /** Der gemeinsame Breitenzustand für `einklappen.js` (B4104): es liest die Stellung und wechselt sie über `klappeUm`. */
  window.gitreviewaBreiten = {
    gezeigt: () => zustand.gezeigt,
    wunsch: () => zustand.wunsch,
    rechne,
    klappeUm,
  };
  window.gitreviewaBreite = api;
  window.gitreviewaErgebnisBreite = ergebnisApi;

  document.addEventListener('DOMContentLoaded', init);
}());
