---
id: R00025
status: Neu
datum: 2026-11-25
---

# R00025: Dateien ausblenden

## Beschreibung

Der prüfende Mensch sieht in großen Änderungen bis zu 2 000 Dateien, von denen ihn viele nicht interessieren (Schloss-Dateien, erzeugte Dateien, Protokolle). gitreviewA blendet sie auf Wunsch aus der Dateiliste aus: über die Aufrufoption `--ignore <muster>` (mehrfach, von der aufrufenden KI) und über ein Musterfeld in der Oberfläche (vom Menschen, hinzufügbar und entfernbar). Ausblenden ist eine **Sicht**: die ausgeblendete Datei bleibt Teil der Auswahl — sie ist weiter abhakbar, zählt in „n von m abgehakt“ und wird im Ergebnis genannt —, und ein Zähler sagt, wie viele Dateien gerade ausgeblendet sind.

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen“ („Ausblendmuster und Suche helfen, das Wesentliche zu finden“) und das Lastprofil (2 000 geänderte Dateien).

Baut auf auf: [R00001](R00001-mit-commit-hashes-aufrufen.md) (Aufruf, Optionen, Gerüst), [R00016](R00016-ungueltiger-aufruf.md) (ungültiger Aufruf: eigene Meldung, Exit-Code 2, kein Server), [R00003](R00003-commits-und-dateien-sehen.md) (Dateiliste, flach und Baum), [R00011](R00011-datei-abhaken.md) (Stellen, Fortschritt „n von m“, Ergebnisabschnitt `## Dateien`), [R00015](R00015-zusammen-logik-und-server.md) (Netto-Dateiliste) und [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (die neue Dateiliste aus I0027). Die Textsuche ist **nicht** Teil dieser Anforderung; sie ist als eigene Interaction abgeschnitten (I0031, WBS).

**Abgrenzung (Schnitt, WBS-Notiz zu I0013):** Die ursprüngliche WBS-Interaction „Ausblenden und Suchen“ ergäbe mit beiden Hälften über acht Bubbles; geschnitten nach „Regeln/Schnittstellen“ bleibt hier das Ausblenden (es trägt eine neue Aufrufoption, also neues Verhalten an der Systemgrenze), die Suche wird I0031 (nur im Browser, ohne neuen Aufruf; Requirement später).

## Geschäftlicher Nutzen

Eine KI schreibt in einem Lauf leicht 50 Commits mit über tausend geänderten Dateien; darunter sind Schloss-Dateien, erzeugte Client-Bündel, Übersetzungsdateien und Protokolle, die niemand Zeile für Zeile prüft. Ohne Ausblenden liest der Mensch an ihnen vorbei, scrollt die Liste durch, verliert den Überblick und lässt am Ende Wesentliches ungeprüft — die KI erfährt davon nichts, weil „Keine Anmerkungen.“ wie Freigabe aussieht. Mit Ausblenden benennt die aufrufende KI das Rauschen schon beim Aufruf (`--ignore '*.lock'`), der Mensch entfernt oder ergänzt Muster nach Bedarf, und beide sehen nur noch, was zu prüfen ist — ohne dass eine ausgeblendete Datei still aus dem Fortschritt oder aus dem Ergebnis fällt.

## Funktionale Anforderungen

- **Aufrufoption `--ignore <muster>`**: mehrfach angebbar, an beliebiger Stelle, sammelt die Muster in der Reihenfolge des Aufrufs. Ein ungültiges Muster ist ein **ungültiger Aufruf** im Sinne von R00016: eigene Meldung auf stderr, Exit-Code 2, nichts auf stdout, **kein Server**, kein `git`-Aufruf für das Muster. Die vorhandenen Optionen (`--port`, `--kein-browser`, `--verbose`, `--quiet`) bleiben unberührt.
- **Mustersprache**: eine feste, kleine Glob-Grammatik, ausdrücklich **kein** git-Pathspec und **kein** regulärer Ausdruck. Gültig: `*` (eine Folge von Zeichen innerhalb eines Pfadsegments), `**` (über Pfadsegmente hinweg), `?` (ein Zeichen), `[abc]`/`[a-z]` (eine Zeichenklasse), normale Zeichen. Ein Muster **ohne** `/` trifft den Dateinamen auf jeder Ebene (wie eine `.gitignore`-Zeile, z. B. `*.lock` trifft `app.lock` und `build/app.lock`); ein Muster **mit** `/` wird gegen den ganzen Pfad von der Wurzel verglichen. **Keine** Negation (`!`), **keine** Anker, **keine** Klammern als Gruppe. Groß- und Kleinschreibung werden **unterschieden** (wie das Dateisystem unter Linux).
- **Gültig/ungültig**: gültig ist ein Muster mit 1 bis 200 Zeichen ohne Steuer- und Richtungszeichen (dieselbe Zeichenmenge wie die Marken der Oberfläche, R00004). Ungültig: leer, nur Leerraum, über 200 Zeichen, mit Steuerzeichen (auch LF/CR) oder Richtungszeichen (U+202E ff.), und ein 21. `--ignore` (höchstens 20 Muster je Lauf). Ein Muster, das nichts trifft, ist gültig und blendet nichts aus.
- **Der Server liest das Muster nicht**: Muster werden **nie** an `git` gegeben (kein Argument, kein Pathspec, kein `--end-of-options`-Fall) und erscheinen nie im Protokoll im Wortlaut (nur ihre Länge).
- **Muster in der Oberfläche**: ein Musterfeld zeigt die aktuellen Muster (die aus dem Aufruf als Anfangsstand, dazu die in der Oberfläche hinzugefügten) und lässt jedes einzelne entfernen und neue hinzufügen. Es wird nichts gespeichert: ein Neuladen setzt die Muster auf den Anfangsstand aus dem Aufruf zurück.
- **Sicht, nicht Auswahl**: Ausgeblendete Dateien verschwinden nur aus der **Anzeige** der Dateiliste (in beiden Modi „Zusammen“ und „Einzeln“, flach und als Baum). Haken, Stellen, Fortschritt („n von m“) und der Ergebnisabschnitt `## Dateien` bleiben über die **ganze** Auswahl gerechnet; eine ausgeblendete Datei bleibt abhakbar und wird im Ergebnis genannt. Ein Zähler **im Kopf neben dem Fortschritt** nennt die ausgeblendeten Dateien samt Anteil je Grund („n ausgeblendet, davon b Muster“); ein Anteil von 0 wird weggelassen, bei 0 ausgeblendeten steht kein Zähler. Ort und Wortlaut löst R00012 ab; den Anteil „abgehakt“ bringt I0026 (R00029) hinzu.
- **Zähler und Protokoll**: eine Debug-Zeile auf stderr je Änderung der Muster nennt die Zahl der Muster und die Zahl der Ausgeblendeten, nie den Wortlaut eines Musters.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): bei 2 000 geänderten Dateien steht die gefilterte Dateiliste spätestens 1 s nach dem Laden der Seite (Messwert ≤ 0,7 s, ≥ 30 % Abstand, `rollen/planer/zeitkriterien.md`); das Setzen oder Entfernen eines Musters wirkt spätestens 1 s nach der Betätigung. Der Abgleich läuft im Browser über die bereits geladene Liste — kein zusätzlicher `git`-Aufruf, keine zusätzliche Serveranfrage, kein Nachladen von Diffs.
- **Sicherheit** (`AI-Team/gelerntes.md`): das Muster ist fremde Eingabe (Befehlszeile und Eingabefeld). Es erreicht `git` nie und wird nie als Code oder HTML gedeutet: Treffer und Zähler erscheinen nur über `textContent`, das Muster nie im Ergebnis oder im Protokoll. Der Abgleich ist ein eigener, begrenzter Glob (lineare Auswertung ohne Rückverfolgung), damit ein präpariertes Muster (viele `*`, verschachtelte Klassen) den Browser nicht einfriert; Grenzen: 200 Zeichen je Muster, 20 Muster, Grenze an Zeit und geprüften Zeichen je Abgleich (Vorschlag: dieselbe Grenze wie die Liste, 2 000 Pfade je Muster).
- **Logging**: stdout bleibt bis „Beenden“ leer; je Änderung eine Debug-Zeile auf stderr (Zahl der Muster, Zahl der Ausgeblendeten); Muster und Pfade nur mit Marken bzw. als Länge.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und dem Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`); das Musterfeld ist per Tab erreichbar und mit Namen für Screenreader; der Zähler ist Text.

## Akzeptanzkriterien

Vorbereitung: **Wegwerf-Repo Q** (eigener Wegwerf-Ordner, nie das Projekt-Repo; herstellbar mit `git` allein): Commit `i1` „Anlegen“ fügt sieben Dateien hinzu — `README.md` (2 Zeilen), `src/a.txt` (3), `src/b.txt` (2), `docs/README.md` (1), `app.lock` (1), `build/out.log` (1), `src/generated/api.cs` (1); eine Datei `ab⟨U+202E⟩.lock` (Name mit U+202E) kommt für Kriterium 10 dazu. Aufruf `gitreviewA <i1> --kein-browser`, Seite über die Startzeile. Das sind bei `gitreviewA <i1>` sieben Stellen. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Ausblenden liegt **nicht** auf dem Hot Path (`AI-Team/factory.md`); Playwright nur für Browser-Eigenes (Feld, Fokus, Neuladen, Zeit).

### Aufrufoption `--ignore`
- [ ] Gegeben Repo Q, wenn `gitreviewA <i1> --ignore '*.lock' --ignore 'build/**' --kein-browser` startet, dann fehlen `app.lock` und `build/out.log` in der Dateiliste, die übrigen fünf stehen da, und die Oberfläche nennt „2 ausgeblendet, davon 2 Muster“. *Ebene: Prozessprobe (Aufruf, Startzeile) und Oberfläche gegen Fake (Liste, Zähler).*
- [ ] Gegeben Repo Q, wenn `gitreviewA <i1> --ignore '*.log' --kein-browser` startet (Muster ohne `/`), dann fehlt `build/out.log` in ihrem Unterordner, während `README.md` und `docs/README.md` sichtbar bleiben; mit `--ignore 'src/**'` fehlen `src/a.txt`, `src/b.txt` und `src/generated/api.cs`, und `docs/README.md` bleibt. *Ebene: Unit (Abgleich, B2403) und Oberfläche gegen Fake.*
- [ ] Gegeben ein leeres `--ignore` (ohne Wert), ein Muster mit 201 Zeichen, ein Muster mit einem Zeilenumbruch, ein Muster mit U+202E und ein 21. `--ignore`, wenn jeder dieser Aufrufe startet, dann endet er mit Exit-Code 2, auf stderr steht genau eine Meldung, die das Muster ablehnt, auf stdout steht nichts, keine Zeile mit `127.0.0.1` erscheint (kein Server), und kein `git`-Prozess wird gestartet; die Aufrufe `--ignore '*'`, `--ignore ' a '` und zwanzig gültige Muster starten dagegen den Server. *Ebene: Prozessprobe (Programm als Prozess, ohne Browser).*

### Kein Muster an git, kein Programmstart
- [ ] Gegeben ein Repository, dessen Konfiguration `log.showSignature`, `gpg.program`, `diff.external` und `diff.<treiber>.textconv` auf ein Marker-Skript zeigt, wenn mit `--ignore '*.lock'` gestartet, die Liste geladen und beendet wird, dann ist keine Markerdatei entstanden, und die Zahl der `git`-Aufrufe samt Argumenten ist dieselbe wie im Vergleichslauf ohne `--ignore` (kein Muster als Argument, kein Pathspec). *Ebene: Integration (Marker-Skript, Aufrufzählung) und Prozessprobe.*

### Ausblenden ist eine Sicht, nicht die Auswahl
- [ ] Gegeben Repo Q und `--ignore '*.lock'` (sechs sichtbare Dateien, sieben Stellen), wenn die Seite geladen ist, dann steht der Fortschritt weiter „0 von 7 abgehakt“ (m bleibt 7), und nach dem Abhaken von `README.md` steht „1 von 7 abgehakt“. *Ebene: Oberfläche gegen Fake und Unit (Zählertext).*
- [ ] Gegeben dasselbe, `README.md` abgehakt und keine Anmerkung, wenn beendet wird, dann nennt der Abschnitt `## Dateien` „Abgehakt: 1 von 7“ und „Ungeprüft: 6 von 7“ und führt in der Liste der Ungeprüften auch `app.lock (Commit <voller Hash von i1>)`, obwohl sie ausgeblendet war. *Ebene: Integration (Programm als Prozess: Haken über die Schnittstelle, Beenden, stdout Byte für Byte).*

