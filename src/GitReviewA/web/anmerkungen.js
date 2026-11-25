/* gitreviewA — Anmerkungen (R00010, R00018, R00019, R00031): Klick oder Enter auf eine Diff-Zeile öffnet unter ihr ein Notizfeld, „Speichern“ legt die Anmerkung
   über `POST /api/anmerkungen` an; ein Umschalt-Klick oder ein Ziehen über die Zeilennummern markiert einen Bereich `von..bis` (R00031) und öffnet das Feld unter
   `bis` — die Rechnung dazu steht in `bereich-werte.js`. „Ändern“ im Anmerkungskopf öffnet ein Feld mit dem vorhandenen Text und schickt den neuen an
   `POST /api/anmerkungen/<nummer>`; „Löschen“ entfernt sie über `POST /api/anmerkungen/<nummer>/loeschen`. Nach jedem Zeichnen eines Diffs (`diff-gezeichnet`)
   stehen die Anmerkungen unter ihren Zeilen und die Zeilen der Bereiche sind markiert. Quelle der Wahrheit ist der Server (`GET /api/anmerkungen`).
   Anmerkungstext und Pfade sind fremder Text: nur textContent und Attributwerte. */
(function () {
  'use strict';

  const SPEICHERN_GESCHEITERT = 'Anmerkung konnte nicht gespeichert werden';
  const AENDERN_GESCHEITERT = 'Anmerkung konnte nicht geändert werden';
  const LOESCHEN_GESCHEITERT = 'Anmerkung konnte nicht gelöscht werden';
  const DIFFZEILE = 'tr[data-art]';

  /** `anmerkungen`: Stand des Servers in Anlegereihenfolge; `ladung`: nur die jüngste Liste zählt; `stelle`: die gewählte Stelle
      (Commit, Pfad), die auch ohne gezeichnete Zeilen steht; `gezeichnet`: Detail des letzten `diff-gezeichnet`;
      `fokusZeileElement`: die Diff-Zeile mit dem wandernden tabindex; `aenderungen`: offene Änderungsfelder; `loeschungen`:
      Nummern, deren Löschung gerade läuft (ihr Knopf bleibt auch nach einem Neuzeichnen gesperrt); `dateiFeld`: das offene
      „Datei anmerken“-Feld (ohne Zeile) oder null. */
  const zustand = { anmerkungen: [], ladung: 0, stelle: null, gezeichnet: null, fokusZeileElement: null, aenderungen: [], loeschungen: [], dateiFeld: null, zeilen: [], ankerStelle: null, auswahl: null, neuesFeld: null, ziehen: null, ziehenBehandelt: false, fokussiert: null };

  function init() {
    const wurzelElement = document.getElementById('diff');
    const ansicht = {
      rollElement: wurzelElement.querySelector('.df-sc'),
      dateiBereichElement: wurzelElement.querySelector('.anm-datei-bereich'),
      hinweisElement: wurzelElement.querySelector('.anmerkung-hinweis'),
      dateiKnopfElement: wurzelElement.querySelector('.datei-anmerken'),
      hinweisKnopfElement: wurzelElement.querySelector('.datei-anmerken-hinweis'),
      hinweisKnopfZiel: wurzelElement.querySelector('.anmerkung-hinweis-anmerken'),
      dateiGrundElement: wurzelElement.querySelector('.diff-datei-grund'),
      dateiKnopfZiel: wurzelElement.querySelector('.diff-datei-anmerken'),
    };
    ansicht.rollElement.addEventListener('click', ereignis => waehleZeilePerKlick(ansicht, ereignis));
    ansicht.rollElement.addEventListener('keydown', ereignis => bedieneZeilenPerTastatur(ansicht, ereignis));
    ansicht.rollElement.addEventListener('mousedown', ereignis => beginneZiehen(ansicht, ereignis));
    ansicht.rollElement.addEventListener('mousemove', ereignis => zieheWeiter(ansicht, ereignis));
    document.addEventListener('mouseup', () => beendeZiehen(ansicht));
    // Das zuletzt fokussierte Element: ein offenes Feld, das beim Neuzeichnen aus dem Dokument genommen wird, bekommt den
    // Fokus danach zurück (Lehre #23); hat der Mensch inzwischen woanders hineingeklickt, bleibt der Fokus dort.
    document.addEventListener('focusin', ereignis => { zustand.fokussiert = ereignis.target; });
    ansicht.dateiKnopfElement.addEventListener('click', () => oeffneOderFokussiereDateiFeld(ansicht));
    ansicht.hinweisKnopfElement.addEventListener('click', () => oeffneOderFokussiereDateiFeld(ansicht));
    document.addEventListener('diff-gezeichnet', ereignis => merkeUndZeigeAn(ansicht, ereignis.detail));
    document.addEventListener('diff-geleert', ereignis => leereDiff(ansicht, ereignis.detail));
    document.addEventListener('haken-stand-geladen', () => aktualisiereDateiSperre(ansicht));
    document.addEventListener('modus-gewechselt', () => aktualisiereDateiSperre(ansicht));
    document.addEventListener('datei-gewaehlt', () => zeigeHinweis(ansicht, ''));
    document.addEventListener('commit-gewaehlt', () => zeigeHinweis(ansicht, ''));
    ladeAnmerkungen(ansicht);
  }

  /* ── Stand vom Server und Anzeige am Diff ── */

  /** Lädt den Stand vom Server und zeichnet neu; mit `fokusNummer` nimmt dieser Anmerkungskopf danach den Fokus (er wird beim Zeichnen ersetzt). */
  async function ladeAnmerkungen(ansicht, fokusNummer = null) {
    const ladung = zustand.ladung + 1;
    zustand.ladung = ladung;
    let anmerkungen;
    try {
      anmerkungen = await anmerkungenAbrufen();
    } catch {
      zeigeHinweis(ansicht, 'Anmerkungen konnten nicht geladen werden');
      return;
    }
    if (ladung !== zustand.ladung) {
      return;
    }
    zustand.anmerkungen = anmerkungen;
    zeigeAnmerkungen(ansicht);
    if (fokusNummer !== null) {
      fokussiereKopf(ansicht, fokusNummer);
    }
  }

  async function anmerkungenAbrufen() {
    const antwort = await fetch('api/anmerkungen', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function merkeUndZeigeAn(ansicht, gezeichnet) {
    // Die Stelle, nicht der gezeichnete Inhalt: ein Neuzeichnen desselben Diffs (Leerraum, Färbung, Blockgrenze) leert
    // `gezeichnet` über `diff-geleert` und darf Anker und Auswahl nicht wegnehmen (R00031, Lehre #23).
    const vorher = zustand.stelle;
    const istNeueStelle = !vorher || vorher.commit !== gezeichnet.commit || vorher.pfad !== gezeichnet.pfad;
    zustand.gezeichnet = gezeichnet;
    zustand.stelle = { commit: gezeichnet.commit, pfad: gezeichnet.pfad };
    zustand.fokusZeileElement = null;
    zustand.zeilen = zeilenDerAnsicht(gezeichnet);
    if (istNeueStelle) {
      zustand.ankerStelle = null;
      zustand.auswahl = null;
    }
    zeigeDateiKnopf(ansicht, true);
    zeigeAnmerkungen(ansicht);
  }

  /** `zeigeMeldung` des Diff-Bereichs (kein gezeichneter Diff): die Wahl bleibt, das Ereignis trägt die Stelle. Der Datei-Kopf
      über den Diff-Zeilen und der Knopf „Datei anmerken“ bleiben stehen und bedienbar — auch im Meldungszustand (Befund B1). */
  function leereDiff(ansicht, detail) {
    let stelle = null;
    if (detail && detail.stelle) {
      stelle = detail.stelle;
    }
    zustand.stelle = stelle;
    zustand.gezeichnet = null;
    if (!stelle) {
      zustand.dateiFeld = null;
    }
    zeigeDateiKnopf(ansicht, stelle !== null);
    zeichneDateikopf(ansicht);
  }

  /** Zeichnet die Anmerkungen des gezeigten Diffs neu: die Dateianmerkungen der Stelle (Commit, Datei) über den Zeilen; je Sicht
      (Netto-Diff oder Abschnitt einer Ansicht ohne Kette) die Zeilenanmerkungen unter ihren Zeilen; Anmerkungen an einer Zeile, die keine
      Sicht zeigt — auch die eines anderen Commits derselben Datei — stehen im Hinweis über dem Diff. Offene Notiz- wie Änderungsfelder
      bleiben stehen und behalten ihre Eingabe. Der Datei-Kopf steht auch ohne gezeichnete Zeilen (R00022). */
  function zeigeAnmerkungen(ansicht) {
    const gezeichnet = zustand.gezeichnet;
    const diffIstVerworfen = !gezeichnet || !gezeichnet.ersterBlockElement || !gezeichnet.ersterBlockElement.isConnected;
    if (!diffIstVerworfen) {
      const bereichElement = gezeichnet.bereichElement;
      for (const altesElement of bereichElement.querySelectorAll('tr.anm, .anmerkungen-ausserhalb, .anm-datei')) {
        altesElement.remove();
      }
      const sichten = sichtenDerAnsicht(gezeichnet);
      if (hatAbschnitte(gezeichnet)) {
        for (const sicht of sichten) {
          zeichneDateianmerkungen(ansicht, sicht, gezeichnet.pfad);
        }
      }
      const stand = anmerkungsstandJeSicht(zustand.anmerkungen, gezeichnet.pfad, sichten.map(sicht => ({ commit: sicht.commit, gezeigteNummern: new Set(sicht.zeileNachNummerNeu.keys()) })));
      sichten.forEach((sicht, stelle) => {
        for (const [nummerNeu, anmerkungen] of stand.jeSicht[stelle]) {
          sicht.zeileNachNummerNeu.get(nummerNeu).after(...anmerkungen.map(anmerkung => anmerkungszeileElement(ansicht, anmerkung)));
        }
      });
      const hinweis = hinweisFuerAusserhalb(stand.ausserhalb, sichten);
      if (hinweis) {
        bereichElement.prepend(ausserhalbElement(hinweis));
      }
      haengeAenderungsfelderAn(ansicht);
    }
    haengeNeuesFeldAn(ansicht);
    markiereBereiche(ansicht);
    zeichneDateikopf(ansicht);
  }

  /** Ob die gezeichnete Ansicht Abschnitte je Commit kennt (keine lückenlose Kette); dann trägt jeder Abschnitt seine
      Dateianmerkungen selbst und der Datei-Kopf führt nur das offene Feld. */
  function hatAbschnitte(gezeichnet) {
    return Boolean(gezeichnet && gezeichnet.abschnitte && gezeichnet.abschnitte.length > 0);
  }

  /** Der Datei-Kopf über den Diff-Zeilen: die Dateianmerkungen der gewählten Stelle (Commit, Datei) und das offene
      „Datei anmerken“-Feld. Er steht in seinem eigenen Bereich, den `zeigeMeldung` nicht leert (Befund B1); das offene Feld wird
      bei jedem Neuzeichnen aus dem Zustand wieder angehängt und behält so seine Eingabe (Befund B2). */
  function zeichneDateikopf(ansicht) {
    const bereichElement = ansicht.dateiBereichElement;
    bereichElement.replaceChildren();
    const stelle = zustand.stelle;
    if (!stelle) {
      zustand.dateiFeld = null;
      return;
    }
    let feld = null;
    if (zustand.dateiFeld && zustand.dateiFeld.ziel.commit === stelle.commit && zustand.dateiFeld.ziel.datei === stelle.pfad) {
      feld = zustand.dateiFeld;
    }
    if (zustand.dateiFeld && !feld) {
      zustand.dateiFeld = null;
    }
    let anmerkungen = [];
    if (!hatAbschnitte(zustand.gezeichnet)) {
      anmerkungen = dateianmerkungen(zustand.anmerkungen, stelle.commit, stelle.pfad);
    }
    if (anmerkungen.length === 0 && !feld) {
      return;
    }
    const blockElement = dateianmerkungsblockElement(ansicht, anmerkungen);
    bereichElement.append(blockElement);
    if (feld) {
      blockElement.querySelector('tbody').append(feld.feldzeileElement);
    }
    // Befund B1: im festen Rahmen ist der Bereich ein eigener Rollbereich mit Obergrenze; die jüngste Anmerkung (zuletzt
    // angehängt) bleibt so im Blick, ohne dass der Diff-Rollbereich darunter verdrängt wird.
    if (bereichElement.scrollHeight > bereichElement.clientHeight) {
      bereichElement.scrollTop = bereichElement.scrollHeight;
    }
  }

  /** Die Dateianmerkungen der Stelle (Commit, Datei) über den Diff-Zeilen eines Abschnitts; die lückenlose Kette und die
      Einzelansicht tragen sie im Datei-Kopf. */
  function zeichneDateianmerkungen(ansicht, sicht, pfad) {
    const anmerkungen = dateianmerkungen(zustand.anmerkungen, sicht.commit, pfad);
    if (anmerkungen.length === 0) {
      return;
    }
    const blockElement = dateianmerkungsblockElement(ansicht, anmerkungen);
    const kopfElement = sicht.bereichElement.querySelector(':scope > .diff-abschnitt-kopf');
    if (kopfElement) {
      kopfElement.after(blockElement);
    } else {
      sicht.bereichElement.prepend(blockElement);
    }
  }

  /** Der Block über den Diff-Zeilen: eine eigene Tabelle mit den Anmerkungszeilen (kein `data-art`, keine Zeilennummer, keine
      Farbzellen — die Zeilenzählung und die Farbauflage bleiben unberührt). */
  function dateianmerkungsblockElement(ansicht, anmerkungen) {
    const blockElement = document.createElement('div');
    blockElement.className = 'anm-datei';
    const tabelleElement = document.createElement('table');
    tabelleElement.className = 'dz';
    const rumpfElement = document.createElement('tbody');
    rumpfElement.append(...anmerkungen.map(anmerkung => anmerkungszeileElement(ansicht, anmerkung)));
    tabelleElement.append(rumpfElement);
    blockElement.append(tabelleElement);
    return blockElement;
  }

  /** Die Sichten des gezeigten Diffs: ohne Kette je Abschnitt eine (`gezeichnet.abschnitte`), sonst eine über den ganzen Bereich
      (Netto-Diff und „Einzeln“). Je Sicht die Zeilen mit Nummer neu, an die ihre Anmerkungen kommen, und ihr Bereich. */
  function sichtenDerAnsicht(gezeichnet) {
    const abschnitte = gezeichnet.abschnitte && gezeichnet.abschnitte.length > 0
      ? gezeichnet.abschnitte
      : [{ commit: gezeichnet.commit, bereichElement: gezeichnet.bereichElement }];
    return abschnitte.map(abschnitt => ({ commit: abschnitt.commit, bereichElement: abschnitt.bereichElement, zeileNachNummerNeu: zeilenMitNummerNeu(abschnitt.bereichElement) }));
  }

  /** Hinweis über dem Diff für Anmerkungen an einer Zeile, die keine Sicht zeigt; ein fremder Commit des Diffs nennt seinen Kurz-Hash. */
  function hinweisFuerAusserhalb(ausserhalb, sichten) {
    const gezeigteCommits = new Set(sichten.map(sicht => sicht.commit));
    return hinweisAusserhalbMitCommits(ausserhalb, kurzVon, gezeigteCommits);
  }

  function kurzVon(hash) {
    if (window.gitreviewaCommits && window.gitreviewaCommits.kurzVon) {
      return window.gitreviewaCommits.kurzVon(hash);
    }
    return String(hash).slice(0, 7);
  }

  /** Offene Änderungsfelder unter ihre neu gezeichnete Anmerkungszeile hängen; ein Feld, dessen Anmerkung nicht mehr existiert, fällt samt Zeile weg. Eine
      Anmerkung außerhalb der Ansicht lässt ihr Feld losgelöst (die Eingabe bleibt erhalten), bis die Ansicht sie wieder zeigt. */
  function haengeAenderungsfelderAn(ansicht) {
    const bleibt = feld => zustand.anmerkungen.some(anmerkung => anmerkung.nummer === feld.anmerkung.nummer);
    for (const feld of zustand.aenderungen.filter(feld => !bleibt(feld))) {
      feld.feldzeileElement.remove();
    }
    zustand.aenderungen = zustand.aenderungen.filter(bleibt);
    for (const feld of zustand.aenderungen) {
      const zeileElement = anmerkungszeile(ansicht, feld.anmerkung.nummer);
      if (zeileElement && zeileElement.nextElementSibling !== feld.feldzeileElement) {
        zeileElement.after(feld.feldzeileElement);
      }
    }
  }

  function zeilenMitNummerNeu(bereichElement) {
    const zeileNachNummerNeu = new Map();
    for (const zeileElement of bereichElement.querySelectorAll('tr[data-neu]')) {
      if (zeileElement.dataset.neu !== '') {
        zeileNachNummerNeu.set(Number(zeileElement.dataset.neu), zeileElement);
      }
    }
    return zeileNachNummerNeu;
  }

  /** Keine Diff-Zeile: ohne `data-art`, `data-alt`, `data-neu` und ohne die Zellklassen der Färbung (`.c`, `.n`, `.m`). */
  function anmerkungszeileElement(ansicht, anmerkung) {
    const zeileElement = document.createElement('tr');
    zeileElement.className = 'anm';
    zeileElement.dataset.anmerkung = String(anmerkung.nummer);
    const zelleElement = document.createElement('td');
    zelleElement.colSpan = 4;
    zelleElement.className = 'anm-zelle';
    const textElement = document.createElement('div');
    textElement.className = 'anm-text';
    textElement.textContent = anmerkung.text;
    const stelleElement = document.createElement('div');
    stelleElement.className = 'anm-stelle';
    stelleElement.textContent = stelleDer(anmerkung);
    zelleElement.append(anmerkungskopfElement(ansicht, anmerkung), textElement, stelleElement);
    zeileElement.append(zelleElement);
    return zeileElement;
  }

  /** Der Kopf nennt die stabile Nummer der Anmerkung (nicht ihre Position im Ergebnis) und trägt „Ändern“ und „Löschen“; er nimmt nach Speichern und
      Abbrechen den Fokus wieder auf. Ein Fehler beim Löschen steht als Meldung im Kopf; eine laufende Löschung lässt ihren Knopf gesperrt. */
  function anmerkungskopfElement(ansicht, anmerkung) {
    const kopfElement = document.createElement('div');
    kopfElement.className = 'anm-kopf';
    kopfElement.tabIndex = -1;
    kopfElement.setAttribute('aria-label', `Anmerkung ${anmerkung.nummer}`);
    const nummerElement = document.createElement('span');
    nummerElement.className = 'anm-nummer';
    nummerElement.textContent = `Anmerkung ${anmerkung.nummer}`;
    const meldungElement = document.createElement('span');
    meldungElement.className = 'anm-kopf-fehler';
    meldungElement.setAttribute('role', 'alert');
    const rechtsElement = document.createElement('span');
    rechtsElement.className = 'anm-rechts';
    const loeschenElement = knopfElement('btn', 'Löschen', () => loescheAnmerkung(ansicht, anmerkung));
    loeschenElement.disabled = loeschtGerade(anmerkung.nummer);
    rechtsElement.append(
      knopfElement('btn', 'Ändern', () => oeffneOderFokussiereAenderung(ansicht, anmerkung)),
      loeschenElement,
    );
    kopfElement.append(nummerElement, meldungElement, rechtsElement);
    return kopfElement;
  }

  /** Stelle der Anmerkung wie im Ergebnis: `<Datei>:<von>-<bis>` (R00031), `<Datei>:<Zeile>` oder `<Datei> (ganze Datei)`. */
  function stelleDer(anmerkung) {
    return stelleDesZiels(anmerkung);
  }

  /** Die Stelle eines Ziels wie im Ergebnis und im Feldnamen: Bereich, Zeile oder ganze Datei — die Art kommt aus der einen
      Stelle (`artDerAnmerkung`), nie aus einem eigenen `zeile`-Vergleich. */
  function stelleDesZiels(ziel) {
    const pfad = sichtbarerPfad(ziel.datei);
    switch (artDerAnmerkung(ziel)) {
      case 'bereich':
        return `${pfad}:${ziel.von}-${ziel.bis}`;
      case 'zeile':
        return `${pfad}:${ziel.zeile}`;
      default:
        return `${pfad} (ganze Datei)`;
    }
  }

  /** Der Name des Notizfelds: „Anmerkung zu <Datei>, Zeile <n>“ bzw. „… Zeile <von>–<bis>“ (R00031), ohne Zeile die ganze Datei. */
  function feldnameDesZiels(ziel) {
    const pfad = sichtbarerPfad(ziel.datei);
    switch (artDerAnmerkung(ziel)) {
      case 'bereich':
        return `Anmerkung zu ${pfad}, Zeile ${ziel.von}–${ziel.bis}`;
      case 'zeile':
        return `Anmerkung zu ${pfad}, Zeile ${ziel.zeile}`;
      default:
        return feldnameDerDatei(ziel.datei);
    }
  }

  function ausserhalbElement(hinweis) {
    const hinweisElement = document.createElement('p');
    hinweisElement.className = 'anmerkungen-ausserhalb';
    hinweisElement.setAttribute('role', 'status');
    hinweisElement.textContent = hinweis;
    return hinweisElement;
  }

  /** Unsichtbare und richtungsändernde Zeichen eines Pfads als Marke im Text — dieselbe eine Zeichenliste wie R00011/R00012
      (`sichtbarerName`), nie der rohe Pfad. */
  function sichtbarerPfad(pfad) {
    return window.sichtbarerName ? window.sichtbarerName(pfad) : pfad;
  }

  /** Der Hinweis über dem Diff; der Knopf „Datei anmerken“ am Hinweis erscheint nur beim Hinweis auf eine entfernte Zeile
      (R00022: der zweite Einstieg zum Anmerken der Datei). */
  function zeigeHinweis(ansicht, text) {
    ansicht.hinweisElement.textContent = text;
    ansicht.hinweisKnopfZiel.hidden = text !== ENTFERNT_HINWEIS;
  }

  /* ── Bereich (R00031): gezeichnete Zeilen, Auswahl, Markierung ── */

  /** Die gezeichneten Diff-Zeilen in Reihenfolge: `{art, alt, neu, commit, abschnitt, element}`. Der Abschnittsschlüssel steigt
      an jedem Commit-Abschnitt und an jedem Abschnittskopf (`@@`) — die Bereichsregel vergleicht ihn nur (B3001). Der Commit
      kommt aus dem umgebenden `.diff-abschnitt` („Zusammen“ ohne Kette), sonst aus der Ansicht. */
  function zeilenDerAnsicht(gezeichnet) {
    const zeilen = [];
    let abschnitt = 0;
    let letzterAbschnitt = null;
    for (const element of gezeichnet.bereichElement.querySelectorAll(DIFFZEILE)) {
      const abschnittselement = element.closest('.diff-abschnitt');
      if (abschnittselement !== letzterAbschnitt) {
        abschnitt += 1;
        letzterAbschnitt = abschnittselement;
      }
      const art = element.dataset.art;
      if (art === 'kopf') {
        abschnitt += 1;
      }
      const commit = abschnittselement && abschnittselement.dataset.commit ? abschnittselement.dataset.commit : gezeichnet.commit;
      zeilen.push({ art, alt: nummerOderNull(element.dataset.alt), neu: nummerOderNull(element.dataset.neu), commit, abschnitt, element });
    }
    return zeilen;
  }

  /** Der Index der Zeile in der gezeichneten Folge; -1, wenn sie nicht dazu gehört. */
  function stelleVonElement(zeileElement) {
    return zustand.zeilen.findIndex(zeile => zeile.element === zeileElement);
  }

  /** Die gezeichnete Zeile mit Nummer `neu` in Commit `commit` oder null — der eine Weg von (Nummer, Commit) zur Zeile. Dieselbe
      Nummer neu steht in „Zusammen“ ohne Kette in mehreren Commit-Abschnitten (Befund B1); jede Suche trägt deshalb den Commit. */
  function zeileMitNummer(neu, commit) {
    return zustand.zeilen.find(zeile => zeile.neu === neu && zeile.commit === commit) || null;
  }

  /** Die laufende Auswahl (`{art:'bereich', von, bis, commit}`) oder null; sie ist die Aussage über die markierten Zeilen. */
  function setzeAuswahl(ansicht, gewaehlt) {
    const istBereich = gewaehlt !== null && gewaehlt.art === 'bereich';
    zustand.auswahl = istBereich ? gewaehlt : null;
    markiereBereiche(ansicht);
  }

  /** Markiert die Zeilen der laufenden Auswahl und der gespeicherten Bereichsanmerkungen, je Commit getrennt: eine Anmerkung
      erscheint nie in einem anderen Commit, auch nicht bei denselben Nummern (R00031). Die Markierung ist nicht allein Farbe
      (eigene Klasse mit Balken, `gitreviewa.css`). */
  function markiereBereiche(ansicht) {
    for (const zeile of zustand.zeilen) {
      zeile.element.classList.remove('bereich');
    }
    const gezeichnet = zustand.gezeichnet;
    if (!gezeichnet || zustand.zeilen.length === 0) {
      return;
    }
    const bereiche = [];
    if (zustand.auswahl) {
      bereiche.push({ commit: zustand.auswahl.commit, von: zustand.auswahl.von, bis: zustand.auswahl.bis });
    }
    for (const anmerkung of zustand.anmerkungen) {
      if (anmerkung.datei === gezeichnet.pfad && artDerAnmerkung(anmerkung) === 'bereich') {
        bereiche.push({ commit: anmerkung.commit, von: anmerkung.von, bis: anmerkung.bis });
      }
    }
    if (bereiche.length === 0) {
      return;
    }
    const commits = new Set(bereiche.map(bereich => bereich.commit));
    for (const commit of commits) {
      const zeilenDesCommits = zustand.zeilen.filter(zeile => zeile.commit === commit);
      const stand = bereichsstand(zeilenDesCommits, bereiche.filter(bereich => bereich.commit === commit));
      for (const zeile of zeilenDesCommits) {
        if (stand.has(zeile.neu)) {
          zeile.element.classList.add('bereich');
        }
      }
    }
  }

  /* ── Ziehen über die Zeilennummern (R00031) ── */

  /** Ein Druck auf eine Nummernzelle beginnt ein Ziehen; erst eine Bewegung erweitert (sonst bleibt es der Klick). */
  function beginneZiehen(ansicht, ereignis) {
    if (ereignis.button !== 0) {
      return;
    }
    const zelle = ereignis.target.closest('td');
    const zeileElement = ereignis.target.closest(DIFFZEILE);
    const istNummernzelle = zelle !== null && zelle.classList.contains('n');
    if (!zeileElement || !istNummernzelle) {
      return;
    }
    const stelle = stelleVonElement(zeileElement);
    if (stelle < 0) {
      return;
    }
    ereignis.preventDefault();
    zustand.ziehen = { ankerStelle: stelle, bewegt: false };
  }

  /** Über einer anderen Zeile desselben Abschnitts wächst der Bereich; die Markierung folgt dem Zug. */
  function zieheWeiter(ansicht, ereignis) {
    if (!zustand.ziehen) {
      return;
    }
    const zeileElement = ereignis.target.closest(DIFFZEILE);
    if (!zeileElement) {
      return;
    }
    const zielStelle = stelleVonElement(zeileElement);
    if (zielStelle < 0) {
      return;
    }
    const ziel = zielDerZeile(zeileElement, ereignis.target);
    const gewaehlt = bereichsziel(zustand.zeilen, zustand.ziehen.ankerStelle, zielStelle, false, { ...zustand.zeilen[zielStelle], art: ziel.art, neu: ziel.neu });
    zustand.ziehen.bewegt = true;
    zeigeHinweis(ansicht, gewaehlt.art === 'keines' ? gewaehlt.grund : '');
    setzeAuswahl(ansicht, gewaehlt);
  }

  /** Am Ende des Zugs öffnet das Feld unter `bis`; der Klick danach wird nicht mehr als Zeilenklick gewertet. */
  function beendeZiehen(ansicht) {
    const ziehen = zustand.ziehen;
    if (!ziehen) {
      return;
    }
    zustand.ziehen = null;
    if (!ziehen.bewegt) {
      return;
    }
    zustand.ziehenBehandelt = true;
    if (zustand.auswahl) {
      oeffneBereichsfeld(ansicht, zustand.auswahl);
    }
  }

  /* ── Zeile wählen: Klick und Tastatur ── */

  function waehleZeilePerKlick(ansicht, ereignis) {
    if (zustand.ziehenBehandelt) {
      zustand.ziehenBehandelt = false;
      return;
    }
    const zeileElement = ereignis.target.closest(DIFFZEILE);
    if (!zeileElement) {
      return;
    }
    const textIstAusgewaehlt = window.getSelection().toString() !== '';
    waehleZeile(ansicht, zeileElement, textIstAusgewaehlt, ereignis.target, ereignis.shiftKey);
  }

  /** Ein Klick setzt den Anker und öffnet das Feld für eine Zeile; Umschalt-Klick oder Ziehen erweitert auf den Bereich
      `von..bis` und öffnet das Feld unter `bis` (R00031). Über eine Abschnitts- oder Commit-Grenze entsteht kein Bereich,
      die Oberfläche sagt es; eine entfernte Zeile ist keine Grenze und öffnet nichts. */
  function waehleZeile(ansicht, zeileElement, textIstAusgewaehlt, geklickt, erweitern) {
    zeigeHinweis(ansicht, '');
    const zielStelle = stelleVonElement(zeileElement);
    if (zielStelle < 0) {
      return;
    }
    const ziel = zielDerZeile(zeileElement, geklickt);
    const ankerStelle = erweitern ? zustand.ankerStelle : null;
    const zielZeile = { ...zustand.zeilen[zielStelle], art: ziel.art, neu: ziel.neu };
    const gewaehlt = bereichsziel(zustand.zeilen, ankerStelle, zielStelle, textIstAusgewaehlt, zielZeile);
    if (gewaehlt.art === 'keines') {
      zeigeHinweis(ansicht, gewaehlt.grund);
      return;
    }
    if (gewaehlt.art === 'entfernt') {
      zeigeHinweis(ansicht, gewaehlt.hinweis);
      return;
    }
    zustand.ankerStelle = zielStelle;
    if (gewaehlt.art === 'bereich') {
      setzeAuswahl(ansicht, gewaehlt);
      oeffneBereichsfeld(ansicht, gewaehlt);
      return;
    }
    setzeAuswahl(ansicht, null);
    setzeZeilenfokus(zeileElement, false);
    oeffneOderFokussiereFeld(ansicht, zeileElement, gewaehlt);
  }

  /** Die Zeile, an der eine Anmerkung haftet (R00023): nur in der zweispaltigen Tabelle entscheidet die angeklickte Zelle — die neue
      Seite (Nummer neu) ist annotierbar, die linke Seite einer entfernten Zeile nicht (Hinweis). Einspaltig gilt die Zeile allein,
      denn dort tragen auch die Nummernzellen die Klassen `alt`/`neu`, ohne eine zweite Seite zu meinen. */
  function zielDerZeile(zeileElement, geklickt) {
    const neu = nummerOderNull(zeileElement.dataset.neu);
    const zweispaltig = zeileElement.querySelector('td.c-alt') !== null || zeileElement.querySelector('td.c-neu') !== null;
    if (!zweispaltig) {
      return { art: zeileElement.dataset.art, neu };
    }
    const zelle = geklickt ? geklickt.closest('td') : null;
    if (zelle && (zelle.classList.contains('c-alt') || zelle.classList.contains('alt'))) {
      return { art: zeileElement.dataset.art === 'kontext' ? 'kontext' : 'minus', neu };
    }
    return neu === null ? { art: zeileElement.dataset.art, neu } : { art: 'plus', neu };
  }

  function nummerOderNull(text) {
    if (text === undefined || text === '') {
      return null;
    }
    return Number(text);
  }

  /** Der Diff-Bereich ist ein Tab-Stopp; Pfeil auf/ab wandert durch die Diff-Zeilen, Enter wählt die Zeile. Ein offenes Notiz- oder Änderungsfeld
      (samt seinen Knöpfen) behält seine eigene Tastatur: im Textfeld bewegt die Pfeiltaste den Caret, auf den Knöpfen bleibt der Fokus. */
  function bedieneZeilenPerTastatur(ansicht, ereignis) {
    const istImFeld = ereignis.target.closest('.anm-feld, .anm-aendern') !== null;
    if (istImFeld) {
      return;
    }
    const zeileElement = ereignis.target.closest(DIFFZEILE);
    if (ereignis.key === 'ArrowDown' || ereignis.key === 'ArrowUp') {
      ereignis.preventDefault();
      const naechsteElement = benachbarteDiffzeile(ansicht.rollElement, zeileElement, ereignis.key === 'ArrowDown');
      if (naechsteElement) {
        setzeZeilenfokus(naechsteElement, true);
      }
      return;
    }
    if (ereignis.key === 'Enter' && zeileElement) {
      ereignis.preventDefault();
      waehleZeile(ansicht, zeileElement, false, zeileElement, false);
    }
  }

  /** Die Diff-Zeilen in Dokumentreihenfolge über alle Blöcke; ohne aktuelle Zeile beginnt Pfeil ab bei der ersten. */
  function benachbarteDiffzeile(rollElement, zeileElement, abwaerts) {
    const diffzeilen = rollElement.querySelectorAll(DIFFZEILE);
    if (!zeileElement) {
      return diffzeilen[0] || null;
    }
    const stelle = Array.prototype.indexOf.call(diffzeilen, zeileElement);
    let naechsteStelle = stelle - 1;
    if (abwaerts) {
      naechsteStelle = stelle + 1;
    }
    return diffzeilen[naechsteStelle] || null;
  }

  /** Wandernder tabindex: nur die aktuelle Diff-Zeile ist fokussierbar, Tab führt weiter über den Bereich als einen Stopp. */
  function setzeZeilenfokus(zeileElement, fokussieren) {
    const vorigeElement = zustand.fokusZeileElement;
    if (vorigeElement && vorigeElement !== zeileElement) {
      vorigeElement.removeAttribute('tabindex');
    }
    zeileElement.tabIndex = -1;
    zustand.fokusZeileElement = zeileElement;
    if (fokussieren) {
      zeileElement.focus();
    }
  }

  /* ── Notizfeld: öffnen, speichern, abbrechen ── */

  /** Je Zeile höchstens ein offenes Feld: ein weiterer Klick oder Doppelklick gibt dem offenen Feld den Fokus. */
  function oeffneOderFokussiereFeld(ansicht, zeileElement, gewaehlt) {
    const offenesEingabeElement = offeneEingabeDerZeile(zeileElement);
    if (offenesEingabeElement) {
      offenesEingabeElement.focus();
      return;
    }
    oeffneFeld(ansicht, zeileElement, gewaehlt);
  }

  /** Das Feld eines Bereichs steht unter `bis` (R00031). Ein offenes Zeilenfeld **innerhalb** des Bereichs fällt weg — der Bereich
      tritt an seine Stelle (es entsteht aus dem Ankerklick derselben Geste); ein Feld an einer anderen Zeile bleibt (R00010). */
  function oeffneBereichsfeld(ansicht, gewaehlt) {
    const vorigesFeld = zustand.neuesFeld;
    const liegtImBereich = vorigesFeld !== null && Number.isInteger(vorigesFeld.ziel.zeile)
      && vorigesFeld.ziel.zeile >= gewaehlt.von && vorigesFeld.ziel.zeile <= gewaehlt.bis;
    if (liegtImBereich) {
      vorigesFeld.feldzeileElement.remove();
      zustand.neuesFeld = null;
    }
    const ende = zeileMitNummer(gewaehlt.bis, gewaehlt.commit);
    if (!ende) {
      return;
    }
    setzeZeilenfokus(ende.element, false);
    oeffneOderFokussiereFeld(ansicht, ende.element, gewaehlt);
  }

  /** Die Zeilen unter einer Diff-Zeile bis zur nächsten Diff-Zeile gehören zu ihr: Anmerkungen und höchstens ein Notizfeld. */
  function offeneEingabeDerZeile(zeileElement) {
    let naechsteElement = zeileElement.nextElementSibling;
    while (naechsteElement && !naechsteElement.matches(DIFFZEILE)) {
      if (naechsteElement.matches('tr.anm-feld')) {
        return naechsteElement.querySelector('textarea');
      }
      naechsteElement = naechsteElement.nextElementSibling;
    }
    return null;
  }

  function oeffneFeld(ansicht, zeileElement, gewaehlt) {
    const gezeichnet = zustand.gezeichnet;
    const stelle = { commit: gewaehlt.commit, datei: gezeichnet.pfad };
    const ziel = gewaehlt.art === 'bereich'
      ? { ...stelle, von: gewaehlt.von, bis: gewaehlt.bis }
      : { ...stelle, zeile: gewaehlt.neu };
    const feld = {
      ansicht,
      zeileElement,
      ziel,
      zielZeile: gewaehlt.art === 'bereich' ? gewaehlt.bis : gewaehlt.neu,
      feldname: feldnameDesZiels(ziel),
      zeilenklasse: 'anm-feld',
      vorbelegung: '',
      art: null,
      speichertGerade: false,
    };
    feld.speichern = () => speichere(feld);
    feld.abbrechen = () => schliesseFeld(feld);
    feld.feldzeileElement = notizfeldzeileElement(feld);
    zustand.neuesFeld = feld;
    letzteAnmerkungszeile(zeileElement).after(feld.feldzeileElement);
    feld.eingabeElement.focus();
  }

  /** Das offene Notizfeld übersteht ein Neuzeichnen: es wird aus dem Zustand wieder unter seine Zeile gehängt, Text und Fokus
      bleiben (Lehre #23). Gehört es zu einer anderen Stelle, fällt es weg. */
  function haengeNeuesFeldAn(ansicht) {
    const feld = zustand.neuesFeld;
    const gezeichnet = zustand.gezeichnet;
    if (!feld || !gezeichnet) {
      return;
    }
    const passtZurStelle = feld.ziel.commit === gezeichnet.commit && feld.ziel.datei === gezeichnet.pfad;
    if (!passtZurStelle) {
      zustand.neuesFeld = null;
      return;
    }
    const zeile = zeileMitNummer(feld.zielZeile, feld.ziel.commit);
    if (!zeile) {
      return;
    }
    letzteAnmerkungszeile(zeile.element).after(feld.feldzeileElement);
    if (zustand.fokussiert === feld.eingabeElement) {
      feld.eingabeElement.focus();
    }
  }

  /** Das neue Feld steht unter den Anmerkungen, die die Zeile schon trägt. */
  function letzteAnmerkungszeile(zeileElement) {
    let letzteElement = zeileElement;
    while (letzteElement.nextElementSibling && letzteElement.nextElementSibling.matches('tr.anm')) {
      letzteElement = letzteElement.nextElementSibling;
    }
    return letzteElement;
  }

  /** Zeile eines Notizfelds (Anlegen wie Ändern): Feld, Meldung und Knöpfe; Name, Vorbelegung und Zeilenklasse kommen vom Feld. */
  function notizfeldzeileElement(feld) {
    const zeileElement = document.createElement('tr');
    zeileElement.className = feld.zeilenklasse;
    const zelleElement = document.createElement('td');
    zelleElement.colSpan = 4;
    zelleElement.className = 'anm-zelle';
    feld.eingabeElement = document.createElement('textarea');
    feld.eingabeElement.className = 'inp anm-eingabe';
    feld.eingabeElement.rows = 3;
    feld.eingabeElement.setAttribute('aria-label', feld.feldname);
    feld.eingabeElement.value = feld.vorbelegung;
    feld.eingabeElement.addEventListener('keydown', ereignis => bedieneFeldPerTastatur(feld, ereignis));

    feld.fehlerElement = document.createElement('p');
    feld.fehlerElement.className = 'anm-fehler';
    feld.fehlerElement.setAttribute('role', 'alert');
    feld.speichernElement = knopfElement('btn btn-haupt', 'Speichern', () => feld.speichern());
    const abbrechenElement = knopfElement('btn', 'Abbrechen', () => feld.abbrechen());
    const knoepfeElement = document.createElement('div');
    knoepfeElement.className = 'anm-knoepfe';
    knoepfeElement.append(feld.speichernElement, abbrechenElement);
    zelleElement.append(artgruppeElement(feld), feld.eingabeElement, feld.fehlerElement, knoepfeElement);
    zeileElement.append(zelleElement);
    return zeileElement;
  }

  /* ── Art der Anmerkung im Feld (R00036) ── */

  let artgruppenZaehler = 0;

  /** Die Gruppe „Art“ **vor** dem Textfeld: ohne, Muss, Frage, Idee als Optionsfelder. Tab und Pfeiltasten sind die des Browsers,
      `1`–`3` wählen in der Gruppe (Katalog `tasten-werte.js` für die Zeilenebene). Start ist „ohne“ bzw. die gespeicherte Art. */
  function artgruppeElement(feld) {
    artgruppenZaehler += 1;
    const gruppeElement = document.createElement('div');
    gruppeElement.className = 'anm-art';
    gruppeElement.setAttribute('role', 'radiogroup');
    gruppeElement.setAttribute('aria-label', 'Art');
    const titelElement = document.createElement('span');
    titelElement.className = 'anm-art-titel';
    titelElement.setAttribute('aria-hidden', 'true');
    titelElement.textContent = 'Art';
    gruppeElement.append(titelElement);
    feld.art = artwert(feld.art);
    for (const wahl of ARTEN) {
      const wahlElement = document.createElement('label');
      wahlElement.className = 'anm-art-wahl';
      const eingabeElement = document.createElement('input');
      eingabeElement.type = 'radio';
      eingabeElement.name = `anm-art-${artgruppenZaehler}`;
      eingabeElement.value = wahl.wert === null ? '' : wahl.wert;
      eingabeElement.checked = wahl.wert === feld.art;
      eingabeElement.addEventListener('change', () => { feld.art = wahl.wert; });
      wahlElement.append(eingabeElement, document.createTextNode(wahl.wort));
      gruppeElement.append(wahlElement);
    }
    gruppeElement.addEventListener('keydown', ereignis => bedieneArtgruppePerTastatur(feld, gruppeElement, ereignis));
    feld.artgruppeElement = gruppeElement;
    return gruppeElement;
  }

  /** `1`, `2`, `3` wählen in der Gruppe Muss, Frage, Idee (R00036); mit Strg, Alt oder Meta bleiben die Ziffern beim Browser. */
  function bedieneArtgruppePerTastatur(feld, gruppeElement, ereignis) {
    const stelle = { '1': 1, '2': 2, '3': 3 }[ereignis.key];
    const istModifikator = ereignis.ctrlKey || ereignis.altKey || ereignis.metaKey;
    if (stelle === undefined || istModifikator) {
      return;
    }
    ereignis.preventDefault();
    setzeArt(feld, gruppeElement, ARTEN[stelle].wert);
  }

  function setzeArt(feld, gruppeElement, art) {
    feld.art = artwert(art);
    for (const eingabeElement of gruppeElement.querySelectorAll('input[type="radio"]')) {
      eingabeElement.checked = (eingabeElement.value === '' ? null : eingabeElement.value) === feld.art;
      if (eingabeElement.checked) {
        eingabeElement.focus();
      }
    }
  }

  function knopfElement(klassen, text, beiKlick) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = klassen;
    element.textContent = text;
    element.addEventListener('click', beiKlick);
    return element;
  }

  function bedieneFeldPerTastatur(feld, ereignis) {
    const istSpeichern = ereignis.key === 'Enter' && (ereignis.ctrlKey || ereignis.metaKey);
    if (istSpeichern) {
      ereignis.preventDefault();
      feld.speichern();
      return;
    }
    if (ereignis.key === 'Escape') {
      ereignis.preventDefault();
      feld.abbrechen();
    }
  }

  /** Genau eine Anfrage je Feld zur Zeit: „Speichern“ ist gesperrt, bis die Antwort da ist. Die Anmerkung gehört zu Commit, Datei und Zeile
      des Felds — auch wenn währenddessen eine andere Datei gewählt wurde. */
  async function speichere(feld) {
    if (feld.speichertGerade) {
      return;
    }
    feld.speichertGerade = true;
    feld.speichernElement.disabled = true;
    feld.fehlerElement.textContent = '';
    const text = feld.eingabeElement.value;
    const art = artwert(feld.art);
    const ausgang = await anmerkungAnlegen({ ...feld.ziel, text, art });
    feld.speichertGerade = false;
    feld.speichernElement.disabled = false;
    if (ausgang.meldung) {
      feld.fehlerElement.textContent = ausgang.meldung;
      return;
    }
    zustand.anmerkungen = [...zustand.anmerkungen, { nummer: ausgang.nummer, ...feld.ziel, text, art }];
    schliesseFeld(feld);
    setzeAuswahl(feld.ansicht, null);
    zeigeAnmerkungen(feld.ansicht);
    ladeAnmerkungen(feld.ansicht);
  }

  /** Sendet einen POST mit JSON-Körper. Bei Antwort `{ok: true, inhalt}`; sonst `{ok: false, meldung}`: der Satz des Servers bei 4xx,
      bei 5xx und ohne Antwort `fehlermeldung`. */
  async function sendeAnfrage(pfad, koerper, fehlermeldung) {
    let antwort;
    try {
      antwort = await fetch(pfad, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: koerper,
      });
    } catch {
      return { ok: false, meldung: fehlermeldung };
    }
    const inhalt = await antwort.json().catch(() => ({}));
    if (antwort.ok) {
      return { ok: true, inhalt };
    }
    const istSatzDesServers = antwort.status >= 400 && antwort.status < 500 && typeof inhalt.meldung === 'string' && inhalt.meldung !== '';
    if (istSatzDesServers) {
      return { ok: false, meldung: inhalt.meldung };
    }
    return { ok: false, meldung: fehlermeldung };
  }

  /** `{nummer}` bei Erfolg; sonst `{meldung}`: der Satz des Servers bei 4xx, bei 5xx und ohne Antwort der allgemeine Satz. */
  async function anmerkungAnlegen(anmerkung) {
    const ausgang = await sendeAnfrage('api/anmerkungen', JSON.stringify(anmerkung), SPEICHERN_GESCHEITERT);
    if (!ausgang.ok) {
      return { meldung: ausgang.meldung };
    }
    if (Number.isInteger(ausgang.inhalt.nummer)) {
      return { nummer: ausgang.inhalt.nummer };
    }
    return { meldung: SPEICHERN_GESCHEITERT };
  }

  /** Schließt das Feld; steht die Zeile noch im Dokument, bekommt sie den Fokus zurück. Ein Feld mit `nachSchliessen` räumt selbst auf
      (das Datei-Feld gibt den Fokus an seinen Knopf zurück). */
  function schliesseFeld(feld) {
    feld.feldzeileElement.remove();
    if (zustand.neuesFeld === feld) {
      zustand.neuesFeld = null;
    }
    if (feld.nachSchliessen) {
      feld.nachSchliessen();
      return;
    }
    if (feld.zeileElement.isConnected) {
      setzeZeilenfokus(feld.zeileElement, true);
    }
  }

  /* ── „Datei anmerken“: Feld ohne Zeile über den Diff-Zeilen ── */

  /** „Datei anmerken“: höchstens ein Feld — ein offenes Datei-Feld bekommt den Fokus, sonst öffnet eins über den Diff-Zeilen.
      Es gehört zur gewählten Stelle, die auch im Meldungszustand steht (Befund B1). */
  function oeffneOderFokussiereDateiFeld(ansicht) {
    const stelle = zustand.stelle;
    if (!stelle) {
      return;
    }
    if (zustand.dateiFeld && zustand.dateiFeld.feldzeileElement.isConnected) {
      zustand.dateiFeld.eingabeElement.focus();
      return;
    }
    const feld = {
      ansicht,
      ziel: { commit: stelle.commit, datei: stelle.pfad, zeile: null },
      feldname: feldnameDerDatei(stelle.pfad),
      zeilenklasse: 'anm-feld',
      vorbelegung: '',
      art: null,
      speichertGerade: false,
    };
    feld.speichern = () => speichere(feld);
    feld.abbrechen = () => schliesseFeld(feld);
    feld.nachSchliessen = () => {
      zustand.dateiFeld = null;
      zeichneDateikopf(ansicht);
      ansicht.dateiKnopfElement.focus();
    };
    feld.feldzeileElement = notizfeldzeileElement(feld);
    zustand.dateiFeld = feld;
    zeichneDateikopf(ansicht);
    feld.eingabeElement.focus();
  }

  /** „Datei anmerken“-Knopf im Diff-Kopf nur zeigen, wenn eine Stelle gewählt ist; an einer gesperrten Stelle (R00014) ist er
      nicht bedienbar und nennt den Grund als Text daneben — dieselbe Form wie das Kästchen (PO-Entscheidung zu R00022 Frage 3). */
  function zeigeDateiKnopf(ansicht, sichtbar) {
    ansicht.dateiKnopfZiel.hidden = !sichtbar;
    if (sichtbar) {
      aktualisiereDateiSperre(ansicht);
    }
  }

  /** Sperrgrund der gewählten Stelle aus dem Haken-Stand: leer, solange keine Stelle gewählt oder kein Stand gelesen ist. */
  function sperrgrundDerStelle() {
    const stelle = zustand.stelle;
    if (!stelle) {
      return '';
    }
    if (window.gitreviewaHaken && window.gitreviewaHaken.sperrgrundFuer) {
      return window.gitreviewaHaken.sperrgrundFuer(stelle.commit, stelle.pfad);
    }
    return '';
  }

  function aktualisiereDateiSperre(ansicht) {
    if (ansicht.dateiKnopfZiel.hidden) {
      return;
    }
    const grund = sperrgrundDerStelle();
    const gesperrt = grund !== '';
    ansicht.dateiKnopfElement.disabled = gesperrt;
    ansicht.dateiKnopfElement.setAttribute('aria-disabled', String(gesperrt));
    ansicht.dateiKnopfElement.setAttribute('aria-label', gesperrt ? `Datei anmerken — nicht möglich: ${grund}` : 'Datei anmerken');
    ansicht.dateiGrundElement.textContent = grund;
  }

  /* ── Änderung: Feld unter der Anmerkung, eine Anfrage je Feld ── */

  /** Je Anmerkung höchstens ein Feld: ein zweiter Druck auf „Ändern“ fokussiert das offene, es öffnet kein zweites. Das Feld steht
      unter der Anmerkungszeile, damit der alte Text sichtbar bleibt, bis der neue angenommen ist. */
  function oeffneOderFokussiereAenderung(ansicht, anmerkung) {
    const offenes = zustand.aenderungen.find(feld => feld.anmerkung.nummer === anmerkung.nummer);
    if (offenes) {
      offenes.eingabeElement.focus();
      return;
    }
    const zeileElement = anmerkungszeile(ansicht, anmerkung.nummer);
    if (!zeileElement) {
      return;
    }
    const feld = {
      ansicht,
      anmerkung,
      zeileElement,
      feldname: feldnameDerAnmerkung(anmerkung),
      zeilenklasse: 'anm-aendern',
      vorbelegung: anmerkung.text,
      art: anmerkung.art,
      speichertGerade: false,
    };
    feld.speichern = () => speichereAenderung(feld);
    feld.abbrechen = () => schliesseAenderung(feld);
    feld.feldzeileElement = notizfeldzeileElement(feld);
    zeileElement.after(feld.feldzeileElement);
    zustand.aenderungen.push(feld);
    feld.eingabeElement.focus();
  }

  function anmerkungszeile(ansicht, nummer) {
    return ansicht.rollElement.querySelector(`tr.anm[data-anmerkung="${nummer}"]`);
  }

  /** Name des Änderungsfelds wie beim Anlegen: „Anmerkung zu <Datei>, Zeile <n>“; ohne Zeile „Anmerkung zu <Datei> (ganze Datei)“ (R00022). */
  function feldnameDerAnmerkung(anmerkung) {
    return feldnameDesZiels(anmerkung);
  }

  /** Name des „Datei anmerken“-Felds: dieselbe Stelle wie im Ergebnis (`<Datei> (ganze Datei)`), für Screenreader unterscheidbar. */
  function feldnameDerDatei(pfad) {
    return `Anmerkung zu ${sichtbarerPfad(pfad)} (ganze Datei)`;
  }

  /** Genau eine Anfrage je Feld zur Zeit. Die Antwort ersetzt den Text an ihrer stabilen Nummer — auch wenn währenddessen eine andere
      Datei gewählt wurde; nur gezeichnet wird, was zur Nummer gehört. */
  async function speichereAenderung(feld) {
    if (feld.speichertGerade) {
      return;
    }
    feld.speichertGerade = true;
    feld.speichernElement.disabled = true;
    feld.fehlerElement.textContent = '';
    const art = artwert(feld.art);
    const ausgang = await anmerkungAendern(feld.anmerkung.nummer, feld.eingabeElement.value, art);
    feld.speichertGerade = false;
    feld.speichernElement.disabled = false;
    if (ausgang.meldung) {
      feld.fehlerElement.textContent = ausgang.meldung;
      return;
    }
    entferneAenderung(feld);
    zustand.anmerkungen = mitGeaenderterArt(mitGeaendertemText(zustand.anmerkungen, ausgang.nummer, ausgang.text), ausgang.nummer, art);
    zeigeAnmerkungen(feld.ansicht);
    fokussiereKopf(feld.ansicht, ausgang.nummer);
    ladeAnmerkungen(feld.ansicht, ausgang.nummer);
  }

  /** `{nummer, text}` bei Erfolg; sonst `{meldung}`: der Satz des Servers bei 4xx, bei 5xx und ohne Antwort der allgemeine Satz. */
  async function anmerkungAendern(nummer, text, art) {
    const ausgang = await sendeAnfrage(`api/anmerkungen/${nummer}`, JSON.stringify({ text, art }), AENDERN_GESCHEITERT);
    if (!ausgang.ok) {
      return { meldung: ausgang.meldung };
    }
    const inhalt = ausgang.inhalt;
    const istGeaendert = Number.isInteger(inhalt.nummer) && typeof inhalt.text === 'string';
    if (istGeaendert) {
      return { nummer: inhalt.nummer, text: inhalt.text };
    }
    return { meldung: AENDERN_GESCHEITERT };
  }

  /** Abbrechen lässt die Anmerkung, wie sie war; der Anmerkungskopf nimmt den Fokus wieder auf. */
  function schliesseAenderung(feld) {
    entferneAenderung(feld);
    fokussiereKopf(feld.ansicht, feld.anmerkung.nummer);
  }

  function entferneAenderung(feld) {
    feld.feldzeileElement.remove();
    zustand.aenderungen = zustand.aenderungen.filter(offenes => offenes !== feld);
  }

  function fokussiereKopf(ansicht, nummer) {
    const zeileElement = anmerkungszeile(ansicht, nummer);
    if (!zeileElement) {
      return;
    }
    zeileElement.querySelector('.anm-kopf').focus();
  }

  /* ── Löschen: Knopf am Anmerkungskopf, eine Anfrage je Anmerkung ── */

  /** Genau eine Anfrage je Anmerkung zur Zeit: die laufende Nummer steht in `zustand.loeschungen`, „Löschen“ ist damit auch an einer neu
      gezeichneten Anmerkungszeile gesperrt. Nach Erfolg verschwindet die Anmerkung an ihrer stabilen Nummer; bei einem Fehler steht die
      Meldung am Anmerkungskopf, der Knopf ist wieder frei und die Anmerkung bleibt sichtbar. */
  async function loescheAnmerkung(ansicht, anmerkung) {
    if (loeschtGerade(anmerkung.nummer)) {
      return;
    }
    zustand.loeschungen = [...zustand.loeschungen, anmerkung.nummer];
    setzeLoeschenGesperrt(ansicht, anmerkung.nummer, true);
    setzeKopfmeldung(ansicht, anmerkung.nummer, '');
    const ausgang = await anmerkungLoeschen(anmerkung.nummer);
    zustand.loeschungen = zustand.loeschungen.filter(nummer => nummer !== anmerkung.nummer);
    if (ausgang.meldung) {
      setzeLoeschenGesperrt(ansicht, anmerkung.nummer, false);
      setzeKopfmeldung(ansicht, anmerkung.nummer, ausgang.meldung);
      return;
    }
    zustand.anmerkungen = ohneAnmerkung(zustand.anmerkungen, ausgang.nummer);
    zeigeAnmerkungen(ansicht);
    ladeAnmerkungen(ansicht);
  }

  function loeschtGerade(nummer) {
    return zustand.loeschungen.includes(nummer);
  }

  /** Der „Löschen“-Knopf dieser Nummer, falls die Ansicht sie gerade zeigt. */
  function setzeLoeschenGesperrt(ansicht, nummer, gesperrt) {
    const loeschenElement = kopfknopf(ansicht, nummer, 'Löschen');
    if (loeschenElement) {
      loeschenElement.disabled = gesperrt;
    }
  }

  /** `{nummer}` bei Erfolg; sonst `{meldung}`: der Satz des Servers bei 4xx, bei 5xx und ohne Antwort der allgemeine Satz. */
  async function anmerkungLoeschen(nummer) {
    const ausgang = await sendeAnfrage(`api/anmerkungen/${nummer}/loeschen`, '{}', LOESCHEN_GESCHEITERT);
    if (!ausgang.ok) {
      return { meldung: ausgang.meldung };
    }
    if (Number.isInteger(ausgang.inhalt.nummer)) {
      return { nummer: ausgang.inhalt.nummer };
    }
    return { meldung: LOESCHEN_GESCHEITERT };
  }

  function kopfknopf(ansicht, nummer, name) {
    const zeileElement = anmerkungszeile(ansicht, nummer);
    if (!zeileElement) {
      return null;
    }
    const knoepfe = [...zeileElement.querySelectorAll('.anm-kopf button')];
    return knoepfe.find(knopf => knopf.textContent === name) || null;
  }

  function setzeKopfmeldung(ansicht, nummer, text) {
    const zeileElement = anmerkungszeile(ansicht, nummer);
    if (!zeileElement) {
      return;
    }
    zeileElement.querySelector('.anm-kopf-fehler').textContent = text;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
