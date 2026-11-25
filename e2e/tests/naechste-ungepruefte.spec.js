'use strict';
// Spezifikation R00028 „Nächste ungeprüfte Datei“: der Sprung in der Oberfläche — in „Zusammen“ je Datei, in „Einzeln“ je Stelle
// (Commit und Datei) über Commits hinweg, ab der aktuellen Wahl, abgehakte und gesperrte Stellen übersprungen, mit Umlauf.
// Ebene: Integration der Oberfläche gegen das laufende Programm (die Rechnung selbst prüfen die Bausteintests
// e2e/tests/bausteine/naechste-werte.spec.js); kein Hot-Path-Fall.
const { test, expect } = require('../dsl/naechste.js');

test.describe('Sprung in „Zusammen“ (je Datei)', () => {
  test('soll von vorn durch die Liste springen und am Ende umlaufen (Szenario 1)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    const ohneSprung = await naechste.gewaehlteZeilen();
    expect(ohneSprung, 'ohne Sprung ist nichts gewählt').toEqual([]);

    await naechste.reihe(['README.md', 'src/a.txt', 'src/b.txt', 'README.md']);
  });

  test('soll ab der aktuellen Datei die nächste nehmen, nicht sie selbst (Szenario 2)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.dateiWaehlen('src/a.txt');

    await naechste.springen();

    await naechste.stelle('src/b.txt');
  });

  test('soll eine abgehakte Datei überspringen (Szenario 3)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.abhaken('README.md');
    await naechste.fortschritt('1 von 3 Dateien abgehakt');

    await naechste.reihe(['src/a.txt', 'src/b.txt', 'src/a.txt']);
  });

  test('soll die gefundene Zeile in den sichtbaren Bereich holen (Szenario 7, Scroll)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'viele Dateien', modus: 'zusammen' });
    await naechste.dateienWarten(61);

    // 30 Zeilen abwärts: die gefundene Zeile liegt unterhalb des sichtbaren Bereichs, wenn der Knopf sichtbar ist.
    for (let schritt = 0; schritt < 30; schritt += 1) {
      await naechste.springen();
    }

    await naechste.stelle('viele/datei-0029.txt');
    await naechste.zeileImBlick('viele/datei-0029.txt');
  });
});

test.describe('Liste und Baum', () => {
  test('soll im Baum dieselbe Reihenfolge nehmen wie in der flachen Liste (Reihenfolge)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.darstellung('baum');

    await naechste.reihe(['README.md', 'src/a.txt', 'src/b.txt', 'README.md']);
  });
});

test.describe('Sprung in „Einzeln“ (je Stelle, über Commits)', () => {
  test('soll durch die Stellen aller Commits springen und der Commit-Wähler wechselt mit (Szenario 4)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'einzeln' });
    await naechste.dateienWarten(2);

    await naechste.reihe([['README.md', 'z1'], ['src/a.txt', 'z1']]);

    // Der Commit wechselt mit dem Sprung: der Diff gehört zu z2 (dort steht in src/a.txt „ZWEI“).
    await naechste.springen();
    await naechste.stelle('src/a.txt', 'z2');
    await naechste.diffEnthaelt('ZWEI');

    await naechste.reihe([['src/b.txt', 'z2'], ['src/a.txt', 'z3'], ['src/b.txt', 'z3'], ['README.md', 'z1']]);
  });

  test('soll eine abgehakte Stelle überspringen (Szenario 5)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'einzeln' });
    await naechste.dateienWarten(2);
    await naechste.abhaken('README.md');
    await naechste.fortschritt('1 von 6 Stellen abgehakt');

    await naechste.reihe([['src/a.txt', 'z1']]);
  });
});

