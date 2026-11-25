'use strict';
// Spezifikation R00025 „Dateien ausblenden“ am Programm als Prozess (ohne Browser): Exit-Codes, stdout/stderr getrennt, git-Aufrufe.
const { test, expect, REPO_Q } = require('../dsl/ausblenden.js');

const ZWANZIG = [];
for (let i = 0; i < 20; i += 1) {
  ZWANZIG.push('--ignore', '*.lock');
}
const EINUNDZWANZIG = [...ZWANZIG, '--ignore', '*.lock'];

test.describe('Ausblenden — Programm', () => {
  test('soll jedes ungültige --ignore vor dem Server mit Exit 2, einer Meldung und ohne git abweisen (Kriterium 3)', async ({ ausblendenProgramm: p }) => {
    const ungueltigeWerte = ['', '   ', 'a'.repeat(201), 'a\nb', 'a\u202Eb'];

    for (const muster of ungueltigeWerte) {
      await p.starten({ zusatz: ['--ignore', muster], erwarteStart: false });

      const exitCode = await p.aufEnde();

      expect(exitCode, `Exit-Code für Muster ${JSON.stringify(muster)}`).toBe(2);
      expect(p.stdout()).toBe('');
      expect(p.stderrZeilen().filter(zeile => zeile.length > 0)).toHaveLength(1);
      expect(p.stderr()).not.toContain('127.0.0.1');
      expect(p.gitAufrufe()).toEqual([]);
    }
  });

  test('soll ein leeres --ignore ohne Wert und ein 21. Muster abweisen (Kriterium 3)', async ({ ausblendenProgramm: p }) => {
    await p.starten({ zusatz: ['--ignore'], erwarteStart: false, mitBrowser: true });
    expect(await p.aufEnde()).toBe(2);
    expect(p.stdout()).toBe('');

    await p.starten({ zusatz: EINUNDZWANZIG, erwarteStart: false });
    const exitCode = await p.aufEnde();
    expect(exitCode).toBe(2);
    expect(p.stderrZeilen().filter(zeile => zeile.length > 0)).toHaveLength(1);
  });

  test('soll gültige Muster – *, „ a “ und zwanzig – den Server starten lassen (Kriterium 3)', async ({ ausblendenProgramm: p }) => {
    for (const zusatz of [['--ignore', '*'], ['--ignore', ' a '], ZWANZIG]) {
      const lauf = await p.starten({ zusatz });

      expect(lauf.adresse).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
      await p.laufAbbrechen();
    }
  });

  test('soll die ausgeblendete Datei im Ergebnis ungeprüft nennen (Kriterium 5)', async ({ ausblendenProgramm: p }) => {
    await p.starten({ zusatz: ['--ignore', '*.lock'] });
    const antwort = await p.ueberDieSchnittstelleAbhaken('README.md');
    expect(antwort.status).toBe(200);

    await p.beendenAnfordern();
    const exitCode = await p.aufEnde();

    expect(exitCode).toBe(0);
    const ergebnis = p.ergebnis();
    expect(ergebnis).toContain('Abgehakt: 1 von 7');
    expect(ergebnis).toContain('Ungeprüft: 6 von 7');
    expect(ergebnis).toContain(`- app.lock (Commit ${p.hash()})`);
  });

  test('soll einen fremden Namen markieren und das Muster nur als Länge protokollieren (Kriterium 9)', async ({ ausblendenProgramm: p }) => {
    await p.starten({ dateien: { ...REPO_Q, 'ab\u202E.lock': 'x\n' }, zusatz: ['--ignore', '*.lock', '--verbose'] });
    await p.ueberDieSchnittstelleAbhaken('README.md');

    await p.beendenAnfordern();
    await p.aufEnde();

    const ergebnis = p.ergebnis();
    expect(ergebnis).toContain('ab⟨U+202E⟩.lock');
    expect(ergebnis).not.toMatch(/[\u202E\u200B]/u);
    expect(p.stderr()).toContain('1 Muster (Längen: 6)');
    expect(p.stderr()).not.toContain('*.lock');
    expect(p.ergebnis()).not.toContain('*.lock');
  });

  test('soll kein Muster an git geben, kein Programm der fremden Konfiguration starten und dieselben Aufrufe machen (Kriterium 4)', async ({ gr, ausblendenProgramm: p }) => {
    const ohne = await p.laufMit(gr.gemerktesRepo(p.fremdKonfiguriertesRepo()), ['--verbose']);
    const mit = await p.laufMit(gr.gemerktesRepo(p.fremdKonfiguriertesRepo()), ['--ignore', '*.lock', '--verbose']);

    expect(mit.marke).toBe(false);
    expect(mit.aufrufe.some(aufruf => aufruf.includes('*.lock'))).toBe(false);
    expect([...mit.aufrufe].sort()).toEqual([...ohne.aufrufe].sort());
  });
});
