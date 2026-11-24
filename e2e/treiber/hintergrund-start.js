'use strict';
// Treiber Hintergrundstart: startet gitreviewA so, wie eine aufrufende KI es tut — aus einem nicht-interaktiven
// Skript mit `… &`. Bash setzt dort SIGINT auf „ignorieren“; das erbt gitreviewA.
const { spawn } = require('child_process');
const { expect } = require('@playwright/test');
const { DOTNET, laufVerfolgen } = require('./programm.js');
const { programmPfad } = require('./programm-pfad.js');

const SIGINT_BIT = 1n << 1n;
const PID_FRIST_MS = 5000;

// Kanal 3 meldet zuerst die ignorierten Signale eines Geschwisterprozesses (Startbedingung), dann die PID des Laufs.
const SKRIPT = [
  "grep '^SigIgn:' /proc/self/status >&3 & wait $!",
  '"$@" 3>&- & echo "pid $!" >&3',
  'exec 3>&-',
  'wait $!',
].join('\n');

/** `mitSetsid` stellt `setsid` vor den Aufruf (eigene Sitzung, gleiche PID). */
function imHintergrundStarten(ordner, argumente, { mitSetsid = false } = {}) {
  const gestartetUmMs = Date.now();
  const aufruf = [DOTNET, programmPfad(), ...argumente];
  if (mitSetsid) {
    aufruf.unshift('setsid');
  }
  const skript = spawn('bash', ['-c', SKRIPT, 'hintergrund', ...aufruf], {
    cwd: ordner,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
  });
  const ziel = { pid: null, kill: signal => signalAnLauf(lauf, skript, signal) };
  const lauf = laufVerfolgen(skript, ziel, gestartetUmMs);
  lauf.startbedingung = kanalLesen(skript.stdio[3], lauf).then(angaben => {
    ziel.pid = angaben.pid;
    return { sigintIgnoriert: angaben.sigintIgnoriert };
  });
  return lauf;
}

/** Nur solange das Skript lebt — danach könnte die PID schon einem fremden Prozess gehören; ohne PID trifft es das Skript. */
function signalAnLauf(lauf, skript, signal) {
  if (lauf.exitCode !== null) {
    return;
  }
  if (lauf.kind.pid === null) {
    skript.kill(signal);
    return;
  }
  process.kill(lauf.kind.pid, signal);
}

/** Ohne ignoriertes SIGINT prüft ein Test im Hintergrund nichts anderes als der Start über Node. */
async function pruefeSigintIgnoriert(lauf) {
  const { sigintIgnoriert } = await lauf.startbedingung;
  expect(sigintIgnoriert, 'Startbedingung: SIGINT im Hintergrundskript ignoriert').toBe(true);
}

function kanalLesen(kanal, lauf) {
  return new Promise((gelesen, fehlgeschlagen) => {
    let text = '';
    const frist = setTimeout(() => fehlgeschlagen(new Error(`keine PID nach ${PID_FRIST_MS} ms; stderr: ${lauf.stderr}`)), PID_FRIST_MS);
    kanal.setEncoding('utf8');
    kanal.on('data', daten => {
      text += daten;
      const pid = /^pid (\d+)$/m.exec(text);
      const ignoriert = /^SigIgn:\s*([0-9a-f]+)$/m.exec(text);
      if (pid && ignoriert) {
        clearTimeout(frist);
        gelesen({ pid: Number(pid[1]), sigintIgnoriert: (BigInt(`0x${ignoriert[1]}`) & SIGINT_BIT) !== 0n });
      }
    });
  });
}

module.exports = { imHintergrundStarten, pruefeSigintIgnoriert };
