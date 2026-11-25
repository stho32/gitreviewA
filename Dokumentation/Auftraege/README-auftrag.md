# Auftrag: umfassende README.md mit Screenshots

| | |
|---|---|
| Karte | #39 README.md mit Screenshots |
| Auftraggeber | Betreiber, 2026-11-25: „Und sag dem PO er soll eine umfassende README.md für das Repo in Auftrag geben und diese auch mit Screenshots anreichern.“ |
| Auftrag von | product-owner (Entscheidungen: `AI-Team/po-entscheidungen.md`, Zeilen vom 2026-11-25 zu #39) |
| Empfänger | Rolle `dokumentar` |
| Ergebnis | `README.md` im Wurzelordner und Bilder unter `Dokumentation/Bilder/readme/` |
| Quellen der Wahrheit | das **laufende Programm**, dann Vision (`Anforderungen/R00000-vision.md`), Anforderungen `R00001`–`R00035`, `skripte/veroeffentlichen.sh`, `.github/workflows/release.yml` |

Ausnahme zur Regel der Rolle: Der dokumentar schreibt sonst ein HTML-Handbuch. Hier ist das Ergebnis **eine Markdown-Datei**, weil GitHub sie als Startseite des Repositories zeigt. Alles andere aus `rollen/dokumentar/schreibregeln.md` gilt (Aufgaben statt Funktionen, Oberflächentexte wörtlich und fett, jede Aussage am Programm belegt, Alt-Texte, keine Versprechen über Künftiges).

## 1. Leser und ihr Ziel (in dieser Reihenfolge)

1. **Entwickler, der KI-Commits prüfen will.** Ziel: in zwei Minuten verstehen, was gitreviewA ist, die Datei aus dem GitHub-Release holen und die erste Review fahren.
2. **KI bzw. ihr Betreiber, der gitreviewA als Werkzeug einbindet.** Ziel: den Aufrufvertrag sicher nutzen können — Argumente, stdin, was auf stdout und stderr steht, Exit-Codes, Format des „Ergebnis manueller Review“, was bei Abbruch geschieht.
3. **Mitentwickler.** Ziel: bauen, testen, die Struktur finden, ein Release erzeugen.

Die Reihenfolge ist die Reihenfolge der Abschnitte: Leser 1 liest nur bis „Erste Review“, Leser 2 findet seinen Teil ohne den Rest, Leser 3 steht hinten.

## 2. Gliederung und Obergrenzen

Gesamtumfang: **höchstens 450 Zeilen** Markdown, **höchstens 7 Bilder**, kein Abschnitt über 60 Zeilen (Codeblöcke zählen mit). Oben ein Inhaltsverzeichnis mit Ankern. Sprache: **Deutsch**, direkte, knappe Anrede, Schritte im Infinitiv. Länger heißt: auslagern in `Dokumentation/` und verlinken, nicht kürzen der Belege.

| # | Abschnitt | Inhalt in Stichpunkten | Höchstens |
|---|---|---|---|
| 1 | Kopf | Name, ein Satz „was“ (aus der Kurzfassung der Vision, eigene Worte), Lizenz MIT, Bild 1 | 15 Zeilen |
| 2 | Wozu | der Anlass in 3–4 Sätzen: KI schreibt Commits schneller, als ein Mensch sie durchsieht; kein PR nötig; das Urteil geht ohne Abtippen zurück an die KI | 12 Zeilen |
| 3 | Installation | Voraussetzung **.NET-10-Runtime (ASP.NET Core)** und `git` im Suchpfad; Datei je Plattform aus dem neuesten GitHub-Release (Namen `gitreviewA-<tag>-<plattform>[.exe]`, Plattformen nach `release.yml`), Prüfsumme gegen `SHA256SUMS.txt`, `chmod +x`, in den Suchpfad legen; Hinweis macOS: weder signiert noch notarisiert, Gatekeeper warnt; Hinweis Windows/Linux nur, was belegt ist | 40 Zeilen |
| 4 | Erste Review in 2 Minuten | Schritte (höchstens 7): im Repository `gitreviewA <hash>…` oder `gitreviewA HEAD~3..HEAD`; Browser öffnet sich; Dateien durchsehen und abhaken; eine Zeile anmerken; **Beenden**; Ergebnis im Terminal (Codeblock mit echter Ausgabe); Bilder 1–3 | 50 Zeilen |
| 5 | Die Oberfläche | Aufgaben statt Menüs: Datei wählen und abhaken, Fortschritt, nächste ungeprüfte (`u`), Zeile und Datei anmerken (und Bereich, wenn grün), untereinander/nebeneinander, Umbruch, Leerraum, Lücken aufklappen, ganze Datei, im Diff suchen, Dateien ausblenden, Sprung nach VS Code, „Zusammen“ und „Einzeln“, Ergebnis kopieren; Tastaturhilfe (`?`) mit Verweis auf die Hilfe im Programm statt Abschrift aller Kürzel; Bilder 4–6 | 60 Zeilen |
| 6 | Für KI und Automatisierung: der Aufrufvertrag | **Aufruf**: Hashes, Bereiche `a..b`, `-` für Hashes über stdin (ein Hash je Zeile, nur mit Pipe), Grenzen der Auswahl (Warnung ab 201, Ablehnung ab 1 001 Commits); **Optionen**: `--port`, `--kein-browser`, `--ignore`, `--verbose`, `--quiet` — nur was `gitreviewA` tatsächlich versteht; **Ströme**: stdout gehört allein dem Ergebnis, Meldungen nur auf stderr (Stufen); **Exit-Codes** als Tabelle: 0 Beenden, 2 ungültiger Aufruf, 130 Abbruch, 1 Fehler nach dem Start — je Code der Anlass und was auf welchem Strom steht; **Ablauf**: der Prozess wartet, bis der Mensch „Beenden“ wählt; kein Zeitlimit; geschlossener Tab beendet nichts; **Ergebnisformat** (Markdown, UTF-8, LF) mit **einem vollständigen echten Beispiel** inklusive Abschnitt `## Dateien`, falls der Stand ihn erzeugt; Regeln: Text als Zitat, Stellenangabe `<Datei>:<Zeile>` bzw. `(ganze Datei)`, Commit nennt den Stand, nicht den Urheber; **kein Gesamturteil** („Keine Anmerkungen.“ heißt nicht „freigegeben“); ein Beispielaufruf aus einem Agenten (Shell) mit Auswertung des Exit-Codes; das Ergebnis ist Text, kein Bild | 90 Zeilen |
| 7 | Grenzen | siehe Abschnitt 4 | 30 Zeilen |
| 8 | Für Mitentwickler | Voraussetzungen (.NET-10-SDK, `git`, Node für `e2e/`, Playwright); Bauen und Testen mit den **tatsächlichen** Befehlen (`gitreviewA.sln`, `tests/`, `e2e/`); Ordnerstruktur der Lösung in 8–12 Zeilen (`src/GitReviewA` mit seinen Themenordnern, `tests/GitReviewA.Tests`, `e2e/`, `skripte/`); eine Datei je Plattform erzeugen mit `skripte/veroeffentlichen.sh`; Release: Tag `v*` löst `.github/workflows/release.yml` aus, Anhänge und Prüfsummen; wo die Planung liegt (`Anforderungen/`, `Dokumentation/Planung/`, `AI-Team/`) in drei Sätzen; Trunk-Based, Test zuerst — nur als Verweis auf das, was im Repository steht | 70 Zeilen |
| 9 | Lizenz und Herkunft | MIT; Drittkomponenten mit Lizenzhinweis nur, wenn im Repository ein Lizenztext liegt (z. B. Prism, IBM Plex, aus kanbanD übernommene Gestaltung) — Fundstelle prüfen, nicht raten | 10 Zeilen |

Jeder Befehl in der README ist **vom dokumentar ausgeführt** worden (Bauen, Testen, Veröffentlichen, Aufruf, Exit-Codes). Was sich nicht ausführen lässt (z. B. Download, wenn das Release nicht erreichbar ist), steht nicht in der README, sondern als `Lücke` im Bericht.

## 3. Screenshots

**Zweck je Bild** (Dateiname unter `Dokumentation/Bilder/readme/`, im Text direkt vor der Stelle, die es belegt):

| Nr | Datei | Zeigt | Zweck | Alt-Text (Sinn, nicht „Screenshot“) |
|---|---|---|---|---|
| 1 | `01-zusammen.png` | Zustand nach dem Start: links die Dateien der ganzen Auswahl, rechts der Diff in voller Höhe, Commits als zugeklappte Zeile, Fortschritt im Kopf | in drei Sekunden erkennen, was das Werkzeug ist | „gitreviewA nach dem Start: links die geänderten Dateien aller gewählten Commits, rechts der Diff der gewählten Datei“ |
| 2 | `02-zeile-annotieren.png` | Anmerkung an einer Zeile im Diff, Feld geöffnet oder Anmerkung sichtbar | die Kernhandlung | „Diff mit einer Anmerkung an einer geänderten Zeile“ |
| 3 | `03-abhaken.png` | Haken an mehreren Dateien, Fortschritt „k von n“ | Checkliste im Kopf entlasten | „Dateiliste mit abgehakten und ungeprüften Dateien und Fortschrittsanzeige“ |
| 4 | `04-nebeneinander.png` | Anordnung „nebeneinander“ mit Syntaxfarben | lesbare Diffs | „Diff zweispaltig, links alte, rechts neue Fassung, mit Syntaxhervorhebung“ |
| 5 | `05-tastaturhilfe.png` | die geöffnete Kürzel-Hilfe (`?`) | alles per Tastatur | „Dialog mit den Tastenkürzeln, gruppiert nach Bereichen“ |
| 6 | `06-beenden.png` | die Rückfrage vor „Beenden“ mit Zahl der Anmerkungen und ungeprüften Dateien | der Weg zum Ergebnis | „Rückfrage vor dem Beenden mit Anzahl der Anmerkungen und der ungeprüften Dateien“ |

- **Ergebnis im Terminal ist kein Bild.** Es steht als Codeblock mit der **echten, unveränderten** stdout-Ausgabe desselben Laufs wie die Bilder (durchsuchbar, kopierbar, kann nicht veralten wie ein Pixelbild). Ein zusätzliches Bild vom Terminal entsteht nur, wenn es reproduzierbar und headless herstellbar ist; sonst unterbleibt es ohne Rückfrage.
- **Bild 6 und alles zum Kopf „Beenden/Abbrechen“** setzt voraus, dass die Interaction „Beenden und Abbrechen im Kopf“ in der WBS grün ist; **Bereich annotieren** nur, wenn „Zeilenbereich annotieren“ grün ist. Gilt der Stand beim Schreiben als rot, wird das Bild nicht aufgenommen, der Abschnitt nicht geschrieben, und der Bericht nennt es unter `Lücke` mit der Interaction — die README **wird nicht aufgehalten**. Nachziehen ist eine eigene kleine Karte.
- **Seitenleisten-Trenner und Einklappen** (Interactions „Breite der Seitenleiste ziehen“, „Seitenleiste ein- und ausklappen“) nur beschreiben, wenn grün, sonst weglassen.

**Wie sie entstehen**

1. **Echtes Programm**: der aktuelle Stand von `main` (Veröffentlichungsbau oder `dotnet run`), nie ein Nachbau, nie das Wireframe `Dokumentation/Wireframes/…` als Bild.
2. **Wegwerf-Repository mit neutralem, erfundenem Inhalt**, angelegt im Scratchpad des Laufs (nicht in diesem Repository, nicht aus dessen Dateien): ein kleines Beispielprojekt (Vorschlag „Wetterstation“) mit 4–6 Commits, zwei Dateitypen mit Syntaxfarben (z. B. `.cs` und `.js`), einer Umbenennung, einer Löschung, einer gemischten Änderung mit Leerraum. Autor `Alex Beispiel <alex@example.org>`, keine echten Namen, Adressen, E-Mail-Adressen, Pfade des Betreibers oder Hostnamen im Bild oder im Beispiel-Ergebnis. Festes `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`, damit Hashes zwischen den Läufen gleich bleiben (so passen Bild, Ergebnis-Beispiel und Hashes im Text zusammen).
3. **Zustand über die Oberfläche herstellen** wie ein Mensch (Klicken, Tippen, Tastatur), nicht durch Eingriffe im Browser. Start mit `gitreviewA … --kein-browser --port <freier Port>`; der Browser ist headless (Playwright), nie sichtbar.
4. **Einheitlich**: Fenster **1280 × 800**, Hell-Darstellung, kein Mauszeiger, keine Entwicklerwerkzeuge, keine Benachrichtigungen, dieselbe Beispieldatei durch alle Bilder.
5. **Format**: PNG, je Bild höchstens etwa 300 KB — zuschneiden statt verkleinern, Text bleibt lesbar. **Keine Markierungen ins Pixelbild**; was zu sehen ist, sagt der Text darunter (links/rechts/oben).
6. **Ablage und Wiederholbarkeit**: Bilder unter `Dokumentation/Bilder/readme/`, relativ verlinkt (`![Alt](Dokumentation/Bilder/readme/01-zusammen.png)`). Dazu `Dokumentation/Bilder/readme/ERZEUGEN.md`: das Wegwerf-Repo (Befehle, Daten), die Aufruf-Befehle, die Schritte je Bild — so, dass jemand die Bilder nach einer Oberflächenänderung nachziehen kann. Kein neues Skript im Quellbaum (das wäre neuer Umfang).
7. Nach dem Lauf: eigener Server beendet, Wegwerf-Repo entfernt, `.playwright-mcp/` leer.

## 4. Grenzen: was die README nicht verspricht

Aus „Ausdrücklich nicht Ziel“ und den Leitplanken der Vision; die README sagt das offen, in eigenen Worten:

- Nichts wird gespeichert: kein Fortsetzen, keine Läufe, keine Haken oder Anmerkungen nach dem Ende; das Ergebnis existiert nur als Ausgabe.
- Ein Mensch, ein Tab, nur localhost (`127.0.0.1`); kein Mehrbenutzerbetrieb, kein Zugriff über das Netz.
- Kein Pull-Request-Ersatz: keine Kommentare zurück zu GitHub, keine Freigabe-Workflows. Kein Editor: gitreviewA ändert keine Dateien und keine Commits.
- **Kein Gesamturteil**: „Beenden“ endet immer mit Exit 0; das Ergebnis besteht aus den Anmerkungen. Ein zweites Ausgabeformat (JSON) gibt es nicht.
- Git nur über die `git`-Kommandozeile; nur Repositories mit Arbeitsbaum (nacktes Repository: ungültiger Aufruf).
- Auswahl bis 1 000 Commits; das Lastprofil der Vision (200 Commits, 2 000 Dateien, 20 000 Diff-Zeilen je Datei, 500 Anmerkungen) steht ausdrücklich als **Auslegung/Ziel**, nicht als Messung.

**Ehrlichkeit über den Stand**

- Plattformen **nur so, wie `release.yml` sie baut** (heute linux-x64, linux-arm64, win-x64, osx-arm64, osx-x64); getestet ist, was der dokumentar tatsächlich ausgeführt hat (voraussichtlich Linux) — für den Rest steht „gebaut, nicht von Hand geprüft“.
- Frameworkabhängig: die .NET-10-Runtime (ASP.NET Core) muss installiert sein; sie liegt **nicht** in der Datei.
- macOS: ohne Signatur und Notarisierung; Gatekeeper warnt.
- Keine erfundenen Zahlen: keine Download-Zahlen, keine Sterne, keine Versionsnummer außer „neuestes Release“ (nie eine feste Version in den Text schreiben), keine Zeitversprechen („in unter n Sekunden“) außer als zitiertes Ziel der Vision mit Fundstelle, keine Abdeckungs- oder Testzahlen ohne ausgeführten Lauf mit Datum. **Kein Abzeichen (Badge)** außer der Lizenz.
- Nur grüne Interactions der WBS (`Dokumentation/Planung/gitreviewa.md`) werden als vorhanden beschrieben; Rotes steht nicht in der README (auch nicht als „bald“).
- Wo das laufende Programm von einer Anforderung abweicht, gilt das Programm; die Abweichung steht im Bericht unter `Abweichungen`.

## 5. Abnahmekriterien (prüfbar)

1. **Datei und Umfang**: `README.md` liegt im Wurzelordner, hat Inhaltsverzeichnis und die neun Abschnitte aus Abschnitt 2 in dieser Reihenfolge, höchstens 450 Zeilen; jeder relative Link und jedes Bild löst auf (Prüfung mit einem Skript über alle `](…)`-Ziele, Ausgabe im Bericht).
2. **Bilder**: 5–7 PNG unter `Dokumentation/Bilder/readme/` laut Liste (fehlende nur mit begründeter `Lücke`), jedes mit Alt-Text, 1280 × 800 oder Zuschnitt davon, höchstens etwa 300 KB, `ERZEUGEN.md` vorhanden; Stichprobe: Hashes im Ergebnis-Beispiel stimmen mit denen im Wegwerf-Repo laut `ERZEUGEN.md` überein.
3. **Belegt**: das Ergebnis-Beispiel ist die unveränderte stdout-Ausgabe eines echten Laufs; die Exit-Codes 0, 2 und 130 sind je mit einem Aufruf belegt (Befehl, Exit-Code, Ströme im Bericht); jeder Bau- und Testbefehl wurde ausgeführt.
4. **Frei von Fremdem**: kein Inhalt aus diesem Repository im Bild (kein Pfad, Name oder Dateiinhalt von gitreviewA selbst), keine echten Personendaten (Suche im Text und im Bildtext); Prüfzeile im Bericht.
5. **Grenzen und Stand**: die Aussagen aus Abschnitt 4 stehen in der README (Prüfliste im Bericht, je Punkt Zeile in der README), keine Zahl ohne Beleg, keine Interaction beschrieben, die in der WBS rot ist.
6. **Commit**: README, Bilder und `ERZEUGEN.md` in einem oder mehreren themenreinen Commits im Worktree der Karte, Arbeitsbaum sauber.

## 6. Hinweise für den Ablauf

- Reihenfolge: Wegwerf-Repo und Bilder zuerst (sie klären, was das Programm wirklich zeigt), dann Text, dann Links prüfen.
- Rückfragen an den Product Owner nur zu Richtungsfragen; Wortlaute, Bildauswahl im Rahmen der Liste und Kürzungen entscheidet der dokumentar nach diesem Auftrag.
- Die README wird bei künftigen Karten, die sichtbares Verhalten ändern, durch die Prüfung „Karten in der Abnahme, die das Handbuch berühren“ (`rollen/dokumentar/pflege-und-selbstpruefung.md`) aktuell gehalten; Bilder werden nach `ERZEUGEN.md` nachgezogen.
