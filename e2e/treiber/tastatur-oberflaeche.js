'use strict';
// Treiber Tastatur (R00030): der einzige Ort, der Selektoren und Tastennamen der Tastenschicht kennt; die Prüfungen der
// Bedienung sitzen hier. Die Seite selbst rechnet im Browser — der Treiber drückt Tasten und liest Fokus, DOM und Stil.
const { expect } = require('@playwright/test');
const diffSeite = require('./diff-oberflaeche.js');

const DIFFZEILE = '#diff .df-sc tr[data-art]';
const DATEIZEILE = '#datei-zeilen .datei-zeile';
const STATUSZEILE = 'footer.statuszeile';
const HILFE = '#hilfe';
const ANSAGE = '#tasten-ansage';

/** Eine Taste ohne Modifikatoren drücken („Kürzel drücken“ der User Story). */
async function taste(page, name) {
  await page.keyboard.press(name);
}

/** Den Diff-Bereich fokussieren — der Weg, den der Mensch per Tab nimmt. */
async function inDenDiffGehen(page) {
  await page.locator('#diff .df-sc').focus();
}

/** Der Fokus als schlichte Angabe: Zeile (Nummer neu), Dateizeile (Pfad), Feld oder Rolle. */
async function fokus(page) {
  return page.evaluate(([diffzeile, dateizeile]) => {
    const aktiv = document.activeElement;
    if (!aktiv || aktiv === document.body) {
      return { art: 'niemand' };
    }
    if (aktiv.matches(diffzeile)) {
      return { art: 'diffzeile', neu: aktiv.dataset.neu, alt: aktiv.dataset.alt, zeilenart: aktiv.dataset.art };
    }
    if (aktiv.matches(dateizeile)) {
      return { art: 'dateizeile', pfad: aktiv.dataset.pfad };
    }
    if (aktiv.matches('input, textarea, select, [contenteditable="true"]')) {
      return { art: 'feld', tag: aktiv.tagName.toLowerCase(), name: aktiv.getAttribute('aria-label') || aktiv.id || '' };
    }
    return { art: 'element', tag: aktiv.tagName.toLowerCase(), klasse: String(aktiv.className), kennung: aktiv.id };
  }, [DIFFZEILE, DATEIZEILE]);
}

async function pruefeFokusDiffzeile(page, neu) {
  await expect.poll(async () => {
    const stand = await fokus(page);
    return stand.art === 'diffzeile' ? stand.neu : null;
  }, { message: `Fokus auf Diff-Zeile ${neu}`, timeout: 5000 }).toBe(String(neu));
}

async function pruefeFokusDateizeile(page, pfad) {
  await expect.poll(async () => {
    const stand = await fokus(page);
    return stand.art === 'dateizeile' ? stand.pfad : null;
  }, { message: `Fokus auf Dateizeile ${pfad}`, timeout: 5000 }).toBe(pfad);
}

async function pruefeFokusFeld(page, name) {
  await expect.poll(async () => {
    const stand = await fokus(page);
    return stand.art === 'feld' ? stand.name : null;
  }, { message: `Fokus im Feld ${name}`, timeout: 5000 }).toBe(name);
}

/** Die gewählte Dateizeile (Wahl der Liste, `aria-current`). */
async function gewaehlteDatei(page) {
  return page.locator(`${DATEIZEILE}[aria-current="true"]`).getAttribute('data-pfad');
}

async function pruefeGewaehlt(page, pfad) {
  await expect.poll(() => gewaehlteDatei(page), { message: `gewählt: ${pfad}`, timeout: 5000 }).toBe(pfad);
}

/** Zustand des Kästchens einer Dateizeile: `true`, `false` oder `gemischt`. */
async function hakenstand(page, pfad) {
  const kaestchen = page.locator(`${DATEIZEILE}[data-pfad="${pfad}"] input.haken`);
  return kaestchen.evaluate(element => (element.indeterminate ? 'gemischt' : String(element.checked)));
}

async function pruefeHaken(page, pfad, erwartet) {
  await expect.poll(() => hakenstand(page, pfad), { message: `Haken ${pfad}: ${erwartet}`, timeout: 5000 }).toBe(erwartet);
}

