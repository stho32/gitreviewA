/* gitreviewA — Bildanzeige „vorher/nachher“ (R00024): lädt die Fassungen einer gewählten Datei erst bei ihrer Wahl über
   `GET /api/commits/{hash}/bild` und zeichnet sie als `<img>` mit `src` auf den eigenen Endpunkt — nie `object`, `iframe`
   oder Inline-SVG, nie ein Attribut aus fremdem Inhalt. Bei genügender Breite stehen die Bilder nebeneinander, unter 600 dp
   untereinander (PO 2026-11-25). Der Typ kommt fest vom Server; die Datei ist hier nur der Auslöser. Die jüngste Wahl gewinnt:
   eine späte Antwort wird verworfen. */
(function () {
  'use strict';

  const NICHT_LESBAR = 'Bild konnte nicht gelesen werden';
  const ZU_GROSS = 'Bild zu groß';
  const STATUS_ZU_GROSS = 413;

  /**
   * Zeigt die Fassungen oder lässt den Aufrufer den Zustand setzen. `auftrag`: `datei` (commit, pfad, status, alterPfad),
   * `bereichselement`, `istAktuell`, `zeigeMeldung`. Liefert `true`, wenn die Anzeige übernommen wurde (Bilder, „zu groß“,
   * Fehler), sonst `false` (kein Bild — der Aufrufer zeigt „Binärdatei“ bzw. „Keine Zeilenänderungen“).
   */
  async function zeige(auftrag) {
    const seiten = window.gitreviewaBildWerte.seitenFuer(auftrag.datei.status);
    const ergebnisse = await Promise.all(seiten.map(seite => seiteHolen(auftrag.datei, seite)));
    if (!auftrag.istAktuell()) {
      return true;
    }
    const zuGross = ergebnisse.find(ergebnis => ergebnis.status === STATUS_ZU_GROSS);
    if (zuGross) {
      auftrag.zeigeMeldung(zuGross.meldung || ZU_GROSS, false);
      return true;
    }
    const fehler = ergebnisse.find(ergebnis => ergebnis.status !== 200 && ergebnis.status !== 404);
    if (fehler) {
      auftrag.zeigeMeldung(NICHT_LESBAR, true);
      return true;
    }
    const vorhanden = ergebnisse.filter(ergebnis => ergebnis.status === 200);
    if (vorhanden.length === 0) {
      return false;
    }
    zeichne(auftrag, vorhanden);
    return true;
  }

  /** Eine Seite abfragen: 200 mit der Größe, 413 mit der Meldung des Servers, sonst der Status (404 = kein Bild). */
  async function seiteHolen(datei, seite) {
    const antwort = await fetch(adresse(datei, seite), { headers: { Accept: 'image/*' } });
    if (antwort.status === 200) {
      const inhalt = await antwort.blob();
      return { seite, status: 200, groesse: inhalt.size };
    }
    if (antwort.status === STATUS_ZU_GROSS) {
      const koerper = await antwort.json().catch(() => ({}));
      return { seite, status: STATUS_ZU_GROSS, meldung: koerper.meldung };
    }
    return { seite, status: antwort.status };
  }

  function adresse(datei, seite) {
    const abfrage = new URLSearchParams({ pfad: datei.pfad, seite });
    return `api/commits/${encodeURIComponent(datei.commit)}/bild?${abfrage}`;
  }

  function zeichne(auftrag, vorhandene) {
    auftrag.zeigeMeldung('', false);
    const paarElement = document.createElement('div');
    paarElement.className = 'bild-paar';
    const titelElement = document.createElement('p');
    titelElement.className = 'bild-titel';
    titelElement.append(...sichtbareTeile(titel(auftrag.datei)));
    const reiheElement = document.createElement('div');
    reiheElement.className = 'bild-reihe';
    for (const seite of vorhandene) {
      reiheElement.append(seitenElement(auftrag.datei, seite));
    }
    paarElement.append(titelElement, reiheElement);
    auftrag.bereichselement.replaceChildren(paarElement);
    auftrag.bereichselement.hidden = false;
  }

  /** Der neue Pfad führt, der alte steht daneben (bei einer Umbenennung beide Namen, PO 2026-11-25). */
  function titel(datei) {
    const umbenennung = window.umbenennungsText ? window.umbenennungsText(datei) : null;
    return umbenennung || datei.pfad;
  }

  function seitenElement(datei, seite) {
    const figurElement = document.createElement('figure');
    figurElement.className = 'bild-seite';
    const name = window.gitreviewaBildWerte.seitenName(datei, seite.seite);
    const bildElement = document.createElement('img');
    bildElement.setAttribute('src', adresse(datei, seite.seite));
    bildElement.setAttribute('alt', `Bild der Datei ${sichtbarerText(name)} (${window.gitreviewaBildWerte.seitenText(seite.seite)})`);
    const beschriftungElement = document.createElement('figcaption');
    beschriftungElement.textContent = beschriftung(datei, seite);
    figurElement.append(bildElement, beschriftungElement);
    return figurElement;
  }

  function beschriftung(datei, seite) {
    const teile = [window.gitreviewaBildWerte.seitenText(seite.seite)];
    const grund = window.gitreviewaBildWerte.grundFuer(datei, seite.seite);
    if (grund) {
      teile.push(grund);
    }
    teile.push(sichtbarerText(window.gitreviewaBildWerte.seitenName(datei, seite.seite)));
    teile.push(window.gitreviewaBildWerte.groesseText(seite.groesse));
    return teile.join(' · ');
  }

  function sichtbarerText(name) {
    return window.sichtbarerName ? window.sichtbarerName(name) : name;
  }

  function sichtbareTeile(text) {
    const teile = window.sichtbarTeile ? window.sichtbarTeile(text) : [{ text }];
    return teile.map(teil => {
      const knoten = document.createElement('span');
      knoten.textContent = teil.text;
      return knoten;
    });
  }

  window.gitreviewaBild = { zeige };
}());
