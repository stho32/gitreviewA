---
id: R00008
status: Neu
datum: 2026-11-24
---

# R00008: Ganze Datei mit Diff

## Beschreibung

Der prüfende Mensch kann beim Lesen eines Diffs zwischen „nur Änderungen“ und „ganze Datei“ umschalten. „Ganze Datei“ zeigt die Datei lückenlos im Stand nach dem Commit, dazu die entfernten Zeilen an ihrer Stelle; hinzugefügte und entfernte Zeilen sind wie im Diff eingefärbt, jede Zeile trägt die Nummer alt und neu wie in [R00004](R00004-diff-einer-datei-lesen.md). Die Wahl bleibt beim Wechsel der Datei und des Commits erhalten. Beim Start gilt „nur Änderungen“.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (Kontext erweitern; hier die Grenze „aller Kontext“), Lastprofil (Dateien bis 20 000 Zeilen flüssig) und das Sicherheitswissen (fremdes Repo).

Baut auf [R00004](R00004-diff-einer-datei-lesen.md) auf: Diff-Bereich, Zeilenaufbau (`data-art`, `data-alt`, `data-neu`), Endpunkt `GET /api/commits/{hash}/diff?pfad=…`, Zeilenumbruch, Marken für Unsichtbares, Antwort-Abgleich. R00004 ist auf Karte #6 gebaut und in den Reviews; dieser Slice wird nach ihrem Merge gebaut.

**Herkunft:** Wunsch des Betreibers 2026-11-24 („zwischen einer Diff-Only und ‚Full File with Diff‘ Ansicht wechseln“). Keine Wireframes; Gestaltung aus kanbanD (`kd-*.css`), der Umschalter steht neben dem Umschalter „Umbruch“.

## Geschäftlicher Nutzen

Ein Diff mit drei Zeilen Kontext zeigt nicht, was zwischen und um die Änderungen steht. Wer eine KI-Änderung prüft, muss oft sehen, ob eine Änderung zu ihrer Umgebung passt (Funktion davor, Zeile darunter, Klammer, die zu ist) — bisher hieße das: Datei im Editor öffnen und Zeilennummern abgleichen. Mit „ganze Datei“ liest er Änderung und Umgebung an einer Stelle und kann an jede Zeile später eine Anmerkung mit gültiger Nummer neu hängen.

## Funktionale Anforderungen

