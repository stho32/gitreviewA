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

/** Repo R der Karte #35 (R00031): `r1` „Anlegen“ legt `lang.txt` mit 30 Zeilen `z01` … `z30` und `fremd.txt` an;
    `r2` „Ändern“ stellt `z05` auf `Z05` und `z25` auf `Z25` um — zwei Abschnitte, dazwischen die Lücke 9–21.
    Gleicher Inhalt wie `DiffRepo.Zeilenbereich()` in tests/GitReviewA.Tests/Akzeptanz/DiffRepo.cs. */
function repoZeilenbereich(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'lang.txt', zeilen(30, nummer => `z${String(nummer).padStart(2, '0')}`));
  dateiSchreiben(ordner, 'fremd.txt', '<b>z20</b>\na\u202eb\n');
  const r1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'lang.txt', zeilen(30, nummer => `z${String(nummer).padStart(2, '0')}`).replace('z05\n', 'Z05\n').replace('z25\n', 'Z25\n'));
  const r2 = commitAnlegen(ordner, { betreff: 'Ändern' });
  return { ordner, hashes: { r1, r2 } };
}

function zeilen(anzahl, text) {
  return Array.from({ length: anzahl }, (_, index) => `${text(index + 1)}\n`).join('');
}

/** Repo L der Karte #48 (R00039): ein Pfad von rund 300 Zeichen mit U+202E — für die Kürzung in der Leiste.
    `l1` legt die Datei an, `l2` ändert sie; der Pfad steht als `pfad` im Ergebnis. */
function repoLangerPfad(ordner) {
  repoAnlegen(ordner);
  const ordnerName = 'a'.repeat(120);
  const dateiName = `${'b'.repeat(120)}\u202Ec${'d'.repeat(50)}.txt`;
  const pfad = `lang/${ordnerName}/${dateiName}`;
  dateiSchreiben(ordner, pfad, 'kurz\n');
  const l1 = commitAnlegen(ordner, { betreff: 'Lang' });
  dateiSchreiben(ordner, pfad, 'kurz\nlang\n');
  const l2 = commitAnlegen(ordner, { betreff: 'Geändert' });
  return { ordner, hashes: { l1, l2 }, pfad, anzeige: pfad.replace('\u202E', '⟨U+202E⟩') };
}

/** Repo W (R00026): `w1` „Anlegen“ legt `leerraum.txt` und `weit.txt` (60 Zeilen, `<b>z20</b>`, `a`+U+202E+`b`) an;
    `w2` „Ändern“ stellt in `leerraum.txt` `zwei` auf `  zwei` um, ändert `drei` und fügt eine leere Zeile an, in `weit.txt` ändert es `z05` und `z35`.
    Gleicher Inhalt wie `DiffRepo.W()` in tests/GitReviewA.Tests/Akzeptanz/DiffRepo.cs. */
function repoW(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'leerraum.txt', 'eins\nzwei\ndrei\nvier\n');
  dateiSchreiben(ordner, 'weit.txt', weitDatei());
  const w1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'leerraum.txt', 'eins\n  zwei\ndrei geaendert\nvier\n\n');
  dateiSchreiben(ordner, 'weit.txt', weitDatei().replace('z05\n', 'Z05\n').replace('z35\n', 'Z35\n'));
  const w2 = commitAnlegen(ordner, { betreff: 'Ändern' });
  return { ordner, hashes: { w1, w2 } };
}

function weitDatei() {
  const zeilenRumpf = Array.from({ length: 19 }, (_, index) => `z${String(index + 1).padStart(2, '0')}\n`);
  zeilenRumpf.push('<b>z20</b>\n', 'a\u202Eb\n');
  for (let nummer = 22; nummer <= 60; nummer += 1) {
    zeilenRumpf.push(`z${String(nummer).padStart(2, '0')}\n`);
  }
  return zeilenRumpf.join('');
}

/** Repo Y (R00026 in „Zusammen“ ohne Kette, Karte #44): `y1` „Anlegen“ legt `weit.txt` (60 Zeilen wie Repo W) und `klein.txt` an;
    `y2` „Dazwischen“ ändert nur `klein.txt`; `y3` „Weit“ ändert in `weit.txt` die Zeilen 5 und 35 — zwei Abschnitte mit der Lücke
    9–31. Die Auswahl `<y3> <y1>` ist keine lückenlose Kette (es fehlt `y2`): je Commit ein Abschnitt, `weit.txt` im Stand von `y3`. */
