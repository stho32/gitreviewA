'use strict';
// Treiber Schnittstelle und Prozess für R00004: Diff-Anfragen über HTTP, Diff-Zeilen auf stderr und Diff-Aufrufe von git; die Prüfungen sitzen hier.
const { expect } = require('@playwright/test');
const { anfrage } = require('./http.js');

const DIFF_AUFRUF = '-U3';

function diffAdresse(hash, pfad) {
  const adresse = `/api/commits/${encodeURIComponent(hash)}/diff`;
  if (pfad === undefined) {
    return adresse;
  }
  return `${adresse}?${new URLSearchParams({ pfad })}`;
}

async function pruefeDiffAntwort(lauf, { hash, pfad, status }) {
  const antwort = await anfrage(lauf.adresse, diffAdresse(hash, pfad));
  expect(antwort.status, `Diff für »${hash}« und »${pfad}«`).toBe(status);
}

/** Zahl der Debug-Zeilen `GET /api/commits/<hash>/diff` auf stderr. */
async function pruefeDiffsGelesen(lauf, hash, anzahl) {
  const zeilen = () => lauf.stderr.split('\n').filter(zeile => zeile.includes(`GET /api/commits/${hash}/diff`)).length;
  await expect.poll(zeilen, `Diff-Zeilen für ${hash}`).toBe(anzahl);
}

/** Kein git-Aufruf, der einen Diff liest (die Dateiliste des Commits darf gelesen sein; sie bekommt keinen Pfad). */
function pruefeKeinDiffAufruf(zaehler) {
  const diffAufrufe = zaehler.aufrufe().filter(aufruf => aufruf.split(' ').includes(DIFF_AUFRUF));
  expect(diffAufrufe).toEqual([]);
}

function pruefeEinDiffAufruf(zaehler) {
  const diffAufrufe = zaehler.aufrufe().filter(aufruf => aufruf.split(' ').includes(DIFF_AUFRUF));
  expect(diffAufrufe).toHaveLength(1);
}

/** Genau eine Fehlerzeile, die Hash und Pfad nennt. */
function pruefeFehlerzeileMit(lauf, hash, pfad) {
  const fehlerzeilen = lauf.stderr.split('\n').filter(zeile => zeile.includes(' FEHLER ') && zeile.includes(hash) && zeile.includes(pfad));
  expect(fehlerzeilen).toHaveLength(1);
}

module.exports = { pruefeDiffAntwort, pruefeDiffsGelesen, pruefeKeinDiffAufruf, pruefeEinDiffAufruf, pruefeFehlerzeileMit };
