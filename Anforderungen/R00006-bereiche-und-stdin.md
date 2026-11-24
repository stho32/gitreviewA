---
id: R00006
status: Neu
datum: 2026-11-24
---

# R00006: Bereiche und stdin

## Beschreibung

Der prüfende Mensch (oder die KI, die für ihn aufruft) nennt die zu prüfenden Commits nicht einzeln, sondern als Bereich (`b..e`, `main..feature`, `HEAD~5..`) oder als Liste von Hashes über stdin (`git rev-list b..e | gitreviewA -`). Beide Wege ergeben dieselbe Commit-Liste wie `git rev-list` für denselben Bereich — dieselben Commits in derselben Reihenfolge, neuester zuerst. Die Auswahl hat eine feste Obergrenze, damit ein versehentlich riesiger Bereich nie unbemerkt abgeschnitten wird: wer im Review fehlende Commits nicht sieht, prüft das Falsche.

Zahlt ein auf: [Vision](R00000-vision.md) — „Aufruf mit Auswahl“ (Hashes, Bereiche oder eine Liste über stdin) und das Lastprofil (flüssig bis 200 Commits).

Aufruf-Formen nach dieser Karte (genau eine je Lauf):
- **Einzelcommits** wie bisher: `gitreviewA <hash…>` — nur die genannten Commits, in der Reihenfolge des Aufrufs (R00001, unverändert).
- **Bereiche**: `gitreviewA <bereich…>` — jedes Argument ist ein Bereich der Form `<von>..<bis>`; mehrere Bereiche ergeben die Vereinigung wie bei `git rev-list <bereich> <bereich>`.
- **stdin**: `gitreviewA -` — die Hashes stehen zeilenweise auf stdin; die Reihenfolge der Zeilen bleibt erhalten.

Die Optionen (`--port`, `--kein-browser`, `--verbose`, `--quiet`) gelten in allen Formen und stehen an beliebiger Stelle.

## Geschäftlicher Nutzen

Die KI hat „die letzten fünf Commits“ oder „alles auf dem Zweig seit `main`“ geschrieben und will sie nicht einzeln aufzählen; ein Bereich oder die Ausgabe von `git log --format=%H` ist die natürliche Form. Ohne diese Karte muss der Aufrufer jeden Hash selbst ausschreiben, und lange Hash-Listen sprengen die Befehlszeile; mit ihr genügt ein Argument oder eine Pipe.

## Funktionale Anforderungen

- Ein **Bereich** hat die Form `<von>..<bis>`; `<von>` oder `<bis>` darf fehlen (fehlend heißt `HEAD`, wie bei git: `HEAD~5..` ist `HEAD~5..HEAD`), nicht beide.
- Ein **Endpunkt** ist ein Commit-Hash (4 bis 64 Hexziffern), `HEAD` oder ein Zweig- bzw. Tag-Name aus den Zeichen `A–Z a–z 0–9 . _ / -` (nicht mit `-` beginnend, ohne `..`), danach beliebig viele Folgen `~<n>` oder `^<n>` (`~`, `^` ohne Zahl heißt 1; `<n>` höchstens 6 Ziffern).
- Alles andere ist kein Bereich und wird abgewiesen, bevor `git` gestartet wird — insbesondere `<a>...<b>` (symmetrische Differenz, nicht in dieser Karte), Optionen (`--output=x..HEAD`), `@{…}`, `^{…}`, `:/text`, `<rev>:<pfad>`, Leer- und Steuerzeichen, Semikolon.
- Ein Bereichsaufruf nennt nur Bereiche; ein Einzelhash neben einem Bereich wird abgewiesen (ein nackter Hash hieße bei `git rev-list` „sein ganzer Vorlauf“ und würde die Auswahl unbemerkt aufblähen).
- **stdin**: `-` ist das einzige Auswahl-Argument; gelesen wird bis zum Ende der Eingabe. Jede Zeile ist ein Commit-Hash (4 bis 64 Hexziffern, Groß- oder Kleinschreibung); `\r` am Zeilenende und Leerzeilen werden übergangen; jede andere Zeile (auch ein Bereich oder `HEAD`) lässt den Aufruf scheitern, die Meldung nennt die Zeilennummer, nicht den Zeileninhalt.
- Ohne `-` liest das Programm stdin nie.
- Ist stdin ein Terminal, endet der Aufruf sofort mit einer Meldung, statt auf Eingabe zu warten.
- Kommt stdin nicht innerhalb von **10 Sekunden** zum Ende (Start der Wartezeit: Beginn des Lesens), endet der Aufruf mit einer Meldung.
- Doppelte Commits erscheinen einmal (wie bei `git log`).
- **Obergrenze 1 000 Commits** je Auswahl (Bereiche und stdin): mehr wird abgewiesen mit Meldung, die die Grenze nennt; nichts wird abgeschnitten. Ab dem 201. Commit steht beim Start eine Warnung auf stderr (Stufe Warnung, mit `--quiet` unterdrückt), dass die Oberfläche träge werden kann.
- Leere Ergebnisse (leerer Bereich, leere Eingabe) und unbekannte Hashes oder Namen sind Fehlerfälle der Karte I0003; bis dahin gilt, was R00001 und R00002 schon tun.