- **Umschalter** im Diff-Bereich mit zwei Stellungen, „nur Änderungen“ und „ganze Datei“; beim Start „nur Änderungen“ (das Verhalten von R00004 bleibt dort unverändert). Das Umschalten ändert die gewählte Datei und die Dateiliste nicht; der Diff-Bereich zeigt danach dieselbe Datei in der anderen Ansicht.
- **Ganze Datei** zeigt in Dateireihenfolge: jede Zeile der Datei im Stand nach dem Commit (Kontext oder hinzugefügt) und jede entfernte Zeile an der Stelle, an der sie im Diff steht (vor der hinzugefügten Zeile, die sie ersetzt, wie bei `git show`). Es gibt keine Lücken und keine ausgelassenen Abschnitte; Abschnittsköpfe (`@@ …`) sind nicht Teil der Ansicht und zählen nicht als Zeilen.
- **Zeilen**: Vorzeichen, `data-art` (`plus`, `minus`, `kontext`), `data-alt`, `data-neu` und Text wie in R00004: Nummer neu = Zeile im Stand nach dem Commit (derselbe Stand, den das Ergebnis nach R00002 nennt; Anschluss I0017), Nummer alt = Zeile im Stand davor (Merge: gegenüber dem ersten Elternteil). Die Hinweiszeile `\ No newline at end of file` bleibt ohne Vorzeichen und Nummern.
- **Einfärbung**: hinzugefügte, entfernte und unveränderte Zeilen sind in beiden Ansichten gleich gestaltet (dieselben Klassen und Farben; Lesetexte „hinzugefügt: “ / „entfernt: “ für Screenreader).
- **Dateiarten**: eine **hinzugefügte** Datei zeigt in beiden Ansichten nur `+`-Zeilen; eine **gelöschte** Datei hat keinen Stand danach und zeigt in beiden Ansichten ihren Stand davor als `−`-Zeilen (Nummer alt, keine Nummer neu); eine **umbenannte** Datei mit geändertem Inhalt zeigt die ganze Datei mit ihren Änderungen (nicht als neu hinzugefügt); eine **Binärdatei** und eine Datei **ohne Zeilenänderung** zeigen in beiden Ansichten dieselben Hinweise wie in R00004 („Binärdatei“, „Keine Zeilenänderungen“) und nie ihren Inhalt.
- **Wahl bleibt**: die Wahl der Ansicht gilt für jede weitere Datei und jeden weiteren Commit des Laufs, auch wenn sie ohne gewählte Datei getroffen wurde; nichts wird gespeichert (nur RAM), nach Neuladen der Seite gilt wieder „nur Änderungen“. Der Zeilenumbruch (R00004) wirkt in beiden Ansichten und bleibt beim Umschalten erhalten.
- **Laden**: die ganze Datei wird erst gelesen, wenn „ganze Datei“ gilt und eine Datei gewählt ist — nie vorab und nie in der Ansicht „nur Änderungen“. Eine späte Antwort einer früheren Wahl (Datei, Commit oder Ansicht) wird verworfen.
- **Fehler**: lässt sich die ganze Datei nicht lesen, steht im Diff-Bereich „Diff konnte nicht gelesen werden“ (wie R00004); Dateiliste, Commit-Leiste und Umschalter bleiben bedienbar.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): eine Datei mit 20 000 Zeilen steht in der Ansicht „ganze Datei“ ≤ 1 s nach dem Umschalten bzw. nach dem Klick auf die Datei (Obergrenze des Dateiwechsels). Der Messwert muss ≤ 0,7 s sein (≥ 30 % Abstand zur Grenze, `rollen/planer/zeitkriterien.md`); liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium. Das Umschalten bei kleinen Dateien ist kein E2E-Zeitkriterium (im Browser-Test nicht belastbar messbar). Dateien über 20 000 Zeilen regelt I0014 für beide Ansichten; bis dahin gilt dieselbe Vollständigkeit wie in R00004.
- **Sicherheit** (`AI-Team/gelerntes.md`): wie R00004, ohne Abstriche für den neuen Weg. `git` nur über `GitStart` mit Argumentliste, `--no-ext-diff --no-textconv --ignore-submodules=none`, `--literal-pathspecs`, `GIT_NO_REPLACE_OBJECTS=1`; kein `diff.external`, `textconv` oder `command` startet ein Programm — das gilt für **jeden** Lesepfad der ganzen Datei, auch einen über `git show <hash>:<pfad>` (dort ist der Pfad kein Pathspec: eigene Probe für Namen wie `--output=pwn` und `:(glob)*.txt`). Der Pfad stammt nur aus der Dateiliste des Commits (exakt, Groß-/Kleinschreibung beachtet), der Commit nur aus der Aufrufmenge (voller Hash). Zeilentext, Pfade und Marken sind fremder Text: nur `textContent`, Bidi-/Unsichtbares als Marke `⟨U+202E⟩`. Ein neuer Anfrageparameter wird gegen eine feste Liste geprüft (unbekannt → 400).
- **Logging**: stdout bleibt leer; je Anfrage eine Debug-Zeile auf stderr (`GET /api/commits/<voller Hash>/diff`, Kontext Datei und Ansicht), Fehler beim Lesen als Error mit Commit und Pfad.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD, keine eigenen Vorgaben; der Umschalter ist per Tastatur bedienbar und trägt einen Namen für Screenreader.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (Commits `p`, `q`, `s`), **Repo M** (Merge) und **Repo U** (`u`) wie in [R00004](R00004-diff-einer-datei-lesen.md), „Akzeptanzkriterien“ und `user-stories/R00004.md`; neu: **Repo R** (Umbenennung mit Änderung): Commit `r1` fügt `u.txt` (`l1` … `l5`, je eine Zeile) hinzu, Commit `r2` benennt sie in `v.txt` um und ändert `l3` zu `L3`; **Repo U** bekommt Commit `v` auf `u`, der in `gross.txt` die Zeile `zeile 10000` zu `geändert 10000` ändert. Aufruf wie in R00004 (`gitreviewA q p`, Wahl `q`, „wählen“ = Klick in der Dateiliste); „umschalten“ = die andere Stellung des Umschalters wählen.

