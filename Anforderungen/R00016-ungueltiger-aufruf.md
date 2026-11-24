---
id: R00016
status: Neu
datum: 2026-11-24
---

# R00016: Ungültiger Aufruf

## Beschreibung

Die prüfende Person (oder die KI, die für sie aufruft) startet `gitreviewA` mit einer Auswahl, die sich nicht in einen Lauf übersetzen lässt: in einem Ordner ohne Git-Repository, mit einem Commit-Hash, den es im Repository nicht gibt, oder mit einer leeren Auswahl (ein Bereich ohne Commits wie `b..b`, oder eine leere Hash-Liste über stdin). gitreviewA startet dann **keinen Server**: es meldet den Grund in eigenen Worten auf stderr und endet mit Exit-Code 2. Der Server startet erst, wenn die Auswahl gelesen ist — wer im Review fehlende Commits nicht sieht, prüft sonst das Falsche.

Zahlt ein auf: [Vision](R00000-vision.md) — „Aufruf mit Auswahl“ (nur ein gültiger Aufruf öffnet die Oberfläche) und die Leitplanke „stdout gehört allein dem Ergebnis“ (Meldungen nur auf stderr).

Das Fertig-Kriterium des Slice (I0003, WBS) lautet: „kein Repo, unbekannter Hash oder leere Auswahl: Fehlermeldung auf stderr, Exit-Code ≠ 0, kein Server“ und wird hier in prüfbare Kriterien zerlegt.

## Geschäftlicher Nutzen

Ohne diese Anforderung sind drei Lagen unklar. Erstens **leerer Bereich**: heute startet `gitreviewA b..b` einen Server mit leerer Liste; die KI wartet auf ein Urteil über nichts, und ein leeres Ergebnis sieht aus wie „nichts zu beanstanden“. Zweitens **unklarer Grund**: „kein Repo“ und „unbekannter Hash“ enden heute zwar ohne Server, aber mit der rohen git-Meldung („git log endete mit 128: fatal: …“) und Exit-Code 1 — die aufrufende KI kann einen Tippfehler im Aufruf nicht von einem gescheiterten Lauf unterscheiden. Drittens **fremder Hash**: ein Hash aus einem anderen Repository sieht wie ein bekannter aus und endet ohne klare Aussage. R00016 macht aus allen drei Lagen denselben, prüfbaren Ausgang: eigene Meldung, Exit-Code 2, kein Server.

## Funktionale Anforderungen

- Ein **ungültiger Aufruf** liegt vor, wenn einer dieser Fälle eintritt:
  - der Arbeitsordner liegt in keinem Git-Repository (auch nicht in einem darüber),
  - der Arbeitsordner ist ein **nacktes Repository** (kein Arbeitsbaum),
  - `git` ist nicht auffindbar (kein Programm `git` im Suchpfad),
  - **keiner** der genannten Commits lässt sich im Repository auflösen (unbekannter Hash, Hash aus einem anderen Repository, beschädigtes Objekt),
  - die **Auswahl ist leer**: ein Bereich ohne Commits (`b..b`, `HEAD..HEAD`) oder eine leere Hash-Liste über stdin.
- Jeder ungültige Aufruf endet **vor** dem Serverstart: auf stderr steht **eine** Meldung in eigener Sprache, die den Grund und den Ausweg nennt; der Prozess endet mit **Exit-Code 2**; auf stdout steht nichts; es startet **kein** Server (keine Startzeile mit `http://127.0.0.1` auf stderr).
- Die rohe Ausgabe von `git` steht nur auf **Stufe Debug** (`--verbose`); bei Standardstufe und mit `--quiet` erscheint sie nicht.
- Der Server startet nur, wenn der Aufruf gültig **und** die Auswahl gelesen ist. Ein gültiger Aufruf — auch aus einem **Unterordner** eines Repositories — verhält sich unverändert (R00001, R00006).
- Alle ungültigen Aufrufe tragen **denselben** Exit-Code (2). Der Fehler tritt auf, bevor der Server läuft; Fehler **nach** dem Serverstart (Server, Ein-/Ausgabe) bleiben Exit-Code 1.

## Nicht-funktionale Anforderungen

