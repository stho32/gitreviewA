'use strict';
// Treiber Oberfläche des Diff-Bereichs (R00004): der einzige Ort, der seine Selektoren kennt; die Prüfungen dazu sitzen hier.
const { expect } = require('@playwright/test');

const BEREICH = '#diff';
const PFAD = '#diff .diff-pfad';
const MELDUNG = '#diff .diff-meldung';
const HERKUNFT = '#diff .diff-herkunft';
const ROLLBEREICH = '#diff .df-sc';
const MENUE_KNOPF = '#ansicht-knopf';
const MENUE = '#ansicht-menue';
/** Nur Diff-Zeilen: Anmerkungszeilen (R00010) tragen kein `data-art` und zählen nicht mit. */
const ZEILE = '#diff .dz tr[data-art]';
const HINWEIS_ZUR_WAHL = 'Datei wählen, um ihren Diff zu sehen';
const VORZEICHEN = { plus: '+', minus: '−' };
const VERZOEGERUNG_MS = 1500;

/* ── Menü „Ansicht ▾“ (R00039): der eine Weg zu den vier Anzeigeverfahren ── */

/** Öffnet das Menü über den Knopf und wartet, bis es steht (der Fokus liegt auf dem gewählten Eintrag). */
async function menueOeffnen(page) {
  await page.locator(MENUE_KNOPF).click();
  await expect(page.locator(MENUE)).toBeVisible();
}

/** Schließt das Menü über den Knopf (Umschalten). */
async function menueSchliessen(page) {
  await page.locator(MENUE_KNOPF).click();
  await expect(page.locator(MENUE)).toBeHidden();
}

/** Der Menüeintrag mit diesem sichtbaren Namen (Optionsfeld oder Kästchen). */
function menueEintrag(page, name) {
  return page.locator(MENUE).getByRole('menuitemradio', { name, exact: true })
    .or(page.locator(MENUE).getByRole('menuitemcheckbox', { name, exact: true }));
}

/** Öffnet das Menü, wählt den Eintrag `name` (wie der bisherige Schalter) und wartet, bis das Menü zu ist. */
async function menueWaehlen(page, name) {
  await menueOeffnen(page);
  await menueEintrag(page, name).click();
  await expect(page.locator(MENUE)).toBeHidden();
}

/** Öffnet das Menü, prüft den Zustand des Eintrags (`aria-checked`) und schließt es wieder. */
async function pruefeMenueZustand(page, name, erwartet) {
  await menueOeffnen(page);
  await expect(menueEintrag(page, name)).toHaveAttribute('aria-checked', erwartet);
  await menueSchliessen(page);
}

/* ── Werkzeugleiste mit fester Höhe (R00039, B3802) ── */

/** Setzt die Breite des Diff-Bereichs (`#diff`) über Fensterbreite und Seitenleiste (640 px) und wartet, bis sie steht.
    Die Ergebnis-Spalte (R00037) nimmt im zweispaltigen Aufbau 320 px ein; sie wird ausgeklappt, damit die Rechnung aufgeht
    (Fenster = Seitenleiste 640 + Trenner 6 + Diff + Trenner 6 + Spalte 320). */
async function setzeDiffBreite(page, breite) {
  await page.setViewportSize({ width: breite + 972, height: 800 });
  await page.evaluate(() => {
    const ergebnis = window.gitreviewaEinklappen && window.gitreviewaEinklappen.ergebnis;
    if (ergebnis && ergebnis.istEingeklappt()) {
      ergebnis.umschalten();
    }
  });
  await page.evaluate(() => window.gitreviewaBreite.setzen(640));
  await expect.poll(() => page.evaluate(() => document.getElementById('diff').clientWidth), `Diff-Breite ${breite} px`).toBe(breite);
}

/** Die Höhe des Diff-Kopfs und die Zahl der sichtbaren Zeilenbänder (R00039, AK5): die Kinder des Kopfs werden nach ihrer
    senkrechten Mitte zu Zeilen gruppiert (Toleranz 12 px), nicht nach ihrer Reihenfolge. Dazu der waagerechte Überlauf des
    Kopfs und wie weit der Menüknopf über den Diff-Bereich hinausragt (beides 0 = alles im Bereich). */
async function leistenmass(page) {
  return page.evaluate(() => {
    const kopf = document.querySelector('#diff .diff-kopf');
    const diff = document.getElementById('diff');
    const knopf = document.getElementById('ansicht-knopf');
    const sichtbar = [...kopf.children].filter(kind => kind.getClientRects().length > 0);
    const mitte = element => {
      const r = element.getBoundingClientRect();
      return (r.top + r.bottom) / 2;
    };
    const reihen = [];
    for (const kind of sichtbar) {
      const m = mitte(kind);
      if (!reihen.some(reihe => Math.abs(reihe - m) < 12)) {
        reihen.push(m);
      }
    }
    const diffRechts = diff.getBoundingClientRect().right;
    return {
      hoehe: Math.round(kopf.getBoundingClientRect().height),
      zeilen: reihen.length,
      ueberlauf: kopf.scrollWidth - kopf.clientWidth,
      knopfAusserhalb: Math.max(0, Math.round(knopf.getBoundingClientRect().right - diffRechts)),
    };
  });
}

/** Der sichtbare Pfad: Textinhalt, Breite, ob er den Kasten überläuft (dann ist er hart abgeschnitten statt in der Mitte gekürzt)
    und die volle Angabe in `aria-label` und `title`. */
async function pfadmass(page) {
  return page.evaluate(() => {
    const pfad = document.querySelector('#diff .diff-pfad');
    return {
      text: pfad.textContent,
      breite: Math.round(pfad.getBoundingClientRect().width),
      ueberlauf: pfad.scrollWidth - pfad.clientWidth,
      name: pfad.getAttribute('aria-label'),
      titel: pfad.getAttribute('title'),
    };
  });
}

/** Je Zeile Art, Nummern (aus den Spalten und aus `data-alt`/`data-neu`), Vorzeichen und Text ohne die Lesetexte für Screenreader. */
async function diffZeilenLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(zeile => {
    const art = zeile.dataset.art;
    const textZelle = zeile.querySelector('.c');
    const lesetext = textZelle.querySelector('.vh');
    let text = textZelle.textContent;
    if (lesetext) {
      text = text.slice(lesetext.textContent.length);
    }
    if (art === 'kopf') {
      return { art, text };
    }
    return {
      art,
      alt: zeile.querySelector('.alt').textContent,
      neu: zeile.querySelector('.neu').textContent,
      datenAlt: zeile.dataset.alt,
      datenNeu: zeile.dataset.neu,
      vorzeichen: zeile.querySelector('.m').textContent,
      text,
    };
  }));
}

