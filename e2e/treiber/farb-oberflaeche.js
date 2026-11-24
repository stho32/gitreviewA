'use strict';
// Treiber Syntaxfarben im Diff-Bereich (R00007): der einzige Ort, der Klassen `tk-…`, `data-farbe`, Worker, Prism-Adresse, Long Tasks
// und Farbrechnung kennt; die Prüfungen dazu sitzen hier.
const { expect } = require('@playwright/test');

const PFAD = '#diff .diff-pfad';
const MELDUNG = '#diff .diff-meldung';
const ROLLBEREICH = '#diff .df-sc';
const DIFFZEILE = '#diff .df-sc tr[data-art]';
const KLASSE_JE_ROLLE = {
  Schlüsselwort: 'tk-keyword', Zeichenkette: 'tk-string', Kommentar: 'tk-comment', Zahl: 'tk-number', Funktion: 'tk-function', Typ: 'tk-type', Makro: 'tk-macro',
};
const LANGE_AUFGABE_MS = 150;

/** Vor dem Laden der Seite: Long Tasks, jeder Wechsel von `data-farbe` und die Zeilen unmittelbar nach dem Zeichnen, vor der Farbe
    (der erste Zustand nach dem Zeichnen: `laeuft` oder gleich `nein`). */
async function mitschriftEinrichten(page) {
  const meldungen = { konsole: [], seitenfehler: [] };
  page.on('console', nachricht => meldungen.konsole.push(nachricht.text()));
  page.on('pageerror', fehler => meldungen.seitenfehler.push(String(fehler)));
  await page.addInitScript(zeilenSelektor => {
    const mitschrift = { langeAufgaben: [], farbzustaende: [], zeilenVorDerFarbe: null, textStehtUm: null };
    window.farbMitschrift = mitschrift;
    new PerformanceObserver(liste => {
      for (const eintrag of liste.getEntries()) {
        mitschrift.langeAufgaben.push({ startMs: eintrag.startTime, dauerMs: eintrag.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
    const zeilenLesen = () => Array.from(document.querySelectorAll(zeilenSelektor), zeile => ({
      art: zeile.dataset.art, alt: zeile.dataset.alt, neu: zeile.dataset.neu, text: zeile.lastElementChild.textContent,
    }));
    new MutationObserver(eintraege => {
      for (const eintrag of eintraege) {
        const zustand = eintrag.target.getAttribute('data-farbe');
        mitschrift.farbzustaende.push(zustand);
        const frischGezeichnet = eintrag.oldValue === null && zustand !== null;
        if (frischGezeichnet) {
          mitschrift.textStehtUm = performance.now();
          mitschrift.zeilenVorDerFarbe = zeilenLesen();
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['data-farbe'] });
  }, DIFFZEILE);
  return meldungen;
}

/** Wartet, bis der Diff von `pfad` steht und seine Färbung abgeschlossen ist (`ja` oder `nein`); liefert den Zustand. */
async function farbeAbwarten(page, pfad) {
  await page.waitForFunction(([pfadSelektor, bereichSelektor, erwartet]) => {
    const zustand = document.querySelector(bereichSelektor).getAttribute('data-farbe');
    return document.querySelector(pfadSelektor).textContent === erwartet && (zustand === 'ja' || zustand === 'nein');
  }, [PFAD, ROLLBEREICH, pfad], { polling: 'raf', timeout: 15000 });
  return page.locator(ROLLBEREICH).getAttribute('data-farbe');
}

/** Rolle je Zeichen der Textstelle `stelle` (ihr `vorkommen`-tes Auftreten) in der Zeile `zeile` = `{kontext|plus|minus: text}`. */
async function rollenDerStelle(page, zeile, stelle, vorkommen = 1) {
  const [art] = ['kontext', 'plus', 'minus'].filter(name => name in zeile);
  return page.evaluate(([selektor, zeilenart, zeilentext, gesucht, nummer, klassen]) => {
    const passend = Array.from(document.querySelectorAll(`${selektor}[data-art="${zeilenart}"]`)).filter(tr => textOhneLesetext(tr) === zeilentext);
    if (passend.length !== 1) {
      return `Zeile ${zeilenart} „${zeilentext}“ ${passend.length}-mal gefunden`;
    }
    const zeichen = zeichenMitRolle(passend[0].lastElementChild);
    const text = zeichen.map(eintrag => eintrag.zeichen).join('');
    let von = -1;
    for (let gefunden = 0; gefunden < nummer; gefunden += 1) {
      von = text.indexOf(gesucht, von + 1);
    }
    if (von < 0) {
      return `„${gesucht}“ nicht in „${text}“`;
    }
    return zeichen.slice(von, von + gesucht.length).map(eintrag => eintrag.rolle);

    function textOhneLesetext(tr) {
      return zeichenMitRolle(tr.lastElementChild).map(eintrag => eintrag.zeichen).join('');
    }

    function zeichenMitRolle(zelle) {
      const aus = [];
      const gang = document.createTreeWalker(zelle, NodeFilter.SHOW_TEXT);
      for (let knoten = gang.nextNode(); knoten; knoten = gang.nextNode()) {
        if (knoten.parentElement.closest('.vh')) {
          continue;
        }
        const rolle = rolleVon(knoten.parentElement, zelle);
        for (const einzeln of knoten.data) {
          aus.push({ zeichen: einzeln, rolle });
        }
      }
      return aus;
    }

    function rolleVon(element, zelle) {
      for (let bei = element; bei && bei !== zelle; bei = bei.parentElement) {
        const name = Object.keys(klassen).find(rolle => bei.classList.contains(klassen[rolle]));
        if (name) {
          return name;
        }
      }
      return null;
    }
  }, [DIFFZEILE, art, zeile[art], stelle, vorkommen, KLASSE_JE_ROLLE]);
}

async function pruefeRolle(page, zeile, stelle, rolle, vorkommen = 1) {
  const rollen = await rollenDerStelle(page, zeile, stelle, vorkommen);
  expect(rollen, `Rolle von „${stelle}“ in ${JSON.stringify(zeile)}`).toEqual(Array.from(stelle, () => rolle));
}

/** Keine Textstelle im Diff-Bereich trägt eine Rolle, und keine Klasse `tk-…` steht im Bereich. */
async function pruefeUngefaerbt(page) {
  const gefaerbt = await page.locator(`${ROLLBEREICH} [class*="tk-"]`).count();
  expect(gefaerbt, 'Elemente mit Rolle').toBe(0);
  await expect(page.locator(ROLLBEREICH)).toHaveAttribute('data-farbe', 'nein');
}

/** Ein Kopf, Vorzeichen und Nummern tragen keine Rolle; Klassen in der Textzelle stammen nur aus den sieben Rollen, Lesetext und Marken. */
async function pruefeRollenNurImText(page) {
  const fremd = await page.evaluate(([selektor, erlaubt]) => {
    const funde = [];
    for (const element of document.querySelectorAll(`${selektor} [class]`)) {
      const inTextzelle = element.closest('td.c') !== null && !element.matches('td');
      const klassen = Array.from(element.classList);
      const istRolle = klassen.some(klasse => klasse.startsWith('tk-') || klasse === 'token');
      const erlaubteKlasse = klassen.every(klasse => erlaubt.includes(klasse) || ['vh', 'mk-z', 'mk-bidi', 'mk-steuer'].includes(klasse));
      if ((istRolle && !inTextzelle) || (inTextzelle && !erlaubteKlasse)) {
        funde.push(element.outerHTML.slice(0, 80));
      }
    }
    const kopfMitRolle = Array.from(document.querySelectorAll(`${selektor}[data-art="kopf"] [class*="tk-"]`)).length;
    return { funde, kopfMitRolle };
  }, [DIFFZEILE.replace(' tr[data-art]', ''), Object.values(KLASSE_JE_ROLLE)]);
  expect(fremd).toEqual({ funde: [], kopfMitRolle: 0 });
}

async function pruefeKeineMeldung(page) {
  await expect(page.locator(MELDUNG)).toHaveText('');
}

/** Zeilen (Art, Nummern, Text) jetzt — gleich denen unmittelbar nach dem Zeichnen, vor der Farbe. */
async function pruefeTextWieVorDerFarbe(page) {
  const { vorher, nachher } = await page.evaluate(selektor => ({
    vorher: window.farbMitschrift.zeilenVorDerFarbe,
    nachher: Array.from(document.querySelectorAll(selektor), zeile => ({
      art: zeile.dataset.art, alt: zeile.dataset.alt, neu: zeile.dataset.neu, text: zeile.lastElementChild.textContent,
    })),
  }), DIFFZEILE);
  expect(vorher, 'Zeilen beim Zeichnen mitgeschrieben').not.toBeNull();
  expect(nachher).toEqual(vorher);
  return nachher;
}

async function zeilentexte(page) {
  return page.locator(DIFFZEILE).evaluateAll(zeilen => zeilen.map(zeile => zeile.lastElementChild.textContent));
}

async function pruefeZeilenanzahl(page, anzahl) {
  await expect(page.locator(DIFFZEILE)).toHaveCount(anzahl);
}

/** Leert die Mitschrift der Farbzustände (vor einer Aktion, deren Färbung gezählt wird). */
async function farbzustaendeLeeren(page) {
  await page.evaluate(() => { window.farbMitschrift.farbzustaende = []; });
}

async function pruefeFarbeLiefNeu(page) {
  const zustaende = await page.evaluate(() => window.farbMitschrift.farbzustaende);
  expect(zustaende, 'Färbung lief seit dem Leeren').toContain('laeuft');
  expect(zustaende.at(-1)).toBe('ja');
}

/** Keine Aufgabe des Hauptfadens über 150 ms, seit der Text zuletzt stand. */
async function pruefeKeineLangeAufgabeSeitText(page) {
  const lange = await page.evaluate(grenzeMs => {
    const mitschrift = window.farbMitschrift;
    return mitschrift.langeAufgaben.filter(aufgabe => aufgabe.startMs + aufgabe.dauerMs >= mitschrift.textStehtUm && aufgabe.dauerMs > grenzeMs);
  }, LANGE_AUFGABE_MS);
  expect(lange).toEqual([]);
}

/** Farben der Rollen in einer Zeile je Art, in sRGB über eine Leinwand gerechnet, dazu der sichtbare Hintergrund der Textzelle (der erste
    nicht durchsichtige von ihr aufwärts) und die Schriftlage. */
async function rollenfarbenMessen(page) {
  return page.evaluate(([selektor, klassen]) => {
    const leinwand = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const srgb = farbe => {
      leinwand.clearRect(0, 0, 1, 1);
      leinwand.fillStyle = '#000';
      leinwand.fillStyle = farbe;
      leinwand.fillRect(0, 0, 1, 1);
      return Array.from(leinwand.getImageData(0, 0, 1, 1).data);
    };
    const ohneAlpha = rgba => rgba.slice(0, 3);
    const sichtbarerHintergrund = element => {
      for (let bei = element; bei; bei = bei.parentElement) {
        const farbe = srgb(getComputedStyle(bei).backgroundColor);
        if (farbe[3] === 255) {
          return ohneAlpha(farbe);
        }
      }
      return [255, 255, 255];
    };
    const messung = {};
    for (const art of ['kontext', 'minus', 'plus']) {
      const zelle = document.querySelector(`${selektor}[data-art="${art}"] td.c`);
      const rollen = {};
      for (const [rolle, klasse] of Object.entries(klassen)) {
        const element = zelle.querySelector(`.${klasse}`);
        rollen[rolle] = { farbe: ohneAlpha(srgb(getComputedStyle(element).color)), kursiv: getComputedStyle(element).fontStyle === 'italic' };
      }
      messung[art] = { hintergrund: sichtbarerHintergrund(zelle), text: ohneAlpha(srgb(getComputedStyle(zelle).color)), rollen };
    }
    return messung;
  }, [DIFFZEILE, KLASSE_JE_ROLLE]);
}

function kontrast(farbe, hintergrund) {
  const leuchtdichte = rgb => {
    const [r, g, b] = rgb.map(wert => {
      const anteil = wert / 255;
      if (anteil <= 0.04045) {
        return anteil / 12.92;
      }
      return ((anteil + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hell, dunkel] = [leuchtdichte(farbe), leuchtdichte(hintergrund)].sort((a, b) => b - a);
  return (hell + 0.05) / (dunkel + 0.05);
}

/** Paarweise verschiedene Farben, verschieden von der Textfarbe, Kontrast ≥ 4,5 : 1, nur der Kommentar kursiv; liefert die 21 Kontrastwerte. */
function pruefeRollenfarben(messung) {
  const werte = [];
  for (const [art, { hintergrund, text, rollen }] of Object.entries(messung)) {
    const farben = Object.values(rollen).map(eintrag => eintrag.farbe.join(','));
    expect(new Set(farben).size, `${art}: sieben verschiedene Farben ${farben}`).toBe(7);
    expect(farben, `${art}: keine Rolle in Textfarbe`).not.toContain(text.join(','));
    for (const [rolle, { farbe, kursiv }] of Object.entries(rollen)) {
      const wert = kontrast(farbe, hintergrund);
      werte.push({ art, rolle, kontrast: Math.round(wert * 100) / 100 });
      expect(wert, `${rolle} auf ${art}`).toBeGreaterThanOrEqual(4.5);
      expect(kursiv, `${rolle} kursiv`).toBe(rolle === 'Kommentar');
    }
  }
  return werte;
}

async function farbschemaSetzen(page, schema) {
  await page.emulateMedia({ colorScheme: schema });
}

/** Ausfall (a): die Prism-Datei antwortet 404 — für die Seite und ihre Worker. */
async function prismNichtAbrufbar(page) {
  await page.context().route(url => url.pathname.endsWith('/vendor/prism.js'), route => route.fulfill({ status: 404, body: '' }));
}

/** Ausfall (c): Prism lädt, aber jede Färbung endet mit einer Ausnahme. */
async function prismWirft(page) {
  const ersatz = 'self.Prism = { languages: { javascript: {} }, tokenize: function () { throw new Error("Ausfall"); } };';
  await page.context().route(url => url.pathname.endsWith('/vendor/prism.js'), route => route.fulfill({ status: 200, contentType: 'text/javascript', body: ersatz }));
}

/** Ausfall (b): der Browser kennt keine Worker (vor dem Laden der Seite). */
async function ohneWorker(page) {
  await page.addInitScript(() => { delete window.Worker; });
}

async function pruefeOhneWorker(page) {
  expect(await page.evaluate(() => typeof Worker)).toBe('undefined');
}

async function pruefeKeinPrismAufDerSeite(page) {
  expect(await page.evaluate(() => typeof window.Prism)).toBe('undefined');
}

/** Konsole und Seitenfehler: nichts, außer der Ladefehlermeldung des Browsers, wenn `ladefehlerErlaubt`. */
function pruefeKonsoleLeer(meldungen, ladefehlerErlaubt) {
  expect(meldungen.seitenfehler).toEqual([]);
  let konsole = meldungen.konsole;
  if (ladefehlerErlaubt) {
    konsole = konsole.filter(text => !/Failed to load resource: the server responded with a status of 404/.test(text));
  }
  expect(konsole).toEqual([]);
}

/** Jede Anfrage der Seite und ihrer Worker ging an den eigenen Host. */
function anfragenMitschreiben(page) {
  const adressen = [];
  page.context().on('request', anfrageDerSeite => adressen.push(anfrageDerSeite.url()));
  return adressen;
}

function pruefeNurEigenerHost(adressen, eigeneAdresse) {
  const eigenerHost = new URL(eigeneAdresse).host;
  expect(adressen.length, 'Anfragen mitgeschrieben').toBeGreaterThan(0);
  expect(adressen.filter(adresse => new URL(adresse).host !== eigenerHost)).toEqual([]);
}

async function pruefeKeinElement(page, namen) {
  for (const name of namen) {
    await expect(page.locator(`#diff ${name}`)).toHaveCount(0);
  }
}

/** Vor dem Laden der Seite: jeder Worker hält seine Antworten auf Aufträge zurück, bis der Test sie einzeln freigibt (verzögerter Worker,
    ohne Zeit); die Nachricht „bereit“ geht durch. Eine Antwort eines inzwischen beendeten Workers wird trotzdem zugestellt. */
async function workerAntwortenZurueckhalten(page) {
  await page.addInitScript(() => {
    const EchterWorker = window.Worker;
    const gehalten = [];
    window.gehalteneFarbantworten = gehalten;
    window.Worker = class ZurueckhaltenderWorker {
      constructor(adresse) {
        this.echt = new EchterWorker(adresse);
        this.echt.onmessage = ereignis => {
          const istBereit = ereignis.data && ereignis.data.bereit === true;
          if (istBereit) {
            this.onmessage(ereignis);
            return;
          }
          gehalten.push(() => this.onmessage(ereignis));
        };
        this.echt.onerror = ereignis => this.onerror(ereignis);
      }

      postMessage(nachricht, uebertragen) {
        this.echt.postMessage(nachricht, uebertragen);
      }

      terminate() {
        this.echt.terminate();
      }
    };
  });
}

async function gehalteneAntwortenAbwarten(page, anzahl) {
  await page.waitForFunction(erwartet => window.gehalteneFarbantworten.length >= erwartet, anzahl, { polling: 'raf', timeout: 15000 });
}

/** Stellt die `nummer`-te zurückgehaltene Antwort (ab 1) zu und wartet zwei Bilder, in denen sie wirken könnte. */
async function antwortFreigeben(page, nummer) {
  await page.evaluate(index => window.gehalteneFarbantworten[index](), nummer - 1);
  await page.evaluate(() => new Promise(fertig => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(fertig)), 0)));
}

async function pruefeFarbeLaeuftOhneRolle(page) {
  await expect(page.locator(ROLLBEREICH)).toHaveAttribute('data-farbe', 'laeuft');
  expect(await page.locator(`${ROLLBEREICH} [class*="tk-"]`).count(), 'Elemente mit Rolle').toBe(0);
}

module.exports = {
  workerAntwortenZurueckhalten, gehalteneAntwortenAbwarten, antwortFreigeben, pruefeFarbeLaeuftOhneRolle,
  mitschriftEinrichten, farbeAbwarten, rollenDerStelle, pruefeRolle, pruefeUngefaerbt, pruefeRollenNurImText, pruefeKeineMeldung, pruefeTextWieVorDerFarbe,
  zeilentexte, pruefeZeilenanzahl, farbzustaendeLeeren, pruefeFarbeLiefNeu, pruefeKeineLangeAufgabeSeitText, rollenfarbenMessen, pruefeRollenfarben,
  farbschemaSetzen, prismNichtAbrufbar, prismWirft, ohneWorker, pruefeOhneWorker, pruefeKeinPrismAufDerSeite, pruefeKonsoleLeer, anfragenMitschreiben,
  pruefeNurEigenerHost, pruefeKeinElement,
};
