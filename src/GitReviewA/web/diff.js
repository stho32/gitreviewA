/* gitreviewA — Diff-Bereich: liest den Diff einer Datei erst bei ihrer Wahl (Ereignis `datei-gewaehlt`) und zeigt ihn mit Nummern
   alt und neu, als „nur Änderungen“ oder „ganze Datei“ (Diffansicht); der Wechsel des Commits (`commit-gewaehlt`) hebt die Wahl auf
   und fordert zum Wählen auf. Nach jedem Zeichnen meldet das Ereignis `diff-gezeichnet` Commit, Pfad, Ansicht und Bereich. Jede Zeile
   mit Nummer neu und jeder Abschnittskopf tragen einen Link nach VS Code, der Verweis „In VS Code“ im Kopf zeigt auf die gewählte
   Zeile (R00021); das Ziel kommt als Attribut aus `sprung-geladen`, nie aus fremdem Text. Zeilenaufbau nach kanbanD
   web/diff.js (zeileHtml), aber als DOM-Knoten mit textContent: Diff-Text, Pfade und Hunk-Titel sind fremder Text.
   Syntaxfarben (R00007) kommen als Auflage nach dem Zeichnen: Prism rechnet im Worker (faerben.js) und liefert nur Zahlen. */
(function () {
  'use strict';

  const HINWEIS_ZUR_WAHL = 'Datei wählen, um ihren Diff zu sehen';
  const KEINE_ZEILENAENDERUNGEN = 'Keine Zeilenänderungen';
  const DIFF_NICHT_GELESEN = 'Diff konnte nicht gelesen werden';
  /** Antwort 422: der Name meint keine Datei eindeutig oder lässt sich nicht an git geben — der Inhalt bleibt ungelesen, nie „keine Änderungen“. */
  const NAME_NICHT_LESBAR = 'Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)';
  const STATUS_NAME_NICHT_LESBAR = 422;
  const GRUND_TEXT = { nullbytes: 'enthält Null-Bytes', attribut: 'per Attribut als binär markiert' };
  const LESETEXT = { plus: 'hinzugefügt: ', minus: 'entfernt: ' };
  const VORZEICHEN = { plus: '+', minus: '−', kontext: '' };

  /** `datei`: die gewählte Datei, `alsText` ihre Wahl „Als Text zeigen“; `diffansicht`: `aenderungen` oder `ganz`, nur im Speicher der Seite
      (nach Neuladen wieder „nur Änderungen“); `zugeklappt`: Zeilen eines langen Textes, die erst „Trotzdem laden“ zeichnet;
      `anzeige`: zählt jeden neuen Inhalt des Bereichs — eine Färbung gilt nur für die Anzeige, für die sie gestellt wurde;
      `sprung`: das Ziel der gewählten Datei aus `sprung-geladen` (null, solange keine Antwort da ist); `gezeichnet`: Commit, Pfad und
      Zeilen des zuletzt gezeichneten Diffs (null ohne Wahl) — daran hängt, ob ein Ziel noch gilt; `gewaehlteZeile`: die angeklickte
      Zeile neu, sonst null. */
  const zustand = { letzteLadung: 0, datei: null, alsText: false, diffansicht: 'aenderungen', zugeklappt: null, anzeige: 0, sprung: null, gezeichnet: null, gewaehlteZeile: null };

  function init() {
    const ansicht = ansichtElemente();
    zeigeAufforderungZurWahl(ansicht);
    ansicht.umbruchElement.addEventListener('change', () => schalteUmbruch(ansicht));
    for (const diffansichtElement of ansicht.diffansichtElemente) {
      diffansichtElement.checked = diffansichtElement.value === zustand.diffansicht;
      diffansichtElement.addEventListener('change', () => schalteDiffansicht(ansicht, diffansichtElement.value));
    }
    ansicht.alsTextElement.addEventListener('click', () => ladeDiff(ansicht, zustand.datei, true));
    ansicht.trotzdemLadenElement.addEventListener('click', () => klappeAuf(ansicht));
    ansicht.rollElement.addEventListener('click', ereignis => waehleZeile(ansicht, ereignis));
    document.addEventListener('commit-gewaehlt', () => verwerfeWahl(ansicht));
    document.addEventListener('datei-gewaehlt', ereignis => ladeDiff(ansicht, ereignis.detail, false));
    document.addEventListener('sprung-geladen', ereignis => uebernehmeSprung(ansicht, ereignis.detail));
  }

  function ansichtElemente() {
    const wurzelElement = document.getElementById('diff');
    const kopfElement = wurzelElement.querySelector('.diff-kopf');
    return {
      wurzelElement,
      umbruchElement: wurzelElement.querySelector('.umbruch-schalter'),
      diffansichtElemente: wurzelElement.querySelectorAll('input[name="diffansicht"]'),
      pfadElement: wurzelElement.querySelector('.diff-pfad'),
      meldungElement: wurzelElement.querySelector('.diff-meldung'),
      alsTextElement: wurzelElement.querySelector('.als-text'),
      trotzdemLadenElement: wurzelElement.querySelector('.trotzdem-laden'),
      sprungVerweisElement: kopfElement.querySelector('.sprung-knopf'),
      sprungGrundElement: kopfElement.querySelector('.sprung-grund'),
      sprungHinweisElement: kopfElement.querySelector('.sprung-hinweis'),
      rollElement: wurzelElement.querySelector('.df-sc'),
      farbschlange: farbschlange({ workerAnlegen: faerbeWorkerAnlegen }),
    };
  }

  /** Ohne Worker im Browser wirft der Aufruf; die Schlange lässt die Datei dann still ungefärbt. */
  function faerbeWorkerAnlegen() {
    return new Worker('faerben.js');
  }

  /** Die Wahl liegt am Bereich, nicht am Diff: sie bleibt beim Wechsel von Datei und Commit. */
  function schalteUmbruch(ansicht) {
    ansicht.wurzelElement.classList.toggle('umbr', ansicht.umbruchElement.checked);
  }

  /** Wie der Umbruch liegt die Diffansicht am Bereich: sie gilt für jede weitere Datei, auch wenn noch keine gewählt ist. */
  function schalteDiffansicht(ansicht, diffansicht) {
    zustand.diffansicht = diffansicht;
    if (!zustand.datei) {
      return;
    }
    ladeDiff(ansicht, zustand.datei, zustand.alsText);
  }

  /** Ein Commit-Wechsel verdrängt auch eine noch laufende Ladung: deren Antwort wird verworfen. */
  function verwerfeWahl(ansicht) {
    zustand.letzteLadung += 1;
    zustand.datei = null;
    zustand.gezeichnet = null;
    zustand.sprung = null;
    zustand.gewaehlteZeile = null;
    zeigeAufforderungZurWahl(ansicht);
  }

  function zeigeAufforderungZurWahl(ansicht) {
    ansicht.pfadElement.textContent = '';
    zustand.gezeichnet = null;
    zeigeMeldung(ansicht, HINWEIS_ZUR_WAHL, false);
  }

  /** Die jüngste Wahl gewinnt: eine Antwort zählt nur, wenn seit ihrer Anfrage keine andere Datei, kein anderer Commit und keine andere
      Diffansicht gewählt wurde. `alsText`: der Mensch hat bei einer Binärdatei „Als Text zeigen“ gewählt — nur dann liest der Server ihre Bytes. */
  async function ladeDiff(ansicht, datei, alsText) {
    const ladung = zustand.letzteLadung + 1;
    zustand.letzteLadung = ladung;
    zustand.datei = datei;
    zustand.alsText = alsText;
    const vorherGezeichnet = zustand.gezeichnet;
    zustand.gezeichnet = { commit: datei.commit, pfad: datei.pfad, zeilen: [] };
    const istDieselbeStelle = vorherGezeichnet !== null && vorherGezeichnet.commit === datei.commit && vorherGezeichnet.pfad === datei.pfad;
    if (!istDieselbeStelle) {
      zustand.sprung = null;
      zustand.gewaehlteZeile = null;
    }
    const diffansicht = zustand.diffansicht;
    ansicht.pfadElement.replaceChildren(...sichtbarTeile(datei.pfad).map(teilKnoten));
    zeigeMeldung(ansicht, 'Diff wird geladen …', false);
    let antwort;
    try {
      antwort = await diffAbrufen(datei, alsText, diffansicht);
    } catch (fehler) {
      if (ladung === zustand.letzteLadung) {
        zeigeMeldung(ansicht, fehlertextZu(fehler), true);
      }
      return;
    }
    if (ladung !== zustand.letzteLadung) {
      return;
    }
    zeichneAntwort(ansicht, antwort, alsText, diffansicht);
  }

  /** Die ganze Datei liest der Server nur auf ausdrückliche Wahl der Diffansicht. */
  async function diffAbrufen(datei, alsText, diffansicht) {
    const abfrage = new URLSearchParams({ pfad: datei.pfad });
    if (alsText) {
      abfrage.set('alsText', 'true');
    }
    if (diffansicht === 'ganz') {
      abfrage.set('umfang', 'ganz');
    }
    const adresse = `api/commits/${encodeURIComponent(datei.commit)}/diff?${abfrage}`;
    const antwort = await fetch(adresse, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new AntwortFehler(antwort.status);
    }
    return antwort.json();
  }

  class AntwortFehler extends Error {
    constructor(status) {
      super(`Antwort ${status}`);
      this.status = status;
    }
  }

  function fehlertextZu(fehler) {
    const nameNichtLesbar = fehler instanceof AntwortFehler && fehler.status === STATUS_NAME_NICHT_LESBAR;
    if (nameNichtLesbar) {
      return NAME_NICHT_LESBAR;
    }
    return DIFF_NICHT_GELESEN;
  }

  function zeigeMeldung(ansicht, text, istFehler) {
    zustand.anzeige += 1;
    ansicht.farbschlange.aufraeumen();
    delete ansicht.rollElement.dataset.farbe;
    ansicht.meldungElement.textContent = text;
    ansicht.meldungElement.classList.toggle('fehler', istFehler);
    ansicht.rollElement.replaceChildren();
    ansicht.rollElement.hidden = true;
    ansicht.alsTextElement.hidden = true;
    ansicht.trotzdemLadenElement.hidden = true;
    zustand.zugeklappt = null;
    if (zustand.gezeichnet) {
      zustand.gezeichnet.zeilen = [];
    }
    aktualisiereSprungkopf(ansicht);
  }

  function zeichneAntwort(ansicht, antwort, alsText, diffansicht) {
    if (antwort.zuGross) {
      zeigeMeldung(ansicht, antwort.meldung, false);
      return;
    }
    const binaerOhneWahl = antwort.art === 'binaer' && !alsText;
    if (binaerOhneWahl) {
      zeigeBinaerdatei(ansicht, antwort.grund);
      return;
    }
    const zeilen = zeilenDerDiffansicht(antwort.patch, diffansicht);
    if (zeilen.length === 0) {
      zeigeMeldung(ansicht, KEINE_ZEILENAENDERUNGEN, false);
      return;
    }
    const zuLangGrund = zuLang(zeilen);
    if (zuLangGrund) {
      zeigeZugeklappt(ansicht, antwort, zeilen, zuLangGrund);
      return;
    }
    zeichneZeilen(ansicht, antwort, zeilen);
  }

  function zeilenDerDiffansicht(patch, diffansicht) {
    if (diffansicht === 'ganz') {
      return ganzeDateiZeilen(patch);
    }
    return patchZeilen(patch);
  }

  /** Ohne Wahl kein Byte-Inhalt: Hinweis mit Grund und der Schalter, der den Text erst auf Wunsch lädt (Entscheidung des PO). */
  function zeigeBinaerdatei(ansicht, grund) {
    let meldung = 'Binärdatei';
    const grundText = GRUND_TEXT[grund];
    if (grundText) {
      meldung = `Binärdatei — ${grundText}`;
    }
    zeigeMeldung(ansicht, meldung, false);
    ansicht.alsTextElement.hidden = false;
  }

  /** Über der Grenze bleibt der Text zugeklappt, bis der Mensch „Trotzdem laden“ wählt (B1604): der Hinweis nennt die überschrittene
      Grenze und ihre Zahl, der Knopf zeichnet die bereits empfangenen Zeilen. */
  function zeigeZugeklappt(ansicht, antwort, zeilen, grund) {
    zeigeMeldung(ansicht, `Sehr lang: ${grund.anzahl.toLocaleString('de-DE')} ${grund.einheit} — zugeklappt`, false);
    zustand.zugeklappt = { antwort, zeilen };
    ansicht.trotzdemLadenElement.hidden = false;
  }

  function klappeAuf(ansicht) {
    const zugeklappt = zustand.zugeklappt;
    if (!zugeklappt) {
      return;
    }
    zeichneZeilen(ansicht, zugeklappt.antwort, zugeklappt.zeilen);
  }

  /** `antwort`: Pfad und Patch der gezeigten Ansicht — an ihnen hängen Sprache und Grenze der Färbung. */
  function zeichneZeilen(ansicht, antwort, zeilen) {
    zeigeMeldung(ansicht, '', false);
    if (zustand.gezeichnet) {
      zustand.gezeichnet.zeilen = zeilen;
    }
    const name = `Änderungen in ${antwort.pfad}`;
    const sammelElement = document.createDocumentFragment();
    for (const block of bloecke(zeilen)) {
      sammelElement.append(blockElement(block, name));
    }
    ansicht.rollElement.setAttribute('aria-label', name);
    ansicht.rollElement.replaceChildren(sammelElement);
    ansicht.rollElement.hidden = false;
    setzeSprunglinks(ansicht);
    aktualisiereSprungkopf(ansicht);
    faerbeZeilen(ansicht, antwort, zeilen);
    meldeGezeichnet(ansicht, antwort.pfad);
  }

  /** `ersterBlockElement` erkennt der Empfänger wieder: ist er nicht mehr im Dokument, ist dieser Diff verworfen. */
  function meldeGezeichnet(ansicht, pfad) {
    const detail = {
      commit: zustand.datei.commit,
      pfad,
      ansicht: zustand.diffansicht,
      bereichElement: ansicht.rollElement,
      ersterBlockElement: ansicht.rollElement.firstElementChild,
    };
    document.dispatchEvent(new CustomEvent('diff-gezeichnet', { detail }));
  }

  /* ── Sprung in VS Code (R00021): Links an Zeilen und Abschnittsköpfen, Verweis und Hinweis im Kopf ── */

  /** Übernimmt die Antwort aus `sprung.js`; ohne Ziel bleibt der Verweis verborgen und der Kopf zeigt den Grund. */
  function uebernehmeSprung(ansicht, sprung) {
    zustand.sprung = sprung;
    setzeSprunglinks(ansicht);
    aktualisiereSprungkopf(ansicht);
  }

  /** Merkt die angeklickte Zeile als gewählte für den Verweis im Kopf. */
  function waehleZeile(ansicht, ereignis) {
    const zeileElement = ereignis.target.closest('tr[data-art]');
    if (!zeileElement) {
      return;
    }
    zustand.gewaehlteZeile = nummerOderNull(zeileElement.dataset.neu);
    aktualisiereSprungkopf(ansicht);
  }

  /** Ob das Ziel noch zur gezeichneten Stelle passt: eine späte Antwort einer früheren Wahl wird so verworfen. */
  function sprungPasst() {
    const gezeichnet = zustand.gezeichnet;
    const sprung = zustand.sprung;
    return gezeichnet !== null && sprung !== null && sprung.commit === gezeichnet.commit && sprung.pfad === gezeichnet.pfad;
  }

  /** Jede gezeichnete Zeile mit Nummer neu und jeder Abschnittskopf bekommt `href = ziel + ":" + nummer` — aus dem Ziel allein,
      nie aus fremdem Text; die Zeile kennt nur der Browser. */
  function setzeSprunglinks(ansicht) {
    const gezeichnet = zustand.gezeichnet;
    if (!gezeichnet || gezeichnet.zeilen.length === 0) {
      return;
    }
    const ziel = sprungPasst() ? zustand.sprung.ziel : '';
    const zeilenElemente = ansicht.rollElement.querySelectorAll('tr[data-art]');
    for (let index = 0; index < gezeichnet.zeilen.length; index += 1) {
      const zeile = gezeichnet.zeilen[index];
      const zeilenElement = zeilenElemente[index];
      if (!zeilenElement) {
        continue;
      }
      const link = sprungLink(ziel, sprungZeile(zeile));
      if (zeile.art === 'kopf') {
        verlinkeZelle(zeilenElement.querySelector('td.c'), link);
        continue;
      }
      verlinkeZelle(zeilenElement.querySelector('td.neu'), link);
    }
  }

  /** Setzt oder entfernt den Link einer Zelle, ohne ihren Inhalt umzubauen; der sichtbare Text bleibt derselbe. Die Zelle trägt
      keine eigene Klasse: im Text der Diff-Zeile sind nur die Rollen der Färbung, Lesetext und Marken erlaubt (R00007). */
  function verlinkeZelle(zelle, link) {
    if (!zelle) {
      return;
    }
    const vorhandenerAnker = zelle.querySelector(':scope > a');
    if (!link) {
      if (vorhandenerAnker) {
        zelle.replaceChildren(...vorhandenerAnker.childNodes);
      }
      return;
    }
    if (vorhandenerAnker) {
      vorhandenerAnker.setAttribute('href', link);
      return;
    }
    const anker = document.createElement('a');
    anker.setAttribute('href', link);
    anker.append(...zelle.childNodes);
    zelle.replaceChildren(anker);
  }

  /** Entweder der Verweis „In VS Code“ auf die gewählte Zeile (ohne Wahl die erste Zeile mit Nummer neu) oder der Grund als Text;
      der Hinweis „Datei seit dem Commit geändert“ steht daneben, solange es ein Ziel gibt. */
  function aktualisiereSprungkopf(ansicht) {
    const passt = sprungPasst();
    const ziel = passt ? zustand.sprung.ziel : '';
    const grund = passt ? zustand.sprung.grund : '';
    const zeilen = zustand.gezeichnet ? zustand.gezeichnet.zeilen : [];
    const nummer = zustand.gewaehlteZeile === null ? ersteSprungzeile(zeilen) : zustand.gewaehlteZeile;
    const link = sprungLink(ziel, nummer);
    ansicht.sprungVerweisElement.hidden = link === null;
    if (link === null) {
      ansicht.sprungVerweisElement.removeAttribute('href');
    } else {
      ansicht.sprungVerweisElement.setAttribute('href', link);
    }
    ansicht.sprungGrundElement.textContent = link === null ? grund : '';
    const zeigtHinweis = link !== null && passt && zustand.sprung.geaendert;
    ansicht.sprungHinweisElement.textContent = zeigtHinweis ? 'Datei seit dem Commit geändert' : '';
  }

  function nummerOderNull(text) {
    if (text === undefined || text === '') {
      return null;
    }
    return Number(text);
  }

  /** Ohne Sprache oder über den Grenzen geht kein Auftrag an den Worker; ein Ausfall unterwegs lässt die Datei still ungefärbt. */
  function faerbeZeilen(ansicht, antwort, zeilen) {
    const sprache = spracheZuPfad(antwort.pfad);
    if (!sprache || !faerbbar(antwort.patch)) {
      ansicht.rollElement.dataset.farbe = 'nein';
      return;
    }
    ansicht.rollElement.dataset.farbe = 'laeuft';
    const anzeige = zustand.anzeige;
    const aktuell = () => anzeige === zustand.anzeige;
    ansicht.farbschlange.stellen({
      sprache,
      zeilen: zeilen.map(zeile => ({ art: zeile.art, text: zeile.text })),
      aktuell,
      fertig: farbantwort => legeFarbeAuf(ansicht, zeilen, farbantwort, aktuell),
    });
  }

  /** Ersetzt wird nur der Inhalt der Textzellen mit Farbstücken, in Häppchen je eine Aufgabe des Hauptfadens. Nur Zeilen mit `data-art`
      sind Diff-Zeilen, in Reihenfolge der Liste `zeilen`. Eine neue Anzeige beendet die Auflage still. */
  function legeFarbeAuf(ansicht, zeilen, farbantwort, aktuell) {
    if (!farbantwort) {
      ansicht.rollElement.dataset.farbe = 'nein';
      return;
    }
    const auflage = {
      ansicht,
      zeilen,
      aktuell,
      stueckeNachZeile: stueckeJeZeile(farbantwort),
      zeilenElemente: ansicht.rollElement.querySelectorAll('tr[data-art]'),
    };
    auflegenAb(auflage, 0);
  }

  function auflegenAb(auflage, anfang) {
    if (!auflage.aktuell()) {
      return;
    }
    const ende = haeppchenAuflegen(auflage, anfang);
    if (ende < auflage.zeilen.length) {
      setTimeout(() => auflegenAb(auflage, ende), 0);
      return;
    }
    auflage.ansicht.rollElement.dataset.farbe = 'ja';
  }

  /** Ein Häppchen ab `anfang`: höchstens 500 Zeilen und nur so viele, bis rund 2000 Knoten neu sind — eine Zeile bringt bis zu rund 2000
      Knoten mit (998 Stücke und der Text dazwischen), so bleibt jede Aufgabe weit unter 150 ms. Liefert die erste Zeile danach. */
  function haeppchenAuflegen({ zeilen, stueckeNachZeile, zeilenElemente }, anfang) {
    const KNOTEN_JE_HAEPPCHEN = 2000;
    const ende = Math.min(anfang + BLOCK_ZEILEN, zeilen.length);
    let neueKnoten = 0;
    let index = anfang;
    while (index < ende && neueKnoten < KNOTEN_JE_HAEPPCHEN) {
      if (stueckeNachZeile.has(index)) {
        const zeile = zeilen[index];
        const inhalt = textzellenInhalt(zeile, farbteile(sichtbarTeile(zeile.text), stueckeNachZeile.get(index)));
        zeilenElemente[index].lastElementChild.replaceChildren(...inhalt);
        neueKnoten += inhalt.length;
      }
      index += 1;
    }
    return index;
  }

  /** Ein Block mit `content-visibility: auto` (Höhe vorab geschätzt), darin eine Tabelle: Spalten alt | neu | Vorzeichen | Text. */
  function blockElement(zeilen, name) {
    const blockElement = document.createElement('div');
    blockElement.className = 'dz-b';
    blockElement.style.setProperty('--zeilen', String(zeilen.length));
    blockElement.style.setProperty('--bb', `${blockBreite(zeilen)}px`);
    const tabelleElement = document.createElement('table');
    tabelleElement.className = 'dz';
    tabelleElement.setAttribute('aria-label', name);
    const rumpfElement = document.createElement('tbody');
    for (const zeile of zeilen) {
      rumpfElement.append(zeileElement(zeile));
    }
    tabelleElement.append(rumpfElement);
    blockElement.append(tabelleElement);
    return blockElement;
  }

  function zeileElement(zeile) {
    const diffzeileElement = document.createElement('tr');
    diffzeileElement.dataset.art = zeile.art;
    if (zeile.art === 'kopf') {
      diffzeileElement.className = 'hk';
      const kopfElement = textzelleElement(zeile);
      kopfElement.colSpan = 4;
      diffzeileElement.append(kopfElement);
      return diffzeileElement;
    }
    diffzeileElement.className = zeile.art;
    diffzeileElement.dataset.alt = nummerText(zeile.alt);
    diffzeileElement.dataset.neu = nummerText(zeile.neu);
    let vorzeichen = VORZEICHEN[zeile.art];
    if (vorzeichen === undefined) {
      vorzeichen = '';
    }
    diffzeileElement.append(
      verborgeneZelle('n alt', nummerText(zeile.alt)),
      verborgeneZelle('n neu', nummerText(zeile.neu)),
      verborgeneZelle('m', vorzeichen),
      textzelleElement(zeile),
    );
    return diffzeileElement;
  }

  function nummerText(nummer) {
    if (nummer === null) {
      return '';
    }
    return String(nummer);
  }

  function verborgeneZelle(klassen, text) {
    const zelleElement = document.createElement('td');
    zelleElement.className = klassen;
    zelleElement.setAttribute('aria-hidden', 'true');
    zelleElement.textContent = text;
    return zelleElement;
  }

  function textzelleElement(zeile) {
    const zelleElement = document.createElement('td');
    zelleElement.className = 'c';
    zelleElement.append(...textzellenInhalt(zeile, sichtbarTeile(zeile.text)));
    return zelleElement;
  }

  /** Der Text mit Lesetext für Screenreader und sichtbar gemachten Zeichen; jede Marke ist ein Bild mit Namen, ihr Text bleibt im Dokument.
      Mit Farbe tragen die Teile eine Klasse `tk-…` aus farbe-werte.js; der Text ist mit und ohne Farbe derselbe. */
  function textzellenInhalt(zeile, teile) {
    const knoten = [];
    const lesetext = LESETEXT[zeile.art];
    if (lesetext) {
      knoten.push(textElement('vh', lesetext));
    }
    for (const teil of teile) {
      knoten.push(teilKnoten(teil));
    }
    return knoten;
  }

  function teilKnoten(teil) {
    if (teil.klasse) {
      return textElement(teil.klasse, teil.text);
    }
    if (!teil.marke) {
      return document.createTextNode(teil.text);
    }
    const markeElement = textElement(`mk-z mk-${teil.marke}`, teil.text);
    markeElement.setAttribute('role', 'img');
    let mehrfach = '';
    if (teil.anzahl) {
      mehrfach = ` ×${teil.anzahl}`;
    }
    markeElement.setAttribute('aria-label', `sichtbar gemachtes Zeichen ${teil.code}${mehrfach}`);
    return markeElement;
  }

  function textElement(klassen, text) {
    const element = document.createElement('span');
    element.className = klassen;
    element.textContent = text;
    return element;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
