'use strict';
// Treiber Repository „Repo V“ der User Story R00024 (Commits p und q). Angelegt mit einem bash-Skript, weil die Bildbytes
// eingebettete base64-Zeichenketten und der Name `bilder/b\xff.png` kein gültiges UTF-8 ist (Node legt nur UTF-8-Namen an).
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { GIT_UMGEBUNG } = require('./wegwerf-repo.js');

const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG2 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const JPG = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
const GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const WEBP = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
const PNGWEG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/VscvDQAAAABJRU5ErkJggg==';
const PNGALT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNg+M/wHwAEAQH/rrVV9QAAAABJRU5ErkJggg==';
const PNGNEU = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYPj/HwADAgH/OSkZvgAAAABJRU5ErkJggg==';
const PNGGROSS = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAG40lEQVR42gHYBif5AEQggjz95vHCazD5DsfdAeSIdTSiDwsNBMNu2A5x4P13sHZw65QL1TNflz2q2GGbkf/JEfV8ztRYu78s4DdTyb36D/AWnclXVgB0BmZ2z7C064kCxEJp2hz2umbT+LbUsQCp6g51WlwughAkKgjnB49/iThesJQjVVGCVouW6KT+8joMn8Wv12CEN4Fr3QpzCcsAShJS5Npw5nIPyqTaHphAbBicJCeemFHVgUIEE2/rVxPBZrEyad1j/DXHl/8Ips2QCVBmp0Wt222IMcKw+HghFCtEVlVtiaqCALytrjqVePpFNaQU0CXCS0CuOsEncimIupc66o03F5cGBy7TOhRgetdSO+ZVe1E03sGWgfShM2qiFA0Fl6PmyKDMICCi6TmAbgDwtoRdap1lfrgpjy3lLq10x50Vp1+im32rMy99cAp8zSWJJCYLBZS3/PBOM6cnWFtMSKOcNpZAaUgQoWlbmd1QGH6BIOTcgOAA6AXKrVeE+AzVCR+1RkBGhI3LzVgtd/gDWqLgc3qg/fVz06yMcBgkvFFon5iZvlTtKz/BWk+A2m8a/cmyxFQULoIziCpHKeN7AMPdy1Sm4ED5bD3c0TyXjn/BAmHgCg98hWlYkUtmi5+A5Fa2+9c+asRokTcMPAaXRSa/n9+2pQA/4uaznMyt/DnBw2gBjmXs0QCcV+ZluAHH2s+sIvx+lArQT8uKWyUFsofSm03shPhW7xeKMtgjtSLiClRSL82Nm2pqeaqJIya87xlWmIq2dsjMWPeEqHGEfQ8AzqLdf4lhJVTjS4brU0ZG4biezXs7aZwiNnTLpPwzXxccC24R/eKvjDxYMHHMd/3mwVZ2eJHsx2znhKn+OG0oFwcC9aPEk2TMAFFNDwfGSh3CgkIo7JsHEh9CFYw83S5hDv9CjmLlx6iJhXx9Hlmz2x+002bZI4glgFoxTR5o2xYbLvC9MqAUQBDiQcrkDIougACmK5oRxB2FoEKFwjubMNl9aamtyPY1QuUPlVBmvcemMdGwQCEWmaDVmKO0i6YEPkyipqcj54/16LrCKBxEGPuAfa25vc6d7a4AVQ5LgHFEOV7SGTKINmiFIiglb1jdC7z5kXBm/HjZ57tg9iWD0GcEwvknztkUtOoDYZkCPZqhkNLRneeaQ+NHU4EE2RK8182QAAkuLgLEie2Lvvasxuk797VK1EsJWIW8QZPThJPXjN2r+G77zdkuIEJpTHUNNIFP9TLMXwEt2hpv2LEYNNY8h45b9RhtLMc/5QCW/sk79TZMxWdVg9WT/G2s+DQEsYgc4ZkzdYyKftJLQoNj0B1M04qP9ZyI+23/vPB7rVpc5kwdpkVtofz1qDxBR4NzLRlYO3MAZp3YpwIKnHArco+uicILPqixRzqASRWxJy80maJ/iRm5DyhHzL57MKiMBKQ5tECKzy7z1smacJpEGzhZe27ejAqAiobyQM41AL8juQ+d5ENPJkhu96u6lVFPw+HPPEqKlwQEQ8Iz6w/d2I290c/sGzLxEwAVOEe2irbyfXo2t1E7FKDYsYEc3tTAt5au4XlJHACuOlj5rj4L9WvEWct0M3+rqH3s8b38Y93hzD35iEBMBsDUNw0mXerBk09ONoIJ7ct0yAJ/2FFbr3omUlnAC2/aeBRhJ37L7jwAGMYtMPUXegYKn+6O1FVEouXVVcrHZv2OuE2Ej1kquKxJhIKBssSO7wZMQoFzZCRl23pH68hkKidOHQ/Pw9VGQiV7w0eSZ8u2AFtzmEmy+5UtmWrtC5Q0vuOCHRqhUUM0Od59ass+bMREggE9Z8H2dokTVXfSjNfMi/wyQl8I6Bb6bcmsfDAnFdjiYFhhxbhkdwC4Ia4a6hZaS5LwFiHKL8yayYm08Bn0CNqbokyOIbjUyAw6Egczqqy8Eb0l+CrkqwFSprhtSks3zqLXuK6FvBMgfofLkSomV4gA0ypAkIZ4azKN9RiaaCahrZdEEuK6Ew6h1VMU2V5ldzpCPojqZBy46au1cAQH+hBUgRQEdStYEWZr4pN8+76myCVjXGCY2vK6AAv5CjXdr60l12P99ObxVImayoSCngcX6uq2duNr86tKxN8bOLYEghucwQemrZ4ZaimoPSFBltGudw1du5qWwdfsJWXQdhV7cgB8ysJrTZm4AJ3j/ldKD73fr/qiOZWN2wWfLPs6cIffvnYbNFNClRgibwEf2AohHAQRraoJBGzwZoiXgHdda8geeucSqafQPQgAXi9eb3NamzIeoEog4kx2FpKwHS3iZnRePR1nGzsscJKB2H8QgGOms7bow8Ut2n36r1s6eiXfjZurvdHpurShyvEIvUGaVppARKZTfh5SJsYAAAAASUVORK5CYII=';

