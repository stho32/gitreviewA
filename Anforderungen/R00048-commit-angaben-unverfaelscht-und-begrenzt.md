---
id: R00048
status: Neu
datum: 2026-11-26
ursprung: Bug-Report
ursprungslauf: R00003
---

# R00048: Behebung von „Commit-Angaben verschoben bei Trennzeichen 0x1F und ohne Ausgabegrenze gelesen“

## Beschreibung

Zwei Fehler im Lesen aus dem fremden Repository, gefunden vom planer an Karte #47 (R00038, Offene Frage 2) und hier im Wegwerf-Repo nachgeprüft:

1. **Feldverschiebung:** Trägt ein Commit das Byte 0x1F (Unit Separator) im Autor, im Betreff oder in der Message, zeigt die Commit-Leiste die Angaben verschoben. Ein Autor `Anna␟Beispiel` (␟ = 0x1F) erscheint als Autor „Anna“, Datum „Beispiel“, Betreff `2026-03-04T09:15:00+01:00`, und Betreff und Message laufen in der Message zusammen. Ein fremdes Repo kann so das Datum oder den Betreff eines Commits frei wählen, den der Mensch für echt hält.
2. **Keine Ausgabegrenze:** Die Commit-Angaben beim Start (bis zu 1 000 Commits mit unbegrenzter Message) und weitere Leser (Dateiliste je Commit, Übersicht für Haken und Zusammen, Elternfolge, Netto-Dateiliste, Hilfsaufrufe) lesen die Ausgabe von `git` ohne die `Ausgabegrenze` aus R00017. Ein Commit mit einer Message von 20 MiB und einer von 6 MiB starten heute, liefern 27 MB über `GET /api/commits` aus und belegen 514 MB Speicher. Erwartet ist: Ausgabe über der Grenze endet als Ausgang „zu groß“, sichtbar und nie still gekürzt.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (die Commit-Leiste zeigt, was die KI geschrieben hat, unverfälscht) und die Leitplanken Lastprofil und „Git über die Kommandozeile“ (fremdes Repo, Abbruch statt ungebremstem Lesen).

## Ursachenanalyse

### Root Cause

