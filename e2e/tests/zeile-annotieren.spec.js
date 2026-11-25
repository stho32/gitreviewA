'use strict';
// Spezifikation R00010 „Zeile annotieren“, Teil Browser: der durchgehende Hot-Path-Fall (Kriterium 1, Teil Dateiwechsel und Neuladen von
// Kriterium 3) und Browser-Eigenes — Hinweis, Darstellung, Tastatur und Fokus, Fehlerpfade per `route`, verzögerte Antwort, DOM-Sicherheit,
// Lastprofil. Was angelegt, abgelehnt und ausgegeben wird, prüft tests/GitReviewA.Tests/Akzeptanz/ZeileAnnotierenTests.cs, die Rechnung
// Zeile → Stelle und Anmerkungsstand tests/bausteine/anmerkungen-werte.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const ENTFERNT = 'Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei';
const UEBERSCHRIFT = '# Ergebnis manueller Review';
const Z19 = { neu: 18 };
/** In `p` ist lang.txt neu: Zeile 18 ist dort `z18`. */
const LANG_IN_P = {
  pfad: 'lang.txt',
  zeilen: [{ kopf: '@@ -0,0 +1,20 @@' }, ...Array.from({ length: 20 }, (_, index) => ({ plus: `z${String(index + 1).padStart(2, '0')}`, neu: index + 1 }))],
};

