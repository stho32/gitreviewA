'use strict';
// Treiber Oberfläche „Seitenleiste ein- und ausklappen“ (R00035, I0036): der einzige Ort, der den Ausklapp-Knopf, den Streifen an
// der Grenze, den eingeklappten Zustand der Seitenleiste und die Reihenfolge der Tab-Stopps kennt. Die Prüfungen der Oberfläche
// sitzen hier; die Testsprache darüber kennt nur die Fachwörter.
const { expect } = require('@playwright/test');

const KNOPF = '#einklappen';
const STREIFEN = '.gr-ansicht .gr-streifen';
const SEITENLEISTE = '#seitenleiste';
const RAHMEN = '.gr-ansicht';
const TRENNER = '.gr-ansicht .gr-trenner';
/** Die Statusregion außerhalb der Seitenleiste: sie trägt die Meldungen der Leiste, wenn sie eingeklappt ist (Befund S4). */
const MELDUNG_DRAUSSEN = '#seitenleiste-status';

function knopf(page) {
  return page.locator(KNOPF);
}

/** Betätigt den Knopf am Trenner (Maus). */
async function betatigen(page) {
  await knopf(page).click({ timeout: 5000 });
}

/** Die Taste `b` aus dem Katalog. */
async function tasteB(page) {
  await page.keyboard.press('b');
}

/** Alle Angaben des Knopfes, die Vorleser und Prüfung brauchen, in einem Zug. */
function knopfAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const pfeil = element.querySelector('.gr-einklappen-pfeil');
    const beschriftung = element.querySelector('.gr-einklappen-text');
    const stil = getComputedStyle(element);
    return {
      erweitert: element.getAttribute('aria-expanded'),
      steuert: element.getAttribute('aria-controls'),
      taste: element.getAttribute('aria-keyshortcuts'),
      beschriftung: beschriftung ? beschriftung.textContent : '',
      pfeil: pfeil ? pfeil.textContent.trim() : null,
      pfeilVerborgen: pfeil ? pfeil.getAttribute('aria-hidden') === 'true' : false,
      kbd: [...element.querySelectorAll('kbd')].map(kbd => kbd.textContent),
      fokussiert: document.activeElement === element,
      fokusring: { breite: stil.outlineWidth, stil: stil.outlineStyle, sichtbar: element.matches(':focus-visible') },
      sichtbar: element.getClientRects().length > 0,
      rolle: element.getAttribute('role'),
      tabindex: element.getAttribute('tabindex') === null ? null : element.getAttribute('tabindex'),
    };
  }, KNOPF);
}

/** Der gezeichnete Fokusring eines Elements: Breite, Stil und ob `:focus-visible` gilt (R00030, B2907). */
function sichtbarerFokusring(element) {
  const stil = getComputedStyle(element);
  return {
    breite: stil.outlineWidth,
    stil: stil.outlineStyle,
    sichtbar: element.matches(':focus-visible'),
  };
}

/** Der Stand der Seitenleiste: verborgen, inert, im Tab-Weg und ihre Breite. */
function seitenleisteAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const fokussierbar = [...element.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]')];
    const rechteck = element.getBoundingClientRect();
    return {
      verborgen: element.hidden,
      inert: element.inert === true,
      display: getComputedStyle(element).display,
      sichtbar: element.getClientRects().length > 0,
      breite: Math.round(rechteck.width),
      fokussierbarImDom: fokussierbar.length,
    };
  }, SEITENLEISTE);
}

/** Der Stand des Streifens an der Grenze (Breite, Lage, Sichtbarkeit). */
function streifenAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const rechteck = element.getBoundingClientRect();
    return {
      sichtbar: element.getClientRects().length > 0,
      links: Math.round(rechteck.left * 100) / 100,
      rechts: Math.round(rechteck.right * 100) / 100,
      breite: Math.round(rechteck.width),
      hoehe: Math.round(rechteck.height),
      hintergrund: getComputedStyle(element).backgroundColor,
    };
  }, STREIFEN);
}

