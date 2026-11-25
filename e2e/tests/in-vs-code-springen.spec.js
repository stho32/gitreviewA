'use strict';
// Spezifikation R00021 „In VS Code springen“, Teil Oberfläche: das Attribut href der Zeilen- und Abschnittskopf-Links, der Verweis
// „In VS Code“ im Diff-Kopf, der Hinweis und der Grund. Kein Test startet VS Code. Die Integrationsebene (Ziel je Stelle, Gründe,
// kein git-Aufruf bei abgewiesenen Pfaden) prüft tests/GitReviewA.Tests/Akzeptanz/SprungR00021Tests.cs.
const { test, expect } = require('../dsl/gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const repos = require('../treiber/sprung-repo.js');

const FENSTER = { width: 1280, height: 800 };
const GRUND_FEHLT = 'Datei liegt nicht im Arbeitsbaum';
const GRUND_NICHT_UEBERGEBBAR = 'Name nicht übergebbar';
const GRUND_VERLAESST = 'Pfad verlässt das Repository';

function sprungZiel(ordner, pfad, zeile) {
  return `vscode://file${ordner}/${pfad}:${zeile}`;
}

/** Öffnet gitreviewA im Repo S und wählt Commit `s2`; liefert das Repo. */
async function starteS(gr, page) {
  const repo = repos.repoS(gr.eigenerOrdner());
  const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.s1, repo.hashes.s2]);
  await page.setViewportSize(FENSTER);
  await gr.oberflaecheOeffnen(page, lauf);
  await seite.commitWaehlen(page, repo.hashes.s2.slice(0, 7));
  return repo;
}

test.describe('Sprungziele je Stelle', () => {
  test('soll an jeder Zeile mit Nummer neu und am Abschnittskopf den kodierten Link tragen', async ({ gr, page }) => {
    const repo = await starteS(gr, page);

    await seite.dateiWaehlen(page, 'src/a.txt');

    await diffSeite.pruefeSprungzeile(page, 1, sprungZiel(repo.ordner, 'src/a.txt', 1));
    await diffSeite.pruefeSprungzeile(page, 2, sprungZiel(repo.ordner, 'src/a.txt', 2));
    await diffSeite.pruefeSprungzeile(page, 3, sprungZiel(repo.ordner, 'src/a.txt', 3));
    await diffSeite.pruefeSprungzeile(page, 4, sprungZiel(repo.ordner, 'src/a.txt', 4));
    expect(await diffSeite.sprungHunkLink(page)).toBe(sprungZiel(repo.ordner, 'src/a.txt', 1));
    await expect(page.locator('#diff .dz tr.minus a')).toHaveCount(0);
  });

  test('soll in der Ansicht ganze Datei dieselben Zeilenlinks tragen', async ({ gr, page }) => {
    const repo = await starteS(gr, page);
    await seite.dateiWaehlen(page, 'src/a.txt');

    await diffSeite.ansichtWaehlen(page, 'ganze Datei');

    await diffSeite.pruefeSprungzeile(page, 1, sprungZiel(repo.ordner, 'src/a.txt', 1));
    await diffSeite.pruefeSprungzeile(page, 2, sprungZiel(repo.ordner, 'src/a.txt', 2));
    await diffSeite.pruefeSprungzeile(page, 3, sprungZiel(repo.ordner, 'src/a.txt', 3));
    await diffSeite.pruefeSprungzeile(page, 4, sprungZiel(repo.ordner, 'src/a.txt', 4));
  });

  test('soll einen Namen mit Leerzeichen und Raute prozent-kodieren', async ({ gr, page }) => {
    const repo = repos.repoS(gr.eigenerOrdner());
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.s1, repo.hashes.s2]);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf);
    await seite.commitWaehlen(page, repo.hashes.s1.slice(0, 7));

    await seite.dateiWaehlen(page, 'Ordner mit Leerzeichen/datei#1.txt');

    await diffSeite.pruefeSprungzeile(page, 1, `vscode://file${repo.ordner}/Ordner%20mit%20Leerzeichen/datei%231.txt:1`);
  });
});

test.describe('Zugänglichkeit der Zeilen-Links', () => {
  test('soll den Link der Zeile 2 benennen und nicht in einem verborgenen Teilbaum führen', async ({ gr, page }) => {
    await starteS(gr, page);

    await seite.dateiWaehlen(page, 'src/a.txt');

    await diffSeite.pruefeSprungzeileName(page, 2, 'src/a.txt Zeile 2, in VS Code öffnen');
    expect(await diffSeite.sprungzeileLiegtImVerborgenen(page, 2), 'fokussierbarer Link in einer verborgenen Zelle').toBe(false);
  });

  test('soll den Abschnittskopf-Link benennen und in der Ansicht ganze Datei denselben Namen tragen', async ({ gr, page }) => {
    await starteS(gr, page);
    await seite.dateiWaehlen(page, 'src/a.txt');

    await diffSeite.pruefeSprungkopfName(page, '@@ -1,3 +1,4 @@');

    await diffSeite.ansichtWaehlen(page, 'ganze Datei');

    await diffSeite.pruefeSprungzeileName(page, 2, 'src/a.txt Zeile 2, in VS Code öffnen');
    expect(await diffSeite.sprungzeileLiegtImVerborgenen(page, 2), 'fokussierbarer Link in einer verborgenen Zelle').toBe(false);
  });
});

