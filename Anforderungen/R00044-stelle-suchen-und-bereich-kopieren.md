---
id: R00044
status: Neu
datum: 2026-11-25
---

# R00044: Stelle suchen und Bereich kopieren (Dateiansicht)

## Beschreibung

In der Dateiansicht ([R00043](R00043-datei-ansehen-und-kopieren.md)) markiert der Mensch einen Zeilenbereich mit denselben Gesten wie beim Zeilenbereich im Diff ([R00031](R00031-zeilenbereich-annotieren.md)) und kopiert ihn — per Knopf „Bereich kopieren“, Kürzel `y` oder Strg+C — ohne Zeilennummern, byte-genau samt Zeilenenden. Die Suche aus [R00027](R00027-im-diff-suchen.md) findet die Stelle in der Datei.

Zahlt ein auf: [Vision](R00000-vision.md) — „Einzelne Dateien ansehen und kopieren“ („ihr Inhalt lässt sich ganz oder teilweise kopieren“).

### Domänenbezug

Kein Glossar. „Bereich“: Zeilen `von` bis `bis` der Datei (Nummern wie gezeigt, ab 1). „Kopierziel“: Datei oder Bereich.

## Geschäftlicher Nutzen

Oft soll nicht die ganze Datei laufen, sondern ein Teil: die zweite Migration, nur das `CREATE`, ohne den Aufräumteil am Ende. Mit der Suche springt der Mensch zur Stelle, mit Klick und Umschalt-Klick markiert er die Zeilen, und ein Druck kopiert genau diese Zeilen — ohne dass beim Markieren mit der Maus Zeilennummern oder ein halbes Zeichen mitkommen.

## Funktionale Anforderungen

- **Markieren** (Gesten aus R00031): Klick auf eine Zeilennummer setzt den Anker (ein einzeiliger Bereich), Umschalt-Klick auf eine andere Nummer oder Ziehen über die Nummern erweitert auf `von..bis` (kleinere und größere Nummer), Umschalt+↑/↓ erweitert um die Nachbarzeile, Esc hebt die Markierung auf. Ein Klick in den Text markiert nichts (freie Textauswahl bleibt Sache des Browsers). Es gibt hier kein Notizfeld.
- **Anzeige**: markierte Zeilen sind hervorgehoben, nicht allein durch Farbe (Randmarke); die Werkzeugleiste nennt „Zeilen 3–7 markiert“ und den Knopf „Bereich kopieren“ in einer Zeile. Die Markierung übersteht den Umbruch-Wechsel und das Neuzeichnen nach der Färbung; nach dem Neuladen ist sie weg (Seitenzustand).
- **Grenzen des Bereichs**: nur gezeichnete Zeilen (bei zugeklappter Datei erst nach „Trotzdem laden“); höchstens die ganze Datei.
- **Bereich kopieren** (Pflichtpunkt 5, die eine Stelle): eine Funktion bestimmt aus dem **Kopierziel** (Datei oder Bereich) den Text; Knopf „Datei kopieren“, `c`, Knopf „Bereich kopieren“, `y` (außerhalb von Feldern, ohne Strg/Alt/Meta, Eintrag im Katalog von R00030 mit Laufart Dateiansicht), Strg+C ohne freie Textauswahl, der Ersatzweg und die Bestätigung nutzen nur sie. Der Bereich ist der Ausschnitt der Zeilen `von..bis` aus dem Text der Datei **mit** ihren Zeilenenden (CRLF bleibt CRLF); die letzte Zeile der Datei ohne Zeilenende bleibt ohne. Nie Zeilennummern, nie Marken, nie die gekürzte Anzeige einer langen Zeile (R00043).
- **Strg+C**: ist ein Bereich markiert und kein Text frei ausgewählt, legt Strg+C den Bereich ab; mit freier Textauswahl kopiert der Browser die Auswahl wie gewohnt (Zeilennummern sind nicht auswählbar und kommen nie mit).
- **Bestätigung und Ersatzweg**: „Zeilen 3–7 kopiert“; verweigert der Browser die Zwischenablage, gilt der Ersatzweg aus R00043 („Zwischenablage verweigert — Strg+C kopiert den Bereich“).
- **Suche**: wie R00027 über die gezeigten Zeilen der Datei — wörtlich, Groß/Klein unterschieden, 1–200 Zeichen, höchstens 10 000 Treffer gezählt, Marken auffindbar, Enter/Umschalt+Enter springen, `/` fokussiert, Esc leert; dieselbe Suche, keine Kopie.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): Bereich 1…Zeilenzahl (höchstens 20 000 gezeichnete Zeilen ohne „Trotzdem laden“); Suchbegriff 200 Zeichen, 10 000 Treffer (R00027); kopierter Text höchstens die Datei (8 MiB, R00043).
- **Performance**: Markieren und Kopieren bei 20 000 Zeilen ohne Aufgabe über 150 ms; Suche wie R00027 (≤ 1 s bei 20 000 Zeilen).
- **Sicherheit**: kein neuer Anfrageweg; der Bereich wird im Browser aus dem schon geladenen Text geschnitten.
- **Logging** (Pflichtpunkt 4): nur Browser — nichts auf stderr.