/** Erwartete Zeile der Spezifikation → gelesene Form; Nummern stehen in Spalte und Attribut gleich, leer, wo es keine gibt. */
function alsGeleseneZeile(erwartet) {
  if ('kopf' in erwartet) {
    return { art: 'kopf', text: erwartet.kopf };
  }
  const [art] = ['kontext', 'plus', 'minus', 'hinweis'].filter(name => name in erwartet);
  const alt = nummerText(erwartet.alt);
  const neu = nummerText(erwartet.neu);
  let vorzeichen = VORZEICHEN[art];
  if (vorzeichen === undefined) {
    vorzeichen = '';
  }
  return { art, alt, neu, datenAlt: alt, datenNeu: neu, vorzeichen, text: erwartet[art] };
}

function nummerText(nummer) {
  if (nummer === undefined) {
    return '';
  }
  return String(nummer);
}

/** Der Diff-Kopf nennt den gewählten Pfad im zugänglichen Namen (R00039): die Anzeige darf bei Platzmangel in der Mitte
    gekürzt sein („anfang…ende“), der Name trägt ihn ganz. Die Prüfung „welche Datei zeigt der Diff“ hängt darum am Namen. */
async function pruefePfad(page, pfad) {
  await expect(page.locator(PFAD), `Diff-Pfad von ${pfad}`).toHaveAttribute('aria-label', pfad);
}

async function pruefeDiff(page, { pfad, zeilen }) {
  await pruefePfad(page, pfad);
  await pruefeKeinSchalter(page);
  await expect.poll(() => diffZeilenLesen(page), `Diff von ${pfad}`).toEqual(zeilen.map(alsGeleseneZeile));
  await expect(page.locator(MELDUNG)).toHaveText('');
}

async function pruefeMeldung(page, pfad, text, istFehler) {
  await pruefePfad(page, pfad);
  await expect(page.locator(MELDUNG)).toHaveText(text);
  await expect(page.locator(ZEILE)).toHaveCount(0);
  if (istFehler) {
    await expect(page.locator(MELDUNG)).toHaveClass(/\bfehler\b/);
  }
}

/** Fehlermeldung statt Patch, ohne den Pfad zu vergleichen (sein Name trägt Marken für unsichtbare Zeichen); nie „Keine Zeilenänderungen“. */
async function pruefeFehlerOhneZeilen(page, text) {
  await expect(page.locator(MELDUNG)).toHaveText(text);
  await expect(page.locator(MELDUNG)).toHaveClass(/\bfehler\b/);
  await expect(page.locator(ZEILE)).toHaveCount(0);
}

const ALS_TEXT = 'Als Text zeigen';
const TROTZDEM_LADEN = 'Trotzdem laden';

/** Meldung „Binärdatei — <Grund>“, kein Byte-Inhalt, Schalter „Als Text zeigen“ bereit. */
async function pruefeBinaer(page, pfad, grund) {
  await pruefeMeldung(page, pfad, `Binärdatei — ${grund}`, false);
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeVisible();
}

async function alsTextZeigen(page) {
  await page.locator(BEREICH).getByRole('button', { name: ALS_TEXT }).click();
}

/** Text über der Grenze: Meldung mit Zeilenzahl, keine Zeilen, Schalter „Trotzdem laden“. */
async function pruefeZugeklappt(page, pfad, meldung) {
  await pruefeMeldung(page, pfad, meldung, false);
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeHidden();
  await expect(page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN })).toBeVisible();
}

async function trotzdemLaden(page) {
  await page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN }).click();
}

/** Die Fläche des Abschnitts eines Commits (ohne Kette, R00012); `commit` ist der volle Hash. */
function abschnitt(page, commit) {
  return page.locator(`${BEREICH} .diff-abschnitt[data-commit="${commit}"]`);
}

/** Der Abschnitt ist zugeklappt: sein Hinweis nennt die Grenze, keine Diff-Zeile steht, „Trotzdem laden“ ist da. */
async function pruefeAbschnittZugeklappt(page, commit, meldung) {
  const bereich = abschnitt(page, commit);
  await expect(bereich.locator('.diff-abschnitt-hinweis')).toHaveText(meldung);
  await expect(bereich.locator('tr[data-art]')).toHaveCount(0);
  await expect(bereich.getByRole('button', { name: TROTZDEM_LADEN })).toBeVisible();
}

async function abschnittTrotzdemLaden(page, commit) {
  await abschnitt(page, commit).getByRole('button', { name: TROTZDEM_LADEN }).click();
}

/** Im Abschnitt steht die Zeile mit Nummer neu `neu`; daneben ist der Zuklapphinweis verschwunden. */
async function pruefeAbschnittZeile(page, commit, neu, text) {
  const bereich = abschnitt(page, commit);
  await expect(bereich.locator(`tr[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  await expect(bereich.locator('.diff-abschnitt-hinweis')).toHaveCount(0);
}

/** Der Kopf des Abschnitts nennt Kurz-Hash und Betreff wie die Commit-Zeile; `rohzeichen` steht dort nie. */
async function pruefeAbschnittskopf(page, commit, erwartet, rohzeichen) {
  const kopf = abschnitt(page, commit).locator('.diff-abschnitt-kopf');
  await expect(kopf).toHaveText(erwartet);
  const text = await kopf.textContent();
  expect(text, 'rohe Steuerzeichen im Abschnittskopf').not.toContain(rohzeichen);
}

/** Wartet ereignisgenau (je Animationsbild), bis die Zeile mit Nummer neu `neu` gezeichnet ist. Das Zeichnen von 20 000 Zeilen mit
    Links dauert länger als die Standardfrist der Prüfung; das Merkmal ist die gezeichnete Zeile selbst, keine feste Pause (R00017). */
async function warteAufZeile(page, neu) {
  await page.waitForFunction(
    nummer => document.querySelector(`#diff .dz tr[data-art][data-neu="${nummer}"]`) !== null,
    neu,
    { polling: 'raf', timeout: 30000 },
  );
}

async function pruefeZeile(page, neu, text) {
  await warteAufZeile(page, neu);
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  await expect(page.locator(MELDUNG)).toHaveText('');
}

async function pruefeKeinSchalter(page) {
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeHidden();
  await expect(page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN })).toBeHidden();
}