/** Die Zeile der Statuszeile zu einem Text — oder `null`; liefert ihre Tasten als Text. */
async function statuszeilenTasten(page, text) {
  return page.evaluate(([selektor, gesucht]) => {
    const fuss = document.querySelector(selektor);
    if (!fuss) {
      return null;
    }
    const zeile = [...fuss.querySelectorAll('span')].find(eintrag => eintrag.textContent.includes(gesucht));
    if (!zeile) {
      return null;
    }
    return [...zeile.querySelectorAll('kbd')].map(kbd => kbd.textContent).join(' ');
  }, [STATUSZEILE, text]);
}

async function pruefeStatuszeile(page, text, tasten) {
  await expect.poll(() => statuszeilenTasten(page, text), { message: `Statuszeile ${text}`, timeout: 5000 }).toBe(tasten);
}

/** Alle Texte der Statuszeile in Reihenfolge (für die Modusprüfung). */
async function statuszeileTexte(page) {
  return page.evaluate(selektor => {
    const fuss = document.querySelector(selektor);
    if (!fuss) {
      return null;
    }
    return [...fuss.querySelectorAll('span')].map(zeile => zeile.textContent.trim());
  }, STATUSZEILE);
}

async function pruefeKeinStatuszeilenEintrag(page, text) {
  await expect.poll(async () => {
    const texte = await statuszeileTexte(page);
    return Array.isArray(texte) && texte.some(zeile => zeile.includes(text));
  }, { message: `Statuszeile ohne ${text}`, timeout: 5000 }).toBe(false);
}

/** Die Statuszeile als DOM: Element, Name, Live-Region, Tastenhinweise und ihre Sichtbarkeit für Screenreader. */
async function statuszeileDom(page) {
  return page.evaluate(selektor => {
    const fuss = document.querySelector(selektor);
    if (!fuss) {
      return null;
    }
    return {
      tag: fuss.tagName.toLowerCase(),
      label: fuss.getAttribute('aria-label'),
      live: fuss.getAttribute('aria-live'),
      rolle: fuss.getAttribute('role'),
      tasten: [...fuss.querySelectorAll('kbd')].map(kbd => ({ text: kbd.textContent, verborgen: kbd.getAttribute('aria-hidden') })),
      texte: [...fuss.querySelectorAll('span')].map(zeile => zeile.textContent.trim()),
    };
  }, STATUSZEILE);
}

/** Die Hilfe: offen, ihre Gruppen und Einträge, die Markierung nicht verfügbarer Aktionen. */
async function hilfeOffen(page) {
  return page.locator(HILFE).evaluate(element => !element.hidden);
}

async function pruefeHilfeOffen(page, offen) {
  await expect.poll(() => hilfeOffen(page), { message: `Hilfe ${offen ? 'offen' : 'zu'}`, timeout: 5000 }).toBe(offen);
}

async function hilfeGruppen(page) {
  return page.evaluate(selektor => {
    const dialog = document.querySelector(selektor);
    return [...dialog.querySelectorAll('[data-gruppe]')].map(gruppe => ({
      titel: gruppe.querySelector('h3').textContent,
      eintraege: [...gruppe.querySelectorAll('li')].map(eintrag => ({
        text: eintrag.textContent,
        verfuegbar: eintrag.getAttribute('data-verfuegbar') !== 'false',
      })),
    }));
  }, HILFE);
}

/** Die Hilfe nennt diese Aktion verfügbar (ihr Ziel ist gebaut). */
async function pruefeHilfeVerfuegbar(page, text) {
  const gruppen = await hilfeGruppen(page);
  const eintrag = gruppen.flatMap(gruppe => gruppe.eintraege).find(e => e.text.includes(text));
  expect(eintrag, `Hilfe-Eintrag ${text}`).toBeTruthy();
  expect(eintrag.verfuegbar, `${text} verfügbar`).toBe(true);
}

async function pruefeHilfeNichtVerfuegbar(page, text) {
  const gruppen = await hilfeGruppen(page);
  const eintrag = gruppen.flatMap(gruppe => gruppe.eintraege).find(e => e.text.includes(text));
  expect(eintrag, `Hilfe-Eintrag ${text}`).toBeTruthy();
  expect(eintrag.verfuegbar, `${text} nicht verfügbar`).toBe(false);
}

/** Der Fokus steht auf dem Element, das der Selektor meint. */
async function pruefeFokusAuf(page, selektor) {
  await expect(page.locator(selektor).first()).toBeFocused();
}

