'use strict';
// Treiber Repository für R00007: die Wegwerf-Repos F und L der User Story, wörtlich mit git und der Shell hergestellt,
// in einem Ordner, den der Aufrufer wegräumt.
const { execFileSync } = require('child_process');
const fs = require('fs');
const { git, GIT_UMGEBUNG } = require('./wegwerf-repo.js');

const REPO_F = String.raw`
git init -q -b main .
git config user.name "Anna Beispiel"; git config user.email anna@example.org
git config gc.auto 0; git config maintenance.auto false
zeile() { printf 'fn gruss(name: &str) -> String { format!("Hallo {}", %s) } // Gruß\n' "$1"; }
printf 'var a = 1;\n/* weg\n*/ var c = 3;\n' > seiten.js
{ zeile 42; zeile 41; } > rollen.rs
printf 'def alt(): pass\n' > alt.py
printf '// eins\n// zwei\n// drei\nfn y() {}\n' > umbenannt.txt
printf '/* Kopf\n   zwei\n   drei\n   vier\n   fünf\n*/\nvar x = 1;\n' > weit.js
git add -A && git commit -q -m "Start"
printf 'var a = 1;\nvar b = 2;\n*/ var c = 3;\n' > seiten.js
{ zeile 42; zeile 43; } > rollen.rs
printf '/* Kopf\n   zwei\n   drei\n   vier\n   fünf\n*/\nvar x = 2;\n' > weit.js
git rm -q alt.py
git mv umbenannt.txt umbenannt.rs && printf '// eins\n// zwei\n// drei\nfn z() {}\n' > umbenannt.rs
printf '/* Kopf\n   zweite Zeile\n*/\nfunction main() {}\n' > kommentar.js
printf 'var s = "<img src=x onerror=alert(1)>"; // <b>fett</b>\nvar t = "a\xe2\x80\xaeb";\n' > fremd.js
bsp() { printf '%s\n' "$2" > "beispiel.$1"; }
bsp cs 'public string Gruss(string name) { return "Hallo " + 42; }'
for e in js mjs cjs; do bsp $e 'function gruss(name) { return "Hallo " + 42; }'; done
bsp json '  "n": 42,'; bsp css '/* Gruß */'
for e in html htm xml svg; do bsp $e '<!-- Gruß -->'; done
bsp md 'Text mit ${'`'}code${'`'}'; bsp py 'def gruss(name):'
for e in sh bash; do bsp $e '# Gruß'; done
for e in yml yaml; do bsp $e 'n: 42'; done
bsp sql 'SELECT name FROM nutzer WHERE id = 42;'
bsp rs 'fn gruss(name: &str) -> String { format!("Hallo {}", 42) }'; bsp toml 'n = 42'
for e in ts mts cts; do bsp $e 'export abstract class Gruss { readonly n = 42; }'; done
for e in tsx go java c cpp; do bsp $e 'function f() {}'; done
printf 'function f() {}\n' > App.csproj; printf 'function f() {}\n' > Seite.razor
printf '<?php\necho "Hallo" . 42;\n' > beispiel.php
printf 'all:\n\tfn x() {}\n' > Makefile; printf 'fn x() {}\n' > notiz.unbekannt
printf 'fn x() {}\n' > LIESMICH; printf 'fn x() {}\n' > a.js.txt
mkdir SRC && printf 'fn y() {}\n' > SRC/GROSS.RS
git add -A && git commit -q -m "Farbige Dateien"
`;

const REPO_L = String.raw`
git init -q -b main .
git config user.name "Anna Beispiel"; git config user.email anna@example.org
git config gc.auto 0; git config maintenance.auto false
seq -f 'zeile%05g = 1;' 1 16000 > mittel.js
git add -A && git commit -q -m "Basis"
sed -i '8000s/= 1;/= 2;/' mittel.js
seq -f 'x%05g=1;' 1 20000 > gross.js
a999=$(printf 'a%.0s' $(seq 999)); a1000=${'$'}{a999}a
{ echo "$a999"; echo 'function g() {}'; } > grenze.js
{ echo "$a1000"; echo 'function h() {}'; } > drueber.js
{ for i in $(seq 299); do echo "$a999"; done; echo 'function g() {}'; } > zu-gross.js
muster=$(python3 -c "print(('<!-- '*200)[:999])"); for i in $(seq 64); do echo "$muster"; done > feindlich.md
echo 'fn gut() {}' > gut.rs
git add -A && git commit -q -m "Last und Grenzen"
`;

/** Dichte Inhalte (Befund B1 der Reviews zu #8): je Zeile bis zu 998 Farbstücke, alle Dateien knapp innerhalb der Grenzen; dazu
    `zahlen.js` mit 2000 Zeilen zu je einem Stück. */
const REPO_D = String.raw`
git init -q -b main .
git config user.name "Anna Beispiel"; git config user.email anna@example.org
git config gc.auto 0; git config maintenance.auto false
echo 'Basis' > LIESMICH
git add -A && git commit -q -m "Basis"
echo 'function ok() {}' > ok.js
wiederhole() { local i; for ((i = 0; i < $1; i++)); do printf '%s' "$2"; done; }
z() { local zeile; zeile=$(wiederhole "$2" "$3"); for ((i = 0; i < $1; i++)); do printf '%s\n' "$zeile"; done; }
z 256 998 '${'`'}' > dicht.js
z 256 998 '"' > dicht.php
z 256 499 '1,' > dicht.toml
eintraege=$(wiederhole 260 '1,'); for ((i = 0; i < 480; i++)); do printf 'var a%d=[%s];\n' "$i" "$eintraege"; done > dicht2.js
einsen=$(wiederhole 250 '1 '); for ((i = 0; i < 500; i++)); do printf 'x = %s;\n' "$einsen"; done > dicht3.js
seq 2000 | sed 's/.*/1/' > zahlen.js
git add -A && git commit -q -m "Dichte Inhalte"
`;

/** Repo F: `e` „Start“, `f` „Farbige Dateien“; Aufruf `f e`. */
function repoF(ordner) {
  skriptAusfuehren(ordner, REPO_F);
  return { ordner, hashes: { f: git(ordner, 'rev-parse', 'HEAD'), e: git(ordner, 'rev-parse', 'HEAD~1') } };
}

/** Repo L: „Basis“, dann `l` „Last und Grenzen“; Aufruf `l`. */
function repoL(ordner) {
  skriptAusfuehren(ordner, REPO_L);
  return { ordner, hashes: { l: git(ordner, 'rev-parse', 'HEAD') } };
}

function skriptAusfuehren(ordner, skript) {
  fs.mkdirSync(ordner, { recursive: true });
  execFileSync('bash', ['-e', '-c', skript], { cwd: ordner, env: GIT_UMGEBUNG, stdio: ['ignore', 'ignore', 'pipe'] });
}

/** Repo D: „Basis“, dann `d` „Dichte Inhalte“ mit ok.js; Aufruf `d`. */
function repoD(ordner) {
  skriptAusfuehren(ordner, REPO_D);
  return { ordner, hashes: { d: git(ordner, 'rev-parse', 'HEAD') } };
}

module.exports = { repoF, repoL, repoD };