### Ganze Datei lesen
- [ ] Gegeben `q` und `lang.txt` gewählt in „nur Änderungen“ (13 Zeilen in zwei Abschnitten, wie R00004), wenn man auf „ganze Datei“ umschaltet, dann stehen 21 Zeilen lückenlos da: `z01` (1/1), `z02` (2/2), `−z03` (alt 3), `+Z03` (neu 3), `z04` bis `z17` (je gleiche Nummer alt und neu, 4/4 bis 17/17), `−z18` (alt 18), `z19` (alt 19, neu 18), `z20` (alt 20, neu 19) — also auch `z07` bis `z14`, die „nur Änderungen“ auslässt. Rechnung: 20 Zeilen davor − 1 entfernte (`z03`) + 1 hinzugefügte (`Z03`) − 1 entfernte (`z18`) = 19 Zeilen im Stand danach; angezeigt 18 Kontext + 2 entfernt + 1 hinzugefügt = 21. Schaltet man zurück, stehen wieder genau die 13 Zeilen aus R00004.
- [ ] Gegeben `q`, wenn man für `lang.txt` und `src/b.txt` die Ansicht „ganze Datei“ zeigt, dann steht für **jede** Zeile mit Nummer neu n genau die Zeile n der Datei im Stand nach dem Commit (`git show q:lang.txt`, `git show q:src/b.txt`), für **jede** Zeile mit Nummer alt m genau die Zeile m im Stand davor (`git show p:…`), und die Zeilen ohne Nummer neu sind genau die entfernten; Beispiel `src/b.txt`: `eins` (1/1), `−zwei` (alt 2), `+ZWEI` (neu 2), `+drei` (neu 3). (Allquantor: die Prüfung läuft über alle Zeilen der beiden Dateien, nicht über Stichproben.)
- [ ] Gegeben `q` und die Ansicht „ganze Datei“, wenn man `lang.txt` betrachtet, dann haben `+Z03` und `−z03` jeweils dieselbe Hintergrundfarbe wie die hinzugefügte bzw. entfernte Zeile in „nur Änderungen“, die beiden Farben unterscheiden sich voneinander und von der einer Kontextzeile, und jede Zeile trägt `data-art` (`plus`, `minus`, `kontext`), `data-alt` und `data-neu` wie in R00004.
- [ ] Gegeben `q` und die Ansicht „ganze Datei“, wenn man nacheinander `breit.txt` (hinzugefügt), `alt.txt` (gelöscht), `ende.txt`, `LIESMICH.md` (umbenannt, unverändert) und `logo.bin` wählt, dann zeigt `breit.txt` zwei `+`-Zeilen (neu 1 und 2), `alt.txt` vier `−`-Zeilen `a1` bis `a4` (alt 1 bis 4, keine Nummer neu), `ende.txt` `−a` (alt 1), die Zeile `\ No newline at end of file` ohne Vorzeichen und Nummern und `+a` (neu 1), `LIESMICH.md` „Keine Zeilenänderungen“ und `logo.bin` „Binärdatei“ ohne Byte-Inhalt — dieselben Zeilen und Hinweise wie in „nur Änderungen“.
- [ ] Gegeben Repo R und `r2` mit der Ansicht „ganze Datei“, wenn man `v.txt` (umbenannt aus `u.txt`, `l3` geändert) wählt, dann steht der Pfad `v.txt` da, und sechs Zeilen: `l1` (1/1), `l2` (2/2), `−l3` (alt 3), `+L3` (neu 3), `l4` (4/4), `l5` (5/5) — nicht fünf hinzugefügte Zeilen. Gegeben Repo M und die Ansicht „ganze Datei“ beim Aufruf `gitreviewA m`, wenn man `f.txt` wählt, dann steht `+neu` (neu 1) da (gegenüber dem ersten Elternteil `c2`).
- [ ] Gegeben `q` und die Ansicht „ganze Datei“, wenn man `fremd.txt` wählt, dann stehen `<img src=x onerror=alert(1)>` und `<b>fett</b>` mit den spitzen Klammern als sichtbarer Text da, es erscheint kein Dialog, nichts ist fett, und in der dritten Zeile steht die Marke `U+202E` als Text (`a` und `b` in dieser Reihenfolge).