/** Steht der Fokus im Hilfe-Dialog? */
async function fokusImDialog(page) {
  return page.evaluate(selektor => {
    const dialog = document.querySelector(selektor);
    return Boolean(dialog && dialog.contains(document.activeElement));
  }, HILFE);
}

/** Ist der Hintergrund der Seite inert (Kopf, Inhalt und Fußzeile)? */
async function hintergrundInert(page) {
  return page.evaluate(() => ['header.kz', 'main.gr-inhalt', 'footer.statuszeile']
    .every(selektor => document.querySelector(selektor).hasAttribute('inert')));
}

/** `aria-keyshortcuts`, der sichtbare Hinweis und der zugängliche Name eines Bedienelements. */
async function hinweis(page, selektor) {
  return page.locator(selektor).first().evaluate(element => {
    const behaelter = element.matches('input') && element.closest('label') ? element.closest('label') : element;
    const kbd = behaelter.querySelector('kbd');
    const kopie = behaelter.cloneNode(true);
    kopie.querySelectorAll('[aria-hidden="true"]').forEach(teil => teil.remove());
    return {
      aria: element.getAttribute('aria-keyshortcuts'),
      kbd: kbd ? kbd.textContent : null,
      kbdVerborgen: kbd ? kbd.getAttribute('aria-hidden') === 'true' : null,
      name: element.getAttribute('aria-label') || kopie.textContent.replace(/\s+/g, ' ').trim(),
    };
  });
}

/** Jeder Katalogeintrag mit vorhandenem Ziel muss seinen Hinweis am Element tragen: `aria-keyshortcuts` und ein verborgenes `<kbd>`. */
async function fehlendeHinweise(page) {
  return page.evaluate(() => {
    const werte = window.gitreviewaTastenWerte;
    const hinweise = werte.hinweise();
    const fehlend = [];
    for (const eintrag of werte.EINTRAEGE) {
      if (!eintrag.ziel) continue;
      const elemente = [...document.querySelectorAll(eintrag.ziel)];
      if (elemente.length === 0) continue;
      const hinweis = hinweise.find(kandidat => kandidat.selektor === eintrag.ziel);
      if (!hinweis) {
        fehlend.push({ ziel: eintrag.ziel, taste: eintrag.taste, grund: 'kein Hinweis im Katalog' });
        continue;
      }
      for (const element of elemente) {
        let behaelter = element;
        const beschriftung = element.closest('label');
        if (element.matches('input') && beschriftung) {
          behaelter = beschriftung;
        }
        const aria = element.getAttribute('aria-keyshortcuts');
        const tasten = [...behaelter.querySelectorAll('kbd')].map(kbd => ({ text: kbd.textContent, verborgen: kbd.getAttribute('aria-hidden') === 'true' }));
        if (aria !== hinweis.aria) {
          fehlend.push({ ziel: eintrag.ziel, taste: eintrag.taste, grund: `aria-keyshortcuts „${aria}“ statt „${hinweis.aria}“` });
        } else if (!tasten.some(kbd => kbd.text === eintrag.anzeige[0] && kbd.verborgen)) {
          fehlend.push({ ziel: eintrag.ziel, taste: eintrag.taste, grund: `kein verborgenes <kbd>${eintrag.anzeige[0]}</kbd>` });
        }
      }
    }
    return fehlend;
  });
}