## Akzeptanzkriterien

Vorbereitung: Ordner D aus `user-stories/R00043.md`, dazu `mig.sql` (`user-stories/R00044.md`: 8 Zeilen CRLF, letzte Zeile ohne Zeilenende). Aufruf `gitreviewA --dateien mig.sql --kein-browser`.

- [ ] 1. Gegeben `mig.sql`, wenn man auf Nummer 3 klickt und mit Umschalt auf Nummer 5 klickt, dann sind die Zeilen 3–5 markiert, die Werkzeugleiste nennt „Zeilen 3–5 markiert“; Umschalt-Klick auf 2 statt 5 ergibt „Zeilen 2–3“; Ziehen über die Nummern 6 bis 4 ergibt „Zeilen 4–6“; Umschalt+↓ von 4–6 aus ergibt 4–7; Esc hebt auf. *Ebene: Unit (Bereichsregel) und Playwright (Gesten, Browser-Eigenes).*
- [ ] 2. Gegeben die Zeilen 3–5 markiert, wenn man „Bereich kopieren“ betätigt, dann enthält die Zwischenablage genau die Bytes der Zeilen 3, 4 und 5 samt ihren drei CRLF, keine Zeilennummer, und „Zeilen 3–5 kopiert“ steht da; mit den Zeilen 7–8 endet der Text nach Zeile 8 ohne Zeilenende. Rechnung (Skript): Zeilen 3–5 sind je `-- Teil n` (9 Bytes) + CRLF = 3 × 11 = 33 Bytes. *Ebene: Unit (Ausschnitt mit CRLF, gemischt, ohne Schluss-LF) und Playwright (Zwischenablage gelesen).*
- [ ] 3. Gegeben die Zeilen 3–5 markiert und keine freie Textauswahl, wenn man `y` oder Strg+C drückt, dann liegt derselbe Text wie in Kriterium 2 in der Zwischenablage; mit freier Textauswahl über zwei Zeilen kopiert Strg+C diese Auswahl, ohne Zeilennummern. *Ebene: Playwright (Browser-Eigenes).*
- [ ] 4. Gegeben ein Browser, der die Zwischenablage verweigert, wenn man „Bereich kopieren“ betätigt und danach Strg+C drückt, dann steht erst „Zwischenablage verweigert — Strg+C kopiert den Bereich“, danach liegt der Text aus Kriterium 2 in der Zwischenablage. *Ebene: Playwright.*
- [ ] 5. Gegeben `breit.sql` aus Ordner D (eine Zeile, 50 000 Zeichen) und die Zeile 1 markiert, wenn man sie kopiert, dann sind es 50 000 Zeichen plus LF, nicht die gezeigten 10 000. *Ebene: Unit (Ausschnitt) und Playwright.*
- [ ] 6. Gegeben `mig.sql`, wenn man `/` drückt und `Teil 4` sucht, dann steht „1 von 1“ und Zeile 4 ist im Blick; markiert man danach 4–4 und schaltet den Umbruch aus und wieder an, bleibt die Markierung. Gegeben `trojan.sql`, dann findet die Suche `⟨U+202E⟩`. *Ebene: Playwright (Suche, Browser-Eigenes).*

### Angriffsmatrix (security-reviewer, vor dem Bau; Matrix `Dokumentation/Sicherheit/angriffsmatrix-dateiansicht.md`)

- [ ] 7. Gegeben `cr.sql` mit einem einzelnen CR ohne LF in einer markierten Zeile (`-- harmlos` + CR + `DROP TABLE x;`), wenn man den Bereich kopiert, dann enthält die Zwischenablage das CR byte-gleich (kein LF daraus, keine Marke); die Anzeige bleibt wie in R00043 (Marke `⟨U+000D⟩`, kein Zeilenende). *Ebene: Unit (Ausschnitt) und Playwright (Zwischenablage). Matrix L4.*
- [ ] 8. Gegeben `breit.sql` (eine Zeile, 50 000 Zeichen; ein Suchbegriff steht nur jenseits Zeichen 10 000), wenn man sucht, dann nennt die Suche den Treffer im nur gekürzt gezeigten Teil (gesucht wird über den vollen Text der Zeile, nicht nur über die gezeigten 10 000 Zeichen). *Ebene: Unit (Suchzählung) und Playwright. Matrix L5, Entscheidung E3.*

