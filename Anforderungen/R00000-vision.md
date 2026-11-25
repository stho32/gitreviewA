---
id: R00000
titel: Vision — gitreviewA
status: Lebend
angelegt: 2026-11-24
zuletzt-ergaenzt: 2026-11-25
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
Werkzeug aufgerufen hat und auf das Urteil wartet. Daneben zeigt gitreviewA einzelne Dateien
nur zum Lesen und Kopieren an.

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
- **Zusammen ist der Standard, die Dateien führen**: Nach dem Start steht links die Liste der
  Dateien der ganzen Auswahl, rechts der Diff der gewählten Datei in voller Höhe; die Commits
  sind eine zugeklappte Zeile über den Dateien. „Einzeln“ mit Commit-Wähler ist ein bewusster
  Wechsel. Der Haken gilt in „Zusammen“ je Datei, in „Einzeln“ je Stelle (Commit und Datei);
  das Ergebnis nennt weiter jede Stelle.
- **Arbeitsplatz mit entkoppelten Bereichen** (Richtung A): links die Dateiliste, gruppiert nach
  Code, Tests und Doku, mit Fortschritt je Gruppe; in der Mitte der Diff mit der Absicht der KI
  (den Commit-Nachrichten zur Datei) und einer einzeiligen Werkzeugleiste (Suche und „Ansicht ▾“
  statt einzelner Schalter); rechts „Ergebnis für die KI“, das mit jeder Anmerkung und jedem Haken
  mitwächst und genau das zeigt, was „Beenden“ ausgeben würde. Die Seitenleisten sind wie in einem
  Texteditor vom Inhalt entkoppelt: jede ist ein eigener Bereich mit eigenem Bildlauf, in der
  Breite ziehbar und einklappbar; der Inhalt in der Mitte scrollt für sich, Kopf und Statuszeile
  stehen.
- **Beenden und Abbrechen im Kopf**: beide stehen im Kopf der Oberfläche und fragen vor der
  Wirkung nach. „Beenden“ nennt die Zahl der Anmerkungen und die Dateien, die ungeprüft bleiben;
  „Abbrechen“ wirkt wie Strg+C (nichts auf stdout, „Review abgebrochen“ auf stderr, Exit 130)
  und warnt, dass alle Anmerkungen verloren gehen.
- **Abschlussschritt vor „Beenden“**: bevor das Ergebnis an die KI geht, sieht der Mensch es
  noch einmal und bekommt einen Hinweis auf die Dateien, die er nie angesehen hat; er kann zurück
  und weiterprüfen, solange der Lauf läuft. Nach „Beenden“ gibt es kein Zurück (kein Fortsetzen).
- **Checkliste im Kopf entlasten**: Dateien abhaken, Fortschritt sehen, zur nächsten
  ungeprüften springen; alles per Tastatur.
- **Sprung in den Editor**: jede Stelle öffnet sich per Klick in VS Code, mit Hinweis,
  wenn die Datei sich seit dem Commit geändert hat.
- **Anmerkungen an Stellen**: Notizen und Hinweise an Zeilen oder Dateien; Ausblendmuster
  und Suche helfen, das Wesentliche zu finden.
- **Art der Anmerkung**: jede Anmerkung kann eine Art tragen — Muss, Frage oder Idee (Tasten 1–3).
  Im Ergebnis steht sie als vorangestelltes `[Muss]`, `[Frage]` oder `[Idee]` am Anfang der
  Textzeile der Anmerkung; Überschriften, Stellenangaben, Nummerierung und Abschnitte bleiben
  unverändert, sodass ein Leser, der die Art nicht kennt, das Ergebnis weiter richtig liest. Die
  Art gilt je Anmerkung und ist kein Gesamturteil.