### Musterfeld in der Oberfläche
- [ ] Gegeben `gitreviewA <i1>` ohne `--ignore`, wenn im Musterfeld `*.lock` gesetzt wird, dann verschwindet `app.lock` aus der Dateiliste — in „Zusammen“ und „Einzeln“, flach und als Baum —, der Zähler nennt „1 ausgeblendet, davon 1 Muster“; ein zweites Muster `build/**` blendet zusätzlich `build/out.log` aus („2 ausgeblendet, davon 2 Muster“); ein Muster, das nichts trifft (`*.zzz`), lässt die Liste unverändert, und es steht kein Zähler; das Entfernen beider Muster zeigt alle sieben Dateien wieder. *Ebene: Oberfläche gegen Fake und E2E (Feld, Fokus — Browser-Eigenes).*
- [ ] Gegeben `--ignore '*.lock'`, wenn in der Oberfläche das Muster `*.lock` entfernt wird, dann ist `app.lock` wieder sichtbar; nach dem Neuladen der Seite steht `*.lock` wieder als Muster und `app.lock` ist wieder ausgeblendet (nichts wird gespeichert, der Aufruf ist der Anfangsstand). *Ebene: Oberfläche gegen Fake und E2E (Neuladen — Browser-Eigenes).*

### Grenzen und fremder Text
- [ ] Gegeben ein Commit mit 2 000 Dateien, davon 1 000 `.lock`, und `--ignore '*.lock'`, wenn die Seite geladen ist, dann steht die gefilterte Dateiliste in „Zusammen“ spätestens 1 s nach dem Laden der Seite (Messwert ≤ 0,7 s), der Zähler nennt „1000 ausgeblendet, davon 1000 Muster“, und es wurde kein zusätzlicher `git`-Aufruf gemacht. *Ebene: E2E (Zeit im Browser, ereignisgenau) und Integration (Aufrufzählung).*
- [ ] Gegeben Repo Q mit der Datei `ab⟨U+202E⟩.lock` und `--ignore '*.lock'`, wenn die Datei ausgeblendet und der Lauf mit `README.md` abgehakt beendet wird, dann steht ihr Name im Ergebnis und in der Debug-Zeile als `ab⟨U+202E⟩.lock` in einer einzigen Zeile, ohne Steuer- und Richtungszeichen; das Muster selbst (`*.lock`) erscheint weder im Ergebnis noch im Wortlaut im Protokoll (nur als Länge). *Ebene: Unit (Marken) und Integration (Programm als Prozess: stdout und stderr getrennt aufgefangen).*

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md): Oberfläche unter `src/GitReviewA/web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`.