### Umschalter und Wahl
- [ ] Gegeben ein frischer Start (`gitreviewA q p`, `q` gewählt) und `src/b.txt` gewählt, dann steht der Umschalter auf „nur Änderungen“ und der Diff hat den Kopf `@@ -1,2 +1,3 @@` wie in R00004; beim Umschalten auf „ganze Datei“ und zurück bleiben Dateiliste und Auswahl der Datei unverändert (`aria-current="true"` an `src/b.txt`, seit R00011 statt `aria-selected`).
- [ ] Gegeben die Ansicht „ganze Datei“ gewählt und `lang.txt` angezeigt, wenn man `src/b.txt` wählt, dann zeigt es die ganze Datei (`eins`, `−zwei`, `+ZWEI`, `+drei`); wechselt man danach auf den Commit `p` und wählt `lang.txt`, steht dort die ganze Datei mit 20 `+`-Zeilen (neu 1 bis 20), und der Umschalter zeigt weiter „ganze Datei“ — ohne dass man ihn noch einmal betätigt. Gegeben `q` ohne gewählte Datei (Hinweis „Datei wählen, um ihren Diff zu sehen“), wenn man auf „ganze Datei“ umschaltet und danach `lang.txt` wählt, dann stehen die 21 Zeilen da; der Hinweis stand bis zur Wahl der Datei unverändert da.
- [ ] Gegeben `q` und `breit.txt` in der Ansicht „ganze Datei“ mit eingeschaltetem „Umbruch“ in einem Fenster von 1280 × 800 Pixeln, wenn man auf „nur Änderungen“ und wieder zurück umschaltet, dann ist „Umbruch“ weiter an und die 300 Zeichen lange Zeile mehrere Bildschirmzeilen hoch, der Bereich lässt sich nicht waagerecht scrollen; mit ausgeschaltetem „Umbruch“ belegt sie in beiden Ansichten dieselbe Höhe wie Zeile 1 und der Bereich scrollt waagerecht.

### Laden
- [ ] Gegeben `gitreviewA q p --verbose` mit gesammeltem stderr und die Ansicht „nur Änderungen“, wenn man `src/b.txt` und dann `lang.txt` wählt, dann stehen auf stderr genau 2 Zeilen `GET /api/commits/<voller Hash von q>/diff` (die ganze Datei wurde nie gelesen — die Debug-Zeile nennt die Ansicht); nach dem ersten Umschalten auf „ganze Datei“ ist genau 1 weitere Zeile da, und `lang.txt` zeigt 21 Zeilen.
- [ ] Gegeben die Antwort für die ganze Datei von `lang.txt` ist um 1,5 s verzögert, wenn man auf „ganze Datei“ umschaltet und innerhalb der Verzögerung zurück auf „nur Änderungen“ schaltet, dann zeigt der Diff-Bereich nach dem Eintreffen die 13 Zeilen von „nur Änderungen“ und nicht die 21 der späten Antwort; wählt man statt des Zurückschaltens `src/b.txt`, steht nach dem Eintreffen der Diff von `src/b.txt`; wählt man den Commit `p`, steht der Hinweis „Datei wählen, um ihren Diff zu sehen“.
- [ ] Gegeben `q` gewählt, `src/b.txt` angezeigt und die Objektdatei von `q` (`.git/objects/<2 Zeichen>/<38 Zeichen>`) danach entfernt, wenn man auf „ganze Datei“ umschaltet, dann steht „Diff konnte nicht gelesen werden“, Dateiliste und Umschalter bleiben bedienbar, auf stderr steht eine Fehlerzeile mit dem Hash von `q` und `src/b.txt`, stdout bleibt leer; nach einem Klick auf `p` und dort `src/b.txt` steht dessen ganze Datei (`+eins`, `+zwei`).