/** Die Lage von Seitenleiste und Diff-Bereich (links, rechts, Breite) in einem Zug. */
function grenzlage(page) {
  return page.evaluate(([leiste, diff, streifen]) => {
    const l = document.querySelector(leiste);
    const d = document.querySelector(diff);
    const s = document.querySelector(streifen);
    const dl = d.getBoundingClientRect();
    const sr = s ? s.getBoundingClientRect() : null;
    return {
      diffLinks: Math.round(dl.left),
      diffRechts: Math.round(dl.right),
      diffBreite: Math.round(dl.width),
      leisteBreite: l ? Math.round(l.getBoundingClientRect().width) : null,
      streifenRechts: sr ? Math.round(sr.right) : null,
      fensterBreite: window.innerWidth,
    };
  }, [SEITENLEISTE, '#diff', STREIFEN]);
}

/** Der Knopf bedeckt keinen Inhalt: er steht in den Rändern an der Grenze (links neben dem Ende der Dateiliste, rechts vor
    dem Anfang des Diff-Kopfes). */
async function pruefeKnopfAnDerGrenze(page) {
  const lage = await page.evaluate(() => {
    const knopf = document.querySelector('#einklappen').getBoundingClientRect();
    const liste = document.querySelector('#datei-zeilen').getBoundingClientRect();
    const diffKopf = document.querySelector('#diff .diff-kopf').getBoundingClientRect();
    return { knopfLinks: knopf.left, knopfRechts: knopf.right, listeRechts: liste.right, diffKopfLinks: diffKopf.left };
  });
  expect(lage.knopfLinks, `Knopf (links ${lage.knopfLinks}) rechts neben der Dateiliste (rechts ${lage.listeRechts})`).toBeGreaterThanOrEqual(lage.listeRechts);
  expect(lage.knopfRechts, `Knopf (rechts ${lage.knopfRechts}) links vor dem Diff-Kopf (links ${lage.diffKopfLinks})`).toBeLessThanOrEqual(lage.diffKopfLinks);
}

/** Der Fokus steht auf dem Knopf, und er trägt einen sichtbaren Fokusring (mindestens 2 px). */
async function pruefeFokusUndRing(page) {
  const angaben = await knopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.fokussiert, `der Fokus steht auf dem Ausklapp-Knopf — ${JSON.stringify(angaben.fokusring)}`).toBe(true);
  expect(angaben.fokusring.sichtbar, 'eine Tastaturbewegung hat stattgefunden (:focus-visible)').toBe(true);
  expect(angaben.fokusring.stil, 'Fokusring gezeichnet').not.toBe('none');
  expect(parseFloat(angaben.fokusring.breite), `Fokusring breit genug (${angaben.fokusring.breite})`).toBeGreaterThanOrEqual(2);
}

/** Der Ausklapp-Knopf ist der Tab-Stopp vor dem Trennzug (er steht im DOM direkt davor): Shift+Tab vom Trenner erreicht ihn. */
async function fokusVorgaengerDesTrenners(page) {
  await page.locator(TRENNER).focus();
  await page.keyboard.press('Shift+Tab');
}

/** Der nächste Tab-Stopp nach dem letzten Knopf des Kopfes ist der Ausklapp-Knopf (die eingeklappte Liste wird übersprungen). */
async function tabVomKopf(page) {
  await page.locator('#beenden').focus();
  await page.keyboard.press('Tab');
}

/** Öffnet die Hilfe (Knopf im Kopf) und liest ihre Einträge aus dem Katalog. */
async function hilfeOeffnen(page) {
  await page.locator('#hilfe-knopf').click();
  await expect(page.locator('#hilfe')).toBeVisible();
}

/** Die Hilfe nach Gruppen: Titel und je Eintrag die Tasten, der Text und die Verfügbarkeit — so, wie der Katalog sie liefert. */
function hilfeEintraege(page) {
  return page.evaluate(() => [...document.querySelectorAll('#hilfe .hilfe-gruppe')].map(gruppe => ({
    titel: gruppe.querySelector('h3').textContent,
    eintraege: [...gruppe.querySelectorAll('ul > li')].map(zeile => ({
      tasten: [...zeile.querySelectorAll('.hilfe-tasten kbd')].map(kbd => kbd.textContent),
      text: [...zeile.childNodes].filter(knoten => knoten.nodeType === 3).map(knoten => knoten.textContent).join('').trim(),
      verfuegbar: zeile.dataset.verfuegbar === 'true',
    })),
  })));
}