function repoY(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'weit.txt', weitDatei());
  dateiSchreiben(ordner, 'klein.txt', 'a\nb\n');
  const y1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'klein.txt', 'a\nB\n');
  const y2 = commitAnlegen(ordner, { betreff: 'Dazwischen' });
  dateiSchreiben(ordner, 'weit.txt', weitDatei().replace('z05\n', 'Z05\n').replace('z35\n', 'Z35\n'));
  const y3 = commitAnlegen(ordner, { betreff: 'Weit' });
  return { ordner, hashes: { y1, y2, y3 } };
}

/** Repo C (R00026-Nacharbeit, B1): `c1` „Anlegen“ legt `code.js` und `code.txt` (je 60 Zeilen `const zNN = NN;`) an;
    `c2` „Aendern“ ändert in beiden die Zeilen 5 und 35. `code.js` trägt Syntaxfarben, `code.txt` nicht — die Probe der
    Färbung und der Links braucht beides. */
function repoC(ordner) {
  repoAnlegen(ordner);
  const inhalt = codeInhalt();
  dateiSchreiben(ordner, 'code.js', inhalt);
  dateiSchreiben(ordner, 'code.txt', inhalt);
  const c1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  const geaendert = inhalt.replace('const z05 = 5;', 'const z05 = 50;').replace('const z35 = 35;', 'const z35 = 350;');
  dateiSchreiben(ordner, 'code.js', geaendert);
  dateiSchreiben(ordner, 'code.txt', geaendert);
  const c2 = commitAnlegen(ordner, { betreff: 'Aendern' });
  return { ordner, hashes: { c1, c2 } };
}

function codeInhalt() {
  return Array.from({ length: 60 }, (_, index) => `const z${String(index + 1).padStart(2, '0')} = ${index + 1};\n`).join('');
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

/** Repo I (R00022 Kriterium 9): `i` fügt eine Datei mit U+202E, U+200B und U+E0041 im Namen hinzu. */
function repoMitUnsichtbarenNamen(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'unsichtbar.txt', 'eins\n');
  dateiSchreiben(ordner, 'a\u202Eb\u200Bc\u{E0041}d.txt', 'inhalt\n');
  return { ordner, hashes: { i: commitAnlegen(ordner, { betreff: 'Unsichtbare Namen' }) } };
}

/** Repo U: ein Commit `u` mit `gross.txt` aus 20 000 Zeilen. */
function repoU(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'gross.txt', zeilen(20000, nummer => `zeile ${String(nummer).padStart(5, '0')}`));
  return { ordner, hashes: { u: commitAnlegen(ordner, { betreff: '20 000 Zeilen' }) } };
}

/** Repo U mit Commit `v` auf `u`, der in `gross.txt` die Zeile `zeile 10000` zu `geändert 10000` ändert (R00008). */
function repoUMitV(ordner) {
  const { hashes } = repoU(ordner);
  const gross = fs.readFileSync(path.join(ordner, 'gross.txt'), 'utf8');
  dateiSchreiben(ordner, 'gross.txt', gross.replace('zeile 10000\n', 'geändert 10000\n'));
  return { ordner, hashes: { ...hashes, v: commitAnlegen(ordner, { betreff: 'Eine Zeile in 20 000' }) } };
}

/**
 * Repo (R00017): ein Commit `w` fügt alle Prüfdateien hinzu — so erscheinen sie in beiden Ansichten gleich.
 * `gross.txt` genau 20 000 Zeilen, `riesig.txt` 30 000 (über der Zuklappgrenze), `winzig.txt` drei Zeilen und
 * `dicht.js` 200 dichte Zeilen zu ~1 000 Zeichen aus vielen kurzen JS-Token.
 */
function repoGross(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'gross.txt', zeilen(20000, nummer => `zeile ${String(nummer).padStart(5, '0')}`));
  dateiSchreiben(ordner, 'riesig.txt', zeilen(30000, nummer => `zeile ${String(nummer).padStart(5, '0')}`));
  dateiSchreiben(ordner, 'winzig.txt', 'eins\nzwei\ndrei\n');
  dateiSchreiben(ordner, 'dicht.js', zeilen(200, () => 'a1=1;'.repeat(199)));
  return { ordner, hashes: { w: commitAnlegen(ordner, { betreff: 'Große Diffs' }) } };
}