async function pruefeAufforderungZurWahl(page) {
  await expect(page.locator(MELDUNG)).toHaveText(HINWEIS_ZUR_WAHL);
  await expect(page.locator(PFAD)).toHaveText('');
  await expect(page.locator(ZEILE)).toHaveCount(0);
}

/** Der Diff-Kopf nennt die Herkunft (R00012): „netto aus <Kurz-Hashes>“ bzw. „je Commit, nicht netto — <Grund>“. */
async function pruefeHerkunft(page, text) {
  await expect(page.locator(HERKUNFT)).toHaveText(text);
}

async function umbruchUmschalten(page) {
  await menueWaehlen(page, 'Umbruch');
}

/** Die Stellung des Umbruchs aus dem Menü: „an“ (der Start seit R00032) oder „aus“. */
async function umbruchStellung(page) {
  await menueOeffnen(page);
  const wert = await menueEintrag(page, 'Umbruch').getAttribute('aria-checked');
  await menueSchliessen(page);
  return wert === 'true' ? 'an' : 'aus';
}

/** Der Umschalter „Leerraum“ trägt seinen sichtbaren Text als Namen (R00026). */
const LEERRAUM_NAME = 'Leerraum ignorieren';

async function leerraumUmschalten(page) {
  await menueWaehlen(page, LEERRAUM_NAME);
}

async function leerraumPerTastaturUmschalten(page) {
  await menueOeffnen(page);
  await menueEintrag(page, LEERRAUM_NAME).focus();
  await page.keyboard.press('Space');
  await expect(page.locator(MENUE)).toBeHidden();
}

/** Die Stellung des Leerraum-Umschalters: „beachten“ (nicht angekreuzt, Start) oder „ignorieren“. */
async function pruefeLeerraumStellung(page, stellung) {
  await pruefeMenueZustand(page, LEERRAUM_NAME, String(stellung === 'ignorieren'));
}

/** Höhe der Zeile mit Nummer neu `neu` im Verhältnis zur Zeile 1, und ob der Bereich waagerecht scrollen kann. */
async function zeilenmass(page, neu) {
  return page.evaluate(([rollSelektor, zeilenSelektor, nummer]) => {
    const hoehe = n => document.querySelector(`${zeilenSelektor}[data-neu="${n}"]`).getBoundingClientRect().height;
    const rollElement = document.querySelector(rollSelektor);
    return { verhaeltnis: hoehe(nummer) / hoehe(1), scrolltWaagerecht: rollElement.scrollWidth > rollElement.clientWidth };
  }, [ROLLBEREICH, ZEILE, neu]);
}

async function pruefeEinzeilig(page, neu, text) {
  await expect.poll(() => umbruchStellung(page), { message: 'Umbruch aus' }).toBe('aus');
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  const mass = await zeilenmass(page, neu);
  // Zeile 1 trägt die halbe Kante des Hunk-Kopfs (border-collapse); eine Bildschirmzeile mehr wäre das Doppelte
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1`).toBeCloseTo(1, 1);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(true);
}

async function pruefeUmbrochen(page, neu, text) {
  await expect.poll(() => umbruchStellung(page), { message: 'Umbruch an' }).toBe('an');
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  const mass = await zeilenmass(page, neu);
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1`).toBeGreaterThan(1.5);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(false);
}

/** Die Stellung des Umschalters „Umbruch“: „an“ (der Start seit R00032) oder „aus“. */
async function pruefeUmbruchStellung(page, stellung) {
  await expect.poll(() => umbruchStellung(page), { message: `Umbruch ${stellung}` }).toBe(stellung);
}

/** R00039: der Umbruch ist ein Menüeintrag (`menuitemcheckbox`) mit dem Namen „Umbruch“; sein Zustand ist `aria-checked`. */
async function pruefeUmschalter(page, stellung) {
  await menueOeffnen(page);
  const eintrag = menueEintrag(page, 'Umbruch');
  await expect(eintrag, 'genau ein Menüeintrag „Umbruch“').toHaveCount(1);
  await expect(eintrag).toHaveAttribute('aria-checked', String(stellung === 'an'));
  await menueSchliessen(page);
}

/** R00039: der Menüknopf „Ansicht ▾“ ist der nächste Tab-Stopp nach dem Suchfeld und damit per Tastatur erreichbar. */
async function pruefeUmschalterPerTabErreichbar(page) {
  await page.locator('#diff-suche').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(MENUE_KNOPF)).toBeFocused();
}

/** R00039: den Umbruch mit der Tastatur umschalten — Enter öffnet das Menü, die Leertaste wählt den Eintrag. */
async function umbruchPerTastaturUmschalten(page) {
  await page.locator(MENUE_KNOPF).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(MENUE)).toBeVisible();
  await menueEintrag(page, 'Umbruch').focus();
  await page.keyboard.press('Space');
  await expect(page.locator(MENUE)).toBeHidden();
}

/** R00032: die Zeile mit Nummer neu `neu` ist umbrochen — mehrere Bildschirmzeilen hoch, kein waagerechtes Scrollen.
    Misst die Tabellenzeile selbst und gilt damit in beiden Anordnungen (in „nebeneinander“ trägt sie zwei Textspalten). */
async function pruefeZeileUmbrochen(page, neu) {
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"]`).first()).toBeVisible();
  const mass = await zeilenmass(page, neu);
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1`).toBeGreaterThan(1.5);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(false);
}

/** R00032: dieselbe Prüfung im Abschnitt `commit` — ohne lückenlose Kette trägt jede Zeilennummer mehrere Abschnitte. */
async function pruefeAbschnittZeileUmbrochen(page, commit, neu) {
  const bereich = abschnitt(page, commit);
  await expect(bereich.locator(`tr[data-art][data-neu="${neu}"]`).first()).toBeVisible();
  const mass = await bereich.evaluate((bereichElement, nummer) => {
    const hoehe = n => bereichElement.querySelector(`tr[data-art][data-neu="${n}"]`).getBoundingClientRect().height;
    const rollElement = document.querySelector('#diff .df-sc');
    return { verhaeltnis: hoehe(nummer) / hoehe(1), scrolltWaagerecht: rollElement.scrollWidth > rollElement.clientWidth };
  }, neu);
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1 im Abschnitt`).toBeGreaterThan(1.5);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(false);
}

