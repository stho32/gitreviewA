'use strict';
// Treiber Oberfläche „Dateinamen in schmaler Seitenleiste“ (R00056, B5601): der einzige Ort, der die Selektoren der Dateiliste
// und die Geometrie messung kennt — Pfadbreite gegen 8rem, Zeilenlage jedes Zeichens (Range.getClientRects), Umbruch nur nach
// einem Trenner (`/`, `-`, `_`, `.`) oder im Notfall-Stück, Überlauf (`scrollWidth ≤ clientWidth`) von Liste und Zeile, die
// rechten Kanten der Kinder und die erreichbaren Marken (`.haken-ziel`, `.status`, `.balken`, `.zahlen`).
const { expect } = require('@playwright/test');

const LISTE = '#datei-zeilen';
const ZEILE = '#datei-zeilen>li';
const DATEIZEILE = '#datei-zeilen .datei-zeile';

/** Trenner der Anforderung, nach denen ein Umbruch fallen darf. */
const TRENNER = '/-_.';

/** Die Schriftgröße der Wurzel und 8rem in Pixeln (die Kriterien 1 und 5 lesen den Wert aus der Wurzelschrift). */
function wurzelmasse(page) {
  return page.evaluate(() => {
    const schrift = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const ziel = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kd-ziel')) || 0;
    const zeile = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kd-row')) || 0;
    return { schrift, achtesRem: 8 * schrift, ziel, zeile };
  });
}

/**
 * Eine Messung der ganzen Dateiliste in einem Zug. Je Eintrag der Liste (Datei-, Ordner- und Gruppenzeile) die rechten Kanten
 * der Kinder und der Überlauf; je Dateizeile zusätzlich die Pfadbreite und die Zeilenlage jedes Zeichens samt Umbruchstellen.
 */
