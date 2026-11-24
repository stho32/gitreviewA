'use strict';
// Treiber Prozess: startet gitreviewA als echten Prozess, sammelt stdout und stderr, kennt die Startzeile.
const { spawn, execFileSync } = require('child_process');
const { programmPfad } = require('./programm-pfad.js');

const STARTZEILE_ADRESSE = /http:\/\/127\.0\.0\.1:(\d+)\//;
const DOTNET = execFileSync('which', ['dotnet'], { encoding: 'utf8' }).trim();

/**
 * `eingabe`: ohne Angabe ist stdin leer (/dev/null); `{ text }` schreibt den Text in eine Pipe und schließt sie;
 * `{ offen: true }` lässt die Pipe offen, ohne etwas zu schreiben.
 */
function programmStarten(ordner, argumente, umgebung, eingabe) {
  return prozessStarten(DOTNET, [programmPfad(), ...argumente], ordner, umgebung, eingabe);
}

/** Startet eine veröffentlichte Einzeldatei direkt (ohne `dotnet`). */
function programmDateiStarten(datei, ordner, argumente, umgebung, eingabe) {
  return prozessStarten(datei, argumente, ordner, umgebung, eingabe);
}

function prozessStarten(befehl, argumente, ordner, umgebung, eingabe) {
  const gestartetUmMs = Date.now();
  let stdinArt = 'ignore';
  if (eingabe) {
    stdinArt = 'pipe';
  }
  const kind = spawn(befehl, argumente, {
    cwd: ordner,
    env: { ...process.env, ...umgebung },
    stdio: [stdinArt, 'pipe', 'pipe'],
  });
  const lauf = laufVerfolgen(kind, kind, gestartetUmMs);
  const textSchreiben = eingabe && eingabe.text !== undefined;
  if (textSchreiben) {
    kind.stdin.on('error', () => {});
    kind.stdin.end(eingabe.text);
  }
  return lauf;
}

/** Startet gitreviewA mit einem Pseudo-Terminal als stdin (`script` aus util-linux); stdout und stderr landen beide in `stderr`. */
function programmImTerminalStarten(ordner, argumente) {
  const gestartetUmMs = Date.now();
  const befehl = [DOTNET, programmPfad(), ...argumente].map(inEinfachenAnfuehrungszeichen).join(' ');
  const kind = spawn('script', ['-qec', befehl, '/dev/null'], { cwd: ordner, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  const lauf = laufVerfolgen(kind, kind, gestartetUmMs);
  kind.stdout.on('data', daten => { lauf.stderr += daten; });
  return lauf;
}

function inEinfachenAnfuehrungszeichen(text) {
  return `'${text.replace(/'/g, "'\\''")}'`;
}

/** Sammelt stdout und stderr von `kind`; `signalZiel` ist der Prozess, den Signale und Abfragen treffen. */
function laufVerfolgen(kind, signalZiel, gestartetUmMs) {
  const lauf = { kind: signalZiel, gestartetUmMs, stdout: '', stderr: '', exitCode: null };
  kind.stdout.setEncoding('utf8');
  kind.stderr.setEncoding('utf8');
  kind.stdout.on('data', daten => { lauf.stdout += daten; });
  kind.stderr.on('data', daten => { lauf.stderr += daten; });
  lauf.stderrStrom = kind.stderr;
  lauf.beendet = new Promise(fertig => kind.once('exit', code => { lauf.exitCode = code; fertig(code); }));
  return lauf;
}

/** Wartet auf die Adresse aus der Startzeile; endet der Prozess vorher, ist das ein Fehler mit seinem stderr. */
function adresseAbwarten(lauf, fristMs) {
  return new Promise((gefunden, fehlgeschlagen) => {
    const frist = setTimeout(() => fehlgeschlagen(new Error(`keine Startzeile nach ${fristMs} ms; stderr: ${lauf.stderr}`)), fristMs);
    const pruefen = () => {
      const treffer = STARTZEILE_ADRESSE.exec(lauf.stderr);
      if (treffer) {
        clearTimeout(frist);
        gefunden(treffer[0]);
      }
    };
    lauf.stderrStrom.on('data', pruefen);
    lauf.beendet.then(code => {
      clearTimeout(frist);
      fehlgeschlagen(new Error(`gitreviewA endete mit ${code} vor der Startzeile; stderr: ${lauf.stderr}`));
    });
    pruefen();
  });
}

async function programmBeenden(lauf) {
  const laeuftNoch = lauf.exitCode === null;
  if (laeuftNoch) {
    lauf.kind.kill('SIGKILL');
  }
  await lauf.beendet;
}

/** Lauschende Adressen des Prozesses laut `ss -ltnp` (Linux). */
function lauschendeAdressen(lauf) {
  const ausgabe = execFileSync('ss', ['-ltnpH'], { encoding: 'utf8' });
  const eigeneZeilen = ausgabe.split('\n').filter(zeile => zeile.includes(`pid=${lauf.kind.pid},`));
  return eigeneZeilen.map(zeile => zeile.trim().split(/\s+/)[3]);
}

module.exports = { DOTNET, laufVerfolgen, programmStarten, programmDateiStarten, programmImTerminalStarten, adresseAbwarten, programmBeenden, lauschendeAdressen };
