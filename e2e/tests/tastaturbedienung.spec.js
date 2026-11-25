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

test.describe('R00030 Hilfe-Overlay', () => {
  test('? öffnet den Dialog mit allen Kürzeln, gruppiert, Fokus gefangen; nicht verfügbare Aktionen sind markiert', async ({ tast }) => {
    await tast.starten();
    await pageFokus(tast, '#diff .umbruch-schalter');
    await tast.druecke('?');

    await tast.hilfeOffen(true);
    const gruppen = await tast.hilfeGruppen();
    expect(gruppen.map(gruppe => gruppe.titel)).toEqual(['Allgemein', 'Liste', 'Diff', 'Anmerkung']);
    const eintraege = gruppen.flatMap(gruppe => gruppe.eintraege);
    expect(eintraege.length, 'alle Kürzel').toBeGreaterThanOrEqual(20);
    expect(eintraege.some(eintrag => eintrag.text.includes('nächste ungeprüfte'))).toBe(true);
    expect(eintraege.some(eintrag => eintrag.text.includes('Anmerkung speichern'))).toBe(true);

    await tast.hilfeNichtVerfuegbar('nächster Commit');
    await tast.hilfeNichtVerfuegbar('nebeneinander');
    await tast.hilfeNichtVerfuegbar('Suche im Diff');

    expect(await tast.fokusImDialog(), 'Fokus im Dialog').toBe(true);
    expect(await tast.hintergrundInert(), 'Hintergrund inert').toBe(true);
    for (let schritt = 0; schritt < 6; schritt += 1) {
      await tast.druecke('Tab');
      expect(await tast.fokusImDialog(), `Tab ${schritt + 1} bleibt im Dialog`).toBe(true);
    }
    await tast.druecke('Shift+Tab');
    expect(await tast.fokusImDialog()).toBe(true);

    await tast.druecke('Escape');
    await tast.hilfeOffen(false);
    expect(await tast.hintergrundInert(), 'Hintergrund wieder bedienbar').toBe(false);
    await tast.fokusAuf('#diff .umbruch-schalter');
  });

  test('im offenen Dialog wirkt kein Kürzel außer Esc; der Knopf „Kürzel“ öffnet und schließt mit Fokus zurück', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');
    await tast.druecke('?');
    await tast.hilfeOffen(true);

    await tast.druecke('j');
    await tast.druecke('x');
    await tast.gewaehlt('src/a.txt');
    await tast.haken('src/a.txt', 'false');

    await tast.druecke('Escape');
    await tast.hilfeOffen(false);
    await tast.druecke('j');
    await tast.gewaehlt('src/b.txt');

    await tast.klickeHilfeKnopf();
    await tast.hilfeOffen(true);
    await tast.klickeHilfeZu();
    await tast.hilfeOffen(false);
  });
});

/** Fokussiert ein Bedienelement der Seite (Vorbereitung: der Auslöser, zu dem der Fokus zurückkehrt). */
async function pageFokus(tast, selektor) {
  await tast.fokussiere(selektor);
}

test.describe('R00030 Fokus sichtbar', () => {
  test('jedes Bedienelement und die gewählte Diff-Zeile tragen einen Fokusring von mindestens 2 px mit mindestens 3 : 1 Kontrast', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');

    for (const selektor of ['#hilfe-knopf', '.kz-modus-knopf', '#naechste-ungepruefte', '#datei-zeilen input.haken', '#diff .umbruch-schalter', '#diff .sprung-knopf']) {
      const ring = await tast.fokusringPerTab(selektor);
      expect(ring.sichtbar, `${selektor}: Ring sichtbar`).toBe(true);
      expect(ring.breite, `${selektor}: Breite`).toBeGreaterThanOrEqual(2);
      expect(ring.kontrast, `${selektor}: Kontrast`).toBeGreaterThanOrEqual(3);
    }

    await tast.inDenDiffTabben();
    await tast.pfeilAbBis(2);
    const zeile = await tast.fokusringAktuell();
    expect(zeile.element).toBe('tr');
    expect(zeile.sichtbar, 'Ring an der Diff-Zeile').toBe(true);
    expect(zeile.breite, 'Breite an der Diff-Zeile').toBeGreaterThanOrEqual(2);
    expect(zeile.kontrast, 'Kontrast an der Diff-Zeile').toBeGreaterThanOrEqual(3);
  });
});