test.describe('Knopf und Meldung', () => {
  test('soll bei lauter abgehakten Dateien „Alles abgehakt“ melden und der Knopf ist nicht bedienbar (Kriterium 6)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.knopfBedienbar();

    for (const datei of ['README.md', 'src/a.txt', 'src/b.txt']) {
      await naechste.abhaken(datei);
    }

    await naechste.fortschritt('3 von 3 Dateien abgehakt');
    await naechste.knopfNichtBedienbar();
    await naechste.meldung('Alles abgehakt');
  });

  test('soll im leeren Diff-Bereich denselben Weg anbieten („Erste ungeprüfte öffnen“, Bedienung)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);

    await naechste.leererDiffKnopfname();
    await naechste.leererDiffKnopf(true);

    await naechste.leerenDiffKnopfBetaetigen();

    await naechste.stelle('README.md');
    await naechste.leererDiffKnopf(false);
  });

  test('soll über die Tastatur springen und der Name des Knopfes beginnt mit dem sichtbaren Text (Bedienung)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.knopfname();

    await naechste.springenPerTastatur();
    await naechste.stelle('README.md');
    await naechste.fokusAufKnopf();

    await naechste.springenPerTastatur();
    await naechste.stelle('src/a.txt');
  });

  test('soll in Repo N mit v nur lesbare Stellen anspringen und am Ende „Alles Lesbare abgehakt, 3 nicht lesbar“ melden (Kriterium 6)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo N mit v', modus: 'einzeln' });
    await naechste.dateienWarten(9);
    await naechste.fortschritt('0 von 10 Stellen abgehakt (3 nicht lesbar)');

    for (let stelle = 1; stelle <= 7; stelle += 1) {
      await naechste.springen();
      await naechste.gewaehlteZeileLesbar();
      await naechste.gewaehlteZeileAbhaken();
      await naechste.fortschritt(`${stelle} von 10 Stellen abgehakt (3 nicht lesbar)`);
    }

    await naechste.knopfNichtBedienbar();
    await naechste.meldung('Alles Lesbare abgehakt, 3 nicht lesbar');
  });
});

/* ── Szenario 6: ausgeblendete Datei (R00025) ── */

// Repo Q in der Reihenfolge der Liste (git): sieben Einträge, `app.lock` ist der zweite.
const REPO_Q_ALLE = ['README.md', 'app.lock', 'build/out.log', 'docs/README.md', 'src/a.txt', 'src/b.txt', 'src/generated/api.cs'];
const REPO_Q_SICHTBAR = REPO_Q_ALLE.filter(pfad => pfad !== 'app.lock');

/** Springt durch die Einträge, hakt jeden ab und prüft den Fortschritt (Repo Q: m = 7, der verdeckte Eintrag bleibt offen). */
async function springtUndHaktAb(naechste, pfade, einheit) {
  for (const [nummer, pfad] of pfade.entries()) {
    await naechste.springen();
    await naechste.stelle(pfad);
    await naechste.gewaehlteZeileAbhaken();
    await naechste.fortschritt(`${nummer + 1} von 7 ${einheit} abgehakt`);
  }
}

test.describe('Szenario 6: ausgeblendete Datei', () => {
  test('soll mit --ignore die ausgeblendete Datei nie anspringen und am Ende umlaufen', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Q', modus: 'zusammen', zusatz: ['--ignore', '*.lock'] });
    await naechste.dateienWarten(6);
    await naechste.ausblendenZaehler('1 ausgeblendet, davon 1 Muster');

    // Der achte Sprung läuft zur ersten ungeprüften um; app.lock ist nie ein Ziel (sonst stünde keine Zeile gewählt).
    await naechste.reihe([...REPO_Q_SICHTBAR, 'README.md']);
  });

  test('soll in „Zusammen“ nach den sichtbaren Dateien „Alles Sichtbare abgehakt, 1 ausgeblendet“ melden', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Q', modus: 'zusammen', zusatz: ['--ignore', '*.lock'] });
    await naechste.dateienWarten(6);

    await springtUndHaktAb(naechste, REPO_Q_SICHTBAR, 'Dateien');

    await naechste.knopfNichtBedienbar();
    await naechste.meldung('Alles Sichtbare abgehakt, 1 ausgeblendet');
  });

  test('soll in „Einzeln“ die ausgeblendete Stelle überspringen und die Meldung nennen', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Q', modus: 'einzeln', zusatz: ['--ignore', '*.lock'] });
    await naechste.dateienWarten(6);

    await springtUndHaktAb(naechste, REPO_Q_SICHTBAR, 'Stellen');

    await naechste.knopfNichtBedienbar();
    await naechste.meldung('Alles Sichtbare abgehakt, 1 ausgeblendet');
  });

  test('soll ein Muster aus dem Feld beachten: der erste Sprung nimmt die erste sichtbare Datei', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Q', modus: 'zusammen' });
    await naechste.dateienWarten(7);

    await naechste.musterEingeben('*.md');

    await naechste.ausblendenZaehler('2 ausgeblendet, davon 2 Muster');
    await naechste.dateienWarten(5);
    // Der erste Listeneintrag (README.md) ist ausgeblendet: die Suche beginnt bei der ersten sichtbaren Datei.
    await naechste.reihe(['app.lock', 'build/out.log']);
  });

  test('soll ein Muster aus dem Feld in „Einzeln“ genauso beachten', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Q', modus: 'einzeln' });
    await naechste.dateienWarten(7);

    await naechste.musterEingeben('*.md');

    await naechste.ausblendenZaehler('2 ausgeblendet, davon 2 Muster');
    await naechste.dateienWarten(5);
    await naechste.reihe(['app.lock', 'build/out.log']);
  });

  test('soll bei lauter ausgeblendeten Dateien die Zahl nennen (alles verdeckt)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Q', modus: 'zusammen', zusatz: ['--ignore', '*'] });

    await naechste.dateilistenMeldung('Alle Dateien ausgeblendet');

    await naechste.knopfNichtBedienbar();
    await naechste.meldung('Alles Sichtbare abgehakt, 7 ausgeblendet');
  });

  test('soll ohne Muster die ausgeblendete Datei erreichen und am Ende „Alles abgehakt“ melden (Kontrolle)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Q', modus: 'zusammen' });
    await naechste.dateienWarten(7);

    await springtUndHaktAb(naechste, REPO_Q_ALLE, 'Dateien');

    await naechste.knopfNichtBedienbar();
    await naechste.meldung('Alles abgehakt');
  });
});