Grenz- und Leerfälle bedacht: einzeiliger Bereich (1), letzte Zeile ohne Zeilenende (2), lange Zeile (5), leere Datei (keine Zeile, nichts zu markieren — kein eigenes Kriterium), zugeklappte Datei (Markieren erst nach „Trotzdem laden“, ein Test beim Bauen). Verworfen: Bereich über das Neuladen behalten (Seitenzustand, Vision „Nichts wird gespeichert“).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 1, 5 und die Suchgrenzen aus R00027; 2 Anzeigeverfahren — ganze Datei mit Umbruch an (Standard) und aus (Kriterium 6), zugeklappt (Grenzfall); 3 festes Layout — „Zeilen 3–5 markiert“ und „Bereich kopieren“ stehen in der einzeiligen Werkzeugleiste, die Bestätigung ersetzt die vorige Meldung (keine wachsende Liste); 4 Ausführungsort — nur Browser; 5 eine Stelle — das Kopierziel (Kriterien 2–4: Knopf, `y`, Strg+C, Ersatzweg nutzen dieselbe Funktion wie „Datei kopieren“ aus R00043).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/` — `kopieren.js` (Kopierziel), `bereich-werte.js` (Regel), `dateiansicht.js` (Gesten), `suche.js` (wiederverwendet), Katalog in `tasten-werte.js` (`y`, Laufart Dateiansicht).
- `tests/` (Node-Unit), `e2e/`.

## Technische Überlegungen

**Vorplanung** — Bubbles B4221–B4225 unter I0045.

### Ablauf

1. Geste → Anker/Ziel → Bereichsregel → `{von, bis}` (B4221, B4222).
2. Knopf, `y` oder Strg+C → Kopierziel → Ausschnitt aus dem Text → Kopierstelle aus R00043 (B4223).
3. Suche über die gezeigten Zeilen (B4224).

### Grobentwurf

- `bereich-werte.js` (rein) — `bereich(anker, ziel, zeilenzahl)` → `{von, bis}`; `ausschnitt(text, von, bis)` → Text samt Zeilenenden.
- `kopieren.js` — `kopiere(kopierziel)`; `copy`-Ereignis setzt `clipboardData` mit dem Ausschnitt, wenn ein Bereich markiert und kein Text frei ausgewählt ist.

### Änderungen an bestehenden Klassen

`suche.js` (Ziel: Zeilen der Dateiansicht), `tasten-werte.js`, `bereich-werte.js` (aus I0032, wenn passend).

## Tests

**Unit:** Bereichsregel (Reihenfolge, Klemmen, gleiche Zeile), Ausschnitt (LF, CRLF, gemischt, ohne Schluss-LF, lange Zeile).
**E2E (Playwright, Browser-Eigenes):** Gesten, Kopieren mit gelesener Zwischenablage, `y`, Strg+C mit und ohne freie Auswahl, Ersatzweg, Suche.

## Abhängigkeiten

- Abhängig von: I0044 Eine Datei ansehen und ganz kopieren (R00043, rot), I0031 Im Diff suchen (R00027, grün), I0032 Zeilenbereich annotieren (R00031, grün).
- Blockiert: nichts.

## Offene Fragen

Keine offenen. Der product-owner hat beide Fragen am 2026-11-25 entschieden (`AI-Team/po-entscheidungen.md`, Zeile 206); die Antworten sind oben eingearbeitet:

1. **Zeilenende der letzten markierten Zeile mitkopieren?** — entschieden (PO Zeile 206): ja, das Zeilenende der letzten markierten Zeile wird mitkopiert (CRLF bleibt CRLF); die letzte Zeile der Datei ohne Zeilenende bleibt ohne.
2. **Strg+C kopiert den markierten Bereich, wenn kein Text frei ausgewählt ist?** — entschieden (PO Zeile 206): ja; bei freier Textauswahl kopiert der Browser die Auswahl. `y` und der Knopf bleiben für Tastatur- und Mausnutzer.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 5 Bubbles unterhalb I0045 (B4221–B4225), 3 klar (2 h), 2 unklar (2–4 h) — 10–14 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Betreiber will „ganz oder teilweise kopieren“. Teilweise mit der Maus im Browser kopiert heute, was gezeichnet ist: Marken statt echter Zeichen, LF statt CRLF, bei langen Zeilen nur den gezeigten Anfang. Wenn der Bereich als Zeilen `von..bis` markiert und aus dem geladenen Text der Datei geschnitten wird, kommt genau das in die Zwischenablage, was in diesen Zeilen der Datei steht. Der Hebel ist die eine Kopierstelle mit dem Kopierziel: Knopf, Kürzel, Strg+C und Ersatzweg können nicht auseinanderlaufen, und die Gesten sind dieselben, die der Mensch vom Diff kennt.

## Missing-Docs

- Zeilenenden in `clipboardData.setData` und `navigator.clipboard.writeText` (siehe R00043).

## Notizen

### Verworfene Alternativen

- Freie Textauswahl durch eigenes Kopieren ersetzen (Teilzeilen byte-genau): verworfen — die Zuordnung einer DOM-Auswahl mit Marken zu Bytes ist fehleranfällig; Zeilen sind die Einheit, die der Mensch ausführt.
- Eigene Gesten für die Dateiansicht: verworfen — dieselben wie im Diff (R00031).
