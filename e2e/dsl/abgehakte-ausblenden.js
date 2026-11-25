'use strict';
// Testsprache „Abgehakte ausblenden“ (R00029): die Repos Z, Q und N plus v aus der User Story; der Schalter in der Werkzeugzeile
// der Dateiliste blendet abgehakte Einträge aus (eine Sicht, kein Serverweg). Die Treiber darunter kennen Seite, Prozess und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const hakenSeite = require('../treiber/haken-oberflaeche.js');
const diffRepos = require('../treiber/diff-repos.js');
const fremdeNamen = require('../treiber/fremde-namen-repo.js');

// Repo Q aus R00025: `i1` legt sieben Dateien an; `build/out.log` bildet den Ordner `build` allein.
const REPO_Q = {
  'README.md': 'a\nb\n',
  'src/a.txt': '1\n2\n3\n',
  'src/b.txt': '1\n2\n',
  'docs/README.md': 'x\n',
  'app.lock': 'lock\n',
  'build/out.log': 'log\n',
  'src/generated/api.cs': 'class X {}\n',
};

function repoAnlegen(gr, vorbereitung) {
  switch (vorbereitung) {
    case 'Z':
      return { repo: gr.gemerktesRepo(diffRepos.repoZ(path.join(gr.eigenerOrdner(), 'repo'))), namen: ['z1', 'z2', 'z3'] };
    case 'Q':
      return { repo: gr.repoMitDateien({ ...REPO_Q }), namen: ['i1'] };
    case 'N mit v':
      return { repo: gr.gemerktesRepo(fremdeNamen.repoNMitV(path.join(gr.eigenerOrdner(), 'repo'))), namen: ['n', 'v'] };
    default:
      throw new Error(`unbekannte Vorbereitung: ${vorbereitung}`);
  }
}

function sprache(gr, page) {
  let repo;
  let lauf;
  let namen;

  async function starten({ vorbereitung = 'Z', modus = 'zusammen', zusatz = [], commits = null } = {}) {
    const angelegt = repoAnlegen(gr, vorbereitung);
    repo = angelegt.repo;
    namen = angelegt.namen;
    const auswahl = (commits || namen).map(name => hash(name));
    lauf = await gr.gitreviewAStarten({ ordner: repo.ordner }, auswahl, { zusatz });
    if (page) {
      await gr.oberflaecheOeffnen(page, lauf, modus);
    }
    return lauf;
  }

  function hash(name) {
    return (repo.hashes ? repo.hashes[name] : undefined) ?? repo.hash;
  }

  async function dateinamen() {
    const eintraege = await gr.dateilisteLesen(page);
    return eintraege.filter(eintrag => !eintrag.ordner).map(eintrag => eintrag.name);
  }

  async function ordnernamen() {
    const eintraege = await gr.dateilisteLesen(page);
    return eintraege.filter(eintrag => eintrag.ordner).map(eintrag => eintrag.name);
  }

  return {
    starten,
    hash: name => (repo.hashes ? repo.hashes[name] : undefined) ?? repo.hash,
    kurz: name => hash(name).slice(0, 7),
    dateinamen,
    ordnernamen,
    /** Die Namen der Dateizeilen in Anzeigereihenfolge oder im Baum (Ordnerzeilen mit `ordner:` gekennzeichnet). */
    listenEintraege: async () => (await gr.dateilisteLesen(page)).map(eintrag => (eintrag.ordner ? `ordner:${eintrag.name}` : eintrag.name)),
    schalterBetatigen: () => seite.abgehakteSchalterBetatigen(page),
    schalterIst: an => seite.pruefeAbgehakteSchalter(page, an),
    hinweis: text => expect(seite.abgehakteHinweis(page)).toHaveText(text),
    zaehler: text => expect(gr.ausblendenZaehler(page)).toHaveText(text),
    abhaken: name => hakenSeite.kaestchenBetaetigen(page, name),
    abhakenMitPfad: pfad => hakenSeite.kaestchenMitPfadBetaetigen(page, pfad),
    fortschritt: text => hakenSeite.pruefeFortschritt(page, text),
    dateiAnsehen: name => seite.dateiWaehlen(page, name),
    dateiMitPfadAnsehen: pfad => seite.dateiMitPfadWaehlen(page, pfad),
    gewaehlteDateien: namen => seite.pruefeGewaehlteDateien(page, namen),
    modusWaehlen: modus => seite.modusWaehlen(page, modus),
    darstellungWaehlen: darstellung => seite.darstellungWaehlen(page, darstellung),
    neuLaden: () => seite.neuLaden(page),
    aufZeilen: anzahl => seite.aufDateizeilenWarten(page, anzahl),
    diffPfad: () => page.locator('#diff .diff-pfad').textContent(),
    lauf: () => lauf,
    adresse: () => lauf.adresse,
    gitAufrufe: () => lauf,
  };
}

const test = basis.extend({
  abgehakte: async ({ gr, page }, verwenden) => {
    await verwenden(sprache(gr, page));
  },
  /** Dieselbe Sprache ohne Seite: Programm als Prozess (stdout, Aufrufzählung). */
  abgehakteProgramm: async ({ gr }, verwenden) => {
    await verwenden(sprache(gr, null));
  },
});

module.exports = { test, expect, REPO_Q };