- `Aufruf/` — `Aufrufleser`/`Aufruf` um die Musterliste erweitert; ein Musterprüfer (rein) und eine Meldung im `AufruffehlerMeldungen`-Stil (R00016).
- `Server/` — `GET /api/zustand` trägt die Muster (dünner Adapter, keine Logik).
- `web/` — neuer reiner Baustein `ausblenden-werte.js` (Muster prüfen, Pfad abgleichen) und `ausblenden.js` (Musterfeld, Zähler, Sicht); `dateiliste-werte.js` liefert die Sicht je Liste.
- `tests/` und `e2e/` — Wegwerf-Repo Q, DSL `ausblenden`, Treiber; Unit-Tests des Bausteins unter Node.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden und wo der Abgleich läuft, entscheidet der Entwickler beim Bauen (Optionen unter „Notizen“). Der Entwurf Fassung 2 zeigt **kein** Suchfeld („Weiter ohne Suchen“); das Musterfeld ist eine kleine Ergänzung an der Dateiliste, seine Gestaltung folgt kanbanD und Material 3.

### Ablauf

1. **Aufruf lesen** — `--ignore <muster>` mehrfach sammeln; jedes Muster gegen die Regel prüfen (Länge, Zeichen, Anzahl); ungültig → `Aufruffehler` (Meldung, Exit 2, kein Server), wie R00016. Der Aufruf-Interactor (B1505) trägt die Muster im `Startauftrag`.
2. **Weg zur Oberfläche** — die Muster gehen mit dem Startzustand an den Browser (`GET /api/zustand` um `muster` erweitert); Debug-Zeile mit der Zahl der Muster.
3. **Sicht bilden** — je geladener Dateiliste (flach oder Baum, „Zusammen“ oder „Einzeln“) wird jeder Pfad gegen die aktuellen Muster geprüft; sichtbar oder ausgeblendet; Zähler „n ausgeblendet, davon b Muster“.
4. **Muster ändern** — im Feld ein Muster hinzufügen (gegen dieselbe Regel prüfen, ungültig → Meldung im Feld, kein Abgleich) oder eines entfernen; die Sicht und der Zähler werden neu gerechnet; Haken, Stellen, Fortschritt und Ergebnis bleiben unangetastet.
5. **Beenden** — unverändert (R00002/R00011): das Ergebnis rechnet über die ganze Auswahl, die ausgeblendeten Dateien bleiben darin.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `Aufrufleser.Lesen` (Muster sammeln), `AufrufInteractor` (Muster in den `Startauftrag`), `GET /api/zustand` (Muster mitliefern), `dateiliste-werte.js` und ein neues `ausblenden.js` (Sicht und Feld).

