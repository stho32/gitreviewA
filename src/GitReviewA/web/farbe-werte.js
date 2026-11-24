/* gitreviewA — Rechnung der Syntaxfarben auf der Seite (R00007): Sprache aus dem Pfad, Grenzen des Patches, Farbstücke je Zeile und
   Teile einer Zeile mit Rolle. Reine Funktionen, im Browser und in Node. Herkunft: kanbanD web/diff.js (spracheZuPfad, faerbbar,
   GRENZE_PATCH, GRENZE_ZEILE, TK_KLASSEN, farbigHtml; MIT) — hier ohne HTML: die Teile werden als DOM-Knoten mit textContent gezeichnet. */
(function (ziel) {
  'use strict';

  /** Endung des Dateinamens → Grammatik von Prism. */
  const SPRACHEN = new Map(Object.entries({
    cs: 'csharp', js: 'javascript', mjs: 'javascript', cjs: 'javascript', json: 'json', css: 'css', html: 'markup', htm: 'markup', xml: 'markup',
    svg: 'markup', md: 'markdown', py: 'python', sh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml', sql: 'sql', rs: 'rust', toml: 'toml', php: 'php',
  }));

  /** Pfad → Name der Grammatik oder `null` (ohne Endung, unbekannte Endung); nur der Dateiname zählt, Groß- und Kleinschreibung egal. */
  function spracheZuPfad(pfad) {
    const dateiname = pfad.slice(pfad.lastIndexOf('/') + 1);
    const punkt = dateiname.lastIndexOf('.');
    if (punkt < 0) {
      return null;
    }
    const endung = dateiname.slice(punkt + 1).toLowerCase();
    if (!SPRACHEN.has(endung)) {
      return null;
    }
    return SPRACHEN.get(endung);
  }

  /** Höchstens so viele UTF-16-Einheiten hat ein Patch, der gefärbt wird. */
  const GRENZE_PATCH = 262144;
  /** Höchstens so viele UTF-16-Einheiten hat jede Zeile eines gefärbten Patches, mit Vorzeichen, ohne `\n`. */
  const GRENZE_ZEILE = 1000;

  /** Nur innerhalb beider Grenzen geht ein Auftrag an den Worker; maßgeblich ist der Patch der gezeigten Ansicht. */
  function faerbbar(patch) {
    if (patch.length > GRENZE_PATCH) {
      return false;
    }
    return patch.split('\n').every(zeile => zeile.length <= GRENZE_ZEILE);
  }

  /** Die sieben Rollen; der Worker antwortet mit ihrem Index. */
  const ROLLEN_KLASSEN = ['tk-keyword', 'tk-string', 'tk-comment', 'tk-number', 'tk-function', 'tk-type', 'tk-macro'];

  /** Antwort des Workers `[Zeile, von, bis, Rolle]*` → Zeile → Stücke `{von, bis, klasse}` aufsteigend; Rollen außerhalb der sieben fallen weg. */
  function stueckeJeZeile(antwort) {
    const stueckeNachZeile = new Map();
    for (let stelle = 0; stelle + 3 < antwort.length; stelle += 4) {
      const klasse = ROLLEN_KLASSEN[antwort[stelle + 3]];
      if (!klasse) {
        continue;
      }
      const zeile = antwort[stelle];
      if (!stueckeNachZeile.has(zeile)) {
        stueckeNachZeile.set(zeile, []);
      }
      stueckeNachZeile.get(zeile).push({ von: antwort[stelle + 1], bis: antwort[stelle + 2], klasse });
    }
    return stueckeNachZeile;
  }

  /** Teile einer Zeile aus `sichtbarTeile` + Stücke (Versätze im Zeilentext) → Teile, Text ohne Marke an den Stückgrenzen geteilt, mit
      `klasse` wo ein Stück liegt. Eine Marke hat Vorrang und bleibt ohne Farbe; sie steht für `anzahl` (sonst 1) Zeichen des Zeilentexts. */
  function farbteile(teile, stuecke) {
    const aus = [];
    let stelle = 0;
    let naechstesStueck = 0;
    for (const teil of teile) {
      if (teil.marke) {
        aus.push(teil);
        stelle += teil.anzahl || 1;
        continue;
      }
      const ende = stelle + teil.text.length;
      let bei = stelle;
      while (naechstesStueck < stuecke.length && stuecke[naechstesStueck].bis <= bei) {
        naechstesStueck += 1;
      }
      for (let index = naechstesStueck; index < stuecke.length && stuecke[index].von < ende; index += 1) {
        const von = Math.max(stuecke[index].von, bei);
        const bis = Math.min(stuecke[index].bis, ende);
        if (von > bei) {
          aus.push({ text: teil.text.slice(bei - stelle, von - stelle) });
        }
        aus.push({ text: teil.text.slice(von - stelle, bis - stelle), klasse: stuecke[index].klasse });
        bei = bis;
      }
      if (bei < ende) {
        aus.push({ text: teil.text.slice(bei - stelle) });
      }
      stelle = ende;
    }
    return aus;
  }

  Object.assign(ziel, { spracheZuPfad, faerbbar, stueckeJeZeile, farbteile, GRENZE_PATCH, GRENZE_ZEILE });
})(typeof module !== 'undefined' ? module.exports : window);
