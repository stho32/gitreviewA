'use strict';
// Treiber Oberfläche des Diff-Bereichs (R00004): der einzige Ort, der seine Selektoren kennt; die Prüfungen dazu sitzen hier.
const { expect } = require('@playwright/test');

const BEREICH = '#diff';
const PFAD = '#diff .diff-pfad';
const MELDUNG = '#diff .diff-meldung';
const HERKUNFT = '#diff .diff-herkunft';
const ROLLBEREICH = '#diff .df-sc';
/** Nur Diff-Zeilen: Anmerkungszeilen (R00010) tragen kein `data-art` und zählen nicht mit. */
const ZEILE = '#diff .dz tr[data-art]';
const HINWEIS_ZUR_WAHL = 'Datei wählen, um ihren Diff zu sehen';
const VORZEICHEN = { plus: '+', minus: '−' };
const VERZOEGERUNG_MS = 1500;

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

async function pruefeDiff(page, { pfad, zeilen }) {
  await expect(page.locator(PFAD)).toHaveText(pfad);
  await pruefeKeinSchalter(page);
  await expect.poll(() => diffZeilenLesen(page), `Diff von ${pfad}`).toEqual(zeilen.map(alsGeleseneZeile));
  await expect(page.locator(MELDUNG)).toHaveText('');
}

async function pruefeMeldung(page, pfad, text, istFehler) {
  await expect(page.locator(PFAD)).toHaveText(pfad);
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
  await page.locator(BEREICH).getByLabel('Umbruch').click();
}

/** Der Umschalter „Leerraum“ trägt seinen sichtbaren Text als Namen (R00026). */
const LEERRAUM_NAME = 'Leerraum ignorieren';

async function leerraumUmschalten(page) {
  await page.locator(BEREICH).getByRole('checkbox', { name: LEERRAUM_NAME }).click();
}

async function leerraumPerTastaturUmschalten(page) {
  await page.locator(BEREICH).getByRole('checkbox', { name: LEERRAUM_NAME }).focus();
  await page.keyboard.press('Space');
}

/** Die Stellung des Leerraum-Umschalters: „beachten“ (nicht angekreuzt, Start) oder „ignorieren“. */
async function pruefeLeerraumStellung(page, stellung) {
  const schalter = page.locator(BEREICH).getByRole('checkbox', { name: LEERRAUM_NAME });
  if (stellung === 'ignorieren') {
    await expect(schalter).toBeChecked();
    return;
  }
  await expect(schalter).not.toBeChecked();
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
  await expect(page.locator(BEREICH).getByLabel('Umbruch')).not.toBeChecked();
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  const mass = await zeilenmass(page, neu);
  // Zeile 1 trägt die halbe Kante des Hunk-Kopfs (border-collapse); eine Bildschirmzeile mehr wäre das Doppelte
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1`).toBeCloseTo(1, 1);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(true);
}

async function pruefeUmbrochen(page, neu, text) {
  await expect(page.locator(BEREICH).getByLabel('Umbruch')).toBeChecked();
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  const mass = await zeilenmass(page, neu);
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1`).toBeGreaterThan(1.5);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(false);
}

/** Stellt den Umschalter der Ansicht auf `name` („nur Änderungen“ oder „ganze Datei“) — per Klick wie der Mensch. */
async function ansichtWaehlen(page, name) {
  await page.locator(BEREICH).getByRole('radiogroup', { name: 'Ansicht' }).getByRole('radio', { name, exact: true }).click();
}

/** Mit der Tastatur: Fokus auf die gewählte Stellung, dann Pfeiltaste zur anderen. */
async function ansichtPerTastaturWechseln(page) {
  await page.locator(BEREICH).getByRole('radiogroup', { name: 'Ansicht' }).getByRole('radio', { checked: true }).focus();
  await page.keyboard.press('ArrowRight');
}

