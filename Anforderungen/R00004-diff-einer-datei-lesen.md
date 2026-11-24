---
id: R00004
status: Neu
datum: 2026-11-24
---

# R00004: Diff einer Datei lesen

## Beschreibung

Wählt der prüfende Mensch in der Dateiliste eine Datei, zeigt die Hauptansicht ihren Diff im Format von `git show` (unified): je Änderungsabschnitt (Hunk) den Kopf `@@ -a,b +c,d @@` und darunter die Zeilen mit Vorzeichen `+` / `−` oder Kontext, dazu je Zeile die Zeilennummer **alt** und **neu**. Die Nummer **neu** ist die Zeile im Stand nach dem Commit — dieselbe Angabe, die das Ergebnis nach [R00002](R00002-beenden-mit-ergebnis.md) als `Datei:Zeile` trägt; daran schließt I0017 (Zeile annotieren) an. Der Zeilenumbruch langer Zeilen ist umschaltbar. Der Diff wird erst bei der Auswahl der Datei geladen, nie vorab.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (unified, Zeilenumbruch) und die Leitplanken Lastprofil (20 000 Diff-Zeilen je Datei flüssig, Dateiwechsel ≤ 1 s an der Obergrenze, Diffs je Datei bei Bedarf), „Git über die Kommandozeile“ (Diffs entsprechen denen von `git`) und das Sicherheitswissen (fremdes Repo).

Baut auf [R00003](R00003-commits-und-dateien-sehen.md) auf: der Zustand „gewählte Datei“ (Commit-Hash, Pfad, Status, bei `R` alter Pfad), `aria-selected="true"` an der gewählten Zeile, das Dokumentereignis `datei-gewaehlt` und `GET /api/commits/{hash}/dateien`. Baut auf [R00001](R00001-mit-commit-hashes-aufrufen.md) (Gerüst, `GitStart`, Wegwerf-Repo-Hilfsklasse, E2E-Gerüst).

**Entscheidung des product-owners (2026-11-24, `AI-Team/po-entscheidungen.md`):** Merge-Commits werden gegen den **ersten Elternteil** gezeigt — Dateiliste (R00003) und Diff haben dieselbe Basis.

**Übernahme aus kanbanD** (Betreiber 2026-11-24; Herkunft im Commit nennen, keine eigene Gestaltung erfinden, keine Wireframes): Stil aus `~/Projekte/kanbanD/web/kd-tokens.css`, `kd-base.css`, `kd-app.css`. Aus `web/diff.js` als Vorlage:
- `patchZeilen` — Patch-Text → Zeilen `{art, alt, neu, text}`, Nummern aus den Hunk-Köpfen (auch `-0,0`, ausgelassene Anzahl wie `@@ -1 +1 @@`, `\ No newline at end of file` ohne Nummer, leere Kontextzeile);
- `sichtbarTeile` — Unsichtbares und Richtungsändernde Zeichen („Trojan Source“) werden als Marke `⟨U+202E⟩` sichtbar;
- `bloecke` / `BLOCK_ZEILEN` — Zeilen in Blöcken zu 500 (`content-visibility: auto`) für lange Diffs;
- Zeilenaufbau aus `zeileHtml`: Spalten alt | neu | Vorzeichen | Text, Klassen für hinzugefügt, entfernt, Kontext, Hunk-Kopf, Hinweiszeile; Lesetexte „hinzugefügt: “ / „entfernt: “ für Screenreader.

**Nicht übernommen** (eigene Karten): Syntaxfarben (`farbigHtml`, `spracheZuPfad`; I0008), Nebeneinander (`gegenueberstellen`; I0007), Wortmarken, VS-Code-Sprung (`vscodeLink`, `sprungZeile`; I0011), Blättern und Folge, `aufklappPlan` und die Größengrenzen (`GRENZE_*`, `BUDGET_ZEILEN`; große Diffs I0014). kanbanD baut die Zeilen als HTML-Zeichenketten mit `esc()`; gitreviewA baut DOM-Knoten mit `textContent` (fremder Text, siehe Sicherheit) — übernommen wird die Rechnung, nicht die HTML-Erzeugung.