test.describe('Zeile annotieren', () => {
  test('Hot Path: Zeile z19 annotieren, Datei und Commit wechseln, neu laden, Beenden — lang.txt:18 auf stdout, Exit 0', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');

    await anm.annotieren('lang.txt', 18, 'Klammer fehlt');

    await anm.anmerkungenUnter('lang.txt', Z19, ['Klammer fehlt']);
    await anm.keineAnmerkungUnter({ alt: 18 });
    await anm.anmerkungszeilenSindKeineDiffzeilen();
    await anm.dateiAnsehen('src/b.txt');
    await anm.anzahlAnmerkungszeilen(0);
    await anm.dateiAnsehen('lang.txt');
    await anm.anmerkungenUnter('lang.txt', Z19, ['Klammer fehlt']);
    await anm.commitAnsehen('p');
    await anm.dateiAnsehen('lang.txt');
    await anm.diffZeigt(LANG_IN_P);
    await anm.anzahlAnmerkungszeilen(0);
    await anm.commitAnsehen('q');
    await anm.dateiAnsehen('lang.txt');
    await anm.anmerkungenUnter('lang.txt', Z19, ['Klammer fehlt']);
    await anm.neuLaden();
    await anm.dateiAnsehen('lang.txt');
    await anm.anmerkungenUnter('lang.txt', Z19, ['Klammer fehlt']);
    await anm.anzahlAnmerkungszeilen(1);
    expect(anm.stdoutBisher()).toBe('');
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toBe([UEBERSCHRIFT, '', 'Anmerkungen: 1', '', '## 1. lang.txt:18', '', `Commit: ${anm.hash('q')}`, '', '> Klammer fehlt', ''].join('\n'));
  });

  test('entfernte Zeile öffnet kein Feld und zeigt den Hinweis, Kopf und Hinweiszeile tun nichts — in beiden Ansichten', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('src/b.txt');

    await anm.zeileAnklicken({ alt: 2 });
    await anm.hinweisEntfernt(ENTFERNT);
    await anm.keinFeld();
    await anm.zeileAnklicken({ neu: 1 });
    await anm.keinHinweisEntfernt();
    await anm.feldOffenMitFokus('src/b.txt', 1);
    await anm.taste('Escape');
    await anm.zeileAnklicken('kopf');
    await anm.keinFeld();
    await anm.keinHinweisEntfernt();
    await anm.ansichtWaehlen('ganze Datei');
    await anm.diffZeigt({ pfad: 'src/b.txt', zeilen: [{ kontext: 'eins', alt: 1, neu: 1 }, { minus: 'zwei', alt: 2 }, { plus: 'ZWEI', neu: 2 }, { plus: 'drei', neu: 3 }] });
    await anm.zeileAnklicken({ alt: 2 });
    await anm.hinweisEntfernt(ENTFERNT);
    await anm.keinFeld();
    await anm.dateiAnsehen('ende.txt');
    await anm.keinHinweisEntfernt();
    await anm.zeileAnklicken('hinweis');
    await anm.keinFeld();
    await anm.keinHinweisEntfernt();
    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toBe(`${UEBERSCHRIFT}\n\nKeine Anmerkungen.\n`);
  });

  test('Anmerkung an Zeile 10 erscheint in „nur Änderungen“ als Hinweis, in „ganze Datei“ unter z10, zwei an einer Zeile untereinander', async ({ anm }) => {
    await anm.starten({ seiteOeffnen: false });
    await anm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 10, 'außerhalb');
    await anm.seiteOeffnen();
    await anm.dateiAnsehen('lang.txt');

    await anm.hinweisAusserhalb('1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10');
    await anm.anzahlAnmerkungszeilen(0);
    await anm.ansichtWaehlen('ganze Datei');
    await anm.anmerkungenUnter('lang.txt', { neu: 10 }, ['außerhalb']);
    await anm.keinHinweisAusserhalb();
    await anm.annotieren('lang.txt', 10, 'Zweite');
    await anm.anmerkungenUnter('lang.txt', { neu: 10 }, ['außerhalb', 'Zweite']);
    await anm.ansichtWaehlen('nur Änderungen');
    await anm.hinweisAusserhalb('2 Anmerkungen an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10');
  });

  test('nur mit der Tastatur: Tab, Pfeil ab, Enter, Strg+Enter speichert, Esc bricht ab — Fokus kehrt auf z19 zurück', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.keineAnmerkungUnter(Z19);

    await anm.inDenDiffTabben();
    await anm.pfeilAbBis(18);
    await anm.taste('Enter');
    await anm.feldOffenMitFokus('lang.txt', 18);
    await anm.textSchreiben('lang.txt', 18, 'per Tastatur');
    await anm.taste('Control+Enter');
    await anm.feldZu('lang.txt', 18);
    await anm.anmerkungenUnter('lang.txt', Z19, ['per Tastatur']);
    await anm.fokusAufZeile(Z19);
    await anm.taste('Enter');
    await anm.feldOffenMitFokus('lang.txt', 18);
    await anm.taste('Escape');

    await anm.feldZu('lang.txt', 18);
    await anm.fokusAufZeile(Z19);
    await anm.anmerkungenUnter('lang.txt', Z19, ['per Tastatur']);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('Anmerkungen: 1\n');
  });

  test('abgelehnter Text und Serverfehler: Meldung im Feld, Feld offen, Text bleibt; gekürzt gespeichert entsteht genau eine Anmerkung', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.zeileAnklicken(Z19);
    const zuLang = 'x'.repeat(10001);
    const mitEscape = `Klammer ${String.fromCharCode(0x1B)}[2J fehlt`;

    await anm.textSchreiben('lang.txt', 18, zuLang);
    await anm.speichern('lang.txt', 18);
    await anm.feldMeldet('lang.txt', 18, 'Text ist länger als 10000 Zeichen', zuLang);
    await anm.textSchreiben('lang.txt', 18, '   ');
    await anm.speichern('lang.txt', 18);
    await anm.feldMeldet('lang.txt', 18, 'Text fehlt', '   ');
    await anm.textSchreiben('lang.txt', 18, mitEscape);
    await anm.speichern('lang.txt', 18);
    await anm.feldMeldet('lang.txt', 18, 'Text enthält Steuer- oder Richtungszeichen', mitEscape);
    await anm.textSchreiben('lang.txt', 18, zuLang);
    await anm.serverAntwortetBeimAnlegen({ status: 500, meldung: 'intern' });
    await anm.speichern('lang.txt', 18);
    await anm.feldMeldet('lang.txt', 18, 'Anmerkung konnte nicht gespeichert werden', zuLang);
    await anm.serverAntwortetBeimAnlegen('netz');
    await anm.speichern('lang.txt', 18);
    await anm.feldMeldet('lang.txt', 18, 'Anmerkung konnte nicht gespeichert werden', zuLang);
    await anm.anzahlAnmerkungszeilen(0);
    await anm.textSchreiben('lang.txt', 18, zuLang.slice(0, 10000));
    await anm.speichern('lang.txt', 18);

    await anm.feldZu('lang.txt', 18);
    await anm.anmerkungenUnter('lang.txt', Z19, ['x'.repeat(10000)]);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('Anmerkungen: 1\n');
  });

  test('verzögerte Antwort: zweimal Speichern und Dateiwechsel ergeben genau eine Anmerkung, sie steht nach der Rückkehr unter z19', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.zeileAnklicken(Z19);
    await anm.textSchreiben('lang.txt', 18, 'Klammer fehlt');
    const anlegen = await anm.anlegenVerzoegern();

    await anm.zweimalSpeichern('lang.txt', 18);
    await anm.dateiAnsehen('src/b.txt');
    await anlegen.eingetroffen();
    await anm.anzahlAnmerkungszeilen(0);
    await anm.dateiAnsehen('lang.txt');

    await anm.anmerkungenUnter('lang.txt', Z19, ['Klammer fehlt']);
    await anm.anzahlAnmerkungszeilen(1);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('Anmerkungen: 1\n');
    expect(ergebnis).toContain('## 1. lang.txt:18\n');
  });

  test('fremder Text bleibt Text: HTML und Markdown in Anmerkung und Dateiname erscheinen als Zeichen, kein Dialog, stdout zitiert unverändert', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo X' });
    await anm.dateiAnsehen('<b>x</b>.txt');
    const text = '<img src=x onerror=alert(1)>\n<b>fett</b>\n**fett**';

    await anm.zeileAnklicken({ neu: 1 });
    await anm.feldOffenMitFokus('<b>x</b>.txt', 1);
    await anm.textSchreiben('<b>x</b>.txt', 1, text);
    await anm.speichern('<b>x</b>.txt', 1);
    await anm.feldZu('<b>x</b>.txt', 1);
    await anm.neuLaden();
    await anm.dateiAnsehen('<b>x</b>.txt');

    await anm.anmerkungenUnter('<b>x</b>.txt', { neu: 1 }, [text]);
    expect(await anm.sichtbarerAnmerkungstext()).toBe(text);
    await anm.fremderTextBleibtText();
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('## 1. <b>x</b>.txt:1\n');
    expect(ergebnis).toContain('> <img src=x onerror=alert(1)>\n> <b>fett</b>\n> **fett**\n');
  });

  test('Klicks auf dieselbe Zeile: zweimal, doppelt auf den Text und doppelt auf die Nummer öffnen genau ein Feld mit Fokus, ein Feld an anderer Zeile bleibt', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.zeileAnklicken({ neu: 1 });
    await anm.textSchreiben('lang.txt', 1, 'bleibt stehen');

    await anm.zeileAnklicken(Z19);
    await anm.zeileAnklicken(Z19);
    await anm.zeileDoppeltAnklicken(Z19, 'text');
    await anm.zeileDoppeltAnklicken(Z19, 'nummer');

    await anm.anzahlFelder('lang.txt', 18, 1);
    await anm.feldOffenMitFokus('lang.txt', 18);
    await anm.anzahlFelder('lang.txt', 1, 1);
    await anm.feldEnthaelt('lang.txt', 1, 'bleibt stehen');
    await anm.textSchreiben('lang.txt', 18, 'einmal');
    await anm.speichern('lang.txt', 18);
    await anm.feldZu('lang.txt', 18);
    await anm.zeileAnklicken(Z19);
    await anm.anzahlFelder('lang.txt', 18, 1);
    await anm.feldOffenMitFokus('lang.txt', 18);
    await anm.anmerkungenUnter('lang.txt', Z19, ['einmal']);
  });

  test('Dateiname mit U+202E: in der Oberfläche annotiert, auf stdout steht die Marke statt des Zeichens', async ({ anm }) => {
    const sichtbarerName = 'a⟨U+202E⟩b.txt';
    await anm.starten({ vorbereitung: 'Repo B' });
    await anm.dateiAnsehen(sichtbarerName);

    await anm.annotieren(sichtbarerName, 1, 'Name prüfen');
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis.split('\n').filter(zeile => zeile.startsWith('## '))).toEqual([`## 1. ${sichtbarerName}:1`]);
    expect(ergebnis).not.toContain('\u202E');
  });

  test('Lastprofil: 500 Anmerkungen an gross.txt mit 20 000 Zeilen stehen binnen 1 s nach dem Klick, danach bleibt die Seite bedienbar', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo U', seiteOeffnen: false });
    const text = 'a'.repeat(200);
    for (let zeile = 1; zeile <= 500; zeile += 1) {
      await anm.ueberDieSchnittstelleAnlegen('u', 'gross.txt', zeile, text);
    }
    await anm.seiteOeffnen();

    await anm.aufgabenSammeln();
    const dauerMs = await anm.anmerkungenRechtzeitigNachKlick('gross.txt', { letzteNeu: 20000, anmerkungNeu: 500, anzahl: 500 });

    test.info().annotations.push({ type: 'Messwert', description: `500 Anmerkungen an 20 000 Zeilen: ${dauerMs} ms` });
    const { aufgaben, klickMs, ergebnis } = await anm.bedienbarNachDerAnzeige();
    test.info().annotations.push({ type: 'Bedienbarkeit nach der Anzeige', description: `„Beenden“ geklickt nach ${klickMs} ms, Aufgaben über 150 ms: ${aufgaben.length}` });
    expect(ergebnis).toContain('Anmerkungen: 500\n');
  });

  test('Protokoll: mit --verbose steht der Text weder auf stdout noch auf stderr, die Debug-Zeile nennt Nummer und Textlänge', async ({ anm }) => {
    await anm.starten({ verbose: true, seiteOeffnen: false });

    await anm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'GEHEIMWORT eins');

    expect(anm.stdoutBisher()).toBe('');
    await expect.poll(() => anm.stderrBisher()).toContain('Nummer 1 angelegt (Textlänge 15)');
    expect(anm.stderrBisher()).not.toContain('GEHEIMWORT');
  });
});
