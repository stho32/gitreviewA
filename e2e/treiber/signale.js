'use strict';
// Treiber Signale: sendet Prozesssignale an den gestarteten Lauf (nie über ein Prozessmuster) und prüft dessen Ende.
const { expect } = require('@playwright/test');

const STRG_C = 'SIGINT';
const BEENDIGUNGSSIGNAL = 'SIGTERM';
const EXIT_ABGEBROCHEN = 130;
const ABBRUCH_FRIST_MS = 5000;
const ABBRUCHMELDUNG = 'Review abgebrochen';
const WARNZEILE = / WARNUNG \[[^\]]+\] Review abgebrochen$/;

/** Über das Kindprozess-Objekt, damit ein schon beendeter Lauf keine fremde, wiederverwendete PID trifft. */
function signalSenden(lauf, signal) {
  lauf.kind.kill(signal);
}

async function signalSendenUndEndeMessen(lauf, signal) {
  const gesendetUmMs = performance.now();
  signalSenden(lauf, signal);
  await lauf.beendet;
  return performance.now() - gesendetUmMs;
}

async function pruefeAbbruchOhneErgebnis(lauf) {
  const exitCode = await endeAbwarten(lauf);
  const abbruchzeilen = lauf.stderr.split('\n').filter(zeile => zeile.includes(ABBRUCHMELDUNG));
  expect(exitCode, `Exit-Code; stderr: ${lauf.stderr}`).toBe(EXIT_ABGEBROCHEN);
  expect(Buffer.byteLength(lauf.stdout), 'Bytes auf stdout').toBe(0);
  expect(abbruchzeilen).toHaveLength(1);
  expect(abbruchzeilen[0]).toMatch(WARNZEILE);
}

function pruefeLaeuftOhneErgebnis(lauf) {
  expect(lauf.exitCode, `Lauf endete; stderr: ${lauf.stderr}`).toBeNull();
  expect(() => process.kill(lauf.kind.pid, 0)).not.toThrow();
  expect(lauf.stdout).toBe('');
}

async function endeAbwarten(lauf) {
  let frist;
  const fristAbgelaufen = new Promise((_, abgelaufen) => {
    frist = setTimeout(() => abgelaufen(new Error(`Lauf ${ABBRUCH_FRIST_MS} ms nach dem Abbruch nicht beendet; stderr: ${lauf.stderr}`)), ABBRUCH_FRIST_MS);
  });
  try {
    return await Promise.race([lauf.beendet, fristAbgelaufen]);
  } finally {
    clearTimeout(frist);
  }
}

module.exports = {
  STRG_C, BEENDIGUNGSSIGNAL, signalSenden, signalSendenUndEndeMessen, pruefeAbbruchOhneErgebnis, pruefeLaeuftOhneErgebnis,
};