- `Muster` (DTO, immutable) — ein geprüfter Mustertext.
- `Musterliste` (benannte Collection) — die Muster in Aufrufreihenfolge; `bool Trifft(string pfad)` nur dann, wenn der Abgleich hier liegt (Option 2).
- `Musterpruefer` (Operation, rein) — `MusterpruefungsErgebnis Pruefe(string text, int anzahlBisher)` → `Gueltig` oder `Abgelehnt(Grund: leer, zuLang, steuerzeichen, zuViele)`.
- `Aufruf` (DTO, erweitert) — trägt `IReadOnlyList<string> Muster`.
- JS `ausblenden-werte.js` (Operation, rein, läuft unter Node und im Browser) — `bool Passt(string muster, string pfad)`, `int AnzahlAusgeblendet(string[] pfade, string[] muster)`, `string Zaehlertext(int n)`.

### Änderungen an bestehenden Klassen

`Aufrufleser` (neue Option `--ignore`, Musterprüfer aufrufen), `Aufruf`/`Startauftrag` (Musterliste), `AufruffehlerMeldungen` (ein neuer Grund „ungültiges Muster“), `ZustandAntwort` (Feld `muster`), `dateiliste.js`/`dateiliste-werte.js` (Sicht filterbar), `index.html`/`gitreviewa.css` (Musterfeld und Zähler). `ErgebnisFormatierer`, `Hakenspeicher`, `UebersichtsLeser` und `DiffLesenInteractor` bleiben **unberührt** — Ausblenden ändert die Auswahl nicht.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction, Akzeptanz gegen den Interactor, Playwright nur Hot Path und Browser-Eigenes — **Ausblenden liegt nicht auf dem Hot Path.**