/** Eine Folge von Tab-Stopps ab dem aktuellen Fokus: je Stopp Tag, Kennung und in welchem Teil der Seite er steht. */
async function tabReihe(page, schritte) {
  const reihe = [];
  for (let nummer = 0; nummer < schritte; nummer += 1) {
    await page.keyboard.press('Tab');
    reihe.push(await page.evaluate(() => {
      const element = document.activeElement;
      const seitenleiste = document.getElementById('seitenleiste');
      const diff = document.getElementById('diff');
      const streifen = document.querySelector('.gr-streifen');
      return {
        tag: element ? element.tagName : null,
        kennung: element ? (element.id || '') : '',
        inLeiste: Boolean(element && seitenleiste.contains(element)),
        inDiff: Boolean(element && diff.contains(element)),
        inKopf: Boolean(element && document.querySelector('header.kz').contains(element)),
        imStreifen: Boolean(element && streifen && streifen.contains(element)),
        rollbereich: Boolean(element && element.matches('#diff .df-sc')),
      };
    }));
  }
  return reihe;
}

/** Betätigt „Erste ungeprüfte öffnen“ im leeren Diff-Bereich. */
async function ersteUngepruefteOeffnen(page) {
  await page.locator('#diff .erste-ungepruefte').click();
}

/** Setzt nacheinander alle Haken der Dateiliste (programmatisch, die Liste ist eingeklappt) und wartet auf den Stand. */
async function alleHakenSetzen(page) {
  const kaestchen = page.locator('#datei-zeilen .datei-zeile input.haken');
  const anzahl = await kaestchen.count();
  for (let nummer = 0; nummer < anzahl; nummer += 1) {
    await kaestchen.nth(nummer).evaluate(element => element.click());
    await expect.poll(() => kaestchen.nth(nummer).isChecked(), `Haken ${nummer + 1} gesetzt`).toBe(true);
  }
}

/** Die Meldung „Nächste ungeprüfte“ (R00028) trägt diesen Text. */
async function pruefeNaechsteMeldung(page, text) {
  await expect(page.locator('#naechste-meldung'), 'Meldung der nächsten ungeprüften').toHaveText(text);
}

/**
 * Eine Meldung der Seitenleiste ist auch eingeklappt sichtbar und wird angesagt (Befund S4): sie steht in der
 * Statusregion außerhalb der Leiste, hat eine Größe (`getClientRects`) und eine Rolle, die Vorleser ankündigen.
 */
async function pruefeMeldungSichtbar(page, text) {
  const draussen = page.locator(MELDUNG_DRAUSSEN);
  await expect(draussen, `Meldung »${text}« außerhalb der eingeklappten Seitenleiste`).toHaveText(text);
  const angaben = await draussen.evaluate(element => ({
    rechtecke: element.getClientRects().length,
    rolle: element.getAttribute('role'),
    live: element.getAttribute('aria-live'),
  }));
  expect(angaben.rechtecke, `die Meldung »${text}« ist sichtbar (getClientRects) — ${JSON.stringify(angaben)}`).toBeGreaterThan(0);
  const angesagt = angaben.rolle === 'status' || angaben.rolle === 'alert'
    || angaben.live === 'polite' || angaben.live === 'assertive';
  expect(angesagt, `die Meldung »${text}« wird von Vorlesern angesagt (role=status/aria-live) — ${JSON.stringify(angaben)}`).toBe(true);
}

/** Ausgeklappt steht die Meldung wieder in der Leiste und die äußere Statusregion ist leer (keine Dopplung). */
async function pruefeMeldungInDerLeiste(page, text) {
  const inDerLeiste = page.locator('#naechste-meldung');
  await expect(inDerLeiste, `Meldung »${text}« in der Leiste`).toHaveText(text);
  await expect(inDerLeiste, 'die Meldung steht in der Leiste sichtbar').toBeVisible();
  await expect(page.locator(MELDUNG_DRAUSSEN), 'keine zweite Meldung außerhalb der Leiste').toBeHidden();
}

