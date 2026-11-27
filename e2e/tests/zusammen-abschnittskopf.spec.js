'use strict';
// Spezifikation R00012 „Oberfläche Liste–Detail“: fremder Text erscheint nie roh — Betreff im Abschnittskopf ohne Kette wie in der
// Commit-Zeile (Befund M1, Sicherheit der Anforderung). Browser-Eigenes: Darstellung. Die reine Regel prüft
// bausteine/commit-werte.spec.js.
const { test } = require('../dsl/diff-lesen.js');

test('soll den Betreff im Abschnittskopf ohne Kette so zeigen wie die Commit-Zeile, nie roh', async ({ diff }) => {
  await diff.starten({ vorbereitung: 'Bidi im Betreff', commits: ['b1', 'b3'], modus: 'zusammen' });

  await diff.dateiAnsehen('a.txt');
  const kurz = name => diff.hash(name).slice(0, 7);
  await diff.abschnittskopfZeigt('b1', `Commit ${kurz('b1')} · Start ⟨U+202E⟩oberflaeche`, '\u202E');
  await diff.abschnittskopfZeigt('b3', `Commit ${kurz('b3')} · a wächst`, '\u202E');
});