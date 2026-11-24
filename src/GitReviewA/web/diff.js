/* gitreviewA — Diff-Bereich: liest den Diff einer Datei erst bei ihrer Wahl (Ereignis `datei-gewaehlt`) und zeigt ihn mit Nummern
   alt und neu, als „nur Änderungen“ oder „ganze Datei“ (Diffansicht); der Wechsel des Commits (`commit-gewaehlt`) hebt die Wahl auf
   und fordert zum Wählen auf. Zeilenaufbau nach kanbanD
   web/diff.js (zeileHtml), aber als DOM-Knoten mit textContent: Diff-Text, Pfade und Hunk-Titel sind fremder Text. */
(function () {
  'use strict';

  const HINWEIS_ZUR_WAHL = 'Datei wählen, um ihren Diff zu sehen';
  const KEINE_ZEILENAENDERUNGEN = 'Keine Zeilenänderungen';
  const GRUND_TEXT = { nullbytes: 'enthält Null-Bytes', attribut: 'per Attribut als binär markiert' };
  const LESETEXT = { plus: 'hinzugefügt: ', minus: 'entfernt: ' };
  const VORZEICHEN = { plus: '+', minus: '−', kontext: '' };

  /** `datei`: die gewählte Datei, `alsText` ihre Wahl „Als Text zeigen“; `diffansicht`: `aenderungen` oder `ganz`, nur im Speicher der Seite
      (nach Neuladen wieder „nur Änderungen“); `zugeklappt`: Zeilen eines langen Textes, die erst „Trotzdem laden“ zeichnet. */
  const zustand = { letzteLadung: 0, datei: null, alsText: false, diffansicht: 'aenderungen', zugeklappt: null };

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
    document.addEventListener('commit-gewaehlt', () => verwerfeWahl(ansicht));
    document.addEventListener('datei-gewaehlt', ereignis => ladeDiff(ansicht, ereignis.detail, false));
  }

  function ansichtElemente() {
    const wurzelElement = document.getElementById('diff');
    return {
      wurzelElement,
      umbruchElement: wurzelElement.querySelector('.umbruch-schalter'),
      diffansichtElemente: wurzelElement.querySelectorAll('input[name="diffansicht"]'),
      pfadElement: wurzelElement.querySelector('.diff-pfad'),
      meldungElement: wurzelElement.querySelector('.diff-meldung'),
      alsTextElement: wurzelElement.querySelector('.als-text'),
      trotzdemLadenElement: wurzelElement.querySelector('.trotzdem-laden'),
      rollElement: wurzelElement.querySelector('.df-sc'),
    };
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
    zeigeAufforderungZurWahl(ansicht);
  }

  function zeigeAufforderungZurWahl(ansicht) {
    ansicht.pfadElement.textContent = '';
    zeigeMeldung(ansicht, HINWEIS_ZUR_WAHL, false);
  }

  /** Die jüngste Wahl gewinnt: eine Antwort zählt nur, wenn seit ihrer Anfrage keine andere Datei, kein anderer Commit und keine andere
      Diffansicht gewählt wurde. `alsText`: der Mensch hat bei einer Binärdatei „Als Text zeigen“ gewählt — nur dann liest der Server ihre Bytes. */
  async function ladeDiff(ansicht, datei, alsText) {
    const ladung = zustand.letzteLadung + 1;
    zustand.letzteLadung = ladung;
    zustand.datei = datei;
    zustand.alsText = alsText;
    const diffansicht = zustand.diffansicht;
    ansicht.pfadElement.replaceChildren(...sichtbarTeile(datei.pfad).map(teilKnoten));
    zeigeMeldung(ansicht, 'Diff wird geladen …', false);
    let antwort;
    try {
      antwort = await diffAbrufen(datei, alsText, diffansicht);
    } catch {
      if (ladung === zustand.letzteLadung) {
        zeigeMeldung(ansicht, 'Diff konnte nicht gelesen werden', true);
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
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function zeigeMeldung(ansicht, text, istFehler) {
    ansicht.meldungElement.textContent = text;
    ansicht.meldungElement.classList.toggle('fehler', istFehler);
    ansicht.rollElement.replaceChildren();
    ansicht.rollElement.hidden = true;
    ansicht.alsTextElement.hidden = true;
    ansicht.trotzdemLadenElement.hidden = true;
    zustand.zugeklappt = null;
  }

  function zeichneAntwort(ansicht, antwort, alsText, diffansicht) {
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
    const zuLangGrund = alsText ? zuLang(zeilen) : null;
    if (zuLangGrund) {
      zeigeZugeklappt(ansicht, antwort.pfad, zeilen, zuLangGrund);
      return;
    }
    zeichneZeilen(ansicht, antwort.pfad, zeilen);
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

  /** Über der Grenze bleibt der Text zugeklappt, bis der Mensch „Trotzdem laden“ wählt (vorläufig bis I0014). */
  function zeigeZugeklappt(ansicht, pfad, zeilen, grund) {
    zeigeMeldung(ansicht, `Sehr lang: ${grund.anzahl.toLocaleString('de-DE')} ${grund.einheit} — zugeklappt`, false);
    zustand.zugeklappt = { pfad, zeilen };
    ansicht.trotzdemLadenElement.hidden = false;
  }

  function klappeAuf(ansicht) {
    const zugeklappt = zustand.zugeklappt;
    if (!zugeklappt) {
      return;
    }
    zeichneZeilen(ansicht, zugeklappt.pfad, zugeklappt.zeilen);
  }

  function zeichneZeilen(ansicht, pfad, zeilen) {
    zeigeMeldung(ansicht, '', false);
    const name = `Änderungen in ${pfad}`;
    const sammelElement = document.createDocumentFragment();
    for (const block of bloecke(zeilen)) {
      sammelElement.append(blockElement(block, name));
    }
    ansicht.rollElement.setAttribute('aria-label', name);
    ansicht.rollElement.replaceChildren(sammelElement);
    ansicht.rollElement.hidden = false;
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

  /** Der Text mit Lesetext für Screenreader und sichtbar gemachten Zeichen; jede Marke ist ein Bild mit Namen, ihr Text bleibt im Dokument. */
  function textzelleElement(zeile) {
    const zelleElement = document.createElement('td');
    zelleElement.className = 'c';
    const lesetext = LESETEXT[zeile.art];
    if (lesetext) {
      zelleElement.append(textElement('vh', lesetext));
    }
    for (const teil of sichtbarTeile(zeile.text)) {
      zelleElement.append(teilKnoten(teil));
    }
    return zelleElement;
  }

  function teilKnoten(teil) {
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
