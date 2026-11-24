---
id: R00003
status: Neu
datum: 2026-11-24
---

# R00003: Commits und Dateien sehen

## Beschreibung

Der prüfende Mensch sieht in der Hauptansicht links die Commit-Leiste der übergebenen Commits — je Commit Kurz-Hash, Autor, Datum, Betreff und die ausklappbare Message — und rechts daneben die Dateiliste des gewählten Commits: je Datei der Status (`A` hinzugefügt, `M` geändert, `D` gelöscht, `R` umbenannt) und die Zahl der hinzugefügten und entfernten Zeilen (`+`/`−`), wahlweise als Baum nach Ordnern oder flach. Die Auswahl einer Datei ist als Zustand der Oberfläche festgehalten, damit I0006 (Diff einer Datei lesen) daran anschließt; den Diff selbst zeigt diese Anforderung nicht.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (Voraussetzung: Auswahl und Überblick über Commits und Dateien) und die Leitplanken Lastprofil (200 Commits, 2 000 Dateien, Diffs je Datei bei Bedarf) und „Git über die Kommandozeile“.

Baut auf [R00001](R00001-mit-commit-hashes-aufrufen.md) auf (Gerüst, Commit-Liste mit Kurz-Hash und Betreff, `GET /api/commits`, Host-Prüfung, Wegwerf-Repo-Hilfsklasse, E2E-Gerüst).

**Übernahme aus kanbanD** (Betreiber 2026-11-24; Herkunft im Commit nennen, keine eigene Gestaltung erfinden und keine Wireframes): Stil aus `~/Projekte/kanbanD/web/kd-tokens.css`, `kd-base.css`, `kd-app.css` (wie R00001). Als Vorlage, soweit sie passen: aus `web/commits.js` die Zeilenwerte (`zeilenwerte`: Kurz-Hash, Betreff, Autor, Datum) und die Datumsdarstellung (`datumText`, `TT.MM.JJJJ HH:MM`, volle ISO-Zeit als Hinweistext); aus `web/review-uebersicht.js` die `+`/`−`-Balken (`balkenTeile`, Länge und Mindestlänge im CSS). **Nicht übernommen:** `dateiArt`/`dateiGruppen` (Gruppen Code/Tests/Doku) — nicht gefordert; Diff-, VS-Code- und Sprunglogik gehören zu I0006 ff.

## Geschäftlicher Nutzen

Bevor der Mensch einen Diff liest, muss er wissen, was die KI überhaupt angefasst hat: welche Commits, von wem, wann, mit welcher Begründung, und welche Dateien in welchem Umfang. Ohne diese Übersicht müsste er `git log --stat` je Commit abtippen. Mit ihr wählt er in zwei Klicks die Datei, die I0006 ihm als Diff zeigt, und sieht in der Dateiliste sofort die großen und die gelöschten Änderungen.

## Funktionale Anforderungen

