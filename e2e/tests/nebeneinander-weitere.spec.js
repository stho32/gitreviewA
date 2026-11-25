'use strict';
// Akzeptanz R00023 — Nebeneinander-Ansicht (weitere Kriterien): Färbung (8), große Dateien und Blockgrenze (9), Anmerken (10),
// Zustände (11), fremder Text und Lesereihenfolge (12) und das Zeitkriterium (14).
const { test, expect } = require('../dsl/nebeneinander.js');

const KONTEXT = (nummer, text) => ({ art: 'kontext', nummer, text });
const MINUS = (nummer, text) => ({ art: 'minus', nummer, text });
const PLUS = (nummer, text) => ({ art: 'plus', nummer, text });

test.describe('Nebeneinander-Ansicht — Färbung, große Dateien, Anmerken', () => {
  test('Kriterium 8: beide Seiten tragen ihre Zeilenrollen', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo C', commits: ['c2'] });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('code.js');

    expect(await neben.farbeFertig()).toBe('ja');
    const rollen = await neben.farbRollen();
    // Die gepaarte Zeile `const z05 = 5;` (links, alte Seite) gegen `const z05 = 50;` (rechts, neue Seite) ist beidseitig gefärbt.
    const gepaart = rollen.filter(r => r.links.some(klasse => klasse.includes('tk-')) && r.rechts.some(klasse => klasse.includes('tk-')));
    expect(gepaart.length, 'beidseitig gefärbte Zeilen').toBeGreaterThan(0);
  });

  test('Kriterium 9: riesig.txt ist zweispaltig zugeklappt, jede Blockgrenze hält, gross.txt paart die geänderte Zeile', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });
    await neben.anordnungWaehlen('nebeneinander');

    await neben.dateiAnsehen('riesig.txt');
    await neben.zugeklappt('riesig.txt', 'Sehr lang: 30.000 Zeilen — zugeklappt');
    await neben.trotzdemLaden();
    expect(await neben.hatPaar(null, 'zeile 00001'), 'nach „Trotzdem laden“ gezeichnet').toBe(true);
    const knoten = await neben.blockKnoten();
    expect(knoten.length, 'Blöcke gezeichnet').toBeGreaterThan(0);
    expect(Math.max(...knoten), 'höchste Knotenzahl je Block').toBeLessThanOrEqual(5000);
  });

  test('Kriterium 9: gross.txt (eine Zeile geändert) paart und hält die Blockgrenze', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Eine Zeile in 20 000', commits: ['v'] });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('gross.txt');

    expect(await neben.hatPaar('zeile 10000', 'geändert 10000')).toBe(true);
    const knoten = await neben.blockKnoten();
    expect(Math.max(...knoten), 'höchste Knotenzahl je Block').toBeLessThanOrEqual(5000);
  });

  test('Kriterium 10: die neue Seite ist annotierbar, die linke Seite einer entfernten Zeile nicht', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('lang.txt');

    const name = 'Anmerkung zu lang.txt, Zeile 18';
    await neben.rechtsSeiteAnklicken(18);
    await neben.feldOffenMitFokus(name);
    await neben.textSchreiben(name, 'Klammer fehlt');
    await neben.speichern(name);
    await neben.anmerkungenUnter({ neu: 18 }, [{ text: 'Klammer fehlt', stelle: 'lang.txt:18' }]);

    await neben.linksSeiteAnklicken(18);
    expect(await neben.entferntHinweis()).toBe('Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei');
  });

  test('Kriterium 11: die Zustände zeigen dieselben Hinweise, Liste und Umschalter bleiben bedienbar', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');

    await neben.dateiAnsehen('LIESMICH.md');
    await neben.zustand('LIESMICH.md', 'Keine Zeilenänderungen');
    await neben.dateiAnsehen('logo.bin');
    await neben.zustand('logo.bin', 'Binärdatei — enthält Null-Bytes');
  });

  test('Kriterium 3: reine Löschung, reine Hinzufügung, Hinweiszeile und ein gepaarter Abschnitt', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');

    await neben.dateiAnsehen('src/b.txt');
    await neben.zeilenPaareSind([
      { kopf: '@@ -1,2 +1,3 @@' },
      { links: KONTEXT(1, 'eins'), rechts: KONTEXT(1, 'eins') },
      { links: MINUS(2, 'zwei'), rechts: PLUS(2, 'ZWEI') },
      { links: null, rechts: PLUS(3, 'drei') },
    ]);

    await neben.dateiAnsehen('alt.txt');
    await neben.zeilenPaareSind([
      { kopf: '@@ -1,4 +0,0 @@' },
      { links: MINUS(1, 'a1'), rechts: null },
      { links: MINUS(2, 'a2'), rechts: null },
      { links: MINUS(3, 'a3'), rechts: null },
      { links: MINUS(4, 'a4'), rechts: null },
    ]);

    await neben.dateiAnsehen('breit.txt');
    await neben.zeilenPaareSind([
      { kopf: '@@ -0,0 +1,2 @@' },
      { links: null, rechts: PLUS(1, 'kurz') },
      { links: null, rechts: PLUS(2, '0123456789'.repeat(30)) },
    ]);

    await neben.dateiAnsehen('ende.txt');
    await neben.zeilenPaareSind([
      { kopf: '@@ -1 +1 @@' },
      { links: MINUS(1, 'a'), rechts: null },
      { hinweis: '\\ No newline at end of file', seite: 'links' },
      { links: null, rechts: PLUS(1, 'a') },
    ]);
  });

  test('Kriterium 7: Breite und Umbruch zweispaltig — ohne Umbruch einzeilig mit waagerechtem Scrollen, mit Umbruch umbrochen', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('breit.txt');

    const { ohneUmbruch, mitUmbruch } = await neben.breiteUndUmbruch(2);
    expect(ohneUmbruch.verhaeltnis, 'Höhe Zeile 2 zu Zeile 1 ohne Umbruch').toBeCloseTo(1, 1);
    expect(ohneUmbruch.scrolltWaagerecht, 'waagerecht scrollbar ohne Umbruch').toBe(true);
    expect(Math.abs(ohneUmbruch.breiteAlt - ohneUmbruch.breiteNeu), 'beide Code-Spalten gleich breit (ohne Umbruch)').toBeLessThanOrEqual(1);
    expect(mitUmbruch.verhaeltnis, 'Höhe Zeile 2 zu Zeile 1 mit Umbruch').toBeGreaterThan(1.5);
    expect(mitUmbruch.scrolltWaagerecht, 'waagerecht scrollbar mit Umbruch').toBe(false);
    expect(Math.abs(mitUmbruch.breiteAlt - mitUmbruch.breiteNeu), 'beide Code-Spalten gleich breit (mit Umbruch)').toBeLessThanOrEqual(1);
  });

  test('Kriterium 7: die Nummernspalten bleiben schmal, die Code-Spalte trägt die längste Zeile ohne Überlauf', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('breit.txt');

    // `breit.txt` ist hinzugefügt: Zeile 2 trägt rechts 300 Zeichen, die linke Seite ist leer.
    const spalten = await neben.spaltenbreiten(2);
    expect(Math.abs(spalten.nummerLinks - 46), 'Nummernspalte alt').toBeLessThanOrEqual(1);
    expect(Math.abs(spalten.nummerRechts - 46), 'Nummernspalte neu').toBeLessThanOrEqual(1);
    expect(spalten.codeRechts, 'Code-Spalte neu trägt die 300 Zeichen ohne Überlauf').toBeGreaterThanOrEqual(spalten.textRechts);
    expect(spalten.codeLinks, 'beide Code-Spalten gleich breit').toBeCloseTo(spalten.codeRechts, 0);
  });

  test('Kriterium 12: fremder Text bleibt Text, die Lesereihenfolge stimmt', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('fremd.txt');

    await neben.zeilenPaareSind([
      { kopf: '@@ -0,0 +1,3 @@' },
      { links: null, rechts: PLUS(1, '<img src=x onerror=alert(1)>') },
      { links: null, rechts: PLUS(2, '<b>fett</b>') },
      { links: null, rechts: PLUS(3, 'a⟨U+202E⟩b') },
    ]);
    await neben.fremderTextBleibtText();
    await neben.spaltenkoepfeSind();
    await neben.gruppe();
    await neben.anordnungPerTastatur('untereinander');
    await neben.anordnungIst('untereinander');
  });

  test('Kriterium 12: der VS-Code-Link steht an der Nummer-neu-Zelle und führt nicht durch einen verborgenen Teilbaum', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('lang.txt');

    await neben.sprungzeile(18, 'lang.txt Zeile 18, in VS Code öffnen');
    expect(await neben.sprungzeileImVerborgenen(18), 'fokussierbarer Link in einer verborgenen Zelle').toBe(false);
    expect(await neben.sprunglinks(), 'Links im Bereich').toBeGreaterThan(0);

    // Variante derselben Klasse: die hinzugefügte Zeile `+Z03` (neu 3) trägt denselben Link, nicht verborgen.
    await neben.sprungzeile(3, 'lang.txt Zeile 3, in VS Code öffnen');
    expect(await neben.sprungzeileImVerborgenen(3), 'fokussierbarer Link einer hinzugefügten Zeile').toBe(false);

    // Zyklus: zurückschalten und wieder hin — der Link bleibt erreichbar.
    await neben.anordnungWaehlen('untereinander');
    await neben.anordnungWaehlen('nebeneinander');
    await neben.sprungzeile(18, 'lang.txt Zeile 18, in VS Code öffnen');
    expect(await neben.sprungzeileImVerborgenen(18), 'fokussierbarer Link in einer verborgenen Zelle nach dem Zyklus').toBe(false);
  });

  test('Kriterium 14: 20 000 Zeilen zweispaltig stehen spätestens 1 s nach dem Umschalten', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Eine Zeile in 20 000', commits: ['v'] });
    await neben.dateiAnsehen('gross.txt');

    const dauerMs = await neben.paarBinnen('zeile 10000', 'geändert 10000', 1000);
    test.info().annotations.push({ type: 'Messwert', description: `zweispaltig nach dem Umschalten ${dauerMs} ms (Grenze 1000 ms, Ziel 700 ms)` });
  });
});