**Unit (rein):**
- `Musterpruefer` — gültige und ungültige Muster (leer, nur Leerraum, 200/201 Zeichen, LF, U+202E, 20/21 Muster), Meldung nennt den Grund.
- `ausblenden-werte.js` — Abgleich: Treffer und Nichttreffer, `*` innerhalb eines Segments (`a/*.txt` trifft `a/b.txt`, nicht `a/b/c.txt`), `**` über Segmente, `?`, `[a-z]`, Muster ohne `/` auf jeder Ebene, Muster mit `/` ab der Wurzel, Punkt am Anfang, Umlaut und Leerzeichen im Pfad, Groß gegen klein, viele `*` (Zeit bleibt linear); Zählertext für 0, 1 und 1000 Ausgeblendete sowie die vier Fälle „nur Muster“, „nur Haken“, „beide“ und „0“.

**Integration (Aufruf-Interactor und Oberfläche):**
- `AufrufInteractor` mit echten Repos: gültige Muster in Aufrufreihenfolge im `Startauftrag`; je ungültigem Muster `Aufruffehler(ungueltiges Muster)` mit Exit-Code 2 und ohne Server; zwanzig Muster gültig, ein 21. abgelehnt.
- Oberfläche gegen Fake: Sicht je Liste (flach/Baum, beide Modi), Zähler, Hinzufügen/Entfernen, Neuladen auf den Anfangsstand, Muster ohne Treffer.
- Prozess (Programmtreiber, ohne Browser): Exit 2 bei ungültigem Muster, stderr-Meldung, stdout leer, keine Startzeile; Positivkontrolle startet den Server.
- Marker-Probe und Aufrufzählung: kein Muster an `git`, dieselben `git`-Aufrufe wie ohne `--ignore`.
- Programm als Prozess: `README.md` haken, beenden, stdout Byte für Byte mit der ausgeblendeten Datei im Abschnitt `## Ungeprüft`; fremder Name (U+202E) mit Marken.

