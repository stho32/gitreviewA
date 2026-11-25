'use strict';
// Spezifikation R00025 „Dateien ausblenden“ — Browser-Eigenes (Musterfeld, Fokus, Neuladen, Zähler, Sicht) am echten Programm.
// Ausblenden liegt nicht auf dem Hot Path (AI-Team/factory.md); die Unit-Regeln des Abgleichs prüfen die Bausteintests.
const { test, expect } = require('../dsl/gitreviewa.js');

const REPO_Q = {
  'README.md': 'a\nb\n',
  'src/a.txt': '1\n2\n3\n',
  'src/b.txt': '1\n2\n',
  'docs/README.md': 'x\n',
  'app.lock': 'lock\n',
  'build/out.log': 'log\n',
  'src/generated/api.cs': 'class X {}\n',
};
const SICHTBAR_MIT_ZWEI_MUSTERN = ['README.md', 'docs/README.md', 'src/a.txt', 'src/b.txt', 'src/generated/api.cs'];

async function repoQ(gr) {
  return gr.repoMitDateien({ ...REPO_Q });
}

async function dateinamen(page, gr) {
  const eintraege = await gr.dateilisteLesen(page);
  return eintraege.filter(eintrag => !eintrag.ordner).map(eintrag => eintrag.name);
}

test.describe('Dateien ausblenden (R00025)', () => {
  test('soll beim Aufruf ausgeblendete Dateien aus der Sicht nehmen und den Zähler im Kopf zeigen', async ({ gr, page }) => {
    const repo = await repoQ(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash], { zusatz: ['--ignore', '*.lock', '--ignore', 'build/**'] });

    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await expect(gr.ausblendenZaehler(page)).toHaveText('2 ausgeblendet, davon 2 Muster');
    await expect.poll(async () => (await dateinamen(page, gr)).sort()).toEqual([...SICHTBAR_MIT_ZWEI_MUSTERN].sort());
    await expect(gr.fortschrittZaehler(page)).toContainText('von 7 Dateien');

    await gr.modusWaehlen(page, 'einzeln');
    await expect(gr.ausblendenZaehler(page)).toHaveText('2 ausgeblendet, davon 2 Muster');
    await expect.poll(async () => (await dateinamen(page, gr)).sort()).toEqual([...SICHTBAR_MIT_ZWEI_MUSTERN].sort());

    await gr.darstellungWaehlen(page, 'baum');
    await expect.poll(async () => (await dateinamen(page, gr)).sort()).toEqual(['README.md', 'README.md', 'a.txt', 'api.cs', 'b.txt'].sort());
    await expect.poll(async () => (await gr.dateilisteLesen(page)).some(zeile => zeile.ordner && zeile.name === 'src')).toBe(true);
    expect((await gr.dateilisteLesen(page)).some(zeile => zeile.ordner && zeile.name === 'build')).toBe(false);
  });

  test('soll im Musterfeld Muster hinzufügen und entfernen und den Zähler führen', async ({ gr, page }) => {
    const repo = await repoQ(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);

    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await expect.poll(async () => (await dateinamen(page, gr)).length).toBe(7);
    await expect(gr.ausblendenZaehler(page)).toHaveText('');

    await gr.musterEingeben(page, '*.lock');
    await expect(gr.ausblendenMuster(page)).toHaveText('*.lock');
    await expect(gr.ausblendenZaehler(page)).toHaveText('1 ausgeblendet, davon 1 Muster');
    await expect.poll(async () => (await dateinamen(page, gr)).includes('app.lock')).toBe(false);
    await expect(gr.ausblendenEingabe(page)).toBeFocused();

    await gr.musterEingeben(page, 'build/**');
    await expect(gr.ausblendenZaehler(page)).toHaveText('2 ausgeblendet, davon 2 Muster');
    await expect.poll(async () => (await dateinamen(page, gr)).includes('build/out.log')).toBe(false);

    await gr.musterEntfernen(page, '*.lock');
    await gr.musterEntfernen(page, 'build/**');
    await expect(gr.ausblendenZaehler(page)).toHaveText('');
    await expect.poll(async () => (await dateinamen(page, gr)).length).toBe(7);
    await expect(gr.ausblendenEingabe(page)).toBeFocused();
  });

  test('soll ein Muster, das nichts trifft, ohne Zähler und ohne Wirkung lassen', async ({ gr, page }) => {
    const repo = await repoQ(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);

    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await gr.musterEingeben(page, '*.zzz');

    await expect(gr.ausblendenZaehler(page)).toHaveText('');
    await expect.poll(async () => (await dateinamen(page, gr)).length).toBe(7);
  });

  test('soll ein ungültiges Muster im Feld melden, ohne die Sicht zu ändern', async ({ gr, page }) => {
    const repo = await repoQ(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);

    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await expect.poll(async () => (await dateinamen(page, gr)).length).toBe(7);

    await gr.musterEingeben(page, 'a'.repeat(201));

    await expect(gr.ausblendenFehler(page)).toHaveText('Ein Muster darf höchstens 200 Zeichen haben.');
    expect((await dateinamen(page, gr)).length).toBe(7);
    await expect(gr.ausblendenEingabe(page)).toBeFocused();
  });

  test('soll nach dem Neuladen wieder die Muster des Aufrufs zeigen', async ({ gr, page }) => {
    const repo = await repoQ(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash], { zusatz: ['--ignore', '*.lock'] });

    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await expect(gr.ausblendenZaehler(page)).toHaveText('1 ausgeblendet, davon 1 Muster');

    await gr.musterEntfernen(page, '*.lock');
    await expect(gr.ausblendenZaehler(page)).toHaveText('');
    await expect.poll(async () => (await dateinamen(page, gr)).includes('app.lock')).toBe(true);

    await gr.neuLaden(page);

    await expect(gr.ausblendenZaehler(page)).toHaveText('1 ausgeblendet, davon 1 Muster');
    await expect.poll(async () => (await dateinamen(page, gr)).includes('app.lock')).toBe(false);
  });
});