async function pruefeAnsicht(page, name) {
  const gruppe = page.locator(BEREICH).getByRole('radiogroup', { name: 'Ansicht' });
  await expect(gruppe.getByRole('radio', { name, exact: true })).toBeChecked();
  await expect(gruppe.getByRole('radio', { checked: true })).toHaveCount(1);
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
async function diffAntwortVerzoegern(page, pfad, umfang = null) {
  const istDiffVon = url => {
    const abfrage = new URL(url).searchParams;
    return url.includes('/diff?') && abfrage.get('pfad') === pfad && abfrage.get('umfang') === umfang;
  };
  await page.route(url => istDiffVon(url.toString()), async route => {
    await new Promise(weiter => setTimeout(weiter, VERZOEGERUNG_MS));
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

/** Beantwortet die Diff-Anfrage von `pfad` im Umfang `umfang` (`null` = „nur Änderungen“) und der Leerraum-Stellung `leerraum`
    (`null` = „beachten“) mit einem eigenen Rumpf — nach `verzoegerungMs` oder als Fehler `status`. */
async function diffAntwortErsetzen(page, { pfad, umfang = null, leerraum = null, patch = null, status = 200, verzoegerungMs = 0 }) {
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
      body: JSON.stringify({ pfad, status: 'M', alterPfad: null, art: 'text', grund: null, patch }),
    });
  });
  return {
    eingetroffen: async () => {
      await eingetroffen;
      await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
    },
  };
}

/** Die Lücken-Bedienelemente der gezeigten Ansicht: Zahl der verborgenen Zeilen und die Beschriftungen der beiden Knöpfe. */
async function lueckenLesen(page) {
  return page.locator(`${ROLLBEREICH} .dz-l`).evaluateAll(elemente => elemente.map(element => ({
    text: element.querySelector('.dz-l-text').textContent,
    schritt: element.querySelector('.dz-l-auf:not([data-ganz])').textContent,
    ganz: element.querySelector('.dz-l-auf[data-ganz]').textContent,
  })));
}

/** Betätigt den Knopf der `nummer`-ten Lücke (ab 1); `ganz` wählt statt des Schritts „Ganz aufklappen“, `perTastatur` Enter. */
async function lueckeAufklappen(page, nummer, ganz = false, perTastatur = false) {
  const luecke = page.locator(`${ROLLBEREICH} .dz-l`).nth(nummer - 1);
  let knopf = luecke.locator('.dz-l-auf:not([data-ganz])');
  if (ganz) {
    knopf = luecke.locator('.dz-l-auf[data-ganz]');
  }
  if (perTastatur) {
    await knopf.focus();
    await page.keyboard.press('Enter');
    return;
  }
  await knopf.click();
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

/** Scrollt in `schritte` Sprüngen durch die Seite über den Diff-Bereich und liefert die Aufgaben des Hauptfadens über 150 ms (Long Tasks)
    samt der erzwingenden Layoutzeit je Sprung. */
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
  await expect(page.locator(PFAD)).toHaveText(pfad);
  await expect(page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN })).toBeVisible();
  return dauerMs;
}

/** Wählt die Datei über `waehlen` und misst vom Klick, bis die Zeile mit Nummer neu `neu` im Dokument steht; liefert den Messwert. */
async function pruefeZeileBinnenNachKlick(page, waehlen, { kopf, plus, neu }, fristMs) {
  const klickUmMs = Date.now();
  await waehlen();
  await page.waitForFunction(([selektor, nummer]) => document.querySelector(`${selektor}[data-neu="${nummer}"]`) !== null, [ZEILE, neu], { polling: 'raf', timeout: 10000 });
  const dauerMs = Date.now() - klickUmMs;
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
  pruefeDiff, pruefeMeldung, pruefeFehlerOhneZeilen, pruefeAufforderungZurWahl, pruefeHerkunft, umbruchUmschalten, pruefeEinzeilig, pruefeUmbrochen, diffAntwortVerzoegern,
  pruefeZeileBinnenNachKlick, pruefeBinaer, alsTextZeigen, pruefeZugeklappt, trotzdemLaden, pruefeZeile, pruefeKeinSchalter,
  pruefeAbschnittZugeklappt, abschnittTrotzdemLaden, pruefeAbschnittZeile, pruefeAbschnittskopf,
  diffAntwortZuGross, ganzDateiErstScheitern, blockKnoten, warteAufFarbe, langeAufgabenBeimScrollen, zugeklapptRechtzeitigNachKlick, zugeklapptRechtzeitigNachAktion,
  pruefeSprungzeile, pruefeSprungzeileName, sprungzeileLiegtImVerborgenen, pruefeSprungkopfName, sprungHunkLink, zeileWaehlen,
  pruefeSprungVerweis, pruefeSprungGrund, pruefeSprungHinweis, sprungAntwortVerzoegern, sprungAntwortScheitern,
  leerraumUmschalten, leerraumPerTastaturUmschalten, pruefeLeerraumStellung, diffAnfragenBeobachten, diffAntwortErsetzen,
  lueckenLesen, lueckeAufklappen, lueckeMeldet, pruefeZeilenMitEigenemLink, zeilenZaehlen, zeileVorhanden, zeilentextLesen,
};
