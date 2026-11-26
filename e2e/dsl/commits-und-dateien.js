'use strict';
// Testsprache „Commits und Dateien sehen“ (R00003): Commits heißen nach der Vorbereitung der Anforderung (p, q, r, s, t, u);
// die Sprache kennt ihre Hashes, die Treiber darunter kennen Seite, Prozess und git.
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const beobachtung = require('../treiber/beobachtung.js');
const { anzeigeSchrankeMs } = require('./schranken.js');

const AUTOR_MIT_HTML = 'Mallory &lt;i&gt; &amp; Co';
const PFAD_MIT_RICHTUNGSZEICHEN = 'a\u202Eb\u2066c\u200F.txt';

/** Repos je Vorbereitung; jedes liefert Ordner und die Hashes je Name. */
function repoAnlegen(gr, art) {
  switch (art) {
    case 'vorbereitung': {
      const repo = gr.repoMitVorbereitung();
      return { ordner: repo.ordner, hashes: { p: repo.p, q: repo.q, r: repo.r } };
    }
    case 'fremder Text': {
      // git entfernt spitze Klammern aus Autornamen; HTML-Text im Autor steht deshalb als Entität da, die nicht gedeutet werden darf
      const repo = gr.repoMitFremdemText({ autor: AUTOR_MIT_HTML, betreff: '<script>alert(1)</script>', rumpf: '<b>fett</b>' });
      return { ordner: repo.ordner, hashes: { s: repo.hash } };
    }
    case 'Sonderzeichen': {
      const repo = gr.repoMitDateien({ 'ä ö.txt': 'eins\n', '<b>fett</b>.txt': 'zwei\n' });
      return { ordner: repo.ordner, hashes: { t: repo.hash } };
    }
    case 'Richtungszeichen': {
      const repo = gr.repoMitDateien({ [PFAD_MIT_RICHTUNGSZEICHEN]: 'eins\n', 'o\u202Er/ä ö.txt': 'zwei\n' });
      return { ordner: repo.ordner, hashes: { v: repo.hash } };
    }
    case 'Start im Unterordner': {
      // gitreviewA läuft im Unterordner `unten`; das Repo will Pfade relativ dazu zeigen
      const repo = gr.repoMitUnterordner();
      return { ordner: repo.startordner, hashes: { w: repo.hash } };
    }
    case '200 Commits': {
      const repo = gr.repoMitVielenCommits(200);
      const hashes = Object.fromEntries(repo.hashes.map((hash, index) => [`c${index + 1}`, hash]));
      return { ordner: repo.ordner, hashes };
    }
    case '2000 Dateien': {
      const repo = gr.repoMitGrossemCommit(2000);
      return { ordner: repo.ordner, hashes: { p: repo.p, u: repo.u } };
    }
    default:
      throw new Error(`unbekannte Vorbereitung: ${art}`);
  }
}

