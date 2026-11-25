/* gitreviewA — Nebeneinander-Ansicht: baut aus der Gegenüberstellung (`nebeneinander-werte.js`) eine zweispaltige Tabelle (R00023,
   B2202) mit vier Spalten je Zeile (Nummer alt, Text alt, Nummer neu, Text neu). Alles fremder Text geht über `textContent`; die
   Textinhalte (Lesetexte, Marken `⟨U+…⟩`, Färbung) liefert der Aufrufer als `textzellen(zeile)`, damit es keine zweite Zeilen- und
   Zeichenrechnung gibt. Breite nach kanbanD `nebenBlockBreite`/`zeichenBreite` (R00249, ADR-0042): beide Code-Spalten gleich breit,
   je so breit wie die längste Zeile beider Seiten eines Blocks. Laufen kann das Modul in Browser und (Breite) in Node. */
(function () {
  'use strict';

  /** Spaltenklasse je Zeilenart (kanbanD `SEITENKLASSE`): entfernt rot, hinzugefügt grün, Kontext ohne. */
  const SEITENKLASSE = { minus: 'del', plus: 'add', kontext: '' };

  /** Breite einer Zeile in Zeichen (Tab 4, breite Zeichen 2) — dieselbe Schätzung wie `blockBreite` in diff-werte.js. */
  function zeichenBreite(zeile) {
    let breite = 0;
    for (const zeichen of zeile.text) {
      if (zeichen === '\t') {
        breite += 4;
      } else if (zeichen.codePointAt(0) > 0x2E7F) {
        breite += 2;
      } else {
        breite += 1;
      }
    }
    return breite;
  }

  /** Geschätzte Breite eines Blocks in px: beide Code-Spalten gleich breit (je die längste Zeile beider Seiten), dazu Nummern;
      ein Hunk-Kopf, der länger ist als beide Seiten zusammen, gibt die Breite vor (kanbanD `nebenBlockBreite`). */
  function blockBreite(zeilen, block) {
    let seite = 0;
    let kopf = 0;
    for (const zeile of block) {
      if (zeile.art === 'kopf') {
        kopf = Math.max(kopf, zeichenBreite(zeilen[zeile.links]));
        continue;
      }
      for (const stelle of [zeile.links, zeile.rechts]) {
        if (stelle !== null) {
          seite = Math.max(seite, zeichenBreite(zeilen[stelle]));
        }
      }
    }
    return Math.ceil(Math.max(seite * 2, kopf) * 8 + 140);
  }

  function nummerText(nummer) {
    if (nummer === null || nummer === undefined) {
      return '';
    }
    return String(nummer);
  }

  /** Der Block: eine Fläche `.dz-b` (Höhe vorab geschätzt) mit einer Tabelle `.dz.ru-nb`, Spaltenköpfen und den Tabellenzeilen. */
  function tabelleBauen(block, zeilen, name, textzellen) {
    const blockElement = document.createElement('div');
    blockElement.className = 'dz-b';
    blockElement.style.setProperty('--zeilen', String(block.length));
    blockElement.style.setProperty('--bb', `${blockBreite(zeilen, block)}px`);
    const tabelleElement = document.createElement('table');
    tabelleElement.className = 'dz ru-nb';
    tabelleElement.setAttribute('aria-label', name);
    const rumpfElement = document.createElement('tbody');
    for (const zeile of block) {
      rumpfElement.append(zeileElement(zeile, zeilen, textzellen));
    }
    tabelleElement.append(spaltenkoepfe(), rumpfElement);
    blockElement.append(tabelleElement);
    return blockElement;
  }

  function spaltenkoepfe() {
    const kopfElement = document.createElement('thead');
    const zeileElement = document.createElement('tr');
    zeileElement.append(spaltenkopf('alte Fassung'), spaltenkopf('neue Fassung'));
    kopfElement.append(zeileElement);
    return kopfElement;
  }

  function spaltenkopf(text) {
    const kopfzelle = document.createElement('th');
    kopfzelle.setAttribute('scope', 'col');
    kopfzelle.colSpan = 2;
    kopfzelle.textContent = text;
    return kopfzelle;
  }

  function zeileElement(zeile, zeilen, textzellen) {
    if (zeile.art === 'kopf') {
      return kopfZeile(zeile, zeilen, textzellen);
    }
    if (zeile.art === 'hinweis') {
      return hinweisZeile(zeile, zeilen, textzellen);
    }
    return paarZeile(zeile, zeilen, textzellen);
  }

  /** Der Hunk-Kopf steht über alle vier Spalten. */
  function kopfZeile(zeile, zeilen, textzellen) {
    const tr = document.createElement('tr');
    tr.className = 'hk';
    tr.dataset.art = 'kopf';
    const zelle = document.createElement('td');
    zelle.className = 'c';
    zelle.colSpan = 4;
    if (zeile.links !== null) {
      zelle.append(...textzellen(zeilen[zeile.links]));
    }
    tr.append(zelle);
    return tr;
  }

  /** Eine unveränderte oder gepaarte Zeile: links die alte Fassung (Nummer alt, Text alt), rechts die neue (Nummer neu, Text neu).
      Eine unveränderte Zeile steht beidseitig; ihre rechte Zelle ist `aria-hidden`, damit sie nur einmal gelesen wird. */
  function paarZeile(zeile, zeilen, textzellen) {
    const links = zeile.links === null ? null : zeilen[zeile.links];
    const rechts = zeile.rechts === null ? null : zeilen[zeile.rechts];
    const tr = document.createElement('tr');
    tr.dataset.art = artVon(links, rechts);
    if (links !== null) {
      tr.dataset.alt = nummerText(links.alt);
    }
    if (rechts !== null) {
      tr.dataset.neu = nummerText(rechts.neu);
    }
    const rechtsVerborgen = links !== null && zeile.links === zeile.rechts;
    tr.append(
      ...seitenZellen('alt', links, textzellen, false),
      ...seitenZellen('neu', rechts, textzellen, rechtsVerborgen),
    );
    return tr;
  }

  /** Die Hinweiszeile `\ No newline at end of file` in der Spalte ihrer Seite, ohne Vorzeichen und Nummern. */
  function hinweisZeile(zeile, zeilen, textzellen) {
    const links = zeile.links === null ? null : zeilen[zeile.links];
    const rechts = zeile.rechts === null ? null : zeilen[zeile.rechts];
    const tr = document.createElement('tr');
    tr.className = 'hinweis';
    tr.dataset.art = 'hinweis';
    const rechtsVerborgen = links !== null && zeile.links === zeile.rechts;
    tr.append(
      ...seitenZellen('alt', hinweisSeite(links), textzellen, false),
      ...seitenZellen('neu', hinweisSeite(rechts), textzellen, rechtsVerborgen),
    );
    return tr;
  }

  /** Die Hinweiszeile trägt keine Nummer: nur ihren Text, keine Nummernspalte. */
  function hinweisSeite(zeile) {
    if (zeile === null) {
      return null;
    }
    return { art: 'hinweis', alt: null, neu: null, text: zeile.text };
  }

  /** Die beiden Zellen einer Seite: Nummernspalte (immer verborgen) und Textspalte; ohne Zeile beide leer und verborgen. */
  function seitenZellen(seite, zeile, textzellen, textVerborgen) {
    const nummerZelle = document.createElement('td');
    const textZelle = document.createElement('td');
    if (zeile === null) {
      nummerZelle.className = 'n lz';
      nummerZelle.setAttribute('aria-hidden', 'true');
      textZelle.className = 'c lz';
      textZelle.setAttribute('aria-hidden', 'true');
      return [nummerZelle, textZelle];
    }
    const klasse = SEITENKLASSE[zeile.art];
    const suffix = klasse ? ` ${klasse}` : '';
    nummerZelle.className = `n ${seite}${suffix}`;
    nummerZelle.setAttribute('aria-hidden', 'true');
    textZelle.className = `c c-${seite}${suffix}`;
    nummerZelle.textContent = nummerText(seite === 'alt' ? zeile.alt : zeile.neu);
    textZelle.dataset.art = zeile.art;
    if (seite === 'alt') {
      textZelle.dataset.alt = nummerText(zeile.alt);
    } else {
      textZelle.dataset.neu = nummerText(zeile.neu);
    }
    textZelle.append(...textzellen(zeile));
    if (textVerborgen) {
      textZelle.setAttribute('aria-hidden', 'true');
    }
    return [nummerZelle, textZelle];
  }

  function artVon(links, rechts) {
    if (links !== null) {
      return links.art;
    }
    if (rechts !== null) {
      return rechts.art;
    }
    return '';
  }

  const api = { tabelleBauen, blockBreite, zeichenBreite };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.gitreviewaNebeneinander = api;
  }
}());