- **Ausgabe**: stdout enthält bei einem ungültigen Aufruf keine Zeichen (0 Bytes). Die Meldung steht auf stderr, im Format der übrigen Meldungen (`<Zeit> <STUFE> [Aufruf] <Text>`), Stufe Fehler.
- **Kein Leck**: bei Standardstufe steht in der Meldung kein roher `git`-Text und kein Stacktrace; der git-Text steht nur mit `--verbose`.
- **Sprache**: Meldungen sind Deutsch und nennen den Ausweg („im Repository starten“, „einen Hash dieses Repositories angeben“, „einen Bereich mit mindestens einem Commit wählen“).
- **Zeit**: der Prozess endet höchstens 2 s nach dem Start (kein Warten), auch wenn kein `git` vorhanden ist.

## Akzeptanzkriterien

### Leere Auswahl (die Lücke)
- [ ] Gegeben ein Repository mit drei Commits `a`, `b`, `c`, wenn `gitreviewA <b>..<b> --kein-browser` startet, dann steht auf stderr eine Meldung, die „leer“ nennt, der Prozess endet mit Exit-Code 2, stdout ist leer, und auf stderr steht keine Zeile mit `http://127.0.0.1` (kein Server). Dasselbe gilt für `HEAD..HEAD` und für `gitreviewA - --kein-browser` mit leerer Eingabe.
- [ ] Gegeben ein Repository und `git rev-list <b>..<b> | gitreviewA -`, wenn die Pipe leer bleibt, dann endet der Aufruf mit Exit-Code 2 und einer Meldung, die „Hash je Zeile“ oder „leer“ nennt, ohne Server.

### Kein Repository, nacktes Repository, kein git
- [ ] Gegeben ein leerer Ordner außerhalb jedes Repositories, wenn `gitreviewA <hash> --kein-browser` startet, dann endet er mit Exit-Code 2, stdout ist leer, eine Meldung nennt „Repository“, und es startet kein Server.
- [ ] Gegeben ein nacktes Repository (`git clone --bare`), wenn `gitreviewA <hash> --kein-browser` darin startet, dann endet er mit Exit-Code 2 und einer Meldung, die den fehlenden Arbeitsbaum nennt, ohne Server.
- [ ] Gegeben ein Rechner ohne `git` im Suchpfad, wenn `gitreviewA <hash> --kein-browser` startet, dann endet er mit Exit-Code 2 und einer Meldung, die `git` nennt, ohne Server.

### Nicht auflösbare Auswahl
- [ ] Gegeben ein Repository mit einem Commit `a`, wenn `gitreviewA deadbeefdeadbeef --kein-browser` startet (kein solcher Commit), dann endet er mit Exit-Code 2, eine Meldung sagt, dass sich die Auswahl nicht auflösen ließ, und es startet kein Server.
- [ ] Gegeben zwei Repositories `A` und `B` und ein Hash aus `B`, wenn `gitreviewA <hash-aus-B> --kein-browser` in `A` startet, dann endet er mit Exit-Code 2 und derselben Aussage wie ein unbekannter Hash, ohne Server.
- [ ] Gegeben ein Repository, dessen Objektdatei zum Commit `a` entfernt wurde, wenn `gitreviewA <a> --kein-browser` startet, dann endet er mit Exit-Code 2, ohne Server.

### Einheitlichkeit und Meldung
- [ ] Gegeben die Läufe aus den Gruppen oben, wenn die Exit-Codes verglichen werden, dann sind alle gleich 2; und je Lauf beginnt die erste stderr-Zeile mit `FEHLER [`, gefolgt von einer Meldung ohne den Text `fatal:` (roher git-Text fehlt bei Standardstufe).
- [ ] Gegeben ein ungültiger Aufruf mit `--verbose`, wenn stderr gelesen wird, dann enthält sie zusätzlich eine Debug-Zeile mit dem rohen git-Text; mit `--quiet` steht die Fehlermeldung weiter auf stderr, die Debug-Zeile nicht.

