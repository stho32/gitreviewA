---
id: R00034
status: Neu
datum: 2026-11-25
---

# R00034: Breite der Seitenleiste ziehen

## Beschreibung

Zwischen der Seitenleiste (Commit-Zeile und Dateiliste) und dem Diff-Bereich liegt ein **senkrechter Trenner**; Ziehen mit der Maus ändert die Breite beider Seiten — die Seitenleiste wächst und schrumpft, der Diff nimmt den Rest. Der Trenner ist per **Tab** erreichbar und mit den **Pfeiltasten** in Schritten verstellbar (`role="separator"` mit `aria-valuenow`), ein **Doppelklick** setzt die Startbreite zurück. Die Breite bleibt zwischen **Mindest- und Höchstbreite** (geklemmt) und überlebt den Wechsel von Datei, Commit, Modus und Ansicht; nach dem Neuladen gilt wieder die Startbreite (nur RAM, wie die übrigen Schalter). Das Ändern der Breite **zeichnet den Diff nicht neu** — offenes Notizfeld, Markierungen, Suchtreffer und Bildlaufposition bleiben (Lehre #23).

Zahlt ein auf: [Vision](R00000-vision.md) — „Zusammen ist der Standard, die Dateien führen“ (die Seitenleiste lässt sich an den Inhalt anpassen: schmal für lange Pfade im Diff, breit für lange Dateinamen).

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Aufbau Liste–Detail, Kopf, Modus), [R00033](R00033-seitenleiste-bleibt-stehen.md) (fester Rahmen mit zwei Rollbereichen — die Grenze, an der der Trenner sitzt), [R00010](R00010-zeile-annotieren.md)/[R00022](R00022-datei-annotieren.md)/[R00031](R00031-zeilenbereich-annotieren.md) (offenes Notizfeld, Markierung), [R00027](R00027-im-diff-suchen.md) (Suchtreffer), [R00030](R00030-tastaturbedienung.md) (Fokusring, Tastenkatalog), [R00023](R00023-nebeneinander-ansicht.md) (zweispaltige Anzeige).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Seitenleiste, Diff-Bereich, Modus, Ansicht und Rollbereich sind die von R00012, R00004 und R00033.

## Geschäftlicher Nutzen

Die Seitenleiste hat heute eine feste Breite (der Entwurf zeichnet 360 px, das heutige CSS `minmax(280px,2fr)`). Lange Pfade werden in der Liste umbrochen, lange Zeilen im Diff brauchen dagegen Breite — je nach Datei ist das eine oder das andere knapp. Mit einem ziehbaren Trenner stellt der Mensch die Grenze selbst ein, ohne die Anwendung zu verlassen und ohne dass etwas gespeichert wird. Der Nutzen kommt ohne neuen Serverweg: es ist eine Zahl im Browser, dieselbe Bauart wie „Umbruch“, „Ansicht“ und „Anordnung“.

## Funktionale Anforderungen

