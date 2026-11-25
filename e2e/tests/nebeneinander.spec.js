'use strict';
// Akzeptanz R00023 — Nebeneinander-Ansicht des Diffs: Paarung in zwei Spalten (Kriterien 1 und 2), Unabhängigkeit von Umfang und
// Wahl (Kriterien 5 und 6), Spaltenköpfe und Lesereihenfolge. Repo G wie in der Anforderung.
const { test, expect } = require('../dsl/nebeneinander.js');

const KONTEXT = (nummer, text) => ({ art: 'kontext', nummer, text });
const MINUS = (nummer, text) => ({ art: 'minus', nummer, text });
const PLUS = (nummer, text) => ({ art: 'plus', nummer, text });

/** Die Zeilenpaare von `g2` (g1..g2, t.txt): `eins`, Überhang rechts und die Kontextzeilen danach. Die Nummern neu zählen die
    hinzugefügte `Z` mit (`vier` steht neu in Zeile 5) — so gibt `git diff` die Zeilen aus. */
const PAARE_G2 = [
  { kopf: '@@ -1,6 +1,7 @@' },
  { links: KONTEXT(1, 'eins'), rechts: KONTEXT(1, 'eins') },
  { links: MINUS(2, 'zwei'), rechts: PLUS(2, 'X') },
  { links: MINUS(3, 'drei'), rechts: PLUS(3, 'Y') },
  { links: null, rechts: PLUS(4, 'Z') },
  { links: KONTEXT(4, 'vier'), rechts: KONTEXT(5, 'vier') },
  { links: KONTEXT(5, 'fünf'), rechts: KONTEXT(6, 'fünf') },
  { links: KONTEXT(6, 'sechs'), rechts: KONTEXT(7, 'sechs') },
];

test.describe('Nebeneinander-Ansicht', () => {
  test('Kriterium 1: Überhang rechts — die dritte hinzugefügte Zeile steht gegen eine leere linke Seite', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo G', commits: ['g2'] });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('t.txt');

    await neben.zeilenPaareSind(PAARE_G2);
    await neben.spaltenkoepfeSind();
    await neben.kontextEinmalGelesen();
  });

  test('Kriterium 2: ein entfernter Lauf ohne hinzugefügten steht links, rechts leer', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo G', commits: ['g3'] });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('t.txt');

    await neben.zeilenPaareSind([
      { kopf: '@@ -2,6 +2,5 @@ eins' },
      { links: KONTEXT(2, 'X'), rechts: KONTEXT(2, 'X') },
      { links: KONTEXT(3, 'Y'), rechts: KONTEXT(3, 'Y') },
      { links: KONTEXT(4, 'Z'), rechts: KONTEXT(4, 'Z') },
      { links: MINUS(5, 'vier'), rechts: null },
      { links: KONTEXT(6, 'fünf'), rechts: KONTEXT(5, 'fünf') },
      { links: KONTEXT(7, 'sechs'), rechts: KONTEXT(6, 'sechs') },
    ]);
  });

  test('Kriterium 5: Anordnung und Umfang sind unabhängig', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo G', commits: ['g2'] });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('t.txt');

    await neben.umfangWaehlen('ganze Datei');
    // In „ganze Datei“ entfällt nur der Hunk-Kopf; die Paare und die Kontextzeilen bleiben dieselben.
    await neben.zeilenPaareSind(PAARE_G2.slice(1));

    await neben.umfangWaehlen('nur Änderungen');
    await neben.umfangIst('nur Änderungen');
    await neben.zeilenPaareSind(PAARE_G2);
  });

  test('Kriterium 6: die Wahl bleibt bei Datei- und Commit-Wechsel, erst das Neuladen fällt auf „untereinander“ zurück', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo G', commits: ['g2'] });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('t.txt');
    await neben.anordnungIst('nebeneinander');

    await neben.neuLaden();
    await neben.anordnungIst('untereinander');
  });

  test('Kriterium 6: ohne gewählte Datei umschalten — der Hinweis bleibt, danach erscheint die zweispaltige Ansicht', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo G', commits: ['g2'] });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.fordertZurWahlAuf();

    await neben.dateiAnsehen('t.txt');
    await neben.zeilenPaareSind(PAARE_G2);
  });
});