- Die Commit-Leiste zeigt je übergebenem Commit eine Zeile mit Kurz-Hash (7 Zeichen), Autor (Name), Datum (Autordatum) und Betreff, in der Reihenfolge des Aufrufs; Autor, Datum, Betreff und Message sind Text, nie HTML.
- Das Datum erscheint als `TT.MM.JJJJ HH:MM` in der Ortszeit des Browsers; der volle Zeitpunkt (ISO 8601 mit Zeitzone des Autors) steht als Hinweistext daran.
- Die Message eines Commits ist sein Text nach dem Betreff (Rumpf); sie ist je Commit ein- und ausklappbar, zunächst eingeklappt. Ein Commit ohne Rumpf bietet kein Ausklappen an.
- Ein Commit ist gewählt (hervorgehoben); beim Start ist es der erste der Leiste. Ein Klick auf einen anderen Commit wählt ihn.
- Rechts zeigt die Dateiliste des gewählten Commits je Datei: Statusbuchstabe `A`, `M`, `D` oder `R`, den Pfad und die `+`-/`−`-Zahlen mit Balken; über der Liste steht die Summe (`<n> Dateien · +<x> −<y>`).
- Dateiliste wahlweise flach (ein Eintrag je Datei mit vollem Pfad, Reihenfolge wie `git` sie liefert) oder als Baum (Ordner als eingerückte Zeilen, darunter ihre Dateien; Ordner vor Dateien, je alphabetisch ohne Beachtung der Groß-/Kleinschreibung). Beim Start flach; die Wahl bleibt beim Wechsel des Commits erhalten.
- Eine umbenannte Datei trägt `R` und ihren neuen Pfad (der alte Pfad und die Darstellung der Umbenennung gehören zu I0012). Eine Binärdatei trägt ihren Status und statt der Zahlen einen Strich; sie zählt nicht in die Summe (das Bild und die Darstellung gehören zu I0012). Jeder andere Status von `git` (etwa Typwechsel) erscheint als `M`.
- Ein Klick auf eine Datei wählt sie (hervorgehoben, genau eine je Ansicht); Wechsel des Commits hebt die Wahl auf. Die Wahl ist ein benannter Zustand der Oberfläche (Commit, Pfad), an den I0006 anschließt.
- Die Dateiliste eines Commits wird erst bei seiner Auswahl gelesen (ein Lesevorgang je gewähltem Commit), nicht für alle vorab.
- Ein Commit ohne Dateien zeigt „Keine Dateien geändert“; kann die Dateiliste nicht gelesen werden, zeigt die Dateiliste eine Fehlermeldung, die Commit-Leiste bleibt bedienbar.
- Merge-Commits: siehe offene Frage 2; bis zur Antwort gilt die Annahme „Änderungen gegenüber dem ersten Elternteil“.

## Nicht-funktionale Anforderungen

- Performance (Lastprofil der Vision): die Commit-Leiste mit allen 200 Commits samt Autor, Datum und Rumpf steht ≤ 2 s nach dem Prozessstart; die Daten kommen weiter mit **einem** `git`-Aufruf für alle Commits (nicht je Commit einer). Die Dateiliste eines Commits mit 2 000 geänderten Dateien steht ≤ 1 s nach dem Klick auf den Commit (Obergrenze des Dateiwechsels).
- Sicherheit: Autor, Betreff, Message und Dateinamen sind fremder Text und werden nie als HTML gedeutet; die Dateiliste wird nur für einen Hash gelesen, der beim Aufruf übergeben wurde (volle Schreibweise), jede andere Anfrage endet vor `git`; `git` mit Argumentliste, nie über eine Shell; Pfade werden ohne Anführungszeichen-Maskierung gelesen (Umlaute und Sonderzeichen bleiben erhalten).
- Logging: stdout bleibt leer; je Anfrage eine Debug-Zeile auf stderr (`GET /api/commits/<kurz>/dateien`) wie R00001; Fehler beim Lesen einer Dateiliste als Error auf stderr mit Kontext (Commit).
- Benutzerfreundlichkeit: Gestaltung aus kanbanD (siehe oben); keine eigenen Gestaltungsvorgaben.

## Akzeptanzkriterien

Vorbereitung (herstellbar mit `git` allein, Wegwerf-Repo): Commit `p` „Start“ (Autor „Anna Beispiel“, Autordatum `2026-03-04T09:15:00+01:00`) fügt `README.md` (2 Zeilen), `src/a.txt` (3), `src/b.txt` (2) und `alt.txt` (4) hinzu; Commit `q` „Dateien ändern“ (Autor „Bernd Beispiel“, `2026-03-05T18:30:00+01:00`, Rumpf `Zeile eins` / `Zeile zwei`) ändert `src/b.txt` (eine Zeile ersetzt, eine angefügt: `+2 −1`), löscht `alt.txt`, benennt `README.md` unverändert in `LIESMICH.md` um und fügt die Binärdatei `logo.bin` hinzu; Commit `r` „Nichts“ ist leer (`--allow-empty`).