test.describe('Verweis im Diff-Kopf', () => {
  test('soll ohne gewählte Zeile auf die erste Zeile mit Nummer neu zeigen und nach der Wahl auf die gewählte', async ({ gr, page }) => {
    const repo = await starteS(gr, page);
    await seite.dateiWaehlen(page, 'src/a.txt');

    await diffSeite.pruefeSprungVerweis(page, sprungZiel(repo.ordner, 'src/a.txt', 1));

    await diffSeite.zeileWaehlen(page, 4);

    await diffSeite.pruefeSprungVerweis(page, sprungZiel(repo.ordner, 'src/a.txt', 4));
  });

  test('soll den Hinweis nur zeigen, wenn die Datei seit dem Commit geändert ist, und die Links behalten', async ({ gr, page }) => {
    const repo = await starteS(gr, page);

    await seite.dateiWaehlen(page, 'weg.txt');
    await diffSeite.pruefeSprungHinweis(page, '');
    await diffSeite.pruefeSprungzeile(page, 3, sprungZiel(repo.ordner, 'weg.txt', 3));

    require('fs').writeFileSync(`${repo.ordner}/weg.txt`, 'w1\nw2\nW3\n');
    await seite.dateiWaehlen(page, 'weg.txt');

    await diffSeite.pruefeSprungHinweis(page, 'Datei seit dem Commit geändert');
    await diffSeite.pruefeSprungzeile(page, 1, sprungZiel(repo.ordner, 'weg.txt', 1));
    await diffSeite.pruefeSprungzeile(page, 3, sprungZiel(repo.ordner, 'weg.txt', 3));
  });

  test('soll bei einer im Commit gelöschten Datei keinen Link, aber den Grund als Text zeigen', async ({ gr, page }) => {
    await starteS(gr, page);

    await seite.dateiWaehlen(page, 'README.md');

    await diffSeite.pruefeSprungGrund(page, GRUND_FEHLT);
    await expect(page.locator('#diff .dz a')).toHaveCount(0);
  });
});

test.describe('Fremde Namen und Wurzel', () => {
  test('soll einem Namen mit Rohbyte oder U202E keinen Link geben, g.txt aber schon', async ({ gr, page }) => {
    const repo = repos.repoF(gr.eigenerOrdner());
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.f]);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf);

    await seite.dateizeileMitPfadWaehlen(page, 'f⟨0xFF⟩.txt', 0);
    await diffSeite.pruefeSprungGrund(page, GRUND_NICHT_UEBERGEBBAR);

    await seite.dateizeileMitPfadWaehlen(page, 'u\u202E.txt', 0);
    await diffSeite.pruefeSprungGrund(page, GRUND_NICHT_UEBERGEBBAR);

    await seite.dateiWaehlen(page, 'g.txt');
    await diffSeite.pruefeSprungzeile(page, 1, sprungZiel(repo.ordner, 'g.txt', 1));
  });

  test('soll bei einem Symlink aus der Wurzel keinen Link, aber den Grund zeigen', async ({ gr, page }) => {
    const repo = repos.repoL(gr.eigenerOrdner());
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.l]);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf);

    await seite.dateiWaehlen(page, 'link.txt');

    await diffSeite.pruefeSprungGrund(page, GRUND_VERLAESST);
  });
});

test.describe('Ladeverhalten', () => {
  test('soll die späte Antwort einer früheren Wahl verwerfen', async ({ gr, page }) => {
    const repo = await starteS(gr, page);
    const verzoegert = await diffSeite.sprungAntwortVerzoegern(page, 'src/a.txt', 1500);

    await seite.dateiWaehlen(page, 'src/a.txt');
    await seite.dateiWaehlen(page, 'weg.txt');
    await diffSeite.pruefeSprungzeile(page, 3, sprungZiel(repo.ordner, 'weg.txt', 3));

    await verzoegert.eingetroffen();

    await diffSeite.pruefeSprungzeile(page, 2, sprungZiel(repo.ordner, 'weg.txt', 2));
    await diffSeite.pruefeSprungzeile(page, 3, sprungZiel(repo.ordner, 'weg.txt', 3));
    await diffSeite.pruefeSprungVerweis(page, sprungZiel(repo.ordner, 'weg.txt', 1));
  });
});
