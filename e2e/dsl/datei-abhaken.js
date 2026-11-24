'use strict';
// Testsprache „Datei abhaken“ (R00011): Commits heißen wie in der User Story (p, q, r; x; y; g), „abhaken“ betätigt das Kästchen einer Datei
// in der Dateiliste des gewählten Commits, „über die Schnittstelle abhaken“ sendet POST /api/haken. Treiber darunter kennen Seite, Prozess und git.
const fs = require('fs');
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const repos = require('../treiber/wegwerf-repo.js');
const seite = require('../treiber/oberflaeche.js');
const haken = require('../treiber/haken-oberflaeche.js');
const schnittstelle = require('../treiber/haken-schnittstelle.js');
const beobachtung = require('../treiber/beobachtung.js');

const NAME_MIT_ZEILENUMBRUCH = 'ab\ncd‮.txt';
const NAME_MIT_HTML = '<b>x</b>.txt';
const START_FRIST_MS = 2000;

function repoAnlegen(gr, art) {
  switch (art) {
    case 'vorbereitung': {
      const repo = gr.repoMitVorbereitung();
      return { ordner: repo.ordner, startordner: repo.ordner, hashes: { p: repo.p, q: repo.q, r: repo.r } };
    }
    case 'x': {
      const repo = gr.repoMitDateien({ [NAME_MIT_HTML]: 'x\n' });
      return { ordner: repo.ordner, startordner: repo.ordner, hashes: { x: repo.hash } };
    }
    case 'y': {
      const repo = gr.repoMitDateien({ [NAME_MIT_ZEILENUMBRUCH]: 'x\n' });
      return { ordner: repo.ordner, startordner: repo.ordner, hashes: { y: repo.hash } };
    }
    case 'g': {
      const repo = gr.repoMitGrossemCommit(2000);
      return { ordner: repo.ordner, startordner: repo.ordner, hashes: { g: repo.u } };
    }
    case 'fremde Konfiguration': {
      return gr.gemerktesRepo(fremdKonfiguriertesRepo());
    }
    default:
      throw new Error(`unbekannte Vorbereitung: ${art}`);
  }
}

/**
 * Vorbereitung `p q r`, dazu `ä ö.txt` in `p`; die Konfiguration zeigt `diff.external`, `diff.<treiber>.textconv`, `log.showSignature` und
 * `gpg.program` auf ein Marker-Skript, `core.quotepath=true`; gestartet wird im Unterordner `src`.
 */
