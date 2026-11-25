'use strict';
// Spezifikation R00022 „Datei annotieren“, Teil Anzeige (B2102): die Dateianmerkungen der gezeigten Stelle stehen über den Diff-Zeilen,
// je mit Anmerkungskopf und Text als Text, in beiden Ansichten und beiden Modi. Was angelegt, abgelehnt und ausgegeben wird, prüft
// tests/GitReviewA.Tests/Akzeptanz/DateiAnnotierenTests.cs; die Rechnung tests/bausteine/anmerkungen-werte.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

test.describe('Datei annotieren — Anzeige über den Diff-Zeilen', () => {
  test('eine Dateianmerkung in „Zusammen“ steht über den Zeilen, in beiden Ansichten', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen', seiteOeffnen: false });
    await anm.dateianmerkungUeberDieSchnittstelleAnlegen('q', 'lang.txt', 'Abschnitt fehlt');
    await anm.seiteOeffnen();
    await anm.dateiAnsehen('lang.txt');

    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
    await anm.dateianmerkungUeberDenZeilen();
    await anm.anzahlAnmerkungszeilen(1);
    await anm.ansichtWaehlen('ganze Datei');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
    await anm.ansichtWaehlen('nur Änderungen');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('## 1. lang.txt (ganze Datei)\n');
  });

  test('zwei Dateianmerkungen in Anlegereihenfolge über den Zeilen, die Zeilenanmerkung unter z19 (Kriterium 2)', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen', seiteOeffnen: false });
    await anm.dateianmerkungUeberDieSchnittstelleAnlegen('q', 'lang.txt', 'erste');
    await anm.dateianmerkungUeberDieSchnittstelleAnlegen('q', 'lang.txt', 'zweite');
    await anm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'Zeile');
    await anm.seiteOeffnen();
    await anm.dateiAnsehen('lang.txt');

    await anm.dateianmerkungenOben([
      { text: 'erste', stelle: 'lang.txt (ganze Datei)' },
      { text: 'zweite', stelle: 'lang.txt (ganze Datei)' },
    ]);
    await anm.anmerkungenUnter('lang.txt', { neu: 18 }, ['Zeile']);

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    const ueberschriften = ergebnis.split('\n').filter(zeile => zeile.startsWith('## '));
    expect(ueberschriften).toEqual(['## 1. lang.txt (ganze Datei)', '## 2. lang.txt (ganze Datei)', '## 3. lang.txt:18']);
  });

  test('keine Dateianmerkung — die Anzeige bleibt leer, das Ergebnis wie R00002', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');

    await anm.keineDateianmerkung();

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toBe('# Ergebnis manueller Review\n\nKeine Anmerkungen.\n');
  });
});