/**
 * Repo (R00012, Befund B2): `x1` fügt `riesig.txt` (30 000 Zeilen, über der Zuklappgrenze) und `winzig.txt` hinzu, `x2` ändert
 * `winzig.txt`, `x3` ändert in `riesig.txt` die letzte Zeile. `x1 x3` ist keine lückenlose Kette → die Änderungen stehen als
 * Abschnitte je Commit; der Abschnitt von `x1` trägt dieselbe 30 000-Zeilen-Datei wie im Netto-Fall.
 */
function repoGrossOhneKette(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'riesig.txt', zeilen(30000, nummer => `zeile ${String(nummer).padStart(5, '0')}`));
  dateiSchreiben(ordner, 'winzig.txt', 'eins\nzwei\ndrei\n');
  const x1 = commitAnlegen(ordner, { betreff: 'Riesig und winzig' });
  dateiSchreiben(ordner, 'winzig.txt', 'eins\nZWEI\ndrei\n');
  const x2 = commitAnlegen(ordner, { betreff: 'Winzig ändern' });
  dateiSchreiben(ordner, 'riesig.txt', zeilen(30000, nummer => (nummer === 30000 ? 'zuletzt geändert' : `zeile ${String(nummer).padStart(5, '0')}`)));
  const x3 = commitAnlegen(ordner, { betreff: 'Letzte Zeile riesig' });
  return { ordner, hashes: { x1, x2, x3 } };
}

/** Repo (R00012, Befund M1): `b1` legt `a.txt` an und trägt im Betreff das richtungsändernde Zeichen U+202E, `b2` legt `b.txt` an,
    `b3` ändert `a.txt`. `b1 b3` ist keine lückenlose Kette → Abschnitte, deren Köpfe den Betreff nennen. */
function repoMitBidiBetreff(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'a.txt', 'eins\nzwei\n');
  const b1 = commitAnlegen(ordner, { betreff: 'Start \u202Eoberflaeche' });
  dateiSchreiben(ordner, 'b.txt', 'x\n');
  const b2 = commitAnlegen(ordner, { betreff: 'b neu' });
  dateiSchreiben(ordner, 'a.txt', 'eins\nzwei\ndrei\n');
  const b3 = commitAnlegen(ordner, { betreff: 'a wächst' });
  return { ordner, hashes: { b1, b2, b3 } };
}

/** Repo mit drei Commits, deren mittlerer einen Rumpf trägt (R00012, Kriterium 2: Message aus- und einklappen). */
function repoMitRumpf(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'a.txt', 'eins\n');
  const p = commitAnlegen(ordner, { betreff: 'Start' });
  dateiSchreiben(ordner, 'a.txt', 'eins\nzwei\n');
  const q = commitAnlegen(ordner, { betreff: 'a ändern', rumpf: 'Zeile eins\nZeile zwei' });
  const r = commitAnlegen(ordner, { betreff: 'Nichts' });
  return { ordner, hashes: { p, q, r } };
}

/** Repo M (R00038, Kriterien 4, 5, 6, 8, 9): sechs Commits `m1` … `m6`, die je `x.txt` ändern — `m1` legt sie mit 20 Zeilen
    `m1-1` … `m1-20` an, `m2` trägt einen Betreff aus 400 Zeichen, `m4` einen Rumpf mit HTML und unsichtbaren Zeichen,
    `m6` einen Rumpf und dazu `bild.bin` (Bytes 0x00–0xFF). */
function repoAbsicht(ordner) {
  repoAnlegen(ordner);
  const schreibeX = text => dateiSchreiben(ordner, 'x.txt', text);
  const zwanzig = zeilen(20, nummer => `m1-${nummer}`);
  schreibeX(zwanzig);
  const m1 = commitAnlegen(ordner, { betreff: 'Schritt 1' });
  schreibeX(`${zwanzig}m2\n`);
  const m2 = commitAnlegen(ordner, { betreff: `Schritt 2 ${'x'.repeat(390)}` });
  schreibeX(`${zwanzig}m2\nm3\n`);
  const m3 = commitAnlegen(ordner, { betreff: 'Schritt 3' });
  schreibeX(`${zwanzig}m2\nm3\nm4\n`);
  const m4 = commitAnlegen(ordner, { betreff: 'Schritt 4', rumpf: '<b>fett</b> <img src=x onerror=alert(1)>\na\u202Eb\u200Bc\u{E0041}d' });
  schreibeX(`${zwanzig}m2\nm3\nm4\nm5\n`);
  const m5 = commitAnlegen(ordner, { betreff: 'Schritt 5' });
  schreibeX(`${zwanzig}m2\nm3\nm4\nm5\nm6\n`);
  fs.writeFileSync(path.join(ordner, 'bild.bin'), Buffer.from(Array.from({ length: 256 }, (_, byte) => byte)));
  const m6 = commitAnlegen(ordner, { betreff: 'Schritt 6', rumpf: 'Bild ergänzt' });
  return { ordner, hashes: { m1, m2, m3, m4, m5, m6 } };
}