/** Stellt die Ansicht („nur Änderungen“ oder „ganze Datei“) über das Menü ein — per Klick wie der Mensch. */
async function ansichtWaehlen(page, name) {
  await menueWaehlen(page, name);
}

/** Mit der Tastatur: das Kürzel `s` wechselt die Ansicht (R00039: die Kürzel wirken bei geschlossenem Menü wie bisher). */
async function ansichtPerTastaturWechseln(page) {
  await page.keyboard.press('s');
}

async function pruefeAnsicht(page, name) {
  const andere = name === 'ganze Datei' ? 'nur Änderungen' : 'ganze Datei';
  await menueOeffnen(page);
  await expect(menueEintrag(page, name)).toHaveAttribute('aria-checked', 'true');
  await expect(menueEintrag(page, andere)).toHaveAttribute('aria-checked', 'false');
  await menueSchliessen(page);
}

/** Hintergrundfarbe der Textzelle der ersten Zeile je Art. */
async function zeilenfarbenLesen(page) {
  return page.evaluate(zeile => {
    const farbe = art => getComputedStyle(document.querySelector(`${zeile}[data-art="${art}"] .c`)).backgroundColor;
    return { plus: farbe('plus'), minus: farbe('minus'), kontext: farbe('kontext') };
  }, ZEILE);
}

async function pruefeZeilenfarben(page, erwartet) {
  const farben = await zeilenfarbenLesen(page);
  expect(farben).toEqual(erwartet);
  expect(new Set(Object.values(farben)).size, `drei verschiedene Farben: ${JSON.stringify(farben)}`).toBe(3);
}