function messen(page) {
  return page.evaluate(({ liste, zeile, trenner }) => {
    const listeEl = document.querySelector(liste);
    if (!listeEl) {
      return null;
    }
    const listeStil = getComputedStyle(listeEl);
    const listeRect = listeEl.getBoundingClientRect();
    const randLinks = parseFloat(listeStil.borderLeftWidth || '0');
    const randRechts = parseFloat(listeStil.borderRightWidth || '0');
    const innenLinks = listeRect.left + randLinks;
    const innenRechts = listeRect.right - randRechts;

    const textknoten = element => {
      const knoten = [];
      const lauf = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let naechster = lauf.nextNode();
      while (naechster) {
        knoten.push(naechster);
        naechster = lauf.nextNode();
      }
      return knoten;
    };
    const zeichenstelle = (knoten, index) => {
      let rest = index;
      for (const knoten1 of knoten) {
        if (rest < knoten1.length) {
          return { knoten: knoten1, versatz: rest };
        }
        rest -= knoten1.length;
      }
      return null;
    };

    const eintraege = [...document.querySelectorAll(zeile)].map(li => {
      const art = li.classList.contains('gruppe-kopf') ? 'gruppe'
        : (li.classList.contains('ordner-zeile') ? 'ordner' : 'datei');
      const liStil = getComputedStyle(li);
      const liRect = li.getBoundingClientRect();
      const kinder = [...li.children].map(kind => {
        const rect = kind.getBoundingClientRect();
        const stil = getComputedStyle(kind);
        return {
          klasse: kind.className,
          links: rect.left,
          rechts: rect.right,
          oben: rect.top,
          unten: rect.bottom,
          breite: rect.width,
          hoehe: rect.height,
          sichtbar: rect.width > 0 && stil.display !== 'none',
        };
      });
      const grund = { art, tiefe: Number(li.dataset.tiefe), liRechts: liRect.right, liLinks: liRect.left, liHoehe: liRect.height, liScrollWidth: li.scrollWidth, liClientWidth: li.clientWidth, kinder };
      if (art === 'gruppe') {
        return grund;
      }
      const pfadEl = li.querySelector('.pfad');
      const text = pfadEl.textContent;
      const pfadRect = pfadEl.getBoundingClientRect();
      const pfadStil = getComputedStyle(pfadEl);
      const knoten = textknoten(pfadEl);
      const oben = [];
      for (let index = 0; index < text.length; index += 1) {
        const stelle = zeichenstelle(knoten, index);
        if (!stelle) {
          oben.push(null);
          continue;
        }
        const range = document.createRange();
        range.setStart(stelle.knoten, stelle.versatz);
        range.setEnd(stelle.knoten, stelle.versatz + 1);
        const rects = range.getClientRects();
        oben.push(rects.length > 0 ? Math.round(rects[0].top) : null);
      }
      const istTrenner = zeichen => trenner.includes(zeichen);
      const stueckBreite = (von, bis) => {
        const probe = document.createElement('span');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.whiteSpace = 'nowrap';
        probe.style.font = pfadStil.font;
        probe.style.letterSpacing = pfadStil.letterSpacing;
        probe.textContent = text.slice(von, bis + 1);
        li.appendChild(probe);
        const breite = probe.getBoundingClientRect().width;
        probe.remove();
        return breite;
      };
      const brueche = [];
      for (let index = 0; index + 1 < text.length; index += 1) {
        if (oben[index] === null || oben[index + 1] === null || oben[index] === oben[index + 1]) {
          continue;
        }
        const amTrenner = istTrenner(text[index]);
        let a = index;
        while (a > 0 && !istTrenner(text[a - 1])) {
          a -= 1;
        }
        let b = index;
        while (b + 1 < text.length && !istTrenner(text[b + 1])) {
          b += 1;
        }
        const breite = stueckBreite(a, b);
        brueche.push({
          index,
          zeichen: text[index],
          naechstes: text[index + 1],
          amTrenner,
          stueck: text.slice(a, b + 1),
          stueckBreite: breite,
          stueckBreiterAlsPfad: breite > pfadRect.width + 0.5,
        });
      }
      return {
        ...grund,
        pfad: text,
        roherPfad: li.dataset.pfad,
        status: (li.querySelector('.status') || {}).textContent || '',
        ariaCurrent: li.getAttribute('aria-current'),
        pfadBreite: pfadRect.width,
        pfadLinks: pfadRect.left,
        pfadOben: pfadRect.top,
        pfadRechts: pfadRect.right,
        pfadHoehe: pfadRect.height,
        oben,
        zeilenAnzahl: new Set(oben.filter(wert => wert !== null)).size,
        brueche,
      };
    });
    return {
      liste: {
        links: listeRect.left,
        rechts: listeRect.right,
        oben: listeRect.top,
        unten: listeRect.bottom,
        clientWidth: listeEl.clientWidth,
        scrollWidth: listeEl.scrollWidth,
        innenLinks,
        innenRechts,
        overflowX: listeStil.overflowX,
      },
      eintraege,
    };
  }, { liste: LISTE, zeile: ZEILE, trenner: TRENNER });
}

/** Liefert die Messung oder lässt den Test scheitern, wenn die Liste fehlt. */
async function messung(page) {
  const ergebnis = await messen(page);
  expect(ergebnis, 'Dateiliste im DOM').not.toBeNull();
  expect(ergebnis.eintraege.length, 'die Liste führt Zeilen').toBeGreaterThan(0);
  return ergebnis;
}

/** Nur die Dateizeilen der Messung. */
function dateizeilen(messwerte) {
  return messwerte.eintraege.filter(eintrag => eintrag.art === 'datei');
}

/** Der Text des Pfadelements, Zeichen für Zeichen (die Umbruchstellen fügen keinen Text hinzu). */
function pfadtexte(page) {
  return page.locator(`${DATEIZEILE} .pfad`).allTextContents();
}

/** Setzt das Kästchen der Dateizeile mit genau diesem Pfad (über `data-pfad`). */
async function kaestchenMitPfadBetaetigen(page, pfad) {
  await page.locator(`${DATEIZEILE}[data-pfad="${pfad}"] input.haken`).click();
}

module.exports = { LISTE, ZEILE, DATEIZEILE, TRENNER, wurzelmasse, messen, messung, dateizeilen, pfadtexte, kaestchenMitPfadBetaetigen };