### Positivkontrolle (kein falsches Nein)
- [ ] Gegeben ein Repository mit einem Commit `a` und derselbe Aufruf aus einem Unterordner des Repositories, wenn `gitreviewA <a> --kein-browser` startet (einmal im Wurzelordner, einmal im Unterordner), dann erscheint in beiden Läufen die Startzeile `http://127.0.0.1:<port>/`, `GET /api/zustand` antwortet mit 200, und keine der Meldungen aus den Gruppen oben steht auf stderr.
- [ ] Gegeben ein Repository, dessen Konfiguration `log.showSignature=true` und ein `gpg.program` setzt, das beim Start eine Markerdatei schreibt, wenn `gitreviewA <b>..<b> --kein-browser` darin startet (leerer Bereich, die Repoprüfung läuft), dann endet er mit Exit-Code 2 und die Markerdatei fehlt (die Repo-/Umgebungsprüfung startet kein Programm aus fremder Konfiguration).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Aufruf/` — Themenordner der Interaction: `Aufrufgrund`, `Aufruffehler`, `AufruffehlerMeldungen` (neu), `Auswahlgrenze` und `CommitsDerAuswahl` erweitert.
- `src/GitReviewA/Git/` — `GitLeser` um die Repoprüfung vor dem Commits-Lesen (`rev-parse --show-toplevel`), die den Grund statt einer rohen `GitFehler` liefert.
- `src/GitReviewA/Program.cs` — dünner Adapter; der Ablauf zieht in einen Interactor (`AufrufInteractor`), der Serverstart bleibt Adapter.
- `tests/GitReviewA.Tests/Aufruf/` und `Git/` — Unit- und Integrationstests; `e2e/treiber/programm.js` — Prozessproben (kein Browser).

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Aufruf lesen** (wie bisher, R00001/R00006) — Argumente → `Aufruf` oder Aufruffehler (Exit 2).
2. **Umgebung prüfen** — `git rev-parse --show-toplevel` im Arbeitsordner über `GitStart`; scheitert es, Grund feststellen (kein Repo / nacktes Repo / `git` fehlt) → `Aufruffehler`.
3. **Auswahl lesen** — Hashes/Bereiche wie bisher (`git log` über `GitStart`, stdin nur bei `-`); scheitert `git log`, ist das „Auswahl nicht auflösbar“ → `Aufruffehler`.
4. **Leere Auswahl abweisen** — `Auswahlgrenze.Pruefe(anzahl) == Leer` → `Aufruffehler` „leere Auswahl“.
5. **Meldung und Exit** — `Aufruffehler` → Meldung auf stderr (Stufe Fehler), Exit-Code 2, **kein** Serverstart.
6. Bei Erfolg: unverändert weiter (Warnung ab 201, Server, Startzeile, Browser, warten).

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `Program.Main` (dünner Adapter auf `AufrufInteractor`); `GitLeser.WurzelLesen` (Repoprüfung) und `CommitsDerAuswahl` (Auswahl lesen) werden zuerst aufgerufen, **bevor** `Webserver.StartenAsync` läuft.

- `Aufrufgrund` (Enum) — kein Repo, nacktes Repo, git nicht gefunden, leere Auswahl, Auswahl nicht auflösbar.
- `Aufruffehler` (DTO, immutable) — Grund, Meldung, Exitcode.
- `AufruffehlerMeldungen` (Operation, rein) — eine Stelle für alle Texte und Exit-Codes:
  - `string Meldung(Aufrufgrund grund)`
  - `int ExitCode(Aufrufgrund grund)` (durchgehend 2)
- `Reposituation` (Ressourcenzugriff, wirft Aufruffehler) — `string WurzelOderGrund(string arbeitsordner)`; nutzt `GitStart`.
- `Auswahlurteil` erweitert um `Leer`; `Auswahlgrenze` (Operation, rein):
  - `Auswahlurteil Pruefe(int anzahl)`
  - `string Meldung(Auswahlurteil urteil)` (nennt für `Leer` den Ausweg)
- `AufrufInteractor` (Integration) — die Interaction als Interactor:
  - `Aufruffolge Starte(Aufrufanfrage anfrage)` → `Erfolg(Startauftrag)` oder `Aufruffehler`
  - steuert `Reposituation`, `CommitsDerAuswahl`, `Auswahlgrenze`, `AufruffehlerMeldungen`; startet **nichts** selbst.

### Änderungen an bestehenden Klassen
- `CommitsDerAuswahl`: nach dem Lesen `Auswahlgrenze.Pruefe` inklusive `Leer`; `GitFehler` beim Auflösen der Auswahl wird zu `Aufruffehler(AuswahlNichtAufloesbar)` (der rohe git-Text wandert in die Debug-Zeile).
- `GitLeser.WurzelLesen`: Unterscheidung „kein Repo / nacktes Repo / git fehlt“ statt roher `GitFehler`; weiter ein `rev-parse`-Aufruf über `GitStart`.
- `Program.Main`: ruft `AufrufInteractor` vor dem Server; `Aufruffehler` → Meldung + Exit 2; die bisherigen `catch`-Zweige für `AuswahlFehler`/`GitFehler` aus dem Aufrufpfad entfallen damit.

## Tests

Nach `~/.claude/skills/test-pyramide/SKILL.md` — Test zuerst je Bubble. Akzeptanz läuft als **Prozess-/Integrationstest gegen den Interactor**; **kein Browser** (es startet kein Server, kein Hot Path).

**Unit (pure Logik):**
- `Auswahlgrenze` — 0 → `Leer`, 1/200 → zulässig, 201/1 000 → Warnung, 1 001/50 000 → abgelehnt; `Meldung(Leer)` nennt den Ausweg.
- `AufruffehlerMeldungen` — je Grund eine deutsche Meldung ohne `fatal:` und mit Ausweg; `ExitCode` durchgehend 2.
- `Auswahlurteil` — die neue Ausprägung `Leer` bricht keine bestehende Auswertung.

**Integration (`AufrufInteractor` gegen echtes `git` im Wegwerf-Repo):**
- leere Auswahl (Bereich `b..b`, leere stdin) → `Aufruffehler(LeereAuswahl)`, kein Server.
- kein Repo (leerer Temp-Ordner), nacktes Repo (`git clone --bare`), ohne `git` im PATH (PATH in einem Prozess-Scope) → `Aufruffehler` mit dem jeweiligen Grund.
- unbekannter Hash, Hash eines anderen Repos, entfernte Objektdatei → `Aufruffehler(AuswahlNichtAufloesbar)`.
- Positivkontrolle: gültiger Hash im Wurzelordner und aus einem Unterordner → `Erfolg(Startauftrag)`.
- Marker-Probe: Repo mit `log.showSignature=true`/`gpg.program`-Marker → die Repoprüfung startet das Programm nicht; Marker fehlt.

**Prozess (Programmtreiber, `e2e/treiber/programm.js`, ohne Browser):**
- je Fall Exit-Code 2, stderr-Meldung mit `FEHLER [`, keine Zeile mit `http://127.0.0.1`, stdout leer; `--verbose` bringt die Debug-Zeile; Positivkontrolle startet den Server (`--kein-browser`, Startzeile da).

## Abhängigkeiten
- Abhängig von: R00001 (Aufrufleser, `GitStart`, `GitLeser`, Eingabe an git), R00006 (Bereiche und stdin, Auswahlgrenze, stdin-Fehler — gebaut).
- Blockiert: nichts. Läuft parallel zu R00003–R00014; `Braucht` I0001 ist grün.

Nicht Teil dieser Anforderung: `--version`, Hilfe-Text, das Verhalten bei gültigem Aufruf (R00001/R00006), Fehler **nach** dem Serverstart (Diff, Dateien — Exit 1).

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort):

