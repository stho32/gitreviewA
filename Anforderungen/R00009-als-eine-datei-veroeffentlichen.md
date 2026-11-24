---
id: R00009
status: Neu
datum: 2026-11-24
---

# R00009: Als eine Datei veröffentlichen

## Beschreibung

Der Betreiber (und jede Person, die gitreviewA weitergibt) veröffentlicht das Programm je Plattform als **genau eine ausführbare Datei**: kein Ordner, keine Begleitdateien (keine Symboldatei, keine JSON- oder Konfigurationsdatei), die Weboberfläche steckt in der Datei. Die Datei ist frameworkabhängig: sie startet auf jedem Rechner, auf dem die .NET-10-Runtime installiert ist, und braucht sonst nichts.

Zahlt ein auf: [Vision](R00000-vision.md) — Leitplanke „Auslieferung“ (Betreiber 2026-11-24: „als 1 executable publishen, alles zusammen, nicht als Ordner … kann aber frameworkabhängig sein“).

Baut auf [R00001](R00001-mit-commit-hashes-aufrufen.md) auf (Programm, Aufruf, eingebettete Oberfläche). Ein GitHub-Release ist nicht Teil dieser Anforderung.

**Messbefund (Ausgangsstand, Entwicklerrechner, SDK 10.0.100)**: Der Aufruf `dotnet publish src/GitReviewA -c Release -r linux-x64 --self-contained false -p:PublishSingleFile=true` ergibt eine Datei von **100 811 305 Byte** plus `gitreviewA.pdb` und `gitreviewA.staticwebassets.endpoints.json`. Ursache (gemessen an der Wirkung, Mechanismus gefolgert): `--self-contained false` wird von der SDK-Befehlszeile als Schalter „self-contained“ gelesen, die Runtime wird mit eingepackt; `--no-self-contained` und `-p:SelfContained=false` ergeben dagegen 276 209 Byte. Die beiden Begleitdateien entstehen unabhängig davon. Mit festen Einstellungen in der Projektdatei (nur beim Veröffentlichen) liefert schon `dotnet publish -c Release -r <Plattform>` ohne weitere Optionen eine einzige Datei: linux-x64 319 729 Byte, win-x64 407 149 Byte, osx-arm64 369 307 Byte (Probe auf einer Kopie des Standes, Dateiliste je Ordner gezählt: je 1).

## Geschäftlicher Nutzen

Ohne diese Anforderung bekommt, wer gitreviewA weitergibt oder aufruft, entweder einen Ordner mit losen Dateien oder 100 MB für ein Werkzeug, das aus einem Terminal heraus gestartet wird — die KI-Seite (Aufruf per Pfad) und der Mensch (Datei ablegen, `PATH`) wollen eine kleine Datei. Mit ihr genügt eine Datei im Ordner `~/bin`, und ein Skript baut sie für alle Plattformen.

## Funktionale Anforderungen

- `dotnet publish src/GitReviewA -c Release -r <Plattform> -o <Ordner>` erzeugt im Ordner genau eine Datei: `gitreviewA` (Windows: `gitreviewA.exe`). Keine weitere Option ist nötig.
- Die Datei ist frameworkabhängig (die Runtime wird nicht eingepackt), die Symbole sind in ihr eingebettet oder weggelassen (keine `.pdb`), die Oberfläche ist eingebettet; es gibt keine `*.json`, keine `web.config`, keine Ressourcenordner.
- Die Datei startet in einem Ordner, in dem sonst nichts liegt, und schreibt beim Lauf keine Dateien neben sich (kein Entpacken).
- Plattformen: **linux-x64** (geprobt), **win-x64** und **osx-arm64** (Build-Ziel: genau eine Datei, Start nicht geprobt — kein Rechner dafür im Gate).
- Ein Skript im Repository baut alle drei Plattformen in je einen eigenen Ordner und bricht mit Fehlermeldung und Exit-Code ≠ 0 ab, wenn ein Ordner nicht genau eine Datei enthält oder eine Plattform unbekannt ist.
- Die Einstellungen gelten nur beim Veröffentlichen; `dotnet build` und `dotnet test` bleiben unverändert.

## Nicht-funktionale Anforderungen

- Größe (Hinweis, kein Gate): die Datei ist wenige MB groß; gemessen unter 0,5 MB. Als Prüfgrenze gilt 5 MB — eine eingepackte Runtime (um 100 MB) fällt damit sicher auf.
- Ausgabe: das Skript schreibt Meldungen auf stderr, auf stdout nur die Pfade der erzeugten Dateien (eine Zeile je Plattform).
- Zeit: kein Kriterium. Gemessen: eine Plattform in rund 4 s bei warmem Paketcache.

