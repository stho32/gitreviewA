'use strict';
// Spezifikation R00030 „Tastaturbedienung“, Teil Browser: die Kürzel, die nur im Browser prüfbar sind (Tastendruck, Fokus,
// Fokusfalle, berechneter Stil, Live-Region). Der Katalog und die Kontextregeln rechnen in tests/bausteine/tasten-werte.spec.js;
// hier geht es um das, was die Seite daraus macht. Ein neuer Serverweg entsteht nicht — die Tastenschicht liest nur die Seite.
const { test, expect } = require('../dsl/tastatur.js');

test.describe('R00030 Abschnitte — n und p', () => {
  test('setzen den Fokus auf die erste Zeile des nächsten bzw. vorigen Abschnitts; an den Enden bleibt er stehen', async ({ tast }) => {
    await tast.starten({ vorbereitung: 'Repo W' });
    await tast.dateiAnsehen('weit.txt');

    const zeilen = await tast.diffZeilen();
    expect(zeilen.abschnitte, 'zwei Abschnitte im Diff').toBe(2);

    await tast.inDenDiffTabben();
    await tast.druecke('n');
    await tast.fokusAufDiffzeile(2);
    await tast.druecke('n');
    await tast.fokusAufDiffzeile(32);
    await tast.druecke('n');
    await tast.fokusAufDiffzeile(32);
    await tast.druecke('p');
    await tast.fokusAufDiffzeile(2);
    await tast.druecke('p');
    await tast.fokusAufDiffzeile(2);
  });
});

test.describe('R00030 Dateiliste und Haken — j, k, x, m, u, [, ]', () => {
  test('j, j, k wählen src/a.txt, src/b.txt und wieder src/a.txt; der Fokus steht auf der Zeile und der Diff lädt', async ({ tast }) => {
    await tast.starten();
    await tast.inDieDateiliste();

    await tast.druecke('j');
    await tast.gewaehlt('src/a.txt');
    await tast.fokusAufDateizeile('src/a.txt');
    await tast.diffZeigt({
      pfad: 'src/a.txt',
      zeilen: [
        { kopf: '@@ -0,0 +1,4 @@' },
        { plus: 'eins', neu: 1 },
        { plus: 'ZWEI', neu: 2 },
        { plus: 'drei', neu: 3 },
        { plus: 'vier', neu: 4 },
      ],
    });

    await tast.druecke('j');
    await tast.gewaehlt('src/b.txt');
    await tast.fokusAufDateizeile('src/b.txt');

    await tast.druecke('k');
    await tast.gewaehlt('src/a.txt');
    await tast.fokusAufDateizeile('src/a.txt');
  });

  test('x hakt die gewählte Datei ab, lässt Wahl und Diff stehen, nimmt den Haken wieder weg und sagt es an', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('README.md');
    await tast.haken('README.md', 'false');

    await tast.druecke('x');
    await tast.haken('README.md', 'true');
    await tast.fortschritt('1 von 3 Dateien abgehakt');
    await tast.gewaehlt('README.md');
    await tast.ansage('README.md abgehakt');

    await tast.druecke('x');
    await tast.haken('README.md', 'false');
    await tast.fortschritt('0 von 3 Dateien abgehakt');
    await tast.ansage('Haken für README.md entfernt');
  });

  test('[ und ] wechseln in „Einzeln“ den Commit samt Liste, in „Zusammen“ haben sie keine Wirkung', async ({ tast }) => {
    await tast.starten({ modus: 'einzeln' });
    await tast.commit('z1');

    await tast.druecke(']');
    await tast.commit('z2');
    await tast.dateiAnsehen('src/a.txt');
    await tast.druecke('[');
    await tast.commit('z1');

    await tast.druecke('m');
    await tast.commit('z1');
    await tast.druecke(']');
    await tast.commit('z1');
  });

  test('m wechselt den Modus wie der Umschalter, die Wahl folgt der Regel des Wechsels', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');

    await tast.druecke('m');
    await tast.modus('einzeln');
    await tast.gewaehlt('src/a.txt');
    await tast.ansage('Modus Einzeln');

    await tast.druecke('m');
    await tast.modus('zusammen');
    await tast.gewaehlt('src/a.txt');
    await tast.ansage('Modus Zusammen');
  });

  test('u springt der Reihe nach zu README.md, src/a.txt, src/b.txt und wieder README.md; der Fokus steht auf der neuen Zeile', async ({ tast }) => {
    await tast.starten();

    await tast.druecke('u');
    await tast.gewaehlt('README.md');
    await tast.fokusAufDateizeile('README.md');

    await tast.druecke('u');
    await tast.gewaehlt('src/a.txt');
    await tast.fokusAufDateizeile('src/a.txt');

    await tast.druecke('u');
    await tast.gewaehlt('src/b.txt');
    await tast.fokusAufDateizeile('src/b.txt');

    await tast.druecke('u');
    await tast.gewaehlt('README.md');
    await tast.fokusAufDateizeile('README.md');
  });

  test('h tut nichts, solange der Schalter „Abgehakte ausblenden“ nicht gebaut ist', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('README.md');
    const vorher = await tast.fokus();

    await tast.druecke('h');
    await tast.gewaehlt('README.md');
    expect(await tast.fokus()).toEqual(vorher);
  });
});