/** Berechneter Fokusring des Elements mit dem Fokus: Breite, Stil und Kontrast zum Untergrund (≥ 3 : 1, geprüft im Browser). */
async function fokusringAktuell(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    const stil = getComputedStyle(element);
    const breite = parseFloat(stil.outlineWidth) || 0;
    const sichtbar = stil.outlineStyle !== 'none' && breite > 0;
    // Der Ring liegt bei positivem Versatz außerhalb des Elements: sein Untergrund ist der des Elternteils, nicht der eigene
    // (ein angekreuzter Schalter trägt den Akzent als Fläche, der Ring läge sonst auf sich selbst — R00030, R00032).
    const versatz = parseFloat(stil.outlineOffset) || 0;
    let untergrund = null;
    for (let lauf = versatz > 0 ? element.parentElement : element; lauf; lauf = lauf.parentElement) {
      const farbe = getComputedStyle(lauf).backgroundColor;
      if (farbe && farbe !== 'transparent' && !farbe.startsWith('rgba(0, 0, 0, 0)')) {
        untergrund = farbe;
        break;
      }
    }
    const malerei = document.createElement('canvas');
    malerei.width = 1;
    malerei.height = 1;
    const pinsel = malerei.getContext('2d', { willReadFrequently: true });
    const alsRgb = css => {
      pinsel.clearRect(0, 0, 1, 1);
      pinsel.fillStyle = css;
      pinsel.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = pinsel.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const leuchtkraft = ([r, g, b]) => {
      const kanal = wert => {
        const anteil = wert / 255;
        return anteil <= 0.03928 ? anteil / 12.92 : Math.pow((anteil + 0.055) / 1.055, 2.4);
      };
      return (0.2126 * kanal(r)) + (0.7152 * kanal(g)) + (0.0722 * kanal(b));
    };
    const kontrast = (eins, zwei) => {
      const [hell, dunkel] = [leuchtkraft(eins), leuchtkraft(zwei)].sort((a, b) => b - a);
      return (hell + 0.05) / (dunkel + 0.05);
    };
    return {
      breite,
      stil: stil.outlineStyle,
      sichtbar,
      farbe: stil.outlineColor,
      untergrund,
      kontrast: sichtbar ? kontrast(alsRgb(stil.outlineColor), alsRgb(untergrund || 'white')) : 0,
      element: element.tagName.toLowerCase(),
    };
  });
}

/** Fügt ein Bedienelement einer späteren Karte ein (etwa den Schalter „Abgehakte ausblenden“, I0026) und zählt seine Änderungen. */
async function schalterEinbauen(page, kennung) {
  await page.evaluate(id => {
    window.__schalterAenderungen = window.__schalterAenderungen || [];
    const schalter = document.createElement('input');
    schalter.type = 'checkbox';
    schalter.id = id;
    schalter.addEventListener('change', () => window.__schalterAenderungen.push(id));
    document.body.append(schalter);
  }, kennung);
}

async function schalterZustand(page, kennung) {
  return page.evaluate(id => document.getElementById(id).checked, kennung);
}

async function schalterAenderungen(page) {
  return page.evaluate(() => (window.__schalterAenderungen || []).length);
}

/** Der Wert des offenen Notiz-/Änderungsfelds. */
async function feldwert(page) {
  return page.locator('#diff tr.anm-feld textarea, #diff tr.anm-aendern textarea').first().inputValue();
}

/** Fokussiert das offene Notiz-/Änderungsfeld. */
async function fokussiereFeld(page) {
  await page.locator('#diff tr.anm-feld textarea, #diff tr.anm-aendern textarea').first().focus();
}

/** Eine Dateizeile ist (nicht) in der Liste — die Sicht des Ausblendens (R00029). */
async function pruefeZeile(page, pfad, vorhanden) {
  await expect(page.locator(`${DATEIZEILE}[data-pfad="${pfad}"]`)).toHaveCount(vorhanden ? 1 : 0);
}

/** Der Ausblenden-Zähler im Kopf. */
async function pruefeAusblendenZaehler(page, text) {
  await expect(page.locator('#kopf-fortschritt .ausblenden-zaehler')).toHaveText(text);
}

/** Ist keine Dateizeile gewählt? */
async function ohneWahl(page) {
  return page.locator(`${DATEIZEILE}[aria-current="true"]`).count().then(anzahl => anzahl === 0);
}

/** Der Sperrgrund, den die Dateizeile anzeigt. */
async function sperrgrund(page, pfad) {
  return page.locator(`${DATEIZEILE}[data-pfad="${pfad}"] .haken-grund`).textContent();
}

async function pruefeSperrgrund(page, pfad, text) {
  await expect.poll(() => sperrgrund(page, pfad), { message: `Sperrgrund ${pfad}`, timeout: 5000 }).toBe(text);
}

/** Legt ein `contenteditable`-Element in die Seite und gibt ihm den Fokus. */
async function contenteditableFokussieren(page) {
  await page.evaluate(() => {
    const feld = document.createElement('div');
    feld.id = 'probe-contenteditable';
    feld.setAttribute('contenteditable', 'true');
    feld.textContent = 'Text';
    document.getElementById('diff').append(feld);
    feld.focus();
  });
}