## Geschäftlicher Nutzen

Erst mit dem Diff taugt gitreviewA für echte Reviews: der Mensch liest genau die Änderung, die die KI gemacht hat, ohne `git show <hash> -- <datei>` abzutippen, und sieht je Zeile die Nummer, an der er später seine Anmerkung festmacht. Dieselbe Slice-Karte macht die Oberfläche sicher gegenüber einem fremden Repository: sein Diff darf weder Programme starten noch Skripte in die Seite bringen.

## Funktionale Anforderungen

- **Diff-Bereich**: Wählt der Mensch eine Datei (Ereignis `datei-gewaehlt`), zeigt die Hauptansicht ihren Diff; über dem Diff steht der Pfad der Datei (bei `R` der neue Pfad). Ohne gewählte Datei — beim Start, nach Wechsel des Commits — steht dort der Hinweis „Datei wählen, um ihren Diff zu sehen“ (R00003: Wechsel hebt die Wahl auf).
- **Format**: unified wie `git show`, Kontext 3 Zeilen (fest; einstellbar macht es I0009). Der Dateikopf von `git` (`diff --git`, `index`, `---`, `+++`) entfällt, der Pfad steht schon darüber; ab dem ersten Hunk-Kopf ist der Text der von `git`, einschließlich des Abschnittstitels nach `@@` (z. B. `@@ -15,6 +15,5 @@ z14`).
- **Zeilen**: je Diff-Zeile Vorzeichen (`+` hinzugefügt, `−` entfernt, leer Kontext), Nummer alt (nicht bei hinzugefügten Zeilen) und Nummer neu (nicht bei entfernten Zeilen), Text unverändert. Die Hinweiszeile `\ No newline at end of file` trägt weder Vorzeichen noch Nummern. Jede Zeile trägt `data-art` (`plus`, `minus`, `kontext`), `data-alt` und `data-neu` — der Anschluss für I0017.
- **Hinzugefügte und gelöschte Dateien** erscheinen als reine `+`- bzw. `−`-Zeilen.
- **Ohne Text**: eine Binärdatei zeigt statt eines Diffs „Binärdatei“ (Bild und Vorher/Nachher sind I0012); eine Datei ohne Zeilenänderung (reine Umbenennung, nur geänderte Rechte, leere neue Datei) zeigt „Keine Zeilenänderungen“.
- **Zeilenumbruch**: ein Umschalter „Umbruch“ schaltet zwischen langen Zeilen in einer Bildschirmzeile (waagerecht scrollbar) und umbrochenen Zeilen um; beim Start aus; die Wahl bleibt beim Wechsel der Datei und des Commits erhalten.
- **Merge-Commits**: der Diff steht gegenüber dem ersten Elternteil.
- **Laden**: der Diff einer Datei wird bei ihrer Auswahl angefragt (`GET /api/commits/{hash}/diff?pfad=<Pfad>`), nicht vorher; die Antwort enthält `pfad`, `status`, `alterPfad`, `art` (`text`, `binaer`, `leer`) und `patch`. Antwortet der Server nach einem Wechsel der Auswahl, wird die späte Antwort verworfen.
- **Fehler**: kann der Diff nicht gelesen werden, steht im Diff-Bereich „Diff konnte nicht gelesen werden“; Dateiliste und Commit-Leiste bleiben bedienbar.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): der Diff einer Datei mit 20 000 Diff-Zeilen steht ≤ 1 s nach dem Klick (Obergrenze des Dateiwechsels). Der typische Dateiwechsel ≤ 200 ms ist hier kein E2E-Kriterium (im Browser-Test nicht belastbar messbar, wie R00003); der Entwickler hält die Antwortzeit des Endpunkts für 20 kleine Dateien als Integrationsmessung im Bericht fest.
- **Sicherheit** (Wissen „Sicherheit“, `AI-Team/gelerntes.md`): das geprüfte Repository ist fremd. `git` läuft nur über `GitStart` mit Argumentliste (nie über eine Shell) und mit `--no-ext-diff --no-textconv`; weder `diff.external` noch ein `textconv`/`command`-Treiber aus `.gitattributes` startet ein Programm. Der Pfad der Anfrage erreicht `git` nur, wenn er genau (Groß-/Kleinschreibung beachtet) in der Dateiliste des Commits steht, und wird als **wörtlicher** Pfad übergeben (kein Muster, kein Pathspec-Zauber, kein Optionsname). Der Commit der Anfrage muss wie in R00003 einer der übergebenen sein (voller Hash). Diff-Text, Pfade und Hunk-Titel sind fremder Text und werden nie als HTML gedeutet. Die Anzeige ist unabhängig von der Konfiguration des fremden Repos (`diff.context`, `diff.suppressBlankEmpty`, `color.ui`).
- **Logging**: stdout bleibt leer; je Anfrage eine Debug-Zeile auf stderr (`GET /api/commits/<voller Hash>/diff`, Kontext Datei); Fehler beim Lesen als Error mit Commit und Pfad.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD; keine eigenen Gestaltungsvorgaben.