### Commit-Leiste
- [ ] Gegeben die Commits `p`, `q`, `r`, wenn man `gitreviewA r q p` aufruft, dann zeigt die Leiste genau 3 Zeilen in dieser Reihenfolge, je mit den ersten 7 Zeichen des Hashes, dem Autor und dem Betreff (zuerst „Nichts“, dann „Dateien ändern“ von „Bernd Beispiel“, dann „Start“ von „Anna Beispiel“).
- [ ] Gegeben `q` mit dem Autordatum `2026-03-05T18:30:00+01:00` und einen Browser in der Zeitzone Europe/Berlin (Winterzeit, +01:00), wenn die Leiste geladen ist, dann steht in der Zeile `05.03.2026 18:30`; im selben Lauf mit einem Browser in UTC steht `05.03.2026 17:30`, und der Hinweistext trägt in beiden Fällen den Zeitpunkt `2026-03-05T18:30:00+01:00`.
- [ ] Gegeben `q` mit dem Rumpf „Zeile eins“ / „Zeile zwei“ und `p` ohne Rumpf, wenn die Leiste geladen ist, dann ist der Rumpf von `q` nicht zu sehen und wird nach dem Ausklappen vollständig (beide Zeilen) angezeigt, `p` bietet kein Ausklappen an, und das Einklappen versteckt den Rumpf wieder.
- [ ] Gegeben ein Commit mit dem Autor `<i>Mallory</i>`, dem Betreff `<script>alert(1)</script>` und dem Rumpf `<b>fett</b>`, wenn die Leiste geladen und der Rumpf ausgeklappt ist, dann stehen alle drei als sichtbarer Text da (mit den spitzen Klammern), es erscheint kein Dialog, und der Rumpf ist nicht fett.

### Dateiliste
- [ ] Gegeben der Aufruf `gitreviewA p q r`, wenn die Seite geladen ist, dann ist `p` gewählt, und die Dateiliste zeigt in dieser Reihenfolge 4 Einträge `A` (`README.md` +2 −0, `alt.txt` +4 −0, `src/a.txt` +3 −0, `src/b.txt` +2 −0) mit der Summe „4 Dateien · +11 −0“.
- [ ] Gegeben dasselbe, wenn man auf `q` klickt, dann zeigt die Liste 4 Einträge (Reihenfolge nicht festgelegt): `M` `src/b.txt` +2 −1, `D` `alt.txt` +0 −4, `R` `LIESMICH.md` +0 −0, `A` `logo.bin` mit einem Strich statt der Zahlen, und die Summe „4 Dateien · +2 −5“ (Rechnung: +2 +0 +0 +0 = 2 hinzugefügt, −1 −4 −0 = 5 entfernt; die Binärdatei zählt nicht).
- [ ] Gegeben `r` (leerer Commit), wenn man auf `r` klickt, dann steht in der Dateiliste „Keine Dateien geändert“ statt einer leeren Fläche.
- [ ] Gegeben ein Commit mit den Dateien `ä ö.txt` und `<b>fett</b>.txt` (je 1 hinzugefügte Zeile), wenn man ihn wählt, dann stehen beide Pfade mit Umlauten und spitzen Klammern als sichtbarer Text da (nicht in Anführungszeichen mit Oktalcodes, nicht fett), jeweils `A` +1 −0.
- [ ] Gegeben `q` gewählt, wenn man auf „Baum“ umschaltet, dann zeigt die Liste in dieser Reihenfolge: den Ordner `src` mit `b.txt` eingerückt darunter (ohne `src/` im Namen), danach auf oberster Ebene `alt.txt`, `LIESMICH.md`, `logo.bin`; schaltet man auf „flach“ zurück, stehen wieder die vollen Pfade; wählt man danach `p`, bleibt die zuletzt gewählte Darstellung erhalten.
- [ ] Gegeben `q` gewählt, wenn man auf die Datei `src/b.txt` klickt, dann ist genau diese Datei als gewählt hervorgehoben, und ein Klick auf `LIESMICH.md` hebt `src/b.txt` auf und wählt stattdessen `LIESMICH.md`; wechselt man zu `p`, ist in der Liste keine Datei mehr gewählt.

