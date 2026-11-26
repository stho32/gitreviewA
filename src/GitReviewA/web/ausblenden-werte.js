/* gitreviewA — Werte des Ausblendens (R00025): Glob-Abgleich, Sicht je Liste, Zählertext, Musterprüfung.
   Reine Funktionen, im Browser und in Node. Kein git, kein Server; der Abgleich läuft linear ohne Rückverfolgung. */
(function (ziel) {
  'use strict';

  /** Ein Muster ohne Schrägstrich trifft den Dateinamen jeder Ebene (wie .gitignore); mit Schrägstrich den ganzen Pfad von der Wurzel.
      `*` gilt innerhalb eines Pfadsegments, `**` über Segmente hinweg, `?` ein Zeichen, `[abc]`/`[a-z]` eine Zeichenklasse; Groß und Klein unterschieden.
      Die Angabe `{ ohneGrossKlein: true }` faltet Muster und Pfad vorher je Zeichen mit der einfachen Kleinschreibung der
      Sprache (ohne Locale, R00049): `[A-Z]` und `[a-z]` sind dann gleich, `readme` trifft `README.md`. Ohne die Angabe
      bleibt der Abgleich Zeichen für Zeichen wie bisher (R00025). */
  function passt(muster, pfad, angabe) {
    return abgleichMitZellen(muster, pfad, angabe).passt;
  }

  /** Wie `passt`, meldet aber die durchlaufenen Zellen mit — die Arbeit, die dieser Abgleich wirklich tut, entsteht hier
      und wird nicht in der Buchung abgeschrieben (R00049, Kriterium 11 „Arbeit ≤ Buchung“). */
  function abgleichMitZellen(muster, pfad, angabe) {
    const ohneGrossKlein = Boolean(angabe && angabe.ohneGrossKlein);
    const geprueftesMuster = ohneGrossKlein ? falte(muster) : muster;
    const gepruefterPfad = ohneGrossKlein ? falte(pfad) : pfad;
    const teile = zerteileMuster(geprueftesMuster);
    const text = geprueftesMuster.includes('/') ? gepruefterPfad : letzterAbschnitt(gepruefterPfad);
    const zellen = { anzahl: 0 };
    const gepasst = passtAuf(teile, text, zellen);
    return { passt: gepasst, zellen: zellen.anzahl };
  }

  /** Die einfache Kleinschreibung je Zeichen (Codepunkt), ohne Locale: kein ß- und kein türkisches-i-Sonderfall.
      Die **eine** Faltregel; die Dateisuche (R00049) liest sie von hier, statt sie nachzubauen. */
  function falte(text) {
    return Array.from(text, zeichen => zeichen.toLowerCase()).join('');
  }

  function sichtbareDateien(dateien, muster) {
    return dateien.filter(datei => !ausgeblendet(datei.pfad, muster));
  }

  /** Die Aufwandsangabe eines Abgleichs in Zellen: die Teile des Musters mal (Pfadlänge + 1) — genau die Zahl, die `passtAuf`
      je Teil an Positionen durchläuft. Der Suchlauf (R00049) bucht damit **vor** dem Abgleich und liest nur Gebuchtes. */
  function abgleichKosten(muster, pfadlaenge) {
    return zerteileMuster(muster).length * (pfadlaenge + 1);
  }

  function anzahlAusgeblendet(dateien, muster) {
    return dateien.length - sichtbareDateien(dateien, muster).length;
  }

  /** Prüft ein Muster im Feld nach derselben Regel wie der Aufruf (Länge, Zeichen, Anzahl); `null`, wenn gültig. */
  function musterFehler(text, anzahlBisher) {
    const hoechsteLaenge = 200;
    const hoechstzahl = 20;
    if (anzahlBisher >= hoechstzahl) {
      return `Höchstens ${hoechstzahl} Muster sind erlaubt.`;
    }
    if (traegtUnsichtbares(text)) {
      return 'Ein Muster darf keine Steuer- oder Richtungszeichen enthalten.';
    }
    if (text.length > hoechsteLaenge) {
      return `Ein Muster darf höchstens ${hoechsteLaenge} Zeichen haben.`;
    }
    if (text.trim().length === 0) {
      return 'Ein Muster darf nicht leer sein.';
    }
    return null;
  }

  function ausgeblendet(pfad, muster) {
    for (const einzelnes of muster) {
      if (passt(einzelnes, pfad)) {
        return true;
      }
    }
    return false;
  }

  function letzterAbschnitt(pfad) {
    const schnitt = pfad.lastIndexOf('/');
    if (schnitt < 0) {
      return pfad;
    }
    return pfad.slice(schnitt + 1);
  }

  function traegtUnsichtbares(text) {
    const unsichtbareZeichen = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
    return unsichtbareZeichen.test(text.replace(/\t/g, ''));
  }

  /** Das Muster in Teile: `*` innerhalb eines Segments, `**` über Segmente, zwei Sterne mit Schrägstrich als ganze Segmente, `?`, Zeichenklasse, Literal. */
  function zerteileMuster(muster) {
    const teile = [];
    let stelle = 0;
    while (stelle < muster.length) {
      const zeichen = muster[stelle];
      if (zeichen === '*') {
        const stelleNachSternen = stelleNachSternenlauf(muster, stelle);
        const anzahl = stelleNachSternen - stelle;
        if (anzahl >= 2 && muster[stelleNachSternen] === '/') {
          teile.push({ art: 'pfadstern' });
          stelle = stelleNachSternen + 1;
        } else if (anzahl >= 2) {
          teile.push({ art: 'tiefenstern' });
          stelle = stelleNachSternen;
        } else {
          teile.push({ art: 'segmentstern' });
          stelle = stelleNachSternen;
        }
        continue;
      }
      if (zeichen === '?') {
        teile.push({ art: 'frage' });
        stelle += 1;
        continue;
      }
      if (zeichen === '[') {
        const ende = muster.indexOf(']', stelle + 1);
        if (ende > stelle) {
          teile.push(klassenTeil(muster.slice(stelle + 1, ende)));
          stelle = ende + 1;
          continue;
        }
      }
      teile.push({ art: 'zeichen', wert: zeichen });
      stelle += 1;
    }
    return teile;
  }

  function stelleNachSternenlauf(muster, beginn) {
    let stelle = beginn;
    while (stelle < muster.length && muster[stelle] === '*') {
      stelle += 1;
    }
    return stelle;
  }

  function klassenTeil(inhalt) {
    const enthalten = [];
    const bereiche = [];
    let stelle = 0;
    while (stelle < inhalt.length) {
      const hatBereich = inhalt[stelle + 1] === '-' && stelle + 2 < inhalt.length;
      if (hatBereich) {
        bereiche.push([inhalt.charCodeAt(stelle), inhalt.charCodeAt(stelle + 2)]);
        stelle += 3;
      } else {
        enthalten.push(inhalt.charCodeAt(stelle));
        stelle += 1;
      }
    }
    return { art: 'klasse', enthalten, bereiche };
  }

  /** Ob die Teile den ganzen Text treffen; je Teil eine Zeile über alle Positionen, damit die Auswertung linear bleibt.
      `zellen` zählt die Positionen mit, die dabei durchlaufen werden — eine je Teil und Zeichen des Textes. */
  function passtAuf(teile, text, zellen) {
    let vorher = new Array(text.length + 1).fill(false);
    vorher[0] = true;
    for (const teil of teile) {
      zellen.anzahl += text.length + 1;
      vorher = naechsteZeile(teil, text, vorher);
    }
    return vorher[text.length];
  }

  function naechsteZeile(teil, text, vorher) {
    if (teil.art === 'tiefenstern') {
      return tiefensternZeile(text, vorher);
    }
    if (teil.art === 'segmentstern') {
      return segmentsternZeile(text, vorher);
    }
    if (teil.art === 'pfadstern') {
      return pfadsternZeile(text, vorher);
    }
    return einzelzeichenZeile(teil, text, vorher);
  }

  function tiefensternZeile(text, vorher) {
    const jetzt = new Array(text.length + 1).fill(false);
    jetzt[0] = vorher[0];
    for (let stelle = 1; stelle <= text.length; stelle += 1) {
      jetzt[stelle] = vorher[stelle] || jetzt[stelle - 1];
    }
    return jetzt;
  }

  function segmentsternZeile(text, vorher) {
    const jetzt = new Array(text.length + 1).fill(false);
    jetzt[0] = vorher[0];
    for (let stelle = 1; stelle <= text.length; stelle += 1) {
      jetzt[stelle] = vorher[stelle] || (jetzt[stelle - 1] && text[stelle - 1] !== '/');
    }
    return jetzt;
  }

  /** Zwei Sterne mit Schrägstrich: null oder mehr ganze Segmente, jedes mit seinem Schrägstrich. */
  function pfadsternZeile(text, vorher) {
    const jetzt = new Array(text.length + 1).fill(false);
    const imSegment = new Array(text.length + 1).fill(false);
    jetzt[0] = vorher[0];
    imSegment[0] = jetzt[0];
    for (let stelle = 1; stelle <= text.length; stelle += 1) {
      const schraegstrichVorher = text[stelle - 1] === '/';
      jetzt[stelle] = vorher[stelle] || (schraegstrichVorher && imSegment[stelle - 1]);
      imSegment[stelle] = jetzt[stelle] || (!schraegstrichVorher && imSegment[stelle - 1]);
    }
    return jetzt;
  }

  function einzelzeichenZeile(teil, text, vorher) {
    const jetzt = new Array(text.length + 1).fill(false);
    for (let stelle = 1; stelle <= text.length; stelle += 1) {
      jetzt[stelle] = vorher[stelle - 1] && trifftZeichen(teil, text[stelle - 1]);
    }
    return jetzt;
  }

  function trifftZeichen(teil, zeichen) {
    if (teil.art === 'zeichen') {
      return teil.wert === zeichen;
    }
    if (teil.art === 'frage') {
      return zeichen !== '/';
    }
    if (teil.art === 'klasse') {
      return zeichen !== '/' && klasseEnthaelt(teil, zeichen);
    }
    throw new Error(`Unbekannte Musterart: ${teil.art}`);
  }

  function klasseEnthaelt(teil, zeichen) {
    const code = zeichen.charCodeAt(0);
    if (teil.enthalten.includes(code)) {
      return true;
    }
    return teil.bereiche.some(bereich => code >= bereich[0] && code <= bereich[1]);
  }

  Object.assign(ziel, {
    passt, abgleichMitZellen, falte, sichtbareDateien, anzahlAusgeblendet, musterFehler, abgleichKosten,
  });
})(typeof module !== 'undefined' ? module.exports : window);