/** Umbenennung (R00038, Kriterium 7): `n1` legt `alt.txt` an, `n2` benennt sie in `neu.txt` um und ändert eine Zeile. */
function repoUmbenennung(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'alt.txt', 'a1\na2\na3\n');
  const n1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  git(ordner, 'mv', 'alt.txt', 'neu.txt');
  dateiSchreiben(ordner, 'neu.txt', 'a1\nA2\na3\n');
  const n2 = commitAnlegen(ordner, { betreff: 'Umbenannt und geändert' });
  return { ordner, hashes: { n1, n2 } };
}

/** Repo Z (R00012): `z1` „Start“ legt `README.md` (`Lager`, `Beispiel`) und `src/a.txt` (`eins`, `zwei`, `drei`) an; `z2` „a ändern, b neu“
    ändert in `src/a.txt` `zwei` zu `ZWEI` und legt `src/b.txt` (`x`, `y`) an; `z3` „a und b ändern“ hängt in `src/a.txt` `vier` an und
    ändert in `src/b.txt` `y` zu `Y`. `z1 z2 z3` ist eine lückenlose Kette, `z1 z3` nicht. Netto über alle drei: `README.md` +2 −0,
    `src/a.txt` +4 −0 (`eins`, `ZWEI`, `drei`, `vier`), `src/b.txt` +2 −0 (`x`, `Y`). */
function repoZ(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'README.md', 'Lager\nBeispiel\n');
  dateiSchreiben(ordner, 'src/a.txt', 'eins\nzwei\ndrei\n');
  const z1 = commitAnlegen(ordner, { betreff: 'Start', datum: '2026-01-01T09:00:00+01:00' });
  dateiSchreiben(ordner, 'src/a.txt', 'eins\nZWEI\ndrei\n');
  dateiSchreiben(ordner, 'src/b.txt', 'x\ny\n');
  const z2 = commitAnlegen(ordner, { betreff: 'a ändern, b neu', datum: '2026-01-01T09:05:00+01:00' });
  dateiSchreiben(ordner, 'src/a.txt', 'eins\nZWEI\ndrei\nvier\n');
  dateiSchreiben(ordner, 'src/b.txt', 'x\nY\n');
  const z3 = commitAnlegen(ordner, { betreff: 'a und b ändern', datum: '2026-01-01T09:10:00+01:00' });
  return { ordner, hashes: { z1, z2, z3 } };
}

/** Repo Q (R00025): `i1` „Anlegen“ legt sieben Dateien an — `README.md`, `src/a.txt`, `src/b.txt`, `docs/README.md`,
    `app.lock`, `build/out.log`, `src/generated/api.cs`. Über `--ignore '*.lock'` oder das Musterfeld ist `app.lock` auszublenden. */
function repoQ(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'README.md', 'a\nb\n');
  dateiSchreiben(ordner, 'src/a.txt', '1\n2\n3\n');
  dateiSchreiben(ordner, 'src/b.txt', '1\n2\n');
  dateiSchreiben(ordner, 'docs/README.md', 'x\n');
  dateiSchreiben(ordner, 'app.lock', 'lock\n');
  dateiSchreiben(ordner, 'build/out.log', 'log\n');
  dateiSchreiben(ordner, 'src/generated/api.cs', 'class X {}\n');
  return { ordner, hashes: { i1: commitAnlegen(ordner, { betreff: 'Anlegen' }) } };
}

/** Repo Still (R00012, Nacharbeit I0027): `t1` „Anlegen“ legt `still.txt` (`a`, `b`) und `echt.txt` (`x`, `y`) an; `t2` „Leerraum“
    stellt in `still.txt` nur die Einrückung um (`b` → `  b`, reine Leerraum-Änderung) und ändert in `echt.txt` `y` → `Y`. Aufruf
    `gitreviewA <t2>` ist die lückenlose Kette eines Commits gegen `t1` — der Netto-Diff zeigt den Leerraum-Vergleich. */
