/* gitreviewA — Suche (R00027): reine Rechnung für den Suchbegriff, das Finden der Treffer im gezeigten Text und das
   Abbilden der Treffer auf die Textteile. Läuft unter Node und im Browser (wie `diff-werte.js`); fremder Text geht
   hier unverändert durch, gezeichnet wird er anderswo nur über `textContent`. Kein Regex — die Suche ist wörtlich. */
(function (ziel) {
  'use strict';

  /** Höchstlänge des Suchbegriffs in Zeichen (R00027, Grenzen): leer oder darüber heißt keine Suche. */
  const ZEICHEN_GRENZE = 200;
  /** Höchstzahl gezählter und markierter Treffer (R00027, Grenzen); darüber nennt der Zähler als Gesamtzahl „10000+“. */
  const TREFFER_GRENZE = 10000;

  /** Der geprüfte Suchbegriff `{gueltig, grund, meldung}`: leer (auch nur Leerraum) und über der Längengrenze werden
      abgelehnt. `grund` ist `'leer'`, `'zuLang'` oder `null`. Wörtlich: Sonderzeichen wie `.*`, `[`, `\` sind Text. */
  function pruefe(text) {
    if (typeof text !== 'string' || text.trim() === '') {
      return { gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' };
    }
    if (text.length > ZEICHEN_GRENZE) {
      return { gueltig: false, grund: 'zuLang', meldung: `Der Suchbegriff darf höchstens ${ZEICHEN_GRENZE} Zeichen haben.` };
    }
    return { gueltig: true, grund: null, meldung: '' };
  }

  /** Sucht `begriff` wörtlich (kein Regex, Groß/Klein unterschieden) in jeder der `texte` (der gezeigte Text je Zeile).
      Liefert `{treffer, gedeckelt}`: `treffer` sind `{zeile, von, bis}` in Reihenfolge (von oben nach unten), höchstens
      `TREFFER_GRENZE`; `gedeckelt` ist `true`, wenn mindestens ein weiterer Treffer über der Grenze liegt. Die Suche ist
      linear (`indexOf` ohne Rückverfolgung), damit ein präparierter Begriff den Hauptfaden nicht einfriert. */
  function finde(texte, begriff) {
    const treffer = [];
    if (begriff === '') {
      return { treffer, gedeckelt: false };
    }
    for (let zeile = 0; zeile < texte.length; zeile += 1) {
      let von = texte[zeile].indexOf(begriff);
      while (von !== -1) {
        if (treffer.length === TREFFER_GRENZE) {
          return { treffer, gedeckelt: true };
        }
        treffer.push({ zeile, von, bis: von + begriff.length });
        von = texte[zeile].indexOf(begriff, von + begriff.length);
      }
    }
    return { treffer, gedeckelt: false };
  }

  /** Bildet die Trefferspannen einer Zeile (Zeichenstellen im gezeigten Text) auf die Teile ab, die dieser Text bildet
      (`sichtbarTeile`). Jeder Teil bekommt — nur wenn er berührt ist — eine eigene Liste `treffer` mit lokalen Spannen;
      eine Marke zählt dabei als ihr Text. Teile ohne Treffer bleiben unverändert. */
  function aufTeile(teile, treffer) {
    const versatz = [];
    let offset = 0;
    for (const teil of teile) {
      versatz.push(offset);
      offset += teil.text.length;
    }
    return teile.map((teil, index) => {
      const teilVon = versatz[index];
      const teilBis = teilVon + teil.text.length;
      const lokale = [];
      for (const spanne of treffer) {
        const von = Math.max(spanne.von, teilVon);
        const bis = Math.min(spanne.bis, teilBis);
        if (von < bis) {
          lokale.push({ von: von - teilVon, bis: bis - teilVon });
        }
      }
      if (lokale.length === 0) {
        return teil;
      }
      return Object.assign({}, teil, { treffer: lokale });
    });
  }

  /** Der Zählertext (R00027): „keine Treffer“ bei 0, sonst „k von n“ — `n` mit `+`, wenn über der Treffergrenze gedeckelt. */
  function zaehlertext(aktuell, gesamt, gedeckelt = false) {
    if (gesamt === 0) {
      return 'keine Treffer';
    }
    return `${aktuell} von ${gesamt}${gedeckelt ? '+' : ''}`;
  }

  Object.assign(ziel, { pruefe, finde, aufTeile, zaehlertext, ZEICHEN_GRENZE, TREFFER_GRENZE });
})(typeof module !== 'undefined' ? module.exports : window);
