---
id: R00017
status: Neu
datum: 2026-11-24
---

# R00017: Große Diffs

## Beschreibung

Wählt der prüfende Mensch eine Datei, deren Diff sehr groß ist, bleibt die Oberfläche flüssig: gitreviewA zeigt die Datei **zugeklappt** mit der Zahl der Diff-Zeilen und dem Knopf „Trotzdem laden“; erst dieser zeichnet die Zeilen. Das gilt in beiden Ansichten („nur Änderungen“ und „ganze Datei“, [R00008](R00008-ganze-datei-mit-diff.md)). Über eine harte **Ausgabegrenze** hinaus liest der Server den Diff gar nicht erst vollständig: statt eines still gekürzten Patches meldet er einen klaren Ausgang („zu groß“), damit ein feindlich großes Repository weder den Server (Speicher) noch den Browser (Einfrieren) lahmlegt. Beim Zeichnen werden lange Diffs in **Blöcke** zerlegt, deren Grenze an der Zahl der DOM-Knoten hängt — so bleibt auch das Scrollen durch dichte gefärbte Blöcke flüssig.

Zahlt ein auf: [Vision](R00000-vision.md) — Leitplanke Lastprofil (20 000 Diff-Zeilen je Datei flüssig, darüber zugeklappt mit „trotzdem laden“, Dateiwechsel ≤ 1 s an der Obergrenze) und Leitplanke Sicherheit (fremdes Repo: eine feindlich große Datei darf den Lauf nicht lahmlegen).

Baut auf [R00004](R00004-diff-einer-datei-lesen.md) auf (I0006: Zeilenrechnung `patchZeilen`, Blöcke zu 500 Zeilen, Umbruch, Verwerfen später Antworten) und auf [R00008](R00008-ganze-datei-mit-diff.md) (I0022: zweite Ansicht „ganze Datei“). Die Blockgrenze berührt die Färbung aus [R00007](R00007-syntaxhervorhebung.md) (I0008).

**Herkunft:** Der Slice I0014 „Große Diffs“ der WBS. Aufgenommen sind **drei offene Sollte aus den Reviews**:
1. „ganze Datei“ las ohne Grenze (gemessen: 40 MB / 3 Mio. Zeilen → 46,9 MB Antwort, 1,6 GB RSS, Browser ~33 s blockiert). Empfehlung des `security-reviewer`: **Ausgabegrenze beim Lesen von `git`** (Bytes, klarer Ausgang statt stillem Kürzen) und der Ausgang „zu groß“ für **alle** Textdateien, nicht nur bei „Als Text“.
2. Das Scrollen durch dichte gefärbte Blöcke kostete bis 0,8 s je Block (Blöcke wurden nach Zeichen bemessen). Empfehlung: **Blockgrenze an der Knotenzahl** (etwa 5 000 je Block).
3. `GitLeser` hat weder Frist noch Ausgabegrenze (Altlast). **Entschieden:** die **Ausgabegrenze** gehört zu diesem Slice (sie ist genau der Schutz großer Diffs); die **Frist** ist eine Leitplanke für **jeden** `git`-Aufruf und wird als eigene Karte vorgeschlagen (Vorschlag im Bericht an den Director, nicht Teil dieser Anforderung).

**Betreiber-/PO-Entscheidung:** product-owner 2026-11-24 (`AI-Team/po-entscheidungen.md` Zeile 44): „bis I0014 vollständig laden wie in R00004; I0014 (Große Diffs) gilt danach für beide Ansichten, kein zweites Verfahren“.

## Geschäftlicher Nutzen

Der Auslöser: der Prüfer liest in einem KI-geschriebenen Commit eine große Datei — eine erzeugte Tabelle, eine migrierte Datei, ein generiertes Bündel. Heute friert die Oberfläche dabei ein oder der Server zieht Hunderte Megabyte in den Speicher, weil die Datei ungebremst geladen wird. Mit dieser Anforderung sieht der Prüfer zuerst, **wie groß** die Änderung ist, entscheidet selbst, ob er sie lädt, und kann auch die größte Datei noch ansehen, ohne den Lauf zu verlieren. Zugleich schützt die Ausgabegrenze den Lauf gegen ein feindliches Repository, das eine 40-MB-Datei bereitstellt, um den Speicher zu sprengen — die Oberfläche und die Rückmeldung an die KI bleiben benutzbar.