/** Führt `aktion` aus und misst, bis die Kontextzeile `{alt, neu}` im Dokument steht; liefert den Messwert. */
async function pruefeKontextzeileBinnen(page, aktion, { kontext, alt, neu }, fristMs) {
  const startUmMs = Date.now();
  await aktion();
  await page.waitForFunction(([selektor, nummerAlt, nummerNeu]) => document.querySelector(`${selektor}[data-alt="${nummerAlt}"][data-neu="${nummerNeu}"]`) !== null, [ZEILE, alt, neu], { polling: 'raf', timeout: 10000 });
  const dauerMs = Date.now() - startUmMs;
  expect(dauerMs, `Zeile ${alt}/${neu} nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  await expect(page.locator(`${ZEILE}[data-alt="${alt}"][data-neu="${neu}"] .c`)).toHaveText(kontext);
  return dauerMs;
}

/** Hält die Antwort auf den Diff von `pfad` 1,5 s zurück; `eingetroffen` wartet, bis sie da ist und gezeichnet sein könnte. */
async function diffAntwortVerzoegern(page, pfad, umfang = null, ms = VERZOEGERUNG_MS) {
  const istDiffVon = url => {
    const abfrage = new URL(url).searchParams;
    return url.includes('/diff?') && abfrage.get('pfad') === pfad && abfrage.get('umfang') === umfang;
  };
  await page.route(url => istDiffVon(url.toString()), async route => {
    await new Promise(weiter => setTimeout(weiter, ms));
    await route.continue();
  });
  const antwort = page.waitForResponse(response => istDiffVon(response.url()));
  return {
    eingetroffen: async () => {
      await antwort;
      await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
    },
  };
}

/** Beantwortet den Diff von `pfad` mit dem Ausgang „zu groß“ (Kennzeichen und Meldung), so wie der Server über der Ausgabegrenze.
    `umfang` grenzt ein (`null` = „nur Änderungen“, `'ganz'` = die ganze Datei). */
async function diffAntwortZuGross(page, pfad, meldung, umfang = null) {
  await page.route(url => {
    const adresse = url.toString();
    const abfrage = new URL(adresse).searchParams;
    return adresse.includes('/diff?') && abfrage.get('pfad') === pfad && abfrage.get('umfang') === umfang;
  }, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ zuGross: true, meldung }) }));
}

/** Beantwortet die erste Anfrage `umfang=ganz` für `pfad` mit `status`, jede weitere mit `patch` — so wird der zweite
    Aufklapp-Versuch nach einem Fehler möglich (R00026, Fehlerpfad). */
async function ganzDateiErstScheitern(page, pfad, status, patch) {
  let ersteAntwort = true;
  await page.route(url => {
    const adresse = url.toString();
    const abfrage = new URL(adresse).searchParams;
    return adresse.includes('/diff?') && abfrage.get('pfad') === pfad && abfrage.get('umfang') === 'ganz';
  }, route => {
    if (ersteAntwort) {
      ersteAntwort = false;
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ meldung: 'Diff konnte nicht gelesen werden' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pfad, status: 'M', alterPfad: null, art: 'text', grund: null, patch }) });
  });
}

/** Merkt jede Diff-Anfrage (`pfad`, `umfang`, `leerraum`) und lässt sie weiterlaufen; `fallback`, damit später gesetzte Routen (etwa
    ein verzögerter Fake) zuerst greifen (R00026). */
async function diffAnfragenBeobachten(page) {
  const anfragen = [];
  await page.route(url => url.toString().includes('/diff?'), route => {
    const abfrage = new URL(route.request().url()).searchParams;
    anfragen.push({ pfad: abfrage.get('pfad'), umfang: abfrage.get('umfang'), leerraum: abfrage.get('leerraum') });
    return route.fallback();
  });
  return anfragen;
}

/* ── Bild vorher/nachher (R00024): die Selektoren des Bereichs, die Anfragen und ihre Fakes ── */

const BILD_PAAR = '#diff .bild-paar';

function istBildAnfrage(url, pfad = null, seite = null) {
  const adresse = url.toString();
  if (!adresse.includes('/bild?')) {
    return false;
  }
  const abfrage = new URL(adresse).searchParams;
  if (pfad !== null && abfrage.get('pfad') !== pfad) {
    return false;
  }
  return seite === null || abfrage.get('seite') === seite;
}

/** Merkt jede Bildanfrage (`pfad`, `seite`) über `request` (unabhängig von gefälschten Antworten). */
async function bildAnfragenBeobachten(page) {
  const anfragen = [];
  page.on('request', request => {
    const adresse = request.url();
    if (istBildAnfrage(adresse)) {
      const abfrage = new URL(adresse).searchParams;
      anfragen.push({ pfad: abfrage.get('pfad'), seite: abfrage.get('seite') });
    }
  });
  return anfragen;
}

/** Die gezeichneten Bilder des Bereichs `selektor`: Quelle, natürliche Breite und Beschriftung; wartet, bis alle geladen sind. */
async function bildseitenLesen(page, selektor) {
  await page.waitForFunction(bereich => {
    const bilder = [...document.querySelectorAll(`${bereich} img`)];
    return bilder.length > 0 && bilder.every(bild => bild.complete && bild.naturalWidth > 0);
  }, selektor, { polling: 'raf', timeout: 10000 });
  return page.locator(`${selektor} .bild-seite`).evaluateAll(figuren => figuren.map(figur => {
    const bild = figur.querySelector('img');
    return { src: bild.getAttribute('src'), naturbreite: bild.naturalWidth, beschriftung: figur.querySelector('figcaption').textContent };
  }));
}

/** Die gezeichneten Bilder des Bereichs: Quelle, natürliche Breite und Beschriftung; wartet, bis alle geladen sind. */
async function bilderLesen(page) {
  return bildseitenLesen(page, BILD_PAAR);
}

/** Die Bilder des Abschnitts `commit` (Zusammen ohne Kette, R00024): je Stelle ihre beiden Fassungen. */
async function abschnittsbilderLesen(page, commit) {
  return bildseitenLesen(page, `${BEREICH} .diff-abschnitt[data-commit="${commit}"]`);
}

/** Der Titel des Bildpaares (neuer Pfad, bei einer Umbenennung beide Namen). */
async function bildTitel(page) {
  return page.locator(`${BILD_PAAR} .bild-titel`).textContent();
}

/** Im Bildbereich steht nichts als `img` und Text — kein `object`, `iframe`, `svg`, `a` und kein Attribut wie `onerror`. */
async function pruefeNurImgImBildbereich(page) {
  const fremde = await page.locator(`${BILD_PAAR} object, ${BILD_PAAR} iframe, ${BILD_PAAR} svg, ${BILD_PAAR} a, ${BILD_PAAR} [onerror], ${BILD_PAAR} [onload]`).count();
  expect(fremde, 'Fremdelemente im Bildbereich').toBe(0);
  const bilder = await page.locator(`${BILD_PAAR} img`).count();
  expect(bilder, 'nur `img`-Elemente').toBeGreaterThan(0);
}

/** Beantwortet die Bildanfrage `seite` für `pfad` mit festen Bytes (`medientyp`) oder einem Status; optional verzögert.
    `eingetroffen` wartet, bis die Antwort da ist und gezeichnet sein könnte. */
async function bildAntwortErsetzen(page, { pfad, seite, base64 = null, medientyp = 'image/png', status = 200, koerper = null, verzoegerungMs = 0 }) {
  const istAnfrage = url => istBildAnfrage(url, pfad, seite);
  const eingetroffen = page.waitForResponse(response => istAnfrage(response.url())).catch(() => null);
  await page.route(istAnfrage, async route => {
    if (verzoegerungMs > 0) {
      await new Promise(weiter => setTimeout(weiter, verzoegerungMs));
    }
    if (status !== 200) {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(koerper || {}) });
      return;
    }
    await route.fulfill({ status: 200, contentType: medientyp, body: Buffer.from(base64, 'base64') });
  });
  return {
    eingetroffen: async () => {
      await eingetroffen;
      await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
    },
  };
}


/** Beantwortet die Diff-Anfrage von `pfad` im Umfang `umfang` (`null` = „nur Änderungen“) und der Leerraum-Stellung `leerraum`
    (`null` = „beachten“) mit einem eigenen Rumpf — nach `verzoegerungMs` oder als Fehler `status`. */
async function diffAntwortErsetzen(page, { pfad, umfang = null, leerraum = null, patch = null, status = 200, verzoegerungMs = 0, art = 'text', dateiStatus = 'M', grund = null, alterPfad = null }) {
  const istAnfrage = url => {
    const adresse = url.toString();
    const abfrage = new URL(adresse).searchParams;
    return adresse.includes('/diff?') && abfrage.get('pfad') === pfad && abfrage.get('umfang') === umfang && abfrage.get('leerraum') === leerraum;
  };
  const eingetroffen = page.waitForResponse(response => istAnfrage(response.url()));
  await page.route(istAnfrage, async route => {
    if (verzoegerungMs > 0) {
      await new Promise(weiter => setTimeout(weiter, verzoegerungMs));
    }
    if (status !== 200) {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ meldung: 'Diff konnte nicht gelesen werden' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ pfad, status: dateiStatus, alterPfad, art, grund, patch }),
    });
  });
  return {
    eingetroffen: async () => {
      await eingetroffen;
      await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
    },
  };
}

/** Die Lücken-Bedienelemente innerhalb `wurzel`: Zahl der verborgenen Zeilen und die Beschriftungen der beiden Knöpfe. */
async function lueckenIn(wurzel) {
  return wurzel.locator('.dz-l').evaluateAll(elemente => elemente.map(element => ({
    text: element.querySelector('.dz-l-text').textContent,
    schritt: element.querySelector('.dz-l-auf:not([data-ganz])').textContent,
    ganz: element.querySelector('.dz-l-auf[data-ganz]').textContent,
  })));
}

/** Die Lücken-Bedienelemente der gezeigten Ansicht: Zahl der verborgenen Zeilen und die Beschriftungen der beiden Knöpfe. */
async function lueckenLesen(page) {
  return lueckenIn(page.locator(ROLLBEREICH));
}

/** Der Knopf der `nummer`-ten Lücke (ab 1) innerhalb von `wurzel`; `ganz` wählt statt des Schritts „Ganz aufklappen“. */
function lueckenKnopfIn(wurzel, nummer, ganz) {
  const luecke = wurzel.locator('.dz-l').nth(nummer - 1);
  if (ganz) {
    return luecke.locator('.dz-l-auf[data-ganz]');
  }
  return luecke.locator('.dz-l-auf:not([data-ganz])');
}

/** Betätigt den Knopf der `nummer`-ten Lücke (ab 1) innerhalb von `wurzel`; `ganz` wählt „Ganz aufklappen“. */
async function lueckeAufklappenIn(wurzel, nummer, ganz = false) {
  await lueckenKnopfIn(wurzel, nummer, ganz).click();
}

/** Betätigt den Knopf der `nummer`-ten Lücke (ab 1); `ganz` wählt statt des Schritts „Ganz aufklappen“, `perTastatur` Enter. */
async function lueckeAufklappen(page, nummer, ganz = false, perTastatur = false) {
  const knopf = lueckenKnopfIn(page.locator(ROLLBEREICH), nummer, ganz);
  if (perTastatur) {
    await knopf.focus();
    await page.keyboard.press('Enter');
    return;
  }
  await knopf.click();
}

/* ── Lücken im Abschnitt eines Commits (Zusammen ohne Kette, R00012/R00026): jeder Abschnitt trägt seine eigenen ── */

/** Die Lücken im Abschnitt `commit` — jeder Abschnitt hat seine eigene Lückenrechnung im Stand seines Commits. */
async function abschnittLueckenLesen(page, commit) {
  return lueckenIn(abschnitt(page, commit));
}

/** Betätigt den Knopf der `nummer`-ten Lücke (ab 1) im Abschnitt `commit`. */
async function abschnittLueckeAufklappen(page, commit, nummer, ganz = false) {
  await lueckeAufklappenIn(abschnitt(page, commit), nummer, ganz);
}

/** Zahl der gezeichneten Diff-Zeilen im Abschnitt `commit`. */
async function abschnittZeilenZaehlen(page, commit) {
  return abschnitt(page, commit).locator('tr[data-art]').count();
}

/** Ob eine Zeile mit Nummer neu `neu` im Abschnitt `commit` steht. */
async function abschnittZeileVorhanden(page, commit, neu) {
  return (await abschnitt(page, commit).locator(`tr[data-art][data-neu="${neu}"]`).count()) > 0;
}

/** Der Text der Zeile mit Nummer neu `neu` im Abschnitt `commit`. */
async function abschnittZeilentextLesen(page, commit, neu) {
  return abschnitt(page, commit).locator(`tr[data-art][data-neu="${neu}"] .c`).textContent();
}

/** Die Meldung der `nummer`-ten Lücke (ab 1), z. B. wenn das Lesen der ganzen Datei scheitert (R00026). */
async function lueckeMeldet(page, nummer, text) {
  await expect(page.locator(`${ROLLBEREICH} .dz-l`).nth(nummer - 1).locator('.dz-l-fehler')).toHaveText(text);
}

/** Jede Diff-Zeile mit Nummer neu `von`…`bis` trägt ihren eigenen Text `text(neu)` und einen Link `:<neu>` in der Nummernspalte;
    die Textzelle trägt keinen Link (R00021/R00026). Der Lesetext für Screenreader (`.vh`) zählt nicht zum Zeilentext. */
async function pruefeZeilenMitEigenemLink(page, von, bis, text) {
  for (let neu = von; neu <= bis; neu += 1) {
    const zeile = page.locator(`${ZEILE}[data-neu="${neu}"]`);
    await expect(zeile, `Zeile ${neu}`).toHaveCount(1);
    const gelesen = await zeile.locator('td.c').evaluate(zelle => {
      const lesetext = zelle.querySelector('.vh');
      let inhalt = zelle.textContent;
      if (lesetext) {
        inhalt = inhalt.slice(lesetext.textContent.length);
      }
      return inhalt;
    });
    expect(gelesen, `Text Zeile ${neu}`).toBe(text(neu));
    const href = await zeile.locator('td.neu a').getAttribute('href');
    expect(href, `Link Zeile ${neu}`).not.toBeNull();
    expect(Number(href.split(':').pop()), `Link-Ziel Zeile ${neu}`).toBe(neu);
    await expect(zeile.locator('td.c a'), `kein Link in der Textzelle ${neu}`).toHaveCount(0);
  }
}

/** Zahl der gezeichneten Diff-Zeilen. */
async function zeilenZaehlen(page) {
  return page.locator(ZEILE).count();
}

/** Ob eine Zeile mit Nummer neu `neu` im Dokument steht. */
async function zeileVorhanden(page, neu) {
  return (await page.locator(`${ZEILE}[data-neu="${neu}"]`).count()) > 0;
}

/** Der Text der Zeile mit Nummer neu `neu` (Kontextzeile ohne Lesetext). */
async function zeilentextLesen(page, neu) {
  return page.locator(`${ZEILE}[data-neu="${neu}"] .c`).textContent();
}

/** Knotenzahl je Block (`.dz-b`): Elemente **und** Textknoten, samt dem Block selbst — dieselbe Zahl, die der Browser auslegt. */
async function blockKnoten(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#diff .df-sc .dz-b'), block => {
    const knotenElemente = [block, ...block.querySelectorAll('*')];
    let anzahl = knotenElemente.length;
    for (const element of knotenElemente) {
      for (const kind of element.childNodes) {
        if (kind.nodeType === Node.TEXT_NODE) {
          anzahl += 1;
        }
      }
    }
    return anzahl;
  }));
}

/** Wartet, bis die Färbung fertig ist (`data-farbe` `ja` oder `nein`), und liefert den Zustand. */
async function warteAufFarbe(page) {
  await page.waitForFunction(() => ['ja', 'nein'].includes(document.querySelector('#diff .df-sc').dataset.farbe), undefined, { polling: 'raf', timeout: 30000 });
  return page.evaluate(() => document.querySelector('#diff .df-sc').dataset.farbe);
}

/** Scrollt in `schritte` Sprüngen durch die Seite über den Diff-Bereich und liefert die Aufgaben des Hauptfadens (Long Tasks)
    samt der erzwingenden Layoutzeit je Sprung; die Einfrier-Schranke der Suite beurteilt sie. */
async function langeAufgabenBeimScrollen(page, schritte = 24) {
  return page.evaluate(async anzahl => {
    const aufgaben = [];
    const beobachter = new PerformanceObserver(liste => {
      for (const eintrag of liste.getEntries()) {
        aufgaben.push({ dauerMs: eintrag.duration, art: 'longtask' });
      }
    });
    beobachter.observe({ type: 'longtask' });
    const bereich = document.querySelector('#diff');
    const oben = bereich.getBoundingClientRect().top + window.scrollY;
    const spanne = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    for (let i = 1; i <= anzahl; i += 1) {
      await new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig)));
      const ziel = Math.min(spanne, Math.floor(oben + spanne * i / anzahl));
      const startUmMs = performance.now();
      window.scrollTo(0, ziel);
      void document.documentElement.scrollHeight;
      aufgaben.push({ dauerMs: performance.now() - startUmMs, art: 'layout' });
    }
    beobachter.takeRecords().forEach(eintrag => aufgaben.push({ dauerMs: eintrag.duration, art: 'longtask' }));
    beobachter.disconnect();
    return aufgaben;
  }, schritte);
}

/** Wählt die Datei über `waehlen` und misst vom Klick, bis der Zuklapphinweis `meldung` im Dokument steht; liefert den Messwert. */
async function zugeklapptRechtzeitigNachKlick(page, waehlen, pfad, meldung, fristMs) {
  return zugeklapptRechtzeitigNachAktion(page, waehlen, pfad, meldung, fristMs);
}

/** Führt `aktion` aus und misst bis zum Zuklapphinweis `meldung`; liefert den Messwert. */
async function zugeklapptRechtzeitigNachAktion(page, aktion, pfad, meldung, fristMs) {
  const startUmMs = Date.now();
  await aktion();
  await page.waitForFunction(([selektor, text]) => document.querySelector(selektor).textContent === text, [MELDUNG, meldung], { polling: 'raf', timeout: 10000 });
  const dauerMs = Date.now() - startUmMs;
  expect(dauerMs, `Zuklappzustand nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  await pruefePfad(page, pfad);
  await expect(page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN })).toBeVisible();
  return dauerMs;
}