test.describe('R00030 Diff und Anmerkung — Enter, a, e, s, w, l, o, g', () => {
  test('Enter öffnet das Feld der Zeile, Strg+Enter speichert mit Fokus zurück auf der Zeile, Esc verwirft', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');
    await tast.inDenDiffTabben();
    await tast.pfeilAbBis(2);
    await tast.fokusAufDiffzeile(2);

    await tast.druecke('Enter');
    await tast.feldOffenMitFokus('Anmerkung zu src/a.txt, Zeile 2');
    await tast.tippe('Klammer fehlt');
    await tast.druecke('Control+Enter');
    await tast.anmerkungenUnter({ neu: 2 }, ['Klammer fehlt']);
    await tast.fokusAufDiffzeile(2);

    await tast.druecke('Enter');
    await tast.feldOffenMitFokus('Anmerkung zu src/a.txt, Zeile 2');
    await tast.tippe('wieder weg');
    await tast.druecke('Escape');
    await tast.keinFeld();
    await tast.anmerkungenUnter({ neu: 2 }, ['Klammer fehlt']);
    await tast.fokusAufDiffzeile(2);
  });

  test('a öffnet „Anmerkung zu <Datei> (ganze Datei)“ wie der Knopf im Diff-Kopf', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');

    await tast.druecke('a');
    await tast.feldOffenMitFokus('Anmerkung zu src/a.txt (ganze Datei)');
  });

  test('e öffnet „Ändern“ nur im Anmerkungskopf und mit dem vorhandenen Text; sonst hat es keine Wirkung', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');
    await tast.inDenDiffTabben();
    await tast.pfeilAbBis(2);
    await tast.druecke('Enter');
    await tast.tippe('Erster Text');
    await tast.druecke('Control+Enter');
    await tast.anmerkungenUnter({ neu: 2 }, ['Erster Text']);
    await tast.fokussiereKopf(1);
    await tast.fokusAufKopf(1);

    await tast.druecke('e');
    await tast.aenderungsfeldMitText('Erster Text');

    await tast.druecke('Escape');
    await tast.fokusAufKopf(1);
    await tast.aenderungsfelder(0);
    await tast.fokussiereAusserhalb();
    await tast.druecke('e');
    await tast.aenderungsfelder(0);
  });

  test('s, w und l schalten Ansicht, Umbruch und Leerraum wie ihre Bedienelemente um', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');

    await tast.druecke('s');
    await tast.ansicht('ganz');
    await tast.druecke('s');
    await tast.ansicht('aenderungen');

    await tast.druecke('w');
    await tast.umbruch(true);
    await tast.druecke('w');
    await tast.umbruch(false);

    await tast.druecke('l');
    await tast.leerraum(true);
    await tast.druecke('l');
    await tast.leerraum(false);
  });

  test('o betätigt den Verweis „In VS Code“ mit demselben Ziel; v und / tun nichts, solange ihre Bedienelemente fehlen', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');
    const ziel = await tast.inVsCodeHref();
    expect(ziel, 'Ziel des Verweises').toMatch(/^vscode:\/\/file\//);
    await tast.vsCodeKlickZaehlen();

    await tast.druecke('o');
    expect(await tast.vsCodeKlicks()).toEqual([ziel]);

    await tast.druecke('v');
    await tast.druecke('/');
    await tast.gewaehlt('src/a.txt');
  });

  test('g springt zur nächsten Lücke und setzt den Fokus auf ihren Aufklapp-Knopf', async ({ tast }) => {
    await tast.starten({ vorbereitung: 'Repo W', modus: 'einzeln' });
    await tast.dateiAnsehen('weit.txt');

    await tast.inDenDiffTabben();
    await tast.druecke('g');
    await tast.fokusAufLuecke(0);
    await tast.druecke('g');
    await tast.fokusAufLuecke(1);
  });
});
test.describe('R00030 Statuszeile', () => {
  test('nennt die wichtigsten Kürzel des Bereichs, in „Einzeln“ zusätzlich den Commit, und ist keine Live-Region', async ({ tast }) => {
    await tast.starten();

    await tast.statuszeile('Datei', 'j k');
    await tast.statuszeile('Abschnitt', 'n p');
    await tast.statuszeile('Zeile', '↑ ↓');
    await tast.statuszeile('anmerken', 'Enter');
    await tast.statuszeile('abhaken', 'x');
    await tast.statuszeile('nächste ungeprüfte', 'u');
    await tast.statuszeile('alle Kürzel', '?');
    await tast.statuszeileOhne('Commit');

    const zusammen = await tast.statuszeileDom();
    expect(zusammen.tag, 'Fußzeile').toBe('footer');
    expect(zusammen.label, 'Name der Fußzeile').toBe('Tastaturkürzel');
    expect(zusammen.live, 'keine Live-Region').toBeNull();
    expect(zusammen.tasten.length).toBeGreaterThan(0);
    for (const taste of zusammen.tasten) {
      expect(taste.verborgen, `kbd ${taste.text} lesbar`).toBeNull();
    }

    await tast.druecke('m');
    await tast.statuszeile('Commit', '[ ]');
    const einzeln = await tast.statuszeileDom();
    expect(einzeln.texte.some(text => text.trim().endsWith('Commit')), 'Commit-Zeile').toBe(true);
  });
});

