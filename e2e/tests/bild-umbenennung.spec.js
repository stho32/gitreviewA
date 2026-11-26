'use strict';
// R00024 Umbenennung, Bild, Binärdatei — Integration gegen den Endpunkt mit echtem git (Repo V) und nur Browser-Eigenes
// (Anzeige der Umbenennung, das sichtbare Bild, die DOM-Sicherheit). Die Bildgrenze setzt kein Produktwert; „zu groß“ und der
// Fehlerfall sind in B2307 mit einem Fake und in B2305/BildEndpunktTests gegen den Interactor geprüft.
const { test, expect } = require('../dsl/gitreviewa.js');
const bildRepo = require('../treiber/bild-repo.js');
const beobachtung = require('../treiber/beobachtung.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const { anfrage } = require('../treiber/http.js');

const FENSTER = { width: 1280, height: 800 };
const SCHMAL = { width: 500, height: 800 };

/** Startet gitreviewA in Repo V (nur `q` in der Auswahl) mit einem git-Zähler vorne in PATH. */
async function starte(gr) {
  const repo = gr.gemerktesRepo(bildRepo.repoV());
  const zaehler = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
  const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.q], { pfadVorne: zaehler.ordner });
  return { repo, zaehler, lauf };
}

function bildAdresse(lauf, hash, pfad, zusatz) {
  return `/api/commits/${hash}/bild?pfad=${encodeURIComponent(pfad)}${zusatz ?? ''}`;
}

/** Die Anordnung der Bildseiten: Position und Breite (Browser-Eigenes, R00024 AK „Bild vorher/nachher“). */
async function bildAnordnung(page) {
  return page.locator('#diff .bild-seite').evaluateAll(figuren => figuren.map(figur => {
    const rahmen = figur.getBoundingClientRect();
    return { links: Math.round(rahmen.left), oben: Math.round(rahmen.top), breite: Math.round(rahmen.width) };
  }));
}

