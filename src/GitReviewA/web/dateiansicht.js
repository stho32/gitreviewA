/* gitreviewA — Dateiansicht (R00043): Kopf und Rollbereich, Zeilen mit Nummern, Färbung aus dem Worker und Umbruch.
   Fremder Name und fremder Inhalt gehen nur als `textContent` ins DOM; Marken entstehen aus `dateiansicht-werte.js`.
   Kein Nachladen: die Seite zeigt den Stand, den der Server beim Start gelesen hat. */
(function () {
  'use strict';

  const ZUGEKLAPPT_AB_ZEILEN = 20001;
  const BLOCK_ZEILEN = 500;
  const NAME_NICHT_GELESEN = 'Datei konnte nicht geladen werden';
  const ZWISCHENABLAGE_VERWEIGERT = 'Zwischenablage verweigert — Strg+C kopiert die Datei';
  const DATEIANSICHT = 'dateiansicht';

  const zustand = {
    stand: null,
    text: '',
    zeilen: [],
    umbruch: 'an',
    sprache: null,
    stuecke: null,
    aufgedeckt: false,
    kopiert: false,
  };

  function werte() {
    return window.gitreviewaDateiansichtWerte;
  }

  function umbruchWerte() {
    return window.gitreviewaUmbruchWerte;
  }

  function tasten() {
    return window.gitreviewaTastenWerte;
  }

  function init() {
    zustand.umbruch = umbruchWerte().startstellung();
    document.addEventListener('keydown', beiTaste);
    document.getElementById('schliessen').addEventListener('click', schliesse);
    document.getElementById('da-umbruch').addEventListener('change', () => schalteUmbruch());
    const kopieren = document.getElementById('datei-kopieren');
    kopieren.addEventListener('click', () => kopiere());
    zeichneHinweise();
    lade();
  }

  async function lade() {
    try {
      const liste = await holeJson('api/dateiansicht');
      const stand = liste.dateien[0];
      if (!stand) {
        zeigeMeldung(NAME_NICHT_GELESEN);
        return;
      }
      zustand.stand = stand;
      const inhalt = await holeJson('api/dateiansicht/0');
      zustand.text = inhalt.text;
      zustand.zeilen = werte().zeilenVon(zustand.text);
      zustand.sprache = window.spracheZuPfad(stand.echterPfad);
      zeichneKopf(stand);
      zeichneInhalt();
      faerbe();
    } catch (fehler) {
      zeigeMeldung(`${NAME_NICHT_GELESEN}: ${fehler.message}`);
    }
  }

  async function holeJson(pfad) {
    const antwort = await fetch(pfad, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  /** Angabe, echter Pfad (in der Mitte gekürzt, ganz im zugänglichen Namen), Größe · Zeilen · Kodierung · Zeilenende. */
  function zeichneKopf(stand) {
    document.title = `${stand.anzeigename} — gitreviewA`;
    document.getElementById('da-name').textContent = stand.anzeigename;
    const pfad = document.getElementById('da-pfad');
    const gekuerzt = werte().pfadKuerzen(stand.echterPfad, 100);
    pfad.textContent = gekuerzt;
    pfad.setAttribute('aria-label', stand.echterPfad);
    pfad.setAttribute('title', stand.echterPfad);
    const werteText = `${stand.groesse} Bytes · ${werte().zeilenWort(stand.zeilen)} · ${stand.kodierung} · ${stand.zeilenende}`;
    document.getElementById('da-werte').textContent = werteText;
    const hinweis = document.getElementById('da-hinweis');
    hinweis.textContent = stand.gekuerzteZeilen > 0
      ? `${stand.gekuerzteZeilen === 1 ? '1 Zeile' : `${werte().zahl(stand.gekuerzteZeilen)} Zeilen`} nur gekürzt gezeigt`
      : '';
    const kopieren = document.getElementById('datei-kopieren');
    const istLeer = stand.zeilen === 0 && zustand.text === '';
    kopieren.disabled = istLeer;
    kopieren.setAttribute('title', istLeer ? 'Datei ist leer' : '');
  }

  function zeichneInhalt() {
    const inhalt = document.getElementById('da-inhalt');
    inhalt.replaceChildren();
    if (zustand.zeilen.length === 0) {
      const leer = document.createElement('p');
      leer.className = 'da-leer';
      leer.textContent = 'Datei ist leer';
      inhalt.append(leer);
      return;
    }
    if (zustand.stand.zeilen >= ZUGEKLAPPT_AB_ZEILEN && !zustand.aufgedeckt) {
      inhalt.append(zugeklapptElement());
      return;
    }
    zeichneZeilen(inhalt, 0);
  }

  /** Über 20 000 Zeilen: zugeklappt mit der Zahl und „Trotzdem laden“ (R00043, R00017); kopiert wird trotzdem alles. */
  function zugeklapptElement() {
    const bereich = document.createElement('div');
    bereich.className = 'da-zugeklappt';
    const text = document.createElement('p');
    text.textContent = `${werte().zahl(zustand.stand.zeilen)} Zeilen — zugeklappt`;
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'btn trotzdem-laden';
    knopf.textContent = 'Trotzdem laden';
    knopf.addEventListener('click', () => {
      zustand.aufgedeckt = true;
      zeichneInhalt();
    });
    bereich.append(text, knopf);
    return bereich;
  }

  /** Zeilen in Blöcken zeichnen (content-visibility), damit eine sehr lange Datei die Seite nicht blockiert. */
  function zeichneZeilen(inhalt, ab) {
    const bis = Math.min(ab + BLOCK_ZEILEN, zustand.zeilen.length);
    const block = document.createElement('div');
    block.className = 'da-block';
    for (let nummer = ab; nummer < bis; nummer += 1) {
      block.append(zeileElement(nummer + 1, zustand.zeilen[nummer]));
    }
    inhalt.append(block);
    if (bis < zustand.zeilen.length && zustand.aufgedeckt) {
      requestAnimationFrame(() => zeichneZeilen(inhalt, bis));
    }
  }

  function zeileElement(nummer, text) {
    const zeile = document.createElement('div');
    zeile.className = 'da-zeile';
    const nummerElement = document.createElement('span');
    nummerElement.className = 'da-nr';
    nummerElement.setAttribute('aria-hidden', 'true');
    nummerElement.textContent = String(nummer);
    const textElement = document.createElement('span');
    textElement.className = 'da-text';
    textElement.append(...teileElemente(text, stueckeDerZeile(nummer - 1)));
    zeile.append(nummerElement, textElement);
    return zeile;
  }

  function stueckeDerZeile(index) {
    if (!zustand.stuecke) {
      return [];
    }
    return zustand.stuecke.get(index) || [];
  }

  /** Rohtext → Teile: erst die Kürzung (10 000 Zeichen), dann die Farbstücke, dann die Marken je Teil. */
  function teileElemente(text, stuecke) {
    const gekuerzt = werte().kuerzeZeile(text);
    const beschraenkt = beschraenkeStuecke(stuecke, gekuerzt.gezeigt.length);
    const teile = window.farbteile([{ text: gekuerzt.gezeigt }], beschraenkt);
    const knoten = teile.map(teil => {
      const element = document.createElement('span');
      if (teil.klasse) {
        element.className = teil.klasse;
      }
      element.textContent = werte().alsMarken(teil.text);
      return element;
    });
    if (knoten.length === 0) {
      knoten.push(document.createTextNode(werte().alsMarken(gekuerzt.gezeigt)));
    }
    if (gekuerzt.weitere > 0) {
      const kuerzung = document.createElement('span');
      kuerzung.className = 'da-kuerzung';
      kuerzung.textContent = `… (${werte().zahl(gekuerzt.weitere)} weitere Zeichen)`;
      knoten.push(kuerzung);
    }
    return knoten;
  }

  function beschraenkeStuecke(stuecke, laenge) {
    const beschraenkt = [];
    for (const stueck of stuecke) {
      if (stueck.von >= laenge) {
        continue;
      }
      beschraenkt.push({ von: stueck.von, bis: Math.min(stueck.bis, laenge), klasse: stueck.klasse });
    }
    return beschraenkt;
  }

  /** Syntaxfarben erst nach dem Zeichnen, nur innerhalb der Grenzen aus R00007; ohne Worker bleibt die Datei ungefärbt. */
  function faerbe() {
    const inhalt = zustand.text;
    if (!zustand.sprache || !window.faerbbar(inhalt)) {
      return;
    }
    if (zustand.stand.zeilen >= ZUGEKLAPPT_AB_ZEILEN && !zustand.aufgedeckt) {
      return;
    }
    const schlange = window.farbschlange({ workerAnlegen: () => new Worker('faerben.js') });
    const zeilen = zustand.zeilen.map(text => ({ art: 'kontext', text }));
    schlange.stellen({
      sprache: zustand.sprache,
      zeilen,
      aktuell: () => true,
      fertig: antwort => {
        if (!antwort) {
          return;
        }
        zustand.stuecke = window.stueckeJeZeile(antwort);
        zeichneInhalt();
      },
    });
  }

  function schalteUmbruch() {
    zustand.umbruch = umbruchWerte().umschalten(zustand.umbruch);
    zeichneUmbruch();
  }

  function zeichneUmbruch() {
    const umbrochen = umbruchWerte().umbrochen(zustand.umbruch);
    document.getElementById('da-umbruch').checked = umbrochen;
    document.getElementById('da-inhalt').classList.toggle('umbr', umbrochen);
  }

  function beiTaste(ereignis) {
    if (ereignis.defaultPrevented || ereignis.isComposing) {
      return;
    }
    const aktion = tasten().aktionFuer(ereignis.key, {
      laufart: DATEIANSICHT,
      feldImFokus: imEingabefeld(ereignis.target),
      modifikatoren: {
        strg: ereignis.ctrlKey,
        alt: ereignis.altKey,
        meta: ereignis.metaKey,
        altGraph: typeof ereignis.getModifierState === 'function' && ereignis.getModifierState('AltGraph'),
      },
      offenerDialog: false,
      vorhanden: ['dateiKopieren', 'umbruchWechseln'],
    });
    if (aktion === 'dateiKopieren') {
      ereignis.preventDefault();
      kopiere();
    } else if (aktion === 'umbruchWechseln') {
      ereignis.preventDefault();
      schalteUmbruch();
    }
  }

  function imEingabefeld(ziel) {
    if (!ziel || typeof ziel.closest !== 'function') {
      return false;
    }
    return ziel.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]') !== null;
  }

  function kopiere() {
    if (zustand.kopiert || !zustand.text) {
      return;
    }
    const knopf = document.getElementById('datei-kopieren');
    const status = document.getElementById('da-status');
    const bestaetigung = bestaetigungstext();
    if (!window.gitreviewaKopieren) {
      status.textContent = ZWISCHENABLAGE_VERWEIGERT;
      return;
    }
    window.gitreviewaKopieren.kopiere(zustand.text, bestaetigung, {
      knopf,
      status,
      ansage: document.getElementById('da-ansage'),
      kopierziel: document.getElementById('da-inhalt'),
      verweigert: ZWISCHENABLAGE_VERWEIGERT,
    }).then(erfolg => {
      zustand.kopiert = erfolg;
      if (erfolg) {
        knopf.disabled = true;
      }
    });
  }

  function bestaetigungstext() {
    return werte().kopierbestaetigung(zustand.stand.zeilen, zustand.stand.gekuerzteZeilen);
  }

  async function schliesse() {
    const knopf = document.getElementById('schliessen');
    knopf.disabled = true;
    try {
      const antwort = await fetch('api/schliessen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: '{}',
      });
      if (!antwort.ok) {
        throw new Error(`Antwort ${antwort.status}`);
      }
      zeigeGeschlossen();
    } catch (fehler) {
      knopf.disabled = false;
      document.getElementById('da-status').textContent = `Schließen ist gescheitert: ${fehler.message}`;
    }
  }

  /** Nach dem Schließen antwortet der Server nicht mehr; die Seite sagt den Ausgang und lässt sich gefahrlos zumachen. */
  function zeigeGeschlossen() {
    const haupt = document.querySelector('.da-haupt');
    const meldung = document.createElement('p');
    meldung.className = 'da-geschlossen';
    meldung.setAttribute('role', 'status');
    meldung.textContent = 'Dateiansicht geschlossen';
    haupt.replaceChildren(meldung);
    document.getElementById('datei-kopieren').disabled = true;
    document.getElementById('schliessen').disabled = true;
  }

  /** Hinweis und `aria-keyshortcuts` am Bedienelement aus dem Katalog (R00030): kein zweiter Ort für Tasten. */
  function zeichneHinweise() {
    for (const hinweis of tasten().hinweise()) {
      const element = document.querySelector(hinweis.selektor);
      if (element) {
        element.setAttribute('aria-keyshortcuts', hinweis.aria);
      }
    }
  }

  function zeigeMeldung(text) {
    document.getElementById('da-meldung').textContent = text;
  }

  document.addEventListener('DOMContentLoaded', init);
}());