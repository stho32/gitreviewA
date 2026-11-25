'use strict';
// Spezifikation R00031 „Zeilenbereich annotieren“: die Auswahl im Browser (Umschalt-Klick, Ziehen, Markierung, offenes Feld übersteht
// das Neuzeichnen, DOM-Sicherheit) und die Anzeige der Bereichsanmerkung am Bereichsende. Ebene: Playwright headless gegen das laufende
// Programm (die Rechnung selbst prüfen die Bausteintests e2e/tests/bausteine/bereich-werte.spec.js); kein Hot-Path-Fall.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const ABSCHNITTSHINWEIS = 'Ein Bereich geht nur innerhalb eines Abschnitts';
const ENTFERNT = 'Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei';

test.describe('Bereich markieren und anmerken (Szenario 1, 3)', () => {
  test('soll von z03 bis z07 markieren, das Feld unter z07 öffnen und im Ergebnis lang.txt:3-7 mit Zitat zeigen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');

    await anm.bereichWaehlen(3, 7);

    await anm.markiert([3, 4, 5, 6, 7]);
    await anm.markierungNichtNurFarbe(3);
    await anm.bereichFeldOffenMitFokus('lang.txt', 3, 7);
    await anm.textSchreiben('lang.txt', '3–7', 'Klammer fehlt');
    await anm.speichern('lang.txt', '3–7');
    await anm.feldZu('lang.txt', '3–7');

    await anm.bereichAnmerkungenUnter('lang.txt', 7, 3, 7, ['Klammer fehlt']);
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toContain(`## 1. lang.txt:3-7\n\nCommit: ${anm.hash('r2')}\n\n    3: z03\n    4: z04\n    5: Z05\n    6: z06\n    7: z07\n\n> Klammer fehlt\n`);
  });

  test('soll ein Ziehen über die Zeilennummern als Bereich nehmen (Szenario 1)', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');

    await anm.bereichZiehen(3, 7);

    await anm.markiert([3, 4, 5, 6, 7]);
    await anm.bereichFeldOffenMitFokus('lang.txt', 3, 7);
  });

  test('soll zwei überlappende Bereiche unter ihrem eigenen Ende zeigen, die Überlappung doppelt markiert (Szenario 3)', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');
    // Die Zeilen 9–21 liegen in „nur Änderungen“ in der Lücke; die ganze Datei zeigt sie.
    await anm.ansichtWaehlen('ganze Datei');

    await anm.bereichAnnotieren('lang.txt', 3, 7, 'erster');
    await anm.bereichAnnotieren('lang.txt', 5, 10, 'zweiter');

    await anm.markiert([3, 4, 5, 6, 7, 8, 9, 10]);
    await anm.bereichAnmerkungenUnter('lang.txt', 7, 3, 7, ['erster']);
    await anm.bereichAnmerkungenUnter('lang.txt', 10, 5, 10, ['zweiter']);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain('## 1. lang.txt:3-7\n');
    expect(ergebnis).toContain('## 2. lang.txt:5-10\n');
    expect(ergebnis.indexOf('## 1. lang.txt:3-7')).toBeLessThan(ergebnis.indexOf('## 2. lang.txt:5-10'));
  });
});

test.describe('Der Bereich wirkt in jedem Anzeigeverfahren', () => {
  test('soll in „Zusammen“ (netto) markieren und die Anmerkung unter ihrem Ende zeigen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)', modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');

    await anm.bereichAnnotieren('lang.txt', 3, 7, 'netto');

    await anm.markiert([3, 4, 5, 6, 7]);
    await anm.bereichAnmerkungenUnter('lang.txt', 7, 3, 7, ['netto']);
  });

  test('soll nebeneinander markieren und die Anmerkung unter ihrem Ende zeigen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');
    await anm.anordnungWaehlen('nebeneinander');

    await anm.bereichAnnotieren('lang.txt', 3, 7, 'zweispaltig');

    await anm.markiert([3, 4, 5, 6, 7]);
    await anm.bereichAnmerkungenUnter('lang.txt', 7, 3, 7, ['zweispaltig']);
  });
});

