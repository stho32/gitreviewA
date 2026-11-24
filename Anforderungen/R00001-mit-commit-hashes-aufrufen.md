---
id: R00001
status: Neu
datum: 2026-11-24
---

# R00001: Mit Commit-Hashes aufrufen

## Beschreibung

Der prüfende Mensch (oder die KI, die für ihn aufruft) startet `gitreviewA <hash…>` in einem Git-Repository. Das Programm startet einen Server nur auf `127.0.0.1` an einem freien Port, öffnet die Weboberfläche im Browser und zeigt darin die übergebenen Commits als Liste (Kurz-Hash und Betreff, in der Reihenfolge des Aufrufs). Der Prozess bleibt laufen und wartet. Diese Anforderung ist zugleich das tragende Gerüst: Lösungsstruktur, Testprojekte und E2E-Gerüst, damit das Gate (`dotnet build -warnaserror && dotnet test && (cd e2e && npx playwright test)`) ab dieser Karte läuft.

Zahlt ein auf: [Vision](R00000-vision.md) — „Aufruf mit Auswahl“ (Hashes; Oberfläche öffnet sich, der Prozess wartet) und die Leitplanken .NET 10, nur localhost, stdout gehört dem Ergebnis, Lastprofil.

**Übernahme aus kanbanD** (Betreiber 2026-11-24; Herkunft im Commit nennen, keine eigene Gestaltung erfinden): `~/Projekte/kanbanD/web/kd-tokens.css`, `kd-base.css`, `kd-app.css`, `web/fonts/` (IBM Plex) für die Gestaltung; `web/commits.js` und `web/review-uebersicht.js` als Vorlage für die Listendarstellung, soweit sie hier passen. Start mit freiem Port und Browser-Öffnen: Vorbild `~/Projekte/kanbanD/src/` (Rust, nach C# übertragen).

## Geschäftlicher Nutzen

Ohne diesen Slice gibt es kein Programm, an das die späteren Slices (Beenden mit Ergebnis, Dateiliste, Diff, Anmerkungen) anknüpfen können. Er beweist den ganzen Weg Aufruf → Server → Oberfläche → Commits und legt Struktur und Gate fest, an denen jede weitere Karte gemessen wird.

## Funktionale Anforderungen

- `gitreviewA <hash…> [--port <n>] [--kein-browser] [--verbose] [--quiet]` im Arbeitsverzeichnis eines Git-Repositories; ohne `--port` wählt das Programm einen freien Port.
- Der Server lauscht nur auf `127.0.0.1`; die Adresse (`http://127.0.0.1:<port>/`) steht als Startzeile auf stderr.
- Ohne `--kein-browser` öffnet das Programm den Standardbrowser mit dieser Adresse; schlägt das Öffnen fehl, ist das eine Warnung auf stderr, der Lauf geht weiter.
- Die Oberfläche zeigt je übergebenem Commit eine Zeile mit Kurz-Hash (die ersten 7 Zeichen des vollen Hashes) und Betreff, in der Reihenfolge des Aufrufs.
- Die Oberfläche ist als eingebettete Ressource Teil des Programms; keine losen Dateien daneben.
- Der Prozess bleibt laufen, bis er beendet wird (das Beenden mit Ergebnis ist eine eigene Karte, I0019).
- Hashes werden vor der Übergabe an `git` geprüft; `git` wird mit Argumentliste gestartet, nie über eine Shell.

## Nicht-funktionale Anforderungen

- Performance: Oberfläche mit der vollständigen Liste ≤ 2 s nach dem Aufruf (typisch, Lastprofil der Vision); die Commit-Daten kommen mit einem einzigen `git`-Aufruf, nicht je Commit einer.
- Sicherheit: nur `127.0.0.1`; Anfragen mit fremdem `Host`-Header werden abgewiesen (DNS-Rebinding); Betreffzeilen werden als Text, nie als HTML dargestellt (XSS); Argumente, die kein Hash sind, erreichen `git` nie.
- Logging: stdout bleibt in dieser Karte leer (gehört dem Ergebnis, I0019); Logging nur stderr, Standardstufe Warning, `--verbose` Debug, `--quiet` nur Error/Exception; je Eintrag Zeit, Stufe, Kontext.
- Benutzerfreundlichkeit: Gestaltung aus kanbanD (siehe oben); keine eigenen Gestaltungsvorgaben.

## Akzeptanzkriterien

### Aufruf und Server
- [ ] Gegeben ein Repository mit 3 Commits, wenn `gitreviewA <h1> <h2> <h3> --kein-browser` startet, dann steht auf stderr spätestens 2 s später eine Zeile mit `http://127.0.0.1:<port>/`, die Adresse antwortet auf `GET /api/zustand` mit 200, stdout bleibt leer, und der Prozess läuft 5 s nach dem Start noch.
- [ ] Gegeben zwei gleichzeitig gestartete Läufe ohne `--port`, wenn beide ihre Startzeile ausgeben, dann tragen sie verschiedene Ports.
- [ ] Gegeben ein laufender Lauf, wenn man die offenen Sockets des Prozesses ansieht, dann lauscht er nur auf `127.0.0.1`, und eine Anfrage mit `Host: fremd.example` wird mit 4xx abgewiesen, eine mit `Host: 127.0.0.1:<port>` mit 200 beantwortet.

### Commit-Liste
- [ ] Gegeben ein Repository mit den Commits `a` „Erster Commit“, `b` „Zweiter Commit“, `c` „Dritter Commit“, wenn man `gitreviewA c a` aufruft (volle Hashes), dann zeigt die Oberfläche genau 2 Zeilen: zuerst `<c[0..7]>  Dritter Commit`, dann `<a[0..7]>  Erster Commit`.
- [ ] Gegeben ein Commit mit dem Betreff `<script>alert(1)</script>`, wenn die Oberfläche geladen ist, dann steht der Betreff als sichtbarer Text in der Zeile, und es wird kein Skript ausgeführt.
- [ ] Gegeben ein Repository mit 200 Commits und ihre 200 Hashes als Argumente, wenn der Lauf gestartet wird, dann zeigt die Oberfläche 200 Zeilen spätestens 2 s nach dem Start des Prozesses (gemessen bis die 200. Zeile sichtbar ist; Messwert und Abstand siehe Technische Überlegungen).

### Browser
- [ ] Gegeben ein Lauf ohne `--kein-browser` und ein Öffnungsbefehl, der durch die Umgebungsvariable `GITREVIEWA_BROWSER` ersetzt wurde, wenn der Lauf startet, dann ruft das Programm diesen Befehl genau einmal mit genau einem Argument auf, nämlich der Adresse aus der Startzeile.
- [ ] Gegeben `GITREVIEWA_BROWSER` zeigt auf einen nicht vorhandenen Befehl, wenn der Lauf startet, dann steht eine Warnung auf stderr, die Startzeile erscheint trotzdem, der Server antwortet, und der Prozess läuft weiter.

### Eingabe an git
- [ ] Gegeben die Aufrufe `gitreviewA --upload-pack=x`, `gitreviewA "HEAD; touch pwn"` und `gitreviewA zzzz`, wenn sie gestartet werden, dann endet jeder mit Exit-Code ≠ 0 und einer Meldung auf stderr, startet keinen Server, erzeugt keine Datei `pwn`, und kein `git`-Prozess wird gestartet. Gültig ist ein Hash aus 4 bis 64 Hexziffern (Groß- oder Kleinschreibung); mehr nicht.

### Logging
- [ ] Gegeben ein Lauf mit Standardstufe, wenn er startet und eine Seite abruft, dann enthält stderr genau die Startzeile (Zeit, Stufe, Kontext) und stdout ist leer; mit `--quiet` ist stderr leer; mit `--verbose` stehen zusätzlich Debug-Zeilen je Anfrage (`GET /api/commits`) auf stderr.

### Gerüst
- [ ] Gegeben der Stand dieser Karte, wenn das Gate `dotnet build -warnaserror && dotnet test && (cd e2e && npx playwright test)` läuft, dann endet es mit Exit-Code 0; `dotnet test` enthält Unit- und Integrationstests (Integration gegen Wegwerf-Repos im Temp-Ordner, Dienst auf freiem Port), und `e2e/` enthält mindestens einen Playwright-Test (headless), der Kriterium „Commit-Liste“ im echten Programm gegen ein Wegwerf-Repo fährt.
- [ ] Gegeben der Ausgabeordner von `dotnet build`, wenn man ihn nach Dateien der Oberfläche (`*.html`, `*.js`, `*.css`, `*.woff2`) durchsucht, dann findet man keine, und `GET /` liefert trotzdem die Oberfläche (200, enthält die Commit-Liste).

## Betroffene Verzeichnisstruktur

- `gitreviewA.sln`, `Directory.Build.props` (`TreatWarningsAsErrors`, Nullable) im Wurzelordner.
- `src/GitReviewA/` — Konsolenprogramm .NET 10 mit eingebettetem Server; Themenordner `Aufruf/`, `Git/`, `Server/`, `Protokoll/`, `Browser/`; Oberfläche unter `src/GitReviewA/web/` als `EmbeddedResource`.
- `tests/GitReviewA.Tests/` — NUnit Unit- und Integrationstests, spiegeln die Themenordner; Hilfsklasse für Wegwerf-Repos.
- `e2e/` — Playwright (`package.json`, `playwright.config.ts`, `tests/`).

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Aufruf lesen** — Argumente → `Aufruf` (Hashes, Port, KeinBrowser, Protokollstufe); jeder Hash gegen `^[0-9a-fA-F]{4,64}$`, sonst Abbruch mit stderr-Meldung und Exit-Code ≠ 0 (genaue Fehlerfälle sind I0003).
2. **Commits lesen** — ein `git`-Aufruf mit Argumentliste: `git log --no-walk=unsorted --format=%H%x1f%s --end-of-options <hashes>` im Arbeitsverzeichnis; Ausgabe → `Commitzeilen` (voller Hash, Kurz-Hash = erste 7 Zeichen, Betreff).
3. **Server starten** — Kestrel auf `127.0.0.1`, Port 0 oder `--port`; Endpunkte `GET /` (eingebettete Oberfläche), `GET /api/commits`, `GET /api/zustand`; Host-Prüfung als Middleware.
4. **Startzeile und Browser** — Adresse auf stderr; ohne `--kein-browser` Browser über `GITREVIEWA_BROWSER` bzw. den Standardöffner (`xdg-open`, `open`, `start`) mit der Adresse als einzigem Argument, Fehler → Warnung.
5. **Warten** — der Prozess endet nicht von selbst.

### Grobentwurf
**Einstiegsstellen:** `Program.Main` (Integration); Oberfläche `web/index.html` + `web/commits.js`.
- `Aufruf` (DTO, immutable) — Hashes, Port, KeinBrowser, Protokollstufe. `Aufruf Lesen(string[] args)` im `Aufrufleser` (Operation, rein)
- `Commitzeile` (DTO, immutable) — voller Hash, Kurz-Hash, Betreff; `Commitzeilen` (benannte Collection, Reihenfolge des Aufrufs)
- `GitLeser` (Ressourcenzugriff) — `Commitzeilen Lesen(IReadOnlyList<string> hashes, string arbeitsordner)`
- `Webserver` (Integration) — startet und hält den Host; `Adresse`
- `HostPruefung` (Middleware) — weist fremde `Host`-Header ab
- `StderrProtokoll` (Ressourcenzugriff) — Zeit, Stufe, Kontext; Stufen nach Aufruf
- `BrowserOeffner` (Ressourcenzugriff) — `void Oeffnen(string adresse)`

### Messung des Zeitkriteriums
Startpunkt: Prozessstart; Ereignis: 200. Zeile sichtbar (E2E wartet auf dieses Ereignis, nicht im Standardraster). Messwert ist noch nicht vorhanden — der Entwickler misst auf dem Stand und hält den Abstand von mindestens 30 % zur 2-s-Grenze ein (Zeitkriterien der Rolle); ist der Wert darüber, geht das als Befund zurück, nicht als lockereres Kriterium.

## Tests
**Unit (pure Logik):** `Aufrufleser` (gültige/ungültige Hashes, Optionen), Kurz-Hash-Bildung, Parser der `git`-Ausgabe, Protokollzeilenformat.
**Integration:** `GitLeser` gegen Wegwerf-Repos (Reihenfolge, Betreff mit Sonderzeichen), Server auf freiem Port (`/api/zustand`, `/api/commits`, Host-Prüfung), Prozessstart mit `--kein-browser`: stdout leer, Startzeile, Exit-Code bei ungültigem Argument.
**E2E:** Playwright headless gegen ein Wegwerf-Repo mit den Szenarien der User Story.

## Abhängigkeiten
- Abhängig von: keine (Walking Skeleton).
- Blockiert: I0002 Bereiche und stdin, I0003 Ungültiger Aufruf, I0004 Als eine Datei veröffentlichen, I0005 Commits und Dateien sehen, I0019 Beenden mit Ergebnis.

Nicht Teil dieser Anforderung (eigene Karten): Bereiche und stdin (I0002), alle weiteren Fehlerfälle wie kein Repo, unbekannter Hash, leere Auswahl (I0003), Single-File-Veröffentlichung (I0004), Dateiliste und Diff (I0005/I0006), Beenden und Ergebnis (I0019).

## Umfang
Hypothese, ungemessen (Richtwert, keine Ist-Zeiten vorhanden): 10 Bubbles unterhalb I0001 bis Bubble geplant, davon 6 Standard (2) und 4 unklar (2-4) — Untergrenze 20 h, obere Schätzung 28 h. Gerüstarbeit; Äste von I0002 bis I0020 sind nicht bis Bubble geplant und nicht enthalten.

## Offene Fragen
- Keine blockierenden; Entscheidungen des Planers im Bericht (Startzeile bei Standardstufe, `GITREVIEWA_BROWSER`, 7 Zeichen Kurz-Hash).

## Manuelle Vorbereitungstätigkeiten
- Für E2E einmalig `cd e2e && npm install && npx playwright install chromium`.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Warum löst diese Anforderung das Problem?

Der Auslöser: eine KI hat Commits geschrieben, und der Mensch will genau diese ansehen, ohne `git log -p` abzutippen. Wenn `gitreviewA <hash…>` einen lokalen Server startet, die Browseroberfläche öffnet und die übergebenen Commits listet, dann hat der Mensch die Auswahl vor Augen, und alle weiteren Slices (Dateien, Diff, Anmerkungen, Ergebnis auf stdout) haben einen Ort, an dem sie anknüpfen. Hebel ist gerade dieser dünne Durchstich samt Gate: Struktur, Tests und E2E stehen, bevor Funktion wächst, und die Leitplanken (nur localhost, stdout leer, Hash-Prüfung) gelten von der ersten Zeile an statt später nachgerüstet zu werden.

## Missing-Docs
- Öffnen des Standardbrowsers unter .NET 10 auf Linux/macOS/Windows (Verhalten von `Process.Start` mit `UseShellExecute`) — vor dem Bauen gegen die Dokumentation prüfen.

## Notizen

### Optionen (Zuschnitt des Browser-Öffnens und der Testbarkeit)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Öffnungsbefehl per Umgebungsvariable `GITREVIEWA_BROWSER` überschreibbar, Standard: Plattformöffner (Empfehlung) | Attrappe zählt Aufrufe, kein echter Browser | gering | klein |
| 2. Nur `--kein-browser`, Öffnen unprüfbar | Öffnen bleibt ungeprüft | Kriterium ohne Test | kleinstes |
| 3. Öffner als Option `--browser <befehl>` | wie 1 | zusätzliche Eingabe an einen Prozessstart aus der Befehlszeile (Sicherheit) | mittel |

Gewählt: 1.

### Verworfene Alternativen
- Option 2: das Browser-Öffnen wäre ein Kriterium ohne Test.
- Option 3: ein Befehl aus der Befehlszeile ist eine neue Eingabe an einen Prozessstart; die Umgebungsvariable gehört dem Aufrufer.
- Schnitt des Gerüsts von der Funktion (Gerüst-Karte, dann Funktions-Karte): nach Schichten geschnitten, nicht von außen prüfbar — Walking Skeleton bleibt ein Slice.