function repoStill(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'still.txt', 'a\nb\n');
  dateiSchreiben(ordner, 'echt.txt', 'x\ny\n');
  const t1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'still.txt', 'a\n  b\n');
  dateiSchreiben(ordner, 'echt.txt', 'x\nY\n');
  const t2 = commitAnlegen(ordner, { betreff: 'Leerraum' });
  return { ordner, hashes: { t1, t2 } };
}

/** Repo S (R00033): `s1` „Start“ legt `lang.txt` mit 200 Zeilen (`z001`…`z200`, die vierfache Fensterhöhe) und 60 kleine Dateien
    `d01.txt`…`d60.txt` an; `s2` „Ändern“ ändert `z200` zu `Z200`. Die Netto-Liste von `s1` hat 61 Zeilen (60 Dateien und `lang.txt`),
    der Diff von `lang.txt` ist höher als das Fenster — beide Rollbereiche scrollen wirklich. */
function repoS(ordner) {
  repoAnlegen(ordner);
  const lang = zeilen(200, nummer => `z${String(nummer).padStart(3, '0')}`);
  dateiSchreiben(ordner, 'lang.txt', lang);
  for (let nummer = 1; nummer <= 60; nummer += 1) {
    dateiSchreiben(ordner, `d${String(nummer).padStart(2, '0')}.txt`, `d${nummer}\n`);
  }
  const s1 = commitAnlegen(ordner, { betreff: 'Start', datum: '2026-01-01T09:00:00+01:00' });
  dateiSchreiben(ordner, 'lang.txt', lang.replace('z200\n', 'Z200\n'));
  const s2 = commitAnlegen(ordner, { betreff: 'Ändern', datum: '2026-01-01T09:05:00+01:00' });
  return { ordner, hashes: { s1, s2 } };
}

/** Repo L (R00033, Lücken im Diff): `l1` „Start“ legt `weit.txt` mit 400 Zeilen und 60 kleine Dateien `d01.txt`…`d60.txt` an;
    `l2` „Alle zwanzig“ ändert in `weit.txt` jede zwanzigste Zeile (`Z005`, `Z025`, …) und hängt in jeder kleinen Datei eine
    Zeile an. Die Liste von `l2` hat 61 Zeilen; „nur Änderungen“ in „Einzeln“ zeigt 20 Abschnitte mit Lücken dazwischen. */
function repoL(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'weit.txt', zeilen(400, nummer => `z${String(nummer).padStart(3, '0')}`));
  for (let nummer = 1; nummer <= 60; nummer += 1) {
    dateiSchreiben(ordner, `d${String(nummer).padStart(2, '0')}.txt`, `d${nummer}\n`);
  }
  const l1 = commitAnlegen(ordner, { betreff: 'Start', datum: '2026-01-01T09:00:00+01:00' });
  dateiSchreiben(ordner, 'weit.txt', zeilen(400, nummer => (nummer % 20 === 5 ? `Z${String(nummer).padStart(3, '0')}` : `z${String(nummer).padStart(3, '0')}`)));
  for (let nummer = 1; nummer <= 60; nummer += 1) {
    dateiSchreiben(ordner, `d${String(nummer).padStart(2, '0')}.txt`, `d${nummer}\nneu\n`);
  }
  const l2 = commitAnlegen(ordner, { betreff: 'Alle zwanzig', datum: '2026-01-01T09:05:00+01:00' });
  return { ordner, hashes: { l1, l2 } };
}

/** Repo X (R00010): ein Commit `x` fügt die Datei `<b>x</b>.txt` mit der Zeile `eins` hinzu. */
/** Repo G (R00023, Nebeneinander): `g1` „Start“, `g2` „Zwei weg, drei her“ (t.txt: 2 entfernt, 3 hinzugefügt → Überhang rechts),
    `g3` „Nur vier weg“ (ein entfernter Lauf ohne hinzugefügten). */
