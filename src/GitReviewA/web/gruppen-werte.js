/* gitreviewA — Werte der Gruppen (R00040): die eine Stelle, die aus dem Anzeigenamen eines Pfades die Gruppe bestimmt
   (Code, Tests oder Doku) — Liste, Gruppenzähler und Navigation lesen nur sie. Reine Funktionen, im Browser und in Node.

   Die Regel (R00040, Funktionale Anforderungen):
   - Tests: ein Ordner `test`, `tests`, `spec`, `specs`, `__tests__` oder `e2e` (jede Ebene, ASCII ohne Rücksicht auf
     Groß/Klein) oder ein Dateiname nach `*.test.*`, `*.spec.*`, `*Test.*`, `*Tests.*`, `test_*.py` oder `*_test.*`
     (wie geschrieben);
   - sonst Doku: Endung `.md`, `.markdown`, `.rst` oder `.adoc` (wie geschrieben), ein Ordner `doc`, `docs`,
     `Dokumentation` oder `Documentation` (ASCII ohne Rücksicht auf Groß/Klein) oder ein Dateiname, der mit `README`,
     `LIESMICH`, `LICENSE` oder `CHANGELOG` beginnt (wie geschrieben);
   - sonst Code. */
(function (ziel) {
  'use strict';

  /** Die drei Gruppen in der Reihenfolge der Liste (R00040). */
  const GRUPPEN = [
    { schluessel: 'code', name: 'Code' },
    { schluessel: 'tests', name: 'Tests' },
    { schluessel: 'doku', name: 'Doku' },
  ];

  const TESTORDNER = ['test', 'tests', 'spec', 'specs', '__tests__', 'e2e'];
  const TESTNAMEN = [/\.test\./, /\.spec\./, /Test\./, /Tests\./, /^test_.*\.py$/, /_test\./];
  const DOKUORDNER = ['doc', 'docs', 'dokumentation', 'documentation'];
  const DOKUENDUNGEN = ['.md', '.markdown', '.rst', '.adoc'];
  const DOKUANFAENGE = ['README', 'LIESMICH', 'LICENSE', 'CHANGELOG'];

  /** Die Gruppe eines Anzeigenamens (neuer Pfad bei Umbenennung, mit Marken für Rohbytes): `code`, `tests` oder `doku`. */
  function gruppeDes(anzeigename) {
    const teile = anzeigename.split('/');
    const dateiname = teile[teile.length - 1];
    const ordner = teile.slice(0, -1);
    if (istTest(ordner, dateiname)) {
      return 'tests';
    }
    if (istDoku(ordner, dateiname)) {
      return 'doku';
    }
    return 'code';
  }

  function istTest(ordner, dateiname) {
    if (ordner.some(name => TESTORDNER.includes(name.toLowerCase()))) {
      return true;
    }
    return TESTNAMEN.some(muster => muster.test(dateiname));
  }

  function istDoku(ordner, dateiname) {
    if (ordner.some(name => DOKUORDNER.includes(name.toLowerCase()))) {
      return true;
    }
    if (DOKUENDUNGEN.some(endung => dateiname.endsWith(endung))) {
      return true;
    }
    return DOKUANFAENGE.some(anfang => dateiname.startsWith(anfang));
  }

  Object.assign(ziel, { GRUPPEN, gruppeDes });
})(typeof module !== 'undefined' ? module.exports : window);