/** Der Diff zeigt diesen Pfad (der Diff-Bereich ist der sichtbare Teil der Seite). */
function diffPfad(page) {
  return page.locator('#diff .diff-pfad').textContent();
}

/**
 * Misst ereignisgenau, wie lange das Einklappen bis zur Wirkung braucht (Zustand, `hidden` und die Stellung am Rahmen stehen),
 * in Millisekunden. Dieselbe Messung dient der Positivkontrolle, wenn eine verzögerte Antwort im Weg steht.
 */
function messeEinklappen(page) {
  return page.evaluate(async () => {
    const knopf = document.getElementById('einklappen');
    const rahmen = document.querySelector('.gr-ansicht');
    const leiste = document.getElementById('seitenleiste');
    const start = performance.now();
    knopf.click();
    const wirkt = () => knopf.getAttribute('aria-expanded') === 'false'
      && leiste.hidden === true
      && rahmen.classList.contains('gr-eingeklappt');
    while (performance.now() - start < 5000) {
      if (wirkt()) {
        await new Promise(fertig => requestAnimationFrame(fertig));
        return performance.now() - start;
      }
      await new Promise(fertig => requestAnimationFrame(fertig));
    }
    return performance.now() - start;
  });
}

/** Positivkontrolle der Zeitmessung: bei verzögerten Diff-Antworten dauert der Wechsel der Datei messbar länger (bis der Diff
    den neuen Pfad zeigt). Ohne Verzögerung kehrt dieselbe Messung schnell zurück. */
function messeDateiwechsel(page, pfad) {
  return page.evaluate(async ziel => {
    const zeile = [...document.querySelectorAll('#datei-zeilen .datei-zeile')].find(element => element.dataset.pfad === ziel);
    const start = performance.now();
    zeile.click();
    // Der Pfad steht schon vor der Antwort; „geladen“ heißt: keine Meldung mehr und der Rollbereich sichtbar.
    const steht = () => document.querySelector('#diff .diff-pfad').textContent === ziel
      && document.querySelector('#diff .diff-meldung').textContent === ''
      && document.querySelector('#diff .df-sc').hidden === false;
    while (performance.now() - start < 10000) {
      if (steht()) {
        await new Promise(fertig => requestAnimationFrame(fertig));
        return performance.now() - start;
      }
      await new Promise(fertig => requestAnimationFrame(fertig));
    }
    return performance.now() - start;
  }, pfad);
}

/** Hält jede Diff-Antwort `ms` zurück (verzögerter Fake): eine Anfrage, die neu gestellt würde, wäre dann messbar langsam. */
async function verzoegerteDiffAntworten(page, ms) {
  await page.route('**/diff?**', async route => {
    await new Promise(weiter => setTimeout(weiter, ms));
    await route.continue();
  });
}

/* ── Prüfungen ── */

/** Der Knopf ist da und nennt seinen Zustand über `aria-expanded`. */
async function pruefeZustand(page, eingeklappt) {
  const angaben = await knopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.erweitert, `aria-expanded (eingeklappt: ${eingeklappt})`).toBe(eingeklappt ? 'false' : 'true');
}

/** Der Knopf trägt Rolle, Namen, Pfeilrichtung, Hinweis und steuert die Seitenleiste (B3402). */
async function pruefeKnopf(page, { eingeklappt }) {
  const angaben = await knopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.sichtbar, 'der Knopf steht sichtbar an der Grenze').toBe(true);
  expect(angaben.erweitert, 'aria-expanded').toBe(eingeklappt ? 'false' : 'true');
  expect(angaben.steuert, 'aria-controls').toBe('seitenleiste');
  expect(angaben.rolle, 'role (nativer Knopf)').toBeNull();
  const name = eingeklappt ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen';
  await expect(knopf(page), `zugänglicher Name beginnt mit »${name}«`).toHaveAccessibleName(new RegExp(`^${name}`));
  expect(angaben.beschriftung, 'sichtbarer Text').toBe(name);
  expect(angaben.pfeil, 'sichtbares Bild der Wirkung').toBe(eingeklappt ? '»' : '«');
  expect(angaben.pfeilVerborgen, 'der Pfeil ist für Vorleser verborgen (der Name nennt die Wirkung)').toBe(true);
  expect(angaben.taste, 'aria-keyshortcuts').toBe('b');
  expect(angaben.kbd, 'sichtbarer Hinweis').toEqual(['b']);
}

