'use strict';
// Treiber Beobachtung: was der Prozess auf stdout und stderr schreibt und welche git-Aufrufe er startet; die Prüfungen dazu sitzen hier.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');
const { anfrage } = require('./http.js');

/** Ein `git` vorne in PATH, das je Aufruf seine Argumente in eine Datei schreibt und dann das echte git ausführt. */
function gitZaehlerAnlegen(ordner) {
  const protokoll = path.join(ordner, 'aufrufe.txt');
  const echtesGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(ordner, 'git'), `#!/bin/sh\necho "$*" >> '${protokoll}'\nexec '${echtesGit}' "$@"\n`, { mode: 0o755 });
  const aufrufe = () => {
    if (!fs.existsSync(protokoll)) {
      return [];
    }
    return fs.readFileSync(protokoll, 'utf8').split('\n').filter(zeile => zeile.length > 0);
  };
  return { ordner, aufrufe };
}

/**
 * Zahl der git-Aufrufe je Unterbefehl, z. B. `{ log: 1, show: 2 }`; Unterbefehle, die nicht genannt sind, zählen nicht mit.
 * `uebersicht` ist das `git log --numstat` der Übersicht aller Dateien (R00011); `log` zählt nur die übrigen `git log` (Commit-Leiste).
 */
async function pruefeGitAufrufe(zaehler, erwartet) {
  const istUebersicht = aufruf => aufruf.split(' ').includes('log') && aufruf.split(' ').includes('--numstat');
  const zaehle = unterbefehl => zaehler.aufrufe().filter(aufruf => {
    if (unterbefehl === 'uebersicht') {
      return istUebersicht(aufruf);
    }
    return aufruf.split(' ').includes(unterbefehl) && !istUebersicht(aufruf);
  }).length;
  for (const [unterbefehl, anzahl] of Object.entries(erwartet)) {
    await expect.poll(() => zaehle(unterbefehl), `git ${unterbefehl}`).toBe(anzahl);
  }
}

function stderrZeilenMit(lauf, text) {
  return lauf.stderr.split('\n').filter(zeile => zeile.includes(text));
}

/** Je Hash die Zahl der Debug-Zeilen `GET /api/commits/<hash>/dateien` auf stderr. */
async function pruefeDateienGelesen(lauf, erwartetJeHash) {
  for (const [hash, anzahl] of Object.entries(erwartetJeHash)) {
    await expect.poll(() => stderrZeilenMit(lauf, `GET /api/commits/${hash}/dateien`).length, `Lesezeilen für ${hash}`).toBe(anzahl);
  }
}

function pruefeFehlerzeileMit(lauf, text) {
  const fehlerzeilen = stderrZeilenMit(lauf, ' FEHLER ').filter(zeile => zeile.includes(text));
  expect(fehlerzeilen).toHaveLength(1);
}

function pruefeStdoutLeer(lauf) {
  expect(lauf.stdout).toBe('');
}

/** Fragt die Dateiliste mit `text` als Hash ab und prüft den Status. */
async function pruefeDateienAntwort(lauf, text, status) {
  const antwort = await anfrage(lauf.adresse, `/api/commits/${encodeURIComponent(text)}/dateien`);
  expect(antwort.status, `Dateiliste für »${text}«`).toBe(status);
}

function pruefeDateiFehlt(ordner, name) {
  expect(fs.existsSync(path.join(ordner, name))).toBe(false);
}

module.exports = { gitZaehlerAnlegen, pruefeGitAufrufe, pruefeDateienGelesen, pruefeFehlerzeileMit, pruefeStdoutLeer, pruefeDateienAntwort, pruefeDateiFehlt };
