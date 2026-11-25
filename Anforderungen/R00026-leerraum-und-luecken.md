---
id: R00026
status: Neu
datum: 2026-11-25
---

# R00026: Leerraum ausblenden und Lücken aufklappen

## Beschreibung

Im Diff blendet der prüfende Mensch reine Leerraum-Änderungen aus: eine Schalterstellung „Leerraum ignorieren“ lässt `git` mit `-w` (`--ignore-all-space`) vergleichen, sodass umgestellte Einrückung, Tabs gegen Leerzeichen und ähnliches Rauschen verschwinden — in „nur Änderungen“ und in „ganze Datei“. In „nur Änderungen“ deckt er außerdem die zwischen zwei Abschnitten verborgene Lücke auf: erst schrittweise, dann ganz; die aufgedeckten Zeilen sind dieselben Zeilen der ganzen Datei, die die Ansicht „ganze Datei“ schon liest. Beide Stellungen und der Aufklappzustand leben nur im Arbeitsspeicher; die Wahl des Leerraums bleibt beim Wechsel von Datei und Commit, und die Zeilennummern alt/neu — damit jede Anmerkung — bleiben unverändert.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ („Whitespace ausblenden, Kontext erweitern“).

Baut auf auf: [R00004](R00004-diff-einer-datei-lesen.md) (Diff-Bereich, Zeilenaufbau `{art, alt, neu, text}`, `patchZeilen`, Endpunkt `GET /api/commits/{hash}/diff`, Umschalter „Umbruch“) und [R00008](R00008-ganze-datei-mit-diff.md) (Ansicht „ganze Datei“ mit `umfang=ganz`, Zeilen der ganzen Datei, `ganzeDateiZeilen`). Beide sind grün; dieser Slice wird nach ihnen gebaut.

**Entscheidung des product-owners (2026-11-24, `AI-Team/po-entscheidungen.md` Zeile 46):** I0009 baut auf I0022 auf (`Braucht I0022`); der Kontext-Teil ist nur noch „Lücke zwischen zwei Abschnitten per Klick aufklappen“ aus den Zeilen der ganzen Datei; `-w` und sein Zusammenspiel mit „ganze Datei“ (Leerraum-Änderungen werden Kontext) bleiben in I0009. Eine Zeilenrechnung statt zweier; der Kontext-Teil schrumpft von einer Leserechnung auf Bedienung.

**Nicht Teil dieser Anforderung (eigene Karten):** eine freie Kontextbreite (breiterer Kontext je Abschnitt statt der festen drei Zeilen — R00008 ist die Grenze „alles“); das Aufklappen in „ganze Datei“ (dort gibt es keine Lücken); ein Wortdiff je Zeile; das Ausblenden von Leerraum durch Konfiguration des fremden Repos; das Ausblenden ganzer Leerraum-Dateien.

## Geschäftlicher Nutzen

Der Auslöser sind zwei Formen von Rauschen, die denselben Blick auf das Wesentliche kosten. Erstens: eine KI formatiert um — Einrückung, Tab gegen Leerzeichen, Zeilenenden — und der Diff füllt sich mit Änderungen, die nichts bedeuten; wer sie für echte Änderungen hält, prüft sie einzeln und übersieht die eine echte Zeile dazwischen. Zweitens: zwischen zwei echten Änderungen liegt oft genau die Stelle, die man sehen muss (die geschlossene Klammer, die Zeile davor), und der Diff zeigt dort nur drei Zeilen Kontext. Mit „Leerraum ignorieren“ fällt das Formatierungsrauschen weg, und mit dem Aufklappen holt der Mensch sich genau die verborgene Stelle, ohne in den Editor zu wechseln und Zeilennummern abzugleichen. Beides zahlt auf die Nummer **neu** ein: die aufgedeckten und die übrigen Zeilen tragen dieselbe Stellenangabe, die das Ergebnis nach [R00002](R00002-beenden-mit-ergebnis.md) an die KI zurückgibt, also ändert sich am Rückkanal nichts.

## Funktionale Anforderungen