### Eingabe an git und fremdes Repo
- [ ] Gegeben die Skripte, `diff.external`, `diff.marker.textconv`, `diff.marker.command` und `.gitattributes` (`*.txt diff=marker`) wie in R00004 sowie `diff.context=0`, `diff.suppressBlankEmpty=true` und `color.ui=always`, wenn man in der Ansicht „ganze Datei“ `src/b.txt` und `k.txt` wählt, dann zeigt `src/b.txt` die Zeilen aus dem Kriterium oben (nicht die Ausgabe eines Skripts), `k.txt` `oben` (1/1), die leere Zeile (2/2, mit Nummern), `−unten` (alt 3), `+UNTEN` (neu 3) ohne Farbsteuerzeichen, und keine der Dateien `marker-extern`, `marker-textconv`, `marker-command` existiert.
- [ ] Gegeben `gitreviewA q`, wenn man `GET /api/commits/<voller Hash von q>/diff?pfad=<Pfad>&umfang=ganz` (Vorplanung; der Parameter gehört dem Entwickler, die Aussage ist: dieselben Prüfungen wie in R00004 gelten für den Weg der ganzen Datei) mit `nicht-da.txt`, `../README.md`, `--output=pwn`, `src`, `SRC/B.TXT`, `:(top)src/b.txt` und `*.txt` anfragt, dann antwortet jede mit 404, ohne dass `git` gestartet wird; ohne `pfad` 400; mit `HEAD`, dem Hash von `p` oder den ersten 7 Zeichen von `q` statt des Hashes 404; mit einem unbekannten Wert für den Umfang 400; mit dem vollen Hash von `q`, `pfad=src/b.txt` und gültigem Umfang 200; und die Datei `pwn` existiert nicht.
- [ ] Gegeben `gitreviewA s` und die Ansicht „ganze Datei“, wenn man `--output=pwn`, `:(glob)*.txt` und `c.txt` nacheinander wählt, dann zeigt der Diff je nur die eigene Datei (`+x`, `+y` bzw. `+z`, je eine Zeile, neu 1), `:(glob)*.txt` zeigt nicht auch `c.txt`, und im Arbeitsordner des Repos entsteht keine Datei `pwn`.

### Lastprofil
- [ ] Gegeben Repo U, `gitreviewA v` und `gross.txt` gewählt in „nur Änderungen“, wenn man auf „ganze Datei“ umschaltet, dann steht spätestens 1 s nach dem Umschalten die Zeile `zeile 20000` (alt 20000, neu 20000) im Dokument (gemessen vom Umschalten bis diese Zeile im Dokument steht, ereignisgenau, Messwert ≤ 0,7 s), und für jede der 20 001 Zeilen gilt das Orakel aus „Ganze Datei lesen“ (Nummer neu n = Zeile n von `git show v:gross.txt`; die entfernte Zeile `zeile 10000` steht vor `geändert 10000`).
- [ ] Gegeben Repo U, `gitreviewA v` und die Ansicht „ganze Datei“ gewählt, bevor eine Datei gewählt ist, wenn man `gross.txt` wählt, dann steht `zeile 20000` spätestens 1 s nach dem Klick im Dokument (Messwert ≤ 0,7 s).

## Betroffene Verzeichnisstruktur

