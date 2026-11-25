'use strict';
// Testsprache „Ausblenden“ (R00025): Repo Q und Prozessprüfungen am echten Programm (Exit-Codes, stdout/stderr, git-Aufrufe).
// Der Glob-Abgleich selbst wird als Baustein geprüft (ausblenden-werte.spec.js); hier zählen Aufruf, Protokoll und Ergebnis.
const fs = require('fs');
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const repos = require('../treiber/wegwerf-repo.js');
const beobachtung = require('../treiber/beobachtung.js');
const schnittstelle = require('../treiber/haken-schnittstelle.js');

const REPO_Q = {
  'README.md': 'a\nb\n',
  'src/a.txt': '1\n2\n3\n',
  'src/b.txt': '1\n2\n',
  'docs/README.md': 'x\n',
  'app.lock': 'lock\n',
  'build/out.log': 'log\n',
  'src/generated/api.cs': 'class X {}\n',
};

/** Ein Repo mit Marker-Skripten in der Konfiguration: log.showSignature, gpg.program, diff.external und diff.<treiber>.textconv. */
function fremdKonfiguriertesRepo() {
  const ordner = repos.leeresRepoAnlegen();
  repos.dateiSchreiben(ordner, 'README.md', 'a\nb\n');
  repos.dateiSchreiben(ordner, 'app.lock', 'lock\n');
  const hash = repos.commitAnlegen(ordner, { betreff: 'Anlegen' });
  const marke = path.join(ordner, '.git', 'marker-lief');
  const skript = path.join(ordner, '.git', 'marker.sh');
  fs.writeFileSync(skript, `#!/bin/sh\ntouch '${marke}'\ncat "$1" 2>/dev/null\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(ordner, '.git', 'info', 'attributes'), '* diff=marker\n');
  for (const [schluessel, wert] of [['diff.external', skript], ['diff.marker.textconv', skript], ['log.showSignature', 'true'], ['gpg.program', skript]]) {
    repos.git(ordner, 'config', schluessel, wert);
  }
  return { ordner, hash, marke };
}

function programmSprache(gr) {
  let repo;
  let lauf;
  let zaehlerGit;

  function repoAnlegen(dateien) {
    repo = gr.repoMitDateien(dateien || { ...REPO_Q });
    return repo;
  }

  function zaehlerAnlegen() {
    zaehlerGit = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    return zaehlerGit;
  }

  /** `erwarteStart` false: der Aufruf wird gestartet, ohne auf die Startzeile zu warten (Prozessprobe für einen ungültigen Aufruf). */
  async function starten({ dateien = null, zusatz = [], erwarteStart = true, mitBrowser = false, fremd = null } = {}) {
    if (fremd) {
      repo = fremd;
    } else {
      repoAnlegen(dateien);
    }
    zaehlerAnlegen();
    const optionen = { zusatz, mitBrowser, pfadVorne: zaehlerGit.ordner };
    if (erwarteStart) {
      lauf = await gr.gitreviewAStarten(repo, [repo.hash], optionen);
    } else {
      lauf = gr.gitreviewAAufrufen(repo, [repo.hash], optionen);
    }
    return lauf;
  }

  /** Die von beiden Läufen gemeinsam genutzte Folge: Commits, Dateiliste des Commits, Beenden. */
  async function laufMit(rezept, zusatz) {
    await starten({ fremd: rezept, zusatz });
    await gr.commitsAbfragen(lauf);
    await gr.dateienAbfragen(lauf, repo.hash);
    await gr.beendenAnfordern(lauf);
    await gr.aufEndeWarten(lauf);
    return { aufrufe: [...zaehlerGit.aufrufe()], marke: Boolean(rezept.marke) && fs.existsSync(rezept.marke) };
  }

  return {
    repoAnlegen,
    zaehlerAnlegen,
    starten,
    laufMit,
    fremdKonfiguriertesRepo,
    hash: () => repo.hash,
    lauf: () => lauf,
    adresse: () => lauf.adresse,
    stdout: () => lauf.stdout,
    stderr: () => lauf.stderr,
    stderrZeilen: () => gr.stderrZeilen(lauf),
    aufEnde: fristMs => gr.aufEndeWarten(lauf, fristMs),
    beendenAnfordern: () => gr.beendenAnfordern(lauf),
    ergebnis: () => gr.ergebnis(lauf),
    gitAufrufe: () => zaehlerGit.aufrufe(),
    ueberDieSchnittstelleAbhaken: (datei, abgehakt = true) => schnittstelle.hakenSetzen(lauf.adresse, { commit: repo.hash, datei, abgehakt }),
    laufAbbrechen: () => gr.laufAbbrechen(lauf),
    keineDateiAngelegt: name => beobachtung.pruefeDateiFehlt(repo.ordner, name),
  };
}

const test = basis.extend({
  ausblendenProgramm: async ({ gr }, verwenden) => {
    await verwenden(programmSprache(gr));
  },
});

module.exports = { test, expect, REPO_Q, fremdKonfiguriertesRepo };