1. **Einheitlicher Exit-Code 2?** Empfehlung: ja — jeder ungültige Aufruf endet mit 2, sodass die aufrufende KI „Aufruf falsch“ von „Lauf gescheitert“ (1) und „abgebrochen“ (130) unterscheiden kann; heute enden Repo-/Hash-Fehler mit 1. Alternative: bestehende Codes belassen (nur ≠ 0).
2. **„Kein Repo“ als ungültiger Aufruf oder als Umgebungsfehler?** Empfehlung: als ungültiger Aufruf (2) — der Mensch hat den falschen Ordner gewählt; Alternative: als Lauf-Fehler (1), weil die Umgebung fehlt.
3. **Umfang jetzt.** Empfehlung: die Lücke (leerer Bereich) und die Vereinheitlichung zusammen bauen — beide klein, R00006 hat die Vereinheitlichung zugesagt; Alternative: jetzt nur die Lücke, die Vereinheitlichung als eigene Karte.

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

6 Bubbles unterhalb I0003 (B1501–B1506): 2 Standard (2 h) und 4 unklar (2–4 h) — Untergrenze 12 h, obere Schätzung 20 h. Richtwert, **ungemessen** (die Ist-Zeiten aus R00001/R00006 liegen deutlich darunter). Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: die aufrufende KI bekommt bei einem Tippfehler im Aufruf oder im falschen Ordner keine klare Antwort — heute entweder eine rohe git-Meldung mit Exit 1 oder, schlimmer, bei einem leeren Bereich einen Server mit leerer Liste und später ein leeres „Keine Anmerkungen.“, das die KI als „nichts zu beanstanden“ liest. Wenn jeder ungültige Aufruf vor dem Server mit einer eigenen Meldung und Exit-Code 2 endet, dann kann die KI „dieser Aufruf war falsch“ sicher von „das Urteil ist leer“ und „der Lauf ist gescheitert“ unterscheiden und den Aufruf korrigieren, statt auf ein Urteil über nichts zu warten. Hebel ist die Reihenfolge: Umgebung prüfen, Auswahl lesen, **erst dann** den Server starten — genau an dieser Stelle entsteht die Lücke, und genau dort wird sie geschlossen, ohne die Anzeige oder das Ergebnisformat zu berühren. Weil das Ergebnisformat (R00002) und der Abbruch (R00005) unverändert bleiben, ist die Änderung klein und reversibel.