function repoG(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 't.txt', 'eins\nzwei\ndrei\nvier\nfünf\nsechs\n');
  const g1 = commitAnlegen(ordner, { betreff: 'Start' });
  dateiSchreiben(ordner, 't.txt', 'eins\nX\nY\nZ\nvier\nfünf\nsechs\n');
  const g2 = commitAnlegen(ordner, { betreff: 'Zwei weg, drei her' });
  dateiSchreiben(ordner, 't.txt', 'eins\nX\nY\nZ\nfünf\nsechs\n');
  const g3 = commitAnlegen(ordner, { betreff: 'Nur vier weg' });
  return { ordner, hashes: { g1, g2, g3 } };
}

/** Repo Klammern (Karte #43): `h1` „Anlegen“ legt `klammer.cs` an, `h2` „Gruss ändern“ stellt in ihm `return "Hallo "` auf
    `return "Hallo, "` um. Die Änderung liegt zwischen Zeilen ohne Token (Leerzeile, Zeilen nur mit `{` und `}`), die die
    Ansicht im Hunk zeigt — für die Probe, dass Zeilen ohne Farbstücke die Färbung nicht abbrechen. */
function repoKlammern(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'klammer.cs', klammerInhalt('"Hallo "'));
  const h1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'klammer.cs', klammerInhalt('"Hallo, "'));
  const h2 = commitAnlegen(ordner, { betreff: 'Gruss ändern' });
  return { ordner, hashes: { h1, h2 } };
}

function klammerInhalt(gruss) {
  return [
    'namespace Beispiel',
    '{',
    '    public class Gruss',
    '    {',
    '        public string Hallo(string name)',
    '        {',
    `            return ${gruss} + name;`,
    '        }',
    '',
    '        public int Zahl()',
    '        {',
    '            return 42;',
    '        }',
    '    }',
    '}',
    '',
  ].join('\n');
}

function repoX(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, '<b>x</b>.txt', 'eins\n');
  return { ordner, hashes: { x: commitAnlegen(ordner, { betreff: 'Seltsamer Name' }) } };
}

/** Repo V (R00032): `v1` „Breite Zeile“ legt `breit.txt` an (Zeile 2 = 300 Zeichen), `v2` „Andere Datei“ legt `schmal.txt` an,
    `v3` „Erste Zeile“ ändert `breit.txt` — die Auswahl `v1` und `v3` bildet keine lückenlose Kette (es fehlt `v2`). */
function repoV(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'breit.txt', `kurz\n${'0123456789'.repeat(30)}\n`);
  const v1 = commitAnlegen(ordner, { betreff: 'Breite Zeile' });
  dateiSchreiben(ordner, 'schmal.txt', 'a\nb\n');
  const v2 = commitAnlegen(ordner, { betreff: 'Andere Datei' });
  dateiSchreiben(ordner, 'breit.txt', `KURZ\n${'0123456789'.repeat(30)}\n`);
  const v3 = commitAnlegen(ordner, { betreff: 'Erste Zeile' });
  return { ordner, hashes: { v1, v2, v3 } };
}

/** Repo K: ein Commit `k` mit Binärdateien aus Null-Bytes (100 KB, 500 KB, 3 MB) und 200 KB Zufall (fester Startwert) neben der kleinen `klein.txt`. */
function repoK(ordner) {
  repoAnlegen(ordner);
  for (const [name, bytes] of Object.entries({ 'k100.bin': 100000, 'k500.bin': 500000, 'k3m.bin': 3000000 })) {
    fs.writeFileSync(path.join(ordner, name), Buffer.alloc(bytes));
  }
  fs.writeFileSync(path.join(ordner, 'z200.bin'), zufallsBytes(200000));
  dateiSchreiben(ordner, 'klein.txt', 'eins\n');
  return { ordner, hashes: { k: commitAnlegen(ordner, { betreff: 'Große Binärdateien' }) } };
}

/** Repo G der Gruppenkarte (R00040): `g1` „Anlegen“ legt acht Dateien der drei Gruppen an, `g2` „Ändern“ ändert `src/app.js`
    und `docs/api.md`. Reihenfolge von git: README.md, docs/api.md, src/Contest.cs, src/a.txt, src/app.js, tests/README.md,
    tests/app.test.js, web/haken-werte.spec.js. */