## Akzeptanzkriterien

Vorbereitung (herstellbar mit `git` allein, Wegwerf-Repo „A“, alle Dateien enden mit Zeilenumbruch, wo nichts anderes steht): Commit `p` „Start“ fügt hinzu `README.md` (`Titel`, `Text`), `src/b.txt` (`eins`, `zwei`), `lang.txt` (20 Zeilen `z01` … `z20`), `alt.txt` (`a1` … `a4`), `ende.txt` (`a` **ohne** Zeilenumbruch am Ende), `k.txt` (`oben`, eine leere Zeile, `unten`). Commit `q` „Dateien ändern“ ändert `src/b.txt` zu `eins`, `ZWEI`, `drei`; `lang.txt`: `z03` zu `Z03` und löscht `z18`; löscht `alt.txt`; benennt `README.md` unverändert in `LIESMICH.md` um; `ende.txt` bekommt den Zeilenumbruch; `k.txt`: `unten` zu `UNTEN`; fügt hinzu `breit.txt` (Zeile 1 `kurz`, Zeile 2 dreißigmal `0123456789`, 300 Zeichen), `fremd.txt` (`<img src=x onerror=alert(1)>`, `<b>fett</b>`, `a`+U+202E+`b`) und die Binärdatei `logo.bin` (Bytes `A 00 B 00 01 02`). Commit `s` „Seltsame Namen“ fügt hinzu `--output=pwn` (`x`), `:(glob)*.txt` (`y`) und `c.txt` (`z`). Der Aufruf ist `gitreviewA q p` (Wahl: `q`), wo nichts anderes steht; eine Wahl heißt Klick auf die Datei in der Dateiliste.