Wie in R00004 (`src/GitReviewA/` mit `Git/`, `Server/`, `web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit den Schichten `tests/`, `dsl/`, `treiber/`).

- `Git/` — `GitLeser` liest die ganze Datei (neben dem Diff mit drei Zeilen Kontext); `GitStart` bleibt der einzige Weg zu `git`.
- `Server/` — der Endpunkt `GET /api/commits/{hash}/diff` bekommt einen Parameter für den Umfang.
- `web/` — Umschalter und Zustand der Ansicht im Diff-Bereich; die Rechnung `Diffzeilen` bleibt dieselbe.
- `tests/`, `e2e/` — Wegwerf-Repo-Hilfsklasse (Repo R, Commit `v`), DSL und Treiber für die Ansicht.

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen. Die Kriterien sind so geschrieben, dass beide Wege bestehen oder durchfallen.

### Ablauf
1. **Anfrage prüfen** — wie R00004 (Hash gegen die Aufrufmenge, Pfad exakt gegen die Dateiliste des Commits; kein Treffer → 404 ohne `git`-Aufruf); zusätzlich der Umfang (Standard „Änderungen“; unbekannter Wert → 400).
2. **Art bestimmen** — wie R00004; Binär- und leere Dateien lesen nie die ganze Datei.
3. **Ganze Datei lesen** — Weg 1 (Empfehlung): derselbe `git show`-Aufruf wie in R00004 mit so viel Kontext, dass kein Abschnitt endet (probiert mit `git` 2.48.1: `-U2147483647` und `-U100000` ergeben für `lang.txt` in `q` einen Abschnitt `@@ -1,20 +1,19 @@` mit 21 Zeilen), dieselben Flags, dieselbe Pfadübergabe (bei `R` beide Pfade). Weg 2: Datei im Stand nach dem Commit (`git show <hash>:<pfad>`, Pfad dort kein Pathspec; probiert: Namen `--output=pwn` und `:(glob)*.txt` werden wörtlich gelesen, `diff.marker.textconv` startet dabei nicht) plus Diff-Zuordnung der entfernten Zeilen; bei gelöschter Datei fällt sie auf Weg 1 zurück. `--function-context` ist nicht dasselbe (nur die umgebende Funktion) und fällt durch das erste Kriterium.
4. **Oberfläche** — Umschalter und Zustand „Ansicht“ neben „Umbruch“ im Diff-Bereich; beim Ereignis `datei-gewaehlt` und beim Umschalten laden, nur zeichnen, wenn (Commit, Pfad, Ansicht) noch gelten; Zeilen wie R00004 (`patchZeilen`, Blöcke zu 500, `textContent`).

### Grobentwurf
**Einstiegsstellen:** Server (ein Endpunkt, ein Parameter), `Git/` (Lesen), `web/` (Umschalter, Zustand).
- `Diffumfang` (Wert, rein) — `Aenderungen` | `Ganz`; Prüfung des Parameters.
- `GitLeser` — `DiffLesen(hash, datei, umfang, arbeitsordner)` (erweitert); wirft `GitFehler` mit Hash und Pfad.
- Endpunkt `GET /api/commits/{hash}/diff` — antwortet für beide Umfänge im selben Format (`pfad`, `status`, `alterPfad`, `art`, `patch`).
- Oberfläche: Zustand „Ansicht“ (RAM, Start „Änderungen“), Umschalter, Abgleich später Antworten um die Ansicht erweitert.

### Messung des Zeitkriteriums
Startpunkt: Umschalten bzw. Klick auf die Datei; Ereignis: die Zeile `zeile 20000` steht im Dokument (E2E wartet auf dieses Ereignis, nicht im Standardraster, `rollen/planer/zeitkriterien.md`). Grenze 1 s, Messwert ≤ 0,7 s; Messwerte liegen noch nicht vor, der Entwickler misst auf dem Stand. Zum Vergleich: R00004 stellt 20 000 Diff-Zeilen mit derselben Rechnung bei ≤ 1 s dar; hier kommen 20 001 Zeilen, aber kein neues Verfahren hinzu.

## Tests
Nach `test-pyramide` und ATDD nach Dave Farley (`AI-Team/factory.md`): je Kriterium zuerst die Spezifikation in Fachsprache, dann DSL, Protokolltreiber, System — in den vorhandenen Schichten von `e2e/`, Testnamen „soll …“.

**Unit:** Prüfung des Umfangs-Parameters; JS-Rechnung für ein Ergebnis mit einem einzigen Abschnitt über die ganze Datei (Rechenbeispiel `lang.txt`, 21 Zeilen; Orakel Nummer neu → Zeile); Abgleich später Antworten mit Ansicht.
**Integration:** `GitLeser` gegen Wegwerf-Repos A, R, U/`v` (Orakel gegen `git show <hash>:<pfad>`, jede Zeile); Marker-Skript-Probe und Konfigurationsprobe für den neuen Lesepfad (je vorher rot); Endpunkt auf freiem Port: 200/400/404/500, Pfadliste, keine `git`-Aufrufe bei 404.
**E2E:** Playwright headless: alle Kriterien über DSL (`ansicht("ganze Datei")`, `datei(...)`) und Treiber; verzögerte Antwort über `route`; Zeitkriterien ereignisgenau.

## Abhängigkeiten
- Abhängig von: I0006 Diff einer Datei lesen (R00004; Karte #6, in den Reviews — gebaut wird nach ihrem Merge), I0005 (R00003).
- Blockiert: I0009 Whitespace und Kontext (Empfehlung: Teil „Kontext je Hunk erweitern“ baut auf den Zeilen der ganzen Datei auf, siehe Offene Fragen 4); berührt dieselben Module wie I0008 Syntaxhervorhebung (R00007, Karte #8) und I0007 Nebeneinander, ohne von ihnen abzuhängen.

Nicht Teil dieser Anforderung (eigene Karten): Whitespace ausblenden und Kontext je Abschnitt erweitern (I0009), Nebeneinander (I0007), Syntaxfarben (I0008), Zusammen-Ansicht (I0010), Zuklappen großer Dateien (I0014), Anmerken an Zeilen (I0017), Inhalt von Binärdateien und Bildern (I0012), eine Ansicht, die die Datei **ohne** Änderungen zeigt (Datei lesen ohne Diff).

## Offene Fragen
1. An den product-owner: **Umfang bei Dateien ohne Zeilenänderung** — in „ganze Datei“ weiter „Keine Zeilenänderungen“ (Empfehlung: ja, der Zweck ist Änderung in Umgebung; der Inhalt einer unveränderten Datei braucht eine eigene Karte), oder die Datei im Stand danach zeigen?
2. An den product-owner: **Dateien über 20 000 Zeilen** — bis I0014 wie R00004 vollständig laden (Empfehlung: ja; I0014 klappt zu und gilt für beide Ansichten, kein zweites Verfahren jetzt)?
3. An den product-owner: **Beim Start** „nur Änderungen“ (Empfehlung: ja, wie R00004 und schnell), oder die Wahl für den Lauf per Aufrufoption festlegen?
4. An den product-owner: **Verhältnis zu I0009** — I0022 ist die Grenze des Kontexts („alles“). Empfehlung: I0022 zuerst bauen; I0009 behält `-w` und bekommt als Kontext-Teil „Lücke zwischen zwei Abschnitten per Klick aufklappen“ aus den Zeilen der ganzen Datei, mit `Braucht` I0022 — der Teil schrumpft auf Bedienung statt auf eine zweite Leserechnung. Zusammenspiel von `-w` mit „ganze Datei“ (Zeilen, die nur Whitespace ändern, werden Kontext) legt I0009 fest. Soll I0009 entsprechend verschlankt werden?
5. An den product-owner: **Anmerkung an einer entfernten Zeile** in der ganzen Ansicht — gilt die Antwort zu R00004 Frage 5 unverändert (Empfehlung: ja, eine Zeile ohne Nummer neu ist nicht annotierbar)?

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 6 Bubbles unterhalb I0022 (B0701–B0706), davon 2 Standard (2 h) und 4 unklar (2–4 h) — Untergrenze 12 h, obere Schätzung 20 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; die Richtwerte sind also ein Vielfaches davon. Enthalten: nur I0022; I0009, I0007, I0008 sind nicht mitgezählt.

## Warum löst diese Anforderung das Problem?

Der Auslöser: eine KI hat eine Funktion geändert, und der Mensch will nicht nur die drei Zeilen darum sehen, sondern wissen, ob die Änderung zu der Funktion und ihren Nachbarn passt, ohne die Datei im Editor zu öffnen und Nummern abzugleichen. Wenn der Diff-Bereich die ganze Datei im Stand nach dem Commit mit den Änderungen darin zeigt, dann liest der Mensch Änderung und Umgebung an einer Stelle, und die Nummer neu jeder Zeile ist dieselbe Stellenangabe, die das Ergebnis nach R00002 an die KI zurückgibt. Der Hebel liegt darin, dass die Ansicht dieselbe Zeilenrechnung wie R00004 nutzt (nur mit allem Kontext) und damit nichts Neues an der Sicherheitsgrenze zu `git` aufmacht, außer dass der Lesepfad sie geerbt haben muss.

## Missing-Docs
- `git show <hash>:<pfad>` mit Namen wie `--output=pwn` und `:(glob)*.txt` und der Weg 2 bei Umbenennung, Merge und gelöschter Datei: Namen im Wegwerf-Repo mit `git` 2.48.1 gemessen (wörtlich gelesen, kein Textconv-Start), Weg 2 bei Umbenennung und Merge vor dem Bauen proben. Zwei Pfade bei Umbenennung mit Änderung (Weg 1) siehe R00004; mit `-U100000` gemessen: `u.txt` + `v.txt` ergibt `rename` und 6 Zeilen.
- Obergrenze des Kontextwerts von `git` (`-U`): `-U2147483647` wird angenommen (2.48.1); eine Datei mit mehr Zeilen als der Wert ist praktisch ausgeschlossen, der Entwickler wählt einen Wert oder den Weg 2.

## Notizen

### Optionen (Quelle der ganzen Datei)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Derselbe `git show` mit allem Kontext, gleiche Rechnung (Empfehlung) | Orakel gegen `git show <hash>:<pfad>` prüfbar, Zeilenzahl 21 gemessen | gering: dieselbe Grenze zu `git`, derselbe Parser; Kontextwert nur eine Zahl | klein |
| 2. Datei im Stand danach (`git show <hash>:<pfad>`) plus Diff-Zuordnung | Orakel prüft das Ergebnis; Zuordnung ist eigene Rechnung | mittel: zweite Quelle für Zeilenenden und Codierung, zwei Aufrufe, gelöschte Datei als Sonderfall | mittel |
| 3. Eine Anfrage liefert beides, der Browser entscheidet | ein Aufruf | verletzt „bei Bedarf“: der Diff jeder Datei kostet immer die ganze Datei | groß |

Empfehlung: 1; der Entwickler entscheidet beim Bauen, die Kriterien tragen beide.

### Verworfene Alternativen
- Option 3: lädt die ganze Datei auch dann, wenn der Mensch sie nie sehen will; die Vision verlangt Diffs je Datei bei Bedarf.
- Zwei Slices („ganze Datei“ und „Umschalter mit Wahl“): der Umschalter ohne die Ansicht liefert nichts, die Ansicht ohne Umschalter ist nicht prüfbar — nach Schichten geschnitten. Sollte der Slice im Bau zu groß werden: Lastprofil-Messung (die letzten zwei Kriterien) als Ausbaustufe (dasselbe Verhalten schneller).
- „Kontext erweitern“ je Abschnitt hier mitzubauen: I0009, eigene Karte.
- `--function-context`: zeigt nur die umgebende Funktion, nicht die ganze Datei.
