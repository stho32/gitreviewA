'use strict';
// Treiber Repository für R00004: die Wegwerf-Repos A, M und U der User Story, angelegt in einem Ordner, den der Aufrufer wegräumt.
const fs = require('fs');
const path = require('path');
const { git, dateiSchreiben, commitAnlegen } = require('./wegwerf-repo.js');

const MARKER = ['marker-extern', 'marker-textconv', 'marker-command'];

function repoAnlegen(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  git(ordner, 'init', '-q', '-b', 'main');
  return ordner;
}

/** Repo A: `p` „Start“, `q` „Dateien ändern“, `s` „Seltsame Namen“. */
function repoA(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'README.md', 'Titel\nText\n');
  dateiSchreiben(ordner, 'src/b.txt', 'eins\nzwei\n');
  dateiSchreiben(ordner, 'lang.txt', zeilen(20, nummer => `z${String(nummer).padStart(2, '0')}`));
  dateiSchreiben(ordner, 'alt.txt', 'a1\na2\na3\na4\n');
  dateiSchreiben(ordner, 'ende.txt', 'a');
  dateiSchreiben(ordner, 'k.txt', 'oben\n\nunten\n');
  const p = commitAnlegen(ordner, { betreff: 'Start' });
  dateiSchreiben(ordner, 'src/b.txt', 'eins\nZWEI\ndrei\n');
  const lang = zeilen(20, nummer => `z${String(nummer).padStart(2, '0')}`).replace('z03\n', 'Z03\n').replace('z18\n', '');
  dateiSchreiben(ordner, 'lang.txt', lang);
  fs.rmSync(path.join(ordner, 'alt.txt'));
  fs.renameSync(path.join(ordner, 'README.md'), path.join(ordner, 'LIESMICH.md'));
  dateiSchreiben(ordner, 'ende.txt', 'a\n');
  dateiSchreiben(ordner, 'k.txt', 'oben\n\nUNTEN\n');
  dateiSchreiben(ordner, 'breit.txt', `kurz\n${'0123456789'.repeat(30)}\n`);
  dateiSchreiben(ordner, 'fremd.txt', '<img src=x onerror=alert(1)>\n<b>fett</b>\na\u202Eb\n');
  fs.writeFileSync(path.join(ordner, 'logo.bin'), Buffer.from([0x41, 0, 0x42, 0, 1, 2]));
  const q = commitAnlegen(ordner, { betreff: 'Dateien ändern' });
  dateiSchreiben(ordner, '--output=pwn', 'x\n');
  dateiSchreiben(ordner, ':(glob)*.txt', 'y\n');
  dateiSchreiben(ordner, 'c.txt', 'z\n');
  const s = commitAnlegen(ordner, { betreff: 'Seltsame Namen' });
  return { ordner, hashes: { p, q, s } };
}

function zeilen(anzahl, text) {
  return Array.from({ length: anzahl }, (_, index) => `${text(index + 1)}\n`).join('');
}

/** Repo A, dazu drei Diff-Programme in der Konfiguration, die je eine Markerdatei im Repo anlegen. */
function repoAMitDiffProgrammen(ordner) {
  const repo = repoA(ordner);
  const skripte = MARKER.map(marker => markerSkript(ordner, marker));
  git(ordner, 'config', 'diff.external', skripte[0]);
  git(ordner, 'config', 'diff.marker.textconv', skripte[1]);
  git(ordner, 'config', 'diff.marker.command', skripte[2]);
  dateiSchreiben(ordner, '.gitattributes', '*.txt diff=marker\n');
  return repo;
}

function markerSkript(ordner, marker) {
  const skript = path.join(ordner, '.git', `${marker}.sh`);
  fs.writeFileSync(skript, `#!/bin/sh\ntouch '${path.join(ordner, marker)}'\ncat "$1" 2>/dev/null\n`, { mode: 0o755 });
  return skript;
}

function markerVorhanden(ordner) {
  return MARKER.filter(marker => fs.existsSync(path.join(ordner, marker)));
}

/** Gegenprobe: ein `git show` ohne Schutzoptionen startet das textconv-Programm. */
function diffProgrammOhneSchutzStarten(ordner, hash) {
  git(ordner, 'show', hash, '--', 'src/b.txt');
}

/** Repo A mit Einstellungen, die Kontext, Leerzeilen und Farben der Ausgabe von git verändern. */
function repoAMitFremdenEinstellungen(ordner) {
  const repo = repoA(ordner);
  git(ordner, 'config', 'diff.context', '0');
  git(ordner, 'config', 'diff.suppressBlankEmpty', 'true');
  git(ordner, 'config', 'color.ui', 'always');
  return repo;
}

/** Repo A, gestartet aus seinem Unterordner `src`: die Pfade der Dateiliste sind wurzelrelativ, der Startordner ist es nicht. */
function repoAAusUnterordner(ordner) {
  const repo = repoA(ordner);
  return { ordner: path.join(ordner, 'src'), hashes: repo.hashes };
}