- **Umschalter „Leerraum“** mit zwei Stellungen „beachten“ (Start) und „ignorieren“; das Umschalten ändert die gewählte Datei und die Dateiliste nicht, der Diff-Bereich zeigt danach dieselbe Datei mit dem anderen Vergleich.
- **Leerraum ignorieren** heißt: `git` vergleicht mit `-w` (`--ignore-all-space`). Reine Leerraum-Änderungen **innerhalb** einer Zeile (Einrückung, Tabs gegen Leerzeichen, Leerzeichen am Zeilenende) verschwinden aus dem Diff; die betroffenen Zeilen stehen als Kontextzeilen da. Gilt in „nur Änderungen“ **und** in „ganze Datei“ (dieselbe Zeilenrechnung, derselbe Zeilenaufbau). Eine **hinzugefügte oder entfernte leere Zeile** bleibt sichtbar — `-w` blendet sie nicht aus, und sie ist eine Strukturänderung, kein Leerraum innerhalb einer Zeile.
- **Wahl bleibt**: die Stellung gilt für jede weitere Datei und jeden weiteren Commit des Laufs, auch wenn sie ohne gewählte Datei getroffen wurde; nichts wird gespeichert (nur RAM), nach Neuladen der Seite gilt wieder „beachten“. Der Zustand von „Umbruch“ und „Ansicht“ bleibt unberührt.
- **Lücke aufklappen** (nur in „nur Änderungen“): zwischen zwei Abschnitten zeigt der Diff-Bereich die Zahl der verborgenen Zeilen und ein Bedienelement. Es deckt sie schrittweise (je 20 weitere Zeilen) oder mit „ganz“ auf einmal auf; die aufgedeckten Zeilen sind Kontextzeilen mit Nummer alt und neu. Ohne Betätigung ist die Lücke zu.
- **Herkunft der Zeilen**: die aufgedeckten Zeilen kommen aus den Zeilen der ganzen Datei ([R00008](R00008-ganze-datei-mit-diff.md), `umfang=ganz`); je Datei wird höchstens einmal gelesen, und nur, wenn der Mensch zum ersten Mal aufklappt — nie vorab.
- **Stellen bleiben stabil**: Nummer alt/neu jeder Zeile sind dieselben wie in R00004/R00008 (Nummer neu = Zeile im Stand nach dem Commit); eine Anmerkung hängt an der Nummer neu und bleibt gültig, wenn der Leerraum umgeschaltet oder eine Lücke aufgeklappt wird.
- **Zustand je Datei**: beim Wechsel von Datei oder Commit ist jede Lücke wieder zu (nur RAM).
- **Laden**: eine späte Antwort einer früheren Wahl (Datei, Commit, Ansicht, Leerraum) wird verworfen; das Aufdecken zeichnet keine frühere Antwort.
- **Fehler**: lässt sich die ganze Datei nicht lesen, bleibt die betroffene Lücke zugeklappt mit einer Meldung; Dateiliste, Commit-Leiste und der übrige Diff bleiben bedienbar.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): „Diffs je Datei bei Bedarf“ bleibt gewahrt — die ganze Datei wird nur auf die erste Aufklapp-Betätigung gelesen und je Datei höchstens einmal. Für das Aufdecken selbst gibt es kein neues Zeitkriterium: es ist dieselbe Zeilenrechnung und derselbe Blockaufbau wie in R00008, das seine Grenze (20 000 Zeilen ≤ 1 s, Messwert ≤ 0,7 s) schon trägt.
- **Sicherheit** (`AI-Team/gelerntes.md`): der neue Anfrageparameter geht gegen eine **feste** Liste (unbekannt → 400), wie der Umfang in R00008; `-w` ist ein fester Schalter am selben `git show`/`git log --stdin`-Aufruf, die Schutzoptionen (`--no-ext-diff --no-textconv --ignore-submodules=none`, `--literal-pathspecs`, `refs/replace` aus, `core.fsmonitor=false`, `GIT_NO_LAZY_FETCH=1`), die **Ausgabegrenze** und die Namensprüfung an der Aufrufstelle bleiben unverändert (Lehre #10), ein Name mit Rohbytes geht weiter über stdin (#16, #28); Lückenzahl und aufgedeckte Zeilen sind fremder Text und erscheinen nur über `textContent`, Unsichtbares/Richtungsänderndes als Marke `⟨U+202E⟩`.
- **Logging**: stdout bleibt leer; je Anfrage eine Debug-Zeile auf stderr (Datei, Ansicht, Leerraum-Stellung, ob „ganz“ geladen wurde); Fehler beim Lesen wie R00004.
- **Benutzerfreundlichkeit**: Umschalter und Lücken-Bedienelement sind per Tastatur bedienbar und tragen Namen für Screenreader; Gestaltung aus kanbanD und dem Entwurf Fassung 2, keine eigenen Vorgaben.

## Akzeptanzkriterien

Vorbereitung: **Wegwerf-Repo W** (eigener Ordner im Temp-Verzeichnis, nie das Projekt-Repo; mit `git` allein herstellbar): Commit `w1` „Anlegen“ fügt `leerraum.txt` (`eins`, `zwei`, `drei`, `vier`) und `weit.txt` (`z01` … `z19`, `<b>z20</b>`, `a`+U+202E+`b`, `z22` … `z60`, also 60 Zeilen) hinzu; Commit `w2` „Ändern“ ändert `leerraum.txt` (`zwei` → `  zwei`, `drei` → `drei geaendert`, fügt nach `vier` eine leere Zeile an) und `weit.txt` (`z05` → `Z05`, `z35` → `Z35`). Aufruf `gitreviewA <w2>`; „wählen“ heißt Klick in der Dateiliste, „umschalten“ die andere Stellung des Leerraum-Umschalters. Die Angabe *Ebene* nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Leerraum-Umschalter und Lücken liegen **nicht** auf dem Hot Path (`AI-Team/factory.md`); Playwright nur für Browser-Eigenes (Neuladen, DOM-Sicherheit, Zeit).

### Leerraum ignorieren
- [ ] Gegeben `w2` und `leerraum.txt` in „nur Änderungen“ mit Stellung „beachten“, wenn man auf „ignorieren“ umschaltet, dann stehen vorher sieben Zeilen — `eins` (1/1), `−zwei` (alt 2), `−drei` (alt 3), `+  zwei` (neu 2), `+drei geaendert` (neu 3), `vier` (4/4), `+` leere Zeile (neu 5) — und danach sechs: `eins` (1/1), `  zwei` als **Kontext** (2/2), `−drei` (alt 3), `+drei geaendert` (neu 3), `vier` (4/4), `+` (neu 5); die Einrückungsänderung ist verschwunden, die echte Änderung (`drei`) und die hinzugefügte leere Zeile bleiben. *Ebene: Integration gegen den `DiffLesenInteractor` mit echtem `git` (Zeilen, Art, Nummern) und Oberfläche gegen Fake (Umschalten).*
- [ ] Gegeben dieselbe Datei mit Stellung „ignorieren“, wenn man die Nummern gegen das Orakel hält, dann trägt jede Zeile mit Nummer neu n genau die Zeile n von `git show <w2>:leerraum.txt` (`  zwei` neu 2, `drei geaendert` neu 3, `vier` neu 4, leere Zeile neu 5) und jede Zeile mit Nummer alt m genau die Zeile m von `git show <w1>:leerraum.txt` — in beiden Stellungen dieselben Nummern, also `−drei` alt 3 und `+drei geaendert` neu 3 unverändert. *Ebene: Integration (Orakel über alle Zeilen).*
- [ ] Gegeben `w2`, `leerraum.txt` und „ignorieren“, wenn man eine Anmerkung an `drei geaendert` (neu 3) setzt, dann bleibt sie an derselben Stelle, wenn man auf „beachten“ umschaltet und zurück; die Stellenangabe im Ergebnis (R00002) nennt weiter `leerraum.txt`, Zeile 3. *Ebene: Oberfläche und Integration (Programm als Prozess, Beenden, stdout).*
- [ ] Gegeben `w2` und die Ansicht „ganze Datei“, wenn man `leerraum.txt` mit „ignorieren“ betrachtet, dann stehen fünf Zeilen (`eins` 1/1, `  zwei` 2/2, `drei geaendert` 3/3, `vier` 4/4, leere Zeile 5/5), und `  zwei` ist dort wie in „nur Änderungen“ eine Kontextzeile derselben Nummern. *Ebene: Integration (Endpunkt liefert dieselben Zeilen) und JS-Unit (`ganzeDateiZeilen`).*
- [ ] Gegeben `w2` und „ignorieren“ gewählt, wenn man `weit.txt` und danach den Commit `w1` wählt, dann bleibt „ignorieren“ gestellt (auch ohne gewählte Datei); nach dem Neuladen der Seite steht sie wieder auf „beachten“ und `leerraum.txt` zeigt sieben Zeilen. *Ebene: Oberfläche (Zustand) und Playwright (Neuladen, Browser-Eigenes).*
- [ ] Gegeben `gitreviewA <w2>` (ohne Parameter), wenn man `GET /api/commits/<voller Hash von w2>/diff?pfad=leerraum.txt` anfragt, dann antwortet sie 200 mit den sieben Zeilen (Standard „beachten“); mit `leerraum=ignorieren` 200 mit den sechs Zeilen; mit `leerraum=egal` 400 ohne `git`-Aufruf; die Hash- und Pfadprüfungen aus R00004/R00008 (`nicht-da.txt`, `../README.md`, Kurz-Hash, `HEAD`) antworten unverändert 404. *Ebene: Integration gegen den Endpunkt.*

### Lücke aufklappen
- [ ] Gegeben `w2` und `weit.txt` in „nur Änderungen“, wenn die Seite geladen ist, dann stehen die zwei Abschnitte `@@ -2,7 +2,7 @@` und `@@ -32,7 +32,7 @@` da, und zwischen ihnen nennt eine Lücke **23** verborgene Zeilen (alt/neu 9 bis 31); keine Zeile `z09` bis `z31` steht im Dokument. Rechnung: 31 − 9 + 1 = 23. *Ebene: Integration (Interactor/Endpunkt, Kopfzeilen) und JS-Unit (Lückenrechnung aus den Abschnittsköpfen).*
- [ ] Gegeben dieselbe Lücke, wenn man einmal aufklappt, dann stehen `z09` (alt 9, neu 9) bis `z28` (alt 28, neu 28) als Kontextzeilen da und die Lücke nennt noch **3**; klappt man ein zweites Mal auf, stehen `z29`, `z30`, `z31` (je alt = neu = 29, 30, 31) da und die Lücke ist verschwunden. Rechnung: Schritt 20 von 23, danach 3. *Ebene: JS-Unit (`luecken`) und Oberfläche gegen Fake.*
- [ ] Gegeben dieselbe Lücke, wenn man „ganz“ betätigt, dann stehen alle 23 Zeilen auf einmal da; jede trägt Text und Nummern wie in „ganze Datei“ (Orakel: Nummer neu n = Zeile n von `git show <w2>:weit.txt`), und die beiden Abschnittsköpfe bleiben unverändert. *Ebene: Integration (Interactor/Endpunkt; dieselben Zeilen wie `umfang=ganz`).*
- [ ] Gegeben `gitreviewA <w2> --verbose` und `weit.txt` in „nur Änderungen“, wenn man vor der ersten Betätigung den Diff liest, dann steht auf stderr genau **1** Zeile `GET /api/commits/<voller Hash von w2>/diff` (Umfang „Änderungen“); nach der ersten Aufklapp-Betätigung genau **1** weitere mit Umfang „ganz“; bleibt dieselbe Datei gewählt, kommt kein dritter Lesevorgang dazu. *Ebene: Integration/Prozessprobe (stderr).*
- [ ] Gegeben eine aufgeklappte Lücke in `weit.txt`, wenn man `leerraum.txt` wählt und wieder `weit.txt`, dann ist die Lücke wieder zu (drei Betätigungen nötig, wie beim ersten Mal); ist die Antwort der ganzen Datei um 1,5 s verzögert und wählt man innerhalb der Verzögerung `leerraum.txt`, dann füllt die späte Antwort die Lücke von `weit.txt` nicht. *Ebene: Oberfläche (Zustand) und Playwright (verzögerte Antwort, Browser-Eigenes).*
- [ ] Gegeben `w2` und `weit.txt` mit der Ansicht „ganze Datei“, wenn man dort eine Lücke sucht, dann gibt es keine (die Ansicht zeigt die ganze Datei lückenlos); der Leerraum-Umschalter wirkt dort weiter. *Ebene: Integration (Endpunkt/Rechnung).*

### Fremder Text und Fehler
- [ ] Gegeben die aufgeklappte Lücke in `weit.txt`, wenn man die Zeilen 20 und 21 betrachtet, dann stehen `<b>z20</b>` mit den spitzen Klammern als sichtbarer Text und `a`+Marke `U+202E`+`b` (in dieser Reihenfolge) da, es erscheint kein Dialog, nichts ist fett, kein `img`/`b`-Element entsteht; dasselbe gilt für dieselben Zeilen in der Ansicht „ganze Datei“. *Ebene: Playwright (DOM-Sicherheit, Browser-Eigenes) und Integration (Text bleibt Text).*
- [ ] Gegeben `w2` und die Objektdatei von `w2` ist danach entfernt, wenn man `weit.txt` wählt und aufklappt, dann bleibt die Lücke zu, der Diff-Bereich nennt „Diff konnte nicht gelesen werden“ (R00004), Dateiliste und Commit-Leiste bleiben bedienbar, stdout bleibt leer; nach einem Klick auf `w1` und dort `weit.txt` steht dessen Diff. *Ebene: Integration (entfernter Blob).*

## Betroffene Verzeichnisstruktur

Wie in [R00004](R00004-diff-einer-datei-lesen.md) und [R00008](R00008-ganze-datei-mit-diff.md) (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- `Git/` — `GitLeser.DiffLesen`/`DiffAlsTextLesen` bekommen die Leerraum-Stellung; `Diffumfang` bleibt, ein Wert `Leerraum` kommt dazu; `GitStart` bleibt der einzige Weg zu `git`.
- `Diff/` (bzw. die vorhandene Diff-Schicht) — der `DiffLesenInteractor` nimmt die Leerraum-Stellung und reicht sie durch.
- `Server/` — `GET /api/commits/{hash}/diff` bekommt einen Parameter für die Leerraum-Stellung (feste Liste).
- `web/` — `diff-werte.js` (Lückenrechnung neben `patchZeilen`/`ganzeDateiZeilen`), `diff.js` (Zustand `Leerraum`, Aufklappzustand je Lücke, Anschluss an Färbung/Umbruch/Blockgrenze), Umschalter und Lücken-Bedienelement; Stil `kd-*`.
- `tests/`, `e2e/` — Wegwerf-Repo-Hilfsklasse um Repo W erweitert, DSL `leerraum`/`luecke` und Treiber.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Die Kriterien sind so geschrieben, dass beide Wege (Zeilen aus der ganzen Datei füllen oder den Diff breiter lesen) bestehen oder durchfallen, wo nichts anderes gesagt ist.

### Ablauf
1. **Anfrage prüfen** — wie R00004/R00008 (Hash gegen die Aufrufmenge, Pfad exakt gegen die Dateiliste); zusätzlich die Leerraum-Stellung gegen die feste Liste (unbekannt → 400).
2. **Diff lesen** — derselbe `git show`/`git log --stdin`-Aufruf wie R00004/R00008, mit `-w` bei „ignorieren“; sonst unverändert (Schutzoptionen, Ausgabegrenze, Rohbyte-Weg über stdin).
3. **Zeilen und Lücken rechnen** — `patchZeilen` wie bisher; zusätzlich je Abschnitt die Lücke zum nächsten (Zahl und Nummernspanne aus den Köpfen) und der Aufklappzustand.
4. **Lücke füllen** — beim ersten Aufklappen die ganze Datei lesen (`umfang=ganz`, R00008) und die verborgene Spanne daraus als Kontextzeilen einsetzen; schrittweise 20 Zeilen oder ganz.
5. **Oberfläche** — Leerraum-Umschalter und Lücken-Bedienelement; Abgleich später Antworten um `Leerraum` erweitert; Wechsel von Datei oder Commit schließt die Lücken.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `GitLeser` (Lesen mit `-w`), `DiffLesenInteractor` (Leerraum-Stellung durchreichen), Endpunkt `GET /api/commits/{hash}/diff`, `web/diff-werte.js` und `web/diff.js`.

- `Leerraum` (Wert, rein) — `Beachten` | `Ignorieren`; Prüfung des Parameters gegen die feste Liste.
- `GitLeser` — `DiffLesen(hash, datei, umfang, leerraum, arbeitsordner[, grenze])` (erweitert); setzt `-w` nur bei `Ignorieren`.
- `Luecke` (DTO, immutable) — Nummernspanne alt/neu und Zahl der verborgenen Zeilen.
- `Luecken` (benannte Collection) — die Lücken einer Ansicht in Reihenfolge; `Aufklappzustand` je Lücke.
- JS `luecken-werte.js` (Operation, rein, läuft unter Node und im Browser) — `Luecken(zeilen)`, `aufgedeckt(luecke, zustand, zeilenDerGanzenDatei)`.
- `DiffLesenInteractor` (Integration) — nimmt die Leerraum-Stellung, gibt sie über die Diffquelle weiter.

### Änderungen an bestehenden Klassen
`GitLeser.DiffLesen`/`DiffAlsTextLesen` und die drei Startmethoden (`GitShowDiffStart`, `GitLogStdinDiffStart`, `GitDiffStdinStart`) um die Leerraum-Stellung erweitert (ein Flag `-w`); `DiffLesenInteractor` und der Endpunkt um den Parameter; `web/diff-werte.js` um die Lückenrechnung, `web/diff.js` um Zustand `Leerraum`, Aufklappzustand und Anschluss an Färbung/Umbruch/Blockgrenze. `patchZeilen`, `ganzeDateiZeilen`, `sichtbarTeile`, `bloecke`, `zuLang`, die Färbung (`faerben.js`) und der Hakenspeicher bleiben unberührt.

### Messung des Zeitkriteriums
Kein neues Zeitkriterium: das Aufdecken nutzt die schon gemessene Zeilenrechnung und den Blockaufbau von R00008 (20 000 Zeilen ≤ 1 s, Messwert ≤ 0,7 s); gemessen wird nur, dass die ganze Datei **einmal je Datei und erst auf Betätigung** gelesen wird (Kriterium „Laden bei Bedarf“, Prozessprobe über stderr).

## Tests
Nach `~/.claude/skills/test-pyramide/SKILL.md` und der ATDD-Regel des Projekts (`AI-Team/factory.md`): je Kriterium zuerst die Spezifikation in Fachsprache, dann DSL, Treiber, System — in den vorhandenen Schichten von `e2e/`, Testnamen „soll …“.

**Unit (pure Logik):**
- `Leerraum`-Prüfung (feste Liste, unbekannter Wert abgelehnt).
- JS `luecken-werte.js` — Lückenrechnung aus den Köpfen (zwei Abschnitte, ein Abschnitt ohne Lücke, Lücke als erste/letzte Zeile), Aufdecken schrittweise (20/20/3) und ganz (23), Zeilen aus der ganzen Datei füllen (Orakel Nummer neu → Zeile).
- `ganzeDateiZeilen` mit `-w` (Leerraum-Zeile als Kontext), Nummernstabilität.

**Integration (gegen `DiffLesenInteractor` mit echtem `git` im Wegwerf-Repo W):**
- `GitLeser.DiffLesen` mit und ohne `-w` — dieselben sieben bzw. sechs Zeilen, Nummern gegen `git show <hash>:<pfad>` je Zeile.
- Endpunkt: 200/400 (Leerraum-Parameter), Pfadliste der Kriterien (404 ohne `git`), Debug-Zeile je Anfrage.
- Marker-Skript- und Konfigurationsprobe bleiben (der Aufruf ist derselbe); Rohbyte-Name weiter über stdin (#16/#28); Grenzprobe (Ausgabegrenze) unverändert.
- Lücke: aufgedeckte Zeilen identisch zu `umfang=ganz`; Prozessprobe stderr (1 + 1 Lesevorgang).

**E2E (Playwright headless, nur Browser-Eigenes, kein Hot Path):** Umschalter (Tab, Name), Neuladen setzt auf „beachten“, Lücken-Bedienelement und Fokus, verzögerte Antwort über `route`, DOM-Sicherheit der aufgedeckten fremden Zeilen (`<b>z20</b>`, Marke `U+202E`).

## Abhängigkeiten
- Abhängig von: I0006 Diff einer Datei lesen (R00004, grün), I0022 Ganze Datei mit Diff (R00008, grün — `Braucht I0022`, Entscheidung des product-owners 2026-11-24, Zeile 46).
- Blockiert: I0015 (Tastaturbedienung nimmt die Taste des Leerraum-Umschalters und des Lücken-Bedienelements in die Belegung auf); I0027 (Oberfläche Liste–Detail übernimmt den Umschalter in den Diff-Werkzeugkasten wie „Umbruch“ und „Ansicht“).

Nicht Teil dieser Anforderung (eigene Karten): freie Kontextbreite (breiterer Kontext je Abschnitt), Aufklappen in „ganze Datei“, Wortdiff je Zeile, Leerraum-Ausblenden über die Repo-Konfiguration, Ausblenden ganzer Leerraum-Dateien, Sprung zur nächsten Lücke per Tastatur (I0015).

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort):

1. **Welche `git`-Stellung heißt „Leerraum ignorieren“?** Empfehlung: **`-w`** (`--ignore-all-space`, eine Stellung) — deckt Einrückung, Tabs gegen Leerzeichen und Leerzeichen am Zeilenende ab, ist der eine vertraute Schalter (GitHub „Hide whitespace“) und lässt hinzugefügte/entfernte leere Zeilen sichtbar (Struktur, kein Leerraum innerhalb einer Zeile). Gemessen (`git` 2.48.1, Wegwerf-Repo): `-b` (`--ignore-space-change`) blendet eine hinzugefügte oder entfernte Einrückung **nicht** aus (`  zwei` bleibt eine Änderung), `--ignore-blank-lines` blendet nur reine Leerzeilen-Änderungen aus. Alternativen: `-b` (nur Mengenänderungen), `-w --ignore-blank-lines` (auch Leerzeilen-Änderungen). Alle drei lassen die Nummern alt/neu unverändert (gemessen).
2. **Ort des Umschalters**: neben „Umbruch“/„Ansicht“ im heutigen Diff-Bereich (Empfehlung: ja, dann kein `Braucht I0027`; I0027 übernimmt ihn später in den Diff-Werkzeugkasten, wie „Umbruch“ und „Ansicht“), oder gleich in die Gruppe des neuen Werkzeugkastens (`Braucht I0027`, wie die Anordnung in I0007)? Der Entwurf Fassung 2 zeichnet „Leerraum“ nicht.
3. **Schrittweite beim Aufklappen**: **20** Zeilen je Betätigung (Empfehlung) — kanbanD hat für Lücken kein Vorbild (`aufklappPlan` betrifft das Anwenden großer Diffs). Alternativen: 10, 50.
4. **Lücken am Dateianfang und -ende** (vor dem ersten bzw. nach dem letzten Abschnitt): auch aufklappen (Empfehlung: ja, dieselbe Mechanik, kein neuer Umfang) oder nur „zwischen zwei Abschnitten“ (der Wortlaut des Fertig-Kriteriums)? Die Kriterien prüfen bisher nur die Lücke zwischen zwei Abschnitten.
5. **Sehr große Lücke**: darf „ganz“ eine Lücke über 20 000 Zeilen aufdecken (I0014 klappt große **Patches** zu)? Empfehlung: ja — die Zuklappgrenze misst den gelieferten Patch, nicht die aufgeklappten Zeilen, und die Blockgrenze (5 000 Knoten) trägt das Zeichnen; beim Bauen zu messen.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001/R00004/R00008 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unterhalb I0009 (B2501–B2508), davon 3 klar (2 h) und 5 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 26 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; die Richtwerte sind ein Vielfaches davon. Enthalten: nur I0009. Keine Ausbaustufen. Der Slice liegt mit acht Bubbles an der Grenze; der Ausweg im Bau ist der Schnitt „Leerraum“ / „Lücken“ (siehe Offene Fragen und WBS-Notiz).

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: eine KI hat umformatiert (Einrückung, Tabs, Leerzeichen), und der Diff zeigt zwanzig Zeilen, von denen neunzehn nichts bedeuten — oder zwischen der einen echten Änderung und der nächsten liegt genau die Klammer, die man sehen muss, und der Diff zeigt dort nur drei Zeilen. Wenn der Diff auf Wunsch mit `-w` vergleicht und reine Leerraum-Änderungen zu Kontext macht, und wenn der Mensch die verborgene Lücke zwischen zwei Abschnitten schrittweise oder ganz aufdecken kann, dann sieht er nur noch, was zu prüfen ist, ohne die Datei im Editor zu öffnen und Zeilennummern abzugleichen. Beides ist gerade deshalb der richtige Hebel, weil es **keine** zweite Leserechnung und keinen neuen Zeilenaufbau braucht: `-w` ist ein Schalter am bestehenden `git`-Aufruf, und die aufgedeckten Zeilen sind dieselben Zeilen der ganzen Datei, die R00008 schon liest — die Nummer **neu** jeder Zeile bleibt die Stellenangabe, die das Ergebnis nach R00002 an die KI zurückgibt. Ohne diese beiden Schalter bleibt das Review an Formatierungsrauschen hängen und lässt das Wesentliche zwischen zwei Abschnitten ungesehen — der Rückkanal an die KI bliebe an genau der Stelle leer, an der ein Mensch die Änderung hätte ablehnen sollen.

## Missing-Docs
- Ob `-w` in `git show`/`git log --stdin` mit `-U2147483647` (ganze Datei) und mit `--inter-hunk-context=0` genau das Verhalten zeigt, das die Kriterien annehmen (Leerraum-Zeile wird Kontext, Nummern unverändert) — mit `git` 2.48.1 für `-U3` gemessen (siehe oben), für „ganze Datei“ vor dem Bauen proben.
- Ob das Aufdecken einer Lücke über 20 000 Zeilen und die Zuklappgrenze aus I0014 zusammenpassen (Zuklappen misst den gelieferten Patch) — beim Bauen entscheiden.

## Notizen

### Optionen (welche `git`-Stellung)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. `-w` (`--ignore-all-space`), eine Stellung (gewählt)** | am `DiffLesenInteractor` mit Wegwerf-Repo prüfbar (sieben gegen sechs Zeilen), Nummern gegen `git show` je Zeile | gering: ein Flag am bestehenden Aufruf; hinzugefügte leere Zeilen bleiben sichtbar (gewollt) | klein |
| 2. `-b` (`--ignore-space-change`) | prüfbar | mittel: blendet hinzugefügte/entfernte Einrückung nicht aus (gemessen) — verfehlt den Zweck „Whitespace ausblenden“ | klein |
| 3. `-w --ignore-blank-lines` | prüfbar | geringe Mehrkosten; versteckt auch reine Leerzeilen-Änderungen, die eine Struktur zeigen | klein |

Gewählt: 1 — der eine vertraute Schalter, deckt das Rauschen ab, lässt Strukturänderungen (leere Zeile) sichtbar; `--ignore-blank-lines` bleibt als spätere Erweiterung offen (offene Frage 1).

### Optionen (Herkunft der aufgedeckten Zeilen)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. aus den Zeilen der ganzen Datei (I0022, `umfang=ganz`), je Datei einmal auf Betätigung (gewählt)** | aufgedeckte Zeilen identisch zu „ganze Datei“; Lesevorgänge zählbar (stderr) | gering: eine Zeilenrechnung, kein neuer Serverweg; die ganze Datei wird einmal geladen (auf Wahl) | klein |
| 2. Diff mit größerem Kontext erneut lesen (`-U` je Aufklappen) | prüfbar | mittel: mehrere Lesungen je Datei, die Abschnitte verschieben sich (die Lücke wandert), Deckung mit der ganzen Datei doppelt | mittel |
| 3. Server liefert von Anfang an mehr Kontext als nötig | — | verletzt „bei Bedarf“: jeder Diff kostet mehr, als der Mensch sieht | klein |

Gewählt: 1 (Entscheidung des product-owners, Zeile 46: „Lücke … aus den Zeilen der ganzen Datei“; R00008 Offene Fragen 4). **Option 2** ist der Rückfall, wenn eine Lücke über die Zuklappgrenze hinausgeht (offene Frage 5).

### Verworfene Alternativen
- **`-b` als Stellung**: blendet eine hinzugefügte oder entfernte Einrückung nicht aus (gemessen) — verfehlt den Zweck.
- **Nur `--ignore-blank-lines`**: trifft nur reine Leerzeilen-Änderungen, nicht das häufige Rauschen der Einrückung.
- **Aufklappen in „ganze Datei“**: dort gibt es keine Lücken; die Ansicht zeigt schon alles.
- **Freie Kontextbreite je Abschnitt (statt `-w` und Aufklappen)**: wäre eine zweite Leserechnung mit `-U`-Variablen; der Kontext-Teil ist bewusst auf „Lücke aufklappen“ aus den Zeilen der ganzen Datei beschränkt (product-owner, Zeile 46).
- **Zwei Slices „Leerraum“ und „Lücken“**: erwogen (jede Hälfte ist für sich nützlich und parallel baubar). Bewusst **nicht** geschnitten: acht Bubbles liegen an der Grenze, nicht darüber, und der product-owner hat beide Teile ausdrücklich in I0009 gelassen (Zeile 46). Der Schnitt bleibt der Ausweg im Bau: I0009 behielte `-w`, eine neue Interaction „Lücken aufklappen“ (ab I0032) bekäme die Lücken-Seite mit eigenem Requirement.