test.describe('Datei annotieren — Bedienweg und Browser-Eigenes', () => {
  test('Bedienweg (Kriterium 1): „Datei anmerken“, Text, Speichern — Anmerkung über den Zeilen, Ergebnis auf stdout, Exit 0', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiKnopfSichtbar();

    await anm.dateiAnmerken();
    await anm.dateiFeldOffenMitFokus('lang.txt');
    await anm.dateiFeldTextSchreiben('lang.txt', 'Abschnitt fehlt');
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldZu('lang.txt');

    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
    await anm.dateianmerkungUeberDenZeilen();
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toBe(['# Ergebnis manueller Review', '', 'Anmerkungen: 1', '', '## 1. lang.txt (ganze Datei)', '', `Commit: ${anm.hash('q')}`, '', '> Abschnitt fehlt', ''].join('\n'));
  });

  test('Abbrechen und Esc schließen das Feld ohne Wirkung', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');

    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('lang.txt', 'verworfen');
    await anm.dateiAbbrechen('lang.txt');
    await anm.dateiFeldZu('lang.txt');
    await anm.keineDateianmerkung();

    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('lang.txt', 'auch verworfen');
    await anm.taste('Escape');
    await anm.dateiFeldZu('lang.txt');
    await anm.keineDateianmerkung();

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toBe('# Ergebnis manueller Review\n\nKeine Anmerkungen.\n');
  });

  test('abgelehnter Text und Serverfehler: Meldung im Feld, Feld offen, Text bleibt (Kriterium 8)', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiAnmerken();
    const zuLang = 'x'.repeat(10001);
    const mitEscape = `Klammer ${String.fromCharCode(0x1B)}[2J`;

    await anm.dateiFeldTextSchreiben('lang.txt', zuLang);
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldMeldet('lang.txt', 'Text ist länger als 10000 Zeichen', zuLang);
    await anm.dateiFeldTextSchreiben('lang.txt', '   ');
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldMeldet('lang.txt', 'Text fehlt', '   ');
    await anm.dateiFeldTextSchreiben('lang.txt', mitEscape);
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldMeldet('lang.txt', 'Text enthält Steuer- oder Richtungszeichen', mitEscape);
    await anm.dateiFeldTextSchreiben('lang.txt', 'bleibt');
    await anm.serverAntwortetBeimAnlegen({ status: 500, meldung: 'intern' });
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldMeldet('lang.txt', 'Anmerkung konnte nicht gespeichert werden', 'bleibt');
    await anm.serverAntwortetBeimAnlegen('netz');
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldMeldet('lang.txt', 'Anmerkung konnte nicht gespeichert werden', 'bleibt');
    await anm.serverAntwortetBeimAnlegen({ status: 409, meldung: 'Review ist beendet — keine Anmerkung mehr möglich' });
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldMeldet('lang.txt', 'Review ist beendet — keine Anmerkung mehr möglich', 'bleibt');
    await anm.keineDateianmerkung();

    await anm.dateiFeldTextSchreiben('lang.txt', 'Abschnitt fehlt');
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldZu('lang.txt');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
  });

  test('verzögerte Antwort: zweimal Speichern ergibt genau eine Anmerkung, sie steht nach Dateiwechsel und zurück richtig (Kriterium 8)', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('lang.txt', 'Abschnitt fehlt');
    const anlegen = await anm.anlegenVerzoegern();

    await anm.dateiZweimalSpeichern('lang.txt');
    await anm.dateiSpeichernIstGesperrt('lang.txt');
    await anm.dateiAnsehen('src/b.txt');
    await anlegen.eingetroffen();
    await anm.anzahlDateianmerkungen(0);
    await anm.dateiAnsehen('lang.txt');

    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
    await anm.anzahlDateianmerkungen(1);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('Anmerkungen: 1\n');
    expect(ergebnis).toContain('## 1. lang.txt (ganze Datei)\n');
  });

  test('bleibt an ihrer Datei über Datei- und Commitwechsel und Neuladen (Kriterium 3)', async ({ anm }) => {
    await anm.starten({ modus: 'einzeln' });
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('lang.txt', 'Abschnitt fehlt');
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldZu('lang.txt');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);

    await anm.dateiAnsehen('src/b.txt');
    await anm.anzahlDateianmerkungen(0);
    await anm.dateiAnsehen('lang.txt');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);

    await anm.commitAnsehen('p');
    await anm.dateiAnsehen('lang.txt');
    await anm.anzahlDateianmerkungen(0);
    await anm.commitAnsehen('q');
    await anm.dateiAnsehen('lang.txt');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);

    await anm.neuLaden();
    await anm.dateiAnsehen('lang.txt');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
  });

  test('Ändern und Löschen über den Anmerkungskopf (Kriterium 4)', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('lang.txt', 'alt');
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldZu('lang.txt');
    await anm.kopfNenntNummer(1);

    await anm.aendern(1);
    await anm.aenderungsfeldTextSchreiben(1, 'neu');
    await anm.aenderungsfeldSpeichern(1);
    await anm.anmerkungszeileEnthaelt(1, 'neu');
    await anm.dateianmerkungenOben([{ text: 'neu', stelle: 'lang.txt (ganze Datei)' }]);

    await anm.loeschen(1);
    await anm.keineDateianmerkung();
    await anm.keineAnmerkungszeile(1);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toBe('# Ergebnis manueller Review\n\nKeine Anmerkungen.\n');
  });

  test('fremder Text bleibt Text: Name mit Marken, HTML als sichtbarer Text, stdout unverändert (Kriterium 9)', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo I', modus: 'zusammen' });
    const name = 'a⟨U+202E⟩b⟨U+200B⟩c⟨U+E0041⟩d.txt';
    const text = '<img src=x onerror=alert(1)>';
    await anm.dateiAnsehen(name);

    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben(name, text);
    await anm.dateiFeldSpeichern(name);
    await anm.dateiFeldZu(name);

    await anm.dateianmerkungenOben([{ text, stelle: `${name} (ganze Datei)` }]);
    await anm.dateianmerkungUeberDenZeilen();
    expect(await anm.sichtbarerAnmerkungstext()).toBe(text);
    await anm.fremderTextBleibtText();
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toContain(`## 1. ${name} (ganze Datei)\n`);
    expect(ergebnis).toContain(`> ${text}\n`);
    expect(ergebnis).not.toContain('\u202E');
  });

  test('zweiter Einstieg: „Datei anmerken“ am Hinweis der entfernten Zeile öffnet dasselbe Feld (B2103)', async ({ anm }) => {
    await anm.starten({ modus: 'einzeln' });
    await anm.dateiAnsehen('src/b.txt');
    await anm.hinweisAnmerkenVerborgen();

    await anm.zeileAnklicken({ alt: 2 });
    await anm.hinweisEntfernt('Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei');
    await anm.hinweisAnmerkenSichtbar();
    await anm.dateiAnmerkenAmHinweis();
    await anm.dateiFeldOffenMitFokus('src/b.txt');
    await anm.dateiFeldTextSchreiben('src/b.txt', 'ganze Datei prüfen');
    await anm.dateiFeldSpeichern('src/b.txt');
    await anm.dateiFeldZu('src/b.txt');

    await anm.dateianmerkungenOben([{ text: 'ganze Datei prüfen', stelle: 'src/b.txt (ganze Datei)' }]);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('## 1. src/b.txt (ganze Datei)\n');
  });

  test('der Knopf „Datei anmerken“ erscheint erst mit dem gezeichneten Diff', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });

    await anm.dateiKnopfVerborgen();
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiKnopfSichtbar();
  });

  test('Befund B1: im Zustand „Keine Zeilenänderungen“ ist „Datei anmerken“ sichtbar, bedienbar und trägt (R00022)', async ({ anm }) => {
    await anm.starten({ modus: 'einzeln' });

    await anm.dateiAnsehen('LIESMICH.md ← README.md');
    await anm.diffMeldet('LIESMICH.md ← README.md', 'Keine Zeilenänderungen');
    await anm.dateiKnopfSichtbar();
    await anm.dateiKnopfBedienbar();

    await anm.dateiAnmerken();
    await anm.dateiFeldOffenMitFokus('LIESMICH.md');
    await anm.dateiFeldTextSchreiben('LIESMICH.md', 'Datei als Ganzes');
    await anm.dateiFeldSpeichern('LIESMICH.md');
    await anm.dateiFeldZu('LIESMICH.md');
    await anm.dateianmerkungenOben([{ text: 'Datei als Ganzes', stelle: 'LIESMICH.md (ganze Datei)' }]);

    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(exitCode).toBe(0);
    expect(ergebnis).toContain('## 1. LIESMICH.md (ganze Datei)\n');
  });

  test('Befund B1: „Datei anmerken“ steht auch bei Binärdatei und nach einem Diff-Lesefehler (R00022)', async ({ anm }) => {
    await anm.starten({ modus: 'einzeln' });

    await anm.dateiAnsehen('logo.bin');
    await anm.diffBinaer('logo.bin', 'enthält Null-Bytes');
    await anm.dateiKnopfSichtbar();
    await anm.dateiKnopfBedienbar();
    await anm.dateiAnmerken();
    await anm.dateiFeldOffenMitFokus('logo.bin');
    await anm.dateiAbbrechen('logo.bin');

    await anm.diffAntwortScheitert('src/b.txt', 500);
    await anm.dateiAnsehen('src/b.txt');
    await anm.diffMeldet('src/b.txt', 'Diff konnte nicht gelesen werden');
    await anm.dateiKnopfSichtbar();
    await anm.dateiKnopfBedienbar();
    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('src/b.txt', 'trotz Lesefehler');
    await anm.dateiFeldSpeichern('src/b.txt');
    await anm.dateiFeldZu('src/b.txt');

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('## 1. src/b.txt (ganze Datei)\n');
  });

  test('Befund B2: das offene „Datei anmerken“-Feld behält seine Eingabe beim Neuzeichnen (R00022)', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiAnmerken();
    await anm.dateiFeldTextSchreiben('lang.txt', 'getippt-bleibt');

    // Eine Zeilenanmerkung speichern zeichnet die Anmerkungen neu (GET /api/anmerkungen, `diff-gezeichnet`).
    await anm.annotieren('lang.txt', 18, 'eine Zeilennotiz');

    await anm.dateiFeldEnthaelt('lang.txt', 'getippt-bleibt');
    await anm.dateianmerkungenOben([]);
    await anm.anmerkungenUnter('lang.txt', { neu: 18 }, ['eine Zeilennotiz']);
  });

  test('an einer gesperrten Stelle ist „Datei anmerken“ nicht bedienbar und nennt den Grund (PO zu R00022 Frage 3)', async ({ anm }) => {
    await anm.starten({ modus: 'einzeln', seiteOeffnen: false });
    await anm.hakenAntwortetMit({
      stellen: [{ commit: anm.hash('q'), datei: 'lang.txt', abgehakt: false, sperrgrund: 'Diff nicht lesbar: Name nicht eindeutig' }],
      abgehakt: 0,
      gesamt: 1,
    });
    await anm.seiteOeffnen();

    await anm.dateiAnsehen('src/b.txt');
    await anm.dateiKnopfBedienbar();
    await anm.dateiAnsehen('lang.txt');
    await anm.dateiKnopfGesperrt('Diff nicht lesbar: Name nicht eindeutig');
  });
});