/** Wählt die Datei über `waehlen` und misst ereignisgenau im Browser vom Klick-Ereignis bis das Produkt das Zeichnen meldet
    (`diff-gezeichnet`, mit der Zeile `neu` im Dokument); liefert den Messwert ohne Urteil. Gemessen wird das Produkt, nicht der
    Rahmen: die Bedienzeit des Testrahmens (Prüfung der Bedienbarkeit, Scrollen, Protokollweg) und die Bildrate einer Abfrage
    sind kein Leistungsurteil. Das Klick-Ereignis ist derselbe Nullpunkt wie „nach dem Klick“ in der Zusage. Die
    Positivkontrolle der Anzeige-Schranke beurteilt diesen Messwert selbst. */
async function messeZeileNachKlick(page, waehlen, neu) {
  await page.evaluate(nummer => {
    const vorige = window.gitreviewaZeitmessung ? window.gitreviewaZeitmessung.lauf : 0;
    window.gitreviewaZeitmessung = { lauf: vorige + 1, klickUmMs: null, gezeichnetUmMs: null };
    const lauf = window.gitreviewaZeitmessung.lauf;
    document.addEventListener('click', ereignis => {
      const ziel = ereignis.target;
      if (window.gitreviewaZeitmessung.lauf === lauf && window.gitreviewaZeitmessung.klickUmMs === null && ziel instanceof Element && ziel.closest('#datei-zeilen')) {
        window.gitreviewaZeitmessung.klickUmMs = performance.now();
      }
    }, { capture: true });
    document.addEventListener('diff-gezeichnet', () => {
      if (window.gitreviewaZeitmessung.lauf !== lauf || window.gitreviewaZeitmessung.gezeichnetUmMs !== null) {
        return;
      }
      if (document.querySelector(`#diff .dz tr[data-art][data-neu="${nummer}"]`) !== null) {
        window.gitreviewaZeitmessung.gezeichnetUmMs = performance.now();
      }
    });
  }, neu);
  await waehlen();
  await page.waitForFunction(() => window.gitreviewaZeitmessung.gezeichnetUmMs !== null, undefined, { polling: 'raf', timeout: 20000 });
  return page.evaluate(() => Math.round(window.gitreviewaZeitmessung.gezeichnetUmMs - window.gitreviewaZeitmessung.klickUmMs));
}

