/* gitreviewA — Diff-Bereich: liest den Diff einer Datei erst bei ihrer Wahl (Ereignis `datei-gewaehlt`) und zeigt ihn mit Nummern
   alt und neu, als „nur Änderungen“ oder „ganze Datei“ (Diffansicht); der Wechsel des Commits (`commit-gewaehlt`) hebt die Wahl auf
   und fordert zum Wählen auf. Nach jedem Zeichnen meldet das Ereignis `diff-gezeichnet` Commit, Pfad, Ansicht und Bereich. Jede Zeile
   mit Nummer neu und jeder Abschnittskopf tragen einen Link nach VS Code, der Verweis „In VS Code“ im Kopf zeigt auf die gewählte
   Zeile (R00021); das Ziel kommt als Attribut aus `sprung-geladen`, nie aus fremdem Text. Der Umschalter „Leerraum“ stellt den
   Vergleich um (`-w`), die Lücken von „nur Änderungen“ deckt ein Bedienelement schrittweise oder ganz auf (R00026) — die Zeilen dazu
   kommen aus der Ansicht „ganze Datei“, die je Datei höchstens einmal und erst auf die erste Betätigung gelesen wird.
   Zeilenaufbau nach kanbanD web/diff.js (zeileHtml), aber als DOM-Knoten mit textContent: Diff-Text, Pfade und Hunk-Titel sind fremder Text.
   Syntaxfarben (R00007) kommen als Auflage nach dem Zeichnen: Prism rechnet im Worker (faerben.js) und liefert nur Zahlen. */