function reviewSprache(gr, page) {
  let repo;
  let lauf;
  let zaehler;
  let dialogePruefen;
  const hash = name => repo.hashes[name];
  const kurz = name => hash(name).slice(0, 7);

  /** Startet gitreviewA mit den genannten Commits und öffnet die Seite. */
  async function starten({ vorbereitung = 'vorbereitung', commits, verbose = false, alleCommits = false } = {}) {
    repo = repoAnlegen(gr, vorbereitung);
    zaehler = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    dialogePruefen = seite.dialogeZaehlen(page);
    let namen = commits;
    if (alleCommits) {
      namen = Object.keys(repo.hashes);
    }
    const zusatz = verbose ? ['--verbose'] : [];
    await page.goto('about:blank');
    lauf = await gr.gitreviewAStarten(repo, namen.map(hash), { zusatz, pfadVorne: zaehler.ordner });
    await gr.oberflaecheOeffnen(page, lauf);
  }

  /** `zeilen`: je Zeile `commit` (Name) und die Angaben, die zählen (betreff, autor, datum, zeitpunkt). */
  async function leisteZeigt(zeilen) {
    await seite.pruefeLeiste(page, zeilen.map(({ commit, zeitpunkt, ...angaben }) => {
      const erwartet = { kurzHash: kurz(commit), ...angaben };
      if (zeitpunkt) {
        erwartet.datumHinweis = zeitpunkt;
      }
      return erwartet;
    }));
  }

  return {
    starten,
    leisteZeigt,
    hash,
    messageUmschalten: commit => seite.messageUmschalten(page, kurz(commit)),
    messageVerborgen: commit => seite.pruefeMessageVerborgen(page, kurz(commit)),
    messageZeigt: (commit, text) => seite.pruefeMessage(page, kurz(commit), text),
    bietetMessage: commit => seite.pruefeMessageVerborgen(page, kurz(commit)),
    bietetKeineMessage: commit => seite.pruefeOhneMessage(page, kurz(commit)),
    fremderTextBleibtText: async () => {
      await seite.pruefeKeineFormatierung(page);
      await dialogePruefen();
    },
    commitAnsehen: commit => seite.commitWaehlen(page, kurz(commit)),
    commitGewaehlt: commit => seite.pruefeGewaehlterCommit(page, kurz(commit)),
    dateienZeigen: erwartet => seite.pruefeDateiliste(page, erwartet),
    dateilisteMeldet: text => seite.pruefeDateilistenMeldung(page, text),
    richtungszeichenNurAlsMarke: () => seite.pruefeRichtungszeichenNurAlsMarke(page),
    alsBaumZeigen: () => seite.darstellungWaehlen(page, 'baum'),
    flachZeigen: () => seite.darstellungWaehlen(page, 'flach'),
    dateiwahlenMitschreiben: () => seite.dateiwahlenSammeln(page),
    dateiAnsehen: name => seite.dateiWaehlen(page, name),
    gewaehlteDateien: namen => seite.pruefeGewaehlteDateien(page, namen),
    dateiwahlenWaren: wahlen => seite.pruefeDateiwahlen(page, wahlen.map(({ commit, ...rest }) => ({ commit: hash(commit), modus: 'einzeln', alterPfad: null, ...rest }))),
    antwortFuerDateienZurueckhalten: commit => seite.dateienAntwortZurueckhalten(page, hash(commit)),
    neuLaden: () => seite.neuLaden(page),
    commitObjektEntfernen: commit => gr.commitObjektEntfernen(repo, hash(commit)),

    /** `jeCommit`: Name → Zahl der Lesevorgänge (Debug-Zeile mit vollem Hash und git show). */
    dateilistenGelesen: async jeCommit => {
      const jeHash = Object.fromEntries(Object.entries(jeCommit).map(([commit, anzahl]) => [hash(commit), anzahl]));
      await beobachtung.pruefeDateienGelesen(lauf, jeHash);
      const summe = Object.values(jeCommit).reduce((a, b) => a + b, 0);
      await beobachtung.pruefeGitAufrufe(zaehler, { show: summe });
    },
    gitAufrufe: erwartet => beobachtung.pruefeGitAufrufe(zaehler, erwartet),
    dateienAnfrageAbgewiesen: async text => beobachtung.pruefeDateienAntwort(lauf, text, 404),
    dateienAnfrageBeantwortet: async commit => beobachtung.pruefeDateienAntwort(lauf, hash(commit), 200),
    keineDateiAngelegt: name => beobachtung.pruefeDateiFehlt(repo.ordner, name),
    fehlerProtokolliertFuer: commit => beobachtung.pruefeFehlerzeileMit(lauf, hash(commit)),
    ergebnisBleibtLeer: () => beobachtung.pruefeStdoutLeer(lauf),

    /** Alle Zeilen der Leiste sichtbar binnen der Anzeige-Schranke nach dem Prozessstart; liefert den Messwert. */
    leisteRechtzeitigVollstaendig: () => seite.pruefeZeilenBinnen(page, Object.keys(repo.hashes).length, lauf.gestartetUmMs, anzeigeSchrankeMs),
    /** `anzahl` Dateizeilen binnen der Anzeige-Schranke nach dem Klick auf den Commit; liefert den Messwert. */
    dateienRechtzeitigNachKlick: (commit, anzahl) => seite.pruefeDateizeilenBinnenNachKlick(page, kurz(commit), anzahl, anzeigeSchrankeMs),
  };
}

const test = basis.extend({
  review: async ({ gr, page }, verwenden) => {
    await verwenden(reviewSprache(gr, page));
  },
});

module.exports = { test, expect, AUTOR_MIT_HTML, PFAD_MIT_RICHTUNGSZEICHEN };