## Nicht-funktionale Anforderungen

- Performance: Bereich oder stdin mit 200 Commits — Oberfläche mit der vollständigen Liste ≤ 2 s nach dem Aufruf (Lastprofil der Vision, Messung wie R00001); die Commit-Daten kommen weiter mit einem einzigen `git`-Aufruf. Zwischen 201 und 1 000 Commits keine Zeitzusage (Hypothese der Grenze: 5 × Lastprofil, ungemessen).
- Sicherheit: das geprüfte Repo und alle Argumente sind fremde Eingabe. Nur Bereiche und Hashes der oben beschriebenen Form erreichen `git`, immer als Argumentliste hinter `--end-of-options`; die Konfiguration des fremden Repos darf bei der neuen Art des Lesens (Verlauf durchlaufen statt einzelne Commits) kein Programm starten (`log.showSignature` und `gpg.program`, siehe AI-Team/gelerntes.md).
- Logging: stdout bleibt leer (gehört dem Ergebnis); Meldungen und Warnungen auf stderr; Zeileninhalte von stdin stehen nie im Log.
- Benutzerfreundlichkeit: Meldungen nennen, was erwartet wird (Form des Bereichs, „ein Hash je Zeile“, Grenze).

## Akzeptanzkriterien

### Bereiche
- [ ] Gegeben ein Verlauf `a → b → c → d → e` (e neuester), wenn man den Bereich `b..e` prüft, dann zeigt die Auswahl genau `e`, `d`, `c` in dieser Reihenfolge, und `b` fehlt.
- [ ] Gegeben ein Verlauf mit Zweig und Merge (`main` mit `a`, `b`; Zweig `feature` ab `a` mit `f1`, `f2`; Merge `m` von `feature` in `main`), wenn man `a..m` prüft, dann zeigt die Auswahl dieselben Commits in derselben Reihenfolge wie `git rev-list a..m` (Merge, `f2`, `f1`, `b` in der Reihenfolge von git).
- [ ] Gegeben `main` auf `b` und `feature` mit zwei weiteren Commits `f1`, `f2` (`f2` neuester), wenn man `main..feature` prüft — und bei ausgechecktem `main` ebenso `..feature` —, dann zeigt die Auswahl jeweils `f2`, `f1`.
- [ ] Gegeben ein Verlauf mit fünf Commits `a … e`, wenn man `HEAD~2..` prüft, dann zeigt die Auswahl `e`, `d`.
- [ ] Gegeben die zwei Bereiche `a..b` und `d..e` im Verlauf `a … e`, wenn man beide nennt, dann zeigt die Auswahl `e`, `b` (Vereinigung, neuester zuerst).
- [ ] Gegeben die Aufrufe `<a>...<b>`, `--output=pwn..HEAD`, `HEAD..--output=pwn`, `HEAD@{1}..HEAD`, `main^{/x}..HEAD`, `HEAD:f..HEAD`, `a..b..c`, `..`, `-x..HEAD`, `"HEAD; touch pwn..HEAD"` und `<a>..<b> <c>` (Bereich mit Einzelhash), wenn sie gestartet werden, dann endet jeder mit Exit-Code ≠ 0 und einer Meldung auf stderr, startet keinen Server, startet kein `git`, und die Datei `pwn` entsteht nicht.
- [ ] Gegeben ein Repo, dessen Konfiguration `log.showSignature=true` und ein `gpg.program` setzt, das beim Start eine Markerdatei schreibt, wenn man einen Bereich prüft, dann läuft die Auswahl durch, und die Markerdatei existiert nicht.