## Missing-Docs
- Meldungstexte von `git` bei „kein Repo“, nacktem Repo und nicht auflösbarer Auswahl je Version — vor dem Bauen kurz gegen die git-Dokumentation und mit einer Probe prüfen; die Einordnung soll nicht an einem Textmuster hängen, sondern an der Prüfstelle (Repoprüfung vs. Lesen).

## Notizen

### Was heute schon gebaut ist (Prozessprobe, Stand `main`/`karte/3`, 2026-11-24)

Wegwerf-Repo, `--kein-browser`, je Fall ein echter Prozesslauf:

| Fall | Heute | Bewertung |
|---|---|---|
| Start außerhalb eines Repos | Exit 1, rohe git-Meldung, kein Server | Meldung und Exit-Code vereinheitlichen |
| Unbekannter Hash | Exit 1, rohe git-Meldung, kein Server | Meldung und Exit-Code vereinheitlichen |
| Hash eines anderen Repos | Exit 1, `bad object`, kein Server | Meldung und Exit-Code vereinheitlichen |
| Beschädigtes Repo | Exit 1, rohe git-Meldung, kein Server | Meldung und Exit-Code vereinheitlichen |
| Nacktes Repo | Exit 1, `rev-parse … must be run in a work tree` | Meldung und Exit-Code vereinheitlichen |
| Kein `git` im PATH | Exit 1, eigene Meldung („git ließ sich nicht starten …“) | nur Exit-Code anheben |
| Leere stdin | Exit 2, eigene Meldung | **fertig** |
| **Leerer Bereich** (`b..b`, `HEAD..HEAD`) | **Server startet** (leere Liste) | **die Lücke** |
| `.git`-Datei (verknüpfter Worktree) | Server startet, funktioniert | kein Fehlerfall |
| Fremde Konfiguration (Marker) | Server startet, Marker nicht erzeugt | kein Fehlerfall (R00001/R00004) |
| Start aus Unterordner | Server startet, funktioniert | kein Fehlerfall |

Der **einzige** Fall, der das Fertig-Kriterium verletzt, ist der leere Bereich: er startet heute einen Server. Alle übrigen Fälle enden schon mit Exit ≠ 0 und ohne Server; sie tragen aber rohe git-Texte und teils Exit-Code 1 — das vereinheitlicht R00016, wie R00006 es zusagt („I0003 … vereinheitlicht Meldungen und Exit-Codes“).

### Optionen (Erkennung und Ausgang)

| Option | Meldung | Testbarkeit | Risiko |
|---|---|---|---|
| 1. Eigene Prüfstelle je Grund (Repoprüfung, Auswahl-Lesen) + eigene Meldung, Exit 2 (Empfehlung) | eigene Sprache, genauer Grund | Integration gegen echte Repos | keines |
| 2. git-Rohtext durchreichen, Exit 1 | roh, wechselt mit git-Version | nur „Exit ≠ 0“ prüfbar | KI verwechselt Aufruf- und Lauffehler |
| 3. Leeren Bereich gesondert behandeln, Rest lassen | wie heute | kleinste Änderung | R00006-Versprechen (Vereinheitlichung) bleibt offen |

Gewählt: Option 1.

### Verworfene Alternativen
- **Meldung aus git-Rohtext erkennen** (Textmuster wie `bad object`): hängt an der git-Version und der Sprache des Repos; stattdessen wird der Grund an der Prüfstelle bestimmt.
- **Leere Auswahl erlauben** (Server mit leerer Liste): widerspricht dem Zweck eines Review-Werkzeugs — die KI liest sonst ein leeres Ergebnis als Urteil.
- **Datei-/Diff-Fehler in denselben Exit-Code ziehen**: Fehler nach dem Serverstart sind Lauf-Fehler (1), nicht Aufruf-Fehler (2).