test.describe('Der Bereich gehört seinem Commit (Befund B1: „Zusammen“ ohne Kette)', () => {
  // Dieselbe Datei zeigt in `z1` und `z3` dieselben Nummern neu (1–3); das Feld und die gespeicherte Anmerkung gehören dem Commit,
  // in dessen Abschnitt der Mensch markiert hat (R00031) — nicht dem ersten Abschnitt, der die Nummer nennt.
  test('soll einen Umschalt-Klick-Bereich im z3-Abschnitt in z3 markieren, anmerken und mit Commit z3 ausgeben', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', commits: ['z1', 'z3'], modus: 'zusammen' });
    await anm.dateiAnsehen('src/a.txt');

    await anm.bereichImAbschnittWaehlen('z3', 2, 3);

    await anm.markiertImAbschnitt('z3', [2, 3]);
    await anm.markiertImAbschnitt('z1', []);
    await anm.bereichFeldOffenImAbschnitt('z3', 'src/a.txt', 2, 3);
    await anm.bereichImAbschnittSpeichern('z3', 'src/a.txt', 2, 3, 'im z3');
    await anm.bereichAnmerkungenUnterImAbschnitt('z3', 'src/a.txt', 3, 2, 3, ['im z3']);
    await anm.anmerkungenUnterImAbschnitt('z1', 'src/a.txt', { neu: 3 }, []);

    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toContain(`## 1. src/a.txt:2-3\n\nCommit: ${anm.hash('z3')}\n`);
    expect(ergebnis).not.toContain('Commit: ' + anm.hash('z1'));
  });

  test('soll ein Ziehen über die Nummern im z3-Abschnitt als Bereich von z3 nehmen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', commits: ['z1', 'z3'], modus: 'zusammen' });
    await anm.dateiAnsehen('src/a.txt');

    await anm.bereichImAbschnittZiehen('z3', 2, 3);

    await anm.markiertImAbschnitt('z3', [2, 3]);
    await anm.markiertImAbschnitt('z1', []);
    await anm.bereichFeldOffenImAbschnitt('z3', 'src/a.txt', 2, 3);

    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain('Keine Anmerkungen.');
    expect(ergebnis).not.toContain('Commit: ');
  });

  test('soll die Gegenprobe im z1-Abschnitt als Bereich von z1 nehmen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', commits: ['z1', 'z3'], modus: 'zusammen' });
    await anm.dateiAnsehen('src/a.txt');

    await anm.bereichImAbschnittWaehlen('z1', 2, 3);

    await anm.markiertImAbschnitt('z1', [2, 3]);
    await anm.markiertImAbschnitt('z3', []);
    await anm.bereichFeldOffenImAbschnitt('z1', 'src/a.txt', 2, 3);
    await anm.bereichImAbschnittAnnotieren('z1', 'src/a.txt', 2, 3, 'im z1');

    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain(`## 1. src/a.txt:2-3\n\nCommit: ${anm.hash('z1')}\n`);
    expect(ergebnis).not.toContain('Commit: ' + anm.hash('z3'));
  });
});

test.describe('Grenzen der Auswahl (Szenario 2)', () => {
  test('soll über einen Abschnitt hinweg keinen Bereich bilden und es sagen (z05 bis z25)', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');

    await anm.bereichWaehlen(5, 25);

    await anm.nichtMarkiert();
    await anm.hinweis(ABSCHNITTSHINWEIS);
    // Der Ankerklick hat das Feld für die eine Zeile geöffnet; erweitern über die Abschnittsgrenze öffnet kein Bereichsfeld.
    await anm.feldEnthaelt('lang.txt', 5, '');
    await anm.anzahlFelder('lang.txt', 5, 1);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('Keine Anmerkungen.');
  });

  test('soll eine entfernte Zeile nicht als Grenze nehmen, sondern den Hinweis zeigen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');

    await anm.zeileAnklicken({ alt: 5 });

    await anm.hinweis(ENTFERNT);
    await anm.keinFeld();
    await anm.nichtMarkiert();
  });

  test('soll auf einen Abschnittskopf und die Hinweiszeile kein Feld öffnen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');

    await anm.zeileAnklicken('kopf');

    await anm.keinFeld();
    await anm.nichtMarkiert();
  });
});