**E2E (Playwright, nur Browser-Eigenes):** Musterfeld (Tab, Name, Fokus), Neuladen, Zähler und Sicht, Zeitkriterium mit 2 000 Dateien (ereignisgenau). Kein Hot-Path-Fall.

## Abhängigkeiten

- Abhängig von: R00001 (Aufruf, Optionen, Gerüst, grün), R00016 (ungültiger Aufruf, Meldung/Exit 2, grün), R00003 (Dateiliste, grün), R00011 (Stellen, Fortschritt, Ergebnisabschnitt, grün), R00015 (Netto-Liste, grün), R00012/I0027 (die neue Dateiliste, rot — `Braucht I0027`, weil das Musterfeld in ihr lebt).
- Blockiert: nichts. Die Textsuche (I0031) ist unabhängig und nur bis Interaction geplant.

Nicht Teil dieser Anforderung (eigene Karten): die Textsuche im Diff (I0031, abgeschnitten aus I0013), Muster als git-Pathspec (verworfen, siehe Notizen), Ausblenden von Ordnern im Baum (nur Dateien), gespeicherte Muster über den Lauf hinaus (Vision: nichts wird gespeichert), Negationsmuster (`!`), ein Ausblenden nach Status (`D`, `A`) oder Größe.

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort):

1. **Zählen ausgeblendete Dateien im Fortschritt und im Ergebnis mit?** Empfehlung: **ja** — Ausblenden ist eine Sicht, nicht eine Auswahl: m in „n von m abgehakt“ und der Abschnitt `## Dateien` bleiben über die ganze Auswahl, sonst fiele eine nie gezeigte Datei still aus dem Rückkanal an die KI. Alternative: ausgeblendete Dateien fallen aus m und aus dem Ergebnis — dann ändert diese Anforderung den Vertrag von R00011/R00002 und die KI erfährt nicht, was sie nicht gesehen hat.
2. **Sind Muster aus dem Aufruf in der Oberfläche entfernbar?** Empfehlung: **ja** — ein Feld mit allen Mustern, jedes entfernbar; nichts wird gespeichert, Neuladen setzt auf den Anfangsstand aus dem Aufruf. Alternative: die Muster aus dem Aufruf sind fest, nur die in der Oberfläche hinzugefügten sind entfernbar.
3. **Groß/Klein?** Empfehlung: **unterscheiden** (wie das Dateisystem unter Linux); eine unabhängige Schreibweise (`core.ignorecase`-artig) wäre eine spätere Option. Alternative: immer ohne Rücksicht auf Groß/Klein.