### Laden und Eingabe an git
- [ ] Gegeben der Aufruf `gitreviewA p q r` mit `--verbose`, wenn die Seite geladen ist, ohne dass geklickt wurde, dann steht auf stderr genau 1 Zeile `GET /api/commits/<voller Hash von p>/dateien`; nach einem Klick auf `q` sind es genau 2 (eine je gewähltem Commit).
- [ ] Gegeben der Aufruf `gitreviewA p`, wenn nacheinander die Dateiliste mit `HEAD`, mit `--output=pwn`, mit dem Hash von `q` (im Repo vorhanden, nicht übergeben) und mit den ersten 7 Zeichen des Hashes von `p` angefragt wird, dann antwortet jede Anfrage mit 404, kein `git`-Prozess wird dafür gestartet, und die Datei `pwn` existiert nicht; die Anfrage mit dem vollen Hash von `p` antwortet mit 200.
- [ ] Gegeben ein Lauf mit `p` und `q`, in dessen Repository nach dem Start die Objektdatei von `q` entfernt wurde, wenn man auf `q` klickt, dann steht in der Dateiliste eine Fehlermeldung („Dateien konnten nicht gelesen werden“), die Leiste bleibt bedienbar, ein Klick auf `p` zeigt dessen vier Dateien, nach Neuladen der Seite stehen beide Commits wieder in der Leiste, auf stderr steht eine Fehlerzeile mit dem Hash von `q`, und stdout bleibt leer.