## Akzeptanzkriterien

### Eine Datei je Plattform
- [ ] Gegeben der Quelltext auf dem Stand dieser Karte, wenn für linux-x64 veröffentlicht wird (`dotnet publish -c Release -r linux-x64 -o <leerer Ordner>`, ohne weitere Optionen), dann enthält der Ordner genau eine Datei `gitreviewA`, sie ist ausführbar und kleiner als 5 MB; es gibt weder `.pdb` noch `.json` noch `web.config`.
- [ ] Gegeben derselbe Stand, wenn für win-x64 und für osx-arm64 veröffentlicht wird, dann enthält jeder Ordner genau eine Datei (`gitreviewA.exe` bzw. `gitreviewA`), kleiner als 5 MB.

### Start allein im leeren Ordner
- [ ] Gegeben die veröffentlichte linux-x64-Datei, allein in einen leeren Ordner kopiert, und ein Wegwerf-Repository mit zwei Commits (Betreff „Erster“ und „Zweiter“), wenn die Datei mit den beiden Hashes und `--kein-browser` auf einem freien Port gestartet wird, dann zeigt die Oberfläche die beiden Commits mit ihren Betreffen, die Startzeile mit der Adresse steht auf stderr, stdout bleibt leer.
- [ ] Gegeben dieser laufende Review, wenn der Lauf abgebrochen wird (Strg+C), dann endet er mit Exit-Code 130, und im Ordner der Datei liegt weiterhin nur diese eine Datei.

### Ein Aufruf für alle Plattformen
- [ ] Gegeben das Skript, wenn es ohne Argument läuft, dann liegen unter dem Ausgabeordner drei Plattformordner mit je genau einer Datei, und auf stdout stehen genau drei Zeilen mit deren Pfaden.
- [ ] Gegeben die unbekannte Plattform `freebsd-x64`, wenn das Skript sie erhält, dann nennt stderr die Kennung, der Exit-Code ist ≠ 0, und auf stdout steht nichts.

## Betroffene Verzeichnisstruktur

`src/GitReviewA/GitReviewA.csproj` (Einstellungen nur beim Veröffentlichen), neu `skripte/veroeffentlichen.sh` (Ort Vorschlag), `.gitignore` (Ausgabeordner), E2E: `e2e/tests/veroeffentlichen.spec.js`, `e2e/dsl/`, `e2e/treiber/`.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf

1. Einstellungen in der Projektdatei, bedingt auf `_IsPublishing` (setzt `dotnet publish`; im Debug-Protokoll der SDK gesehen): `PublishSingleFile=true`, `SelfContained=false`, `DebugType=embedded`, `StaticWebAssetsEnabled=false`, `IsTransformWebConfigDisabled=true`. Gemessen auf einer Kopie: liefert die Dateizahl aus dem Messbefund und startet (Oberfläche 200, `/api/zustand` antwortet, Exit 130 bei SIGINT).
2. Skript: für jede Plattform `dotnet publish -c Release -r <rid> -o <Ausgabe>/<rid>`, danach Dateien im Ordner zählen; Fehlerpfad nennt Plattform und Dateien.
3. E2E: veröffentlicht in einen Ordner außerhalb des Arbeitsbaums (Build-Ziel nicht im Worktree), kopiert die Datei in einen leeren Ordner, startet sie wie bisher das Programm (`programm.js`), prüft über Treiber.

### Fallstricke

- `--self-contained false` in der Befehlszeile erzeugt 100 MB (siehe Messbefund). Die „Auslieferung“-Zeile in `AI-Team/factory.md` nennt diesen Aufruf; dort `--no-self-contained` oder die bloße Form verwenden (Hinweis an den Director, nicht Teil des Baus).
- Eine in der Befehlszeile gesetzte Eigenschaft (`-p:SelfContained=true`) schlägt die Projektdatei: das ist gewollt, kein Fehler.

## Tests

ATDD nach `AI-Team/factory.md`: Akzeptanztests zuerst, Fachsprache in `e2e/dsl/` (`veroeffentlichung`: „veröffentlichen für Plattform“, „Dateien im Ordner“, „allein im leeren Ordner starten“), Protokolltreiber in `e2e/treiber/` (einzige Schicht, die `dotnet publish` und den Prozess kennt). Kein Test im Spec nennt `publish` oder Dateinamen der SDK.