/** Commits `e` und `z`, dann `n` hebt den Zeiger des Submoduls `sub` von `e` auf `z`; das Repo will Submodule als Log zeigen. */
function repoMitSubmodulAlsLog(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'a.txt', 'eins\n');
  const e = commitAnlegen(ordner, { betreff: 'eins' });
  dateiSchreiben(ordner, 'a.txt', 'zwei\n');
  const z = commitAnlegen(ordner, { betreff: 'zwei' });
  dateiSchreiben(ordner, '.gitmodules', '[submodule "sub"]\n\tpath = sub\n\turl = ./sub\n');
  git(ordner, 'add', '.gitmodules');
  git(ordner, 'update-index', '--add', '--cacheinfo', `160000,${e},sub`);
  git(ordner, 'commit', '-q', '-m', 'Submodul anlegen');
  git(ordner, 'update-index', '--cacheinfo', `160000,${z},sub`);
  git(ordner, 'commit', '-q', '-m', 'Submodul heben');
  git(ordner, 'config', 'diff.submodule', 'log');
  return { ordner, hashes: { e, z, n: git(ordner, 'rev-parse', 'HEAD') } };
}

/** Commit `v` mit Dateien, die git als binär einstuft: `x.js` und `logo.bin` mit Null-Bytes, `y.txt` per `.git/info/attributes`
    (lässt sich nicht abschalten), `viel.js` mit Null-Byte und 20 001 Zeilen. */
function repoMitVerstecktemCode(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'y.txt', 'eins\n');
  commitAnlegen(ordner, { betreff: 'Start' });
  dateiSchreiben(ordner, 'x.js', 'a\0b\nsteal();\n');
  dateiSchreiben(ordner, 'y.txt', 'eins\nsteal();\n');
  dateiSchreiben(ordner, 'viel.js', `\0\n${zeilen(20000, nummer => `zeile ${nummer}`)}`);
  fs.writeFileSync(path.join(ordner, 'logo.bin'), Buffer.from([0x41, 0, 0x42, 0, 1, 2]));
  const v = commitAnlegen(ordner, { betreff: 'Versteckter Code' });
  dateiSchreiben(ordner, '.git/info/attributes', 'y.txt -diff\n');
  return { ordner, hashes: { v } };
}

/** Commit `w` ändert `a.js`, `b.js` und `c.js`; das Repo lässt sie als binär ausgeben: `a.js` per `.gitattributes`, `b.js` per
    `core.attributesFile`, alle per `core.bigFileThreshold=1`. */
function repoMitBinaerausgabe(ordner) {
  repoAnlegen(ordner);
  for (const name of ['a.js', 'b.js', 'c.js']) {
    dateiSchreiben(ordner, name, 'eins\n');
  }
  commitAnlegen(ordner, { betreff: 'Start' });
  for (const name of ['a.js', 'b.js', 'c.js']) {
    dateiSchreiben(ordner, name, 'eins\nsteal();\n');
  }
  const w = commitAnlegen(ordner, { betreff: 'Verborgen' });
  dateiSchreiben(ordner, '.gitattributes', 'a.js -diff\n');
  dateiSchreiben(ordner, '.git/fremde-attribute', 'b.js -diff\n');
  git(ordner, 'config', 'core.attributesFile', path.join(ordner, '.git', 'fremde-attribute'));
  git(ordner, 'config', 'core.bigFileThreshold', '1');
  return { ordner, hashes: { w } };
}

/** Repo M: `c1`, Zweig `feature` mit `f.txt`, `c2` mit `g.txt` auf main, `m` = Merge von `feature`. */
function repoM(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'base.txt', 'basis\n');
  commitAnlegen(ordner, { betreff: 'c1' });
  git(ordner, 'switch', '-q', '-c', 'feature');
  dateiSchreiben(ordner, 'f.txt', 'neu\n');
  commitAnlegen(ordner, { betreff: 'Feature' });
  git(ordner, 'switch', '-q', 'main');
  dateiSchreiben(ordner, 'g.txt', 'haupt\n');
  commitAnlegen(ordner, { betreff: 'c2' });
  git(ordner, 'merge', '-q', '--no-ff', 'feature', '-m', 'Merge');
  return { ordner, hashes: { m: git(ordner, 'rev-parse', 'HEAD') } };
}

/** Ein Commit `b` mit einer Datei, deren Name ein richtungsänderndes Zeichen trägt. */
function repoMitBidiPfad(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'a\u202Eb.txt', 'x\n');
  return { ordner, hashes: { b: commitAnlegen(ordner, { betreff: 'Bidi im Namen' }) } };
}

/** Repo U: ein Commit `u` mit `gross.txt` aus 20 000 Zeilen. */
function repoU(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'gross.txt', zeilen(20000, nummer => `zeile ${String(nummer).padStart(5, '0')}`));
  return { ordner, hashes: { u: commitAnlegen(ordner, { betreff: '20 000 Zeilen' }) } };
}

module.exports = { repoMitBidiPfad, repoA, repoAAusUnterordner, repoMitSubmodulAlsLog, repoMitVerstecktemCode, repoMitBinaerausgabe, repoAMitDiffProgrammen, repoAMitFremdenEinstellungen, repoM, repoU, markerVorhanden, diffProgrammOhneSchutzStarten };