### stdin
- [ ] Gegeben ein Verlauf `a … e`, wenn man die Ausgabe von `git rev-list b..e` über stdin an `gitreviewA -` gibt, dann zeigt die Auswahl dieselben Commits in derselben Reihenfolge wie der Aufruf mit dem Bereich `b..e` (`e`, `d`, `c`).
- [ ] Gegeben die stdin-Eingabe `c`, Leerzeile, `a` mit Windows-Zeilenenden, wenn sie gelesen wird, dann zeigt die Auswahl `c`, `a` (Reihenfolge der Eingabe, nicht des Verlaufs), und derselbe Hash zweimal erscheint einmal.
- [ ] Gegeben die stdin-Eingabe `a`, `zzzz`, `c`, wenn sie gelesen wird, dann endet der Aufruf mit Exit-Code ≠ 0, die Meldung nennt „Zeile 2“ und nicht den Text `zzzz`, es startet kein Server und kein `git`; dasselbe gilt für die Zeilen `--output=pwn`, `HEAD` und `a..b` an Zeile 1.
- [ ] Gegeben `-` zusammen mit einem Hash, einem Bereich oder einem zweiten `-`, wenn der Aufruf startet, dann endet er mit Exit-Code ≠ 0 und einer Meldung, ohne stdin zu lesen.
- [ ] Gegeben stdin ist ein Terminal, wenn `gitreviewA -` startet, dann endet der Aufruf nach höchstens 2 s mit Exit-Code ≠ 0 und einer Meldung, die „ein Hash je Zeile“ oder eine Pipe verlangt, ohne Server.
- [ ] Gegeben stdin bleibt offen und liefert nichts, wenn `gitreviewA -` startet, dann endet der Aufruf spätestens 15 s nach dem Start (Frist 10 s) mit Exit-Code ≠ 0 und einer Meldung, die die Frist nennt, ohne Server.
- [ ] Gegeben stdin bleibt offen und liefert nichts, wenn man einen Aufruf mit Hashes oder Bereich (ohne `-`) startet, dann steht die Startzeile spätestens 2 s später auf stderr (stdin wird nicht gelesen).

