'use strict';
// Treiber Repository für R00021: Repo S (Commits `s1`, `s2`), Repo L (Symlink `link.txt` nach /etc/hostname) und Repo F (Namen mit
// fremdem Byte und U+202E), angelegt wie in der User Story. Gleicher Inhalt wie tests/GitReviewA.Tests/Akzeptanz/SprungRepo.cs; nur unter Linux.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { git, GIT_UMGEBUNG, dateiSchreiben, commitAnlegen } = require('./wegwerf-repo.js');

function repoS(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  git(ordner, 'init', '-q', '-b', 'main');
  dateiSchreiben(ordner, 'README.md', 'Zeile eins\nZeile zwei\n');
  dateiSchreiben(ordner, 'src/a.txt', 'a1\na2\na3\n');
  dateiSchreiben(ordner, 'Ordner mit Leerzeichen/datei#1.txt', 'x\ny\n');
  dateiSchreiben(ordner, 'prozent%25.txt', 'z\n');
  dateiSchreiben(ordner, 'weg.txt', 'w1\nw2\n');
  const s1 = commitAnlegen(ordner, { betreff: 'Start', autor: 'Anna Beispiel', datum: '2026-03-04T09:15:00+01:00' });
  dateiSchreiben(ordner, 'src/a.txt', 'a1\nA2\na3\na4\n');
  git(ordner, 'rm', '-q', 'README.md');
  dateiSchreiben(ordner, 'weg.txt', 'w1\nw2\nw3\n');
  const s2 = commitAnlegen(ordner, { betreff: 'Ändern', autor: 'Anna Beispiel', datum: '2026-03-05T09:15:00+01:00' });
  return { ordner, hashes: { s1, s2 } };
}

function repoL(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  git(ordner, 'init', '-q', '-b', 'main');
  dateiSchreiben(ordner, 'inhalt.txt', 'eins\n');
  fs.symlinkSync('/etc/hostname', path.join(ordner, 'link.txt'));
  const l = commitAnlegen(ordner, { betreff: 'Symlink', autor: 'Anna Beispiel', datum: '2026-03-04T09:15:00+01:00' });
  return { ordner, hashes: { l } };
}

const SKRIPT_F = String.raw`set -e
git init -q -b main
printf 'eins\n' > g.txt
printf 'roh\n' > $'f\xff.txt'
printf 'richtung\n' > $'u\xe2\x80\xae.txt'
git add -A && git commit -q -m "FremdeNamen"
rm -f -- $'f\xff.txt'
`;

function repoF(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  execFileSync('bash', ['-c', SKRIPT_F], { cwd: ordner, env: GIT_UMGEBUNG, stdio: ['ignore', 'ignore', 'pipe'] });
  return { ordner, hashes: { f: git(ordner, 'rev-parse', 'HEAD') } };
}

module.exports = { repoS, repoL, repoF };