### Lastprofil
- [ ] Gegeben ein Repository mit 200 Commits (je mit Autor und einem Rumpf von 5 Zeilen) und ihre 200 Hashes als Argumente, wenn der Lauf gestartet wird, dann zeigt die Leiste 200 Zeilen spätestens 2 s nach dem Prozessstart (gemessen bis die 200. Zeile sichtbar ist), und die Daten kamen mit einem einzigen `git`-Aufruf.
- [ ] Gegeben ein Commit mit 2 000 hinzugefügten Dateien (je 1 Zeile) und ein weiterer Commit, wenn man auf den großen Commit klickt, dann sind spätestens 1 s nach dem Klick 2 000 Zeilen in der Dateiliste sichtbar (gemessen vom Klick bis die 2 000. Zeile sichtbar ist; Messwert und Abstand siehe Technische Überlegungen), und die Summe lautet „2000 Dateien · +2000 −0“.

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (`src/GitReviewA/` mit Themenordnern `Aufruf/`, `Git/`, `Server/`, `Protokoll/`, `Browser/`; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`). Namen und Ordner legt Karte #1 fest und gelten dort; hier als Annahme nach dem Grobentwurf von R00001.

- `Git/` — Lesen der Commitdetails und der Dateiliste, Parser.
- `Server/` — Endpunkte `GET /api/commits` (erweitert) und `GET /api/commits/{hash}/dateien`.
- `web/` — Leiste und Dateiliste (neue Module neben `commits.js`); Wegwerf-Repo-Hilfsklasse und E2E-Szenarien in `tests/` bzw. `e2e/`.

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Commitdetails lesen** — erweitert das Lesen aus R00001 um Autor, Datum, Rumpf, weiter in **einem** Aufruf: `git log --no-walk=unsorted -z --format=%H%x1f%an%x1f%aI%x1f%s%x1f%b --end-of-options <hashes>`; Datensätze nach NUL, Felder nach `0x1f` (ein Rumpf kann keines von beiden enthalten).
2. **Server** — `GET /api/commits` liefert je Commit `hash`, `kurz`, `autor`, `datum` (ISO), `betreff`, `rumpf`; `GET /api/commits/{hash}/dateien` liefert die Dateiliste. Der Pfadparameter wird gegen die beim Start gelesenen vollen Hashes verglichen (ohne Beachtung der Schreibweise); kein Treffer → 404 ohne `git`-Aufruf.
3. **Dateiliste lesen** — `git show --format= -m --first-parent -M --raw --numstat --no-abbrev -z --end-of-options <hash>` mit Argumentliste (Annahme; das Format der `-z`-Ausgabe bei Umbenennungen und Binärdateien ist beim Bauen zu bestätigen — `R` trägt zwei Pfade, `numstat` steht für Binärdateien als `-	-`). Der Wurzelcommit erscheint als lauter `A`.
4. **Oberfläche** — beim Start Leiste zeichnen, ersten Commit wählen, dessen Dateiliste laden; Klick auf einen Commit lädt seine Liste (einmal je Auswahl); Klick auf eine Datei setzt den Zustand „gewählte Datei“ (Commit-Hash, Pfad, Status, bei `R` alter Pfad) und löst das Dokumentereignis `datei-gewaehlt` aus — der Anschluss für I0006, der dort den Diff lädt; die Zeile trägt `aria-selected="true"`.

### Grobentwurf
**Einstiegsstellen:** Server (zwei Endpunkte), Oberfläche `web/` (Leiste, Dateiliste), `Git/` (Lesen).
- `Commitzeile` (DTO, immutable) — erweitert um Autor, Datum, Rumpf (Name wie in R00001 vorgeplant).
- `Dateiaenderung` (DTO, immutable) — Status (`A`/`M`/`D`/`R`), Pfad, alter Pfad (nur `R`), Plus, Minus (beide leer bei Binärdateien).
- `Dateiaenderungen` (benannte Collection) — Reihenfolge von `git`; `Dateiaenderungen Parse(string ausgabe)` im `DateiaenderungenParser` (Operation, rein).
- `GitLeser` (Ressourcenzugriff) — `Commitzeilen Lesen(...)` (erweitert), `Dateiaenderungen DateienLesen(string hash, string arbeitsordner)`.
- Endpunkt `GET /api/commits/{hash}/dateien` (Integration) — prüft den Hash gegen die Aufrufmenge, ruft `GitLeser`, antwortet 404 bzw. 500 mit `{fehler}`.
- Oberfläche: `Zeilenwerte` (Autor, Datumstext), `Balkenteile` (`+`/`−`-Anteile), `Baumbildner` (flach → Baum, rein), Zustand „gewählter Commit / gewählte Datei“.

### Messung der Zeitkriterien
- Leiste 200 Zeilen: Startpunkt Prozessstart, Ereignis 200. Zeile sichtbar (wie R00001; E2E wartet auf das Ereignis, nicht im Standardraster). Grenze 2 s.
- Dateiliste 2 000 Zeilen: Startpunkt Klick auf den Commit, Ereignis 2 000. Zeile sichtbar. Grenze 1 s (Obergrenze des Dateiwechsels, Lastprofil). Messwerte sind noch nicht vorhanden — der Entwickler misst auf dem Stand und hält den Abstand von mindestens 30 % zur Grenze ein (also Messwert ≤ 0,7 s bzw. ≤ 1,4 s); liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium. Der typische Dateiwechsel von ≤ 200 ms ist hier kein Kriterium (E2E-Messung zu ungenau); er wird als Integrationsmessung der Antwortzeit für 20 Dateien im Bericht festgehalten.

## Tests
Nach `~/.claude/skills/test-pyramide/SKILL.md`: User-Story-Szenarien werden Tests.

**Unit (pure Logik):** `DateiaenderungenParser` (`A`/`M`/`D`/`R`, Binärdatei, Pfad mit Leerzeichen, Umlaut, Zeilenumbruch im Namen), Aufteilung der Commit-Ausgabe (Rumpf mit Leerzeilen, leerer Rumpf), Datumstext und Zeitzone (Rechenbeispiel Europe/Berlin/UTC), Baumbildung (Ordnerreihenfolge, verschachtelt), Summe, Balkenanteile.
**Integration:** `GitLeser` gegen Wegwerf-Repos (Vorbereitung dieser Anforderung inkl. Wurzel-, leerem und Merge-Commit); Endpunkte auf freiem Port: `/api/commits` mit den neuen Feldern, `/dateien` mit 200/404 (Varianten `HEAD`, `--output=pwn`, nicht übergebener Hash, Kurz-Hash), 500-Pfad mit entferntem Objekt; Anzahl der `git`-Aufrufe (ein Lesen für die Leiste, eines je Dateiliste).
**E2E:** Playwright headless gegen das Wegwerf-Repo: alle Kriterien der Gruppen „Commit-Leiste“, „Dateiliste“ und „Lastprofil“ (Zeitzone über `timezoneId` des Browser-Kontexts), „Laden und Eingabe an git“ über stderr-Zählung und HTTP.

## Abhängigkeiten
- Abhängig von: I0001 Mit Commit-Hashes aufrufen (R00001; Gerüst, Commit-Liste, Wegwerf-Repo-Hilfsklasse, E2E-Gerüst) — Karte #1 gerade im Bau, rot bis dahin.
- Blockiert: I0006 Diff einer Datei lesen (braucht die Dateiwahl), I0013 Ausblenden und Suchen.

Nicht Teil dieser Anforderung (eigene Karten): Diff (I0006), Abhaken (I0016), Ausblenden und Suchen in der Dateiliste (I0013), Darstellung von Umbenennung mit altem Pfad, Bildern und Binärdateien (I0012; hier nur der Buchstabe `R` und der Strich), Tastaturbedienung (I0015), Zusammen-Ansicht über alle Commits (I0010).

## Offene Fragen
1. An den product-owner: Ist die **Vorwahl des ersten Commits** beim Start gewollt (Empfehlung: ja — spart einen Klick, kostet einen Lesevorgang)?
2. An den product-owner: **Merge-Commits** — Dateiliste gegen den ersten Elternteil (Empfehlung; entspricht dem, was ein Mensch von „diese Änderung kam hinzu“ erwartet) oder wie `git show` (kombinierter Diff, nur Konfliktdateien)? I0006 muss dieselbe Antwort nehmen.
3. An den product-owner: **Message** als Rumpf nach dem Betreff (Empfehlung; der Betreff steht schon in der Zeile) oder als vollständiger Text einschließlich Betreff?

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 9 Bubbles unterhalb I0005 (B0201–B0209), davon 3 Standard (2 h) und 6 unklar (2–4 h) — Untergrenze 18 h, obere Schätzung 30 h. Enthalten: nur I0005; I0006 ff. sind nicht bis Bubble geplant und nicht gezählt.

## Warum löst diese Anforderung das Problem?

Der Auslöser: eine KI hat mehrere Commits geschrieben, und der Mensch will entscheiden, wo er zuerst hinschaut, ohne `git log --stat` je Commit abzutippen. Wenn die Leiste Autor, Datum, Betreff und Message je Commit zeigt und die Dateiliste mit Status und `+`/`−` je gewähltem Commit daneben steht, dann erkennt der Mensch auf einen Blick, welche Commits groß sind, was gelöscht oder umbenannt wurde und wo die Änderung liegt, und wählt gezielt die Datei, die I0006 als Diff zeigt. Hebel gerade hier: die Übersicht ist die Voraussetzung jedes weiteren Schritts (Diff, Abhaken, Anmerken), und das Lastprofil (200 Commits, 2 000 Dateien) wird von Anfang an mit „eine Dateiliste je gewähltem Commit, bei Bedarf geladen“ eingehalten statt später nachgerüstet.

## Missing-Docs
- Ausgabeformat von `git show --raw --numstat -z` für Umbenennungen und Binärdateien sowie `-m --first-parent` für Merge-Commits — vor dem Bauen gegen die git-Dokumentation und eine Probe im Wegwerf-Repo prüfen.

## Notizen

### Optionen (Zuschnitt der Dateiliste)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Dateiliste je Commit bei Auswahl laden, eigener Endpunkt; Baum und flach in der Oberfläche aus denselben Daten (Empfehlung) | Lesevorgänge zählbar, Lastprofil direkt prüfbar | gering; neuer Endpunkt mit Hash-Prüfung | mittel |
| 2. Dateilisten aller Commits mit `/api/commits` vorab laden | ein Aufruf, aber bis 200 Commits × Dateien in der Startzeit | Startzeit ≤ 2 s gefährdet, Lastprofil verletzt | klein |
| 3. Baum und flach getrennt (Server liefert den Baum) | zwei Formate zu testen | doppelte Wahrheit | groß |

Gewählt: 1.

### Verworfene Alternativen
- Option 2: die Startzeit hinge von der Gesamtzahl geänderter Dateien aller Commits; „Diffs und Details bei Bedarf“ ist Leitplanke der Vision.
- Option 3: der Server liefert eine flache Liste, der Baum ist reine Darstellung.
- Schnitt in „Leiste“ und „Dateiliste“ als zwei Slices: die Dateiliste ist ohne Auswahl in der Leiste nicht prüfbar, und die Leiste allein liefert gegenüber R00001 nur Autor und Datum — nach Schichten geschnitten. Als erste Schnittstelle, falls der Slice im Bau zu groß wird: die **Baumdarstellung** als Ausbaustufe (dasselbe Verhalten reifer, für sich auslieferbar).
- Typischer Dateiwechsel ≤ 200 ms als E2E-Kriterium: im Browser-Test nicht belastbar messbar; nur die Obergrenze ≤ 1 s ist Kriterium.