test.describe('Offenes Feld übersteht das Neuzeichnen (Szenario 4)', () => {
  test('soll Markierung, Text und Fokus behalten, wenn der Diff neu gezeichnet wird, und genau eine Anmerkung anlegen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');
    await anm.bereichWaehlen(3, 7);
    await anm.textSchreiben('lang.txt', '3–7', 'bleibt stehen');

    await anm.neuzeichnen();

    await anm.bereichFeldOffenMitFokus('lang.txt', 3, 7);
    await anm.markiert([3, 4, 5, 6, 7]);
    await anm.speichern('lang.txt', '3–7');
    await anm.feldZu('lang.txt', '3–7');
    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain('Anmerkungen: 1\n');
    expect(ergebnis).toContain('## 1. lang.txt:3-7\n');
  });
});

test.describe('Einzeilige und ganze Datei bleiben unverändert (Szenario 7)', () => {
  test('soll einen Klick ohne Erweitern als Zeilenanmerkung ohne Bindestrich ausgeben', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');
    await anm.ansichtWaehlen('ganze Datei');

    await anm.zeileAnklicken({ neu: 20 });
    await anm.feldOffenMitFokus('lang.txt', 20);
    await anm.textSchreiben('lang.txt', '20', 'nur die Zeile');
    await anm.speichern('lang.txt', '20');
    await anm.feldZu('lang.txt', '20');

    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain('## 1. lang.txt:20\n');
    expect(ergebnis).not.toContain('lang.txt:20-');
  });

  test('soll die Dateianmerkung daneben unverändert lassen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');
    await anm.bereichAnnotieren('lang.txt', 3, 7, 'Bereich');
    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('lang.txt', 'ganze Datei');
    await anm.dateiFeldSpeichern('lang.txt');

    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain('## 1. lang.txt:3-7\n');
    expect(ergebnis).toContain('## 2. lang.txt (ganze Datei)\n\nCommit: ' + anm.hash('r2') + '\n\n> ganze Datei\n');
  });
});

test.describe('Der Bereich bleibt an seiner Stelle (Szenario 6)', () => {
  test('soll nach Commitwechsel, zurück und Neuladen an 3-7 in r2 stehen und nie in r1', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)' });
    await anm.dateiAnsehen('lang.txt');
    await anm.bereichAnnotieren('lang.txt', 3, 7, 'bleibt');

    await anm.commitAnsehen('r1');
    await anm.dateiAnsehen('lang.txt');
    await anm.keineAnmerkungUnter({ neu: 7 });
    await anm.hinweisAusserhalb('1 Anmerkung an Zeilen, die diese Ansicht nicht zeigen: Commit ' + anm.hash('r2').slice(0, 7) + ', Zeilen 3–7');

    await anm.commitAnsehen('r2');
    await anm.dateiAnsehen('lang.txt');
    await anm.bereichAnmerkungenUnter('lang.txt', 7, 3, 7, ['bleibt']);

    await anm.neuLaden();
    await anm.dateiAnsehen('lang.txt');
    await anm.bereichAnmerkungenUnter('lang.txt', 7, 3, 7, ['bleibt']);
  });
});

test.describe('Fremder Text bleibt Text (Szenario 9)', () => {
  test('soll die markierten fremden Zeilen und den Anmerkungstext als Text zeigen, das Richtungszeichen als Marke', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)', commits: ['r1'] });
    await anm.dateiAnsehen('fremd.txt');

    await anm.bereichAnnotieren('fremd.txt', 1, 2, '<img src=x onerror=alert(1)>');
    await anm.neuLaden();
    await anm.dateiAnsehen('fremd.txt');
    await anm.fremderTextBleibtText();
    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain('## 1. fremd.txt:1-2\n');
    expect(ergebnis).toContain('    1: <b>z20</b>\n    2: a⟨U+202E⟩b\n');
    expect(ergebnis).toContain('> <img src=x onerror=alert(1)>');
  });
});
