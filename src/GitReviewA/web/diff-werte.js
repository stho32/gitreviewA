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
      Steuerzeichen außer Tab als Bildzeichen mit Code (ohne Bildzeichen nur der Code), ein `\r` am Ende als `␍`. */
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
    zeichenfolge.forEach((zeichen, stelle) => {
      const istBidi = BIDI.test(zeichen);
      const istSteuer = STEUER.test(zeichen);
      if (!istBidi && !istSteuer) {
        gewoehnlich += zeichen;
        return;
      }
      if (gewoehnlich) {
        teile.push({ text: gewoehnlich });
      }
      gewoehnlich = '';
      teile.push(marke(zeichen, istBidi, stelle === zeichenfolge.length - 1));
    });
    if (gewoehnlich) {
      teile.push({ text: gewoehnlich });
    }
    return teile;
  }

  function marke(zeichen, istBidi, istLetztes) {
    const code = codeVon(zeichen);
    if (istBidi) {
      return { marke: 'bidi', code, text: `⟨${code}⟩` };
    }
    if (zeichen === '\r' && istLetztes) {
      return { marke: 'steuer', code, text: '␍' };
    }
    return { marke: 'steuer', code, text: bildzeichen(zeichen) + code };
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

  /** Zeilen in Blöcke zu höchstens 500. */
  function bloecke(zeilen) {
    const aus = [];
    for (let anfang = 0; anfang < zeilen.length; anfang += BLOCK_ZEILEN) {
      aus.push(zeilen.slice(anfang, anfang + BLOCK_ZEILEN));
    }
    return aus;
  }

  Object.assign(ziel, { patchZeilen, sichtbarTeile, bloecke, BLOCK_ZEILEN });
})(typeof module !== 'undefined' ? module.exports : window);