### Diff lesen
- [ ] Gegeben `q` gewählt, wenn man `src/b.txt` wählt, dann steht im Diff-Bereich der Pfad `src/b.txt`, der Kopf `@@ -1,2 +1,3 @@` und darunter 4 Zeilen: `eins` Kontext (alt 1, neu 1), `−zwei` (alt 2, neu leer), `+ZWEI` (alt leer, neu 2), `+drei` (alt leer, neu 3); der Dateikopf von `git` (`diff --git`, `index`) fehlt.
- [ ] Gegeben `q`, wenn man `lang.txt` wählt, dann stehen zwei Köpfe da: `@@ -1,6 +1,6 @@` mit `z01`, `z02` (Kontext 1/1, 2/2), `−z03` (alt 3), `+Z03` (neu 3), `z04` bis `z06` (4/4 bis 6/6), und `@@ -15,6 +15,5 @@ z14` mit `z15` bis `z17` (15/15 bis 17/17), `−z18` (alt 18), `z19` (alt 19, neu 18), `z20` (alt 20, neu 19). Rechnung: 20 − 1 gelöschte Zeile = 19 Zeilen neu, daher endet `z20` bei neu 19.
- [ ] Gegeben `q`, wenn man `breit.txt` (hinzugefügt) und danach `alt.txt` (gelöscht) wählt, dann zeigt `breit.txt` den Kopf `@@ -0,0 +1,2 @@` und zwei `+`-Zeilen mit neu 1 und 2 (alt leer), und `alt.txt` den Kopf `@@ -1,4 +0,0 @@` und vier `−`-Zeilen `a1` bis `a4` mit alt 1 bis 4 (neu leer).
- [ ] Gegeben `q`, wenn man `ende.txt` wählt, dann zeigt der Diff `@@ -1 +1 @@`, `−a` (alt 1), eine Zeile `\ No newline at end of file` ohne Vorzeichen und Nummern, und `+a` (neu 1).
- [ ] Gegeben `q`, wenn man `LIESMICH.md` (umbenannt, unverändert) wählt, dann steht im Diff-Bereich „Keine Zeilenänderungen“ und keine Zeile aus `README.md`/`LIESMICH.md` als hinzugefügt; wählt man `logo.bin`, steht dort „Binärdatei“ und kein Byte-Inhalt.
- [ ] Gegeben ein Merge-Commit `m` (Hauptlinie `c1` mit `base.txt`, danach `c2` mit `g.txt`; Zweig `feature` von `c1` mit `f.txt` = `neu`; `m` = Merge von `feature` in die Hauptlinie), wenn man `gitreviewA m` aufruft und `f.txt` wählt, dann zeigt die Dateiliste `f.txt` (und nicht `g.txt`), und der Diff zeigt `@@ -0,0 +1 @@` und `+neu` (neu 1) — gegenüber dem ersten Elternteil `c2`, in dem `f.txt` noch fehlt.
- [ ] Gegeben `q` und `breit.txt` gewählt in einem Browserfenster von 1280 × 800 Pixeln, wenn man die Zeile 2 (300 Zeichen) betrachtet, dann belegt sie ohne Umbruch dieselbe Höhe wie Zeile 1, und der Diff-Bereich lässt sich waagerecht scrollen; nach dem Umschalten auf „Umbruch“ ist Zeile 2 mehrere Bildschirmzeilen hoch, der Bereich lässt sich nicht mehr waagerecht scrollen, und der Text ist derselbe; wählt man danach `src/b.txt` und wieder `breit.txt`, bleibt der Umbruch an.
- [ ] Gegeben `q`, wenn man `fremd.txt` wählt, dann stehen `<img src=x onerror=alert(1)>` und `<b>fett</b>` mit den spitzen Klammern als sichtbarer Text da, es erscheint kein Dialog, nichts ist fett, und in der dritten Zeile steht die Marke `U+202E` als Text (das Zeichen selbst ist nicht im Text der Zeile; `a` und `b` stehen in dieser Reihenfolge).

### Laden
- [ ] Gegeben `gitreviewA q p --verbose` mit gesammeltem stderr, wenn die Seite geladen ist, dann ist `q` gewählt, der Diff-Bereich zeigt „Datei wählen, um ihren Diff zu sehen“, und auf stderr steht keine Zeile `GET /api/commits/<voller Hash von q>/diff`; nach dem Klick auf `src/b.txt` genau 1, nach dem Klick auf `lang.txt` genau 2; wechselt man danach auf `p`, steht der Hinweis wieder da und es sind weiter 2.
- [ ] Gegeben die Antwort für `src/b.txt` ist um 1,5 s verzögert, wenn man `src/b.txt` und innerhalb der Verzögerung `lang.txt` wählt, dann zeigt der Diff-Bereich nach dem Eintreffen beider Antworten den Pfad und den Diff von `lang.txt` und bleibt so; wählt man statt der zweiten Datei den Commit `p`, steht nach dem Eintreffen der Hinweis „Datei wählen, um ihren Diff zu sehen“ und nicht der späte Diff von `src/b.txt`.
- [ ] Gegeben `q` gewählt und die Dateiliste angezeigt, und die Objektdatei von `q` (`.git/objects/<2 Zeichen>/<38 Zeichen>`) wurde danach entfernt, wenn man `src/b.txt` wählt, dann steht im Diff-Bereich „Diff konnte nicht gelesen werden“, die Dateiliste bleibt bedienbar, nach einem Klick auf `p` und dort auf `src/b.txt` steht dessen Diff (`@@ -0,0 +1,2 @@`, `eins`, `zwei`), auf stderr steht eine Fehlerzeile mit dem Hash von `q` und dem Pfad `src/b.txt`, und stdout bleibt leer.