/** Die eingeklappte Seitenleiste ist weder sichtbar noch im Tab-Weg (`hidden`/`inert`). */
async function pruefeSeitenleisteVerborgen(page) {
  const angaben = await seitenleisteAngaben(page);
  expect(angaben, 'Seitenleiste vorhanden').not.toBeNull();
  expect(angaben.sichtbar, `Seitenleiste sichtbar — ${JSON.stringify(angaben)}`).toBe(false);
  expect(angaben.verborgen, 'hidden').toBe(true);
  expect(angaben.inert, 'inert').toBe(true);
  expect(angaben.display, 'display').toBe('none');
}

/** Die ausgeklappte Seitenleiste steht sichtbar und ist bedienbar. */
async function pruefeSeitenleisteSichtbar(page) {
  const angaben = await seitenleisteAngaben(page);
  expect(angaben, 'Seitenleiste vorhanden').not.toBeNull();
  expect(angaben.verborgen, 'hidden').toBe(false);
  expect(angaben.inert, 'inert').toBe(false);
  expect(angaben.breite, `Breite der Seitenleiste — ${JSON.stringify(angaben)}`).toBeGreaterThan(0);
}

/** Der Streifen an der Grenze steht sichtbar (eingeklappt) und ist schmal. */
async function pruefeStreifen(page) {
  const angaben = await streifenAngaben(page);
  expect(angaben, 'Streifen vorhanden').not.toBeNull();
  expect(angaben.sichtbar, `Streifen sichtbar — ${JSON.stringify(angaben)}`).toBe(true);
  expect(angaben.breite, 'schmaler Streifen').toBeGreaterThan(0);
  expect(angaben.breite, 'schmaler Streifen (schmaler als die Mindestbreite der Seitenleiste)').toBeLessThan(240);
}

/** Der Diff nimmt die volle Breite ein: er beginnt an der Grenze und reicht bis zum Fensterrand. */
async function pruefeVolleBreite(page) {
  const lage = await grenzlage(page);
  expect(lage.diffLinks, `Diff beginnt an der Grenze (${JSON.stringify(lage)})`).toBeLessThanOrEqual(32);
  expect(lage.diffRechts, `Diff reicht bis zum Fensterrand (${JSON.stringify(lage)})`).toBeGreaterThanOrEqual(lage.fensterBreite - 1);
}

/** Der Diff ist breiter als vor dem Einklappen (die Seitenleiste ist gewichen). */
function pruefeDiffBreiter(page, vorher) {
  return grenzlage(page).then(nachher => {
    expect(nachher.diffBreite, `Diff-Breite nach dem Einklappen (${nachher.diffBreite} px, vorher ${vorher} px)`).toBeGreaterThan(vorher);
    return nachher.diffBreite;
  });
}

/** Kein Trenn-Zug, solange eingeklappt ist (der Trenner ist nicht sichtbar). */
async function pruefeKeinTrennzug(page) {
  await expect(page.locator(TRENNER), 'Trenn-Zug eingeklappt').toBeHidden();
}

module.exports = {
  KNOPF, STREIFEN, SEITENLEISTE, RAHMEN, TRENNER,
  knopf, betatigen, tasteB, knopfAngaben, sichtbarerFokusring, seitenleisteAngaben, streifenAngaben, grenzlage,
  pruefeZustand, pruefeKnopf, pruefeKnopfAnDerGrenze, pruefeFokusUndRing, fokusVorgaengerDesTrenners, tabVomKopf, tabReihe, ersteUngepruefteOeffnen, alleHakenSetzen,
  pruefeNaechsteMeldung, pruefeMeldungSichtbar, pruefeMeldungInDerLeiste, MELDUNG_DRAUSSEN,
  diffPfad, messeEinklappen, messeDateiwechsel, verzoegerteDiffAntworten, hilfeOeffnen, hilfeEintraege,
  pruefeSeitenleisteVerborgen, pruefeSeitenleisteSichtbar, pruefeStreifen, pruefeVolleBreite,
  pruefeDiffBreiter, pruefeKeinTrennzug,
};