(function () {
  'use strict';

  const HINWEIS_ZUR_WAHL = 'Datei wählen, um ihren Diff zu sehen';
  const KEINE_ZEILENAENDERUNGEN = 'Keine Zeilenänderungen';
  const DIFF_NICHT_GELESEN = 'Diff konnte nicht gelesen werden';
  /** Rückfallmeldung, wenn der Server „zu groß“ ohne Meldung schickt (die Lücke bleibt zugeklappt, R00026). */
  const DIFF_ZU_GROSS = 'Diff zu groß';
  /** Antwort 422: der Name meint keine Datei eindeutig oder lässt sich nicht an git geben — der Inhalt bleibt ungelesen, nie „keine Änderungen“. */
  const NAME_NICHT_LESBAR = 'Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)';
  const STATUS_NAME_NICHT_LESBAR = 422;
  const GRUND_TEXT = { nullbytes: 'enthält Null-Bytes', attribut: 'per Attribut als binär markiert' };
  const LESETEXT = { plus: 'hinzugefügt: ', minus: 'entfernt: ' };
  const VORZEICHEN = { plus: '+', minus: '−', kontext: '' };

  /** `datei`: die gewählte Datei, `alsText` ihre Wahl „Als Text zeigen“; `diffansicht`: `aenderungen` oder `ganz`, nur im Speicher der Seite
      (nach Neuladen wieder „nur Änderungen“); `leerraum`: „beachten“ (Start) oder „ignorieren“, ebenfalls nur im Speicher der Seite;
      `zugeklappt`: Zeilen eines langen Textes, die erst „Trotzdem laden“ zeichnet;
      `anzeige`: zählt jeden neuen Inhalt des Bereichs — eine Färbung gilt nur für die Anzeige, für die sie gestellt wurde;
      `sprung`: das Ziel der gewählten Datei aus `sprung-geladen` (null, solange keine Antwort da ist); `gezeichnet`: Commit, Pfad und
      Zeilen der zuletzt gezeichneten Ansicht (samt aufgedeckten Lücken; null ohne Wahl) — daran hängt, ob ein Ziel noch gilt;
      `gewaehlteZeile`: die angeklickte Zeile neu, sonst null. */
  const zustand = { letzteLadung: 0, datei: null, alsText: false, diffansicht: 'aenderungen', leerraum: 'beachten', zugeklappt: null, anzeige: 0, sprung: null, gezeichnet: null, gewaehlteZeile: null, anzeigeDaten: null, ganz: null, gesamt: null, aufgedeckt: {}, lueckenfehler: {}, ganzLaeuft: null };

  function init() {
    const ansicht = ansichtElemente();
    zeigeAufforderungZurWahl(ansicht);
    ansicht.umbruchElement.addEventListener('change', () => schalteUmbruch(ansicht));
    ansicht.leerraumElement.addEventListener('change', () => schalteLeerraum(ansicht));
    for (const diffansichtElement of ansicht.diffansichtElemente) {
      diffansichtElement.checked = diffansichtElement.value === zustand.diffansicht;
      diffansichtElement.addEventListener('change', () => schalteDiffansicht(ansicht, diffansichtElement.value));
    }
    ansicht.alsTextElement.addEventListener('click', () => ladeDiff(ansicht, zustand.datei, true));
    ansicht.trotzdemLadenElement.addEventListener('click', () => klappeAuf(ansicht));
    ansicht.erneutLadenElement.addEventListener('click', () => ladeDiff(ansicht, zustand.datei, zustand.alsText));
    ansicht.rollElement.addEventListener('click', ereignis => waehleZeile(ansicht, ereignis));
    ansicht.rollElement.addEventListener('click', ereignis => klappeLueckeAuf(ansicht, ereignis));
    document.addEventListener('commit-gewaehlt', () => {
      if (!istZusammen()) {
        verwerfeWahl(ansicht);
      }
    });
    document.addEventListener('wahl-aufgehoben', () => verwerfeWahl(ansicht));
    document.addEventListener('datei-gewaehlt', ereignis => ladeDiff(ansicht, ereignis.detail, false));
    document.addEventListener('sprung-geladen', ereignis => uebernehmeSprung(ansicht, ereignis.detail));
  }

  function istZusammen() {
    return window.gitreviewaModus ? window.gitreviewaModus.istZusammen() : false;
  }

  function ansichtElemente() {
    const wurzelElement = document.getElementById('diff');
    const kopfElement = wurzelElement.querySelector('.diff-kopf');
    return {
      wurzelElement,
      umbruchElement: wurzelElement.querySelector('.umbruch-schalter'),
      leerraumElement: wurzelElement.querySelector('.leerraum-schalter'),
      diffansichtElemente: wurzelElement.querySelectorAll('input[name="diffansicht"]'),
      pfadElement: wurzelElement.querySelector('.diff-pfad'),
      herkunftElement: wurzelElement.querySelector('.diff-herkunft'),
      meldungElement: wurzelElement.querySelector('.diff-meldung'),
      alsTextElement: wurzelElement.querySelector('.als-text'),
      trotzdemLadenElement: wurzelElement.querySelector('.trotzdem-laden'),
      sprungVerweisElement: kopfElement.querySelector('.sprung-knopf'),
      sprungGrundElement: kopfElement.querySelector('.sprung-grund'),
      sprungHinweisElement: kopfElement.querySelector('.sprung-hinweis'),
      erneutLadenElement: wurzelElement.querySelector('.erneut-laden'),
      rollElement: wurzelElement.querySelector('.df-sc'),
      farbschlange: farbschlange({ workerAnlegen: faerbeWorkerAnlegen }),
    };
  }

  /** Ohne Worker im Browser wirft der Aufruf; die Schlange lässt die Datei dann still ungefärbt. */
  function faerbeWorkerAnlegen() {
    return new Worker('faerben.js');
  }

  /** Die Wahl liegt am Bereich, nicht am Diff: sie bleibt beim Wechsel von Datei und Commit. */
  function schalteUmbruch(ansicht) {
    ansicht.wurzelElement.classList.toggle('umbr', ansicht.umbruchElement.checked);
  }

  /** Wie Umbruch und Ansicht liegt die Leerraum-Stellung am Bereich: sie gilt für jede weitere Datei und jeden weiteren Commit,
      auch wenn noch keine Datei gewählt ist (R00026). Eine gewählte Datei zeigt danach denselben Diff mit dem anderen Vergleich. */
  function schalteLeerraum(ansicht) {
    zustand.leerraum = ansicht.leerraumElement.checked ? 'ignorieren' : 'beachten';
    if (zustand.datei) {
      ladeDiff(ansicht, zustand.datei, zustand.alsText);
    }
  }

  /** Wie der Umbruch liegt die Diffansicht am Bereich: sie gilt für jede weitere Datei, auch wenn noch keine gewählt ist. */
  function schalteDiffansicht(ansicht, diffansicht) {
    zustand.diffansicht = diffansicht;
    if (!zustand.datei) {
      return;
    }
    ladeDiff(ansicht, zustand.datei, zustand.alsText);
  }

  /** Ein Commit-Wechsel verdrängt auch eine noch laufende Ladung: deren Antwort wird verworfen. */
  function verwerfeWahl(ansicht) {
    zustand.letzteLadung += 1;
    zustand.datei = null;
    zustand.gezeichnet = null;
    zustand.sprung = null;
    zustand.gewaehlteZeile = null;
    zeigeAufforderungZurWahl(ansicht);
  }

  function zeigeAufforderungZurWahl(ansicht) {
    ansicht.pfadElement.textContent = '';
    zustand.gezeichnet = null;
    zeigeMeldung(ansicht, HINWEIS_ZUR_WAHL, false);
  }

  /** Die jüngste Wahl gewinnt: eine Antwort zählt nur, wenn seit ihrer Anfrage keine andere Datei, kein anderer Commit, keine andere
      Diffansicht und keine andere Leerraum-Stellung gewählt wurde. `alsText`: der Mensch hat bei einer Binärdatei „Als Text zeigen“
      gewählt — nur dann liest der Server ihre Bytes. */
  async function ladeDiff(ansicht, datei, alsText) {
    const ladung = zustand.letzteLadung + 1;
    zustand.letzteLadung = ladung;
    zustand.datei = datei;
    zustand.alsText = alsText;
    // Neue Wahl, neue Lücken: der Zustand je Lücke lebt nur für die gezeigte Stelle (R00026).
    zustand.ganz = null;
    zustand.gesamt = null;
    zustand.aufgedeckt = {};
    zustand.lueckenfehler = {};
    zustand.ganzLaeuft = null;
    const vorherGezeichnet = zustand.gezeichnet;
    zustand.gezeichnet = { commit: datei.commit, pfad: datei.pfad, zeilen: [] };
    const istDieselbeStelle = vorherGezeichnet !== null && vorherGezeichnet.commit === datei.commit && vorherGezeichnet.pfad === datei.pfad;
    if (!istDieselbeStelle) {
      zustand.sprung = null;
      zustand.gewaehlteZeile = null;
    }
    const diffansicht = zustand.diffansicht;
    const leerraum = zustand.leerraum;
    ansicht.pfadElement.replaceChildren(...sichtbarTeile(datei.pfad).map(teilKnoten));
    zeigeMeldung(ansicht, 'Diff wird geladen …', false);
    let antwort;
    try {
      antwort = await diffAbrufen(datei, alsText, diffansicht, leerraum);
    } catch (fehler) {
      if (ladung === zustand.letzteLadung) {
        zeigeMeldung(ansicht, fehlertextZu(fehler), true);
      }
      return;
    }
    if (ladung !== zustand.letzteLadung) {
      return;
    }
    zeichneAntwort(ansicht, antwort, alsText, diffansicht);
  }

  /** Die ganze Datei liest der Server nur auf ausdrückliche Wahl der Diffansicht; die Leerraum-Stellung gilt für beide Ansichten.
      „Zusammen“ fragt den Netto-Diff der Auswahl, „Einzeln“ den Diff des gewählten Commits. */
  async function diffAbrufen(datei, alsText, diffansicht, leerraum) {
    const abfrage = new URLSearchParams({ pfad: datei.pfad });
    if (diffansicht === 'ganz') {
      abfrage.set('umfang', 'ganz');
    }
    if (leerraum === 'ignorieren') {
      abfrage.set('leerraum', 'ignorieren');
    }
    let adresse;
    if (datei.modus === 'zusammen') {
      adresse = `api/zusammen/diff?${abfrage}`;
    } else {
      if (alsText) {
        abfrage.set('alsText', 'true');
      }
      adresse = `api/commits/${encodeURIComponent(datei.commit)}/diff?${abfrage}`;
    }
    const antwort = await fetch(adresse, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new AntwortFehler(antwort.status);
    }
    return antwort.json();
  }

  class AntwortFehler extends Error {
    constructor(status) {
      super(`Antwort ${status}`);
      this.status = status;
    }
  }

  function fehlertextZu(fehler) {
    const nameNichtLesbar = fehler instanceof AntwortFehler && fehler.status === STATUS_NAME_NICHT_LESBAR;
    if (nameNichtLesbar) {
      return NAME_NICHT_LESBAR;
    }
    return DIFF_NICHT_GELESEN;
  }

  function zeigeMeldung(ansicht, text, istFehler) {
    zustand.anzeige += 1;
    ansicht.farbschlange.aufraeumen();
    delete ansicht.rollElement.dataset.farbe;
    ansicht.herkunftElement.textContent = '';
    ansicht.meldungElement.textContent = text;
    ansicht.meldungElement.classList.toggle('fehler', istFehler);
    ansicht.rollElement.replaceChildren();
    ansicht.rollElement.hidden = true;
    ansicht.alsTextElement.hidden = true;
    ansicht.trotzdemLadenElement.hidden = true;
    ansicht.erneutLadenElement.hidden = !istFehler;
    zustand.zugeklappt = null;
    if (zustand.gezeichnet) {
      zustand.gezeichnet.zeilen = [];
    }
    aktualisiereSprungkopf(ansicht);
    document.dispatchEvent(new CustomEvent('diff-geleert'));
  }

  function zeichneAntwort(ansicht, antwort, alsText, diffansicht) {
    if (antwort.zuGross) {
      zeigeMeldung(ansicht, antwort.meldung, false);
      return;
    }
    if (zustand.datei && zustand.datei.modus === 'zusammen') {
      zeichneZusammenAntwort(ansicht, antwort, alsText, diffansicht);
      return;
    }
    const binaerOhneWahl = antwort.art === 'binaer' && !alsText;
    if (binaerOhneWahl) {
      zeigeBinaerdatei(ansicht, antwort.grund);
      return;
    }
    const zeilen = zeilenDerDiffansicht(antwort.patch, diffansicht);
    if (zeilen.length === 0) {
      zeigeMeldung(ansicht, KEINE_ZEILENAENDERUNGEN, false);
      return;
    }
    const zuLangGrund = zuLang(zeilen);
    if (zuLangGrund) {
      zeigeZugeklappt(ansicht, antwort, zeilen, zuLangGrund);
      return;
    }
    zeichneAnsicht(ansicht, antwort, zeilen, diffansicht);
  }

  /** „nur Änderungen“ zeigt die Lücken vor dem ersten, zwischen zwei und nach dem letzten Abschnitt (R00026);
      „ganze Datei“ zeigt alles — dort gibt es keine Lücken. */
  function zeichneAnsicht(ansicht, antwort, zeilen, diffansicht) {
    const kenntLuecken = diffansicht !== 'ganz';
    if (!kenntLuecken) {
      zustand.anzeigeDaten = null;
      zeichneZeilen(ansicht, antwort, zeilen);
      return;
    }
    zustand.anzeigeDaten = { antwort, zeilen };
    zeichneZeilen(ansicht, antwort, zeilen, luecken(zeilen, zustand.gesamt));
  }

  /** „Zusammen“: netto ein Diff über die ganze Auswahl; ohne Kette je Commit ein Abschnitt mit eigener Beschriftung.
      Die Herkunft setzt jeder Zweig nach dem Zeichnen, weil `zeigeMeldung` den Kopf bei jedem neuen Inhalt leert. */
  function zeichneZusammenAntwort(ansicht, antwort, alsText, diffansicht) {
    if (antwort.netto) {
      const herkunft = `netto aus ${kurzListe(antwort.commits)}`;
      if (antwort.art === 'binaer' && !alsText) {
        zeigeBinaerdatei(ansicht, antwort.grund);
        ansicht.herkunftElement.textContent = herkunft;
        return;
      }
      const zeilen = zeilenDerDiffansicht(antwort.patch, diffansicht);
      if (zeilen.length === 0) {
        zeigeMeldung(ansicht, KEINE_ZEILENAENDERUNGEN, false);
        ansicht.herkunftElement.textContent = herkunft;
        return;
      }
      const zuLangGrund = zuLang(zeilen);
      if (zuLangGrund) {
        zeigeZugeklappt(ansicht, antwort, zeilen, zuLangGrund);
        ansicht.herkunftElement.textContent = herkunft;
        return;
      }
      zeichneZeilen(ansicht, antwort, zeilen);
      ansicht.herkunftElement.textContent = herkunft;
      return;
    }
    const abschnitte = antwort.abschnitte || [];
    if (abschnitte.length === 0) {
      zeigeMeldung(ansicht, KEINE_ZEILENAENDERUNGEN, false);
      ansicht.herkunftElement.textContent = 'je Commit, nicht netto — Es fehlen Commits der Auswahl';
      return;
    }
    zeichneAbschnitte(ansicht, antwort, abschnitte, alsText, diffansicht);
  }

  function kurzListe(commits) {
    return (commits || []).map(hash => kurzVon(hash)).filter(Boolean).join(', ');
  }

  function kurzVon(hash) {
    if (window.gitreviewaCommits && window.gitreviewaCommits.kurzVon) {
      return window.gitreviewaCommits.kurzVon(hash);
    }
    return String(hash).slice(0, 7);
  }

  function betreffVon(hash) {
    if (window.gitreviewaCommits && window.gitreviewaCommits.betreffVon) {
      return window.gitreviewaCommits.betreffVon(hash);
    }
    return '';
  }

  /** Ohne Kette: ein Abschnitt je Commit, mit Kurz-Hash und Betreff beschriftet; jede Abschnittsfläche meldet sich für Anmerkungen.
      Ein Abschnitt über der Zuklappgrenze bleibt zugeklappt, bis der Mensch „Trotzdem laden“ wählt — dieselbe Regel wie netto (R00017). */
  /** Der Name der Diff-Fläche: der Anzeigename des Pfads, unsichtbare Zeichen als Marke — nie der rohe Pfad (H1, R00014). */
  function bereichsname(antwort) {
    return `Änderungen in ${sichtbarerName(antwort.pfad)}`;
  }

  function sichtbarerName(pfad) {
    return window.sichtbarerName ? window.sichtbarerName(pfad) : pfad;
  }

  function zeichneAbschnitte(ansicht, antwort, abschnitte, alsText, diffansicht) {
    zeigeMeldung(ansicht, '', false);
    ansicht.herkunftElement.textContent = 'je Commit, nicht netto — Es fehlen Commits der Auswahl';
    const sammel = document.createDocumentFragment();
    const bereiche = [];
    for (const abschnitt of abschnitte) {
      const bereichElement = document.createElement('div');
      bereichElement.className = 'diff-abschnitt';
      bereichElement.dataset.commit = abschnitt.commit;
      const kopfElement = document.createElement('p');
      kopfElement.className = 'diff-abschnitt-kopf';
      const betreff = betreffVon(abschnitt.commit);
      kopfElement.textContent = `Commit ${kurzVon(abschnitt.commit)}${betreff ? ` · ${betreff}` : ''}`;
      bereichElement.append(kopfElement);
      if (abschnitt.art === 'binaer' && !alsText) {
        bereichElement.append(abschnittHinweis('Binärdatei'));
      } else {
        const zeilen = zeilenDerDiffansicht(abschnitt.patch, diffansicht);
        if (zeilen.length === 0) {
          bereichElement.append(abschnittHinweis(KEINE_ZEILENAENDERUNGEN));
        } else {
          zeichneAbschnitt(ansicht, antwort, abschnitt, zeilen, bereichElement);
        }
      }
      sammel.append(bereichElement);
      bereiche.push({ commit: abschnitt.commit, betreff: betreff, bereichElement });
    }
    ansicht.rollElement.setAttribute('aria-label', bereichsname(antwort));
    ansicht.rollElement.replaceChildren(sammel);
    ansicht.rollElement.hidden = false;
    faerbeAbschnitte(ansicht, antwort, abschnitte);
    meldeGezeichnet(ansicht, antwort.pfad, bereiche);
  }

  function abschnittHinweis(text) {
    const hinweis = document.createElement('p');
    hinweis.className = 'diff-abschnitt-hinweis';
    hinweis.textContent = text;
    return hinweis;
  }

  /** Über der Grenze: Hinweis mit der Zahl und der Knopf, der die bereits empfangenen Zeilen dieses Abschnitts zeichnet. */
  function zeichneAbschnitt(ansicht, antwort, abschnitt, zeilen, bereichElement) {
    const zuLangGrund = zuLang(zeilen);
    if (!zuLangGrund) {
      zeichneAbschnittszeilen(antwort, zeilen, bereichElement);
      return;
    }
    const hinweis = abschnittHinweis(`Sehr lang: ${zuLangGrund.anzahl.toLocaleString('de-DE')} ${zuLangGrund.einheit} — zugeklappt`);
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'btn trotzdem-laden';
    knopf.textContent = 'Trotzdem laden';
    knopf.addEventListener('click', () => {
      hinweis.remove();
      knopf.remove();
      zeichneAbschnittszeilen(antwort, zeilen, bereichElement);
      faerbeAbschnitt(ansicht, antwort.pfad, abschnitt, bereichElement);
    });
    bereichElement.append(hinweis, knopf);
  }

  function zeichneAbschnittszeilen(antwort, zeilen, bereichElement) {
    for (const block of bloecke(zeilen)) {
      bereichElement.append(blockElement(block, bereichsname(antwort)));
    }
  }

  /** Färbt je Abschnitt die Zeilen der eigenen Tabelle; eine Auflage für die ganze Anzeige. */
  function faerbeAbschnitte(ansicht, antwort, abschnitte) {
    const bereiche = [...ansicht.rollElement.querySelectorAll('.diff-abschnitt')];
    for (let stelle = 0; stelle < bereiche.length; stelle += 1) {
      const abschnitt = abschnitte[stelle];
      if (abschnitt) {
        faerbeAbschnitt(ansicht, antwort.pfad, abschnitt, bereiche[stelle]);
      }
    }
  }

  /** `bereichElement` trägt die gezeichneten Zeilen des Abschnitts — nach dem Aufklappen nur dieser eine. */
  function faerbeAbschnitt(ansicht, pfad, abschnitt, bereichElement) {
    const sprache = spracheZuPfad(pfad);
    if (!sprache) {
      return;
    }
    const zeilen = zeilenDerDiffansicht(abschnitt.patch, zustand.diffansicht);
    if (zeilen.length === 0) {
      return;
    }
    const anzeige = zustand.anzeige;
    const aktuell = () => anzeige === zustand.anzeige;
    const zeilenElemente = bereichElement.querySelectorAll('tr[data-art]');
    const anzeigeElement = { ...ansicht, rollElement: bereichElement, zeilenElemente };
    ansicht.farbschlange.stellen({
      sprache,
      zeilen: zeilen.map(zeile => ({ art: zeile.art, text: zeile.text })),
      aktuell,
      fertig: farbantwort => legeFarbeAuf(anzeigeElement, zeilen, farbantwort, aktuell),
    });
  }

  function zeilenDerDiffansicht(patch, diffansicht) {
    if (diffansicht === 'ganz') {
      return ganzeDateiZeilen(patch);
    }
    return patchZeilen(patch);
  }

  /** Ohne Wahl kein Byte-Inhalt: Hinweis mit Grund und der Schalter, der den Text erst auf Wunsch lädt (Entscheidung des PO).
      „Zusammen“ kennt den Schalter nicht: der Netto-Endpunkt liest keine Bytes. */
  function zeigeBinaerdatei(ansicht, grund) {
    let meldung = 'Binärdatei';
    const grundText = GRUND_TEXT[grund];
    if (grundText) {
      meldung = `Binärdatei — ${grundText}`;
    }
    zeigeMeldung(ansicht, meldung, false);
    const istZusammen = zustand.datei && zustand.datei.modus === 'zusammen';
    ansicht.alsTextElement.hidden = istZusammen;
  }

  /** Über der Grenze bleibt der Text zugeklappt, bis der Mensch „Trotzdem laden“ wählt (B1604): der Hinweis nennt die überschrittene
      Grenze und ihre Zahl, der Knopf zeichnet die bereits empfangenen Zeilen. */
  function zeigeZugeklappt(ansicht, antwort, zeilen, grund) {
    zeigeMeldung(ansicht, `Sehr lang: ${grund.anzahl.toLocaleString('de-DE')} ${grund.einheit} — zugeklappt`, false);
    zustand.zugeklappt = { antwort, zeilen };
    ansicht.trotzdemLadenElement.hidden = false;
  }

  function klappeAuf(ansicht) {
    const zugeklappt = zustand.zugeklappt;
    if (!zugeklappt) {
      return;
    }
    zeichneZeilen(ansicht, zugeklappt.antwort, zugeklappt.zeilen);
  }

  /** `antwort`: Pfad und Patch der gezeigten Ansicht — an ihnen hängen Sprache und Grenze der Färbung. `lueckenliste`: die Lücken der
      Ansicht (R00026) oder null; das Bedienelement einer Lücke ist keine Diff-Zeile, es zählt nicht zu `tr[data-art]` und damit nicht
      zur gezeichneten Folge, die Links und Färbung als einzige Quelle lesen. */
  function zeichneZeilen(ansicht, antwort, zeilen, lueckenliste = null) {
    zeigeMeldung(ansicht, '', false);
    const teile = anzeigeTeile(zeilen, lueckenliste);
    // Die gezeichnete Folge ist die eine Quelle für Links und Färbung: die Diff-Zeilen samt den aufgedeckten Zeilen, in
    // Reihenfolge der DOM-Zeilen (`tr[data-art]`). Ohne sie paaren die beiden indexbasierten Verbraucher Zeile und Nummer
    // falsch, sobald eine Lücke aufgedeckt ist (R00026, Befund B1).
    const gezeichneteZeilen = teile.filter(teil => teil.zeile).map(teil => teil.zeile);
    if (zustand.gezeichnet) {
      zustand.gezeichnet.zeilen = gezeichneteZeilen;
    }
    const name = bereichsname(antwort);
    const sammelElement = document.createDocumentFragment();
    for (const block of blockelemente(teile, name)) {
      sammelElement.append(block);
    }
    ansicht.rollElement.setAttribute('aria-label', name);
    ansicht.rollElement.replaceChildren(sammelElement);
    ansicht.rollElement.hidden = false;
    setzeSprunglinks(ansicht);
    aktualisiereSprungkopf(ansicht);
    faerbeZeilen(ansicht, antwort, gezeichneteZeilen);
    const bereiche = zustand.datei && zustand.datei.modus === 'zusammen'
      ? [{ commit: zustand.datei.commit, betreff: betreffVon(zustand.datei.commit), bereichElement: ansicht.rollElement }]
      : null;
    meldeGezeichnet(ansicht, antwort.pfad, bereiche);
  }

  /** Die Blöcke der Ansicht in Reihenfolge: je Folge zusammenhängender Diff-Zeilen ein Block (höchstens 500 Zeilen), dazwischen
      das Bedienelement der Lücke. `teile`: die Ansicht als Folge `{zeile}` oder `{luecke, rest}`. */
  function blockelemente(teile, name) {
    const bloeckeDerAnsicht = [];
    let segment = [];
    const spueleSegment = () => {
      for (const block of bloecke(segment)) {
        bloeckeDerAnsicht.push(blockElement(block, name));
      }
      segment = [];
    };
    for (const teil of teile) {
      if (teil.luecke) {
        spueleSegment();
        bloeckeDerAnsicht.push(lueckenElement(teil));
        continue;
      }
      segment.push(teil.zeile);
    }
    spueleSegment();
    return bloeckeDerAnsicht;
  }

  /** Die Ansicht als Folge `{zeile}` oder `{luecke, rest}`: an der Stelle einer Lücke steht zuerst ihr Bedienelement (solange noch
      Zeilen verborgen sind), danach die aufgedeckten Zeilen aus der ganzen Datei. */
  function anzeigeTeile(zeilen, lueckenliste) {
    if (lueckenliste === null) {
      return zeilen.map(zeile => ({ zeile }));
    }
    const lueckeNachStelle = new Map(lueckenliste.map(luecke => [luecke.stelle, luecke]));
    const teile = [];
    for (let stelle = 0; stelle <= zeilen.length; stelle += 1) {
      const luecke = lueckeNachStelle.get(stelle);
      if (luecke) {
        const verborgen = lueckenRest(luecke);
        if (verborgen > 0) {
          teile.push({ luecke, rest: verborgen });
        }
        for (const aufgedeckteZeile of aufgedeckteZeilen(luecke)) {
          teile.push({ zeile: aufgedeckteZeile });
        }
      }
      if (stelle < zeilen.length) {
        teile.push({ zeile: zeilen[stelle] });
      }
    }
    return teile;
  }

  /** Wie viele Zeilen dieser Lücke schon aufgedeckt sind (nur im Speicher der Seite, R00026). */
  function aufgedecktVon(luecke) {
    const bisher = zustand.aufgedeckt[lueckenschluessel(luecke)];
    if (bisher === undefined) {
      return 0;
    }
    return bisher;
  }

  function lueckenRest(luecke) {
    return rest(luecke, aufgedecktVon(luecke));
  }

  /** Die aufgedeckten Zeilen der Lücke aus der ganzen Datei; ohne gelesene ganze Datei ist nichts aufgedeckt. */
  function aufgedeckteZeilen(luecke) {
    const anzahl = aufgedecktVon(luecke);
    if (anzahl === 0 || zustand.ganz === null) {
      return [];
    }
    return aufgedeckt(luecke, anzahl, zustand.ganz.zeilen);
  }

  /** Eine Lücke ist über ihre Nummernspanne neu benannt: sie bleibt dieselbe, solange die Stelle gezeigt wird. */
  function lueckenschluessel(luecke) {
    return String(luecke.neuVon);
  }

  /** Das Bedienelement einer Lücke: die Zahl der verborgenen Zeilen und je ein Knopf für den nächsten Schritt und „ganz“;
      beide sind per Tastatur bedienbar und tragen ihren Text als Namen (R00026). Scheitert das Lesen der ganzen Datei, trägt
      die Lücke ihre Meldung und bleibt zugeklappt (R00026, Fehlerpfad). */
  function lueckenElement({ luecke, rest: verborgen }) {
    const element = document.createElement('div');
    element.className = 'dz-l';
    const textElement = document.createElement('span');
    textElement.className = 'dz-l-text';
    textElement.textContent = `${verborgen.toLocaleString('de-DE')} verborgene Zeile${verborgen === 1 ? '' : 'n'}`;
    element.append(textElement, lueckenKnopf(luecke, verborgen, false), lueckenKnopf(luecke, verborgen, true));
    const fehler = zustand.lueckenfehler[lueckenschluessel(luecke)];
    if (fehler) {
      const fehlerElement = document.createElement('span');
      fehlerElement.className = 'dz-l-fehler';
      fehlerElement.setAttribute('role', 'alert');
      fehlerElement.textContent = fehler;
      element.append(fehlerElement);
    }
    return element;
  }

  function lueckenKnopf(luecke, verborgen, ganz) {
    const knopfElement = document.createElement('button');
    knopfElement.type = 'button';
    knopfElement.className = 'btn dz-l-auf';
    knopfElement.dataset.luecke = lueckenschluessel(luecke);
    if (ganz) {
      knopfElement.dataset.ganz = 'wahr';
      knopfElement.textContent = 'Ganz aufklappen';
      knopfElement.setAttribute('aria-label', `${verborgen} verborgene Zeilen: ganz aufklappen`);
      return knopfElement;
    }
    const schritt = Math.min(SCHRITT, verborgen);
    knopfElement.textContent = `${schritt} aufklappen`;
    knopfElement.setAttribute('aria-label', `${verborgen} verborgene Zeilen: ${schritt} weitere aufklappen`);
    return knopfElement;
  }

  /** Ein Klick oder Enter auf das Bedienelement einer Lücke: die ganze Datei bei Bedarf lesen, die Lücke füllen, neu zeichnen.
      Scheitert das Lesen, bleibt die Lücke zugeklappt und trägt ihre Meldung; erneut betätigen versucht es wieder (R00026). */
  async function klappeLueckeAuf(ansicht, ereignis) {
    const knopfElement = ereignis.target.closest('.dz-l-auf');
    if (!knopfElement) {
      return;
    }
    const daten = zustand.anzeigeDaten;
    const luecke = lueckeZumSchluessel(daten, knopfElement.dataset.luecke);
    if (!luecke || zustand.datei === null) {
      return;
    }
    const ergebnis = await holeGanzeDatei(ansicht);
    if (zustand.anzeigeDaten !== daten) {
      return;
    }
    if (!ergebnis.ganz) {
      if (ergebnis.fehler) {
        zustand.lueckenfehler[lueckenschluessel(luecke)] = ergebnis.fehler;
        zeichneAnsicht(ansicht, daten.antwort, daten.zeilen, 'aenderungen');
      }
      return;
    }
    delete zustand.lueckenfehler[lueckenschluessel(luecke)];
    const bisher = aufgedecktVon(luecke);
    const anzahl = knopfElement.dataset.ganz === 'wahr' ? luecke.zahl : naechsterSchritt(luecke, bisher);
    zustand.aufgedeckt[lueckenschluessel(luecke)] = anzahl;
    zeichneAnsicht(ansicht, daten.antwort, daten.zeilen, 'aenderungen');
  }

  function lueckeZumSchluessel(daten, schluessel) {
    if (!daten) {
      return null;
    }
    const gefunden = luecken(daten.zeilen, zustand.gesamt).filter(luecke => lueckenschluessel(luecke) === schluessel);
    if (gefunden.length === 0) {
      return null;
    }
    return gefunden[0];
  }

  /** Die Zeilen der ganzen Datei der gezeigten Stelle: höchstens einmal je Datei und Leerraum-Stellung, erst auf die erste
      Aufklapp-Betätigung (R00026). Eine späte Antwort einer früheren Wahl wird verworfen; ein laufender Lesevorgang wird geteilt,
      damit ein zweiter Klick dieselbe Datei nicht ein zweites Mal liest. Liefert `{ganz}` oder `{fehler}` (bzw. `{verworfen}`). */
  async function holeGanzeDatei(ansicht) {
    const schluessel = dateischluessel();
    if (zustand.ganz !== null && zustand.ganz.schluessel === schluessel) {
      return { ganz: zustand.ganz };
    }
    const laufend = zustand.ganzLaeuft;
    if (laufend !== null && laufend.schluessel === schluessel) {
      return laufend.versprechen;
    }
    const versprechen = ganzeDateiLesen(schluessel);
    zustand.ganzLaeuft = { schluessel, versprechen };
    try {
      return await versprechen;
    } finally {
      if (zustand.ganzLaeuft !== null && zustand.ganzLaeuft.versprechen === versprechen) {
        zustand.ganzLaeuft = null;
      }
    }
  }

  /** Liest die ganze Datei der Stelle `schluessel`; ohne spätere Wahl. Bei Erfolg merkt sie `ganz` und `gesamt`, sonst bleibt
      `ganz` leer — ein erneuter Versuch liest wieder (R00026). */
  async function ganzeDateiLesen(schluessel) {
    let antwort;
    try {
      antwort = await diffAbrufen(zustand.datei, false, 'ganz', zustand.leerraum);
    } catch (fehler) {
      if (schluessel === dateischluessel()) {
        return { fehler: fehlertextZu(fehler) };
      }
      return { verworfen: true };
    }
    if (schluessel !== dateischluessel()) {
      return { verworfen: true };
    }
    if (antwort.zuGross) {
      return { fehler: antwort.meldung || DIFF_ZU_GROSS };
    }
    if (antwort.patch === undefined) {
      return { fehler: DIFF_NICHT_GELESEN };
    }
    const ganzeZeilen = ganzeDateiZeilen(antwort.patch);
    zustand.ganz = { schluessel, zeilen: ganzeZeilen };
    zustand.gesamt = gesamtzeilen(ganzeZeilen);
    return { ganz: zustand.ganz };
  }

  /** Die Stelle, für die eine ganze Datei gelesen wird: Datei, Commit und Leerraum-Stellung. */
  function dateischluessel() {
    if (zustand.datei === null) {
      return '';
    }
    return `${zustand.datei.commit}|${zustand.datei.pfad}|${zustand.leerraum}`;
  }

  /** `ersterBlockElement` erkennt der Empfänger wieder: ist er nicht mehr im Dokument, ist dieser Diff verworfen. */
  function meldeGezeichnet(ansicht, pfad, bereiche) {
    const detail = {
      modus: zustand.datei ? zustand.datei.modus : null,
      commit: zustand.datei.commit,
      pfad,
      ansicht: zustand.diffansicht,
      bereichElement: ansicht.rollElement,
      ersterBlockElement: ansicht.rollElement.firstElementChild,
    };
    if (bereiche) {
      detail.abschnitte = bereiche;
    }
    document.dispatchEvent(new CustomEvent('diff-gezeichnet', { detail }));
  }

  /* ── Sprung in VS Code (R00021): Links an Zeilen und Abschnittsköpfen, Verweis und Hinweis im Kopf ── */

  /** Übernimmt die Antwort aus `sprung.js`; ohne Ziel bleibt der Verweis verborgen und der Kopf zeigt den Grund. */
  function uebernehmeSprung(ansicht, sprung) {
    zustand.sprung = sprung;
    setzeSprunglinks(ansicht);
    aktualisiereSprungkopf(ansicht);
  }

  /** Merkt die angeklickte Zeile als gewählte für den Verweis im Kopf. */
  function waehleZeile(ansicht, ereignis) {
    const zeileElement = ereignis.target.closest('tr[data-art]');
    if (!zeileElement) {
      return;
    }
    zustand.gewaehlteZeile = nummerOderNull(zeileElement.dataset.neu);
    aktualisiereSprungkopf(ansicht);
  }

  /** Ob das Ziel noch zur gezeichneten Stelle passt: eine späte Antwort einer früheren Wahl wird so verworfen. */
  function sprungPasst() {
    const gezeichnet = zustand.gezeichnet;
    const sprung = zustand.sprung;
    return gezeichnet !== null && sprung !== null && sprung.commit === gezeichnet.commit && sprung.pfad === gezeichnet.pfad;
  }

  /** Jede gezeichnete Zeile mit Nummer neu und jeder Abschnittskopf bekommt `href = ziel + ":" + nummer` — aus dem Ziel allein,
      nie aus fremdem Text; die Zeile kennt nur der Browser. Nur der Link der Nummernspalte braucht einen eigenen Namen: er liegt
      allein an der nackten Nummer, während der Abschnittskopf-Link seinen sichtbaren Text als Namen trägt. */
  function setzeSprunglinks(ansicht) {
    const gezeichnet = zustand.gezeichnet;
    if (!gezeichnet || gezeichnet.zeilen.length === 0) {
      return;
    }
    const ziel = sprungPasst() ? zustand.sprung.ziel : '';
    const zeilenElemente = ansicht.rollElement.querySelectorAll('tr[data-art]');
    for (let index = 0; index < gezeichnet.zeilen.length; index += 1) {
      const zeile = gezeichnet.zeilen[index];
      const zeilenElement = zeilenElemente[index];
      if (!zeilenElement) {
        continue;
      }
      const nummer = sprungZeile(zeile);
      const link = sprungLink(ziel, nummer);
      if (zeile.art === 'kopf') {
        verlinkeZelle(zeilenElement.querySelector('td.c'), link, null);
        continue;
      }
      verlinkeZelle(zeilenElement.querySelector('td.neu'), link, sprungName(gezeichnet.pfad, nummer));
    }
  }

  /** Setzt oder entfernt den Link einer Zelle, ohne ihren Inhalt umzubauen; der sichtbare Text bleibt derselbe. `name` benennt den
      Link für Vorlesewerkzeuge — die Zelle der Nummer neu ist nicht verborgen, und die nackte Nummer allein wäre kein sprechender Name.
      Der Link trägt keine eigene Klasse: im Text der Diff-Zeile sind nur die Rollen der Färbung, Lesetext und Marken erlaubt (R00007). */
  function verlinkeZelle(zelle, link, name) {
    if (!zelle) {
      return;
    }
    const vorhandenerAnker = zelle.querySelector(':scope > a');
    if (!link) {
      if (vorhandenerAnker) {
        zelle.replaceChildren(...vorhandenerAnker.childNodes);
      }
      return;
    }
    if (vorhandenerAnker) {
      vorhandenerAnker.setAttribute('href', link);
      setzeAnkernamen(vorhandenerAnker, name);
      return;
    }
    const anker = document.createElement('a');
    anker.setAttribute('href', link);
    setzeAnkernamen(anker, name);
    anker.append(...zelle.childNodes);
    zelle.replaceChildren(anker);
  }

  /** Ohne Namen trägt der Link nur seinen sichtbaren Text (der Abschnittskopf seinen Hunk-Titel). */
  function setzeAnkernamen(anker, name) {
    if (name) {
      anker.setAttribute('aria-label', name);
      return;
    }
    anker.removeAttribute('aria-label');
  }

  /** Entweder der Verweis „In VS Code“ auf die gewählte Zeile (ohne Wahl die erste Zeile mit Nummer neu) oder der Grund als Text;
      der Hinweis „Datei seit dem Commit geändert“ steht daneben, solange es ein Ziel gibt. */
  function aktualisiereSprungkopf(ansicht) {
    const passt = sprungPasst();
    const ziel = passt ? zustand.sprung.ziel : '';
    const grund = passt ? zustand.sprung.grund : '';
    const zeilen = zustand.gezeichnet ? zustand.gezeichnet.zeilen : [];
    const nummer = zustand.gewaehlteZeile === null ? ersteSprungzeile(zeilen) : zustand.gewaehlteZeile;
    const link = sprungLink(ziel, nummer);
    ansicht.sprungVerweisElement.hidden = link === null;
    if (link === null) {
      ansicht.sprungVerweisElement.removeAttribute('href');
    } else {
      ansicht.sprungVerweisElement.setAttribute('href', link);
    }
    ansicht.sprungGrundElement.textContent = link === null ? grund : '';
    const zeigtHinweis = link !== null && passt && zustand.sprung.geaendert;
    ansicht.sprungHinweisElement.textContent = zeigtHinweis ? 'Datei seit dem Commit geändert' : '';
  }

  function nummerOderNull(text) {
    if (text === undefined || text === '') {
      return null;
    }
    return Number(text);
  }

  /** Ohne Sprache oder über den Grenzen geht kein Auftrag an den Worker; ein Ausfall unterwegs lässt die Datei still ungefärbt. */
  function faerbeZeilen(ansicht, antwort, zeilen) {
    const sprache = spracheZuPfad(antwort.pfad);
    if (!sprache || !faerbbar(antwort.patch)) {
      ansicht.rollElement.dataset.farbe = 'nein';
      return;
    }
    ansicht.rollElement.dataset.farbe = 'laeuft';
    const anzeige = zustand.anzeige;
    const aktuell = () => anzeige === zustand.anzeige;
    ansicht.farbschlange.stellen({
      sprache,
      zeilen: zeilen.map(zeile => ({ art: zeile.art, text: zeile.text })),
      aktuell,
      fertig: farbantwort => legeFarbeAuf(ansicht, zeilen, farbantwort, aktuell),
    });
  }

  /** Ersetzt wird nur der Inhalt der Textzellen mit Farbstücken, in Häppchen je eine Aufgabe des Hauptfadens. Nur Zeilen mit `data-art`
      sind Diff-Zeilen, in Reihenfolge der Liste `zeilen`. Eine neue Anzeige beendet die Auflage still. */
  function legeFarbeAuf(ansicht, zeilen, farbantwort, aktuell) {
    if (!farbantwort) {
      ansicht.rollElement.dataset.farbe = 'nein';
      return;
    }
    const auflage = {
      ansicht,
      zeilen,
      aktuell,
      stueckeNachZeile: stueckeJeZeile(farbantwort),
      zeilenElemente: ansicht.rollElement.querySelectorAll('tr[data-art]'),
    };
    auflegenAb(auflage, 0);
  }

  function auflegenAb(auflage, anfang) {
    if (!auflage.aktuell()) {
      return;
    }
    const ende = haeppchenAuflegen(auflage, anfang);
    if (ende < auflage.zeilen.length) {
      setTimeout(() => auflegenAb(auflage, ende), 0);
      return;
    }
    auflage.ansicht.rollElement.dataset.farbe = 'ja';
  }

  /** Ein Häppchen ab `anfang`: höchstens 500 Zeilen und nur so viele, bis rund 2000 Knoten neu sind — eine Zeile bringt bis zu rund 2000
      Knoten mit (998 Stücke und der Text dazwischen), so bleibt jede Aufgabe weit unter 150 ms. Liefert die erste Zeile danach. */
  function haeppchenAuflegen({ zeilen, stueckeNachZeile, zeilenElemente }, anfang) {
    const KNOTEN_JE_HAEPPCHEN = 2000;
    const ende = Math.min(anfang + BLOCK_ZEILEN, zeilen.length);
    let neueKnoten = 0;
    let index = anfang;
    while (index < ende && neueKnoten < KNOTEN_JE_HAEPPCHEN) {
      if (stueckeNachZeile.has(index)) {
        const zeile = zeilen[index];
        const inhalt = textzellenInhalt(zeile, farbteile(sichtbarTeile(zeile.text), stueckeNachZeile.get(index)));
        zeilenElemente[index].lastElementChild.replaceChildren(...inhalt);
        neueKnoten += inhalt.length;
      }
      index += 1;
    }
    return index;
  }

  /** Ein Block mit `content-visibility: auto` (Höhe vorab geschätzt), darin eine Tabelle: Spalten alt | neu | Vorzeichen | Text. */
  function blockElement(zeilen, name) {
    const blockElement = document.createElement('div');
    blockElement.className = 'dz-b';
    blockElement.style.setProperty('--zeilen', String(zeilen.length));
    blockElement.style.setProperty('--bb', `${blockBreite(zeilen)}px`);
    const tabelleElement = document.createElement('table');
    tabelleElement.className = 'dz';
    tabelleElement.setAttribute('aria-label', name);
    const rumpfElement = document.createElement('tbody');
    for (const zeile of zeilen) {
      rumpfElement.append(zeileElement(zeile));
    }
    tabelleElement.append(rumpfElement);
    blockElement.append(tabelleElement);
    return blockElement;
  }

  function zeileElement(zeile) {
    const diffzeileElement = document.createElement('tr');
    diffzeileElement.dataset.art = zeile.art;
    if (zeile.art === 'kopf') {
      diffzeileElement.className = 'hk';
      const kopfElement = textzelleElement(zeile);
      kopfElement.colSpan = 4;
      diffzeileElement.append(kopfElement);
      return diffzeileElement;
    }
    diffzeileElement.className = zeile.art;
    diffzeileElement.dataset.alt = nummerText(zeile.alt);
    diffzeileElement.dataset.neu = nummerText(zeile.neu);
    let vorzeichen = VORZEICHEN[zeile.art];
    if (vorzeichen === undefined) {
      vorzeichen = '';
    }
    diffzeileElement.append(
      verborgeneZelle('n alt', nummerText(zeile.alt)),
      nummernzelleNeu(nummerText(zeile.neu)),
      verborgeneZelle('m', vorzeichen),
      textzelleElement(zeile),
    );
    return diffzeileElement;
  }

  function nummerText(nummer) {
    if (nummer === null) {
      return '';
    }
    return String(nummer);
  }

  function verborgeneZelle(klassen, text) {
    const zelleElement = document.createElement('td');
    zelleElement.className = klassen;
    zelleElement.setAttribute('aria-hidden', 'true');
    zelleElement.textContent = text;
    return zelleElement;
  }

  /** Die Spalte der Nummer neu trägt den Sprunglink (R00021); sie ist deshalb nicht `aria-hidden` — ein fokussierbares Element in
      einem verborgenen Teilbaum hat für Vorlesewerkzeuge keinen Namen. Die übrigen Nummern- und Vorzeichenspalten bleiben verborgen. */
  function nummernzelleNeu(text) {
    const zelleElement = document.createElement('td');
    zelleElement.className = 'n neu';
    zelleElement.textContent = text;
    return zelleElement;
  }

  function textzelleElement(zeile) {
    const zelleElement = document.createElement('td');
    zelleElement.className = 'c';
    zelleElement.append(...textzellenInhalt(zeile, sichtbarTeile(zeile.text)));
    return zelleElement;
  }

  /** Der Text mit Lesetext für Screenreader und sichtbar gemachten Zeichen; jede Marke ist ein Bild mit Namen, ihr Text bleibt im Dokument.
      Mit Farbe tragen die Teile eine Klasse `tk-…` aus farbe-werte.js; der Text ist mit und ohne Farbe derselbe. */
  function textzellenInhalt(zeile, teile) {
    const knoten = [];
    const lesetext = LESETEXT[zeile.art];
    if (lesetext) {
      knoten.push(textElement('vh', lesetext));
    }
    for (const teil of teile) {
      knoten.push(teilKnoten(teil));
    }
    return knoten;
  }

  function teilKnoten(teil) {
    if (teil.klasse) {
      return textElement(teil.klasse, teil.text);
    }
    if (!teil.marke) {
      return document.createTextNode(teil.text);
    }
    const markeElement = textElement(`mk-z mk-${teil.marke}`, teil.text);
    markeElement.setAttribute('role', 'img');
    let mehrfach = '';
    if (teil.anzahl) {
      mehrfach = ` ×${teil.anzahl}`;
    }
    markeElement.setAttribute('aria-label', `sichtbar gemachtes Zeichen ${teil.code}${mehrfach}`);
    return markeElement;
  }

  function textElement(klassen, text) {
    const element = document.createElement('span');
    element.className = klassen;
    element.textContent = text;
    return element;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