### Eingabe an git und fremdes Repo
- [ ] Gegeben in `.git/config` von Repo A `diff.external` mit einem Skript, das die Datei `marker-extern` anlegt, `diff.marker.textconv` und `diff.marker.command` mit Skripten, die `marker-textconv` bzw. `marker-command` anlegen, und eine `.gitattributes` mit `*.txt diff=marker`, wenn man `src/b.txt` wählt, dann zeigt der Diff dieselben Zeilen wie im Kriterium zu `src/b.txt` (nicht die Ausgabe eines Skripts), und keine der drei Markerdateien existiert. (Wirksame Probe: ohne `--no-textconv` legt `git show` `marker-textconv` an — mit `git` 2.48.1 gemessen.)
- [ ] Gegeben `gitreviewA q` mit `.git/config` `diff.context=0`, `diff.suppressBlankEmpty=true` und `color.ui=always`, wenn man `k.txt` wählt, dann zeigt der Diff `@@ -1,3 +1,3 @@`, `oben` (1/1), die leere Zeile als Kontext (2/2, mit Nummern), `−unten` (alt 3), `+UNTEN` (neu 3) — ohne Farbsteuerzeichen im Text und mit allen 3 Kontextzeilen wie ohne diese Einstellungen.
- [ ] Gegeben `gitreviewA q`, wenn man `GET /api/commits/<voller Hash von q>/diff?pfad=…` nacheinander mit `nicht-da.txt`, `../README.md`, `--output=pwn`, `src` (ein Ordner), `SRC/B.TXT`, `:(top)src/b.txt` und `*.txt` anfragt, dann antwortet jede mit 404, ohne dass `git` gestartet wird, und die Datei `pwn` existiert nicht; ohne `pfad` antwortet die Anfrage mit 400; mit `HEAD`, dem Hash von `p` (im Repo vorhanden, nicht übergeben) oder den ersten 7 Zeichen von `q` anstelle des Hashes und `pfad=src/b.txt` antwortet sie mit 404; mit dem vollen Hash von `q` und `pfad=src/b.txt` antwortet sie mit 200.
- [ ] Gegeben `gitreviewA s` (Commit `s` auf `q`), wenn man in der Dateiliste nacheinander `--output=pwn`, `:(glob)*.txt` und `c.txt` wählt, dann zeigt der Diff je nur die eigene Datei (`+x`, `+y` bzw. `+z`, je `@@ -0,0 +1 @@`, die Datei `:(glob)*.txt` also nicht auch `c.txt`), und im Arbeitsordner des Repos entsteht keine Datei `pwn`.

### Lastprofil
- [ ] Gegeben ein Commit `u` mit der hinzugefügten Datei `gross.txt` aus 20 000 Zeilen `zeile 00001` bis `zeile 20000` und `gitreviewA u`, wenn man `gross.txt` wählt, dann steht spätestens 1 s nach dem Klick der Kopf `@@ -0,0 +1,20000 @@` und die Zeile `zeile 20000` (neu 20000) im Dokument (gemessen vom Klick bis diese Zeile im Dokument steht; Messwert und Abstand siehe Technische Überlegungen).

## Betroffene Verzeichnisstruktur

