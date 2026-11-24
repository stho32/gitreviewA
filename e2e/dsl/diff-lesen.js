'use strict';
// Testsprache „Diff einer Datei lesen“ (R00004): Commits und Repos heißen wie in der User Story (A mit p, q, s; M mit m; U mit u);
// die Sprache kennt ihre Hashes, die Treiber darunter kennen Seite, Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const schnittstelle = require('../treiber/diff-schnittstelle.js');
const beobachtung = require('../treiber/beobachtung.js');
const repos = require('../treiber/diff-repos.js');

const FENSTER = { width: 1280, height: 800 };
const ZEILE_FRIST_MS = 1000;

const VORBEREITUNGEN = {
  'Repo A': { anlegen: repos.repoA, commits: ['q', 'p'] },
  'Diff-Programme': { anlegen: repos.repoAMitDiffProgrammen, commits: ['q', 'p'] },
  'fremde Einstellungen': { anlegen: repos.repoAMitFremdenEinstellungen, commits: ['q', 'p'] },
  Merge: { anlegen: repos.repoM, commits: ['m'] },
  'Bidi im Dateinamen': { anlegen: repos.repoMitBidiPfad, commits: ['b'] },
  '20 000 Zeilen': { anlegen: repos.repoU, commits: ['u'] },
};

function diffSprache(gr, page) {
  let repo;
  let lauf;
  let zaehler;
  let dialogePruefen;
  const hash = name => repo.hashes[name];
  const kurz = name => hash(name).slice(0, 7);

  /** Startet gitreviewA im Repo der Vorbereitung und öffnet die Seite (Fenster 1280 × 800). */
  async function starten({ vorbereitung = 'Repo A', commits, verbose = false, seiteOeffnen = true } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    zaehler = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    let namen = commits;
    if (!namen) {
      namen = art.commits;
    }
    const zusatz = [];
    if (verbose) {
      zusatz.push('--verbose');
    }
    lauf = await gr.gitreviewAStarten(repo, namen.map(hash), { zusatz, pfadVorne: zaehler.ordner });
    if (seiteOeffnen) {
      await page.setViewportSize(FENSTER);
      dialogePruefen = seite.dialogeZaehlen(page);
      await gr.oberflaecheOeffnen(page, lauf);
    }
  }

  /** `kennung`: Name eines Commits, `q kurz` für dessen erste 7 Zeichen oder ein Revisionsausdruck wie `HEAD`; Standard ist `q`. */
  function kennungAlsText(kennung) {
    if (kennung === 'q kurz') {
      return kurz('q');
    }
    if (kennung in repo.hashes) {
      return hash(kennung);
    }
    return kennung;
  }

  return {
    starten,
    commitGewaehlt: commit => seite.pruefeGewaehlterCommit(page, kurz(commit)),
    commitAnsehen: commit => seite.commitWaehlen(page, kurz(commit)),
    dateiAnsehen: name => seite.dateiWaehlen(page, name),
    dateienSind: async namen => {
      await expect.poll(async () => (await seite.dateilisteLesen(page)).map(eintrag => eintrag.name).sort()).toEqual([...namen].sort());
    },

    diffZeigt: erwartet => diffSeite.pruefeDiff(page, erwartet),
    diffMeldet: (pfad, text) => diffSeite.pruefeMeldung(page, pfad, text, false),
    diffMeldetFehler: (pfad, text) => diffSeite.pruefeMeldung(page, pfad, text, true),
    fordertZurWahlAuf: () => diffSeite.pruefeAufforderungZurWahl(page),
    umbruchUmschalten: () => diffSeite.umbruchUmschalten(page),
    langeZeileEinzeilig: (neu, text) => diffSeite.pruefeEinzeilig(page, neu, text),
    langeZeileUmbrochen: (neu, text) => diffSeite.pruefeUmbrochen(page, neu, text),
    fremderTextBleibtText: async () => {
      await seite.pruefeKeineFormatierung(page);
      await dialogePruefen();
    },
    antwortVerzoegern: pfad => diffSeite.diffAntwortVerzoegern(page, pfad),

    diffsGelesen: (commit, anzahl) => schnittstelle.pruefeDiffsGelesen(lauf, hash(commit), anzahl),
    commitObjektEntfernen: commit => gr.commitObjektEntfernen(repo, hash(commit)),
    fehlerProtokolliertFuer: (commit, pfad) => schnittstelle.pruefeFehlerzeileMit(lauf, hash(commit), pfad),
    ergebnisBleibtLeer: () => beobachtung.pruefeStdoutLeer(lauf),

    keinDiffProgrammGelaufen: () => {
      expect(repos.markerVorhanden(repo.ordner), 'Markerdateien der Diff-Programme').toEqual([]);
      repos.diffProgrammOhneSchutzStarten(repo.ordner, hash('q'));
      expect(repos.markerVorhanden(repo.ordner), 'Kontrolle: git show ohne Schutz startet textconv').toContain('marker-textconv');
    },

    diffAnfrageAbgewiesen: ({ kennung = 'q', pfad }) => schnittstelle.pruefeDiffAntwort(lauf, { hash: kennungAlsText(kennung), pfad, status: 404 }),
    diffAnfrageOhnePfadAbgewiesen: () => schnittstelle.pruefeDiffAntwort(lauf, { hash: hash('q'), pfad: undefined, status: 400 }),
    diffAnfrageBeantwortet: async ({ pfad }) => {
      await schnittstelle.pruefeDiffAntwort(lauf, { hash: hash('q'), pfad, status: 200 });
      schnittstelle.pruefeEinDiffAufruf(zaehler);
    },
    keinDiffGelesen: () => schnittstelle.pruefeKeinDiffAufruf(zaehler),
    keineDateiAngelegt: name => beobachtung.pruefeDateiFehlt(repo.ordner, name),

    /** Zeile `neu` binnen 1 s nach dem Klick auf `datei`; liefert den Messwert. */
    zeileRechtzeitigNachKlick: (datei, erwartet) => diffSeite.pruefeZeileBinnenNachKlick(page, () => seite.dateiWaehlen(page, datei), erwartet, ZEILE_FRIST_MS),
  };
}

const test = basis.extend({
  diff: async ({ gr, page }, verwenden) => {
    await verwenden(diffSprache(gr, page));
  },
});

module.exports = { test, expect };
