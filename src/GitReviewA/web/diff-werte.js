/* gitreviewA — Diff-Rechnung: Patch-Text → Zeilen mit Nummern alt und neu, sichtbare Marken für Unsichtbares, Blöcke für lange Diffs.
   Reine Funktionen, im Browser und in Node. Herkunft: kanbanD web/diff.js (patchZeilen, sichtbarTeile, bloecke, BLOCK_ZEILEN);
   fremder Text geht hier unverändert durch, gezeichnet wird er nur über textContent. */
(function (ziel) {
  'use strict';

  /** Zeilen je Block mit `content-visibility: auto`. */
  const BLOCK_ZEILEN = 500;

  const HUNK_KOPF = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

  /** Patch-Text ab der ersten `@@`-Zeile → Zeilen `{art, alt, neu, text}`. Zerlegt nur an `\n` (nicht an `\r` oder U+2028);
      das abschließende `\n` ergibt keine eigene Zeile. `\ No newline at end of file` trägt keine Nummer. */
  function patchZeilen(patch) {
    let roh = patch;
    if (roh.endsWith('\n')) {
      roh = roh.slice(0, -1);
    }
    if (roh === '') {
      return [];
    }
    const zaehler = { alt: 0, neu: 0 };
    return roh.split('\n').map(zeile => zeileMitNummern(zeile, zaehler));
  }

  /** Ansicht „ganze Datei“: derselbe Patch mit einem Abschnitt über die ganze Datei, ohne den Abschnittskopf — er zählt nicht als Zeile. */
  function ganzeDateiZeilen(patch) {
    return patchZeilen(patch).filter(zeile => zeile.art !== 'kopf');
  }

  function zeileMitNummern(zeile, zaehler) {
    const kopf = HUNK_KOPF.exec(zeile);
    if (kopf) {
      // ein leerer Bereich (`-0,0`) beginnt vor der ersten Zeile
      zaehler.alt = Math.max(1, Number(kopf[1]));
      zaehler.neu = Math.max(1, Number(kopf[2]));
      return { art: 'kopf', alt: null, neu: null, text: zeile };
    }
    const vorzeichen = zeile[0];
    const text = zeile.slice(1);
    if (vorzeichen === '+') {
      return { art: 'plus', alt: null, neu: zaehler.neu++, text };
    }
    if (vorzeichen === '-') {
      return { art: 'minus', alt: zaehler.alt++, neu: null, text };
    }
    if (vorzeichen === '\\') {
      return { art: 'hinweis', alt: null, neu: null, text: zeile };
    }
    return { art: 'kontext', alt: zaehler.alt++, neu: zaehler.neu++, text };
  }

  /** Richtungsändernde Zeichen: Einbettungen und Isolierungen, dazu LRM, RLM und ALM. */
  const BIDI = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
  /** Steuerzeichen außer Tab, dazu Unsichtbares: weiches Trennzeichen, Nullbreiten, Zeilen- und Absatztrenner, Wortverbinder, BOM. */
  // eslint-disable-next-line no-control-regex
  const STEUER = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F\u00AD\u200B-\u200D\u2028\u2029\u2060\uFEFF]/;
  const UNSICHTBAR = new RegExp(`${BIDI.source}|${STEUER.source}`);

  /** Fremder Text → Teile; Unsichtbares wird sichtbar, nie entfernt („Trojan Source“): Bidi-Steuerzeichen als Marke `⟨U+202E⟩`,
      Steuerzeichen außer Tab als Bildzeichen mit Code (ohne Bildzeichen nur der Code), ein `\r` am Ende als `␍`.
      Gleiche Zeichen in Folge sind eine Marke mit Anzahl (`␀ U+0000 ×500000`): so bleibt eine Datei aus Null-Bytes ein einziger Knoten. */
  function sichtbarTeile(text) {
    if (!UNSICHTBAR.test(text)) {
      if (text === '') {
        return [];
      }
      return [{ text }];
    }
    const teile = [];
    let gewoehnlich = '';
    const zeichenfolge = Array.from(text);
    let stelle = 0;
    while (stelle < zeichenfolge.length) {
      const zeichen = zeichenfolge[stelle];
      const istBidi = BIDI.test(zeichen);
      const istSteuer = STEUER.test(zeichen);
      if (!istBidi && !istSteuer) {
        gewoehnlich += zeichen;
        stelle += 1;
        continue;
      }
      if (gewoehnlich) {
        teile.push({ text: gewoehnlich });
      }
      gewoehnlich = '';
      const istLetztes = stelle === zeichenfolge.length - 1;
      const anzahl = folgeLaenge(zeichenfolge, stelle, istLetztes);
      teile.push(marke(zeichen, istBidi, istLetztes, anzahl));
      stelle += anzahl;
    }
    if (gewoehnlich) {
      teile.push({ text: gewoehnlich });
    }
    return teile;
  }

  /** Länge der Folge gleicher Zeichen ab `stelle`; ein `\r` ganz am Ende bleibt für sich (`␍`). */
  function folgeLaenge(zeichenfolge, stelle, istLetztes) {
    if (istLetztes) {
      return 1;
    }
    const zeichen = zeichenfolge[stelle];
    let ende = stelle + 1;
    while (ende < zeichenfolge.length && zeichenfolge[ende] === zeichen) {
      ende += 1;
    }
    if (zeichen === '\r' && ende === zeichenfolge.length) {
      ende -= 1;
    }
    return ende - stelle;
  }

  function marke(zeichen, istBidi, istLetztes, anzahl) {
    const code = codeVon(zeichen);
    const mehrfach = anzahl > 1 ? ` ×${anzahl}` : '';
    let ergebnis;
    if (istBidi) {
      ergebnis = { marke: 'bidi', code, text: `⟨${code}⟩${mehrfach}` };
    } else if (zeichen === '\r' && istLetztes) {
      ergebnis = { marke: 'steuer', code, text: '␍' };
    } else {
      ergebnis = { marke: 'steuer', code, text: bildzeichen(zeichen) + code + mehrfach };
    }
    if (anzahl > 1) {
      ergebnis.anzahl = anzahl;
    }
    return ergebnis;
  }

  function codeVon(zeichen) {
    return `U+${zeichen.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  }

  /** Bildzeichen der Steuerzeichen: U+2400 + Code für 0–31, ␡ für DEL; C1-Zeichen und Unsichtbares haben keins. */
  function bildzeichen(zeichen) {
    const code = zeichen.codePointAt(0);
    if (code < 0x20) {
      return `${String.fromCodePoint(0x2400 + code)} `;
    }
    if (code === 0x7F) {
      return '␡ ';
    }
    return '';
  }

  /** Höchstens so viele Zeichen Text hat ein Block, außer eine Zeile allein ist länger: jeder Block außerhalb des Bildes wird weder
      ausgelegt noch gemalt (`content-visibility`), so kostet ein Bild auch bei dichtem Inhalt (bis zu 1000 Farbstücke je Zeile) nur die
      Blöcke im Bild — ein Block zu 500 dichten Zeilen brauchte gefärbt je Bild über 150 ms (Befund B1 zu #8). */
  const BLOCK_ZEICHEN = 25000;

  /** Zeilen in Blöcke zu höchstens 500 Zeilen und höchstens `BLOCK_ZEICHEN` Zeichen. */
  function bloecke(zeilen) {
    const aus = [];
    let block = [];
    let zeichen = 0;
    for (const zeile of zeilen) {
      const blockVoll = block.length === BLOCK_ZEILEN || (block.length > 0 && zeichen + zeile.text.length > BLOCK_ZEICHEN);
      if (blockVoll) {
        aus.push(block);
        block = [];
        zeichen = 0;
      }
      block.push(zeile);
      zeichen += zeile.text.length;
    }
    if (block.length > 0) {
      aus.push(block);
    }
    return aus;
  }

  /** Grenzen, über denen ein Text auf Wahl zugeklappt bleibt: Zeilen, Zeichen insgesamt und Marken (jede ein Knoten im Dokument). */
  const ZEILEN_GRENZE = 20000;
  const ZEICHEN_GRENZE = 262144;
  const MARKEN_GRENZE = 10000;

  /** `null`, solange der Text gezeichnet werden darf; sonst die erste überschrittene Grenze `{anzahl, einheit}`.
      Zeichen werden vor den Marken gezählt: eine 3-MB-Datei wird nie erst in Marken zerlegt. */
  function zuLang(zeilen) {
    const textzeilen = zeilen.filter(zeile => zeile.art !== 'kopf');
    if (textzeilen.length > ZEILEN_GRENZE) {
      return { anzahl: textzeilen.length, einheit: 'Zeilen' };
    }
    const zeichen = textzeilen.reduce((summe, zeile) => summe + zeile.text.length, 0);
    if (zeichen > ZEICHEN_GRENZE) {
      return { anzahl: zeichen, einheit: 'Zeichen' };
    }
    const marken = textzeilen.reduce((summe, zeile) => summe + sichtbarTeile(zeile.text).filter(teil => teil.marke).length, 0);
    if (marken > MARKEN_GRENZE) {
      return { anzahl: marken, einheit: 'Marken' };
    }
    return null;
  }

  /** Geschätzte Breite eines Blocks in px: ein Block außerhalb des Bildes wird nicht ausgelegt und hätte sonst keine Breite zum
      waagerechten Scrollen. Großzügig 8 px je Zeichen (Monospace 12 px, Tab 4, breite Zeichen 2), dazu Nummern und Vorzeichen. */
  function blockBreite(zeilen) {
    const breiten = zeilen.map(zeichenBreite);
    return Math.ceil(Math.max(0, ...breiten) * 8 + 140);
  }

  function zeichenBreite(zeile) {
    let breite = 0;
    for (const zeichen of zeile.text) {
      breite += zeichenspalten(zeichen);
    }
    return breite;
  }

  function zeichenspalten(zeichen) {
    if (zeichen === '\t') {
      return 4;
    }
    if (zeichen.codePointAt(0) > 0x2E7F) {
      return 2;
    }
    return 1;
  }

  Object.assign(ziel, { patchZeilen, ganzeDateiZeilen, sichtbarTeile, bloecke, blockBreite, zuLang, BLOCK_ZEILEN, BLOCK_ZEICHEN, ZEILEN_GRENZE, ZEICHEN_GRENZE, MARKEN_GRENZE });
})(typeof module !== 'undefined' ? module.exports : window);
