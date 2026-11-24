'use strict';
// Testsprache: je Fachwort eine Funktion; Treiber darunter kennen Prozess, HTTP, git und Selektoren.
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const base = require('@playwright/test');
const { repoAnlegen, repoEntfernen } = require('../treiber/wegwerf-repo.js');
const { programmStarten, adresseAbwarten, programmBeenden, lauschendeAdressen } = require('../treiber/programm.js');
const { anfrage } = require('../treiber/http.js');
const oberflaeche = require('../treiber/oberflaeche.js');

const STARTZEILE_FRIST_MS = 2000;
const DREI_COMMITS = ['Erster Commit', 'Zweiter Commit', 'Dritter Commit'];

function welt() {
  const ordnerZumAufraeumen = [];
  const laeufe = [];

  function repoMitCommits(betreffe = DREI_COMMITS) {
    const repo = repoAnlegen(betreffe);
    ordnerZumAufraeumen.push(repo.ordner);
    return repo;
  }

  function eigenerOrdner() {
    const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-hilfe-'));
    ordnerZumAufraeumen.push(ordner);
    return ordner;
  }

  /** Startet gitreviewA und wartet auf die Startzeile. Standard: ohne Browser, Standardstufe. */
  async function gitreviewAStarten(repo, hashes, { mitBrowser = false, browserBefehl, zusatz = [] } = {}) {
    const lauf = gitreviewAAufrufen(repo, hashes, { mitBrowser, browserBefehl, zusatz });
    lauf.adresse = await adresseAbwarten(lauf, STARTZEILE_FRIST_MS);
    return lauf;
  }

  function gitreviewAAufrufen(repo, argumente, { mitBrowser = false, browserBefehl, zusatz = [], pfadVorne } = {}) {
    const umgebung = {};
    const optionen = [...argumente, ...zusatz];
    if (!mitBrowser) {
      optionen.push('--kein-browser');
    }
    if (browserBefehl) {
      umgebung.GITREVIEWA_BROWSER = browserBefehl;
    }
    if (pfadVorne) {
      umgebung.PATH = `${pfadVorne}${path.delimiter}${process.env.PATH}`;
    }
    const lauf = programmStarten(repo.ordner, optionen, umgebung);
    laeufe.push(lauf);
    return lauf;
  }

  async function aufrufBeendet(lauf) {
    await lauf.beendet;
    return lauf.exitCode;
  }

  function laeuftNoch(lauf) {
    return lauf.exitCode === null;
  }

  /** Frist für das Ausbleiben eines Ereignisses: wartet bis `sekunden` nach dem Start, endet früher, wenn der Prozess endet. */
  async function bisSekundenNachStart(lauf, sekunden) {
    const restMs = Math.max(0, lauf.gestartetUmMs + sekunden * 1000 - Date.now());
    await Promise.race([lauf.beendet, new Promise(fertig => setTimeout(fertig, restMs))]);
  }

  async function laufAbbrechen(lauf) {
    await programmBeenden(lauf);
  }

  function zustandAbfragen(lauf, hostKopf) {
    return anfrage(lauf.adresse, '/api/zustand', hostKopf);
  }

  function commitsAbfragen(lauf) {
    return anfrage(lauf.adresse, '/api/commits');
  }

  /** Status von GET /api/commits, 0 solange der Server noch nicht lauscht — für Läufe ohne Startzeile (--quiet). */
  async function commitsStatusOderNull(lauf) {
    try {
      return (await commitsAbfragen(lauf)).status;
    } catch {
      return 0;
    }
  }

  function freierPort() {
    return new Promise(gefunden => {
      const server = net.createServer();
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        server.close(() => gefunden(port));
      });
    });
  }

  function startseiteAbfragen(lauf) {
    return anfrage(lauf.adresse, '/');
  }

  function stderrZeilen(lauf) {
    return lauf.stderr.split('\n').filter(zeile => zeile.length > 0);
  }

  function portVon(lauf) {
    return new URL(lauf.adresse).port;
  }

  function hostDesLaufs(lauf) {
    return new URL(lauf.adresse).host;
  }

  /** Ein Skript als Browser, das je Aufruf eine Zeile mit Anzahl und Argumenten in eine Datei schreibt. */
  function aufzeichnenderBrowser() {
    const ordner = eigenerOrdner();
    const protokoll = path.join(ordner, 'aufrufe.txt');
    const skript = path.join(ordner, 'browser.sh');
    fs.writeFileSync(skript, `#!/bin/sh\nprintf '%s' "$#" >> '${protokoll}'\nfor a in "$@"; do printf ' %s' "$a" >> '${protokoll}'; done\nprintf '\\n' >> '${protokoll}'\n`, { mode: 0o755 });
    const aufrufe = () => {
      if (!fs.existsSync(protokoll)) {
        return [];
      }
      return fs.readFileSync(protokoll, 'utf8').split('\n').filter(zeile => zeile.length > 0);
    };
    return { befehl: skript, aufrufe };
  }

  /** Ein Ordner mit einem `git`, das nur eine Markierung hinterlässt — vorne in PATH beweist es, ob git gestartet wurde. */
  function gitAttrappe() {
    const ordner = eigenerOrdner();
    const markierung = path.join(ordner, 'git-wurde-gestartet');
    fs.writeFileSync(path.join(ordner, 'git'), `#!/bin/sh\ntouch '${markierung}'\nexit 1\n`, { mode: 0o755 });
    return { ordner, wurdeGestartet: () => fs.existsSync(markierung) };
  }

  async function aufraeumen() {
    for (const lauf of laeufe) {
      await programmBeenden(lauf);
    }
    for (const ordner of ordnerZumAufraeumen) {
      repoEntfernen(ordner);
    }
  }

  return {
    repoMitCommits, gitreviewAStarten, gitreviewAAufrufen, aufrufBeendet, laeuftNoch, bisSekundenNachStart, laufAbbrechen,
    zustandAbfragen, commitsAbfragen, commitsStatusOderNull, freierPort, startseiteAbfragen, stderrZeilen, portVon, hostDesLaufs,
    lauschendeAdressen, aufzeichnenderBrowser, gitAttrappe, aufraeumen,
    oberflaecheOeffnen: (page, lauf) => page.goto(lauf.adresse),
    commitZeilenLesen: oberflaeche.commitZeilenLesen,
    commitZeilen: oberflaeche.commitZeilen,
    aufZeilenWarten: oberflaeche.aufZeilenWarten,
  };
}

const test = base.test.extend({
  // eslint-disable-next-line no-empty-pattern
  gr: async ({}, verwenden) => {
    const w = welt();
    await verwenden(w);
    await w.aufraeumen();
  },
});

/** Kurz-Hash, wie ihn die Anforderung festlegt: die ersten 7 Zeichen des vollen Hashes. */
function kurz(hash) {
  return hash.slice(0, 7);
}

module.exports = { test, expect: base.expect, kurz };