- **Trennzeichen, das git in Feldern ausgibt.** `src/GitReviewA/Git/GitLeser.cs:606` (`GitLogMitFormat`) fordert `--format=%H%x1f%an%x1f%aI%x1f%s%x1f%b`, und `src/GitReviewA/Git/GitLogAusgabe.cs:6,18` zerlegt jeden Datensatz mit `Split("\u001f", 5)`. git gibt 0x1F in `%an`, `%s` und `%b` unverändert aus (geprobt, siehe unten). Jedes 0x1F im Autor schiebt die Felder um eins weiter; weil `Split` mit der Höchstzahl 5 den Rest ins letzte Feld legt, endet die Ausgabe nicht mit einem Fehler, sondern mit falsch zugeordneten Feldern. Der Hash (Feld 0) bleibt richtig, deshalb fällt der Fehler weder `HashpraefixPruefer` noch der Feldzählung in `GitLogAusgabe.cs:19` auf. Die Annahme in R00003 („ein Rumpf kann keines von beiden enthalten“, Technische Überlegungen, Ablauf 1) stimmt nicht. Betroffen sind alle drei Wege, die das Format nutzen: `Lesen` (Z. 16–21, Einzelcommits und stdin), `LeseBereich` (Z. 406–411) und `LeseNeuesteZuerst` (Z. 467–488, mehrere Bereiche).
- **Leser ohne Grenze.** `GitLeser` hat zwei Lesewege: mit Grenze (`WarteAufEndeMitGrenze`, Z. 1070, `LesenMitGrenze`, Z. 1083) und ohne Grenze (`WarteAufEnde`, Z. 1055, `ReadToEnd`; `AusfuehrenAlsBytes`, Z. 863, `CopyTo`). Die Grenze hängt an der Aufrufstelle (Lehre 2026-11-25 #10 in `AI-Team/gelerntes.md`). Ohne Grenze lesen heute:

  | Leser | Stelle | Aufrufer | Größe vom fremden Repo bestimmt |
  |---|---|---|---|
  | Commit-Angaben, Einzelcommits | `Lesen` Z. 19 | Start (`CommitsDerAuswahl`) | ja, Message unbegrenzt, bis 1 000 Commits |
  | Commit-Angaben, ein Bereich | `LeseBereich` Z. 409 | Start | ja, bis 1 001 Commits je Bereich |
  | Commit-Angaben, mehrere Bereiche | `LeseNeuesteZuerst` Z. 486 | Start | ja |
  | Elternfolge | `ElternfolgeLesen` Z. 27 | Zusammen | ja, Zahl der Eltern eines Merges |
  | Netto-Dateiliste | `NettoDateienLesen` Z. 38 (`AusfuehrenAlsBytes`) | Zusammen | ja, Zahl und Länge der Pfade |
  | Dateiliste je Commit | `DateienLesen` Z. 46 (`AusfuehrenAlsBytes`) | `GET /api/commits/{hash}/dateien` | ja |
  | Übersicht aller Dateien | `UebersichtLesen` Z. 55 (`AusfuehrenAlsBytes`) | Haken, Stellensperre, Zitat im Ergebnis, Zusammen | ja |
  | Diff-Attribut | `AttributAusgabe` Z. 340, 345 | Diff, Binärgrund | gering (`.git/info/attributes`) |
  | Wurzel, nacktes Repo | `WurzelLesen` Z. 69, `IstNacktesRepository` Z. 78 | Start | nein (eigener Pfad) |
  | Hash auflösen, gemeinsamer Vorfahr | `LoestSichAuf` Z. 235, `merge-base` Z. 446 | Start | gering (Hashes) |

  Mit Grenze lesen schon: `rev-parse --verify`, `--disambiguate`, `cat-file -t`, `ls-tree`, `diff --quiet`, alle Diff-Wege und der Blob-Leser.

- **Ausgeschlossen (begründet, nicht verwundbar):** Die Elternfolge (`%H%x1f%P`, Zeilen nach LF) trägt nur Hexziffern und Leerzeichen. Die Übersicht (`%x1e%H` mit `-z`) liest Pfade nach ihrer Stelle, nicht nach dem Trenner (`UebersichtParser.cs:10`, Test `UebersichtParserTests` „falscher Kopf“). `--raw --numstat -z`, `ls-tree -z` und `check-attr -z` trennen mit NUL, und NUL kann in keinem Pfad stehen. `for-each-ref` ruft gitreviewA nicht auf.

### Proben im Wegwerf-Repo (Ablage des planers, git 2.48.1, .NET 10.0.100, Stand `1b405a3`)

- **0x1F bleibt in git erhalten:** `git log --no-walk=unsorted -z --format=%H%x1f%an%x1f%aI%x1f%s%x1f%b` auf einen Commit mit Autor `Anna␟Beispiel`, Betreff `Betreff␟mit Trenner`, Rumpf `Rumpf␟mit Trenner` gibt (`od -c`) `…cc6 037 A n n a 037 B e i s p i e l 037 2 0 2 6 - 0 3 - 0 4 T 0 9 : 1 5 : 0 0 + 0 1 : 0 0 037 B e t r e f f 037 m i t   T r e n n e r 037 R u m p f 037 …` aus.
- **Verschiebung in der Anwendung:** `gitreviewA <t> --port <frei> --kein-browser`, dann `GET /api/commits` liefert `"autor":"Anna","datum":"Beispiel","betreff":"2026-03-04T09:15:00+01:00","rumpf":"Betreff\u001Fmit Trenner\u001FRumpf\u001Fmit Trenner"`. Mit Bereich `p..u` und mit zwei Bereichen `p..t p..u` ist das Ergebnis dasselbe.
- **Keine Grenze:** zwei Commits mit 20 MiB und 6 MiB Message. Der Start gelingt, `GET /api/commits` ist 27 289 914 Byte groß (Rümpfe 20 971 519 und 6 291 455 Zeichen), `VmHWM` des Prozesses ist 514 652 kB, auf stderr steht nur die Startzeile.
- **NUL ist ein sicherer Trenner:** Ein Commit, dessen Message ein NUL trägt (angelegt mit `git hash-object -t commit -w --literally`), wird von git am NUL abgeschnitten: `%s` = `Vor dem NUL`, `%b` leer. Ein NUL im Autorkopf ergibt ein leeres `%an` und den wörtlichen Text `%aI`. In beiden Fällen gibt git mit `--format=%H%x00%an%x00%aI%x00%s%x00%b -z` genau 5 NUL je Datensatz aus. Ein Feld kann also kein NUL enthalten, und die Zahl der Felder bleibt stabil.

### Betroffene Komponenten

- `Git/GitLogAusgabe.cs` (Format und Zerleger der Commit-Angaben), `Git/GitLeser.cs` (Format in `GitLogMitFormat`, Lesewege ohne Grenze), `Git/GitZuGross.cs` (Ausgang „zu groß“).
- Aufrufer, die den Ausgang „zu groß“ heute nicht kennen und nur `GitFehler` fangen: `Aufruf/CommitsDerAuswahl.cs:44` (macht daraus „nicht auflösbar“), `Dateien/DateienEndpunkt.cs:49`, `Zusammen/ZusammenLesenInteractor.cs:133`, `Haken/DateiAbhakenInteractor.cs:153`, `Haken/Stellensperre.cs:22`, `Beenden/Bereichszeilen.cs:126`, `Program.cs:65`.
- Seiteneffekt der Behebung: Ein Lauf, der heute mit sehr großen Messages startet, wird abgewiesen. Gemessen an 1 410 Commits der KI-Rollen ist der längste Rumpf 1 395 Zeichen lang (Messung des planers an #47, PO-Entscheidung 2026-11-26 #47). Bei 1 000 Commits mit 8 KiB je Message liegt die Ausgabe immer noch unter 8 MiB. Kein echter Lauf ist bekannt, der die Grenze erreicht.

## Lösungsvorschlag

### Optionen

| Option | Komplexität | Testbarkeit | Reversibilität | Risiko |
|---|---|---|---|---|
| 1. Lokal: nur das Format der Commit-Angaben auf NUL umstellen, die drei Wege der Commit-Angaben mit Grenze lesen | gering | gut | hoch | übrige sieben Leser bleiben ohne Grenze; die Grenze hängt weiter an der Aufrufstelle |
| 2. **Komponente (Empfehlung):** Format und Zerleger der Commit-Angaben an einer Stelle mit NUL als einzigem Trenner; im `GitLeser` ein einziger begrenzter Leseweg (Text und Bytes) für jeden Aufruf; die Wege ohne Grenze entfallen; jeder Aufrufer bildet „zu groß“ auf seinen bestehenden sichtbaren Zustand ab | mittel | gut (eine Tabelle aller Leser mit kleiner Grenze, ein Zähler am Leseort) | hoch | gering; neue Ausgänge an sechs Aufrufern |
| 3. Architektur: Commits als Rohobjekte über `git cat-file --batch` lesen (Längenpräfix je Objekt, Größe vor dem Lesen bekannt) mit eigenem Commit-Parser | hoch | mittel | mittel | eigener Parser für Kopfzeilen, `encoding`, `gpgsig`, `mergetag`; die anderen Leser bleiben ungelöst |

### Langfristige Lösung

Option 2. Die Unterscheidung „wo endet ein Feld“ steht an einer Stelle, nämlich bei Format und Zerleger in `GitLogAusgabe`. Die Unterscheidung „Ausgabe zu groß“ steht an einer Stelle, nämlich im einen Leseweg des `GitLeser`. Jeder heutige und künftige git-Aufruf erbt beides, statt es an der Aufrufstelle zu vergessen (Lehre #10).

### Alternative Ansätze

- Option 1: Sie behebt den gemeldeten Fall, lässt aber Dateiliste, Übersicht, Elternfolge und Netto-Liste ungebremst. Damit wiederholt sie das Muster, das zu diesem Fehler geführt hat (Grenze an der Aufrufstelle).
- Option 3: Längenpräfixe gibt `git log --format` nicht aus. Der Weg über Rohobjekte baut gits Kopfparser nach, und das Risiko ist größer als der Gewinn, eine Grenze je Commit zu haben.
- Ein Feld je Aufruf (fünf `git log`-Aufrufe): verletzt „ein Aufruf für alle Commits“ (R00003, NFA Performance) und braucht trotzdem einen Trenner zwischen den Commits.
- Plausibilitätsprüfung ohne neuen Trenner (Datum muss ISO sein): erkennt einen verschobenen Autor, aber keinen 0x1F im Betreff, der nur Betreff und Rumpf verschiebt.

## Test-Strategie

### Test zur Bug-Reproduktion (zuerst rot)

- `GitLogAusgabeTests.Feldtrenner_im_Autor_verschiebt_keine_Felder` (Unit): die Ausgabe des neuen Formats mit `Anna\u001FBeispiel` im Autor, `\u001F` und `\u001E` in Betreff und Rumpf ergibt genau die fünf Felder. Auf dem heutigen Stand rot: Datum = „Beispiel“.
- `CommitsDerAuswahlTests` (Integration gegen Repo F): Szenarien 1 bis 3 der User Story. Heute rot, wie geprobt.
- `GitLeserGrenzeTests` (Integration): der Leser der Commit-Angaben mit Grenze 4 KiB auf eine Message von 5 KiB endet mit „zu groß“. Heute rot, weil die Ausgabe ganz gelesen wird.
- `LeseNeuesteZuerstTests` (Integration gegen Repo L): die Auswahl `a..b c..d` mit 2 900 Commits dazwischen startet, und die gezählten Bytes aller git-Aufrufe bleiben unter 64 KiB. Heute rot, weil `LeseNeuesteZuerst` den Verlauf liest (L1/Kriterium 10).
- `GitLogAusgabeTests.NulAutorkopf` (Unit): `%aI` im Datumsfeld wird leer; die übrigen Felder bleiben an ihrer Stelle (L2/Kriterium 11).
- `GitLeserSpeicherTests` (Prozess): Repo F mit 20 MiB + 6 MiB Message, Abweisung, `VmHWM` unter 128 MiB; kein `MemoryStream`/`ToArray` im Leseweg (L4/Kriterium 13).

### Code-Extraktion für isoliertes Testing

- Format und Zerleger stehen zusammen in `GitLogAusgabe`, damit der Unit-Test die Formatzeichenkette selbst prüft: Feldzahl im Format = Feldzahl im Zerleger.
- Der eine Leseweg zählt die gelesenen Bytes (Zähler für die Probe „Arbeit ≤ Grenze + ein Puffer“, `gemeinsam/gelerntes.md`, „Grenzen, die Arbeit begrenzen“). Die Grenze ist je Aufrufer einstellbar (Testparameter, kein Produktwert), wie in R00017.

### Regressionstests

- Unit: Zerleger mit leerem Rumpf, Rumpf mit Leerzeilen, leerem Autor (NUL im Kopf), mehreren Datensätzen, fehlendem Feld (→ `GitFehler`), Hash, der keine 40 oder 64 Hexziffern hat (→ `GitFehler`), leeren NUL-Teilen (F12: `RemoveEmptyEntries` ist ein Mutant), Datumsform (ISO oder leer; L2), Umkodierung UTF-16LE/UTF-7/ISO-8859-1 mit je genau 5 Feldern (L3).
- Integration: die Tabelle aller Leser aus der Ursachenanalyse, je Zeile ein Test mit kleiner Grenze → „zu groß“ und ein Test unter der Grenze → gelesen (Spanne, Mutanten „zu groß“, „zu klein“, „ignoriert“). Die bestehenden Marker-Proben für jeden git-Aufruf laufen unverändert weiter (`GitStart` bleibt, wie er ist). Dazu ein Start aus einem Unterordner des Repos (Lehre #6), die zwei Lesungen für mehrere Bereiche (L1) und der stderr-Text auf 64 KiB gekappt (L5).
- E2E: keine neue Spec. Die Darstellung der Leiste ändert sich nur bei leerem Datum (B4407, „Datum nicht lesbar“); dafür reicht ein Bausteintest `datumText`, keine neue E2E-Spec. Die Felder werden am Interactor und an `GET /api/commits` geprüft. Die bestehenden Specs der Commit-Leiste (R00003) bleiben grün.

## Akzeptanzkriterien

Vorbereitung: Repo F, Repo E und Repo L sowie die NUL-Autor- und 20+6-MiB-Commits aus der User Story (`user-stories/R00048.md`). ␟ steht für das Byte 0x1F, ␞ für 0x1E. „Die Leiste liefert“ heißt: der Interactor gibt die Commit-Angaben zurück, und `GET /api/commits` liefert dieselben Felder.

### Felder unverfälscht (Abnahme-Probe des planers, wörtlich)

- [ ] 1. Gegeben Repo F, wenn `gitreviewA t` startet, dann liefert die Leiste für `t` Autor `Anna␟Beispiel`, Datum `2026-03-04T09:15:00+01:00`, Betreff `Betreff␟mit Trenner` und Message `Rumpf␟mit Trenner`. Heute rot (geprobt): Autor `Anna`, Datum `Beispiel`, Betreff `2026-03-04T09:15:00+01:00`, Message `Betreff␟mit Trenner␟Rumpf␟mit Trenner`. *Ebene: Integration gegen den Aufruf-Interactor, dazu ein Endpunkttest `GET /api/commits`.*
- [ ] 2. Gegeben Repo F, wenn nacheinander `gitreviewA u t`, `gitreviewA p..u`, `gitreviewA p..t p..u` und `printf '%s\n' <u> <t> | gitreviewA -` starten, dann liefert jede Leiste genau zwei Commits, `u` vor `t`. Für `t` stehen die Felder aus Kriterium 1 da, für `u` Autor `Bernd␞Beispiel`, Datum `2026-03-05T18:30:00+01:00`, Betreff `Zweiter␞` und Message `Zeile eins␟␟` / `Zeile zwei` (zwei Zeilen). *Ebene: Integration.*
- [ ] 3. Gegeben Repo F mit dem Commit `z`, dessen Message ein NUL trägt, wenn `gitreviewA z` startet, dann startet der Lauf, und die Leiste liefert Autor `Dora Beispiel`, Datum `2026-03-05T09:40:00+01:00` und Betreff `Vor dem NUL` (git schneidet am NUL ab, wie `git log` selbst) mit leerer Message. Es gibt keinen Fehler und keine verschobenen Felder. *Ebene: Integration.*

### Grenze beim Start

- [ ] 4. Gegeben Repo F mit `g` (Message 9 MiB) und die Produktgrenze von 8 MiB, wenn `gitreviewA g` startet, dann wird der Lauf abgewiesen: Exit 2, kein Server, stdout leer, und auf stderr steht genau eine Fehlerzeile, die die Grenze nennt („Die Commit-Angaben der Auswahl sind größer als 8 MiB …“) und nicht „nicht auflösbar“ sagt. Dasselbe gilt für `gitreviewA u..g` und für `g` über stdin. `gitreviewA t u` startet weiter. Heute rot (geprobt): Der Lauf startet und liefert 9 437 183 Zeichen Message aus. **L5:** Die eine stderr-Zeile enthält keinen Text aus dem Commit (Autor, Betreff, Message, Pfade) und kein Steuer- oder Formatzeichen; der stderr-Text von git wird gelesen und auf höchstens 64 KiB gekürzt. *Ebene: Integration gegen den Aufruf-Interactor, ein Prozesstest für Exit-Code und stderr. Wortlaut: Offene Frage 1.*
- [ ] 5. Gegeben eine Grenze von 4 KiB (Testparameter) und je ein Commit mit 3 KiB und mit 5 KiB Message, wenn je ein Lauf damit startet, dann startet der Lauf mit 3 KiB mit der ganzen Message, und der Lauf mit 5 KiB wird abgewiesen wie in Kriterium 4. Die Grenze ist also eine Spanne, keine reine Obergrenze. Mit den Mutanten „Grenze ignoriert“, „Grenze × 2“ und „Grenze / 2“ wird je ein Test rot. *Ebene: Integration.*

### Grenze in den Ansichten

- [ ] 6. Gegeben eine Grenze von 4 KiB (Testparameter) und ein Lauf `gitreviewA w p`, in dem Commit `w` aus Repo W 200 Dateien mit je 46 Zeichen Pfad hinzufügt (Ausgabe der Dateiliste etwa 40 KiB, über 4 KiB), wenn der Mensch `w` in der Ansicht „Einzeln“ wählt, dann zeigt die Dateiliste den Fehlerzustand mit dem Grund „zu groß“ und der Grenze, nie eine leere Liste und nie „Keine Dateien geändert“. Die Leiste bleibt bedienbar, die Wahl von `p` zeigt dessen Dateien, und auf stderr steht eine Warnung mit dem Kurz-Hash von `w`. Ein Absturz und eine 500-Antwort ohne Meldung kommen nicht vor. *Ebene: Integration gegen den Dateien-Endpunkt, Wortlaut: Offene Frage 1.*
- [ ] 7. Gegeben dieselbe Grenze und derselbe Lauf, wenn die Ansicht „Zusammen“ (Standard) geladen wird, dann zeigt sie ihren Fehlerzustand mit dem Grund „zu groß“. Das Abhaken einer Datei von `w` wird mit diesem Grund abgelehnt (kein Haken gesetzt), und das Ergebnis beim Beenden nennt die Zitate als nicht lesbar, statt sie still wegzulassen. Für jeden dieser Leser gilt dasselbe, wenn nur er die Grenze überschreitet: Elternfolge, Netto-Dateiliste, Übersicht. *Ebene: Integration gegen Zusammen-, Haken- und Beenden-Interactor.*

### Eine Stelle (Pflichtpunkt 5)

- [ ] 8. Gegeben die Tabelle aller Leser aus der Ursachenanalyse (zehn Zeilen) und die Leser, die schon eine Grenze haben, wenn jeder Leser einzeln mit einer Grenze unter seiner Ausgabe läuft, dann endet jeder mit dem Ausgang „zu groß“. Die am einen Leseort gezählten Bytes sind je Lauf höchstens Grenze + ein Lesepuffer (80 KiB), und danach läuft kein git-Prozess mehr. Wo endet ein Feld der Commit-Angaben, entscheidet eine Stelle für alle drei Wege (Einzelcommits und stdin, ein Bereich, mehrere Bereiche). *Ebene: Integration, Tabellentest; der code-reviewer prüft, dass `GitLeser` keinen Leseweg ohne Grenze mehr hat (kein `ReadToEnd`, kein `CopyTo` auf die Ausgabe von git).*

### Allgemein

- [ ] 9. Der Reproduktionstest ist ohne Fix rot und mit Fix grün, der ursprüngliche Fehler tritt in den Szenarien der User Story nicht mehr auf, und alle Tests aller Ebenen sind grün.

### Weitere Lücken der Angriffsmatrix (L1–L5)

- [ ] 10. **L1 — Mehrere Bereiche: die Grenze zählt nur die Auswahl.** Gegeben ein Repo mit 3 000 Commits (je 3 KiB Message) und die Auswahl `a..b c..d` aus je 10 weit auseinanderliegenden Commits (2 900 Commits dazwischen), wenn der Lauf startet, dann startet er mit den 20 Commits der Auswahl, und die gezählten Bytes aller git-Aufrufe bleiben unter der Grenze (Testparameter 64 KiB); die Ausgabe ist nicht „größer als 8 MiB“. Die Reihenfolge wird nur mit `%H` gelesen, die Angaben der Auswahl in einer zweiten, begrenzten Lesung über den einen Leseweg. *Ebene: Integration gegen den Aufruf-Interactor; Prozessprobe für die Bytes.*
- [ ] 11. **L2 — NUL im Autorkopf.** Gegeben ein Commit, dessen Autorkopf ein NUL trägt, wenn der Lauf startet, dann startet er, es gibt genau diesen einen Commit, und das Datum ist ein ISO-8601-Datum mit Zeitzone oder leer (nie `%aI`); Autor, Betreff und Message stehen unverschoben. Bei leerem Datum zeigt die Leiste „Datum nicht lesbar“. Die Form des Datums prüft der Zerleger an der einen Stelle, an der er die Felder trennt. *Vorläufig, bis der product-owner die Frage L2 entschieden hat; Empfehlung des security-reviewers. Ebene: Integration, Unit für die Datumsform.*
- [ ] 12. **L3 — Umkodierung.** Commits mit `encoding UTF-16LE`, UTF-7 (`+AAA-`) und `ISO-8859-1` ergeben je genau 5 Felder; Autor, Datum, Betreff und Message stehen unverschoben. *Ebene: Unit auf dem Zerleger, Integration gegen den Interactor.*
- [ ] 13. **L4 — Speicherspitze bei Abweisung.** Gegeben Repo F mit `g` und den zwei Messages 20 MiB + 6 MiB, wenn der Start abgewiesen wird, dann bleibt die Speicherspitze (`VmHWM`) des Prozesses unter 128 MiB. Das ist eine grobe Schranke, kein hartes Performance-Ziel (Betreiber 2026-11-26, R00047); im Leseweg wird nicht über `MemoryStream`/`ToArray` kopiert. *Ebene: Prozessprobe; die 128 MiB sind eine Obergrenze, keine enge Marge.*

Grenz-, Leer- und Fehlfälle bedacht: leere Message (Kriterium 3), NUL in Message und Autorkopf (Kriterium 3, Kriterium 11), Grenze knapp unter und über (Kriterium 5), Überschreitung je Leser (Kriterium 8), Commit-Angaben zu groß bei jeder Auswahlart (Kriterium 4), zwei weit auseinanderliegende Bereiche (Kriterium 10), Umkodierung (Kriterium 12), Speicherspitze (Kriterium 13), stderr-Text (Kriterium 4). Verworfen: eine eigene Grenze je Message am Server (Offene Frage 2). Die Zahl der Commits begrenzt weiter `Auswahlgrenze` (1 000), unverändert.

**Pflichtpunkte der Detailplanung** (`AI-Team/planer.md`):
1. *Grenzen je Ein- und Ausgabe, auch je Einheit*: Die Gesamtgrenze je Lesung (8 MiB) decken die Kriterien 4, 5 und 8 ab; dazu die stderr-Grenze von 64 KiB (Kriterium 4, L5) und die Speicherspitze von 128 MiB (Kriterium 13, L4). Je Message gibt es am Server keine eigene Grenze (Offene Frage 2), denn die Anzeige begrenzt auf 20 000 Zeichen (PO #47). Die Zahl der Commits bleibt bei 1 000. stdout ist nicht betroffen, denn keine Commit-Angabe geht in das Ergebnis.
2. *Anzeigeverfahren, Standard zuerst*: „Zusammen“ (Kriterium 7: Elternfolge, Netto-Liste, Übersicht) und „Einzeln“ (Kriterium 6, Dateiliste je Commit). Diff, ganze Datei, Suche, Lücken und große Diffs sind nicht betroffen, denn sie lesen schon mit Grenze (R00017).
3. *Festes Layout*: nicht betroffen. Es gibt keine neue Anzeige, und die Fehlerzustände sind die bestehenden.
4. *NFA am Ausführungsort*: Der Start ist ein Prozess (Exit-Code, stderr, Kriterium 4); die Speicherspitze (Kriterium 13) ist eine Prozessgröße, keine Browser-Größe. Die Ansichten zeigen ihren Fehlerzustand im Browser, und die stderr-Zeile ist dort nur Serverprotokoll (Kriterien 6 und 7).
5. *Eine Unterscheidung, ein Ort*: Das Feldende und die Datumsform entscheidet `GitLogAusgabe` für alle drei Wege (Kriterien 11, 12). Die Auswahl-Reihenfolge entscheidet der eine Leseweg (Kriterium 10). „Zu groß“ entscheidet derselbe Leseweg für alle Leser (Kriterium 8).

## Implementierungshinweise

### Ablauf

1. **Format und Zerleger** (`GitLogAusgabe`): Format `%H%x00%an%x00%aI%x00%s%x00%b` mit `-z` (geprobt: Felder und Datensätze enden je mit NUL, also genau 5 NUL je Commit). Die Formatkonstante wandert von `GitLeser.GitLogMitFormat` zum Zerleger. Zerlegt wird als Folge von NUL-Teilen, je fünf ein Commit; leere Teile werden **nicht** verworfen (`RemoveEmptyEntries` ist ein Mutant, F12). Der Hash wird gegen 40 oder 64 Hexziffern geprüft, sonst `GitFehler`. Die Datumsform prüft derselbe Zerleger: ISO-8601 mit Zeitzone oder leer; jeder andere Text (etwa `%aI` bei NUL im Autorkopf) wird leer, nie angezeigt (L2/Kriterium 11).
2. **Ein Leseweg** (`GitLeser`): `WarteAufEnde`, `Ausfuehren(start, aufruf)` ohne Grenze und `AusfuehrenAlsBytes` entfallen oder lesen über den begrenzten Weg. Für die Bytes-Leser (Dateiliste, Übersicht, Netto) heißt das „ganz oder gar nicht“, anders als beim Blob-Leser, der den Anfang liefert. Die Grenze kommt vom Aufrufer (Standard `Ausgabegrenze.Standard`), Tests setzen sie klein. Im Leseweg wird nicht über `MemoryStream`/`ToArray` kopiert (L4/Kriterium 13); der stderr-Text von git wird gelesen und auf 64 KiB gekappt (L5/Kriterium 4).
3. **Ausgang „zu groß“ an jedem Aufrufer**: `CommitsDerAuswahl` (vor dem Fangen von `GitFehler`: eigener Aufruffehler mit Exit 2), `DateienEndpunkt`, `ZusammenLesenInteractor.Lesen`, `DateiAbhakenInteractor`, `Stellensperre`, `Bereichszeilen`, `Program` (Fang für die Serverlaufzeit). Ob `GitZuGross` von `GitFehler` erbt, damit kein Aufrufer ihn ungefangen durchlässt, entscheidet der Entwickler. Dann muss jeder Aufrufer, der „zu groß“ eigens meldet, ihn vor `GitFehler` fangen. `GitZuGross` wird wie `GitFehler` gefangen: kein Exit 134, keine 500 ohne Text (M3).
4. **Meldung auf stderr**: Grenze und Kontext (Kurz-Hash, Ansicht), kein fremder Text im Wortlaut, nur Länge oder Kennung (`gemeinsam/gelerntes.md`); kein Steuer- oder Formatzeichen aus dem Commit.
5. **Mehrere Bereiche in zwei Lesungen** (L1/Kriterium 10): `LeseNeuesteZuerst` liest zuerst nur die Reihenfolge mit `%H` (Ordnung wie heute), dann die Angaben **nur der Auswahl** über `--no-walk`; beide Lesungen über den einen begrenzten Leseweg. Die Grenze zählt damit die Auswahl, nicht den Verlauf zwischen den Bereichen.

### Grobentwurf

- `GitLogAusgabe` (Operation, rein): `const string Format`, `Commitzeilen Zerlegen(string ausgabe)`; prüft die Datumsform (ISO-8601 mit Zeitzone oder leer) und verwirft keine leeren NUL-Teile.
- `GitLeser` (Ressourcenzugriff): ein privater Leseweg mit Grenze für Text und Bytes, ohne Kopie über `MemoryStream`/`ToArray`; stderr auf 64 KiB gekappt. `LeseNeuesteZuerst` liest die Reihenfolge nur mit `%H` und die Angaben der Auswahl über `--no-walk`. Öffentliche Leser bekommen die `Ausgabegrenze` (Parameter oder Feld), die Signaturen der Aufrufer bleiben sonst gleich.
- `GitZuGross` (Ausnahme): unverändert, Grenze und Aufruf.
- Aufruffehler „Commit-Angaben zu groß“ (`Aufruf/`): Meldung mit der Grenze in MiB, Exit 2 wie jeder ungültige Aufruf.

## Offene Fragen

1. An den product-owner: **Was sieht der Nutzer bei Überschreitung?** Empfehlung: Beim Start wird der Lauf abgewiesen (Exit 2, eine Zeile „Die Commit-Angaben der Auswahl sind größer als 8 MiB (Autor, Betreff, Message); bitte die Auswahl teilen.“), wie bei der Auswahlgrenze („abweisen statt kürzen“) und der Ausgabegrenze in R00017 („ganz oder gar nicht“). In den Ansichten erscheint der bestehende Fehlerzustand mit dem Grund „zu groß (über 8 MiB)“. Alternativen: (b) starten und jede Message ab einer Länge mit „… (gekürzt)“ zeigen, was einen zweiten Leseweg je Commit braucht; (c) starten ohne Messages und mit dem Hinweis „Messages zu groß“, was einen zweiten git-Aufruf ohne `%b` braucht. Bis zur Antwort gilt die Empfehlung.
2. An den product-owner: **Grenze je Message am Server?** Empfehlung: keine eigene. Der Server begrenzt jede Lesung als Ganzes auf 8 MiB, und die Anzeige begrenzt jede Message auf 20 000 Zeichen (PO-Entscheidung 2026-11-26, #47, für den Streifen „Absicht der KI“). Keine Commit-Angabe geht auf stdout (geprüft: nur `Server/CommitAntwort.cs`), also ist der Vertrag mit der KI nicht betroffen. Folgefrage zur Entscheidung: Soll dieselbe 20 000-Zeichen-Grenze auch für die ausgeklappte Message der Commit-Leiste gelten (R00003)? Das wäre eine eigene Karte. Bis zur Antwort gilt: keine Grenze je Message am Server.
3. An den product-owner: **L2 — Was zeigt die Leiste, wenn das Datum nicht lesbar ist?** Empfehlung: Lauf starten, Datum leer lassen, die Leiste zeigt „Datum nicht lesbar“. Gründe: git liefert den festen Text `%aI`, kein freier Text des Autors; ein Abweisen des ganzen Laufs wegen eines Commits wäre die Lösung, die ein fremdes Repo zur Sperre machen könnte (Verfügbarkeit). Der Zerleger prüft die Form an der **einen** Stelle, an der er auch die Felder trennt. **Vorläufig**, bis der product-owner entschieden hat; die Angriffsmatrix (L2) und Kriterium 11 tragen die Empfehlung.

## Warum löst diese Anforderung das Problem?

Auslöser: Ein fremdes Repo setzt ein 0x1F in den Autornamen, und der Mensch liest in der Leiste ein Datum und einen Betreff, die nicht im Commit stehen. Oder es legt eine Message von Megabytes an, die den Server und später den Browser belegt. Wenn der Zerleger nur noch an NUL trennt, an einem Zeichen, das git in keinem Feld ausgibt, dann bleibt jedes Feld an seiner Stelle, gleich welche Bytes der Autor wählt. Und wenn jeder git-Aufruf über denselben begrenzten Leseweg liest, dann endet jede übergroße Ausgabe als sichtbarer Ausgang „zu groß“, bevor sie Speicher belegt. Der Hebel liegt an diesen zwei Stellen und nicht an jeder Aufrufstelle: Die Lehre aus #10 zeigt, dass eine Grenze an der Aufrufstelle beim nächsten neuen Leser wieder fehlt. Die Lücken L1–L5 der Angriffsmatrix schärfen denselben Hebel: die Grenze zählt nur die Auswahl (L1), ein unlesbares Datum bleibt lokal sichtbar (L2), die Umkodierung bleibt ein Feldtrenner-Fall (L3), die Speicherspitze ist eine Prozessgröße (L4), und die Meldung trägt keinen fremden Text (L5).

## Notizen

- Priorität: Hoch (Sicherheit: Darstellung verfälschbar durch das fremde Repo; Speicher unbegrenzt).
- Betroffene Nutzer/Systeme: der prüfende Mensch (Leiste, Dateiliste, Zusammen) und die aufrufende KI (Start abgewiesen statt hängend).
- Workaround: keiner in gitreviewA; `git log` von Hand.
- Beantwortet die Offene Frage 2 aus R00038 (Karte #47): Die Menge, die der Server beim Start liest, wird mit dieser Anforderung begrenzt.
- Lücken L1–L5 aus `Dokumentation/Sicherheit/angriffsmatrix-commit-leser.md` (2026-11-26) sind als Kriterien 10–13 und als Ergänzung zu Kriterium 4 eingearbeitet; L2 ist vorläufig, bis der product-owner entschieden hat.
- Nicht Teil dieser Anforderung: die eigene Zeichenliste `ohneSteuerzeichen` in `web/commit-werte.js` (entfernt Richtungszeichen, statt sie mit `UnsichtbareZeichen` zu markieren; schon in R00038 benannt), die Frist für git-Aufrufe (R00017, Frage 3, eigene Karte).