const SKRIPT = `
set -e
mkdir -p bilder
bild() { printf '%s' "$2" | base64 -d > "$1"; }
bild bilder/logo.png '__PNG1__'
bild bilder/weg.png '__PNGWEG__'
bild bilder/alt.png '__PNGALT__'
bild bilder/foto.jpg '__JPG__'
bild bilder/bunt.gif '__GIF__'
bild bilder/klein.webp '__WEBP__'
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>\\n' > bilder/karte.svg
printf 'nur Text\\n' > bilder/keinbild.png
printf 'eins\\nzwei\\ndrei\\nvier\\nfuenf\\nsechs\\n' > notizen.txt
git add -A && git commit -q -m "Start"
bild bilder/logo.png '__PNG2__'
bild bilder/neu.png '__PNGNEU__'
chmod +x bilder/foto.jpg bilder/bunt.gif bilder/klein.webp
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>\\n<!-- q -->\\n' > bilder/karte.svg
printf 'nur Text geaendert\\n' > bilder/keinbild.png
git rm -q bilder/weg.png
git mv bilder/alt.png bilder/umbenannt.png
git mv notizen.txt notizen2.txt && printf 'eins\\nZWEI\\ndrei\\nvier\\nfuenf\\nsechs\\n' > notizen2.txt
bild bilder/gross.png '__PNGGROSS__'
printf 'RIFF\\0' > bilder/roh.bin
head -c 200 /dev/zero > bilder/daten.bin
bild $'bilder/b\\xff.png' '__PNG1__'
git add -A && git commit -q -m "Bilder ändern"
rm -f -- $'bilder/b\\xff.png'
`;

function skriptErsetzt() {
  return SKRIPT
    .replaceAll('__PNGGROSS__', PNGGROSS)
    .replaceAll('__PNGWEG__', PNGWEG)
    .replaceAll('__PNGALT__', PNGALT)
    .replaceAll('__PNGNEU__', PNGNEU)
    .replaceAll('__PNG1__', PNG1)
    .replaceAll('__PNG2__', PNG2)
    .replaceAll('__JPG__', JPG)
    .replaceAll('__GIF__', GIF)
    .replaceAll('__WEBP__', WEBP);
}

