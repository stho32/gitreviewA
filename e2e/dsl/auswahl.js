'use strict';
// Testsprache für die Auswahl der Commits: Bereiche, stdin und Grenze. Baut auf der Testsprache `gr` auf.
const fs = require('fs');
const path = require('path');
const { test: grundtest, expect } = require('./gitreviewa.js');
const verlauf = require('../treiber/verlauf-repo.js');
const { repoEntfernen } = require('../treiber/wegwerf-repo.js');
const { programmStarten, programmImTerminalStarten, adresseAbwarten, programmBeenden } = require('../treiber/programm.js');
const oberflaeche = require('../treiber/oberflaeche.js');

const STARTZEILE_FRIST_MS = 2000;
const ENDE_FRIST_MS = 20000;
const STARTZEILE = 'http://127.0.0.1';
const WARNUNG = / WARNUNG \[/;

function auswahlWelt(gr) {
  const ordnerZumAufraeumen = [];
  const laeufe = [];

  function merken(angelegt) {
    ordnerZumAufraeumen.push(angelegt.ordner);
    return { repo: { ordner: angelegt.ordner }, ...angelegt };
  }

  function starten(repo, argumente, { eingabe, umgebung = {} } = {}) {
    const lauf = programmStarten(repo.ordner, [...argumente, '--kein-browser'], umgebung, eingabe);
    laeufe.push(lauf);
    return lauf;
  }

  async function startzeileAbwarten(lauf) {
    lauf.adresse = await adresseAbwarten(lauf, STARTZEILE_FRIST_MS);
    lauf.sekundenBisStartzeile = (Date.now() - lauf.gestartetUmMs) / 1000;
    return lauf;
  }

  async function ende(lauf, gitAttrappe) {
    const exitCode = await endeAbwarten(lauf);
    const abschluss = {
      exitCode,
      meldung: lauf.stderr,
      serverGestartet: lauf.stderr.includes(STARTZEILE),
      sekundenNachStart: (Date.now() - lauf.gestartetUmMs) / 1000,
    };
    if (gitAttrappe) {
      abschluss.gitGestartet = gitAttrappe.wurdeGestartet();
    }
    return abschluss;
  }

  async function endeAbwarten(lauf) {
    let frist;
    const fristAbgelaufen = new Promise((_, abgelaufen) => {
      frist = setTimeout(() => abgelaufen(new Error(`gitreviewA lief nach ${ENDE_FRIST_MS} ms noch; stderr: ${lauf.stderr}`)), ENDE_FRIST_MS);
    });
    try {
      return await Promise.race([lauf.beendet, fristAbgelaufen]);
    } finally {
      clearTimeout(frist);
    }
  }

  function stdinText(zeilen, zeilenende = '\n') {
    return zeilen.map(zeile => `${zeile}${zeilenende}`).join('');
  }

  return {
    verlaufAbisE: () => merken(verlauf.verlaufAbisEAnlegen()),
    verlaufMitMerge: () => merken(verlauf.verlaufMitMergeAnlegen()),
    zweigNebenMain: () => merken(verlauf.zweigNebenMainAnlegen()),
    verlaufMitCommits: anzahl => merken(verlauf.verlaufMitCommitsAnlegen(anzahl)),
    verlaufMitSignaturMarker: () => merken(verlauf.verlaufMitSignaturMarkerAnlegen()),

    listeVonGit: (repo, bereich) => verlauf.revList(repo.ordner, bereich),

    bereicheReviewen: (repo, bereiche) => startzeileAbwarten(starten(repo, bereiche)),

    ueberStdinReviewen: (repo, zeilen, { zeilenende } = {}) => startzeileAbwarten(starten(repo, ['-'], { eingabe: { text: stdinText(zeilen, zeilenende) } })),

    mitOffenerStillerEingabeReviewen: (repo, argumente) => startzeileAbwarten(starten(repo, argumente, { eingabe: { offen: true } })),

    /** Die Commits der Auswahl, wie die Oberfläche sie bekommt: volle Hashes in Anzeigereihenfolge. */
    async gezeigteCommits(lauf) {
      const antwort = await gr.commitsAbfragen(lauf);
      return JSON.parse(antwort.koerper).map(commit => commit.hash);
    },

    /** Aufruf mit einer git-Attrappe vorne im PATH: zeigt, ob gitreviewA git überhaupt gestartet hätte. */
    async aufrufOhneGitErwarten(repo, argumente) {
      const attrappe = gr.gitAttrappe();
      const umgebung = { PATH: `${attrappe.ordner}${path.delimiter}${process.env.PATH}` };
      return ende(starten(repo, argumente, { umgebung }), attrappe);
    },

    async stdinOhneGitErwarten(repo, zeilen) {
      const attrappe = gr.gitAttrappe();
      const umgebung = { PATH: `${attrappe.ordner}${path.delimiter}${process.env.PATH}` };
      return ende(starten(repo, ['-'], { umgebung, eingabe: { text: stdinText(zeilen) } }), attrappe);
    },

    mitOffenerStillerEingabeAufrufen: (repo, argumente) => ende(starten(repo, argumente, { eingabe: { offen: true } })),

    imTerminalAufrufen(repo, argumente) {
      const lauf = programmImTerminalStarten(repo.ordner, [...argumente, '--kein-browser']);
      laeufe.push(lauf);
      return ende(lauf);
    },

    dateiPwnExistiert: repo => fs.existsSync(path.join(repo.ordner, 'pwn')),

    /** `weg` ist 'Bereich' (Basis..HEAD) oder 'stdin' (die Hashes, neuester zuerst). */
    alleCommitsReviewen(viele, weg) {
      if (weg === 'Bereich') {
        return startzeileAbwarten(starten(viele.repo, [`${viele.basis}..HEAD`]));
      }
      return startzeileAbwarten(starten(viele.repo, ['-'], { eingabe: { text: stdinText(viele.hashes) } }));
    },

    alleCommitsAufrufen(viele, weg) {
      if (weg === 'Bereich') {
        return ende(starten(viele.repo, [`${viele.basis}..HEAD`]));
      }
      return ende(starten(viele.repo, ['-'], { eingabe: { text: stdinText(viele.hashes) } }));
    },

    /** Öffnet die Oberfläche und misst vom Prozessstart, bis die Liste `anzahl` Zeilen hat (ereignisgenau). */
    async sekundenBisAlleZeilenSichtbar(page, lauf, anzahl) {
      await page.goto(lauf.adresse);
      await oberflaeche.aufZeilenWarten(page, anzahl);
      return (Date.now() - lauf.gestartetUmMs) / 1000;
    },

    warnungen: lauf => gr.stderrZeilen(lauf).filter(zeile => WARNUNG.test(zeile)),

    async aufraeumen() {
      for (const lauf of laeufe) {
        await programmBeenden(lauf);
      }
      for (const ordner of ordnerZumAufraeumen) {
        repoEntfernen(ordner);
      }
    },
  };
}

const test = grundtest.extend({
  auswahl: async ({ gr }, verwenden) => {
    const welt = auswahlWelt(gr);
    await verwenden(welt);
    await welt.aufraeumen();
  },
});

module.exports = { test, expect };