- **Einzelne Dateien ansehen und kopieren**: neben dem Review von Commits zeigt gitreviewA eine
  oder mehrere genannte Dateien ganz, ohne Diff und mit Syntaxhervorhebung — etwa SQL-Dateien,
  die man ausführen soll —, und ihr Inhalt lässt sich ganz oder teilweise kopieren. Quellen sind
  Dateien vom Datenträger (im Arbeitsbaum, auch ungetrackt oder ignoriert, oder außerhalb jedes
  Repositories) und der Stand in einem Commit über `<commit>:<pfad>`; gelesen werden nur die beim
  Start genannten Dateien. Nur lesen: kein Durchwandern von Verzeichnissen, kein Editor. Dieser
  Lauf hat kein Ergebnis: stdout bleibt leer, „Schließen“ endet mit Exit 0, Strg+C oder Signal
  wie im Review mit „Review abgebrochen“ auf stderr und Exit 130.
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
  Rückmeldung an einem Ort, den er ohnehin liest — der Standardausgabe des Prozesses; mit der Art
  der Anmerkung weiß er, was er ändern muss, was er beantworten soll und was nur Anregung ist.
- **Wer eine Datei ausführen oder weitergeben soll** (etwa ein SQL-Skript): sieht sie lesbar und
  kopiert sie ganz oder in Teilen, ohne einen Editor zu öffnen.

## Leitplanken

- **.NET 10**, Kommandozeilenanwendung mit eingebetteter Weboberfläche; ausgeliefert als
  **genau eine ausführbare Datei** je Plattform (alles darin, kein Ordner; frameworkabhängig,
  setzt die .NET-10-Runtime voraus).
- **Nur localhost**, freier Port, der Browser öffnet sich selbst; ein Mensch, ein Tab je Lauf.
- **Git über die `git`-Kommandozeile**, damit Diffs genau denen von `git` entsprechen; gilt für
  Diffs und `<commit>:<pfad>`; genannte Dateien liest die Dateiansicht vom Datenträger.
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
- Kein Editor: gitreviewA ändert keine Dateien und keine Commits — auch die Dateiansicht liest
  und kopiert nur.
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
| 2026-11-24 | Zielbild ergänzt um „Zusammen ist der Standard, die Dateien führen“ und „Beenden und Abbrechen im Kopf“ (Betreiber: „Die Dateien bitte über den Commits (sind wichtiger) und die Default-Anzeige ist ‚alle Änderungen zusammen‘.“, „Ja, Fassung 2 bitte einplanen.“; Entscheidungen des product-owner zu #27) |
| 2026-11-25 | Zielbild ergänzt um „Arbeitsplatz mit entkoppelten Bereichen“ (Richtung A), „Abschlussschritt vor ‚Beenden‘“, „Art der Anmerkung“ (Muss/Frage/Idee als vorangestelltes `[Muss]` in der Textzeile, Format sonst unverändert, kein Gesamturteil) und den neuen Anwendungsfall „Einzelne Dateien ansehen und kopieren“; Kurzfassung, Nutzer und Nutzen, „Kein Editor“ ergänzt; zwei Richtungsfragen zur Dateiansicht offen (Betreiber: „Variante A, aber die Sidebars müssen vom Inhalt entkoppelt sein, ähnlich wie ein Texteditor.“ und „Außerdem brauch ich noch irgendwas um nur einzelne Dateien anzusehen. Zum Beispiel habe ich öfter das Problem, dass man eine oder mehrere SQL Dateien ausführen soll. Die könnte man mit dem Review Tool anzeigen. Man müsste natürlich den Inhalt ganz oder teilweise kopieren können.“; Abschlussschritt nach Empfehlung des Directors; Karten #41, #42) |
| 2026-11-25 | Richtungsfragen „Dateiansicht: Quelle der Dateien“ und „Dateiansicht: Ergebnis“ entschieden (product-owner, `AI-Team/po-entscheidungen.md` Zeilen 200/201): das Zielbild nennt als Quellen Dateien vom Datenträger (auch außerhalb von git, nur die beim Start genannten) und `<commit>:<pfad>`; die Leitplanke „Git über die `git`-Kommandozeile“ gilt für Diffs und `<commit>:<pfad>`, genannte Dateien liest die Dateiansicht vom Datenträger; Ergebnis der Dateiansicht: stdout leer, Exit 0 beim Schließen, Exit 130 beim Abbruch (Strg+C oder Signal) |