function fremdKonfiguriertesRepo() {
  const ordner = repos.leeresRepoAnlegen();
  repos.dateiSchreiben(ordner, 'README.md', 'Zeile 1\nZeile 2\n');
  repos.dateiSchreiben(ordner, 'src/a.txt', 'a\nb\nc\n');
  repos.dateiSchreiben(ordner, 'src/b.txt', 'x\ny\n');
  repos.dateiSchreiben(ordner, 'alt.txt', '1\n2\n3\n4\n');
  repos.dateiSchreiben(ordner, 'ä ö.txt', 'umlaut\n');
  const p = repos.commitAnlegen(ordner, { betreff: 'Start' });
  repos.git(ordner, 'mv', 'README.md', 'LIESMICH.md');
  fs.rmSync(path.join(ordner, 'alt.txt'));
  repos.dateiSchreiben(ordner, 'src/b.txt', 'x\nY\nz\n');
  repos.dateiSchreiben(ordner, 'logo.bin', Buffer.from([0, 1, 2, 3, 0, 255]));
  const q = repos.commitAnlegen(ordner, { betreff: 'Dateien ändern' });
  const r = repos.commitAnlegen(ordner, { betreff: 'Nichts' });
  const marke = path.join(ordner, '.git', 'marker-lief');
  const skript = path.join(ordner, '.git', 'marker.sh');
  fs.writeFileSync(skript, `#!/bin/sh\ntouch '${marke}'\ncat "$1" 2>/dev/null\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(ordner, '.git', 'info', 'attributes'), '* diff=marker\n');
  for (const [schluessel, wert] of [['diff.external', skript], ['diff.marker.textconv', skript], ['log.showSignature', 'true'], ['gpg.program', skript], ['core.quotepath', 'true']]) {
    repos.git(ordner, 'config', schluessel, wert);
  }
  return { ordner, startordner: path.join(ordner, 'src'), hashes: { p, q, r }, marke };
}

function abhakenSprache(gr, page) {
  let repo;
  let lauf;
  let zaehlerGit;
  let dialogePruefen;
  const hash = name => repo.hashes[name];
  const kurz = name => hash(name).slice(0, 7);

  async function starten({ vorbereitung = 'vorbereitung', commits, verbose = false, ohneSeite = false } = {}) {
    repo = repoAnlegen(gr, vorbereitung);
    zaehlerGit = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    const zusatz = verbose ? ['--verbose'] : [];
    const startrepo = { ordner: repo.startordner };
    if (!ohneSeite) {
      dialogePruefen = seite.dialogeZaehlen(page);
      await page.goto('about:blank');
    }
    lauf = await gr.gitreviewAStarten(startrepo, commits.map(hash), { zusatz, pfadVorne: zaehlerGit.ordner });
    if (!ohneSeite) {
      await gr.oberflaecheOeffnen(page, lauf);
    }
    return lauf;
  }

  async function ueberDieSchnittstelleAbhaken(commit, datei, abgehakt = true, optionen = {}) {
    return schnittstelle.hakenSetzen(lauf.adresse, { commit: hash(commit), datei, abgehakt }, optionen);
  }

  return {
    starten,
    hash,
    kurz,
    commitAnsehen: commit => seite.commitWaehlen(page, kurz(commit)),
    dateienWarten: anzahl => seite.aufDateizeilenWarten(page, anzahl),
    dateiAnsehen: name => seite.dateiWaehlen(page, name),
    dateiwahlenMitschreiben: () => seite.dateiwahlenSammeln(page),
    keineDateiwahlSeitdem: async () => expect(await seite.gesammelteDateiwahlen(page)).toEqual([]),
    keineDateiGewaehlt: async () => expect(await seite.gewaehlteDateien(page)).toEqual([]),
    gewaehlteDateien: namen => seite.pruefeGewaehlteDateien(page, namen),
    neuLaden: () => page.reload(),
    /** Feste Frist, in der nichts mehr geschehen darf — prüft eine Abwesenheit (kein weiteres Senden), wartet nicht auf ein Ereignis. */
    ruhezeitAbwarten: ms => page.waitForTimeout(ms),
    abhaken: name => haken.kaestchenBetaetigen(page, name),
    perTastaturAbhaken: name => haken.perTastaturAbhaken(page, name),
    fortschritt: text => haken.pruefeFortschritt(page, text),
    balkenanteil: anteil => haken.pruefeBalkenanteil(page, anteil),
    istAbgehakt: (name, erwartet = true) => haken.pruefeAbgehakt(page, name, erwartet),
    kaestchenHeisst: (name, erwarteterName) => haken.pruefeKaestchenName(page, name, erwarteterName),
    fokusAufKaestchen: name => haken.pruefeFokusAufKaestchen(page, name),
    kaestchenflaecheReicht: name => haken.pruefeKaestchenflaeche(page, name),
    hakenMeldung: text => haken.pruefeHakenMeldung(page, text),
    kaestchenGesperrt: () => haken.pruefeKaestchenGesperrt(page),
    hakenSetzenScheitert: optionen => haken.hakenSetzenScheitert(page, optionen),
    hakenSetzenVerzoegern: ms => haken.hakenSetzenVerzoegern(page, ms),
    standLesenScheitert: () => haken.standLesenScheitert(page),
    fremderTextBleibtText: async () => {
      await seite.pruefeKeineFormatierung(page);
      await dialogePruefen();
    },
    ueberDieSchnittstelleAbhaken,
    standLesen: host => schnittstelle.standLesen(lauf.adresse, host),
    /** Der Stand des Servers: abgehakte Stellen als „Commitname:Pfad“. */
    serverseitigAbgehakt: async () => {
      const stand = await schnittstelle.standLesen(lauf.adresse);
      const nameNachHash = Object.fromEntries(Object.entries(repo.hashes).map(([name, h]) => [h, name]));
      return stand.stellen.filter(stelle => stelle.abgehakt).map(stelle => `${nameNachHash[stelle.commit]}:${stelle.datei}`);
    },
    beendenAnfordern: () => gr.beendenAnfordern(lauf),
    beendenUndDauerMessen: () => gr.beendenUndDauerMessen(lauf),
    beendenBetaetigen: () => seite.beendenBetaetigen(page),
    aufEnde: () => gr.aufEndeWarten(lauf),
    ergebnis: () => lauf.stdout,
    stderr: () => lauf.stderr,
    laufGehtWeiter: async () => expect((await gr.zustandAbfragen(lauf)).status).toBe(200),
    gitAufrufe: erwartet => beobachtung.pruefeGitAufrufe(zaehlerGit, erwartet),
    markerLief: () => fs.existsSync(repo.marke),
    zeitSeitStartBisFortschritt: text => haken.zeitBisFortschritt(page, text, lauf.gestartetUmMs),
    /** Betätigt das Kästchen und misst ereignisgenau bis zum Zählertext; liefert die Dauer. */
    zeitVomKlickBisFortschritt: async (name, text) => {
      const klickUmMs = Date.now();
      await haken.kaestchenBetaetigen(page, name);
      return haken.zeitBisFortschritt(page, text, klickUmMs);
    },
    /** Pfade der Dateiliste eines Commits laut `GET /api/commits/<hash>/dateien` (Orakel für die Übersicht). */
    dateilistePfade: async commit => {
      const antwort = await gr.dateienAbfragen(lauf, hash(commit));
      return JSON.parse(antwort.koerper).map(datei => datei.pfad);
    },
    dateienRechtzeitigNachKlick: (commit, anzahl) => seite.pruefeDateizeilenBinnenNachKlick(page, kurz(commit), anzahl, 1000),
    lauf: () => lauf,
    START_FRIST_MS,
  };
}

const test = basis.extend({
  abhaken: async ({ gr, page }, verwenden) => {
    await verwenden(abhakenSprache(gr, page));
  },
  /** Dieselbe Sprache ohne Seite: Programm als Prozess, Schnittstelle, stdout und stderr. */
  programm: async ({ gr }, verwenden) => {
    await verwenden(abhakenSprache(gr, null));
  },
});

module.exports = { test, expect, NAME_MIT_ZEILENUMBRUCH, NAME_MIT_HTML };