### Menge und Lastprofil
- [ ] Gegeben ein Repo mit 200 Commits, wenn man sie als Bereich und, in einem zweiten Lauf, über stdin prüft, dann zeigt die Oberfläche in beiden Läufen 200 Zeilen spätestens 2 s nach dem Start des Prozesses (Messung bis die 200. Zeile sichtbar ist; stderr ohne Warnung).
- [ ] Gegeben ein Repo mit 1 000 Commits, wenn man sie als Bereich und über stdin prüft, dann zeigt die Auswahl 1 000 Zeilen, und stderr enthält beim Start eine Warnung (nicht mit `--quiet`).
- [ ] Gegeben ein Repo mit 1 001 Commits, wenn man sie als Bereich und über stdin prüft, dann endet jeder Aufruf mit Exit-Code ≠ 0 und einer Meldung, die „1 000“ nennt, ohne Server.

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Aufruf/` — Aufrufleser erweitert; neue Typen für Bereichsausdruck, Auswahl und stdin-Lesen; `Startauftrag` trägt statt `CommitHashes` eine Auswahl.
- `src/GitReviewA/Git/` — `GitLeser` liest zusätzlich Bereiche (zweite Form des `git log`-Aufrufs, über `GitStart`).
- `src/GitReviewA/Program.cs` — Hauptablauf: Auswahl → stdin lesen (nur bei `-`) → Commits lesen.
- `tests/GitReviewA.Tests/Aufruf/`, `Git/`; `e2e/` — vorhandene Schichten erweitern (`tests/` Spezifikation, `dsl/` Fachsprache, `treiber/` Prozess mit stdin).

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Aufrufart bestimmen** — Argumente ohne Optionen: genau `-` → stdin; alle enthalten `..` → Bereiche; sonst alle Hashes (bisher). Mischung → Ablehnung mit Meldung.
2. **Bereich prüfen** — Zeichen-Whitelist und Aufbau der Endpunkte nach „Funktionale Anforderungen“; rein, ohne git.
3. **stdin lesen** (nur `-`) — Terminal erkennen (`Console.IsInputRedirected`) bevor gelesen wird; Lesen mit Frist 10 s und Zeilen-/Längenbegrenzung (Zeile länger als 100 Zeichen oder mehr als 1 001 Zeilen → Ablehnung ohne weiter zu lesen); jede Zeile gegen die Hash-Regel.
4. **Commits lesen** — Hashes wie bisher (`--no-walk=unsorted`); Bereiche: `git log --format=… --max-count=1001 --end-of-options <bereich…> --` über `GitStart`; mehr als 1 000 Ergebniszeilen → Ablehnung.
5. **Warnung ab 201**, dann weiter wie bisher (Server, Startzeile, Browser).

### Grobentwurf
**Einstiegsstellen:** `Aufrufleser.Lesen` (Argumente), `Program.LaufeBisZumEnde` (Auswahl → Commits), `GitLeser`.
- `Bereichsausdruck` (DTO, immutable) — geprüfter Text eines Bereichs; Fabrik `Bereichspruefer` (Operation, rein): `Pruefergebnis Pruefe(string argument)`
- `Auswahl` (DTO mit Varianten Einzelcommits, Bereiche, StdinLesen) — löst `CommitHashes` im `Startauftrag` ab
- `StdinHashes` (Ressourcenzugriff, wirft Aufrufsfehler) — `CommitHashes Lesen(TextReader eingabe, bool istTerminal, TimeSpan frist)`; Eingabe als Parameter, damit testbar
- `Auswahlgrenze` (Operation, rein) — Anzahl → `Zulaessig | MitWarnung | Abgelehnt`
- `GitLeser` — `Commitzeilen Lesen(Auswahl auswahl, string arbeitsordner)`

### Änderungen an bestehenden Klassen
- `Aufrufleser`: `-` und Bereiche erkennen, Mischungen ablehnen; `Startauftrag`: `Auswahl` statt `CommitHashes`.
- `GitLeser`: zweite Aufrufform (Bereich); `Program`: stdin erst nach gültigem Aufruf lesen, Warnung ab 201.
- `CommitAuswahl` (Anmerkungen) und spätere Endpunkte bleiben unverändert: sie arbeiten auf den gelesenen `Commitzeilen`, nicht auf den Aufrufargumenten — der Hash außerhalb der Auswahl bleibt abgewiesen, auch wenn er im Bereich nur „fast“ läge.

### Messung des Zeitkriteriums
Wie R00001: Startpunkt Prozessstart, Ereignis 200. Zeile sichtbar, E2E wartet auf das Ereignis (nicht im Standardraster). Der Entwickler misst für Bereich und stdin und hält ≥ 30 % Abstand zu 2 s; bei stdin zählt die Zeit des Lesens mit. Die 10-s-Frist ist eine Obergrenze, kein Messwert: der Test prüft „endet vor 15 s“.

## Tests
**Unit (rein):** `Bereichspruefer` (gültige Formen, alle abgelehnten Aufrufe der Kriterien, Randfälle `~`, `^`, 6 und 7 Ziffern, Name mit führendem `-`, `..` im Namen), `Auswahlgrenze` (200, 201, 1 000, 1 001), Aufrufart im `Aufrufleser`, stdin-Zeilenregel mit `StringReader` (CRLF, Leerzeile, Zeile 2 ungültig, Zeile über 100 Zeichen, doppelter Hash).
**Integration:** `GitLeser` mit Bereichen gegen Wegwerf-Repos (Linie, Zweig mit Merge, 1 001 Commits per `git fast-import`), Vergleich mit `git rev-list` im selben Repo; Marker-Skript im Wegwerf-Repo (Pflicht bei jeder neuen git-Aufrufform); stdin als offene Pipe ohne Daten (Frist).
**E2E (Akzeptanz, `e2e/`):** Spezifikation „soll …“ in Fachsprache, DSL (`pruefe bereich`, `pruefe stdin`), Treiber startet den Prozess mit stdin; Terminal-Fall über ein Pseudo-Terminal (`script -qec`), sonst über eine Naht im Integrationstest — der Entwickler entscheidet nach Verfügbarkeit und nennt es im Bericht.

## Abhängigkeiten
- Abhängig von: R00001 (Aufrufleser, `GitStart`, `GitLeser`, Oberfläche).
- Blockiert: nichts; R00002 und R00004 laufen unabhängig weiter. I0003 (Ungültiger Aufruf) baut auf den hier genannten Fehlerfällen auf und vereinheitlicht Meldungen und Exit-Codes.

Nicht Teil dieser Anforderung: `<a>...<b>`, Namen mit Sonderzeichen, `--first-parent` und `--no-merges`, nackte Namen als Einzelcommit (`gitreviewA main`), Bereiche auf stdin, leere und unbekannte Auswahl (I0003).

## Umfang

Hypothese, ungemessen (Richtwert, keine Ist-Zeiten vorhanden): 7 Bubbles unterhalb I0002 bis Bubble geplant, davon 4 Standard (2) und 3 unklar (2-4) — Untergrenze 14 h, obere Schätzung 22 h.

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort):
1. Zweig- und Tag-Namen als Endpunkte? Empfehlung: ja, mit der strengen Zeichenklasse (sonst ist `main..feature` nicht aufrufbar); Alternative: nur Hashes und `HEAD`.
2. Obergrenze 1 000 Commits, Warnung ab 201, ablehnen statt abschneiden? Empfehlung: ja; Alternative: höhere Grenze oder keine.
3. stdin-Frist 10 s? Empfehlung: ja; ein Erzeuger wie `git rev-list` liefert 1 000 Zeilen in Millisekunden.
4. `<a>...<b>` später als eigene Karte? Empfehlung: erst auf Wunsch.

## Manuelle Vorbereitungstätigkeiten
- Keine. (Für das Terminal-Szenario braucht der Testrechner `script` aus util-linux; fehlt es, gilt die Naht im Integrationstest.)

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Warum löst diese Anforderung das Problem?

Der Auslöser: die KI hat eine Reihe von Commits geschrieben und müsste sie dem Programm einzeln nennen; bei 40 Hashes ist das lästig, bei sehr vielen sprengt es die Befehlszeile. Wenn `gitreviewA b..e` oder `git rev-list b..e | gitreviewA -` dieselbe Liste ergibt wie git selbst, dann nennt der Aufrufer die Auswahl in der Form, in der er sie ohnehin hat, und der Mensch sieht genau diese Commits. Weil die Auswahl die Grundlage jedes Urteils ist, wird ein zu großer Bereich abgewiesen statt gekürzt, und weil Bereiche und Zeilen fremde Eingabe an `git` sind, kommt nur eine enge, geprüfte Form durch — der Hebel liegt am Eingang, nicht in der Anzeige.

## Missing-Docs
- Verhalten von `git log` bei `--max-count` zusammen mit mehreren Bereichen und Merges (Reihenfolge gleich `git rev-list`) — vor dem Bauen gegen die git-Dokumentation und mit einer Probe im Wegwerf-Repo prüfen.
- stdin-Erkennung eines Terminals unter .NET 10 auf Windows (`Console.IsInputRedirected`) — gegen die Dokumentation prüfen.

## Notizen

### Optionen (Revisionsausdrücke im Aufruf)

| Option | Sicherheit | Nutzen | Testbarkeit |
|---|---|---|---|
| 1. Nur Hashes, `HEAD` und `~n`/`^n` | kleinste Angriffsfläche | `main..feature` nicht aufrufbar | einfach |
| 2. Zusätzlich Zweig-/Tag-Namen aus enger Zeichenklasse (Empfehlung) | Optionen und Spezialsyntax (`@{`, `^{`, `:/`, `:`) können nicht entstehen; `--end-of-options` als zweite Schranke | deckt `main..feature`, `HEAD~5..` | Whitelist rein testbar |
| 3. Beliebiger Revisionsausdruck an git (nur `--end-of-options`) | `:/text`, `@{upstream}`, Reflog hängen an der Konfiguration des fremden Repos; Ergebnismenge schwer vorhersehbar | größter | nicht abschließend prüfbar |

Gewählt: 2.

### Optionen (zu große Auswahl)

| Option | Folge |
|---|---|
| Abweisen über 1 000 (Empfehlung) | der Aufrufer erfährt es sofort; das Urteil bezieht sich nie auf eine unbemerkt gekürzte Auswahl |
| Auf 1 000 kürzen | still falsche Auswahl in einem Review-Werkzeug |
| Keine Grenze | ein Bereich wie `<leerer Baum>..HEAD` lädt den ganzen Verlauf in den Speicher |

Gewählt: Abweisen.

### Verworfene Alternativen
- Nackte Einzelhashes neben Bereichen zulassen: bei `git rev-list` hieße ein Hash „sein ganzer Vorlauf“; das widerspricht dem Einzelcommit-Verständnis von R00001.
- Bereiche und Hashes auf stdin mischen: eine zweite Eingabegrammatik an derselben Stelle; die Pipe von `git rev-list` liefert ohnehin Hashes.
- `git log --stdin`: reicht Zeilen als Revisionen an git; hier stünde die Prüfung nicht mehr vor dem Start von git.
- Warten auf stdin ohne Frist: ein Aufrufer, der die Pipe offen lässt, hängt für immer; ein Fehler nach Frist ist ehrlich.
- Aufspaltung in zwei Karten (Bereiche, stdin): beide Wege teilen Grenze und Meldungsstil, 7 Bubbles tragen; bei Platzmangel ist stdin die dünnere Hälfte (Schnittmuster „Schnittstellen“).
