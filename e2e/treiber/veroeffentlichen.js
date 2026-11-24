'use strict';
// Treiber Veröffentlichung: der einzige Ort, der `dotnet publish`, das Skript und Dateien im Ausgabeordner kennt.
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { DOTNET } = require('./programm.js');

const execDatei = promisify(execFile);
const WURZEL = path.resolve(__dirname, '../..');
const PROJEKT = path.join(WURZEL, 'src/GitReviewA');
const SKRIPT = path.join(WURZEL, 'skripte/veroeffentlichen.sh');
const PUFFER_BYTES = 64 * 1024 * 1024;

/** Eine Ablage je Test: Ausgabeordner und Build-Ablage liegen im Temp-Ordner, nie im Arbeitsbaum. */
function neueAblage() {
  const wurzel = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-veroeffentlichung-'));
  const buildAblage = process.env.GITREVIEWA_BUILD_ABLAGE ?? path.join(wurzel, 'build');
  const umgebung = { ...process.env, ArtifactsPath: buildAblage };
  let zaehler = 0;

  function neuerOrdner(name) {
    zaehler += 1;
    const ordner = path.join(wurzel, `${name}-${zaehler}`);
    fs.mkdirSync(ordner, { recursive: true });
    return ordner;
  }

  async function fuerPlattformVeroeffentlichen(plattform) {
    const ordner = path.join(neuerOrdner('ausgabe'), plattform);
    await execDatei(DOTNET, ['publish', PROJEKT, '-c', 'Release', '-r', plattform, '-o', ordner, '--nologo', '-v', 'q'],
      { cwd: WURZEL, env: umgebung, maxBuffer: PUFFER_BYTES });
    return { ordner, plattform };
  }

  function alleinInLeerenOrdnerKopieren(ergebnis) {
    const quelle = path.join(ergebnis.ordner, dateienIn(ergebnis.ordner)[0]);
    const ziel = path.join(neuerOrdner('allein'), path.basename(quelle));
    fs.copyFileSync(quelle, ziel);
    fs.chmodSync(ziel, 0o755);
    return ziel;
  }

  /** Ruft das Skript auf; `stdoutZeilen` sind die nicht leeren Zeilen von stdout. */
  async function skriptAufrufen(argumente) {
    const ausgabe = neuerOrdner('skript');
    const skriptUmgebung = { ...umgebung, AUSGABE: ausgabe };
    try {
      const { stdout, stderr } = await execDatei('bash', [SKRIPT, ...argumente], { cwd: WURZEL, env: skriptUmgebung, maxBuffer: PUFFER_BYTES });
      return ergebnisVon(0, stdout, stderr);
    } catch (fehler) {
      return ergebnisVon(fehler.code, fehler.stdout ?? '', fehler.stderr ?? String(fehler));
    }
  }

  function aufraeumen() {
    fs.rmSync(wurzel, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }

  return { fuerPlattformVeroeffentlichen, alleinInLeerenOrdnerKopieren, skriptAufrufen, aufraeumen };
}

function ergebnisVon(exitCode, stdout, stderr) {
  return { exitCode, stdout, stderr, stdoutZeilen: stdout.split('\n').filter(zeile => zeile.length > 0) };
}

function dateienIn(ordner) {
  return fs.readdirSync(ordner, { recursive: true, withFileTypes: true })
    .filter(eintrag => eintrag.isFile())
    .map(eintrag => path.relative(ordner, path.join(eintrag.parentPath, eintrag.name)))
    .sort();
}

function ordnerDerDatei(datei) {
  return path.dirname(datei);
}

function ordnerNameDerDatei(datei) {
  return path.basename(path.dirname(datei));
}

function istAusfuehrbar(ordner, dateiname) {
  return (fs.statSync(path.join(ordner, dateiname)).mode & 0o111) !== 0;
}

function groesseIn(ordner, dateiname) {
  return fs.statSync(path.join(ordner, dateiname)).size;
}

module.exports = { neueAblage, dateienIn, ordnerDerDatei, ordnerNameDerDatei, istAusfuehrbar, groesseIn };
