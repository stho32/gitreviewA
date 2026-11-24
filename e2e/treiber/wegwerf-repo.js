'use strict';
// Treiber Repository: legt Wegwerf-Repos im Temp-Ordner an; nur hier steht git.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GIT_UMGEBUNG = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'Testperson',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Testperson',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
  // git commit startet sonst `git maintenance run --auto --detach`, das noch in .git schreibt, während der Test aufräumt
  GIT_CONFIG_COUNT: '2',
  GIT_CONFIG_KEY_0: 'maintenance.auto',
  GIT_CONFIG_VALUE_0: 'false',
  GIT_CONFIG_KEY_1: 'gc.auto',
  GIT_CONFIG_VALUE_1: '0',
};

function git(ordner, ...argumente) {
  return execFileSync('git', ['-C', ordner, ...argumente], { encoding: 'utf8', env: GIT_UMGEBUNG }).trim();
}

/** Repo mit je einem Commit pro Betreff; liefert Ordner und die vollen Hashes in Commit-Reihenfolge. */
function repoAnlegen(betreffe) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-e2e-'));
  git(ordner, 'init', '-q', '-b', 'main');
  const hashes = betreffe.map((betreff, index) => {
    fs.writeFileSync(path.join(ordner, 'datei.txt'), `Stand ${index}\n`);
    git(ordner, 'add', 'datei.txt');
    git(ordner, 'commit', '-q', '-m', betreff);
    return git(ordner, 'rev-parse', 'HEAD');
  });
  return { ordner, hashes };
}

/** Leeres Repo; `commit` legt je Aufruf einen Commit mit Autor, Datum und Rumpf an, nachdem `schritte(ordner)` die Dateien bearbeitet hat. */
function leeresRepoAnlegen() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-e2e-'));
  git(ordner, 'init', '-q', '-b', 'main');
  return ordner;
}

function dateiSchreiben(ordner, pfad, inhalt) {
  const ziel = path.join(ordner, pfad);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.writeFileSync(ziel, inhalt);
}

function commitAnlegen(ordner, { betreff, autor = 'Testperson', datum = '2026-01-01T09:00:00+01:00', rumpf = '' }) {
  git(ordner, 'add', '-A');
  const nachricht = rumpf.length > 0 ? `${betreff}\n\n${rumpf}` : betreff;
  execFileSync('git', ['-C', ordner, 'commit', '-q', '--allow-empty', '-F', '-'], {
    input: nachricht,
    env: { ...GIT_UMGEBUNG, GIT_AUTHOR_NAME: autor, GIT_AUTHOR_DATE: datum, GIT_COMMITTER_DATE: datum },
  });
  return git(ordner, 'rev-parse', 'HEAD');
}

/** Die Vorbereitung von R00003: `p` fügt vier Dateien hinzu, `q` ändert, löscht, benennt um und fügt eine Binärdatei hinzu, `r` ist leer. */
function repoMitVorbereitungAnlegen() {
  const ordner = leeresRepoAnlegen();
  dateiSchreiben(ordner, 'README.md', 'Zeile 1\nZeile 2\n');
  dateiSchreiben(ordner, 'src/a.txt', 'a\nb\nc\n');
  dateiSchreiben(ordner, 'src/b.txt', 'x\ny\n');
  dateiSchreiben(ordner, 'alt.txt', '1\n2\n3\n4\n');
  const p = commitAnlegen(ordner, { betreff: 'Start', autor: 'Anna Beispiel', datum: '2026-03-04T09:15:00+01:00' });
  git(ordner, 'mv', 'README.md', 'LIESMICH.md');
  fs.rmSync(path.join(ordner, 'alt.txt'));
  dateiSchreiben(ordner, 'src/b.txt', 'x\nY\nz\n');
  dateiSchreiben(ordner, 'logo.bin', Buffer.from([0, 1, 2, 3, 0, 255]));
  const q = commitAnlegen(ordner, { betreff: 'Dateien ändern', autor: 'Bernd Beispiel', datum: '2026-03-05T18:30:00+01:00', rumpf: 'Zeile eins\nZeile zwei' });
  const r = commitAnlegen(ordner, { betreff: 'Nichts', datum: '2026-03-06T08:00:00+01:00' });
  return { ordner, p, q, r };
}

/** Ein Commit, dessen Dateien `dateien` (Pfad → Inhalt) hinzufügt. */
function repoMitDateienAnlegen(dateien, betreff = 'Dateien') {
  const ordner = leeresRepoAnlegen();
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    dateiSchreiben(ordner, pfad, inhalt);
  }
  const hash = commitAnlegen(ordner, { betreff });
  return { ordner, hash };
}

/** Ein Commit mit `a.txt` und `unten/b.txt` in einem Repo, das Pfade relativ zum Startordner zeigen will (`diff.relative`);
    `startordner` ist `unten`. */
function repoMitUnterordnerAnlegen() {
  const ordner = leeresRepoAnlegen();
  dateiSchreiben(ordner, 'a.txt', 'eins\n');
  dateiSchreiben(ordner, 'unten/b.txt', 'zwei\n');
  const hash = commitAnlegen(ordner, { betreff: 'Zwei Ordner' });
  git(ordner, 'config', 'diff.relative', 'true');
  return { ordner, startordner: path.join(ordner, 'unten'), hash };
}

/** Ein Commit mit fremdem Text in Autor, Betreff und Rumpf. */
function repoMitFremdemTextAnlegen({ autor, betreff, rumpf }) {
  const ordner = leeresRepoAnlegen();
  dateiSchreiben(ordner, 'datei.txt', 'x\n');
  const hash = commitAnlegen(ordner, { betreff, autor, rumpf });
  return { ordner, hash };
}

/** `anzahl` Commits mit Autor und einem Rumpf von fünf Zeilen, Zeiten im Minutenabstand. */
function repoMitVielenCommitsAnlegen(anzahl) {
  const ordner = leeresRepoAnlegen();
  const hashes = [];
  for (let nummer = 1; nummer <= anzahl; nummer += 1) {
    dateiSchreiben(ordner, 'datei.txt', `Stand ${nummer}\n`);
    const minute = String(nummer % 60).padStart(2, '0');
    const stunde = String(8 + Math.floor(nummer / 60)).padStart(2, '0');
    const rumpf = [1, 2, 3, 4, 5].map(zeile => `Rumpfzeile ${zeile} von Commit ${nummer}`).join('\n');
    hashes.push(commitAnlegen(ordner, { betreff: `Commit Nummer ${nummer}`, autor: `Autor ${nummer}`, datum: `2026-02-01T${stunde}:${minute}:00+01:00`, rumpf }));
  }
  return { ordner, hashes };
}

/** Entfernt die lose Objektdatei eines Commits (das Repo ist frisch, also nicht gepackt). */
function commitObjektEntfernen(ordner, hash) {
  fs.rmSync(path.join(ordner, '.git', 'objects', hash.slice(0, 2), hash.slice(2)));
}

function repoEntfernen(ordner) {
  fs.rmSync(ordner, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

module.exports = {
  repoAnlegen, repoEntfernen, repoMitVorbereitungAnlegen, repoMitDateienAnlegen, repoMitFremdemTextAnlegen, repoMitVielenCommitsAnlegen, repoMitUnterordnerAnlegen,
  leeresRepoAnlegen, dateiSchreiben, commitAnlegen, commitObjektEntfernen,
};