/** Repo V: `p` fügt die Bilder an, `q` ändert, löscht, benennt um und fügt das Übergroße und den Rohbyte-Namen hinzu. */
function repoV() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-e2e-'));
  const git = (...argumente) => execFileSync('git', ['-C', ordner, ...argumente], { encoding: 'utf8', env: GIT_UMGEBUNG }).trim();
  git('init', '-q', '-b', 'main');
  execFileSync('bash', ['-c', skriptErsetzt()], { cwd: ordner, env: GIT_UMGEBUNG });
  const q = git('rev-parse', 'HEAD');
  const p = git('rev-parse', 'HEAD~1');
  return { ordner, hashes: { p, q }, png1: PNG1, png2: PNG2 };
}

/** Die Ausgabegrenze des Produkts (R00017): 8 MiB. */
const GRENZE_BYTES = 8388608;

// B2 (Nacharbeit): drei Dateien an und über der Ausgabegrenze — genau an der Grenze (der Blob wird noch ganz gelesen), knapp
// darüber (der Anfang kommt bis zur Grenze) und ein Bild darüber (die Art steht in den ersten Bytes, die Grenze greift).
const SKRIPT_GRENZE = `
set -e
head -c ${GRENZE_BYTES} /dev/zero > genau.bin
head -c ${GRENZE_BYTES + 1} /dev/zero > gross.bin
printf '\\x89PNG\\r\\n\\x1a\\n' > gross.png
head -c ${GRENZE_BYTES + 1} /dev/zero >> gross.png
git add -A && git commit -q -m "Grenze"
`;

/** Repo „Grenze“ (R00024, B2): ein Commit `q` mit `genau.bin`, `gross.bin` und `gross.png`. */
function repoGrenze() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-e2e-'));
  const git = (...argumente) => execFileSync('git', ['-C', ordner, ...argumente], { encoding: 'utf8', env: GIT_UMGEBUNG }).trim();
  git('init', '-q', '-b', 'main');
  execFileSync('bash', ['-c', SKRIPT_GRENZE], { cwd: ordner, env: GIT_UMGEBUNG });
  const q = git('rev-parse', 'HEAD');
  return { ordner, hashes: { q } };
}

// S3 (Nacharbeit): drei Commits, das Bild in `b1` angelegt und in `b3` geändert; `b2` ändert nur eine Notiz. Wählt der Mensch
// `b1` und `b3`, ist die Auswahl keine lückenlose Kette — der Diff steht je Commit in einem Abschnitt (R00012, Kriterium 4).
const SKRIPT_OHNE_KETTE = `
set -e
mkdir -p bilder
bild() { printf '%s' "$2" | base64 -d > "$1"; }
bild bilder/logo.png '__PNG1__'
git add -A && git commit -q -m "Bild anlegen"
printf 'dazwischen\\n' > notiz.txt
git add -A && git commit -q -m "Notiz ändern"
bild bilder/logo.png '__PNG2__'
git add -A && git commit -q -m "Bild ändern"
`;

/** Repo ohne Kette (R00024, S3): Commits `b1` (Bild angelegt), `b2` (Notiz), `b3` (Bild geändert). */
function repoOhneKette() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-e2e-'));
  const git = (...argumente) => execFileSync('git', ['-C', ordner, ...argumente], { encoding: 'utf8', env: GIT_UMGEBUNG }).trim();
  git('init', '-q', '-b', 'main');
  execFileSync('bash', ['-c', SKRIPT_OHNE_KETTE.replaceAll('__PNG1__', PNG1).replaceAll('__PNG2__', PNG2)], { cwd: ordner, env: GIT_UMGEBUNG });
  const b3 = git('rev-parse', 'HEAD');
  const b2 = git('rev-parse', 'HEAD~1');
  const b1 = git('rev-parse', 'HEAD~2');
  return { ordner, hashes: { b1, b2, b3 } };
}

module.exports = { repoV, repoGrenze, repoOhneKette, PNG1, PNG2 };
