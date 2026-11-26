'use strict';
// Testsprache „Abgehakte ausblenden“ (R00029): die Repos Z, Q und N plus v aus der User Story; der Schalter in der Werkzeugzeile
// der Dateiliste blendet abgehakte Einträge aus (eine Sicht, kein Serverweg). Die Treiber darunter kennen Seite, Prozess und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const hakenSeite = require('../treiber/haken-oberflaeche.js');
const schnittstelle = require('../treiber/haken-schnittstelle.js');
const beobachtung = require('../treiber/beobachtung.js');
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
    case 'Z': {
      const repo = gr.gemerktesRepo(diffRepos.repoZ(path.join(gr.eigenerOrdner(), 'repo')));
      return { repo, namen: ['z1', 'z2', 'z3'], hashes: repo.hashes };
    }
    case 'Q': {
      const repo = gr.repoMitDateien({ ...REPO_Q });
      return { repo, namen: ['i1'], hashes: { i1: repo.hash } };
    }
    case 'N mit v': {
      const repo = gr.gemerktesRepo(fremdeNamen.repoNMitV(path.join(gr.eigenerOrdner(), 'repo')));
      return { repo, namen: ['n', 'v'], hashes: repo.hashes };
    }
    case 'gross': {
      const repo = gr.repoMitGrossemCommit(2000);
      return { repo, namen: ['u'], hashes: { p: repo.p, u: repo.u } };
    }
    default:
      throw new Error(`unbekannte Vorbereitung: ${vorbereitung}`);
  }
}

function sprache(gr, page) {
  let repo;
  let lauf;
  let namen;
  let hashes;
  let zaehlerGit;

  function hash(name) {
    return hashes[name];
  }

  async function starten({ vorbereitung = 'Z', modus = 'zusammen', zusatz = [], commits = null, zaehlen = false } = {}) {
    const angelegt = repoAnlegen(gr, vorbereitung);
    repo = angelegt.repo;
    namen = angelegt.namen;
    hashes = angelegt.hashes;
    const auswahl = (commits || namen).map(name => hash(name));
    if (zaehlen) {
      zaehlerGit = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    }
    lauf = await gr.gitreviewAStarten({ ordner: repo.ordner }, auswahl, { zusatz, pfadVorne: zaehlerGit ? zaehlerGit.ordner : undefined });
    if (page) {
      await gr.oberflaecheOeffnen(page, lauf, modus);
    }
    return lauf;
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
    hash,
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
    commitAnsehen: name => seite.commitWaehlen(page, hash(name).slice(0, 7)),
    gewaehlteDateien: namen2 => seite.pruefeGewaehlteDateien(page, namen2),
    modusWaehlen: modus => seite.modusWaehlen(page, modus),
    darstellungWaehlen: darstellung => seite.darstellungWaehlen(page, darstellung),
    neuLaden: () => seite.neuLaden(page),
    aufZeilen: anzahl => seite.aufDateizeilenWarten(page, anzahl),
    /** Der Pfad steht ganz im zugänglichen Namen (R00039); die Anzeige darf in der Mitte gekürzt sein. */
    diffPfad: () => page.locator('#diff .diff-pfad').getAttribute('aria-label'),
    /** Setzt einen Haken über `POST /api/haken` (Prozessprobe). */
    ueberDieSchnittstelleAbhaken: (name, datei, abgehakt = true) => schnittstelle.hakenSetzen(lauf.adresse, { commit: hash(name), datei, abgehakt }),
    beendenAnfordern: () => gr.beendenAnfordern(lauf),
    aufEnde: () => gr.aufEndeWarten(lauf),
    stdout: () => lauf.stdout,
    stderr: () => lauf.stderr,
    gitAufrufe: () => (zaehlerGit ? zaehlerGit.aufrufe() : []),
    lauf: () => lauf,
    adresse: () => lauf.adresse,
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