/** Fokussiert das Element per Tab und liefert seinen Fokusring (der Weg, den ein Mensch nimmt). */
async function fokusringPerTab(page, selektor) {
  await page.locator('body').click({ position: { x: 4, y: 4 } });
  await page.evaluate(() => document.activeElement.blur());
  for (let schritt = 0; schritt < 80; schritt += 1) {
    await page.keyboard.press('Tab');
    const passt = await page.evaluate(gesucht => Boolean(document.activeElement && document.activeElement.matches(gesucht)), selektor);
    if (passt) {
      return fokusringAktuell(page);
    }
  }
  throw new Error(`Fokus kam per Tab nicht bei ${selektor} an`);
}

/** Der Text der höflichen Live-Region der Kürzel-Aktionen. */
async function ansage(page) {
  return page.locator(ANSAGE).textContent();
}

async function pruefeAnsage(page, text) {
  await expect.poll(() => ansage(page), { message: `Ansage: ${text}`, timeout: 5000 }).toBe(text);
}

async function pruefeAnsageLeer(page) {
  await expect.poll(() => ansage(page), { message: 'keine Ansage', timeout: 5000 }).toBe('');
}

/** Wie viele Diff-Zeilen die Ansicht zeigt und wie viele Abschnittsköpfe sie hat. */
async function diffZeilen(page) {
  return page.evaluate(selektor => {
    const zeilen = [...document.querySelectorAll(selektor)];
    return {
      anzahl: zeilen.length,
      abschnitte: zeilen.filter(zeile => zeile.dataset.art === 'kopf').length,
      ersteZeileNeu: (zeilen.find(zeile => zeile.dataset.art !== 'kopf') || {}).dataset?.neu || null,
    };
  }, DIFFZEILE);
}

/** Wartet, bis der Diff der Datei gezeichnet ist (Pfad im zugänglichen Namen, mindestens eine Zeile; R00039: die Anzeige
    darf gekürzt sein). */
async function aufDiffWarten(page, pfad) {
  await expect(page.locator('#diff .diff-pfad')).toHaveAttribute('aria-label', pfad, { timeout: 5000 });
  await expect(page.locator(DIFFZEILE).first()).toBeVisible({ timeout: 5000 });
}

async function pruefeUmbruch(page, an) {
  await diffSeite.pruefeMenueZustand(page, 'Umbruch', String(an));
}

async function pruefeLeerraum(page, an) {
  await diffSeite.pruefeMenueZustand(page, 'Leerraum ignorieren', String(an));
}

/** Die Anordnung (R00023): `body[data-anordnung]` und der Menüeintrag stimmen überein. */
async function anordnung(page) {
  return page.evaluate(() => ({ anordnung: document.body.dataset.anordnung || null }));
}

async function pruefeAnordnung(page, wert) {
  await expect.poll(() => anordnung(page), { message: `Anordnung ${wert}`, timeout: 5000 }).toEqual({ anordnung: wert });
}

/** Der Fokus steht auf der gewählten Commit-Zeile, nicht im Auswahlfeld (B2: ein `select` sperrt alle Kürzel). */
async function pruefeFokusCommitZeile(page) {
  await expect.poll(() => page.evaluate(() => {
    const aktiv = document.activeElement;
    const zeile = document.querySelector('#commit-liste .commit-zeile[aria-current="true"]');
    return Boolean(aktiv && zeile && zeile.contains(aktiv));
  }), { message: 'Fokus auf der gewählten Commit-Zeile', timeout: 5000 }).toBe(true);
}

/** Die gewählte Diff-Ansicht (`aenderungen` oder `ganz`) aus dem Zustand des Bereichs (R00039: das Menü zeigt ihn). */
async function ansichtWert(page) {
  return page.evaluate(() => (window.gitreviewaDiff ? window.gitreviewaDiff.ansicht() : null));
}

async function pruefeAnsicht(page, wert) {
  await expect.poll(() => ansichtWert(page), { message: `Ansicht ${wert}`, timeout: 5000 }).toBe(wert);
}

/** Der gewählte Commit (Hash) aus der Commit-Leiste. */
async function gewaehlterCommit(page) {
  return page.evaluate(() => {
    const zeile = document.querySelector('#commit-liste .commit-zeile[aria-current="true"]');
    return zeile ? zeile.dataset.hash : null;
  });
}

async function pruefeCommit(page, hash) {
  await expect.poll(() => gewaehlterCommit(page), { message: `Commit ${hash}`, timeout: 5000 }).toBe(hash);
}

async function keineDateiGewaehlt(page) {
  return page.locator(`${DATEIZEILE}[aria-current="true"]`).count().then(anzahl => anzahl === 0);
}

