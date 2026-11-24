'use strict';
// Testsprache „Zeile annotieren“ (R00010): Repos und Commits heißen wie in der User Story (A mit p, q; U mit u; X mit x), Zeilen tragen
// ihre Nummer neu (`{ neu: 18 }` ist `z19` in q) oder als entfernte Zeile ihre Nummer alt (`{ alt: 2 }` ist `−zwei`).
// Die Treiber darunter kennen Seite, Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const anmerkungSeite = require('../treiber/anmerkungen-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');

const FENSTER = { width: 1280, height: 800 };
const LADEFRIST_MS = 1000;

const VORBEREITUNGEN = {
  'Repo A': { anlegen: repos.repoA, commits: ['q', 'p'] },
  'Repo U': { anlegen: repos.repoU, commits: ['u'] },
  'Repo X': { anlegen: repos.repoX, commits: ['x'] },
};

function annotierSprache(gr, page) {
  let repo;
  let lauf;
  let dialogePruefen;
  let ersterCommit;
  const hash = name => repo.hashes[name];

  async function starten({ vorbereitung = 'Repo A', verbose = false, seiteOeffnen = true } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    [ersterCommit] = art.commits;
    const zusatz = [];
    if (verbose) {
      zusatz.push('--verbose');
    }
    lauf = await gr.gitreviewAStarten(repo, art.commits.map(hash), { zusatz });
    if (seiteOeffnen) {
      await oeffneSeite();
    }
  }

  async function oeffneSeite() {
    await page.setViewportSize(FENSTER);
    dialogePruefen = seite.dialogeZaehlen(page);
    await gr.oberflaecheOeffnen(page, lauf);
  }

  /** Name des Notizfelds wie in der Anforderung: „Anmerkung zu <Datei>, Zeile <n>“. */
  const feldname = (datei, neu) => `Anmerkung zu ${datei}, Zeile ${neu}`;

  /** Klick auf die Zeile, Text ins Feld, „Speichern“; danach ist das Feld zu. */
  async function annotieren(datei, neu, text) {
    await anmerkungSeite.zeileAnklicken(page, { neu });
    await anmerkungSeite.textSchreiben(page, feldname(datei, neu), text);
    await anmerkungSeite.speichern(page, feldname(datei, neu));
    await anmerkungSeite.pruefeFeldZu(page, feldname(datei, neu));
  }

  async function beendenUndErgebnisLesen() {
    await gr.beendenBetaetigen(page);
    const exitCode = await gr.aufEndeWarten(lauf);
    return { exitCode, ergebnis: gr.ergebnis(lauf) };
  }

  return {
    starten,
    hash,
    feldname,
    dateiAnsehen: name => seite.dateiWaehlen(page, name),
    commitAnsehen: name => seite.commitWaehlen(page, hash(name).slice(0, 7)),
    ansichtWaehlen: name => diffSeite.ansichtWaehlen(page, name),
    diffZeigt: erwartet => diffSeite.pruefeDiff(page, erwartet),
    /** Neu laden; danach ist wieder der erste Commit des Aufrufs gewählt. */
    neuLaden: async () => {
      await page.reload();
      await seite.pruefeGewaehlterCommit(page, hash(ersterCommit).slice(0, 7));
    },

    annotieren,
    zeileAnklicken: ziel => anmerkungSeite.zeileAnklicken(page, ziel),
    feldOffenMitFokus: (datei, neu) => anmerkungSeite.pruefeFeldOffenMitFokus(page, feldname(datei, neu)),
    textSchreiben: (datei, neu, text) => anmerkungSeite.textSchreiben(page, feldname(datei, neu), text),
    speichern: (datei, neu) => anmerkungSeite.speichern(page, feldname(datei, neu)),
    zweimalSpeichern: (datei, neu) => anmerkungSeite.zweimalSpeichern(page, feldname(datei, neu)),
    feldZu: (datei, neu) => anmerkungSeite.pruefeFeldZu(page, feldname(datei, neu)),
    keinFeld: () => anmerkungSeite.pruefeKeinFeld(page),
    feldMeldet: (datei, neu, meldung, text) => anmerkungSeite.pruefeFeldmeldung(page, feldname(datei, neu), meldung, text),

    /** `erwartet`: Texte der Anmerkungen unter der Zeile in ihrer Reihenfolge, je mit der Stelle `<datei>:<neu>`. */
    anmerkungenUnter: (datei, ziel, texte) => anmerkungSeite.pruefeAnmerkungenUnter(page, ziel, texte.map(text => ({ text, stelle: `${datei}:${ziel.neu}` }))),
    keineAnmerkungUnter: ziel => anmerkungSeite.pruefeAnmerkungenUnter(page, ziel, []),
    anzahlAnmerkungszeilen: anzahl => anmerkungSeite.pruefeAnzahlAnmerkungszeilen(page, anzahl),
    anmerkungszeilenSindKeineDiffzeilen: () => anmerkungSeite.pruefeAnmerkungszeilenSindKeineDiffzeilen(page),
    hinweisEntfernt: text => anmerkungSeite.pruefeHinweisEntfernt(page, text),
    keinHinweisEntfernt: () => anmerkungSeite.pruefeKeinHinweisEntfernt(page),
    hinweisAusserhalb: text => anmerkungSeite.pruefeHinweisAusserhalb(page, text),
    keinHinweisAusserhalb: () => anmerkungSeite.pruefeKeinHinweisAusserhalb(page),

    inDenDiffTabben: () => anmerkungSeite.inDenDiffTabben(page),
    pfeilAbBis: neu => anmerkungSeite.pfeilAbBis(page, neu),
    taste: name => anmerkungSeite.taste(page, name),
    fokusAufZeile: ziel => anmerkungSeite.pruefeFokusAufZeile(page, ziel),

    serverAntwortetBeimAnlegen: antwort => anmerkungSeite.anlegenAntwortetEinmal(page, antwort),
    anlegenVerzoegern: () => anmerkungSeite.anlegenVerzoegern(page),

    /** Anmerkung über die Schnittstelle (wie `curl`), am Commit `commit` mit vollem Hash. */
    ueberDieSchnittstelleAnlegen: async (commit, datei, zeile, text) => {
      const antwort = await gr.anmerkungAnlegen(lauf, { commit: hash(commit), datei, zeile, text });
      expect(antwort.status, `Anlegen ${datei}:${zeile}`).toBe(201);
    },
    seiteOeffnen: oeffneSeite,
    anmerkungenRechtzeitigNachKlick: (datei, erwartet) => anmerkungSeite.pruefeAnmerkungenBinnen(page, () => seite.dateiWaehlen(page, datei), erwartet, LADEFRIST_MS),

    fremderTextBleibtText: async () => {
      await anmerkungSeite.pruefeAnmerkungOhneHtml(page);
      await seite.pruefeKeineFormatierung(page);
      await dialogePruefen();
    },
    sichtbarerAnmerkungstext: () => anmerkungSeite.sichtbarerAnmerkungstext(page),

    beendenUndErgebnisLesen,
    stdoutBisher: () => gr.ergebnis(lauf),
    stderrBisher: () => lauf.stderr,
  };
}

const test = basis.extend({
  anm: async ({ gr, page }, verwenden) => {
    await verwenden(annotierSprache(gr, page));
  },
});

module.exports = { test, expect };
