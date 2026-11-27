/* gitreviewA — reine Werte der Dateiansicht (R00043): Marken für unsichtbare Zeichen (dieselbe Klasse wie das Protokoll, Lehre #17),
   die Zeilen des Textes (ein CR vor LF ist Zeilenende, ein einzelnes CR nicht), die Kürzung einer gezeigten Zeile auf 10 000 Zeichen,
   Gruppierung der Zeilenzahl und Kürzung eines langen Pfads in der Mitte. Ohne DOM und ohne Zustand, im Browser und in Node. */
(function (ziel) {
  'use strict';

  const HOECHSTZEICHENJEZEILE = 10000;

  /* Die eine Zeichenliste der Oberfläche (`dateiliste-werte.js`, R00054, Lehre #17): Steuerzeichen außer Tab, alle
     Formatzeichen, Zeilen- und Absatztrenner. `dateiansicht.html` lädt `dateiliste-werte.js` vor diesem Modul; die Liste
     wird trotzdem beim Aufruf geholt, nicht beim Laden (dieselbe Vorsicht wie in `commit-werte.js`). */
  const namensWerte = () => (typeof module !== 'undefined' ? require('./dateiliste-werte.js') : window);

  function istEinzelnesSurrogat(zeichen) {
    if (zeichen.length !== 1) {
      return false;
    }
    const code = zeichen.codePointAt(0);
    return code >= 0xD800 && code <= 0xDFFF;
  }

  function istUnsichtbar(zeichen) {
    if (zeichen === '\t') {
      return false;
    }
    return namensWerte().UNSICHTBARER_TEXT.test(zeichen) || istEinzelnesSurrogat(zeichen);
  }

  function marke(zeichen) {
    const code = zeichen.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    return `⟨U+${code}⟩`;
  }

  /** Jedes unsichtbare oder richtungsändernde Zeichen wird zur Marke `⟨U+202E⟩`; sichtbarer Text bleibt unverändert. */
  function alsMarken(text) {
    let ergebnis = '';
    for (const zeichen of Array.from(text)) {
      ergebnis += istUnsichtbar(zeichen) ? marke(zeichen) : zeichen;
    }
    return ergebnis;
  }

  /** Der Text → seine Zeilen: ein CR vor LF ist Zeilenende (CR wird nicht gezeigt), ein einzelnes CR ist Text und wird zur Marke. */
  function zeilenVon(text) {
    if (text === '') {
      return [];
    }
    const teile = text.split('\n');
    const endetMitLf = text.endsWith('\n');
    const zeilen = [];
    for (let stelle = 0; stelle < teile.length; stelle += 1) {
      const istLetzte = stelle === teile.length - 1;
      if (istLetzte && endetMitLf) {
        break;
      }
      let zeile = teile[stelle];
      if (!istLetzte && zeile.endsWith('\r')) {
        zeile = zeile.slice(0, -1);
      }
      zeilen.push(zeile);
    }
    return zeilen;
  }

  /** Eine Zeile auf höchstens 10 000 UTF-16-Einheiten kürzen, nie mitten im Surrogatpaar; `weitere` zählt wie die Anzeige. */
  function kuerzeZeile(text, grenze) {
    const hoechstgrenze = grenze || HOECHSTZEICHENJEZEILE;
    if (text.length <= hoechstgrenze) {
      return { gezeigt: text, weitere: 0 };
    }
    let gezeigt = text.slice(0, hoechstgrenze);
    const letztes = gezeigt.charCodeAt(gezeigt.length - 1);
    if (letztes >= 0xD800 && letztes <= 0xDBFF) {
      gezeigt = gezeigt.slice(0, -1);
    }
    return { gezeigt, weitere: text.length - gezeigt.length };
  }

  /** Die Zahl mit Leerzeichen zwischen Tausendern: 30000 → „30 000“. */
  function zahl(text) {
    return String(text).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /** „1 Zeile“ / „n Zeilen“. */
  function zeilenWort(anzahl) {
    return anzahl === 1 ? '1 Zeile' : `${zahl(anzahl)} Zeilen`;
  }

  /** Die Bestätigung des Kopierens (R00043, Kriterium 8 und L5): nennt die Zahl und die nur gekürzt gezeigten Zeilen. */
  function kopierbestaetigung(zeilen, gekuerzteZeilen) {
    const zusatz = gekuerzteZeilen > 0 ? `, davon ${gekuerzteZeilen} nur gekürzt gezeigt` : '';
    return `Datei kopiert (${zeilenWort(zeilen)}${zusatz})`;
  }

  /** Einen langen Pfad in der Mitte kürzen; der ganze Pfad gehört in den zugänglichen Namen, nie nur ins `title`.
      Geschnitten wird nie mitten in einer Marke `⟨U+XXXX⟩` — ein halbes Zeichen wäre keine Marke mehr (Lehre #17). */
  function pfadKuerzen(pfad, hoechstlaenge) {
    const grenze = hoechstlaenge || 100;
    if (pfad.length <= grenze) {
      return pfad;
    }
    const rest = grenze - 1;
    const vorn = Math.ceil(rest / 2);
    const hinten = rest - vorn;
    return `${vornOhneHalbeMarke(pfad, vorn)}…${hintenOhneHalbeMarke(pfad, hinten)}`;
  }

  /** Die ersten `laenge` Zeichen; ein begonnenes, aber nicht geschlossenes `⟨…` fällt weg. */
  function vornOhneHalbeMarke(text, laenge) {
    const stueck = text.slice(0, laenge);
    const letzterAuf = stueck.lastIndexOf('⟨');
    if (letzterAuf < 0 || stueck.indexOf('⟩', letzterAuf) >= 0) {
      return stueck;
    }
    return stueck.slice(0, letzterAuf);
  }

  /** Die letzten `laenge` Zeichen; ein `…⟩` ohne sein `⟨` fällt weg. */
  function hintenOhneHalbeMarke(text, laenge) {
    const stueck = text.slice(text.length - laenge);
    const ersterZu = stueck.indexOf('⟩');
    if (ersterZu < 0 || stueck.lastIndexOf('⟨', ersterZu) >= 0) {
      return stueck;
    }
    return stueck.slice(ersterZu + 1);
  }

  const api = {
    HOECHSTZEICHENJEZEILE,
    alsMarken,
    zeilenVon,
    kuerzeZeile,
    zahl,
    zeilenWort,
    kopierbestaetigung,
    pfadKuerzen,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaDateiansichtWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);