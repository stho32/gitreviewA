'use strict';
// Treiber Repository für Auswahlen: Verläufe mit Zweig, Merge, vielen Commits und fremder Signaturkonfiguration.
// Commit-Zeiten sind gestaffelt (eine Minute je Commit), damit die Reihenfolge von git nicht an gleichen Zeitstempeln hängt.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { git, GIT_UMGEBUNG } = require('./wegwerf-repo.js');

const ERSTE_SEKUNDE = 1767258000;

function leeresRepo() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-e2e-auswahl-'));
  git(ordner, 'init', '-q', '-b', 'main');
  return { ordner, minute: 0 };
}

function committe(repo, betreff) {
  repo.minute += 1;
  const zeit = `@${ERSTE_SEKUNDE + repo.minute * 60} +0000`;
  const umgebung = { ...GIT_UMGEBUNG, GIT_AUTHOR_DATE: zeit, GIT_COMMITTER_DATE: zeit };
  execFileSync('git', ['-C', repo.ordner, 'commit', '-q', '--allow-empty', '-m', betreff], { env: umgebung });
  return git(repo.ordner, 'rev-parse', 'HEAD');
}

/** a → b → c → d → e auf main, e neuester. */
function verlaufAbisEAnlegen() {
  const repo = leeresRepo();
  const [a, b, c, d, e] = ['Erster', 'Zweiter', 'Dritter', 'Vierter', 'Fünfter'].map(wort => committe(repo, `${wort} Commit`));
  return { ordner: repo.ordner, a, b, c, d, e };
}

/** main: a, b; feature ab a: f1, f2; Merge m von feature in main. */
function verlaufMitMergeAnlegen() {
  const repo = leeresRepo();
  const a = committe(repo, 'a');
  git(repo.ordner, 'checkout', '-q', '-b', 'feature');
  const f1 = committe(repo, 'f1');
  const f2 = committe(repo, 'f2');
  git(repo.ordner, 'checkout', '-q', 'main');
  const b = committe(repo, 'b');
  repo.minute += 1;
  const zeit = `@${ERSTE_SEKUNDE + repo.minute * 60} +0000`;
  execFileSync('git', ['-C', repo.ordner, 'merge', '-q', '--no-ff', '-m', 'm', 'feature'], {
    env: { ...GIT_UMGEBUNG, GIT_AUTHOR_DATE: zeit, GIT_COMMITTER_DATE: zeit },
  });
  const m = git(repo.ordner, 'rev-parse', 'HEAD');
  return { ordner: repo.ordner, a, b, f1, f2, m };
}

/** main auf b (ausgecheckt), feature ab b mit f1, f2. */
function zweigNebenMainAnlegen() {
  const repo = leeresRepo();
  const a = committe(repo, 'a');
  const b = committe(repo, 'b');
  git(repo.ordner, 'checkout', '-q', '-b', 'feature');
  const f1 = committe(repo, 'f1');
  const f2 = committe(repo, 'f2');
  git(repo.ordner, 'checkout', '-q', 'main');
  return { ordner: repo.ordner, a, b, f1, f2 };
}

/** Ein Basis-Commit und darüber `anzahl` Commits (per git fast-import); `hashes` neuester zuerst. */
function verlaufMitCommitsAnlegen(anzahl) {
  const repo = leeresRepo();
  const bloecke = [];
  for (let nummer = 0; nummer <= anzahl; nummer += 1) {
    let betreff = `Commit Nummer ${nummer}`;
    if (nummer === 0) {
      betreff = 'Basis';
    }
    bloecke.push(`commit refs/heads/main\ncommitter Testperson <test@example.invalid> ${ERSTE_SEKUNDE + nummer * 60} +0000\n`
      + `data ${Buffer.byteLength(betreff)}\n${betreff}\n`);
  }
  execFileSync('git', ['-C', repo.ordner, 'fast-import', '--quiet'], { input: bloecke.join('\n'), env: GIT_UMGEBUNG });
  const basis = git(repo.ordner, 'rev-list', '--max-parents=0', 'HEAD');
  const hashes = revList(repo.ordner, `${basis}..HEAD`);
  return { ordner: repo.ordner, basis, hashes };
}

/**
 * a und ein signierter Commit darüber; das Repo verlangt Signaturprüfung mit einem eigenen Programm,
 * das bei jedem Start eine Markerdatei schreibt.
 */
function verlaufMitSignaturMarkerAnlegen() {
  const repo = leeresRepo();
  const a = committe(repo, 'a');
  committe(repo, 'Signierter Commit');
  const marker = path.join(repo.ordner, '.git', 'marker.txt');
  const programm = path.join(repo.ordner, '.git', 'marker.sh');
  fs.writeFileSync(programm, `#!/bin/sh\necho "$@" >> '${marker}'\n`, { mode: 0o755 });
  const signiert = signiertenCommitAnStelleVonHeadSetzen(repo.ordner);
  git(repo.ordner, 'config', 'log.showSignature', 'true');
  git(repo.ordner, 'config', 'gpg.program', programm);
  return {
    ordner: repo.ordner,
    a,
    signiert,
    markerExistiert: () => fs.existsSync(marker),
    signaturMitGitPruefen: () => git(repo.ordner, 'log', '-1', '--format=%H', 'HEAD'),
  };
}

function signiertenCommitAnStelleVonHeadSetzen(ordner) {
  const commit = git(ordner, 'cat-file', '-p', 'HEAD');
  const signatur = 'gpgsig -----BEGIN PGP SIGNATURE-----\n \n AAAA\n -----END PGP SIGNATURE-----';
  const kopfEnde = commit.indexOf('\n\n');
  const datei = path.join(ordner, '.git', 'signierter-commit');
  fs.writeFileSync(datei, `${commit.slice(0, kopfEnde)}\n${signatur}${commit.slice(kopfEnde)}\n`);
  const signiert = git(ordner, 'hash-object', '-t', 'commit', '-w', datei);
  git(ordner, 'update-ref', 'refs/heads/main', signiert);
  return signiert;
}

/** Die Liste, die `git rev-list <bereich>` im Repo ausgibt. */
function revList(ordner, bereich) {
  return git(ordner, 'rev-list', bereich).split('\n').filter(zeile => zeile.length > 0);
}

module.exports = {
  verlaufAbisEAnlegen, verlaufMitMergeAnlegen, zweigNebenMainAnlegen, verlaufMitCommitsAnlegen, verlaufMitSignaturMarkerAnlegen, revList,
};