Wie in R00001 und R00003 (`src/GitReviewA/` mit Themenordnern `Aufruf/`, `Git/`, `Server/`, `Protokoll/`, `Browser/`; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Git/` — `GitLeser` liest den Diff einer Datei; `GitStart` bleibt der einzige Weg zu `git`.
- `Server/` — Endpunkt `GET /api/commits/{hash}/diff`.
- `web/` — Diff-Rechnung und Diff-Bereich als neue Module neben `commits.js` und den Modulen von R00003; Stil `kd-*`.
- `tests/`, `e2e/` — Wegwerf-Repo-Hilfsklasse (erweitert um Dateiinhalte, Merge, Konfiguration, Marker-Skripte, 20 000 Zeilen) und E2E-Szenarien.

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Anfrage prüfen** — `GET /api/commits/{hash}/diff?pfad=<Pfad>`: Hash gegen die übergebenen vollen Hashes (wie R00003), danach der Pfad exakt gegen die Dateiliste des Commits (`Dateiaenderung`). Kein Treffer → 404 ohne `git`-Aufruf, kein `pfad` → 400. Empfehlung: die Dateiliste je Commit nach dem ersten Lesen im Speicher des Laufs halten (RAM, nichts wird gespeichert) und die Pfadprüfung dagegen laufen lassen — spart bei 2 000 Dateien ein zweites Lesen (Obergrenze ≤ 1 s); ohne Zwischenspeicher liest die Prüfung die Liste erneut.
2. **Art bestimmen** — aus dem Eintrag: Binärdatei (`numstat` `-`) → `art: binaer`, `+0 −0` → `art: leer`, beides ohne weiteren `git`-Aufruf; sonst `text`.
3. **Diff lesen** — `git --literal-pathspecs -c diff.suppressBlankEmpty=false show --format= -m --first-parent -M -U3 --no-color --no-ext-diff --no-textconv --end-of-options <hash> -- <pfad> [<alter Pfad>]` über `GitStart`, Argumentliste. Bei `R` mit geändertem Inhalt **beide** Pfade angeben, sonst erscheint die Datei als neu hinzugefügt (gemessen: `-- LIESMICH.md` allein zeigt `new file`, `-- README.md LIESMICH.md` zeigt `rename`). Die Ausgabe ab der ersten `@@`-Zeile ist der `patch`.
4. **Oberfläche** — beim Ereignis `datei-gewaehlt`: Bereich leeren, Anfrage senden; bei der Antwort nur zeichnen, wenn (Commit, Pfad) noch die gewählte Datei sind; sonst verwerfen. Patch → Zeilen (`patchZeilen`) → Blöcke zu 500 → DOM mit `textContent`; Wechsel des Commits leert den Bereich (Hinweis).

### Grobentwurf
**Einstiegsstellen:** Server (ein Endpunkt), `Git/` (Lesen), Oberfläche `web/` (Diff-Bereich).
- `Diffantwort` (DTO, immutable) — `Pfad`, `Status`, `AlterPfad`, `Art`, `Patch`.
- `GitLeser` (Ressourcenzugriff) — `string DiffLesen(string hash, Dateiaenderung datei, string arbeitsordner)`; wirft `GitFehler` mit Hash und Pfad.
- `Patchtext` (Operation, rein) — `string AbErstemHunk(string ausgabe)`: trennt den Dateikopf ab.
- Endpunkt `GET /api/commits/{hash}/diff` (Integration) — prüft Hash und Pfad, ruft `GitLeser`, antwortet 200, 400, 404 (ohne `git`) oder 500 mit `{fehler}`; Debug-Zeile je Anfrage, Fehler auf stderr.
- Oberfläche: `Diffzeilen` (rein, nach `patchZeilen`/`sichtbarTeile`/`bloecke` aus kanbanD), `Diffbereich` (Zustand „gezeigter Diff“, jüngste Wahl gewinnt, Umbruch-Umschalter).

### Messung des Zeitkriteriums
Startpunkt: Klick auf die Datei; Ereignis: die Zeile `zeile 20000` steht im Dokument (E2E wartet auf dieses Ereignis, nicht im Standardraster). Grenze 1 s (Obergrenze des Dateiwechsels, Lastprofil). Messwerte sind noch nicht vorhanden — der Entwickler misst auf dem Stand und hält mindestens 30 % Abstand zur Grenze ein (Messwert ≤ 0,7 s); liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium. Bis 20 000 Zeilen wird vollständig geladen; darüber (zugeklappt, „trotzdem laden“) ist I0014.

## Tests
Nach `~/.claude/skills/test-pyramide/SKILL.md`: User-Story-Szenarien werden Tests.

**Unit (pure Logik):** `Patchtext` (Dateikopf, Binärmeldung, leere Ausgabe), Pfadprüfung (exakt, Groß-/Kleinschreibung, Ordner, Muster); JS-Rechnung `patchZeilen` (Rechenbeispiele der Kriterien 1–4, `-0,0`, ausgelassene Anzahl, Hunk-Titel, leere Kontextzeile), `sichtbarTeile`, Blöcke; Abgleich später Antworten (jüngste Wahl gewinnt).
**Integration:** `GitLeser.DiffLesen` gegen Wegwerf-Repos (alle Dateien von A, Wurzelcommit, Merge, Umbenennung mit beiden Pfaden); **Marker-Skript-Probe** (`diff.external`, `textconv`, `command` — eine Probe pro Mechanismus, jede einzeln vorher rot); Konfigurationsprobe (`diff.context`, `diff.suppressBlankEmpty`, `color.ui`); Endpunkt auf freiem Port: 200/400/404/500, `--output=pwn` als Pfad und als Dateiname, Anzahl der `git`-Aufrufe je Anfrage, Antwortzeit für 20 kleine Dateien.
**E2E:** Playwright headless gegen Wegwerf-Repos: alle Kriterien der Gruppen „Diff lesen“ und „Laden“ (verzögerte Antwort über `route`, Fenstergröße 1280 × 800 für den Umbruch), „Eingabe an git und fremdes Repo“ über HTTP und Oberfläche, „Lastprofil“.

## Abhängigkeiten
- Abhängig von: I0005 Commits und Dateien sehen (R00003; Zustand „gewählte Datei“, `datei-gewaehlt`, `GET …/dateien`, `Dateiaenderung`) — Karte #5 im Bau, rot bis dahin; I0001 (Gerüst).
- Blockiert: I0007 Nebeneinander, I0008 Syntaxhervorhebung, I0009 Whitespace und Kontext, I0010 Zusammen-Ansicht, I0011 VS Code, I0012 Umbenennung/Bild/Binär, I0014 Große Diffs, I0016 Datei abhaken, I0017 Zeile annotieren.

Nicht Teil dieser Anforderung (eigene Karten): Nebeneinander (I0007), Syntaxfarben (I0008), Whitespace und Kontext einstellbar (I0009), Zusammen-Ansicht (I0010), VS-Code-Sprung (I0011), Darstellung von Umbenennung mit altem Pfad, Bildern und Binärdateien (I0012), Zuklappen großer Diffs (I0014), Tastatur (I0015), Anmerken (I0017).

## Offene Fragen
1. An den product-owner: **Zeilenumbruch beim Start** aus (Empfehlung: Einrückung und Spalten bleiben lesbar, lange Zeilen sind mit dem Umschalter erreichbar) oder an?
2. An den product-owner: **erste Datei beim Wechsel des Commits vorwählen**, damit der Diff sofort sichtbar ist (R00003 hebt die Wahl auf, Empfehlung: jetzt nein, bis zum ersten Ausprobieren; die Änderung ist klein: ein Kriterium in R00003, eines hier)?
3. An den product-owner: **Unsichtbare und richtungsändernde Zeichen** als Marke zeigen (Empfehlung: ja, aus kanbanD übernommen, Kriterium zu `fremd.txt`; ein Prüfer sieht in KI-geschriebenem Code sonst nicht, was dort steht); falls nein, entfällt der Teil des Kriteriums.
4. An den product-owner: genügt „Keine Zeilenänderungen“ bei einer Datei, deren **Rechte** (chmod) oder deren Art (Symlink) sich geändert haben (Empfehlung: ja, ein Hinweis auf Rechte erst bei Bedarf)?
5. An den product-owner, für I0017: eine **Anmerkung an einer entfernten Zeile** hat keine Nummer neu, R00002 verlangt eine Zeile ≥ 1 im Stand nach dem Commit (Empfehlung: nicht annotierbar, Hinweis; oder die folgende neue Zeile).

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unterhalb I0006 (B0301–B0308), davon 3 Standard (2 h) und 5 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 26 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble, die Richtwerte sind also ein Vielfaches davon; mit einem einzigen gemessenen Slice rechne ich noch nicht um. Enthalten: nur I0006; I0007 ff. sind nicht bis Bubble geplant und nicht gezählt.

## Warum löst diese Anforderung das Problem?

Der Auslöser: eine KI hat Commits geschrieben, und der Mensch will in zwei Klicks sehen, was sich in einer Datei geändert hat, statt `git show <hash> -- <datei>` abzutippen — und später an eine Zeile eine Anmerkung hängen. Wenn die Dateiwahl aus R00003 den Diff dieser einen Datei lädt und mit Zeilennummern alt und neu zeigt, dann liest der Mensch genau die geänderten Stellen, und die Nummer neu ist dieselbe Stellenangabe, die das Ergebnis nach R00002 an die KI zurückgibt. Hebel gerade hier: der Diff ist der Moment, in dem gitreviewA für echte Reviews taugt und zugleich die erste Stelle, an der Inhalt eines fremden Repos in die Oberfläche und in einen `git`-Aufruf mit seinem Pfad fließt; Wörtlicher Pfad, `--no-textconv` und Text statt HTML hier festzulegen verhindert, dass ein präpariertes Repo beim Ansehen ein Programm startet oder ein Skript einschleust.

## Missing-Docs
- Vorgehen von `git show -m --first-parent -M` mit `--literal-pathspecs` und zwei Pfaden bei Umbenennung mit geändertem Inhalt sowie bei einem Merge-Commit: gemessen für Umbenennung ohne Änderung, Datei- und Optionsnamen mit `--`/`:(`; Umbenennung mit Änderung und Merge im Wegwerf-Repo vor dem Bauen proben.
- `git show` startet `diff.external` nicht (nur `git diff`); `textconv` aber schon (mit `git` 2.48.1 im Wegwerf-Repo gemessen). Die Marker-Probe prüft alle drei Wege, damit ein Wechsel auf `git diff` nicht unbemerkt bleibt.

## Notizen

### Optionen (Zuschnitt des Diff-Ladens)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Ein Endpunkt je Datei, `art` aus der Dateiliste, Diff nur für Text, Pfad gegen die Dateiliste des Commits (Empfehlung) | Aufrufe zählbar, Lastprofil direkt prüfbar | gering; Pfadprüfung ist neue Grenze | mittel |
| 2. Diff aller Dateien eines Commits in einer Antwort | ein Aufruf, aber Startzeit hängt an der Größe des ganzen Commits | Lastprofil (2 000 Dateien) und „bei Bedarf laden“ verletzt | klein |
| 3. Server liefert fertige Zeilen mit Nummern (Rechnung in C#) | Rechnung in C# testbar | doppelte Wahrheit zu kanbanD `patchZeilen`, später I0007 und I0008 in beiden Sprachen | groß |

Gewählt: 1.

### Verworfene Alternativen
- Option 2: verletzt „Diffs je Datei bei Bedarf“ der Vision und macht den Commit-Wechsel zur Last.
- Option 3: kanbanD rechnet die Zeilen im Browser (`patchZeilen`, in Node testbar); der Server liefert den Text von `git`, damit die Anzeige „genau die von `git`“ ist.
- Schnitt in „Diff anzeigen“ und „Zeilenumbruch“ als zwei Slices: der Umbruch ist eine Schaltfläche an derselben Anzeige, nicht für sich auslieferbar — nach Schichten geschnitten. Als erste Schnittstelle, falls der Slice im Bau zu groß wird: **Zeilenumbruch** und **Marken für unsichtbare Zeichen** als Ausbaustufe (dasselbe Verhalten reifer, für sich auslieferbar).
- Pfad per `git`-Pathspec-Muster zulassen (Ordner anzeigen): ein Pfad, der nicht genau in der Dateiliste steht, wäre die Tür für Muster und Optionen; verworfen.
- Typischer Dateiwechsel ≤ 200 ms als E2E-Kriterium: im Browser-Test nicht belastbar messbar; nur die Obergrenze ≤ 1 s ist Kriterium.