- **Trenner**: ein senkrechter Trenner zwischen Seitenleiste und Diff, sichtbar als schmale Ziehfläche an der Grenze (heute die 1-px-Kante aus dem Entwurf, `.leiste{border-right}`). Er sitzt **nur** im zweispaltigen Aufbau (R00033); unter 590 px gibt es ihn nicht.
- **Ziehen**: Drücken und Ziehen mit der Maus (Pointer-Ereignisse) ändert die Breite beider Seiten mit; die Seitenleiste folgt der Zeigerposition, der Diff nimmt den Rest.
- **Tastatur**: der Trenner ist mit **Tab** erreichbar (`tabindex`) und trägt `role="separator"`, `aria-orientation="vertical"`, `aria-controls` (auf die Seitenleiste — das Element, das Commit-Zeile und Dateiliste umschließt), `aria-valuenow` (aktuelle Breite), `aria-valuemin`, `aria-valuemax` und einen Namen, der mit dem sichtbaren Text beginnt („Breite der Dateiliste“). **Pfeil links/rechts** verstellen um 16 px, **Pos1/Ende** setzen auf Mindest-/Höchstbreite; der Fokusring ist sichtbar (R00030, B2907).
- **Doppelklick** auf den Trenner setzt die **Startbreite** zurück.
- **Mindest- und Höchstbreite** (geklemmt): Seitenleiste **240–640 px**, Diff **mindestens 320 px**; die tatsächliche Höchstbreite ist `min(640, Fensterbreite − 24 − 320 − Trennerbreite)` (der Streifen links 24 px zählt wie in der Grenze 590, PO Zeile 249). Ein Zug über die Grenze wird geklemmt, nie verworfen. Ist die Höchstbreite kleiner als die Mindestbreite, gilt der Rückfall auf eine Spalte (R00033, unter 590 px). Startbreite **360 px**; ein Doppelklick setzt genau darauf zurück.
- **Zustand**: die Breite ist ein Zustand der Seite (nur RAM); sie bleibt beim Wechsel von Datei, Commit, Modus, Ansicht und Anordnung, auch ohne gewählte Datei; nach dem Neuladen gilt wieder die Startbreite (nichts wird gespeichert, wie „Umbruch“/„Ansicht“/„Anordnung“).
- **Ohne Neuzeichnen** (Lehre #23): die Breite wirkt über das Layout (eine CSS-Variable am Rahmen), **ohne** den Diff neu zu zeichnen. Ein offenes Notizfeld (R00010/R00022/R00031), Markierungen, die Treffer der Suche (R00027) und die Bildlaufposition des Diffs bleiben unverändert. Gilt in beiden Modi, beiden Ansichten und beiden Anordnungen (Lehre #7).
- **Tastenkatalog**: ändert sich die Tastenbelegung für dieses Bedienelement (etwa ein Kürzel), ist es ein Eintrag im Katalog von I0015 (R00030), keine zweite Liste.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): das Ziehen ist flüssig (kein Ruckeln bei 20 000 Diff-Zeilen im Rollbereich); ein Zug löst **kein** Neuzeichnen des Diffs und keine neue Anfrage aus. Der Entwickler misst am laufenden Programm (Long Tasks während des Zugs) und hält den Wert im Bericht fest. **Keine künstliche Last** in den Proben (AI-Team/gelerntes.md).
- **Sicherheit**: unverändert — die Breite ist eine Zahl im Browser, es entsteht kein neuer Anfrageparameter und kein neuer Serverweg; fremder Text erscheint nur über `textContent`.
- **Logging**: unverändert — nichts auf stderr, stdout bleibt bis „Beenden“ leer.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Entwurf Fassung 2, keine eigenen Vorgaben; der Trenner ist per Maus **und** Tastatur bedienbar, trägt einen Namen für Screenreader und einen sichtbaren Fokusring; die geklemmte Grenze ist am Trenner sichtbar (der Zeiger/Trenner reagiert nicht über die Grenze hinaus).

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md)) und **Repo S** (200 Zeilen, 60 Dateien, aus [R00033](R00033-seitenleiste-bleibt-stehen.md)). Aufruf `gitreviewA <Hashes> --kein-browser`, Fenster 1280 × 800 (zweispaltig). „Breite der Seitenleiste“ wird an der gemessenen Breite des Seitenleisten-Elements abgelesen.

### Ziehen, Klemmen, Zurücksetzen
- [ ] Gegeben der zweispaltige Aufbau bei 1280 px, wenn man den Trenner nach rechts zieht, dann wächst die Seitenleiste mit der Zeigerposition und der Diff wird entsprechend schmaler; zieht man nach links, schrumpft sie mit. Rechnung: Startbreite 360 px, ein Zug um 100 px nach rechts ergibt 460 px (innerhalb 240–640). *Ebene: Playwright (Browser-Eigenes: Ziehen, Darstellung).*
- [ ] Gegeben der zweispaltige Aufbau, wenn man den Trenner über die Höchstbreite hinaus nach rechts zieht, dann bleibt die Seitenleiste bei der Höchstbreite stehen (640 px oder `Fensterbreite − 320 − Trenner`, der kleinere Wert), und der Diff wird nicht schmaler als 320 px; zieht man über die Mindestbreite hinaus nach links, bleibt sie bei 240 px. *Ebene: Playwright (Grenzen der Zieh-Fläche) und Unit (Breitenregel, siehe unten).*
- [ ] Gegeben die Seitenleiste auf 500 px gezogen, wenn man den Trenner **doppelklickt**, dann steht sie wieder bei der Startbreite 360 px. *Ebene: Playwright (Browser-Eigenes).*