function repoGruppen(ordner) {
  repoAnlegen(ordner);
  dateiSchreiben(ordner, 'src/app.js', 'app 1\n');
  dateiSchreiben(ordner, 'src/Contest.cs', 'contest\n');
  dateiSchreiben(ordner, 'src/a.txt', 'a\n');
  dateiSchreiben(ordner, 'tests/app.test.js', 'test\n');
  dateiSchreiben(ordner, 'web/haken-werte.spec.js', 'spec\n');
  dateiSchreiben(ordner, 'tests/README.md', 'testdoku\n');
  dateiSchreiben(ordner, 'docs/api.md', 'api 1\n');
  dateiSchreiben(ordner, 'README.md', 'readme\n');
  const g1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'src/app.js', 'app 2\n');
  dateiSchreiben(ordner, 'docs/api.md', 'api 2\n');
  const g2 = commitAnlegen(ordner, { betreff: 'Ändern' });
  return { ordner, hashes: { g1, g2 } };
}

/** Repo P der Dateisuche (R00049): `p1` „Anlegen“ legt acht Dateien an (Code 5, Tests 1, Doku 2), `p2` „Ändern“ ändert
    `src/app.js` und `db/002_aendern.sql`. `zusatz` sind weitere Dateien des `p1`-Commits (der Fake der Kriterien 2 und 7). */
function repoP(ordner, zusatz = {}) {
  repoAnlegen(ordner);
  const dateien = {
    'README.md': 'readme\n',
    'db/001_anlegen.sql': 'anlegen 1\n',
    'db/002_aendern.sql': 'aendern 1\n',
    'docs/api.md': 'api 1\n',
    'src/app.js': 'app 1\n',
    'src/data/app.sql': 'daten 1\n',
    'src/util.js': 'util 1\n',
    'tests/app.test.js': 'test 1\n',
    ...zusatz,
  };
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    dateiSchreiben(ordner, pfad, inhalt);
  }
  const p1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'src/app.js', 'app 2\n');
  dateiSchreiben(ordner, 'db/002_aendern.sql', 'aendern 2\n');
  const p2 = commitAnlegen(ordner, { betreff: 'Ändern' });
  return { ordner, hashes: { p1, p2 } };
}

/** Repo P der User Story R00049 mit **langer Zeile** in `src/app.js` (Befund der Karte #63, R00053): dieselben acht Dateien
    wie `repoP`, `src/app.js` trägt zwei Zeilen, davon eine lange; `q2` „Ändern“ stellt beide um und ändert `db/002_aendern.sql`.
    `repoP` selbst bleibt unverändert (die Specs der Dateisuche prüfen es). */
function repoPLang(ordner) {
  repoAnlegen(ordner);
  const dateien = {
    'README.md': 'readme\n',
    'db/001_anlegen.sql': 'anlegen 1\n',
    'db/002_aendern.sql': 'aendern 1\n',
    'docs/api.md': 'api 1\n',
    'src/app.js': 'app eins\napp zwei\n',
    'src/data/app.sql': 'daten 1\n',
    'src/util.js': 'util 1\n',
    'tests/app.test.js': 'test 1\n',
  };
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    dateiSchreiben(ordner, pfad, inhalt);
  }
  const q1 = commitAnlegen(ordner, { betreff: 'Anlegen' });
  dateiSchreiben(ordner, 'src/app.js', 'app eins geaendert\napp zwei mit deutlich mehr Zeichen\n');
  dateiSchreiben(ordner, 'db/002_aendern.sql', 'aendern 2\n');
  const q2 = commitAnlegen(ordner, { betreff: 'Aendern' });
  return { ordner, hashes: { q1, q2 } };
}

function zufallsBytes(anzahl) {
  const bytes = Buffer.alloc(anzahl);
  let zustand = 12345;
  for (let stelle = 0; stelle < anzahl; stelle += 1) {
    zustand = (Math.imul(zustand, 1103515245) + 12345) >>> 0;
    bytes[stelle] = zustand >>> 24;
  }
  return bytes;
}

module.exports = { repoGruppen, repoAbsicht, repoUmbenennung, repoP, repoPLang, repoV, repoG, repoKlammern, repoX, repoK, repoZ, repoZeilenbereich, repoQ, repoS, repoL, repoStill, repoMitRumpf, repoMitBidiPfad, repoMitUnsichtbarenNamen, repoMitBidiBetreff, repoA, repoAAusUnterordner, repoMitSubmodulAlsLog, repoMitVerstecktemCode, repoMitBinaerausgabe, repoAMitDiffProgrammen, repoAMitFremdenEinstellungen, repoM, repoU, repoUMitV, repoGross, repoGrossOhneKette, repoW, repoC, repoY, repoLangerPfad, markerVorhanden, diffProgrammOhneSchutzStarten };