test.describe('R00030 Nur außerhalb von Textfeldern, keine Browser- und Screenreader-Kürzel', () => {
  test('im offenen Notizfeld wirkt kein Kürzel — die Liste bleibt, der Text bleibt; Strg+Enter und Esc wirken im Feld', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');
    await tast.inDenDiffTabben();
    await tast.pfeilAbBis(2);
    await tast.druecke('Enter');
    await tast.tippe('Prüfung');
    await tast.fokussiereAusserhalb();

    const vorher = await tast.diffZeilen();
    for (const taste of ['j', 'k', 'n', 'p', 'x', 'm', 's', 'v', 'w', 'h']) {
      await tast.druecke(taste);
    }
    await tast.gewaehlt('src/a.txt');
    expect(await tast.diffZeilen(), 'Diff unverändert').toEqual(vorher);
    expect(await tast.feldwert(), 'Text im Feld unverändert').toBe('Prüfung');

    await tast.fokussiereFeld();
    await tast.druecke('Escape');
    await tast.keinFeld();
    await tast.anmerkungenUnter({ neu: 2 }, []);
  });

  test('Strg+F, Strg+R und F5 fängt das Programm nicht ab; kein Kürzel löst aus', async ({ tast }) => {
    await tast.starten();
    await tast.dateiAnsehen('src/a.txt');
    await tast.tastenBeobachten();

    await tast.druecke('Control+f');
    const beobachtet = await tast.beobachteteTasten();
    const strgF = beobachtet.find(eintrag => eintrag.taste === 'f');
    expect(strgF, 'Strg+F kommt an').toBeTruthy();
    expect(strgF.verhindert, 'Strg+F nicht abgefangen').toBe(false);

    expect(await tast.drueckeMitStrg('r'), 'Strg+R nicht abgefangen').toBe(false);
    expect(await tast.drueckeMitStrg('F5'), 'F5 nicht abgefangen').toBe(false);
    await tast.gewaehlt('src/a.txt');
    await tast.statuszeile('Datei', 'j k');
  });

  test('in input, select und contenteditable wirken die Kürzel nicht', async ({ tast }) => {
    await tast.starten();

    await tast.fokussiere('#ausblenden-eingabe');
    await tast.druecke('x');
    await tast.druecke('n');
    expect(await tast.ohneWahl(), 'Eingabefeld: keine Wahl').toBe(true);

    await tast.contenteditableFokussieren();
    await tast.druecke('x');
    expect(await tast.ohneWahl(), 'contenteditable: keine Wahl').toBe(true);

    await tast.fokussiereAusserhalb();
    await tast.druecke('m');
    await tast.modus('einzeln');
    await tast.commit('z1');
    await tast.fokussiere('#waehler-auswahl');
    await tast.druecke(']');
    await tast.commit('z1');
    await tast.druecke('x');
    await tast.haken('src/a.txt', 'false');
  });

  test('AltGr wechselt [ und ] den Commit, Strg+Alt nicht (deutsche Tastatur)', async ({ tast }) => {
    await tast.starten({ modus: 'einzeln' });
    await tast.commit('z1');

    expect(await tast.drueckeMitAltGr(']'), 'AltGr+] wirkt').toBe(true);
    await tast.commit('z2');
    expect(await tast.drueckeMitAltGr('['), 'AltGr+[ wirkt').toBe(true);
    await tast.commit('z1');

    expect(await tast.drueckeMitStrgAlt(']'), 'Strg+Alt+] wirkt nicht').toBe(false);
    await tast.commit('z1');
  });
});

test.describe('R00030 Gesperrte Stelle und kein neuer Weg', () => {
  test('an einer gesperrten Stelle ändern x und a nichts; der Sperrgrund steht weiter da', async ({ tast }) => {
    await tast.starten({
      hakenStand: hash => ({
        stellen: [{ commit: hash('z1'), datei: 'README.md', abgehakt: false, sperrgrund: 'Name nicht eindeutig' }],
        abgehakt: 0,
        gesamt: 6,
      }),
    });
    await tast.dateiAnsehen('README.md');
    await tast.sperrgrund('README.md', 'Name nicht eindeutig');

    await tast.druecke('x');
    await tast.haken('README.md', 'false');
    await tast.sperrgrund('README.md', 'Name nicht eindeutig');

    await tast.druecke('a');
    await tast.keinFeld();
    await tast.sperrgrund('README.md', 'Name nicht eindeutig');
  });

  test('Hot Path per Tastatur: Datei wählen, Zeile anmerken, Beenden — stdout trägt nur das Ergebnis, kein neuer Endpunkt', async ({ tast }) => {
    const anfragen = tast.anfragenBeobachten();
    await tast.starten();
    await tast.inDieDateiliste();

    await tast.druecke('j');
    await tast.gewaehlt('src/a.txt');
    await tast.wartenAufDiff('src/a.txt');
    await tast.inDenDiffTabben();
    await tast.pfeilAbBis(2);
    await tast.druecke('Enter');
    await tast.tippe('Tastaturpfad');
    await tast.druecke('Control+Enter');
    await tast.anmerkungenUnter({ neu: 2 }, ['Tastaturpfad']);
    expect(tast.stdoutBisher(), 'stdout bis Beenden leer').toBe('');

    const { exitCode, ergebnis } = await tast.beendenUndErgebnisLesen();
    expect(exitCode).toBe(0);
    expect(ergebnis).toContain('## 1. src/a.txt:2');
    expect(ergebnis).toContain('> Tastaturpfad');

    const bekannt = [/^\/api\/zustand$/, /^\/api\/commits$/, /^\/api\/commits\/[^/]+\/dateien$/, /^\/api\/commits\/[^/]+\/diff$/,
      /^\/api\/zusammen$/, /^\/api\/zusammen\/diff$/, /^\/api\/zusammen\/[^/]+\/diff$/, /^\/api\/haken$/, /^\/api\/anmerkungen$/, /^\/api\/anmerkungen\/\d+$/,
      /^\/api\/sprung$/, /^\/api\/commits\/[^/]+\/sprung$/, /^\/api\/beenden$/];
    for (const pfad of anfragen()) {
      expect(bekannt.some(muster => muster.test(pfad)), `bekannter Endpunkt: ${pfad}`).toBe(true);
    }
  });
});
