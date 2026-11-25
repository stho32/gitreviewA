'use strict';
// Testsprache „Nächste ungeprüfte“ (R00028): Repos und Commits heißen wie in der User Story — Repo Z mit z1/z2/z3 (drei Dateien in
// „Zusammen“, sechs Stellen in „Einzeln“), Repo N mit `v` (zehn Stellen, drei gesperrt). „Nächste ungeprüfte“ = den Knopf in der
// Werkzeugzeile der Dateiliste betätigen. Treiber darunter kennen Seite, Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const hakenSeite = require('../treiber/haken-oberflaeche.js');
const naechsteSeite = require('../treiber/naechste-oberflaeche.js');
const beobachtung = require('../treiber/beobachtung.js');
const repos = require('../treiber/diff-repos.js');
const fremdeNamen = require('../treiber/fremde-namen-repo.js');

const FENSTER = { width: 1280, height: 800 };

const VORBEREITUNGEN = {
  'Repo Z': { anlegen: ordner => repos.repoZ(ordner), commits: ['z1', 'z2', 'z3'] },
  'Repo N mit v': { anlegen: ordner => fremdeNamen.repoNMitV(ordner), commits: ['n', 'v'] },
  'viele Dateien': {
    ausWelt: gr => {
      const repo = gr.repoMitGrossemCommit(60);
      return { ordner: repo.ordner, hashes: { p: repo.p, u: repo.u } };
    },
    commits: ['p', 'u'],
  },
};

function naechsteSprache(gr, page) {
  let repo;
  let lauf;
  let zaehlerGit;
  const hash = name => repo.hashes[name];

  async function starten({ vorbereitung = 'Repo Z', commits, modus = 'zusammen', ohneSeite = false } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.ausWelt ? art.ausWelt(gr) : art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    const auswahl = commits || art.commits;
    zaehlerGit = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    lauf = await gr.gitreviewAStarten({ ordner: repo.ordner }, auswahl.map(hash), { pfadVorne: zaehlerGit.ordner });
    if (!ohneSeite) {
      await page.setViewportSize(FENSTER);
      await gr.oberflaecheOeffnen(page, lauf, modus);
    }
    return lauf;
  }

  return {
    starten,
    hash,
    kurz: name => hash(name).slice(0, 7),

    /** Wartet, bis die Dateiliste der gezeigten Sicht `anzahl` Zeilen hat. */
    dateienWarten: anzahl => seite.aufDateizeilenWarten(page, anzahl),
    dateiWaehlen: pfad => seite.dateiWaehlen(page, pfad),
    commitAnsehen: name => seite.commitWaehlen(page, kurzerName(name)),
    abhaken: name => hakenSeite.kaestchenBetaetigen(page, name),
    fortschritt: text => hakenSeite.pruefeFortschritt(page, text),
    modusWaehlen: modus => seite.modusWaehlen(page, modus),
    neuLaden: () => seite.neuLaden(page),

    springen: () => naechsteSeite.springen(page),
    springenPerTastatur: () => naechsteSeite.springenPerTastatur(page),
    fokusAufKnopf: () => naechsteSeite.pruefeFokusAufKnopf(page),
    knopfname: () => naechsteSeite.pruefeKnopfname(page),
    knopfBedienbar: () => naechsteSeite.pruefeKnopfBedienbar(page),
    knopfNichtBedienbar: () => naechsteSeite.pruefeKnopfNichtBedienbar(page),
    meldung: text => naechsteSeite.pruefeMeldung(page, text),
    meldungLesen: () => naechsteSeite.meldungLesen(page),
    zeileImBlick: pfad => naechsteSeite.pruefeZeileImBlick(page, pfad),
    diffAntwortVerzoegern: ms => naechsteSeite.diffAntwortVerzoegern(page, ms),
    leererDiffKnopf: sichtbar => naechsteSeite.pruefeLeerenDiffKnopf(page, sichtbar),
    leererDiffKnopfname: () => naechsteSeite.pruefeLeerenDiffKnopfname(page),
    leerenDiffKnopfBetaetigen: () => naechsteSeite.leerenDiffKnopfBetaetigen(page),

    /** Die Stelle, auf der der Sprung gelandet sein soll: gewählte Datei, ihr Diff — und in „Einzeln“ der Commit. */
    diffEnthaelt: text => naechsteSeite.pruefeDiffEnthaelt(page, text),
    gewaehlteZeileLesbar: () => naechsteSeite.pruefeGewaehlteZeileLesbar(page),
    gewaehlteZeileAbhaken: () => naechsteSeite.gewaehlteZeileAbhaken(page),
    stelle: async (pfad, commitName) => {
      await naechsteSeite.pruefeGewaehlt(page, pfad);
      await naechsteSeite.pruefeDiffGeladen(page, pfad);
      if (commitName) {
        await naechsteSeite.pruefeGezeigtenCommit(page, hash(commitName));
      }
    },
    /** Prüft die Reihe der Sprünge in einem Zug; jeder Eintrag ist ein Pfad oder `[Pfad, Commitname]`. */
    reihe: async eintraege => {
      for (const eintrag of eintraege) {
        const [pfad, commitName] = Array.isArray(eintrag) ? eintrag : [eintrag, null];
        await naechsteSeite.springen(page);
        await naechsteSeite.pruefeGewaehlt(page, pfad);
        if (commitName) {
          await naechsteSeite.pruefeGezeigtenCommit(page, hash(commitName));
        }
      }
    },
    gewaehlteZeilen: () => naechsteSeite.gewaehlteZeilen(page),
    gezeigterCommit: () => naechsteSeite.gezeigterCommit(page),

    /** Die Zahl der git-Aufrufe je Unterbefehl (`uebersicht` ist `git log --numstat`). */
    gitAufrufe: erwartet => beobachtung.pruefeGitAufrufe(zaehlerGit, erwartet),
    gitAufrufeJetzt: () => zaehlerGit.aufrufe().length,
    stderr: () => lauf.stderr,
    ergebnis: () => lauf.stdout,
    lauf: () => lauf,
  };

  function kurzerName(name) {
    return hash(name).slice(0, 7);
  }
}

const test = basis.extend({
  naechste: async ({ gr, page }, verwenden) => {
    await verwenden(naechsteSprache(gr, page));
  },
});

module.exports = { test, expect };
