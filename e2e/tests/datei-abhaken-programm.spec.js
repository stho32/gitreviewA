'use strict';
// Spezifikation R00011 „Datei abhaken“ am Programm als Prozess (ohne Browser): stdout und stderr getrennt aufgefangen, Statuscodes am echten
// Einstieg, Zählung der git-Aufrufe, Lastprofil beim Beenden. Die Kriterien selbst prüft tests/GitReviewA.Tests/Akzeptanz gegen den Interactor.
const { test, expect, NAME_MIT_ZEILENUMBRUCH } = require('../dsl/datei-abhaken.js');

const PQR = ['p', 'q', 'r'];
const OHNE_ABSCHNITT = '# Ergebnis manueller Review\n\nKeine Anmerkungen.\n';
const STEUER_ODER_RICHTUNG = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F؜​-‏‪-‮⁦-⁩﻿]/u;

test.describe('Datei abhaken — Programm', () => {
  test('soll beim Beenden den Abschnitt „Dateien“ Byte für Byte wie in der User Story schreiben und mit 0 enden (Kriterium 5)', async ({ programm }) => {
    await programm.starten({ commits: PQR, ohneSeite: true });
    await programm.ueberDieSchnittstelleAbhaken('p', 'README.md');
    await programm.ueberDieSchnittstelleAbhaken('q', 'src/b.txt');

    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    const p = programm.hash('p');
    const q = programm.hash('q');
    expect(exitCode).toBe(0);
    expect(programm.ergebnis()).toBe(`${OHNE_ABSCHNITT}\n## Dateien\n\nAbgehakt: 2 von 8\n\n- README.md (Commit ${p})\n- src/b.txt (Commit ${q})\n\nUngeprüft: 6 von 8\n\n`
      + `- alt.txt (Commit ${p})\n- src/a.txt (Commit ${p})\n- src/b.txt (Commit ${p})\n- LIESMICH.md (Commit ${q})\n- alt.txt (Commit ${q})\n- logo.bin (Commit ${q})\n`);
  });

  for (const fall of ['ohne Haken', 'mit gesetztem und entnommenem Haken']) {
    test(`soll ${fall} genau das Ergebnis aus R00002 schreiben (Kriterium 6)`, async ({ programm }) => {
      await programm.starten({ commits: PQR, ohneSeite: true });
      if (fall !== 'ohne Haken') {
        await programm.ueberDieSchnittstelleAbhaken('p', 'README.md', true);
        await programm.ueberDieSchnittstelleAbhaken('p', 'README.md', false);
      }

      await programm.beendenAnfordern();
      await programm.aufEnde();

      expect(programm.ergebnis()).toBe(OHNE_ABSCHNITT);
    });
  }

  test('soll einen Namen mit Zeilenumbruch und U+202E in Ergebnis und Protokoll nur mit Marken in einer Zeile schreiben (Kriterium 7)', async ({ programm }) => {
    await programm.starten({ vorbereitung: 'y', commits: ['y'], verbose: true, ohneSeite: true });
    const antwort = await programm.ueberDieSchnittstelleAbhaken('y', NAME_MIT_ZEILENUMBRUCH);

    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(antwort.status).toBe(200);
    expect(programm.ergebnis().split('\n')).toContain(`- ab⟨U+000A⟩cd⟨U+202E⟩.txt (Commit ${programm.hash('y')})`);
    expect(programm.ergebnis()).not.toMatch(STEUER_ODER_RICHTUNG);
    expect(programm.stderr()).not.toMatch(STEUER_ODER_RICHTUNG);
    const hakenzeilen = programm.stderr().split('\n').filter(zeile => zeile.includes('[Haken]') && zeile.includes('abgehakt: ja'));
    expect(hakenzeilen).toHaveLength(1);
    expect(hakenzeilen[0]).toContain(`Commit ${programm.kurz('y')} ab⟨U+000A⟩cd⟨U+202E⟩.txt abgehakt: ja`);
  });

  test('soll fremde Stellen mit 400, fremde Herkunft mit 403, falschen Inhaltstyp mit 415 und andere Methoden mit 405 abweisen, stdout leer (Kriterien 8 und 9)', async ({ programm }) => {
    const lauf = await programm.starten({ commits: PQR, ohneSeite: true });
    const p = programm.hash('p');
    const port = new URL(lauf.adresse).port;
    const gesendet = { commit: p, datei: 'alt.txt', abgehakt: true };
    const schnittstelle = require('../treiber/haken-schnittstelle.js');

    const fremdeStellen = [
      await programm.ueberDieSchnittstelleAbhaken('p', 'src/c.txt'),
      await programm.ueberDieSchnittstelleAbhaken('r', 'alt.txt'),
      await programm.ueberDieSchnittstelleAbhaken('p', ''),
      await programm.ueberDieSchnittstelleAbhaken('p', 'alt.txt\nREADME.md'),
      await schnittstelle.hakenSetzen(lauf.adresse, { ...gesendet, commit: p.slice(0, 7) }),
    ];
    const abgewiesen = [
      await schnittstelle.hakenSetzen(lauf.adresse, gesendet, { origin: 'http://evil.example' }),
      await schnittstelle.hakenSetzen(lauf.adresse, gesendet, { host: `localhost:${port}` }),
      await schnittstelle.hakenSetzen(lauf.adresse, gesendet, { inhaltstyp: null }),
      await schnittstelle.hakenSetzen(lauf.adresse, gesendet, { methode: 'PUT' }),
    ];
    const getMitAngaben = await programm.standLesen();

    expect(fremdeStellen.map(antwort => antwort.status)).toEqual([400, 400, 400, 400, 400]);
    expect(abgewiesen.map(antwort => antwort.status)).toEqual([403, 403, 415, 405]);
    expect((await programm.standLesen()).abgehakt).toBe(0);
    expect(getMitAngaben.status).toBe(200);
    expect(programm.ergebnis()).toBe('');
    await programm.laufGehtWeiter();
    const gueltig = await programm.ueberDieSchnittstelleAbhaken('p', 'alt.txt');
    expect([gueltig.status, gueltig.abgehakt, gueltig.gesamt]).toEqual([200, 1, 8]);
  });

  test('soll den Stand mit eigenem Host ohne CORS-Freigabe und mit fremdem Host mit 403 ohne Stellen beantworten (Kriterium 9)', async ({ programm }) => {
    const lauf = await programm.starten({ commits: PQR, ohneSeite: true });
    const port = new URL(lauf.adresse).port;

    const eigener = await programm.standLesen();
    const fremd = await programm.standLesen(`localhost:${port}`);
    const kopfzeilen = await new Promise((fertig, fehler) => {
      require('http').get(new URL('/api/haken', lauf.adresse), antwort => { antwort.resume(); fertig(antwort.headers); }).on('error', fehler);
    });

    expect(eigener.status).toBe(200);
    expect(eigener.gesamt).toBe(8);
    expect(Object.keys(kopfzeilen).filter(name => name.startsWith('access-control-'))).toEqual([]);
    expect(fremd.status).toBe(403);
    expect(fremd.text).not.toContain('README.md');
  });

  test('soll die Übersicht aus einem Unterordner mit genau einem git-Aufruf ohne Programme des Repos lesen und mit der Dateiliste übereinstimmen (Kriterium 14)', async ({ programm }) => {
    await programm.starten({ vorbereitung: 'fremde Konfiguration', commits: PQR, verbose: true, ohneSeite: true });

    const stand = await programm.standLesen();
    await programm.standLesen();

    expect(stand.status).toBe(200);
    await programm.gitAufrufe({ uebersicht: 1, log: 1 });
    expect(stand.stellen.map(stelle => stelle.datei)).toContain('ä ö.txt');
    for (const commit of PQR) {
      const ausDerUebersicht = stand.stellen.filter(stelle => stelle.commit === programm.hash(commit)).map(stelle => stelle.datei);
      expect(ausDerUebersicht, `Stellen von ${commit}`).toEqual(await programm.dateilistePfade(commit));
    }
    expect(programm.markerLief()).toBe(false);
  });

  test('soll mit 2 000 Stellen und 1 000 Haken höchstens 1 s nach der Anforderung mit je 1 000 Zeilen enden (Kriterium 15)', async ({ programm }) => {
    await programm.starten({ vorbereitung: 'g', commits: ['g'], ohneSeite: true });
    for (let nummer = 2; nummer <= 2000; nummer += 2) {
      const antwort = await programm.ueberDieSchnittstelleAbhaken('g', `viele/datei-${String(nummer).padStart(4, '0')}.txt`);
      expect(antwort.status).toBe(200);
    }

    const { dauerMs } = await programm.beendenUndDauerMessen();

    console.log(`Messwert Beenden mit 2000 Stellen und 1000 Haken: ${dauerMs.toFixed(0)} ms`);
    const zeilen = programm.ergebnis().split('\n');
    const ungeprueft = zeilen.indexOf('Ungeprüft: 1000 von 2000');
    expect(zeilen).toContain('Abgehakt: 1000 von 2000');
    expect(zeilen.slice(0, ungeprueft).filter(zeile => zeile.startsWith('- viele/'))).toHaveLength(1000);
    expect(zeilen.slice(ungeprueft).filter(zeile => zeile.startsWith('- viele/'))).toHaveLength(1000);
    expect(dauerMs).toBeLessThanOrEqual(1000);
  });
});