### Tastatur und Barrierefreiheit
- [ ] Gegeben der zweispaltige Aufbau, wenn man mit Tab bis zum Trenner geht, dann hat er den Fokus, trägt `role="separator"`, `aria-orientation="vertical"`, `aria-controls` (auf die Seitenleiste), `aria-valuenow` mit der aktuellen Breite, `aria-valuemin`, `aria-valuemax` und einen Namen, der mit dem sichtbaren Text beginnt; die Pfeiltaste rechts erhöht um 16 px, links senkt um 16 px; Pos1 setzt auf 240 px, Ende auf die Höchstbreite; ein sichtbarer Fokusring liegt am Trenner. *Ebene: Playwright (Fokus, Tastendruck, `aria-*` — Browser-Eigenes).*
- [ ] Gegeben der Trenner auf der Mindestbreite, wenn man die Pfeiltaste links drückt, dann ändert sich nichts (kein Wert unter 240 px, `aria-valuenow` bleibt). *Ebene: Unit (Breitenregel).*

### Zustand und Anzeigeverfahren (Lehre #7/#23)
- [ ] Gegeben die Seitenleiste auf 500 px, wenn man die Datei wechselt, den Commit wechselt, auf „Einzeln“/„Zusammen“ und auf „ganze Datei“/„nebeneinander“ umschaltet, dann bleibt die Breite 500 px; nach dem Neuladen der Seite steht sie wieder bei 360 px (nichts gespeichert). *Ebene: Playwright (Browser-Eigenes) und Unit (Zustand: Start, Wechsel, Neuladen).*
- [ ] Gegeben `src/a.txt` mit einem **offenen** Notizfeld an einer Zeile (Text „Klammer fehlt“) und einem Suchtreffer, wenn man den Trenner zieht, dann bleiben das offene Feld samt Text und Fokus, die Markierung, der Suchtreffer und die Bildlaufposition des Diffs erhalten; es wird keine neue Diff-Anfrage gestellt. *Ebene: Playwright (Browser-Eigenes; kein Neuzeichnen, Lehre #23).*
- [ ] Gegeben ein Fenster von 700 px Breite (zweispaltig, aber enger), wenn man den Trenner ganz nach rechts zieht, dann klemmt die Höchstbreite bei `700 − 24 − 320 − 6 = 350 px` (nicht 640); unter 590 px verschwindet der Trenner ganz (eine Spalte, R00033). *Ebene: Unit (Breitenregel: Höchstbreite aus der Fensterbreite) und Playwright (Darstellung).*

Grenz- und Leerfälle bedacht: Ziehen über beide Grenzen; Tastendruck auf der Grenze; Fenster genau an 590 px; kein zweispaltiger Aufbau (kein Trenner); Modus/Ansicht ohne gewählte Datei. Verworfen als eigenes Kriterium: eine gespeicherte Breite über das Neuladen hinaus (`localStorage`), touch-Gesten, eine Breiten-Eingabe als Zahl.

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) und R00033 (Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `web/index.html` — das Trenner-Element zwischen Seitenleiste und Diff (nur im zweispaltigen Aufbau).
- `web/gitreviewa.css` — der Trenner (Ziehfläche, Fokusring), die Breite über eine CSS-Variable am Rahmen.
- `web/trenner-werte.js` (neu, rein) — die Breitenregel (`breiteNachZug`, `breiteNachTaste`, `kleinsteBreite`, `hoechsteBreite`), unter Node und im Browser.
- `web/trenner.js` (neu, Oberfläche) — Zustand, Ziehen, Tastatur, Doppelklick, Anschluss an den Katalog (I0015).
- `e2e/` — Playwright-Specs (Ziehen, Tastatur, Doppelklick, Klemmen, offenes Feld).
- `tests/` — Unit-Tests der Breitenregel unter Node (in `e2e/` oder wo die JS-Bausteine getestet werden, wie `diff-werte.spec.js`).

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Die Bubbles stehen in der WBS unter I0035 (B3301–B3307).

**Artboard**: [Entwurf Fassung 2](../Dokumentation/Wireframes/oberflaeche-fassung-2.html) zeichnet die Grenze als feste 1-px-Kante (`.leiste{border-right:1px solid var(--kd-line-strong)}`) und **keinen** ziehbaren Trenner. Für den Trenner gilt der Standard (die Lücke füllt Material 3 und kanbanD): eine schmale Ziehfläche an derselben Kante, wie bei geteilten Ansichten üblich (Editor, Dateibrowser) — kanbanD hat kein Vorbild.

### Ablauf

1. **Ziehen** (Oberfläche) — `Zeigerposition + Rahmenbreite → Breite` (rein, B3301) → Zustand setzen (B3302) → Layout-Variable am Rahmen (ohne Neuzeichnen, B3306).
2. **Tastatur** — `Pfeil/Pos1/Ende → Breite` (rein) → wie oben; `aria-valuenow` folgt der Breite.
3. **Doppelklick** — `→ Startbreite` → wie oben.
4. **Zustand** — bleibt über Datei-, Commit-, Modus-, Ansichtswechsel; Neuladen → Startbreite.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `web/index.html` (Trenner), `gitreviewa.css` (Breiten-Variable), der Tastenkatalog `tasten-werte.js` (I0015), das Ereignis `dateiliste-gezeichnet`/der Rahmen aus R00033.

- `trenner-werte.js` (Operation, rein, läuft unter Node und im Browser) — `breiteNachZug(zug, rahmen, kleinste, hoechste)` (klemmt), `breiteNachTaste(breite, taste, schritt, kleinste, hoechste)`, `hoechsteBreite(fenster, diffMindest, trenner)`, `kleinsteBreite()`.
- `trenner.js` (Oberfläche) — Zustand `Breite` (RAM, Start 360), Ziehen (Pointer), Tastatur (`role="separator"`), Doppelklick, `breite-geaendert`.
- Katalog (`tasten-werte.js`, I0015) — ein Eintrag für das etwaige Kürzel und für die Pfeiltasten am Trenner (`imFeld`-artig, nur bei Fokus), damit Hilfe und Statuszeile aus derselben Quelle lesen.

### Änderungen an bestehenden Klassen

`web/index.html` (Trenner), `gitreviewa.css` (Breiten-Variable, Trenner). Keine Serverklasse. `tasten-werte.js` (Katalogeintrag). Die vorhandenen `scrollIntoView`-Stellen bleiben unberührt.

## Tests

Nach Test-Pyramide und Konfiguration (Interactor je Interaction; Playwright nur Hot Path und Browser-Eigenes). Die Breitenregel ist reine Logik → **Unit**; das Ziehen, die Tastatur, der Doppelklick, der Zustand und das offene Feld sind **Browser-Eigenes** → Playwright. Es entsteht kein Serverweg; das Ziehen liegt nicht auf dem Hot Path.

**Unit (rein, Node):** `trenner-werte.js` — Klemmen an beiden Grenzen (unter Min, über Max, genau Min/Max), Höchstbreite aus der Fensterbreite, Taste je Richtung, Pos1/Ende, Zustand (Start 360, Wechsel, Neuladen). Lehre „Wert aus einer Einstellung als Spanne prüfen“: Mutanten „nur Obergrenze“, „nur Untergrenze“, „fest/ignoriert“.
**E2E (Playwright headless):** Ziehen, Klemmen, Doppelklick, Tastatur und `aria-*`, Zustand über die Wechsel, offenes Feld/Suchtreffer/Markierung überstehen das Ziehen (Lehre #23), schmales Fenster. Fenster 1280 × 800 und 700 × 800. Messwert „Ziehen flüssig“ (keine Aufgabe > 150 ms) ereignisgenau, mit Positivkontrolle.

## Abhängigkeiten

- Abhängig von: I0027 Oberfläche Liste–Detail ([R00012](R00012-oberflaeche-liste-detail-zusammen.md), grün — der Aufbau, in den der Trenner kommt); fachlich benachbart: I0034 Seitenleiste bleibt stehen ([R00033](R00033-seitenleiste-bleibt-stehen.md), rot — der feste Rahmen, dessen Grenze der Trenner zieht). Kein hartes `Braucht` auf I0034: der Trenner kann auf dem heutigen zweispaltigen Aufbau entstehen; er wird beim Bau mit dem Rahmen zusammengeführt.
- Blockiert: I0036 Seitenleiste ein- und ausklappen ([R00035](R00035-seitenleiste-ein-und-ausklappen.md)) — dessen Knopf sitzt am Trenner.
- Mitgenutzt und unverändert: I0006/I0022 (Diff), I0014 (Blockgrenze, `content-visibility`), I0009 (Lücken), I0007 (Anordnung), I0031 (Suche), I0015 (Fokusring, Katalog), I0017/I0018/I0032 (offenes Feld).

## Offene Fragen

Keine offenen. Der product-owner hat alle vier Fragen am 2026-11-25 entschieden (`AI-Team/po-entscheidungen.md`, Zeilen 170–180, Commit `feb3296`); die Entscheidungen sind eingearbeitet:

1. **Mindest-, Höchst- und Startbreite: 240–640 px** (Seitenleiste), Diff mindestens 320 px, Höchstbreite `min(640, Fenster − 320 − 6)`, Start 360 px; Doppelklick setzt auf 360 px zurück.
2. **Tastenschritt: 16 px** je Pfeil, Pos1/Ende auf die Grenzen; der Trenner trägt zusätzlich `aria-controls` auf die Seitenleiste.
3. **RAM statt `localStorage`** — nach dem Neuladen gilt wieder die Startbreite (Vision „Nichts wird gespeichert“).
4. **Ort des Ausklapp-Knopfs: am Trenner** (R00035) — `Braucht I0035` bleibt.

Ohne Rückfrage entschieden und vom product-owner bestätigt: nur RAM — nach dem Neuladen gilt wieder die Startbreite (wie „Umbruch“/„Ansicht“/„Anordnung“); die Breite überlebt Datei-, Commit-, Modus-, Ansichts- und Anordnungswechsel; das Ziehen zeichnet den Diff nicht neu (Lehre #23); unter 590 px gibt es keinen Trenner.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00012/R00033 hinaus (die Wegwerf-Repos legen die Tests an).

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 7 Bubbles unterhalb I0035 (B3301–B3307), davon 4 klar (2 h) und 3 unklar (2–4 h) — Untergrenze 14 h, obere Schätzung 20 h. Enthalten: nur I0035. Keine Ausbaustufen. Der Slice liegt mit sieben Bubbles unter der Grenze; falls der Bau größer wird, ist die Spalte „Tests und Wegwerf-Repo“ (B3307) abtrennbar.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: der Betreiber schreibt, er hätte gern „die Breite der Dateiauflistung … mit so einem vertikalen Slider“ verstellbar. Heute ist die Grenze fest (Entwurf 360 px), und je nach Datei ist die falsche Seite knapp: lange Pfade brechen in der Liste um, lange Diff-Zeilen brauchen Breite. Zielbild ist eine Grenze, die der Mensch selbst einstellt. Wenn Drücken und Ziehen (oder zwei Tasten) die Breite ändern und die Zahl sich je Sitzung merkt, dann passt die Anordnung zu jeder Datei, ohne dass etwas gespeichert wird. Gerade dieser Schritt ist der Hebel, weil er auf der Grenze aufsetzt, die der feste Rahmen (R00033) ohnehin zieht: es ist eine Zahl am Layout, kein neuer Serverweg, keine neue Rechnung am Diff — und er öffnet den Weg zum Ausklappen (R00035), das denselben Trenner als Knopf nutzt.

## Missing-Docs

- Ob `Pointer-Events` mit `setPointerCapture` das Ziehen auch bei schnellen Bewegungen ohne Aussetzer halten (und wie der Fokus beim Ziehen mit der Maus bleibt) — vor dem Bauen mit einem kleinen Versuch belegen.
- Ob eine Breitenänderung über eine CSS-Variable den bereits gezeichneten Diff ohne Reflow-Sprung (Bildlaufposition) hält — mit dem vorhandenen großen Diff (R00017) prüfen.

## Notizen

### Optionen (Verstellweg)

| Option | Bedienbarkeit | Aufwand | Risiko |
|---|---|---|---|
| **1. Maus-Ziehen + Tastatur (role=separator) (gewählt)** | hoch: präzise mit der Maus, exakt mit der Tastatur | Trennerelement, Zieh-Fläche, `aria-*`, Fokus | das Ziehen kann ohne Pointer-Capture auf schnellen Wegen abreißen |
| 2. Nur Tastatur (zwei Knöpfe „schmaler/breiter“) | mittel: viele Klicks für eine große Änderung | klein | der Betreiber hat ausdrücklich „Slider“ verlangt |
| 3. Ziehen + ein Aufklapp-Umschalter ohne Tastaturschritt | hoch für die Maus | klein | die Anforderung „Pfeiltasten/`aria-valuenow`“ fehlt |

Gewählt: 1 — der Betreiber nennt den Slider, die Barrierefreiheit verlangt den Tastaturweg (`role="separator"` mit `aria-valuenow`, wie #15).

### Verworfene Alternativen

- `localStorage` für die Breite: verworfen — die Vision sagt „nichts wird gespeichert“, und alle übrigen Schalter sind nur RAM.
- Ein Tastenkürzel als **einziger** Weg: verworfen — der Betreiber will den Slider; ein Kürzel ist höchstens Ergänzung über I0015.
- Zwei Knöpfe „schmaler/breiter“ statt Ziehen: verworfen (siehe Option 2).
- Schichtenschnitt „Zahlen/Regel/Oberfläche“: verworfen — ein Slice.