test.describe('R00024 Endpunkt und fremdes Repo', () => {
  test('soll fuer beide Seiten ein Bild liefern mit festem Content-Type und nosniff, die Abweisungen ohne weiteren git-Aufruf', async ({ gr }) => {
    const { repo, zaehler, lauf } = await starte(gr);
    const q = repo.hashes.q;

    const vorher = await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/logo.png', '&seite=vorher'));
    const nachher = await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/logo.png', '&seite=nachher'));

    expect(vorher.status).toBe(200);
    expect(nachher.status).toBe(200);
    expect(vorher.kopf['content-type']).toBe('image/png');
    expect(vorher.kopf['x-content-type-options']).toBe('nosniff');
    expect(vorher.koerper).not.toBe(nachher.koerper);

    const nachDenErfolgen = zaehler.aufrufe().length;

    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/logo.png', ''))).status).toBe(400);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/logo.png', '&seite=unten'))).status).toBe(400);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/gibt-es-nicht.png', '&seite=nachher'))).status).toBe(404);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'notizen2.txt', '&seite=nachher'))).status).toBe(404);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, repo.hashes.p, 'bilder/logo.png', '&seite=nachher'))).status).toBe(404);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q.slice(0, 7), 'bilder/logo.png', '&seite=nachher'))).status).toBe(404);

    await expect.poll(() => zaehler.aufrufe().length, 'git-Aufrufe nach den Abweisungen').toBe(nachDenErfolgen);
  });

  test('soll das Bild eines Namens mit Rohbyte zeigen und eine fremde Herkunft abweisen', async ({ gr }) => {
    const { repo, lauf } = await starte(gr);
    const q = repo.hashes.q;

    const rohbyte = await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/b⟨0xFF⟩.png', '&seite=nachher'));
    const fremderHost = await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/logo.png', '&seite=nachher'), 'fremder.host');

    expect(rohbyte.status).toBe(200);
    expect(rohbyte.kopf['content-type']).toBe('image/png');
    expect(fremderHost.status).toBe(403);
  });

  // B1 (Nacharbeit): eine Binärdatei, deren Kopf mit `RIFF` beginnt und vor der Webp-Stelle endet — die Art kommt aus den
  // ersten Bytes und ist kein Bild; der Endpunkt antwortet 404, die Oberfläche bleibt bei „Binärdatei“ statt einer Ausnahme.
  test('soll eine kurze kaputte Binärdatei als Binärdatei abweisen — 404 statt 500', async ({ gr, page }) => {
    const { repo, lauf } = await starte(gr);
    const q = repo.hashes.q;

    const kurz = await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/roh.bin', '&seite=nachher'));

    expect(kurz.status).toBe(404);

    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await seite.dateiWaehlen(page, 'roh.bin');

    await expect(page.locator('#diff .diff-meldung')).toHaveText('Binärdatei — enthält Null-Bytes');
    await expect(page.locator('#diff .bild-paar')).toHaveCount(0);
    await expect(page.locator('#diff').getByRole('button', { name: 'Als Text zeigen' })).toBeVisible();
  });

  // B2 (Nacharbeit): die Bildart kommt aus den ersten Bytes, bevor die Größe zählt — eine Binärdatei ohne Bildtyp bleibt
  // „Binärdatei“ (404), auch über der 8-MiB-Grenze; nur ein echtes Bild meldet „zu groß“ (413). Echte Grenze, kein Fake.
  test('soll eine Binärdatei an und über der Grenze als Binärdatei abweisen — 404 statt 413', async ({ gr, page }) => {
    const repo = gr.gemerktesRepo(bildRepo.repoGrenze());
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.q]);
    const q = repo.hashes.q;

    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'genau.bin', '&seite=nachher'))).status, 'genau an der Grenze').toBe(404);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'gross.bin', '&seite=nachher'))).status, 'knapp über der Grenze').toBe(404);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'gross.png', '&seite=nachher'))).status, 'Bild über der Grenze').toBe(413);

    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await seite.dateiWaehlen(page, 'gross.bin');

    await expect(page.locator('#diff .diff-meldung')).toHaveText('Binärdatei — enthält Null-Bytes');
    await expect(page.locator('#diff .bild-paar')).toHaveCount(0);
    await expect(page.locator('#diff').getByRole('button', { name: 'Als Text zeigen' })).toBeVisible();
  });

  test('soll die vier festen Typen mit ihrem Content-Type liefern und karte.svg/keinbild.png nicht als Bild', async ({ gr }) => {
    const { repo, lauf } = await starte(gr);
    const q = repo.hashes.q;

    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/logo.png', '&seite=nachher'))).kopf['content-type']).toBe('image/png');
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/foto.jpg', '&seite=nachher'))).kopf['content-type']).toBe('image/jpeg');
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/bunt.gif', '&seite=nachher'))).kopf['content-type']).toBe('image/gif');
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/klein.webp', '&seite=nachher'))).kopf['content-type']).toBe('image/webp');
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/karte.svg', '&seite=nachher'))).status).toBe(404);
    expect((await anfrage(lauf.adresse, bildAdresse(lauf, q, 'bilder/keinbild.png', '&seite=nachher'))).status).toBe(404);
  });
});

