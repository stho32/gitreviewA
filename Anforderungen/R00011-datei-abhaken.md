---
id: R00011
status: Neu
datum: 2026-11-24
---

# R00011: Datei abhaken

## Beschreibung

Der prüfende Mensch hakt in der Dateiliste (R00003) jede Datei eines Commits ab, wenn er sie geprüft hat, und nimmt den Haken wieder weg, wenn er sich geirrt hat. Ein Haken gilt je **Stelle** = Commit und Datei: dieselbe Datei in zwei Commits sind zwei Stellen mit je eigenem Haken. Über der Dateiliste steht „n von m abgehakt“ für **alle** Stellen der Auswahl des Laufs (nicht nur des gewählten Commits). Die Haken bleiben beim Wechsel von Datei und Commit und nach dem Neuladen der Seite bis zum Ende des Laufs erhalten und leben nur im Arbeitsspeicher. Beim „Beenden“ nennt das Ergebnis (R00002) ab dem ersten Haken einen Abschnitt `## Dateien` mit den abgehakten und den ungeprüften Stellen — damit die aufrufende KI erfährt, was der Mensch **nicht** angesehen hat.

Zahlt ein auf: [Vision](R00000-vision.md) — „Checkliste im Kopf entlasten“ (Dateien abhaken, Fortschritt sehen), „Ergebnis als Rückkanal“ und die Leitplanken „Nichts wird gespeichert“, „stdout gehört allein dem Ergebnis“ und Lastprofil (2 000 geänderte Dateien).

Baut auf auf: [R00003](R00003-commits-und-dateien-sehen.md) (Dateiliste, Dateiwahl, Ereignisse), [R00004](R00004-diff-einer-datei-lesen.md) (Zeichenmenge der Marken für Unsichtbares), [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat, Einmal-Schalter, Anfrageschutz, reservierter Abschnitt `## Dateien`) und [R00001](R00001-mit-commit-hashes-aufrufen.md) (Gerüst, Host-Prüfung).