**E2E:** Kriterien 1–5 (linux-x64 mit Start; win-x64/osx-arm64 und Skript nur Dateizählung). **Unit:** keiner nötig (keine Logik außerhalb des Skripts).

## Abhängigkeiten

- Abhängig von: I0001 Gerüst (R00001; Programm, eingebettete Oberfläche).
- Blockiert: nichts.

Nicht Teil dieser Anforderung: GitHub-Release, Signieren und Notarisieren (macOS), Installer, eingepackte Runtime, Trimmen, `--version`, Start auf Windows und macOS.

## Offene Fragen

1. An den product-owner: **`--version`.** Empfehlung: nein, nicht jetzt — der Betreiber verlangt es nicht; heute lehnt das Programm unbekannte Optionen ab (Exit ≠ 0), eine Versionszeile wäre eigener Umfang mit eigener Quelle der Nummer.
2. An den product-owner: **Plattformliste.** Empfehlung: linux-x64, win-x64, osx-arm64; `linux-arm64` und `osx-x64` baut das Skript auf Wunsch über ein Argument (gemessen: linux-arm64 321 141 Byte, eine Datei), ohne Probe.
3. An den product-owner: **macOS.** Die Datei ist weder signiert noch notarisiert; Gatekeeper warnt beim ersten Start. Empfehlung: hinnehmen und im Release-Text (spätere Karte) nennen.
4. An den product-owner: **Start unter Windows und macOS ohne Probe.** Empfehlung: nur Dateizahl prüfen; ein Start dort wäre ein Gate auf fremden Rechnern.
5. An den Director: **Zeile „Auslieferung“ in `AI-Team/factory.md`** nennt `--self-contained false` (erzeugt 100 MB); Empfehlung: auf `dotnet publish -c Release -r <rid>` kürzen, sobald dieser Slice steht.

Keine blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 hinaus (.NET-10-SDK vorhanden; Pakete für win-x64 und osx-arm64 holt `dotnet publish` beim ersten Lauf aus dem Paketfeed — Netz nötig, danach im Cache).

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 3 Bubbles unterhalb I0004 (B0801–B0803), 2 Standard (2 h), 1 unklar (2–4 h) — Untergrenze 6 h, obere Schätzung 8 h. Spike zur Ursache ist schon gelaufen (Messbefund).

## Warum löst diese Anforderung das Problem?

Der Auslöser: der Betreiber ruft `dotnet publish … --self-contained false -p:PublishSingleFile=true` auf und bekommt 100 MB plus zwei lose Dateien. Wenn die Einstellungen in der Projektdatei stehen und jeder Aufruf nur noch `-r <Plattform>` braucht, dann liefert er immer eine Datei von unter 0,5 MB, und die Falle der Befehlszeile ist weg. Wenn das Skript und ein Test die Dateizahl je Plattform zählen und die Datei im leeren Ordner starten, dann fällt ein Rückfall (neue Begleitdatei, eingepackte Runtime) im Gate auf, bevor jemand eine falsche Auslieferung weitergibt.

## Missing-Docs
- Verhalten der Veröffentlichung für win-x64 und osx-arm64 ohne Netz (Apphost-Pakete): beim ersten Lauf mit leerem Paketcache prüfen; bei Fehler nennt das Skript die Plattform.

## Notizen

**Optionen: wie die Einstellungen gesetzt werden**

| Option | Wirkung | Risiko |
|---|---|---|
| 1. Projektdatei, bedingt auf `_IsPublishing` (Empfehlung, gewählt) | jeder `dotnet publish -r <rid>` liefert eine Datei; `build` und `test` unberührt | `_IsPublishing` ist SDK-intern (stabil seit .NET 6, nicht dokumentierte Schnittstelle) — E2E-Test fängt eine Änderung |
| 2. Veröffentlichungsprofil (`PublishProfile`) | Einstellungen getrennt von der Projektdatei | jeder Aufruf muss das Profil nennen; ohne es wieder 100 MB-Falle möglich |
| 3. Nur Skript mit allen `-p:`-Optionen | Projektdatei bleibt unberührt | wer ohne Skript veröffentlicht, bekommt die falsche Datei |

**Verworfen**: Trimmen und Self-contained (Betreiber: frameworkabhängig genügt); Start ohne installierte Runtime als Test (DOTNET_ROOT-Umleitung greift nicht, der Apphost sucht den Standardort weiter — Probe nicht deterministisch herstellbar).

**Labels (Vorschlag)**: `auslieferung`, `betreiberwunsch`, `klein`.
