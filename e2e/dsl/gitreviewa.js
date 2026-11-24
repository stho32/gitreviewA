'use strict';
// Testsprache: je Fachwort eine Funktion; Treiber darunter kennen Prozess, HTTP, git und Selektoren.
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const base = require('@playwright/test');
const { repoAnlegen, repoEntfernen } = require('../treiber/wegwerf-repo.js');
const { imHintergrundStarten, pruefeSigintIgnoriert } = require('../treiber/hintergrund-start.js');
const { programmStarten, adresseAbwarten, programmBeenden, lauschendeAdressen } = require('../treiber/programm.js');
const { anfrage, senden } = require('../treiber/http.js');
const oberflaeche = require('../treiber/oberflaeche.js');
const { fremdeSeiteStarten } = require('../treiber/fremde-seite.js');

const STARTZEILE_FRIST_MS = 2000;
const DREI_COMMITS = ['Erster Commit', 'Zweiter Commit', 'Dritter Commit'];
const JSON_INHALT = 'application/json';

function welt() {
  const ordnerZumAufraeumen = [];
  const laeufe = [];
  const fremdeSeiten = [];

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

  /** Startet gitreviewA wie eine aufrufende KI: aus einem nicht-interaktiven Skript mit `… &`, ohne Browser. */
  async function gitreviewAImHintergrundStarten(repo, hashes, { mitSetsid = false } = {}) {
    const lauf = imHintergrundStarten(repo.ordner, [...hashes, '--kein-browser'], { mitSetsid });
    laeufe.push(lauf);
    await pruefeSigintIgnoriert(lauf);
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

  /** Wartet auf das Prozessende, höchstens `fristMs`; liefert den Exit-Code. */
  async function aufEndeWarten(lauf, fristMs = 5000) {
    let frist;
    const fristAbgelaufen = new Promise((_, abgelaufen) => {
      frist = setTimeout(() => abgelaufen(new Error(`gitreviewA lief ${fristMs} ms nach dem Beenden noch; stderr: ${lauf.stderr}`)), fristMs);
    });
    try {
      return await Promise.race([lauf.beendet, fristAbgelaufen]);
    } finally {
      clearTimeout(frist);
    }
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

  /**
   * Legt eine Anmerkung über die Schnittstelle an. `zeile` weglassen heißt „ganze Datei“.
   * Optionen: `origin`, `host`, `inhaltstyp` (Standard application/json, `null` = ohne Kopfzeile), `rohKoerper` statt JSON aus `anmerkung`.
   */
  async function anmerkungAnlegen(lauf, anmerkung, { origin, host, inhaltstyp = JSON_INHALT, rohKoerper } = {}) {
    let koerper = rohKoerper;
    if (koerper === undefined) {
      koerper = JSON.stringify(anmerkung);
    }
    const antwort = await senden(lauf.adresse, '/api/anmerkungen', {
      methode: 'POST', host, kopf: { Origin: origin, 'Content-Type': inhaltstypKopf(inhaltstyp) }, koerper,
    });
    return { status: antwort.status, ...jsonOderLeer(antwort.koerper) };
  }

  /** `null` heißt: Anfrage ohne Content-Type. */
  function inhaltstypKopf(inhaltstyp) {
    if (inhaltstyp === null) {
      return undefined;
    }
    return inhaltstyp;
  }

  /** Fordert das Beenden an; Standard ist die Befehlszeile: POST, JSON `{}`, ohne Origin. */
  async function beendenAnfordern(lauf, { methode = 'POST', origin, host, inhaltstyp = JSON_INHALT } = {}) {
    let koerper;
    if (methode === 'POST') {
      koerper = '{}';
    }
    const kopf = { Origin: origin, 'Content-Type': inhaltstypKopf(inhaltstyp) };
    const antwort = await senden(lauf.adresse, '/api/beenden', { methode, host, kopf, koerper });
    return { status: antwort.status, ...jsonOderLeer(antwort.koerper) };
  }

  function jsonOderLeer(text) {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  /** Beendet und misst die Zeit von der Anforderung bis zum Ende des Prozesses. */
  async function beendenUndDauerMessen(lauf) {
    const angefordertUmMs = performance.now();
    const antwort = beendenAnfordern(lauf);
    await lauf.beendet;
    const dauerMs = performance.now() - angefordertUmMs;
    return { dauerMs, antwort: await antwort };
  }

  /** Eine Seite auf localhost:<anderer Port>, die `skript` ausführt (Konstante ZIEL = Adresse des Laufs). */
  async function fremdeSeite(lauf, skript) {
    const seite = await fremdeSeiteStarten(lauf.adresse, skript);
    fremdeSeiten.push(seite);
    return seite;
  }

  function ergebnis(lauf) {
    return lauf.stdout;
  }

  async function aufraeumen() {
    for (const seite of fremdeSeiten) {
      await seite.stoppen();
    }
    for (const lauf of laeufe) {
      await programmBeenden(lauf);
    }
    for (const ordner of ordnerZumAufraeumen) {
      repoEntfernen(ordner);
    }
  }

  return {
    repoMitCommits, gitreviewAStarten, gitreviewAImHintergrundStarten, gitreviewAAufrufen, aufrufBeendet, aufEndeWarten, laeuftNoch, bisSekundenNachStart, laufAbbrechen,
    zustandAbfragen, commitsAbfragen, commitsStatusOderNull, freierPort, startseiteAbfragen, stderrZeilen, portVon, hostDesLaufs,
    lauschendeAdressen, aufzeichnenderBrowser, gitAttrappe, aufraeumen,
    anmerkungAnlegen, beendenAnfordern, beendenUndDauerMessen, fremdeSeite, ergebnis,
    beendenBetaetigen: oberflaeche.beendenBetaetigen,
    beendenKnopf: oberflaeche.beendenKnopf,
    beendetMeldung: oberflaeche.beendetMeldung,
    beendenFehler: oberflaeche.beendenFehler,
    beendenScheitertMit: oberflaeche.beendenScheitertMit,
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