**Entscheidungen des product-owners (`AI-Team/po-entscheidungen.md`, 2026-11-24), die hier binden:** Der Abschnitt „Dateien“ (abgehakt/ungeprüft) gehört ab I0016 ins Ergebnis, wie in R00002 reserviert (Zeile zu #19); die geprüften Commits werden nicht vorab genannt, jede Zeile trägt den vollen Hash. Merge-Commits werden gegen den ersten Elternteil gelesen (Zeile zu #5) — die Übersicht aller Dateien nimmt dieselbe Basis wie die Dateiliste.

**Zuschnitt (Entscheidung des planers, Begründung unter „Notizen“):** Die WBS-Karte I0016 trug vier Zusagen („Haken je Datei“, „Fortschritt“, „Abgehakte zuklappen“, „nächste ungeprüfte“). Hier geliefert werden Haken, Fortschritt und der Abschnitt im Ergebnis. „Nächste ungeprüfte Datei“ (I0025) und „Abgehakte zuklappen“ (I0026) sind eigene Interactions auf diesem Stand und nicht Teil dieser Anforderung.

**Übernahme aus kanbanD** (Betreiber 2026-11-24; Herkunft im Commit nennen, keine eigene Gestaltung erfinden): Vorbild ist „Gesehen“ aus R00246 von kanbanD — Zeile „<k> von <n> gesehen“ mit Balken, Kästchen mit Namen „Gesehen: <voller Pfad>“, Ansage über eine Live-Region (`web/diff.js` `gesehenZeileHtml`, `gesehenAnsage`; `web/kd-app.css` `rv-ges*`, `ru-ges`). **Nicht übernommen:** der Browser-Speicher (`localStorage`, Schlüssel, Obergrenze 200 Karten, Fingerabdruck der Datei) — hier gilt „nichts wird gespeichert“, und das Ergebnis braucht die Haken auf der Seite des Programms; ebenso das Einklappen des Diffs durch den Haken (hier zeigt der Diff-Bereich immer genau eine Datei).

## Geschäftlicher Nutzen

Bei 20 oder 200 Dateien weiß der Mensch nach der Hälfte nicht mehr, welche er schon gesehen hat; die Liste im Kopf kostet Aufmerksamkeit und führt zum Wiederlesen oder zum Übersehen. Mit Haken und „n von m“ sieht er in einem Blick, wie weit er ist. Wichtiger für den Zweck des Werkzeugs: die KI liest „Keine Anmerkungen.“ sonst als Freigabe, obwohl der Mensch nur drei von vierzig Dateien angesehen hat; der Abschnitt „Ungeprüft“ im Ergebnis sagt es ihr.

## Funktionale Anforderungen

- Jede Datei der Dateiliste des gewählten Commits trägt einen Haken-Zustand (abgehakt oder nicht); der Mensch setzt und nimmt ihn mit einem Klick bzw. per Tastatur (Tab, Leertaste). Der Haken setzt nur den Haken: er wählt keine Datei, ändert keinen Diff und keinen Commit.
- Eine Stelle ist (voller Commit-Hash, Pfad wie in der Dateiliste); bei einer Umbenennung (`R`) gilt der neue Pfad. Jede Datei der Dateiliste ist abhakbar — auch gelöschte (`D`), umbenannte (`R`) und binäre Dateien. Ein Commit ohne Dateien trägt nichts bei.
- Über der Dateiliste steht „n von m abgehakt“ (ganze Zahlen ohne Tausendertrenner, wie die Summe in R00003): m ist die Zahl aller Stellen der Auswahl des Laufs, n die der abgehakten; dazu ein Balken der Breite n / m. Ist m = 0, steht „Keine Dateien zum Abhaken“. Eine Änderung von n wird per Live-Region angesagt (höflich).
- Die Zahl m kommt aus einer **Übersicht aller Dateien der Auswahl**, die mit **einem** `git`-Aufruf für alle Commits gelesen und im Arbeitsspeicher gehalten wird (Commits sind unveränderlich), nicht aus den Dateilisten je gewähltem Commit. Die Übersicht hat dieselbe Basis wie die Dateiliste (Merge-Commits gegen den ersten Elternteil, Umbenennungen erkannt), ihre Reihenfolge ist die der Auswahl (wie die Commit-Leiste) und je Commit die Reihenfolge von `git` (wie die flache Dateiliste).
- Haken und Übersicht leben im Arbeitsspeicher des Programms (Server), nicht im Browser: Wechsel von Datei, Commit und Darstellung ändern sie nicht, ein neu geladener oder zweiter Tab desselben Laufs zeigt denselben Stand. Nichts wird auf Platte oder in den Browser-Speicher geschrieben.
- Das Abhaken nennt den **Zielzustand** („abgehakt: ja/nein“), kein Umschalten: eine doppelt gesendete Anforderung ändert nichts.
- Eine Stelle, die nicht zur Auswahl gehört (anderer oder abgekürzter Commit, Datei, die im Commit nicht vorkommt), wird abgelehnt (400), nichts wird gespeichert. Nach „Beenden“ werden Haken abgelehnt (409), damit kein Haken still aus dem Ergebnis fällt.
- Das Setzen eines Hakens ist wie das Anlegen einer Anmerkung gegen fremde Webseiten und DNS-Rebinding geschützt (R00002 „Schutz“); das Lesen des Standes nur hinter der Host-Prüfung, ohne CORS-Freigabe.
- **Ergebnis (Erweiterung des Formats aus R00002):** Ab dem ersten gesetzten Haken steht hinter den Anmerkungen (oder, ohne Anmerkungen, hinter „Keine Anmerkungen.“) ein Abschnitt `## Dateien` (Format unten). Ohne Haken — auch wenn ein gesetzter Haken wieder entnommen wurde — fehlt der Abschnitt, und das Ergebnis bleibt Byte für Byte wie in R00002.

### Ergebnisformat — Abschnitt `## Dateien` (festgelegt)

```
## Dateien

Abgehakt: 2 von 8

- README.md (Commit <hash p>)
- src/b.txt (Commit <hash q>)

Ungeprüft: 6 von 8

- alt.txt (Commit <hash p>)
- src/a.txt (Commit <hash p>)
- src/b.txt (Commit <hash p>)
- LIESMICH.md (Commit <hash q>)
- alt.txt (Commit <hash q>)
- logo.bin (Commit <hash q>)
```

(Beispiel für `gitreviewA p q r` mit den Dateien aus R00003; `<hash …>` steht für den vollen Hash, 40 Hexziffern.) Regeln:

- Die Überschrift `## Dateien` ist **nicht nummeriert**; Anmerkungen heißen weiter `## 1.` ff. Abschnitte und Absätze sind durch genau eine Leerzeile getrennt, die Datei endet mit genau einem Zeilenumbruch (Regeln aus R00002).
- Zuerst „Abgehakt: n von m“, dann „Ungeprüft: k von m“ (k = m − n). Je Stelle eine Zeile `- <Pfad> (Commit <voller Hash>)`. Ist eine Liste leer (alles abgehakt: „Ungeprüft: 0 von 8“), steht nur die Kopfzeile, ohne Aufzählung und ohne zusätzliche Leerzeile danach.
- Reihenfolge in beiden Listen: Commits in der Reihenfolge der Auswahl, je Commit die Dateien in der Reihenfolge von `git` (wie die flache Dateiliste). Dieselbe Datei in zwei Commits steht zweimal, mit ihrem jeweiligen Hash.
- Der Pfad steht wie von `git` geliefert (relativ, mit `/`; bei `R` der neue Pfad). **Steuer-, Format- und Richtungszeichen im Pfad** (dieselbe Zeichenmenge wie die Marken im Diff, R00004, dazu Tab) erscheinen als Marke `⟨U+202E⟩` (Code in mindestens vier Hexziffern, Großbuchstaben) statt des Zeichens; so entsteht aus einem fremden Dateinamen weder ein Zeilenumbruch im Ergebnis noch eine Escape-Folge im Terminal der KI. Dieselbe Regel gilt für Pfade in Zeilen auf stderr.
- Nicht enthalten: ein Gesamturteil. „Ungeprüft“ sagt, was der Mensch nicht abgehakt hat — nicht, dass er es nicht gesehen hat.

## Nicht-funktionale Anforderungen

- Performance (Lastprofil der Vision): Die Übersicht für 2 000 Dateien in einem Commit steht und „0 von 2000 abgehakt“ erscheint spätestens 2 s nach dem Prozessstart; sie wird **nach** der Commit-Leiste und ohne sie aufzuhalten gelesen. Nach einem Klick auf das Kästchen steht der neue Zähler spätestens 1 s später (Obergrenze des Dateiwechsels; der typische Wert ≤ 200 ms ist hier kein Kriterium). „Beenden“ bis Ende des Prozesses ≤ 1 s auch mit 2 000 Stellen und 1 000 Haken (R00002). Die Dateiliste mit 2 000 Zeilen steht weiter ≤ 1 s nach dem Klick auf den Commit (R00003), jetzt mit Kästchen. Messwerte noch nicht vorhanden: der Entwickler misst und hält mindestens 30 % Abstand zur Grenze ein (Messwert ≤ 1,4 s bzw. ≤ 0,7 s); liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium.
- Sicherheit: Pfade und Commit-Angaben kommen vom Browser und aus einem fremden Repository. Eine Stelle wird nur angenommen, wenn sie in der Übersicht steht; `git` wird dafür nicht gestartet. Der Aufruf, der die Übersicht liest, nimmt die Schutzmaßnahmen der übrigen `git`-Aufrufe (fremde Konfiguration, ersetzte Objekte, Submodule). Pfade erscheinen im Browser nur als Text (`textContent`, nie HTML), im Ergebnis und auf stderr nur mit Marken.
- Logging: stdout bleibt bis „Beenden“ leer; je Anforderung eine Debug-Zeile auf stderr mit Commit (kurz), Pfad (mit Marken) und Zielzustand; ein Fehler beim Lesen der Übersicht als Error mit Kontext (Hash des Commits, falls erkennbar).
- Benutzerfreundlichkeit: Gestaltung aus kanbanD (siehe oben), keine eigenen Gestaltungsvorgaben. Das Kästchen ist per Tab erreichbar und mit der Leertaste bedienbar, sein Name beginnt mit dem sichtbaren Text („Abgehakt: <Pfad>“), seine Fläche ist so groß wie die übrigen Bedienelemente der Dateiliste.

## Akzeptanzkriterien

Vorbereitung: das Wegwerf-Repo aus [R00003](R00003-commits-und-dateien-sehen.md) mit den Commits `p` (vier Dateien hinzugefügt: `README.md`, `alt.txt`, `src/a.txt`, `src/b.txt`), `q` (`LIESMICH.md` umbenannt aus `README.md`, `alt.txt` gelöscht, `logo.bin` binär hinzugefügt, `src/b.txt` geändert) und `r` (leer); Aufruf `gitreviewA p q r --kein-browser`, Seite über die Startzeile. Das sind 8 Stellen: `p`: 4, `q`: 4, `r`: 0. „Abhaken“ = Kästchen der Datei in der Dateiliste des gewählten Commits betätigen. Die Angaben „Ebene“ nennen, wo das Kriterium geprüft wird (Begründung unter „Tests“); Abhaken liegt nicht auf dem Hot Path.

### Abhaken und Fortschritt
- [ ] Gegeben `gitreviewA p q r`, wenn die Seite geladen ist, dann steht über der Dateiliste „0 von 8 abgehakt“ mit leerem Balken, und keine Datei von `p` oder `q` ist abgehakt; bei `gitreviewA r` (nur der leere Commit) steht dort stattdessen „Keine Dateien zum Abhaken“. *Ebene: Integration gegen den Interactor (Stand: 0 von 8, 0 von 0) und Unit (Text und Balkenanteil des Fortschritts).*
- [ ] Gegeben `p` und `q` mit je einer Datei `src/b.txt`, wenn man in `q` `src/b.txt` abhakt, dann steht „1 von 8 abgehakt“, `src/b.txt` in `q` ist abgehakt, `src/b.txt` in `p` nicht (zwei Stellen); der gewählte Commit und die gewählte Datei sowie der gezeigte Diff bleiben unverändert; nimmt man den Haken wieder weg, steht „0 von 8 abgehakt“. *Ebene: Integration gegen den Interactor (Stellen je Commit und Datei; Zielzustand nicht Umschalten) und Unit (Zähler).*
- [ ] Gegeben `p q r`, wenn man nacheinander jede der acht Dateien einzeln abhakt — `README.md`, `alt.txt`, `src/a.txt`, `src/b.txt` in `p`, danach `LIESMICH.md` (umbenannt), `alt.txt` (gelöscht), `logo.bin` (binär) und `src/b.txt` in `q` —, dann steht nach jedem Haken der Zähler um eins höher bis „8 von 8 abgehakt“ (der leere Commit `r` trägt nichts bei), und nach „Beenden“ steht im Ergebnis „Abgehakt: 8 von 8“ und „Ungeprüft: 0 von 8“ ohne Aufzählung darunter. *Ebene: Integration gegen den Interactor (Abtastung der ganzen Menge, kein Beispiel).*
- [ ] Gegeben `README.md` in `p` abgehakt, wenn man zu `q`, dort zu `src/b.txt`, dann zurück zu `p` wechselt und die Seite neu lädt, dann steht nach jedem Schritt „1 von 8 abgehakt“, und `README.md` in `p` ist weiter abgehakt. *Ebene: Integration gegen den Interactor (Stand bleibt über Lesen) und E2E im Tastatur-Kriterium unten (Wechsel und Neuladen, Browser-Eigenes).*

### Ergebnis
- [ ] Gegeben `p q r` mit `README.md` in `p` und `src/b.txt` in `q` abgehakt und ohne Anmerkung, wenn beendet wird, dann entspricht stdout Byte für Byte `# Ergebnis manueller Review`, Leerzeile, `Keine Anmerkungen.`, Leerzeile und dem Abschnitt aus dem Beispiel oben (mit den vollen Hashes von `p` und `q`), und der Prozess endet mit Exit-Code 0; das Ergebnis enthält genau eine Überschrift `## Dateien` (die Anmerkungen heißen `## 1.` ff.; Anmerkungstext steht nach R00002 immer als Zitat, auch eine Zeile `## Dateien` darin). Rechnung: 8 Stellen − 2 abgehakt = 6 ungeprüft; `src/b.txt` in `p` bleibt ungeprüft, weil nur die Stelle in `q` abgehakt ist. *Ebene: Unit (Formatierer mit dem Beispiel) und Integration (Programm: Haken per Schnittstelle, Beenden, stdout).*
- [ ] Gegeben `p q r` ohne Haken — und ebenso mit einem gesetzten und wieder entnommenen Haken —, wenn beendet wird, dann entspricht stdout genau dem Ergebnis ohne Abschnitt „Dateien“ aus R00002 (`# Ergebnis manueller Review`, Leerzeile, `Keine Anmerkungen.`). *Ebene: Unit (Formatierer) und Integration.*
- [ ] Gegeben ein Commit `y` mit der Datei `ab⟨Zeilenumbruch⟩cd⟨U+202E⟩.txt` (der Name enthält ein LF und U+202E; herstellbar mit `printf 'x\n' > "$(printf 'ab\ncd\xe2\x80\xae.txt')"` und einem Commit), abgehakt oder nicht, wenn beendet wird (und der Lauf mit `--verbose` gestartet wurde), dann steht der Name im Ergebnis als `ab⟨U+000A⟩cd⟨U+202E⟩.txt` in einer einzigen Zeile, stdout und stderr enthalten außer den Zeilenenden kein Steuer- und kein Richtungszeichen, und die Debug-Zeile zum Haken nennt denselben Namen mit Marken. *Ebene: Unit (Marken) und Integration (Programm als Prozess: stdout und stderr getrennt aufgefangen).*

### Abgelehnte Stellen und Schutz
- [ ] Gegeben `gitreviewA p q r`, wenn ein Haken gesetzt werden soll mit einem Commit außerhalb der Auswahl (im Repo vorhanden), mit den ersten 7 Zeichen des Hashes von `p`, mit `alt.txt` in `r` (kommt dort nicht vor), mit `src/c.txt` in `p`, mit leerer Datei oder einer Datei mit Zeilenumbruch, dann antwortet gitreviewA jedes Mal mit 400 und einer Meldung, kein `git`-Prozess wird dafür gestartet, und der Zähler bleibt „0 von 8“; mit dem vollen Hash von `p` und `alt.txt` antwortet sie mit 200 („1 von 8“). Ist der Review beendet, wird jeder Haken mit 409 abgelehnt und erscheint nicht im Ergebnis. *Ebene: Integration gegen den Interactor (Ablehnungsgründe) und Endpunkt auf freiem Port (Statuscodes).*
- [ ] Gegeben ein laufender Review, wenn ein Haken mit fremdem Origin oder fremdem Host (nur `127.0.0.1:<port>` gilt als eigen, `localhost:<port>` ist fremd, R00002) oder ohne Inhaltstyp `application/json` oder per GET gesetzt werden soll, dann wird abgelehnt (403, 415, 405), der Lauf geht weiter, nichts wird gespeichert, und stdout bleibt leer; der Stand lesen (`GET /api/haken`) antwortet mit `Host: 127.0.0.1:<port>` mit 200 und ohne `Access-Control-Allow-Origin`, mit fremdem Host mit 403 und ohne Stellen im Körper. *Ebene: Integration (Endpunkt auf freiem Port; die Tabelle des Anfrageschutzes ist aus R00002 geprüft, hier nur der Anschluss).*

### Oberfläche
- [ ] Gegeben `gitreviewA p q r`, nur Tastatur, wenn man mit Tab zum Kästchen von `README.md` in `p` geht und die Leertaste drückt, dann ist die Datei abgehakt, es steht „1 von 8 abgehakt“, der Name des Kästchens lautet „Abgehakt: README.md“ (beginnt mit dem sichtbaren Text), der Fokus bleibt auf dem Kästchen, die Datei ist dadurch nicht gewählt, und nach dem Wechsel `p` → `q` → `p` und nach dem Neuladen steht der Haken weiter. *Ebene: E2E (Tastatur, Fokus, Wechsel und Neuladen — Browser-Eigenes).*
- [ ] Gegeben `gitreviewA x` (Repo X aus R00010: ein Commit mit der Datei `<b>x</b>.txt`), wenn man diese Datei abhakt, dann steht „1 von 1 abgehakt“, der Name des Kästchens lautet „Abgehakt: <b>x</b>.txt“ als sichtbarer Text mit spitzen Klammern (kein `b`-Element, nicht fett), und es erscheint kein Dialog. *Ebene: E2E (DOM-Sicherheit, Browser-Eigenes).*
- [ ] Gegeben die Antwort auf das Setzen des Hakens kommt mit 500 (oder gar nicht), wenn man `README.md` in `p` abhakt, dann springt das Kästchen auf „nicht abgehakt“ zurück, der Zähler bleibt „0 von 8“, und neben dem Zähler steht „Haken konnte nicht gespeichert werden“; kommt die Antwort um 1,5 s verzögert und betätigt man das Kästchen währenddessen zweimal kurz hintereinander und wechselt zu `q`, dann ist am Ende genau ein Zustand gespeichert („1 von 8“ bzw. der zuletzt gewünschte), und beim Zurückwechseln zu `p` zeigt das Kästchen ihn. *Ebene: E2E (Fehlerpfad durch die Oberfläche, Antworten per `route`, verzögerter Fake — Browser-Eigenes).*
- [ ] Gegeben die Übersicht lässt sich nicht lesen (der Stand antwortet mit 500), wenn die Seite geladen ist, dann steht statt des Zählers „Fortschritt konnte nicht gelesen werden“, die Kästchen sind nicht bedienbar, Commit-Leiste, Dateiliste und Diff bleiben bedienbar, nach dem Neuladen der Seite wird der Stand erneut gelesen, und auf stderr steht eine Fehlerzeile mit Kontext; „Beenden“ liefert das Ergebnis ohne Abschnitt „Dateien“. *Ebene: Integration (Interactor mit Fake, der wirft; Status 500) und E2E (Darstellung per `route`).*

### Eingabe an git und Lastprofil
- [ ] Gegeben `gitreviewA p q r --verbose` in einem Repository, dessen Konfiguration `diff.external`, `diff.<treiber>.textconv`, `log.showSignature` und `gpg.program` auf ein Marker-Skript zeigt, mit `core.quotepath=true` und einer Datei `ä ö.txt`, und der Lauf wird aus einem Unterordner des Repos gestartet, wenn die Seite geladen ist und der Stand gelesen wurde, dann lief das Marker-Skript nie, die Übersicht kam mit genau einem `git`-Aufruf für alle drei Commits, `ä ö.txt` steht mit Umlauten im Stand, und die Stellen der Übersicht stimmen für jeden Commit mit der Dateiliste aus R00003 überein (gleiche Pfade, gleiche Reihenfolge). *Ebene: Integration (Wegwerf-Repo mit Marker-Skript, Zählung der `git`-Aufrufe, Orakel gegen die Dateiliste).*
- [ ] Gegeben ein Commit mit 2 000 hinzugefügten Dateien (je 1 Zeile) und 1 000 davon über die Schnittstelle abgehakt, wenn man beendet, dann endet der Prozess mit Exit-Code 0 höchstens 1 s nach der Anforderung und stdout nennt „Abgehakt: 1000 von 2000“ und „Ungeprüft: 1000 von 2000“ mit je 1 000 Zeilen; wenn man (frischer Lauf) den Commit wählt, dann stehen spätestens 2 s nach dem Prozessstart „0 von 2000 abgehakt“ und spätestens 1 s nach dem Klick 2 000 Zeilen mit Kästchen in der Dateiliste, und ein Klick auf ein Kästchen ergibt spätestens 1 s später „1 von 2000 abgehakt“ (je ereignisgenau gemessen, Messwerte ≤ 1,4 s, ≤ 0,7 s, ≤ 0,7 s). *Ebene: Integration (Beenden mit 2 000 Stellen, Zeit am Interactor und am Prozess) und E2E (Zeiten im Browser, nur dort messbar).*

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (Themenordner in `src/GitReviewA/`, Oberfläche unter `web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Haken/` (neu) — Übersicht, Speicher, Interactor, Endpunkt.
- `Git/` — Lesen der Übersicht; der Parser der Dateiliste (R00003) wird mitgenutzt.
- `Beenden/` — `ErgebnisFormatierer` erhält den Abschnitt; der Ablauf siegelt beide Speicher.
- `web/` — Fortschrittszeile und Kästchen in der Dateiliste (`dateiliste.js`, neue Module `haken.js`, `haken-werte.js`); keine Änderung an `diff.js`.
- `tests/GitReviewA.Tests/Akzeptanz/` — Treiber und Sprache wie bei R00008 (`Haken…`); `e2e/` — Spec und DSL `abhaken`.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf

1. **Übersicht lesen** (einmal je Lauf, beim ersten Zugriff auf den Stand, danach im Speicher)
   - 1.1 `git log --no-walk=unsorted -m --first-parent -M --raw --numstat -z` mit Hashes der Auswahl in einem Aufruf (Annahme; das Format mit mehreren Commits ist beim Bauen zu bestätigen, siehe Missing-Docs)
   - 1.2 Parser der Dateiliste je Commit (Datensatztrenner ergänzt) → je Commit `Dateiaenderungen`; Reihenfolge wie die Auswahl
   - 1.3 Stellen = (Commit, Pfad bzw. neuer Pfad bei `R`)
2. **Stand lesen** (`GET /api/haken`, hinter der Host-Prüfung) → alle Stellen mit Haken, n, m; Übersicht nicht lesbar → 500 `{fehler}`
3. **Haken setzen** (`POST /api/haken`, JSON `{commit, datei, abgehakt}`)
   - 3.1 Anfrageschutz wie `POST /api/anmerkungen` (Host, Origin, Inhaltstyp, Methode)
   - 3.2 Interactor prüft die Stelle gegen die Übersicht (voller Hash, Pfad); sonst 400, ohne `git`
   - 3.3 Speicher setzt oder entnimmt (idempotent); ist der Review beendet: 409
   - 3.4 Antwort 200 `{abgehakt, gesamt}`
4. **Beenden**: der Ablauf siegelt Anmerkungen und Haken (jeweils unter ihrer Sperre), **danach** werden beide als Schnappschuss gelesen; der Formatierer ergänzt den Abschnitt (ab dem ersten Haken), schreibt nach stdout, Exit 0.
5. **Oberfläche**: beim Start Stand lesen (nach der Commit-Leiste); Fortschrittszeile zeichnen; je Zeile der Dateiliste ein Kästchen aus dem Stand (Schlüssel Commit + Pfad); Klick sendet den Zielzustand, zeichnet erst mit der Antwort (Fehler: zurück, Meldung).

### Grobentwurf

**Einstiegsstellen:** zwei Endpunkte im Minimal-API-Gerüst; Dateiliste und Fortschrittszeile in `web/`; `ErgebnisFormatierer` und Ablauf von „Beenden“ (R00002).

- `Stelle` (DTO, immutable) — voller Commit-Hash, Pfad.
- `Dateiuebersicht` (benannte Collection) — alle Stellen der Auswahl in Reihenfolge; `bool Enthaelt(Stelle stelle)`, `int Anzahl`.
- `UebersichtsLeser` (Ressourcenzugriff, wirft) — `Dateiuebersicht Lesen(Commits auswahl, string arbeitsordner)`; ein Aufruf, Schutz-Flags wie die übrigen Lesepfade.
- `Hakenspeicher` (Operation mit Zustand, thread-sicher) — `Hakenwirkung Setze(Stelle stelle, bool abgehakt)` (abgelehnt nach `Siegele()`), `bool Siegele()` (Einmal-Schalter), `Haken Schnappschuss()`.
- `Haken` (benannte Collection) — `bool IstAbgehakt(Stelle stelle)`, `int Anzahl`.
- `DateiAbhakenInteractor` (Integration, Interactor je Interaction) — `Hakenergebnis Setze(Hakenanfrage anfrage)` → `Gesetzt(abgehakt, gesamt)` / `Abgelehnt(Grund)`; `Hakenstand Stand()` → `Hakenstand` oder `NichtLesbar`; Anfrage rein, Ergebnis raus, `UebersichtsLeser` und `Hakenspeicher` über schmale Schnittstellen.
- `HakenEndpunkt` (dünner Adapter, keine Logik) — `GET`/`POST /api/haken`.
- `ErgebnisFormatierer` (Operation, rein, erweitert) — `string Formatiere(IReadOnlyList<Anmerkung> anmerkungen, Dateienstand? dateien)`; ohne Haken (`null` oder leer) identisch zu heute.
- `SichtbarerPfad` (Operation, rein) — `string Markiere(string pfad)` (Marken `⟨U+202E⟩`), für Ergebnis und Protokoll.
- JS: `haken-werte.js` (rein: Stand → Zähltext, Balkenanteil, Ansage, Schlüssel), `haken.js` (Fortschrittszeile, Kästchen, Zielzustand an den Server, Fehler); Ereignisse `commit-gewaehlt` und `datei-gewaehlt` bleiben unverändert.

### Änderungen an bestehenden Klassen

`ErgebnisFormatierer` (Abschnitt `## Dateien`), `BeendenEndpunkt` und Hauptablauf (beide Speicher siegeln, Schnappschuss danach), Host-Aufbau (Hakenspeicher, Interactor, Endpunkt registrieren), `dateiliste.js` (Zeilen tragen `data-pfad`, Kästchen), `index.html` (Fortschrittszeile über der Liste), `gitreviewa.css` (Stil aus kanbanD). **Gemeinsame Dateien mit den parallelen Karten:** #17 (R00010) ändert Anmerkungsspeicher, Endpunkte im Host-Aufbau und `diff.js`; #8 (R00007) `diff.js` und die Oberfläche der Diff-Zeilen. Dieser Slice berührt `diff.js` nicht und hält den Anmerkungsspeicher unberührt (eigener `Hakenspeicher`); nur Host-Aufbau, `ErgebnisFormatierer` (nur Eingabe und Abschnitt) und `BeendenEndpunkt` sind gemeinsam — früh auf den Stand von main rebasen, Zusammenführen klärt der Director.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Betreiber-Vorgabe 2026-11-24: Interactor je Interaction, Akzeptanzkriterien als NUnit-Integration gegen den Interactor (Treiber in-process, wie `DiffLesenTreiber`), Playwright nur Hot Path und Browser-Eigenes — **Datei abhaken liegt nicht auf dem Hot Path.**

**Unit (rein):** `Hakenspeicher` (setzen, doppelt setzen, entnehmen ohne Haken, parallel, nach Siegel), Formatierer (Beispiel, entnommen, Leerliste, 2 000 Stellen), `SichtbarerPfad` (LF, U+202E, ESC, Tab, Umlaut, Emoji), Zähltext und Balkenanteil (0 von 8, 1 von 8, 0 von 0, 2000), Parser mit mehreren Commits (Wurzel-, leerer, Merge-Commit).
**Integration:** Interactor gegen Wegwerf-Repos und gegen Fakes (Übersicht wirft; Stellen fremd, abgekürzt, nicht im Commit; beendet); Endpunkte auf freiem Port (200/400/403/405/409/415/500); Programm als Prozess (Beenden mit Haken, stdout/stderr getrennt, Marker-Skript, Start aus Unterordner, Zählung der `git`-Aufrufe, 2 000 Stellen).
**E2E (nur Browser-Eigenes):** ein Spec mit Tastatur und Fokus, Fremdtext als Text, Wechsel und Neuladen, Fehlerpfade per `route` (500, verzögert, doppelt), Lastprofil-Zeiten ereignisgenau; kein Hot-Path-Fall. Treiber und DSL `abhaken` auf den vorhandenen Schichten; Wegwerf-Repos: Repo aus R00003 (`p q r`), Repo X, Repo `y` (Dateiname mit LF/U+202E), Repo mit 2 000 Dateien (R00003).

## Abhängigkeiten

- Abhängig von: I0005 Commits und Dateien sehen (R00003, grün), I0006 Diff einer Datei lesen (R00004, grün; Zeichenmenge der Marken), I0019 Beenden mit Ergebnis (R00002, grün; Format, Einmal-Schalter, Anfrageschutz).
- Blockiert: I0025 Nächste ungeprüfte Datei und I0026 Abgehakte zuklappen (bauen auf Übersicht, Stand und Interactor auf), I0015 Tastaturbedienung (Taste `x` setzt den Haken), I0010 Zusammen-Ansicht (legt fest, wie Haken dort je Commit und Datei erscheinen). Berührt: I0020 Befunde kopieren (kopiert dasselbe Ergebnis, also mit dem Abschnitt).

Nicht Teil dieser Anforderung (eigene Karten): „Nächste ungeprüfte“ springen (I0025), Abgehakte ausblenden oder zuklappen (I0026), Taste `x` (I0015), Haken in der Zusammen-Ansicht je Datei über alle Commits (I0010), Haken an Ordnern des Baums, Haken im Diff-Kopf, Speichern über das Ende des Laufs hinaus (Vision: nichts wird gespeichert), Hinweis „seit dem Haken geändert“ (Commits sind unveränderlich).

## Offene Fragen

Keine. Die Fragen 1 bis 3 sind vom product-owner entschieden (Protokoll `AI-Team/po-entscheidungen.md`, Zeilen zu #16 I0016, 2026-11-24):

1. **Ohne einen einzigen Haken: Abschnitt „Dateien“ mit allen Stellen als „Ungeprüft“?** Entschieden: **nein**, der Abschnitt erscheint ab dem ersten Haken, ohne Haken (auch nach entnommenem Haken) bleibt das Ergebnis Byte für Byte wie in R00002; R00002 Kriterien 1 und 2 und Kriterium 6 hier bleiben (Protokollzeile 63). Ehrlich dünn: der Fall „weder Haken noch Anmerkung“ bleibt für die KI mehrdeutig; erkennt der Betreiber im Betrieb Bedarf, ist „Abschnitt immer“ eine kleine Ergänzung des Formats (Format-Entscheidung des Betreibers).
2. **Zeilenform des Abschnitts:** Entschieden: je Stelle eine Zeile `- <Pfad> (Commit <voller Hash>)` wie oben festgelegt, Reihenfolge Auswahl, dann Reihenfolge von `git`; gilt für das ganze Ergebnisformat. Gruppen je Commit bleiben eine spätere Verdichtung, wenn der Platz im Kontext der KI zum Problem wird (Protokollzeile 64).
3. **Streichkandidaten:** Entschieden: Kriterium 7 (`## Dateien` im Anmerkungstext) ist **gestrichen**, weil es dasselbe prüft wie R00002 Kriterium 3; der Satz „genau eine Überschrift `## Dateien`“ steht im Beispielkriterium des Ergebnisses (Kriterium 5), ohne neuen Test. Das Kriterium „Übersicht nicht lesbar“ (früher 14, jetzt **13**) bleibt, weil es einen eigenen Fehlerpfad durch die Oberfläche prüft (Protokollzeile 65). Danach hat die Anforderung 15 Kriterien; die Kriterien ab dem früheren 8 rücken um eins nach vorn.

Zuschnitt (I0025, I0026 abgespalten) und die Vorab-Festlegungen für diese beiden Karten: Protokollzeilen 62 und 66.

Entschieden vom planer (Rückfragen im Einsatz, mit Empfehlung beantwortet; Begründung unter „Notizen“): Haken im Arbeitsspeicher des Programms statt im Browser-Speicher; Übersicht aller Dateien mit einem `git`-Aufruf statt je Commit; Kästchen in der Dateiliste statt im Diff-Kopf; jede Datei der Liste zählt (auch gelöscht, umbenannt, binär); Haken je Stelle (Commit und Datei) im Modus „Einzeln“.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unterhalb I0016 (B1001–B1008), davon 3 Standard (2 h) und 5 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 26 h. Enthalten: nur I0016; I0025 und I0026 sind nicht bis Bubble geplant und nicht gezählt. Zwei Ausbaustufen sind nicht beauftragt: Kästchen im Diff-Kopf, Haken an Ordnern.

## Warum löst diese Anforderung das Problem?

Auslöser: Eine KI hat bis zu 200 Commits mit bis zu 2 000 Dateien geschrieben, und der Mensch prüft sie über längere Zeit und in beliebiger Reihenfolge; was er schon gesehen hat, hält er im Kopf, und die KI erfährt aus „Keine Anmerkungen.“ nicht, ob er ein Drittel oder alles angesehen hat. Das Zielbild ist ein Review, in dem der Stand der Prüfung sichtbar ist und beim Beenden mit dem Urteil zur KI zurückkommt. Wenn der Mensch jede Stelle (Commit und Datei) abhakt, das Programm die Haken im Arbeitsspeicher hält und „n von m“ aus einer einmal gelesenen Übersicht aller Dateien rechnet, dann sieht er seinen Stand in einem Blick, und wenn „Beenden“ aus denselben Haken die Abschnitte „Abgehakt“ und „Ungeprüft“ schreibt, dann liest die KI „Keine Anmerkungen“ nur noch zusammen mit dem, was nicht angesehen wurde. Gerade dieser Schnitt ist der Hebel, weil der Stand auf der Seite des Programms liegt: nur dort erreicht er das Ergebnis, und „nächste ungeprüfte“ (I0025) und „Abgehakte zuklappen“ (I0026) brauchen nur noch dieselbe Übersicht und denselben Stand.

## Missing-Docs

- Ausgabeformat von `git log --no-walk=unsorted -m --first-parent -M --raw --numstat -z --format=…` für mehrere Commits, mit Wurzel-, leerem und Merge-Commit und Umbenennungen (Trennung der Commits, Reihenfolge der Dateien) — vor dem Bauen gegen die git-Dokumentation und eine Probe im Wegwerf-Repo prüfen; fällt das Format aus, bleibt der Rückfall „ein `git show` mit allen Hashes“ oder je Commit ein Aufruf im Hintergrund (dann Kriterium 15 anpassen, nicht den Zähler).
- Die Dateiliste ist als `listbox` mit `option`-Zeilen gebaut (R00003); ein Kästchen in einer Zeile ist ein interaktives Kind einer Option, was WAI-ARIA nicht vorsieht — vor dem Bauen mit einem kleinen Versuch klären, ob die Liste auf `list` mit Wahl-Schaltfläche je Zeile umgestellt oder das Kästchen anders gesetzt wird; die Bedienung (Tab, Leertaste, Name „Abgehakt: <Pfad>“) ist Kriterium 11, nicht die Rollen.

## Notizen

### Optionen (Ort des Standes)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Haken im Arbeitsspeicher des Programms, Interactor mit Endpunkt (gewählt) | Akzeptanzkriterien als NUnit in-process, Ergebnis kennt den Stand | neuer Endpunkt mit Anfrageschutz; Haken nach Beenden → 409 | mittel |
| 2. Haken im Browser (`localStorage` wie kanbanD „Gesehen“) | nur im Browser prüfbar; das Ergebnis müsste die Haken mit „Beenden“ aus dem Browser holen | verletzt „Nichts wird gespeichert“ (Platte), Schlüssel und Obergrenze nötig | klein |
| 3. Haken nur als Seitenzustand im Browser, mit „Beenden“ mitgeschickt | Anforderung „Beenden“ ändert Vertrag aus R00002 | Neuladen verliert die Haken; zweiter Tab sieht sie nicht | klein |

Gewählt: 1. Die Haken müssen zum Ergebnis, und das Ergebnis entsteht im Programm; Neuladen und zweiter Tab sehen denselben Stand wie bei den Anmerkungen (R00010).

### Optionen (Quelle von „m“)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| A. Übersicht aller Dateien mit einem `git`-Aufruf, im Speicher (gewählt) | Aufrufe zählbar, Orakel gegen die Dateiliste | neues Format mit mehreren Commits (Missing-Docs); beim Start nicht blockierend, weil nach der Leiste gelesen | mittel |
| B. Dateiliste je gewähltem Commit (R00003) und Fortschritt nur für gesehene Commits | einfach | „n von m“ unbekannt, Ungeprüft im Ergebnis unvollständig | klein |
| C. Je Commit ein Aufruf beim Start | einfach | 200 Aufrufe: Startzeit ≤ 2 s gefährdet; Lastprofil | klein |

Gewählt: A. B und C verletzen Ergebnis bzw. Lastprofil; R00003 hat das Laden aller Dateilisten beim Start aus demselben Grund verworfen — hier wird nur **ein** Aufruf nach der Leiste gemacht.

### Optionen (Ort des Kästchens)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. In der Dateiliste, vor dem Pfad (gewählt) | Liste und Zähler am selben Ort, nicht an `diff.js` | Tastatur- und ARIA-Frage (Missing-Docs); Weg von der Maus zur Liste nach dem Lesen | klein |
| 2. Im Kopf des Diffs (kanbanD-Vorbild) | näher am Lesen | berührt `diff.js`, an dem #17 und #8 gerade bauen | klein |
| 3. Beides | zwei Wege zum selben Zustand | doppelte Pflege, Konflikt mit #17 und #8 | mittel |

Gewählt: 1; Option 2 später als kleine Ausbaustufe auf demselben Stand, wenn die parallelen Karten durch sind (derselbe Zustand, nur ein zweiter Ort).

### Zuschnitt (Probe auf den Schnitt)

Mit „Abgehakte zuklappen“ und „nächste ungeprüfte“ hätte I0016 mehr als 10 Bubbles gezählt (8 für den Kern, dazu je 2–3). Geschnitten nach Regeln (Muster „Regeln/Pfade“): der Kern „abhaken, Fortschritt, im Ergebnis“ ist für sich nützlich und der Teil, den die Vision als Rückkanal braucht; die Navigation (I0025) und das Zuklappen (I0026) setzen ihn voraus (`Braucht I0016`), sind aber untereinander parallel baubar. Alternative: beides in eine Interaction „Ungeprüftes finden“ (5 Bubbles); verworfen, weil zwei Fertig-Kriterien mit „und“ und zwei Verhalten, die einzeln auslieferbar sind. Alternative: den Ergebnisabschnitt als eigene Interaction abspalten; verworfen, weil der Mensch sonst Haken setzt, die die KI nicht erreichen (PO-Entscheidung: der Abschnitt kommt mit I0016) — das bliebe der erste Schnitt, falls der Kern im Bau zu groß wird (B1005 hängt nur am Stand, nicht an der Oberfläche).

### Verworfene Alternativen

- Diff-Einklappen durch den Haken (kanbanD R00246 FA 4): der Diff-Bereich zeigt immer nur die gewählte Datei, es gäbe nichts einzuklappen; „zuklappen“ ist hier die Liste (I0026).
- Fingerabdruck je Datei („seit dem Haken geändert“, kanbanD): Commits sind unveränderlich, der Stand der Datei im Commit ändert sich nicht.
- Haken je Pfad über alle Commits im Modus „Einzeln“: die Fertig-Kriterium-Zeile der WBS verlangt „je Commit×Datei“; die Zusammen-Ansicht (I0010) entscheidet, wie sie Stellen zusammenfasst.
- Gesamtzahl auf Commits statt Stellen („3 von 20 Commits“): der Mensch prüft Dateien, nicht Commits.