/** Wie `messeZeileNachKlick`, dazu das Urteil gegen `fristMs` und der Diff-Inhalt. */
async function pruefeZeileBinnenNachKlick(page, waehlen, { kopf, plus, neu }, fristMs) {
  const dauerMs = await messeZeileNachKlick(page, waehlen, neu);
  expect(dauerMs, `Zeile ${neu} nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  await expect(page.locator(`${ZEILE}[data-art="kopf"]`).first()).toHaveText(kopf);
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${plus}`);
  return dauerMs;
}

/** Wählt `datei` (über `dateiWaehlen`), klickt „Als Text zeigen“ und misst, bis Zeilen oder „Trotzdem laden“ stehen und zwei Bilder gezeichnet sind; dann muss ein Klick auf `andereDatei` ihren Diff zeigen. */
async function pruefeBedienbarNachAlsText(page, dateiWaehlen, datei, andereDatei, fristMs) {
  await dateiWaehlen(datei);
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeVisible();
  const klickUmMs = Date.now();
  await alsTextZeigen(page);
  await page.waitForFunction(
    ([zeile, bereich]) => document.querySelector(zeile) !== null || (document.querySelector(`${bereich} .trotzdem-laden`) && !document.querySelector(`${bereich} .trotzdem-laden`).hidden),
    [`${ZEILE}`, BEREICH],
    { polling: 'raf', timeout: 30000 },
  );
  await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
  await dateiWaehlen(andereDatei);
  await expect(page.locator(`${ZEILE}[data-neu="1"] .c`)).toHaveText('hinzugefügt: eins', { timeout: 30000 });
  const dauerMs = Date.now() - klickUmMs;
  expect(dauerMs, `${datei}: bedienbar nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  return dauerMs;
}

/* ── Sprung in VS Code (R00021): Links an Zeilen und Abschnittsköpfen, Verweis und Hinweis im Kopf ── */

const SPRUNG_KOPF = '#diff .dz tr.hk td.c a';
const SPRUNG_VERWEIS = '#diff .diff-kopf .sprung-knopf';
const SPRUNG_GRUND = '#diff .diff-kopf .sprung-grund';
const SPRUNG_HINWEIS = '#diff .diff-kopf .sprung-hinweis';

async function pruefeSprungzeile(page, neu, href) {
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] a`)).toHaveAttribute('href', href);
}