test.describe('R00024 Anzeige (Browser-Eigenes)', () => {
  test('soll die Umbenennung in Dateiliste und Diff-Kopf als `neu ← alt` nennen und beide Bilder zeigen', async ({ gr, page }) => {
    const { lauf } = await starte(gr);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');

    await expect.poll(async () => (await seite.dateilisteLesen(page)).some(eintrag => eintrag.name === 'umbenannt.png ← alt.png')).toBe(true);
    await seite.dateiWaehlen(page, 'umbenannt.png ← alt.png');

    await expect(page.locator('#diff .diff-pfad')).toHaveText('umbenannt.png ← alt.png');
    await expect(page.locator('#diff .bild-titel')).toHaveText('umbenannt.png ← alt.png');
    const bilder = await diffSeite.bilderLesen(page);
    expect(bilder).toHaveLength(2);
    expect(bilder[0].beschriftung).toContain('vorher');
    expect(bilder[1].beschriftung).toContain('nachher');
  });

  test('soll zwei Bilder nebeneinander zeigen und unter 600 dp untereinander, nur `img` im Bereich', async ({ gr, page }) => {
    const { lauf } = await starte(gr);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await seite.dateiWaehlen(page, 'logo.png');

    const bilder = await diffSeite.bilderLesen(page);
    expect(bilder).toHaveLength(2);
    expect(bilder.every(bild => bild.naturbreite > 0), 'beide Bilder geladen').toBe(true);
    expect(bilder[0].beschriftung).toContain('vorher');
    expect(bilder[1].beschriftung).toContain('nachher');
    await diffSeite.pruefeNurImgImBildbereich(page);

    const breit = await bildAnordnung(page);
    expect(breit).toHaveLength(2);
    expect(breit[0].oben, 'nebeneinander').toBe(breit[1].oben);
    expect(breit[0].breite, 'gleich breit').toBe(breit[1].breite);

    await page.setViewportSize(SCHMAL);
    const schmal = await bildAnordnung(page);
    expect(schmal[0].oben, 'untereinander unter 600 dp').not.toBe(schmal[1].oben);
  });

  // Lehre #7 (I0007): ein Anzeigeverfahren nimmt die orthogonalen Verbraucher mit — die Anordnung gilt auch für das Bild:
  // jeder Wechsel fragt den Diff neu an, das Bild bleibt samt beiden Fassungen stehen (R00024, Anzeige).
  test('soll das Bild in der Nebeneinander-Anordnung zeigen und den Wechsel zurück überstehen', async ({ gr, page }) => {
    const { lauf } = await starte(gr);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await seite.dateiWaehlen(page, 'logo.png');

    await diffSeite.menueWaehlen(page, 'nebeneinander');
    await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');
    expect(await diffSeite.bilderLesen(page), 'beide Fassungen in der Nebeneinander-Anordnung').toHaveLength(2);
    await expect(page.locator('#diff .dz')).toHaveCount(0);
    await diffSeite.pruefeNurImgImBildbereich(page);

    await diffSeite.menueWaehlen(page, 'untereinander');
    await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'untereinander');
    const bilder = await diffSeite.bilderLesen(page);
    expect(bilder, 'beide Fassungen nach dem Wechsel zurück').toHaveLength(2);
    expect(bilder.every(bild => bild.naturbreite > 0), 'beide Bilder geladen').toBe(true);
  });

  test('soll bei karte.svg und keinbild.png keinen Bildbereich zeigen', async ({ gr, page }) => {
    const { lauf } = await starte(gr);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');

    await seite.dateiWaehlen(page, 'karte.svg');
    await expect(page.locator('#diff .bild-paar')).toHaveCount(0);
    await expect(page.locator('#diff .dz tr[data-art]').first()).toBeVisible();

    await seite.dateiWaehlen(page, 'keinbild.png');
    await expect(page.locator('#diff .bild-paar')).toHaveCount(0);
  });

  // S3 (Nacharbeit): „Zusammen“ ist der Standard des Zielbilds — das Bild steht auch dort: netto über den zuständigen Commit
  // (lückenlose Kette) und ohne Kette in jedem Abschnitt bei seinem Commit.
  test('soll das Bild in „Zusammen“ netto zeigen (lückenlose Kette)', async ({ gr, page }) => {
    const { lauf } = await starte(gr);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await seite.dateiWaehlen(page, 'logo.png');

    const bilder = await diffSeite.bilderLesen(page);
    expect(bilder).toHaveLength(2);
    expect(bilder[0].beschriftung).toContain('vorher');
    expect(bilder[1].beschriftung).toContain('nachher');
    await diffSeite.pruefeNurImgImBildbereich(page);
  });

  test('soll das Bild in „Zusammen“ ohne Kette in jedem Abschnitt bei seinem Commit zeigen', async ({ gr, page }) => {
    const repo = gr.gemerktesRepo(bildRepo.repoOhneKette());
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.b1, repo.hashes.b3]);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await seite.dateiWaehlen(page, 'logo.png');

    await expect(page.locator('#diff .diff-abschnitt')).toHaveCount(2);
    const imAngelegten = await diffSeite.abschnittsbilderLesen(page, repo.hashes.b1);
    expect(imAngelegten, 'b1: das Bild gibt es nur nachher').toHaveLength(1);
    expect(imAngelegten[0].beschriftung).toContain('nachher');
    expect(imAngelegten[0].beschriftung).toContain('neu');
    const imGeaenderten = await diffSeite.abschnittsbilderLesen(page, repo.hashes.b3);
    expect(imGeaenderten, 'b3: beide Fassungen').toHaveLength(2);
    expect(imGeaenderten[0].beschriftung).toContain('vorher');
    expect(imGeaenderten[1].beschriftung).toContain('nachher');
    await diffSeite.pruefeNurImgImBildbereich(page);
  });
});
