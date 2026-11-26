'use strict';
// Bausteintest der gemeinsamen Zeitschranken (R00047, B4301, R00041 Kriterium 6): drei Zahlen an einer Stelle, die Specs
// und DSL lesen. Die Werte stehen hier als Vertrag der Anforderung — sie sind die einzige Stelle, an der die Zahlen noch einmal
// stehen, damit ein Mutant „Wert zu klein“ (3000) und „Wert zu groß“ (8000) diesen Test rot macht; gelesen werden sie
// sonst nur aus `dsl/schranken.js`. Der Helfer weist jede Messung über der Schranke ab und nimmt die an der Schranke an.
const { test, expect } = require('@playwright/test');
const { anzeigeSchrankeMs, abschlussDialogSchrankeMs, einfrierSchrankeMs, erwarteBinnenAnzeigeSchranke, erwarteBinnenAbschlussSchranke, erwarteUnterEinfrierSchranke } = require('../../dsl/schranken.js');

test.describe('Baustein Schranken — grobe Zeitschranken an einer Stelle (R00047, B4301)', () => {
  test('soll die Schranken der Anforderung führen: Anzeige 5 s, Abschlussdialog 15 s, Einfrier 2 s', () => {
    expect(anzeigeSchrankeMs).toBe(5000);
    expect(abschlussDialogSchrankeMs).toBe(15000);
    expect(einfrierSchrankeMs).toBe(2000);
    expect(einfrierSchrankeMs).toBeLessThan(anzeigeSchrankeMs);
  });

  test('soll eine Messung an der Schranke annehmen und eine über der Schranke abweisen', () => {
    expect(() => erwarteBinnenAnzeigeSchranke(anzeigeSchrankeMs, 'an der Anzeige-Schranke')).not.toThrow();
    expect(() => erwarteBinnenAnzeigeSchranke(anzeigeSchrankeMs + 1, 'über der Anzeige-Schranke')).toThrow('Anzeige-Schranke');
    expect(() => erwarteBinnenAbschlussSchranke(abschlussDialogSchrankeMs, 'an der Abschluss-Schranke')).not.toThrow();
    expect(() => erwarteBinnenAbschlussSchranke(abschlussDialogSchrankeMs + 1, 'über der Abschluss-Schranke')).toThrow('Abschluss-Dialog-Schranke');
    expect(() => erwarteUnterEinfrierSchranke(einfrierSchrankeMs, 'an der Einfrier-Schranke')).not.toThrow();
    expect(() => erwarteUnterEinfrierSchranke(einfrierSchrankeMs + 1, 'über der Einfrier-Schranke')).toThrow('Einfrier-Schranke');
  });
});