test.describe('R00030 Kürzel an den Bedienelementen', () => {
  test('jedes Bedienelement mit Kürzel trägt Hinweis und aria-keyshortcuts; der zugängliche Name bleibt ohne Kürzel', async ({ tast }) => {
    await tast.starten();

    const kaestchen = await tast.hinweis('#datei-zeilen .datei-zeile input.haken');
    expect(kaestchen).toEqual({ aria: 'x', kbd: 'x', kbdVerborgen: true, name: 'Abgehakt: README.md' });

    const modus = await tast.hinweis('.kz-modus');
    expect(modus.aria).toBe('m');
    expect(modus.kbd).toBe('m');
    expect(modus.kbdVerborgen).toBe(true);
    expect(modus.name).toBe('Modus');

    const naechste = await tast.hinweis('#naechste-ungepruefte');
    expect(naechste.aria).toBe('u');
    expect(naechste.name).toBe('Nächste ungeprüfte');

    await tast.dateiAnsehen('src/a.txt');
    const vscode = await tast.hinweis('#diff .sprung-knopf');
    expect(vscode.aria).toBe('o');
    expect(vscode.kbd).toBe('o');
    expect(vscode.name).toBe('In VS Code');

    const dateiAnmerken = await tast.hinweis('#diff .datei-anmerken');
    expect(dateiAnmerken.aria).toBe('a');
    expect(dateiAnmerken.name).toBe('Datei anmerken');

    expect((await tast.hinweis('#diff .diffansicht-wahl')).aria).toBe('s');
    expect((await tast.hinweis('#diff .umbruch-schalter')).aria).toBe('w');
    expect((await tast.hinweis('#diff .leerraum-schalter')).aria).toBe('l');
  });
});