async function beobachteteTasten(page) {
  return page.evaluate(() => window.__tasten || []);
}

/** Die Dateiliste in den Fokus bringen — der Weg per Tab: das erste Kästchen. */
async function inDieDateiliste(page) {
  await page.locator('#datei-zeilen input.haken').first().focus();
}

/** Fokus nirgends (Dokumentkörper) — für Fälle ohne Anmerkungskopf. */
async function fokusAufSeite(page) {
  await page.evaluate(() => document.activeElement.blur());
}

/** Der Fokus steht auf dem `stelle`-ten Aufklapp-Knopf einer Lücke (0-basiert, Schritt-Knopf). */
async function pruefeFokusLuecke(page, stelle) {
  await expect.poll(() => page.evaluate(plaetze => {
    const knoepfe = [...document.querySelectorAll('#diff .df-sc .dz-l-auf:not([data-ganz])')];
    return knoepfe.indexOf(document.activeElement) === plaetze;
  }, stelle), { message: `Fokus auf Lücke ${stelle}`, timeout: 5000 }).toBe(true);
}

/** Die Texte der Anmerkungszeilen unter einer Diff-Zeile (ohne Feldzeilen), in Reihenfolge. */
async function anmerkungstexteUnter(page, ziel) {
  return page.evaluate(([selektor, neu]) => {
    const zeile = [...document.querySelectorAll(selektor)].find(element => element.dataset.art && element.dataset.neu === String(neu));
    const texte = [];
    let naechste = zeile ? zeile.nextElementSibling : null;
    while (naechste && !naechste.hasAttribute('data-art')) {
      if (naechste.classList.contains('anm')) {
        texte.push(naechste.querySelector('.anm-text').textContent);
      }
      naechste = naechste.nextElementSibling;
    }
    return texte;
  }, [DIFFZEILE, ziel.neu]);
}

async function pruefeAnmerkungstexteUnter(page, ziel, texte) {
  await expect.poll(() => anmerkungstexteUnter(page, ziel), { message: `Anmerkungen unter ${JSON.stringify(ziel)}`, timeout: 5000 }).toEqual(texte);
}

/** Zahl der offenen Änderungsfelder. */
async function pruefeAenderungsfelder(page, anzahl) {
  await expect(page.locator('#diff tr.anm-aendern')).toHaveCount(anzahl);
}

/** Das offene Änderungsfeld trägt den vorhandenen Text und hat den Fokus. */
async function pruefeAenderungsfeld(page, text) {
  const feld = page.locator('#diff tr.anm-aendern textarea');
  await expect(feld).toHaveCount(1);
  await expect(feld).toHaveValue(text);
  await expect(feld).toBeFocused();
}

module.exports = {
  taste,
  aufDiffWarten,
  inDenDiffGehen,
  fokus,
  pruefeFokusDiffzeile,
  pruefeFokusDateizeile,
  pruefeFokusFeld,
  gewaehlteDatei,
  pruefeGewaehlt,
  hakenstand,
  pruefeHaken,
  statuszeilenTasten,
  pruefeStatuszeile,
  statuszeileTexte,
  statuszeileDom,
  pruefeKeinStatuszeilenEintrag,
  hilfeOffen,
  pruefeHilfeOffen,
  hilfeGruppen,
  pruefeHilfeVerfuegbar, pruefeHilfeNichtVerfuegbar,
  fokusImDialog,
  hintergrundInert,
  pruefeFokusAuf,
  hinweis,
  fehlendeHinweise,
  fokusringAktuell,
  fokusringPerTab,
  feldwert,
  fokussiereFeld,
  ohneWahl,
  pruefeZeile,
  pruefeAusblendenZaehler,
  pruefeSperrgrund,
  contenteditableFokussieren,
  schalterEinbauen,
  schalterZustand,
  schalterAenderungen,
  ansage,
  pruefeAnsage,
  pruefeAnsageLeer,
  diffZeilen,
  pruefeUmbruch,
  pruefeLeerraum,
  anordnung,
  pruefeAnordnung,
  pruefeFokusCommitZeile,
  pruefeAnsicht,
  pruefeCommit,
  keineDateiGewaehlt,
  beobachteteTasten,
  inDieDateiliste,
  fokusAufSeite,
  pruefeFokusLuecke,
  pruefeAenderungsfeld,
  pruefeAenderungsfelder,
  pruefeAnmerkungstexteUnter,
};