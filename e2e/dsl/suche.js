'use strict';
// Testdaten und -sprache „Im Diff suchen“ (R00027): Wegwerf-Repo Y und die Fachwörter. Die Treiber darunter (Prozess, HTTP, git,
// Seite) kennen die Selektoren; die Rechnung selbst prüfen die Bausteintests (suche-werte.spec.js). Kein neuer Serverweg: die Suche
// läuft ganz im Browser über die schon gezeigten Zeilen.
const seite = require('../treiber/oberflaeche.js');
const { expect } = require('@playwright/test');

const SUCHE_TXT = ['z01 eins zwei', 'z02 zwei drei', 'z03 drei zwei', 'z04 vier', 'z05 zwei vier', 'z06 a.c', 'z07 abc'].join('\n') + '\n';
const FREMD_TXT = 'var s = "<b>x</b>";\nvar t = "a\u202Eb";\n';
const FARBIG_JS = 'function gruss() { return "Hallo"; }\nreturn gruss();\n';

/** `anzahl` Zeilen `<praefix> 00001` … — für die große Datei (20 000 Zeilen) und die zugeklappte (30 000 Zeilen). */
function nummernZeilen(anzahl, praefix) {
  return Array.from({ length: anzahl }, (_, index) => `${praefix} ${String(index + 1).padStart(5, '0')}`).join('\n') + '\n';
}

/** Wegwerf-Repo Y der Anforderung; mit `gross` auch `gross.txt` (20 000 Zeilen) und `riesig.txt` (30 000 Zeilen). */
function repoSuchen(gr, { gross = false } = {}) {
  const dateien = { 'suche.txt': SUCHE_TXT, 'fremd.txt': FREMD_TXT, 'farbig.js': FARBIG_JS };
  if (gross) {
    dateien['gross.txt'] = nummernZeilen(20000, 'zeile');
    dateien['riesig.txt'] = nummernZeilen(30000, 'zeile');
  }
  return gr.repoMitDateien(dateien);
}

/** Wählt eine Datei und wartet, bis ihr Diff `zeilen` Zeilen gezeichnet hat. */
async function dateiUndWarten(page, gr, name, zeilen) {
  await seite.dateiWaehlen(page, name);
  await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(zeilen);
}

module.exports = { SUCHE_TXT, FREMD_TXT, FARBIG_JS, nummernZeilen, repoSuchen, dateiUndWarten };