test.describe('Kein neuer Weg, späte Antwort, beide Modi', () => {
  test('soll beim verzögerten Diff die späte Antwort der früheren Wahl verwerfen (Szenario 7)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.diffAntwortVerzoegern(1500);

    await naechste.springen();
    await naechste.springen();
    await naechste.stelle('src/a.txt');
    await naechste.diffEnthaelt('ZWEI');

    // Die Antwort der ersten Wahl (README.md) kommt später — sie darf den Diff nicht mehr ändern.
    await naechste.ruhezeitAbwarten(2000);
    await naechste.stelle('src/a.txt');
    await naechste.diffEnthaeltNicht('Lager');
  });

  test('soll in beiden Modi über denselben Haken-Stand arbeiten (Szenario 8)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.abhaken('README.md');
    await naechste.fortschritt('1 von 3 Dateien abgehakt');

    await naechste.modusWaehlen('einzeln');

    await naechste.fortschritt('1 von 6 Stellen abgehakt');
    await naechste.knopfBedienbar();
    await naechste.knopfname();
    await naechste.reihe([['src/a.txt', 'z1']]);

    await naechste.modusWaehlen('zusammen');

    await naechste.fortschritt('1 von 3 Dateien abgehakt');
    await naechste.reihe([['src/b.txt']]);
  });

  test('soll nicht mehr git-Aufrufe als die Wahl derselben Stelle starten (Kriterium 12, Prozessprobe)', async ({ naechste }) => {
    // Von Hand gewählt: README.md (die erste ungeprüfte) ohne vorherige Wahl.
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.standGeladen();
    const vorherHand = await naechste.gitAufrufeJetzt();
    const anfragenVorherHand = naechste.anfragenJetzt();
    await naechste.dateiWaehlen('README.md');
    await naechste.stelle('README.md');
    const vonHand = await naechste.neueGitAufrufe(vorherHand);
    const anfragenVonHand = naechste.neueAnfragen(anfragenVorherHand);

    // Über den Sprung: dieselbe Stelle, derselbe Ausgangszustand (nichts gewählt).
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.standGeladen();
    const vorherSprung = await naechste.gitAufrufeJetzt();
    const anfragenVorher = naechste.anfragenJetzt();
    await naechste.springen();
    await naechste.stelle('README.md');
    const ueberDenSprung = await naechste.neueGitAufrufe(vorherSprung);

    expect(vonHand, 'die Wahl liest den Diff der Stelle').not.toHaveLength(0);
    expect(ueberDenSprung, `Sprung: ${ueberDenSprung.join(' | ')}`).toEqual(vonHand);
    expect(naechste.neueAnfragen(anfragenVorher), 'kein neuer Serverweg: dieselben Anfragen wie die Wahl')
      .toEqual(anfragenVonHand);
  });
});
