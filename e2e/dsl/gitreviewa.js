'use strict';
// Testsprache: je Fachwort eine Funktion; Treiber darunter kennen Prozess, HTTP, git und Selektoren.
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const base = require('@playwright/test');
const repos = require('../treiber/wegwerf-repo.js');
const diffRepos = require('../treiber/diff-repos.js');
const fremdeNamen = require('../treiber/fremde-namen-repo.js');
const { repoAnlegen, repoEntfernen } = repos;
const { imHintergrundStarten, pruefeSigintIgnoriert } = require('../treiber/hintergrund-start.js');
const { programmStarten, adresseAbwarten, programmBeenden, lauschendeAdressen } = require('../treiber/programm.js');
const { anfrage, senden, halbSenden } = require('../treiber/http.js');
const oberflaeche = require('../treiber/oberflaeche.js');
const hakenSchnittstelle = require('../treiber/haken-schnittstelle.js');
const { fremdeSeiteStarten } = require('../treiber/fremde-seite.js');
const { anzeigeSchrankeMs } = require('./schranken.js');

const DREI_COMMITS = ['Erster Commit', 'Zweiter Commit', 'Dritter Commit'];
const JSON_INHALT = 'application/json';

function welt() {
  const ordnerZumAufraeumen = [];
  const laeufe = [];
  const fremdeSeiten = [];
  const offeneVerbindungen = [];

  function repoMitCommits(betreffe = DREI_COMMITS) {
    return gemerkt(repos.repoAnlegen(betreffe));
  }

  function gemerkt(repo) {
    ordnerZumAufraeumen.push(repo.ordner);
    return repo;
  }

  /** Die Vorbereitung der Anforderung: Commits `p` (vier Dateien), `q` (M, D, R, Binärdatei, Rumpf), `r` (leer). */
  function repoMitVorbereitung() {
    return gemerkt(repos.repoMitVorbereitungAnlegen());
  }

  /** Die Vorbereitung der Anforderung R00020: Commits `k1` (a.txt, README.md) und `k2` (a.txt geändert). */
  function repoK() {
    return gemerkt(repos.repoKAnlegen());
  }

  /** Repo K der User Story R00051: elf Commits mit langen Nachrichten (Namen wie in der Story). */
  function repoKNachrichten() {
    return gemerkt(repos.repoKNachrichtenAnlegen());
  }

  /** Repo U der User Story R00054: unsichtbare Zeichen in Betreff, Autor und Message an jeder Länge. */
  function repoUNachrichten() {
    return gemerkt(repos.repoUNachrichtenAnlegen());
  }

  /** Repo V der User Story R00058: `vsel` mit Autor `Anna`+U+FE0F und Betreff `Gut`+U+3164. */
  function repoV() {
    return gemerkt(repos.repoVNachrichtenAnlegen());
  }

  /** Ein anderswo angelegtes Repo, das beim Aufräumen mit entfernt wird. */
  function gemerktesRepo(repo) {
    return gemerkt(repo);
  }

  function repoMitDateien(dateien) {
    return gemerkt(repos.repoMitDateienAnlegen(dateien));
  }

  /** Repo Z der Anforderungen R00012/R00050 (`z1`, `z2`, `z3`; drei Dateien). */
  function repoZ() {
    return gemerkt(diffRepos.repoZ(path.join(eigenerOrdner(), 'repo-z')));
  }

  /** Repo N plus `v` (R00014, nur Linux): zehn Stellen, drei gesperrt. */
  function repoNMitV() {
    return gemerkt(fremdeNamen.repoNMitV(path.join(eigenerOrdner(), 'repo-n')));
  }

  function repoMitFremdemText(angaben) {
    return gemerkt(repos.repoMitFremdemTextAnlegen(angaben));
  }

  function repoMitUnterordner() {
    return gemerkt(repos.repoMitUnterordnerAnlegen());
  }

  function repoMitVielenCommits(anzahl) {
    return gemerkt(repos.repoMitVielenCommitsAnlegen(anzahl));
  }

  /** Commit `p` mit einer Datei, danach `u` mit `anzahl` neuen Dateien zu je einer Zeile. */
  function repoMitGrossemCommit(anzahl) {
    const ordner = repos.leeresRepoAnlegen();
    repos.dateiSchreiben(ordner, 'README.md', 'Start\n');
    const p = repos.commitAnlegen(ordner, { betreff: 'Start' });
    for (let nummer = 1; nummer <= anzahl; nummer += 1) {
      repos.dateiSchreiben(ordner, `viele/datei-${String(nummer).padStart(4, '0')}.txt`, `Zeile ${nummer}\n`);
    }
    const u = repos.commitAnlegen(ordner, { betreff: `${anzahl} Dateien` });
    return gemerkt({ ordner, p, u });
  }

  function commitObjektEntfernen(repo, hash) {
    repos.commitObjektEntfernen(repo.ordner, hash);
  }

  function eigenerOrdner() {
    const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-hilfe-'));
    ordnerZumAufraeumen.push(ordner);
    return ordner;
  }

  /** Startet gitreviewA und wartet auf die Startzeile. Standard: ohne Browser, Standardstufe. */
  async function gitreviewAStarten(repo, hashes, { mitBrowser = false, browserBefehl, zusatz = [], pfadVorne } = {}) {
    const lauf = gitreviewAAufrufen(repo, hashes, { mitBrowser, browserBefehl, zusatz, pfadVorne });
    lauf.adresse = await adresseAbwarten(lauf, anzeigeSchrankeMs);
    return lauf;
  }

  /** Startet gitreviewA wie eine aufrufende KI: aus einem nicht-interaktiven Skript mit `… &`, ohne Browser. */
  async function gitreviewAImHintergrundStarten(repo, hashes, { mitSetsid = false } = {}) {
    const lauf = imHintergrundStarten(repo.ordner, [...hashes, '--kein-browser'], { mitSetsid });
    laeufe.push(lauf);
    await pruefeSigintIgnoriert(lauf);
    lauf.adresse = await adresseAbwarten(lauf, anzeigeSchrankeMs);
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

  function dateienAbfragen(lauf, hash) {
    return anfrage(lauf.adresse, `/api/commits/${hash}/dateien`);
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

  /** Setzt oder entnimmt einen Haken über `POST /api/haken`; Optionen wie beim Haken-Treiber (`origin`, `host`, `inhaltstyp`). */
  async function hakenAnlegen(lauf, haken, optionen) {
    return hakenSchnittstelle.hakenSetzen(lauf.adresse, haken, optionen);
  }

  /** `GET /api/ergebnis` (R00020); `host` setzt einen fremden Host-Kopf. */
  function ergebnisAbfragen(lauf, { host, methode = 'GET' } = {}) {
    return senden(lauf.adresse, '/api/ergebnis', { methode, host });
  }

  /** `null` heißt: Anfrage ohne Content-Type. */
  function inhaltstypKopf(inhaltstyp) {
    if (inhaltstyp === null) {
      return undefined;
    }
    return inhaltstyp;
  }

  /** Ändert den Text der Anmerkung mit dieser Nummer über die Schnittstelle (wie `curl`); `{ text }` ist der Körper. */
  async function anmerkungAendern(lauf, nummer, text, { origin, host, inhaltstyp = JSON_INHALT } = {}) {
    const antwort = await senden(lauf.adresse, `/api/anmerkungen/${nummer}`, {
      methode: 'POST', host, kopf: { Origin: origin, 'Content-Type': inhaltstypKopf(inhaltstyp) }, koerper: JSON.stringify({ text }),
    });
    return { status: antwort.status, ...jsonOderLeer(antwort.koerper) };
  }

  /** Löscht die Anmerkung mit dieser Nummer über die Schnittstelle (wie `curl`); Körper ist leer bzw. `{}`. */
  async function anmerkungLoeschen(lauf, nummer, { origin, host, inhaltstyp = JSON_INHALT, methode = 'POST', koerper = '{}' } = {}) {
    const antwort = await senden(lauf.adresse, `/api/anmerkungen/${nummer}/loeschen`, {
      methode, host, kopf: { Origin: origin, 'Content-Type': inhaltstypKopf(inhaltstyp) }, koerper,
    });
    return { status: antwort.status, ...jsonOderLeer(antwort.koerper) };
  }

  /** `GET /api/angesehen` (R00041); `host` setzt einen fremden Host-Kopf. */
  function angesehenAbfragen(lauf, { host, methode = 'GET' } = {}) {
    return senden(lauf.adresse, '/api/angesehen', { methode, host });
  }

  /** Meldet die gezeigten Stellen an `POST /api/angesehen` (R00041); Optionen wie beim Haken-Treiber. */
  async function angesehenAnfordern(lauf, stellen, { methode = 'POST', origin, host, inhaltstyp = JSON_INHALT, koerper } = {}) {
    let rumpf = koerper;
    if (rumpf === undefined) {
      rumpf = JSON.stringify({ stellen });
    }
    const antwort = await senden(lauf.adresse, '/api/angesehen', {
      methode, host, kopf: { Origin: origin, 'Content-Type': inhaltstypKopf(inhaltstyp) }, koerper: rumpf,
    });
    return { status: antwort.status, ...jsonOderLeer(antwort.koerper) };
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

  /** Fordert den Abbruch an (R00050); Standard ist die Befehlszeile: POST, JSON `{}`, ohne Origin. */
  async function abbrechenAnfordern(lauf, { methode = 'POST', origin, host, inhaltstyp = JSON_INHALT } = {}) {
    let koerper;
    if (methode === 'POST') {
      koerper = '{}';
    }
    const kopf = { Origin: origin, 'Content-Type': inhaltstypKopf(inhaltstyp) };
    const antwort = await senden(lauf.adresse, '/api/abbrechen', { methode, host, kopf, koerper });
    return { status: antwort.status, ...jsonOderLeer(antwort.koerper) };
  }

  /** Beginnt eine Anfrage an `pfad` und sendet vom Körper nur `{` (angekündigt: 1000 Bytes); die Verbindung bleibt offen. */
  async function anfrageHalbGesendet(lauf, pfad) {
    const schliessen = await halbSenden(lauf.adresse, pfad, { laenge: 1000, teil: '{' });
    offeneVerbindungen.push(schliessen);
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
    for (const schliessen of offeneVerbindungen) {
      schliessen();
    }
    for (const seite of fremdeSeiten) {
      await seite.stoppen();
    }
    for (const lauf of laeufe) {
      await programmBeenden(lauf);
    }
    for (const ordner of ordnerZumAufraeumen) {
      repos.repoEntfernen(ordner);
    }
  }

  return {
    repoMitCommits, repoK, repoKNachrichten, repoUNachrichten, repoV, gitreviewAStarten, gitreviewAImHintergrundStarten, gitreviewAAufrufen, aufrufBeendet, aufEndeWarten, laeuftNoch, bisSekundenNachStart, laufAbbrechen,
    zustandAbfragen, commitsAbfragen, dateienAbfragen, commitsStatusOderNull, freierPort, startseiteAbfragen, stderrZeilen, portVon, hostDesLaufs,
    lauschendeAdressen, aufzeichnenderBrowser, gitAttrappe, aufraeumen,
    anmerkungAnlegen, anmerkungAendern, anmerkungLoeschen, beendenAnfordern, abbrechenAnfordern, anfrageHalbGesendet, beendenUndDauerMessen, fremdeSeite, ergebnis,
    angesehenAbfragen, angesehenAnfordern,
    hakenAnlegen, ergebnisAbfragen,
    beendenBetaetigen: oberflaeche.beendenBetaetigen,
    beendenKnopf: oberflaeche.beendenKnopf,
    beendetMeldung: oberflaeche.beendetMeldung,
    beendenFehler: oberflaeche.beendenFehler,
    beendenScheitertMit: oberflaeche.beendenScheitertMit,
    eigenerOrdner, gemerktesRepo, repoZ, repoNMitV, repoMitVorbereitung, repoMitDateien, repoMitFremdemText, repoMitUnterordner, repoMitVielenCommits, repoMitGrossemCommit, commitObjektEntfernen,
    // Der Standard der Seite ist „Zusammen“ (B1108). Eine Spec, die den Ablauf in „Einzeln“ prüft, startet dort ohne Wechsel-Ereignis
    // (ein Wechsel würde die erste Datei wählen); `modus` `null` lässt den Standard gelten. Der Startmodus ist ein Eingabewert der
    // Seite (modus.js).
    oberflaecheOeffnen: async (page, lauf, modus = 'einzeln') => {
      if (modus) {
        await page.addInitScript(startModus => { window.gitreviewaStartModus = startModus; }, modus);
      }
      await page.goto(lauf.adresse);
    },
    ...oberflaeche,
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

module.exports = { test, expect: base.expect, kurz, welt };