/** Der Name des Zeilen-Links im ARIA-Schnappschuss: ein fokussierbarer Link in einem `aria-hidden`-Teilbaum hätte keinen. */
async function pruefeSprungzeileName(page, neu, name) {
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] a`)).toMatchAriaSnapshot(`- link "${name}"`);
}

/** Ob der Zeilen-Link in einem `aria-hidden`-Teilbaum liegt — dort hat er für Vorlesewerkzeuge keinen Namen. */
async function sprungzeileLiegtImVerborgenen(page, neu) {
  return page.locator(`${ZEILE}[data-neu="${neu}"] a`).evaluate(anker => anker.closest('[aria-hidden="true"]') !== null);
}

/** Der Name des Abschnittskopf-Links; er trägt seinen sichtbaren Text (den Hunk-Titel) als Namen. */
async function pruefeSprungkopfName(page, name) {
  await expect(page.locator(SPRUNG_KOPF).first()).toMatchAriaSnapshot(`- link "${name}"`);
}

/** Der Link des ersten Abschnittskopf-Links. */
function sprungHunkLink(page) {
  return page.locator(SPRUNG_KOPF).first().getAttribute('href');
}

/** Wählt die Zeile mit Nummer neu `neu` per Klick auf ihren Text — so wie der Mensch eine Zeile wählt. */
async function zeileWaehlen(page, neu) {
  await page.locator(`${ZEILE}[data-neu="${neu}"] .c`).click();
}

async function pruefeSprungVerweis(page, href) {
  await expect(page.locator(SPRUNG_VERWEIS)).toBeVisible();
  await expect(page.locator(SPRUNG_VERWEIS)).toHaveAttribute('href', href);
}

async function pruefeSprungGrund(page, text) {
  await expect(page.locator(SPRUNG_VERWEIS)).toBeHidden();
  await expect(page.locator(SPRUNG_GRUND)).toHaveText(text);
}

async function pruefeSprungHinweis(page, text) {
  await expect(page.locator(SPRUNG_HINWEIS)).toHaveText(text);
}

/** Hält die Antwort auf die Sprunganfrage für `pfad` `verzoegerungMs` zurück; `eingetroffen` wartet, bis sie da ist und gezeichnet sein könnte. */
async function sprungAntwortVerzoegern(page, pfad, verzoegerungMs = VERZOEGERUNG_MS) {
  const istSprungVon = url => url.includes('/sprung?') && new URL(url).searchParams.get('pfad') === pfad;
  await page.route(url => istSprungVon(url.toString()), async route => {
    await new Promise(weiter => setTimeout(weiter, verzoegerungMs));
    await route.continue();
  });
  const antwort = page.waitForResponse(response => istSprungVon(response.url()));
  return {
    eingetroffen: async () => {
      await antwort;
      await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
    },
  };
}

/** Beantwortet die Sprunganfrage für `pfad` mit `status` (Vorgabe 500); `eingetroffen` wartet, bis sie beantwortet ist und gezeichnet sein könnte. */
async function sprungAntwortScheitern(page, pfad, status = 500) {
  const istSprungVon = url => url.includes('/sprung?') && new URL(url).searchParams.get('pfad') === pfad;
  await page.route(url => istSprungVon(url.toString()), route => route.fulfill({ status }));
  const antwort = page.waitForResponse(response => istSprungVon(response.url()));
  return {
    eingetroffen: async () => {
      await antwort;
      await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
    },
  };
}

module.exports = {
  pruefeBedienbarNachAlsText, ansichtWaehlen, ansichtPerTastaturWechseln, pruefeAnsicht, zeilenfarbenLesen, pruefeZeilenfarben, pruefeKontextzeileBinnen,
  menueOeffnen, menueSchliessen, menueEintrag, menueWaehlen, pruefeMenueZustand, umbruchStellung,
  setzeDiffBreite, leistenmass, pfadmass,
  pruefeDiff, pruefePfad, pruefeMeldung, pruefeFehlerOhneZeilen, pruefeAufforderungZurWahl, pruefeHerkunft, umbruchUmschalten, pruefeEinzeilig, pruefeUmbrochen, pruefeUmbruchStellung, pruefeUmschalter, pruefeUmschalterPerTabErreichbar, umbruchPerTastaturUmschalten, pruefeZeileUmbrochen, pruefeAbschnittZeileUmbrochen, diffAntwortVerzoegern,
  pruefeZeileBinnenNachKlick, pruefeBinaer, alsTextZeigen, pruefeZugeklappt, trotzdemLaden, pruefeZeile, pruefeKeinSchalter,
  pruefeAbschnittZugeklappt, abschnittTrotzdemLaden, pruefeAbschnittZeile, pruefeAbschnittskopf,
  diffAntwortZuGross, ganzDateiErstScheitern, blockKnoten, warteAufFarbe, langeAufgabenBeimScrollen, zugeklapptRechtzeitigNachKlick, zugeklapptRechtzeitigNachAktion,
  pruefeSprungzeile, pruefeSprungzeileName, sprungzeileLiegtImVerborgenen, pruefeSprungkopfName, sprungHunkLink, zeileWaehlen,
  pruefeSprungVerweis, pruefeSprungGrund, pruefeSprungHinweis, sprungAntwortVerzoegern, sprungAntwortScheitern,
  leerraumUmschalten, leerraumPerTastaturUmschalten, pruefeLeerraumStellung, diffAnfragenBeobachten, diffAntwortErsetzen,
  lueckenLesen, lueckeAufklappen, lueckeMeldet, pruefeZeilenMitEigenemLink, zeilenZaehlen, zeileVorhanden, zeilentextLesen,
  abschnittLueckenLesen, abschnittLueckeAufklappen, abschnittZeilenZaehlen, abschnittZeileVorhanden, abschnittZeilentextLesen,
  bildAnfragenBeobachten, bildAntwortErsetzen, bilderLesen, abschnittsbilderLesen, bildTitel, pruefeNurImgImBildbereich,
  messeZeileNachKlick,
};