Ohne Rückfrage entschieden (Begründung unter „Notizen“): Mustersprache ist ein eigener, begrenzter Glob (kein git-Pathspec, kein Regex); Muster gehen nie an `git` und erscheinen nie im Wortlaut im Protokoll; Längengrenze 200 Zeichen je Muster und höchstens 20 Muster; der Abgleich läuft im Browser über die bereits geladene Liste (kein neuer Serverweg, kein `git`-Aufruf); Treffer und Zähler per `textContent`.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00001/R00003 hinaus.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 6 Bubbles unterhalb I0013 (B2401–B2406), davon 3 klar (2 h) und 3 unklar (2–4 h) — Untergrenze 12 h, obere Schätzung 18 h. Enthalten: nur I0013; I0031 (Textsuche) ist nur bis Interaction geplant und nicht gezählt. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: Eine KI hat 50 Commits geschrieben, und in den über tausend geänderten Dateien stehen Schloss-Dateien, erzeugte Bündel und Protokolle, die niemand Zeile für Zeile prüft. Wenn `--ignore '*.lock'` die aufrufende KI das Rauschen schon beim Aufruf benennen lässt und ein Musterfeld den Menschen dasselbe tun lässt, dann sieht er nur noch die Dateien, um die es geht, und scrollt nicht mehr an zweihundert uninteressanten vorbei. Weil Ausblenden eine **Sicht** ist und nicht die Auswahl ändert, bleibt jede ausgeblendete Datei abhakbar und im Ergebnis „ungeprüft“ genannt — die KI erfährt weiter, was der Mensch nicht gesehen hat, statt ein stillschweigend gekürztes „Keine Anmerkungen.“ zu lesen. Gerade dieser Schnitt ist der Hebel: er wirkt an der einen Stelle, an der die Aufmerksamkeit verloren geht (die Dateiliste), ohne das Modell von Stellen, Haken und Anmerkungen und ohne den Vertrag mit der KI (R00002/R00011) zu berühren — dasselbe Muster aus dem Aufruf und aus der Oberfläche, ein reiner Abgleich, kein `git`-Aufruf, damit die Änderung klein und reversibel bleibt.

## Missing-Docs

- Verhalten von `GET /api/zustand` und des Startauftrags bei bis zu 20 Mustern (Länge je Muster 200 Zeichen): genügt die Antwortgröße und die Kodierung, oder gehört ein eigener kleiner Endpunkt dazu — beim Bauen entscheiden (kein Kriterium hängt daran).
- Musterfeld in kanbanD: Vorbild für ein „Chips“-Feld mit entfernbaren Einträgen (Schloss-Muster) — vor dem Bauen gegen kanbanD und Material 3 (Input chips) prüfen; der Entwurf Fassung 2 zeigt kein solches Feld.

## Notizen

### Optionen (Ort des Abgleichs)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. Sicht im Browser, ein reiner Baustein (`ausblenden-werte.js`), Muster aus Aufruf und Oberfläche (gewählt)** | Baustein als Unit unter Node; Oberfläche gegen Fake wie R00012; Aufruf als Prozessprobe; eine Implementierung der Grammatik (JS) | grobe Musterprüfung doppelt (C# am Aufruf, JS im Feld) — beide prüfen nur Länge/Zeichen, nicht die Grammatik | klein |
| 2. Server-Interactor `AusblendenInteractor`, Muster im Listenabruf, Abgleich in C# | Akzeptanz als NUnit gegen den Interactor; eine Grammatik (C#) | eine Serveranfrage je Musteränderung; die Muster reisen als Anfrageparameter; berührt die Listenendpunkte von I0027 stärker; die Liste läge doppelt (Server und Browser) | mittel |
| 3. Muster als git-Pathspec (`:(exclude)`), gefiltert beim Lesen | am nächsten an git | Muster als Argument an ein fremdes `git` (Pathspec-Magie, `--end-of-options`), Lastprofil „Diffs je Datei bei Bedarf“ verletzt bei jedem Wechsel; die Auswahl (m, Ergebnis) würde still kleiner | groß |

