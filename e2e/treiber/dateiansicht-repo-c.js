'use strict';
// Treiber Repo C (User Story R00046): `c1` mit `sql/a.sql`, `sql/gross.bin`, Ordner `sql/alt/`, Link `link.sql`,
// Submodul-Eintrag `sub`, `x⟨U+202E⟩.sql`; `c2` ändert `sql/a.sql`; der Arbeitsbaum danach noch einmal geändert (nicht committet).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { programmStarten, adresseAbwarten, programmBeenden } = require('./programm.js');
const { git, GIT_UMGEBUNG } = require('./wegwerf-repo.js');

const LEERBAUM = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

function committe(ordner, nachricht, datum) {
  execFileSync('git', ['-C', ordner, 'commit', '-q', '-m', nachricht], {
    env: { ...GIT_UMGEBUNG, GIT_AUTHOR_DATE: datum, GIT_COMMITTER_DATE: datum },
  });
  return git(ordner, 'rev-parse', 'HEAD');
}

function repoCAnlegen() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-c-'));
  git(ordner, 'init', '-q', '-b', 'main');
  fs.mkdirSync(path.join(ordner, 'sql', 'alt'), { recursive: true });
  fs.writeFileSync(path.join(ordner, 'sql', 'a.sql'), 'SELECT 1;\n');
  fs.writeFileSync(path.join(ordner, 'sql', 'alt', 'b.sql'), 'x\n');
  fs.writeFileSync(path.join(ordner, 'sql', 'gross.bin'), Buffer.from([0x41, 0x00, 0x42]));
  fs.symlinkSync('/etc/hostname', path.join(ordner, 'link.sql'));
  fs.writeFileSync(path.join(ordner, 'x\u202e.sql'), 'SELECT 9;\n');
  fs.writeFileSync(path.join(ordner, 'cafe:x.sql'), "SELECT 'cafe';\n");
  git(ordner, 'add', '-A');
  git(ordner, 'update-index', '--add', '--cacheinfo', `160000,${LEERBAUM},sub`);
  const c1 = committe(ordner, 'c1', '2026-01-01T10:00:00');
  fs.writeFileSync(path.join(ordner, 'sql', 'a.sql'), 'SELECT 2;\n');
  git(ordner, 'add', 'sql/a.sql');
  const c2 = committe(ordner, 'c2', '2026-01-01T10:00:01');
  fs.writeFileSync(path.join(ordner, 'sql', 'a.sql'), 'SELECT 3;\n'); // Arbeitsbaum, nicht committet
  return { ordner, c1, c2 };
}

function entfernen(ordner) {
  fs.rmSync(ordner, { recursive: true, force: true });
}

async function starten(c, angabe, startordner) {
  const lauf = programmStarten(startordner || c.ordner, ['--dateien', angabe, '--kein-browser', '--port', '0']);
  lauf.adresse = await adresseAbwarten(lauf, 15000);
  return lauf;
}

async function oeffnen(page, lauf) {
  await page.goto(lauf.adresse);
  await page.waitForSelector('#da-name:not(:empty)', { state: 'attached' });
}

async function beenden(lauf) {
  await programmBeenden(lauf);
}

module.exports = { repoCAnlegen, entfernen, starten, oeffnen, beenden };