## Funktionale Anforderungen

- **Zuklappen über der Grenze**: hat der Patch einer Textdatei mehr als 20 000 Diff-Zeilen (oder überschreitet die Zeichen- bzw. Markengrenze), zeigt der Diff-Bereich die Datei **zugeklappt**: einen Hinweis mit der Zahl der Diff-Zeilen und den Knopf „Trotzdem laden“ statt der Zeilen. Erst der Klick auf „Trotzdem laden“ zeichnet die Zeilen. Beim Start und nach dem Wechsel von Datei, Commit oder Ansicht gilt wieder der Zuklappzustand (nichts wird gespeichert, nur RAM).
- **Beide Ansichten**: Zuklappen und „Trotzdem laden“ gelten in „nur Änderungen“ und in „ganze Datei“ mit demselben Verfahren; die Grenze wird am Patch der **gezeigten Ansicht** gemessen (dieselbe Datei kann in „nur Änderungen“ unter und in „ganze Datei“ über der Grenze liegen).
- **Ausgabegrenze beim Lesen**: der Server liest die Ausgabe von `git` nur bis zu einer festen **Bytegrenze**. Ist die Ausgabe größer, endet der Lauf für diese Datei mit einem klaren Ausgang **„zu groß“** (Meldung, die die Grenze nennt) und **ohne** Patch — nie mit einem still gekürzten Patch. Die Grenze gilt für **jeden** Text-Lesepfad („nur Änderungen“, „ganze Datei“, „Als Text“). Ein Laufzeitfehler beim Lesen bleibt „Diff konnte nicht gelesen werden“ (R00004); „zu groß“ ist ein eigener Ausgang.
- **Dateiwechsel an der Obergrenze**: der Wechsel auf eine zugeklappte Datei (und zurück) zeigt den Zuklappzustand ≤ 1 s nach dem Klick — er wartet **nicht** auf das Laden der Zeilen. Das Laden über „Trotzdem laden“ hat keine Zeitgrenze (es kann einige Sekunden dauern), darf aber die Oberfläche nicht einfrieren.
- **Flüssiges Zeichnen**: die Zeilen eines langen Diffs werden in Blöcke zerlegt, deren Grenze an der Zahl der DOM-Knoten hängt (etwa 5 000 Knoten je Block), nicht an den Zeichen. Blöcke außerhalb des Bildes werden nicht ausgelegt und nicht gemalt (`content-visibility`), sodass auch das Scrollen durch dichte gefärbte Blöcke ohne lange Aufgabe des Hauptfadens bleibt.
- **Text unverändert**: Zuklappen und „Trotzdem laden“ ändern den Text, die Zeilennummern, die Marken für Unsichtbares und den Zustand von „Umbruch“/„Ansicht“ nicht; die geladenen Zeilen sind genau die, die eine kleine Datei zeigte.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): Dateiwechsel an der Obergrenze ≤ 1 s (Messwert ≤ 0,7 s, ≥ 30 % Abstand, `rollen/planer/zeitkriterien.md`); während des Scrollens durch einen langen, dichten, gefärbten Diff dauert keine Aufgabe des Hauptfadens länger als 150 ms (Long Tasks, wie R00007).
- **Sicherheit** (`AI-Team/gelerntes.md`): das geprüfte Repository ist fremd. Die Ausgabegrenze schützt **beide** Seiten — den Server vor unbegrenztem Speicher (1,6 GB gemessen) und den Browser vor einem 46,9-MB-Rumpf; sie ist ein **Abbruch beim Lesen**, kein Kürzen (der Rumpf ist ganz oder gar nicht). `git` läuft weiter nur über `GitStart` mit Argumentliste und den Schutzoptionen; die Block- und Zuklapplogik erzeugt keine neue Anfrage an `git` und keinen neuen Endpunkt. Die Zahl im Zuklapphinweis und die geladenen Zeilen sind fremder Text und erscheinen nur über `textContent`.
- **Logging**: stdout bleibt leer; je Anfrage eine Debug-Zeile auf stderr (Datei, Ansicht, ob zugeklappt oder zu groß); ein Überschreiten der Ausgabegrenze ist kein Fehler, sondern ein Ausgang (Stufe Debug oder Warnung, nie Error mit Stacktrace).
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und dem Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`, Zustand „Große Datei zugeklappt“); keine eigenen Vorgaben; der Zuklapphinweis und „Trotzdem laden“ sind per Tastatur bedienbar und tragen Namen für Screenreader.

## Akzeptanzkriterien

Vorbereitung (herstellbar mit `git` allein; alle Dateien enden mit Zeilenumbruch): **Repo U** — ein Commit `w`, der alle Prüfdateien **hinzufügt** (so erscheinen sie in beiden Ansichten gleich): `gross.txt` (genau 20 000 Zeilen `zeile 00001` … `zeile 20000`, je 11 Zeichen), `riesig.txt` (30 000 Zeilen `zeile 00001` … `zeile 30000`), `winzig.txt` (drei Zeilen `eins`, `zwei`, `drei`), `dicht.js` (200 Zeilen zu je ~1 000 Zeichen aus vielen kurzen JS-Token, z. B. `a1=1;` wiederholt — viele Farbstücke je Zeile, zusammen unter der Zeichen- und Zeilengrenze). Der Aufruf ist `gitreviewA w`; „wählen“ heißt Klick in der Dateiliste. Für die Ausgabegrenze wird die Grenze über einen internen Parameter (kein Produktwert) klein gesetzt, damit kein 40-MB-Repo entstehen muss (Muster aus kanbanD).

### Zuklappen (beide Ansichten)
- [ ] Gegeben Repo U und `w` gewählt, wenn man `gross.txt` (genau 20 000 Diff-Zeilen) wählt, dann stehen die Zeilen da (nicht zugeklappt, `zeile 20000` mit neu 20000); wenn man `riesig.txt` (30 000 Diff-Zeilen) wählt, dann steht im Diff-Bereich ein Zuklapphinweis, der 30 000 nennt und den Knopf „Trotzdem laden“ zeigt, und keine Diff-Zeile von `riesig.txt` ist im Dokument. *Ebene: Unit (Rechnung `zuLang`, 20 000/20 001), Integration (Interactor liefert den Patch) und Playwright (Zuklappen im Browser, Browser-Eigenes).*
- [ ] Gegeben `riesig.txt` zugeklappt, wenn man „Trotzdem laden“ betätigt, dann stehen die Zeilen da und `zeile 30000` (neu 30000) ist im Dokument, und der Zuklapphinweis ist verschwunden. *Ebene: Playwright (Browser-Eigenes).*
- [ ] Gegeben `riesig.txt` zugeklappt und `winzig.txt` gewählt, wenn man auf `riesig.txt` wechselt, dann steht der Zuklappzustand spätestens 1 s nach dem Klick im Dokument (Messwert ≤ 0,7 s; gemessen vom Klick bis der Hinweis steht, ereignisgenau) — der Wechsel wartet nicht auf das Laden. Wechselt man danach auf `gross.txt`, steht dessen Diff ≤ 1 s (Messwert ≤ 0,7 s). *Ebene: Playwright (Zeit am Browser, ereignisgenau).*
- [ ] Gegeben die Ansicht „ganze Datei“ gewählt (R00008), wenn man `riesig.txt` wählt, dann steht derselbe Zuklapphinweis wie in „nur Änderungen“; schaltet man auf „nur Änderungen“ und zurück, wird der Zuklappzustand je Ansicht neu bewertet, und die zuvor geladene Zeilenmenge wird verworfen (keine stehen gebliebenen Zeilen). *Ebene: Playwright (Umschalten, verzögerte Antwort über `route`).*
- [ ] Gegeben `riesig.txt` zugeklappt, wenn man „Trotzdem laden“ betätigt und die Antwort des Servers um 1,5 s verzögert ist, dann steht danach die geladene Zeilenmenge und keine frühere; wählt man innerhalb der Verzögerung `winzig.txt`, steht am Ende dessen Diff und nicht die späte Antwort von `riesig.txt`. *Ebene: Playwright (verzögerte Antwort, Browser-Eigenes).*

### Ausgabegrenze beim Lesen
- [ ] Gegeben die Ausgabegrenze über einen internen Parameter klein gesetzt und ein Diff, der sie überschreitet, wenn der `DiffLesenInteractor` den Diff liest, dann liefert er den Ausgang „zu groß“ mit einer Meldung, die die Grenze nennt, und **keinen** Patch; der zurückgegebene Patch ist nie eine gekürzte Fassung der `git`-Ausgabe (ganz oder gar nicht). *Ebene: Integration gegen `DiffLesenInteractor` mit echtem `git` im Wegwerf-Repo.*
- [ ] Gegeben dieselbe kleine Ausgabegrenze, wenn der Diff in „nur Änderungen“, in „ganze Datei“ und in „Als Text“ (Binärdatei mit `--text`) gelesen wird, dann greift die Grenze in allen drei Wegen gleich (Ausgang „zu groß“, kein Patch). *Ebene: Integration.*
- [ ] Gegeben eine Datei über der Ausgabegrenze und die Ansicht im Browser, wenn man sie wählt, dann steht im Diff-Bereich die Meldung „zu groß“ (mit der Grenze), die Dateiliste und die Commit-Leiste bleiben bedienbar, und der Speicherbedarf des Servers bleibt beschränkt (Messung im Bericht). *Ebene: Integration/Prozess (Speicher) und Playwright (Meldung, Browser-Eigenes).*
- [ ] Gegeben ein Diff, dessen `git`-Ausgabe sich nicht lesen lässt (z. B. entfernte Objektdatei), wenn man die Datei wählt, dann steht „Diff konnte nicht gelesen werden“ (R00004) und **nicht** „zu groß“ — die beiden Ausgänge sind unterscheidbar. *Ebene: Integration.*

### Flüssiges Zeichnen (Blockgrenze)
- [ ] Gegeben `dicht.js` (200 dichte, gefärbte Zeilen) geladen und gezeigt, wenn man durch den Diff scrollt, dann dauert keine Aufgabe des Hauptfadens länger als 150 ms (Long Tasks, `PerformanceObserver`); die Positivkontrolle (Mutant „Blockgrenze nach Zeichen statt Knoten“) erzeugt eine Aufgabe über der Grenze. *Ebene: Playwright (Long Tasks im Browser, Browser-Eigenes; Positivkontrolle).*
- [ ] Gegeben `riesig.txt` geladen über „Trotzdem laden“, wenn man den Text, die Nummern, die Zeilenart und die Marken mit einer kleinen Datei vergleicht, dann sind sie gleich (Zuklappen und Laden ändern den Text nicht), und die Zeilen erscheinen in Blöcken, deren Knotenzahl je Block die Grenze (etwa 5 000) nicht überschreitet. *Ebene: Integration (Blockzerlegung, rein) und Playwright (Textgleichheit).*

### Fremder Text
- [ ] Gegeben ein Repository mit `diff.external` und einem `textconv`-Marker (wie R00004), wenn man eine zugeklappte Datei wählt und „Trotzdem laden“ betätigt, dann ist keine Markerdatei entstanden (kein Programmstart), und die Zahl im Zuklapphinweis sowie die geladenen Zeilen stehen als Text (spitze Klammern sichtbar, kein Dialog, kein `img`/`b`). *Ebene: Integration (Marker-Probe) und Playwright (Fremdtext, Browser-Eigenes).*

## Betroffene Verzeichnisstruktur

Wie in R00004 und R00008 (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- `Git/` — `GitLeser`/`GitStart` lesen die Ausgabe mit einer Bytegrenze und brechen darüber ab; `GitStart` bleibt der einzige Weg zu `git`.
- `Diff/` — `Diffantwort`/`Differgebnis` und `DiffLesenInteractor` bekommen den Ausgang „zu groß“; der Endpunkt `GET /api/commits/{hash}/diff` meldet ihn.
- `web/` — `diff-werte.js` (`zuLang` für alle Textdateien, `bloecke` nach Knotenzahl) und `diff.js` (Zuklappzustand, „Trotzdem laden“).
- `tests/`, `e2e/` — Wegwerf-Repo-Hilfsklasse um `riesig.txt`/`dicht.js` und die kleine Ausgabegrenze erweitert; DSL und Treiber.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Anfrage prüfen** — wie R00004 (Hash gegen die Aufrufmenge, Pfad exakt gegen die Dateiliste; kein Treffer → 404 ohne `git`-Aufruf).
2. **Diff lesen mit Grenze** — `git`-Ausgabe bis zur Bytegrenze lesen; über der Grenze den Prozess beenden und `ZuGross` melden (nie kürzen). Der Ausgang reist durch `GitDiffquelle`/`IDiffquelle` bis `DiffLesenInteractor`.
3. **Ausgang** — `Gelesen` (Patch ganz), `ZuGross` (Meldung, kein Patch), `NichtGefunden`, `NichtLesbar` (unverändert).
4. **Oberfläche** — nach der Antwort: Zuklappgrenze der **gezeigten** Ansicht prüfen (`zuLang`); über der Grenze den Zuklappzustand zeigen, sonst zeichnen; „Trotzdem laden“ zeichnet die bereits empfangenen Zeilen; Blöcke nach Knotenzahl; späte Antworten verwerfen (Commit, Pfad, Ansicht).

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `GitLeser` (Lesen mit Grenze), `DiffLesenInteractor` (Ausgang), Endpunkt `GET /api/commits/{hash}/diff`, `web/diff-werte.js` und `web/diff.js`.

- `Ausgabegrenze` (Wert, rein) — die Bytegrenze als eine Konstante/ein Feld; über einen internen Parameter für Tests verkleinerbar (Muster kanbanD `GRENZE_EINZELN`).
- `GitLeser` (Ressourcenzugriff, wirft) — `DiffLesen`/`DiffAlsTextLesen` lesen mit der Grenze; über der Grenze → eigene Ausnahme/Ergebnis „zu groß“ statt `ReadToEnd()`.
- `Diffausgang` (Enum) — erweitert um `ZuGross`; `Differgebnis` trägt Meldung und Grenze.
- `DiffLesenInteractor` (Integration) — gibt `ZuGross` als eigenen Ausgang zurück (nicht `NichtLesbar`).
- `DiffEndpunkt` (Integration) — bildet `ZuGross` auf die Antwort ab (200 mit Kennzeichen und Meldung).
- `diff-werte.js` — `zuLang(zeilen)` gilt für jede Textdatei (nicht mehr nur `alsText`); `bloecke(zeilen)` begrenzt zusätzlich nach Knotenzahl.
- `diff.js` — `zeigeZugeklappt`/`klappeAuf` werden der endgültige Zuklappzustand (heute „vorläufig bis I0014“).

### Änderungen an bestehenden Klassen
- `GitLeser.DiffLesen`/`DiffAlsTextLesen`: statt `ReadToEnd()` ein Lesen mit Bytegrenze; über der Grenze den Prozess beenden.
- `Diffantwort`/`Differgebnis`/`Diffausgang`: neuer Ausgang „zu groß“.
- `diff-werte.js` `zuLang`: Aufruf für alle Textdateien; `bloecke`: Knotenzahl-Grenze.
- `diff.js` `zeichneAntwort`: `zuLang` für alle Textdateien; `zeigeZugeklappt` nennt Zahl und Grenze.

## Tests

Nach `~/.claude/skills/test-pyramide/SKILL.md` und der ATDD-Regel des Projekts (`AI-Team/factory.md`): je Kriterium zuerst die Spezifikation in Fachsprache, dann DSL, Treiber, System.

**Unit (pure Logik):**
- `zuLang` an den Grenzen (20 000/20 001 Zeilen, 262 144/262 145 Zeichen, 10 000/10 001 Marken; Kopfzeilen zählen nicht).
- `bloecke` nach Knotenzahl (dichte Zeilen → kleinere Blöcke; eine Zeile allein über der Grenze bleibt ein Block).
- `Ausgabegrenze`-Prüfung (knapp unter/über).

**Integration (gegen `DiffLesenInteractor` mit echtem `git` im Wegwerf-Repo):**
- Ausgabegrenze klein gesetzt: Diff über der Grenze → `ZuGross`, kein Patch, kein gekürzter Rumpf; unter der Grenze → vollständiger Patch (Kontrolle).
- Grenze greift in „nur Änderungen“, „ganze Datei“ und „Als Text“.
- „zu groß“ und „Diff konnte nicht gelesen werden“ sind unterscheidbar (entfernte Objektdatei → `NichtLesbar`).
- Marker-Skript-Probe (`diff.external`, `textconv`) für den Lesepfad mit Grenze.
- Speicherbedarf: Datei über der Grenze → beschränkter RSS (Messung im Bericht).

**E2E (Playwright headless, Fenster 1280 × 800):**
- Zuklappen und „Trotzdem laden“ (`riesig.txt`), Zeitkriterien ereignisgenau, verzögerte Antwort über `route`, Ansichtswechsel.
- `dicht.js`: Long Tasks beim Scrollen mit Positivkontrolle (Mutant „Zeichen- statt Knotengrenze“).
- Fremdtext und Marker über die Oberfläche.

## Abhängigkeiten
- Abhängig von: I0006 Diff einer Datei lesen (R00004, grün), I0022 Ganze Datei mit Diff (R00008, grün), I0008 Syntaxhervorhebung (R00007, grün — die Blockgrenze betrifft die gefärbten Blöcke).
- Blockiert: nichts. I0010 (Zusammen) und I0027 (Oberfläche) lesen über denselben Diff-Weg und erben die Grenze.

Nicht Teil dieser Anforderung: die **Frist** für `GitLeser` (Altlast; als eigene Karte vorgeschlagen — sie gilt für jeden `git`-Aufruf, nicht nur für große Diffs); Syntaxfarben selbst (I0008); Nebeneinander (I0007); eine Anzeige des Datei-Inhalts ohne Diff; ein Fortschrittsbalken beim Laden; eine Aufrufoption für die Grenze.

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort; keine blockiert den Bau):

1. **Zuklappgrenze**: 20 000 Diff-Zeilen (Vision) **und** die bestehenden Grenzen 262 144 Zeichen / 10 000 Marken beibehalten? Empfehlung: ja — die Zeilengrenze ist die Vision, die Zeichen- und Markengrenze schützen den DOM (viele Knoten je Zeile); sie stehen schon im Code (`diff-werte.js`). Alternative: nur die Zeilengrenze.
2. **Ausgabegrenze beim Lesen (Bytes)**: Empfehlung **8 MiB** (kanbanD `GRENZE_EINZELN`, ein erprobter Wert). Herleitung: eine Datei an der Zuklappgrenze ist ~0,3 MB, ein feindliches 40-MB-Repo liegt 5× darüber; die Grenze ist damit groß genug, dass „Trotzdem laden“ für eine zugeklappte Datei noch funktioniert, und klein genug, dass der Speicher beschränkt bleibt. Alternative: die Grenze an die Zuklappgrenze koppeln (dann ist jede zugeklappte Datei auch nicht ladbar — der Knopf verlöre seinen Sinn).
3. **Blockgrenze (Knoten)**: Empfehlung **5 000 Knoten je Block** (aus der Review-Empfehlung; die Auflage arbeitet in Häppchen zu 2 000 Knoten). Herleitung (Probe): heute fasst ein Block bei dichten Zeilen ~1 000 Zeichen/Zeile rund 25 Zeilen ≈ viele tausend Knoten und kostet bis 0,8 s; mit 5 000 Knoten sinkt die Blockgröße bei dichten Zeilen auf wenige Zeilen. Alternative: eine Zeichen- und eine Knotengrenze nebeneinander (beide greifen).
4. **Frist für `GitLeser`**: Empfehlung — eigene Karte (Leitplanke für jeden `git`-Aufruf, nicht nur große Diffs). Bestätigt der product-owner/director das, bleibt I0014 auf die Ausgabegrenze beschränkt.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001/R00004 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 7 Bubbles unterhalb I0014 (B1601–B1607), davon 3 Standard (2 h) und 4 unklar (2–4 h) — Untergrenze 14 h, obere Schätzung 24 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom) liegen bei 0,01–0,19 h je Bubble; die Richtwerte sind ein Vielfaches davon. Enthalten: nur I0014; die Frist für `GitLeser` ist nicht enthalten (eigene Karte vorgeschlagen).

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: der Prüfer öffnet eine große, von einer KI erzeugte Datei, und der Lauf stirbt — der Server zieht 46,9 MB in den Speicher (1,6 GB RSS gemessen), der Browser steht 33 s still, und das Review ist verloren. Wenn der Server die Ausgabe von `git` nur bis zu einer Bytegrenze liest und darüber einen klaren Ausgang „zu groß“ meldet (statt still zu kürzen), und wenn die Oberfläche eine Datei über 20 000 Diff-Zeilen zugeklappt zeigt und erst auf „Trotzdem laden“ zeichnet, dann bleibt der Lauf benutzbar und der Prüfer entscheidet selbst, was er lädt. Die Blockgrenze an der Knotenzahl schließt die zweite Lücke: auch ein geladener, dichter, gefärbter Diff lässt sich scrollen, ohne den Hauptfaden zu blockieren. Der Hebel liegt genau hier, weil beide Probleme an derselben Stelle entstehen — am einen Lesepfad von `git` und am einen Zeilenaufbau des Diffs; das Ergebnisformat (R00002) und die Anzeige selbst bleiben unverändert, deshalb ist die Änderung klein und reversibel. Ohne diese Grenzen wäre jede große Datei ein Abbruch des Reviews, und ein präpariertes Repository könnte den Lauf mit einer einzigen Datei lahmlegen.

## Missing-Docs
- Ob `Process.StandardOutput.ReadToEnd()` bei einer sehr großen Ausgabe zuverlässig beschränkt werden kann, oder ob ein stückweises Lesen mit Abbruch nötig ist (und ob ein nicht geleerter Pipe-Puffer den beendeten Prozess blockiert) — vor dem Bauen mit `git` 2.48.1 im Wegwerf-Repo proben.
- Messwerte im Browser fehlen (Long Tasks beim Scrollen, Zuklapp-Zeit); die 0,8 s je Block stammen aus dem Security-Review zu #8, die 46,9 MB / 1,6 GB / 33 s aus dem Review zu #22. Der Entwickler misst auf dem Stand.

## Notizen

### Was heute schon da ist (Stand `main`, 2026-11-24)
- `diff-werte.js` kennt `zuLang` (20 000 Zeilen / 262 144 Zeichen / 10 000 Marken) und `bloecke` (500 Zeilen / 25 000 Zeichen); `diff.js` wendet `zuLang` **nur** bei `alsText` an und zeigt „Sehr lang: N Zeilen — zugeklappt“ mit „Trotzdem laden“ (Kommentar „vorläufig bis I0014“).
- `GitLeser` liest mit `ReadToEnd()` **ohne** Grenze und **ohne** Frist (Altlast).
- Probe (Node, `diff-werte.js`): `gross.txt` 20 000 Zeilen → `zuLang=null` (220 000 Zeichen, unter beiden Grenzen); `riesig.txt` 30 000 Zeilen → `zuLang=30000 Zeilen`; dichte 600 Zeilen zu ~1 000 Zeichen → 50 Blöcke (also ~25 Zeilen je Block = viele Knoten).

### Optionen (Ausgang über der Ausgabegrenze)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Abbruch beim Lesen, eigener Ausgang „zu groß“ mit Meldung (Empfehlung) | Grenze über internen Parameter prüfbar; Speicher messbar | gering: ein neuer Ausgang durch Quelle, Interactor und Endpunkt | klein |
| 2. Vollständig lesen und im Browser kürzen | einfach | verletzt den Zweck: 1,6 GB RSS und 33 s Blockade bleiben | klein |
| 3. Stiller Abbruch (gekürzter Patch) | — | stiller Fehler: der Prüfer sieht einen falschen Diff | klein |

Gewählt: 1.

### Verworfene Alternativen
- **Zuklappen im Server statt im Browser**: der Server müsste den Diff zählen und zurückhalten; die Zeilenrechnung steht aber schon im Browser (R00004) und die Grenze hängt an der gezeigten Ansicht. Nach Schichten geschnitten und doppelte Wahrheit.
- **Ausgabegrenze gleich der Zuklappgrenze**: dann wäre jede zugeklappte Datei auch nicht ladbar, „Trotzdem laden“ verlöre seinen Sinn.
- **Frist in denselben Slice ziehen**: die Frist gilt für jeden `git`-Aufruf (Log, Übersicht, `rev-parse`), nicht nur für Diffs — eigener Umfang, eigene Karte.
- **Zuklappen und „Trotzdem laden“ als zwei Slices**: der Knopf ohne die Zuklappentscheidung liefert nichts, die Entscheidung ohne den Knopf ist nicht auslieferbar — nach Schichten geschnitten.