Gewählt: **1.** Ausblenden ist eine Darstellung der bereits geladenen Liste (R00003/R00012 liefern sie bei Bedarf), es entsteht kein neuer `git`-Aufruf und kein neuer Datenweg, und die Grammatik wird nur einmal implementiert (der reine JS-Baustein, wie `diff-werte.js`, `haken-werte.js`, `modus.js`). Der „Interactor“ der Interaction ist der **Aufruf-Interactor** aus R00016, den `--ignore` erweitert; seine Kriterien laufen als Prozess-/Integrationstest, die Sicht-Kriterien als Oberfläche-gegen-Fake (dieselbe Linie wie R00012, „Die Logik dieser Karte liegt in der Oberfläche“). **Option 2** ist der Rückfall, wenn der Betreiber den Abgleich auf der Serverseite will (dann `Braucht` unverändert, aber die Listenendpunkte von I0027 tragen die Muster). **Option 3** verworfen: ein Muster aus fremder Hand geht nicht an `git`, und die Auswahl darf nicht still kleiner werden.

### Verworfene Alternativen

- **Muster als regulärer Ausdruck**: fremde Eingabe als Regex ist ein ReDoS-Risiko (verschachtelte Quantoren) und für Dateinamen ungewohnt; der begrenzte Glob ist linear auswertbar und für die Nutzer vertraut (`.gitignore`).
- **Negationsmuster (`!muster`)**: eine zweite Regel im Abgleich (Reihenfolge, „zuletzt gewinnt“); der Nutzen („alles außer X zeigen“) ist mit mehreren Mustern erreichbar. Später als eigene kleine Karte möglich.
- **Ausblenden von Ordnern im Baum**: die Sicht betrifft Einträge (Dateien); ein ausgeblendeter Ordner ohne Datei ist ein zweiter Zustand. Eigene Karte, falls gewünscht.
- **Ausblenden in der Vision als neues Zielbild**: das Zielbild nennt „Ausblendmuster und Suche“ schon; die Anforderung zahlt darauf ein, ohne die Vision fortzuschreiben.
- **Ausgeblendete Dateien aus m und dem Ergebnis nehmen**: verworfen als Voreinstellung, weil es einen stillen Verlust im Rückkanal bedeutet (offene Frage 1, Empfehlung „mitzählen“).

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-25 | Zähler steht **im Kopf neben dem Fortschritt** (funktionale Anforderung, Zeile 30) mit dem Text „n ausgeblendet, davon b Muster“; ein Anteil von 0 wird weggelassen, bei 0 Ausgeblendeten steht kein Zähler. Zählertexte in den Kriterien angeglichen (Zeilen 45, 57, 61 — u. a. „2 ausgeblendet, davon 2 Muster“, „1 ausgeblendet, davon 1 Muster“, „1000 ausgeblendet, davon 1000 Muster“); im Kriterium Zeile 57 „zeigt „0 ausgeblendet““ durch „steht kein Zähler“ ersetzt (hebt den Widerspruch zu Zeile 30 derselben Anforderung auf); Ablauf Zeile 81 ebenso; Unit-Liste Zeile 105 um die Zählertext-Fälle „nur Muster“, „nur Haken“, „beide“, „0“ erweitert | Entscheidung des product-owner 2026-11-25, Frage 3 (`AI-Team/po-entscheidungen.md`, Zeilen 153–156, Commit `121bb1f`; Bericht `.factory/laeufe/26-product-owner-1.md`, „Folgen für den planer“ — R00025): Der Fortschritt steht schon im Kopf, seit R00012 Z. 21 Ort und Wortlaut der Zeile aus R00011 abgelöst hat; ein zweiter Zähler neben der Liste wäre derselbe Sachverhalt an zwei Orten. Beide Gründe (Muster und Haken) wirken in dieselbe Liste, also eine Zahl mit beiden Anteilen. Den Anteil „abgehakt“ bringt I0026 (R00029) hinzu; Zeile 152 (Meldung „Alles Sichtbare abgehakt, n ausgeblendet“, I0025) bleibt unverändert |
