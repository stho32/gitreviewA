---
id: R00000
titel: Vision — gitreviewA
status: Lebend
angelegt: 2026-11-24
zuletzt-ergaenzt: 2026-11-24
---

# R00000: Vision — gitreviewA

Kein Anforderungsdokument. Beschreibt das Gesamtziel der Anwendung.
Wird fortgeschrieben, nie abgehakt.

## Kurzfassung

gitreviewA ist ein Kommandozeilenwerkzeug, das in einem Git-Repository mit einer Reihe
von Commits aufgerufen wird und dafür eine schlichte Weboberfläche öffnet. Darin sieht ein
Mensch die Änderungen durch, hakt geprüfte Dateien ab und hängt Anmerkungen an Stellen im
Diff. Mit „Beenden“ endet der Lauf, und gitreviewA gibt das „Ergebnis manueller Review“
mit Stellenangaben auf stdout aus — an den Menschen im Terminal oder an die KI, die das
Werkzeug aufgerufen hat und auf das Urteil wartet.

## Anlass

KI-Agenten schreiben Commits schneller, als ein Mensch sie in `git log -p` oder einer IDE
sinnvoll durchsehen kann. Pull-Request-Werkzeuge passen nicht, weil auf main gearbeitet
wird und nicht jede Prüfung einen PR rechtfertigt. Es fehlt ein schneller Weg, eine
bestimmte Auswahl von Commits gezielt zu prüfen und das Urteil des Menschen ohne Abtippen
an die KI zurückzugeben.

## Zielbild

- **Aufruf mit Auswahl**: Hashes, Bereiche oder eine Liste über stdin; die Oberfläche
  öffnet sich im Browser, der Prozess wartet.
- **Lesbare Diffs**: unified oder nebeneinander, Zeilenumbruch, Syntaxhervorhebung,
  Whitespace ausblenden, Kontext erweitern; Umbenennungen erkannt, Bilder als
  Vorher/Nachher, Binärdateien benannt.
- **Einzeln oder zusammen**: jeden Commit für sich oder alle gewählten Änderungen je
  Datei zusammen — als Netto-Diff, wo die Commits eine lückenlose Kette bilden, sonst je
  Commit beschriftet.
- **Checkliste im Kopf entlasten**: Dateien abhaken, Fortschritt sehen, zur nächsten
  ungeprüften springen; alles per Tastatur.
- **Sprung in den Editor**: jede Stelle öffnet sich per Klick in VS Code, mit Hinweis,
  wenn die Datei sich seit dem Commit geändert hat.
- **Anmerkungen an Stellen**: Notizen und Hinweise an Zeilen oder Dateien; Ausblendmuster
  und Suche helfen, das Wesentliche zu finden.
- **Abbruch erkennbar**: wird der Review ohne „Beenden“ abgebrochen (Strg+C, Signal), erscheint
  kein Ergebnis auf stdout, sondern „Review abgebrochen“ auf stderr und Exit 130; ein
  geschlossener Tab beendet nichts, ein Zeitlimit gibt es nicht.
- **Ergebnis als Rückkanal**: „Beenden“ schließt den Lauf; das Ergebnis manueller Review
  mit allen Anmerkungen und Stellenangaben (Commit, Datei, Zeile) steht auf stdout, so
  geformt, dass eine KI es direkt als Arbeitsauftrag lesen kann — als Markdown; ein zweites
  Format (JSON) erst bei konkretem Bedarf.

## Nutzer und Nutzen

- **Der prüfende Mensch** (zuerst der Betreiber selbst): sieht genau die Commits, um die
  es geht, verliert in großen Änderungen nicht den Überblick und gibt Feedback, ohne es
  abzutippen.
- **Der aufrufende KI-Agent**: bekommt ein menschliches Urteil als strukturierte
  Rückmeldung an einem Ort, den er ohnehin liest — der Standardausgabe des Prozesses.

## Leitplanken

- **.NET 10**, Kommandozeilenanwendung mit eingebetteter Weboberfläche; ausgeliefert als
  **genau eine ausführbare Datei** je Plattform (alles darin, kein Ordner; frameworkabhängig,
  setzt die .NET-10-Runtime voraus).
- **Nur localhost**, freier Port, der Browser öffnet sich selbst; ein Mensch, ein Tab je Lauf.
- **Git über die `git`-Kommandozeile**, damit Diffs genau denen von `git` entsprechen.
- **Nichts wird gespeichert**: Haken und Anmerkungen leben nur im Arbeitsspeicher des
  Laufs; das Ergebnis existiert nur als Ausgabe.
- **stdout gehört allein dem Ergebnis.** Logging nur auf stderr: Standardstufe Warning,
  `--verbose` Debug, `--quiet` nur Error und Exception; je Eintrag Zeit, Stufe und
  Kontext (Commit, Datei, Endpunkt); keine Logdatei, keine Rotation.
- **Lastprofil**: ein Mensch je Lauf. Flüssig bis 200 Commits, 2 000 geänderte Dateien,
  20 000 Diff-Zeilen je Datei (darüber zugeklappt, Laden auf Wunsch) und 500
  Annotationen. Ziele: Oberfläche ≤ 2 s nach Aufruf, Dateiwechsel ≤ 200 ms typisch und
  ≤ 1 s an der Obergrenze, „Beenden“ bis Ausgabe ≤ 1 s. Diffs werden je Datei bei Bedarf
  geladen.
- **Öffentlich unter MIT-Lizenz**; Repositories auf GitNAS (`origin`) und GitHub (`github`).

## Ausdrücklich nicht Ziel

- Kein Speichern von Haken, Anmerkungen oder Läufen; kein Fortsetzen eines Reviews.
- Kein Mehrbenutzerbetrieb, kein Zugriff über das Netz.
- Kein Pull-Request-Ersatz: keine Kommentare zurück zu GitHub oder anderen Plattformen,
  keine Freigabe-Workflows.
- Kein Editor: gitreviewA ändert keine Dateien und keine Commits.
- Kein Gesamturteil („freigegeben“ / „nacharbeiten“): das Ergebnis besteht aus den Anmerkungen,
  „Beenden“ endet immer mit Exit 0 (entschieden 2026-11-24).

## Offene Richtungsfragen

- **Anbindung an kanbanD**: die Commits einer Karte direkt laden (`--karte <nr>`) —
  wann und wie eng?

## Ergänzungshistorie

| Datum | Ergänzung |
|---|---|
| 2026-11-24 | Vision angelegt (Review-Rückkanal Mensch → KI, .NET 10, nur RAM, stdout = Ergebnis, Lastprofil, MIT) |
| 2026-11-24 | Leitplanke Auslieferung: eine ausführbare Datei je Plattform statt `dotnet tool` + Single-File (Betreiber: „als 1 executable, nicht als Ordner“, „kann aber frameworkabhängig sein“) |
| 2026-11-24 | Richtungsfrage „Urteil neben den Anmerkungen“ entschieden: kein Gesamturteil, Exit 0 bei „Beenden“ (Betreiber, Empfehlung des product-owner) |
| 2026-11-24 | Richtungsfrage „Lauf ohne Beenden“ entschieden: Tab zu wartet weiter, Abbruch ohne Ergebnis mit „Review abgebrochen“ auf stderr und Exit 130, kein Zeitlimit (Betreiber, Empfehlung des product-owner) |
| 2026-11-24 | Richtungsfrage „Format des Ergebnisses“ entschieden: nur Markdown, JSON erst bei konkretem Bedarf (Empfehlung des product-owner; Betreiber: „Nimm einfach immer die Empfehlung vom Product Owner“) |
