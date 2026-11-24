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
};

function git(ordner, ...argumente) {
  return execFileSync('git', ['-C', ordner, ...argumente], { encoding: 'utf8', env: GIT_UMGEBUNG }).trim();
}

/** Repo mit je einem Commit pro Betreff; liefert Ordner und die vollen Hashes in Commit-Reihenfolge. */
function repoAnlegen(betreffe) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-e2e-'));
  git(ordner, 'init', '-q', '-b', 'main');
  git(ordner, 'config', 'gc.auto', '0');
  const hashes = betreffe.map((betreff, index) => {
    fs.writeFileSync(path.join(ordner, 'datei.txt'), `Stand ${index}\n`);
    git(ordner, 'add', 'datei.txt');
    git(ordner, 'commit', '-q', '-m', betreff);
    return git(ordner, 'rev-parse', 'HEAD');
  });
  return { ordner, hashes };
}

function repoEntfernen(ordner) {
  fs.rmSync(ordner, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

module.exports = { repoAnlegen, repoEntfernen };
