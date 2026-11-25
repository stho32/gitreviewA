---
id: R00028
status: Neu
datum: 2026-11-25
---

# R00028: Nächste ungeprüfte Datei

## Beschreibung

Der prüfende Mensch geht die Dateien einer großen Auswahl der Reihe nach durch und hakt sie ab. Mit einem Bedienelement — „Nächste ungeprüfte“ — springt er von der aktuellen Stelle zur nächsten Stelle **ohne Haken** und sieht dort gleich ihren Diff; abgehakte Stellen werden übersprungen, und am Ende läuft die Reihe wieder von vorn (Umlauf). In „Zusammen“ (der Standardansicht, [R00012](R00012-oberflaeche-liste-detail-zusammen.md)) springt er **je Datei**, in „Einzeln“ **je Stelle** (Commit und Datei); beide Modi teilen denselben Haken-Stand aus [R00011](R00011-datei-abhaken.md). Gesperrte Stellen ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)) werden übersprungen; sind alle **lesbaren** Stellen abgehakt, sagt der Knopf das und nennt die Zahl der nicht lesbaren. Die Navigation liest nur die schon geladene Liste und den Stand — **kein neuer `git`-Aufruf, kein neuer Serverweg** (wie [R00025](R00025-dateien-ausblenden.md) und [R00027](R00027-im-diff-suchen.md)).

Zahlt ein auf: [Vision](R00000-vision.md) — „Checkliste im Kopf entlasten“ („Dateien abhaken, Fortschritt sehen, **zur nächsten ungeprüften springen**; alles per Tastatur“) und das Lastprofil (2 000 geänderte Dateien).

Baut auf auf: [R00011](R00011-datei-abhaken.md) (Stelle, Haken, Stand, Sperrgründe), [R00012](R00012-oberflaeche-liste-detail-zusammen.md)/I0027 (die Dateiliste, in der der Knopf lebt, und die Wahl einer Datei, die ihren Diff lädt), [R00015](R00015-zusammen-logik-und-server.md)/I0010 (die Netto-Dateiliste in „Zusammen“), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (gesperrte Stellen, „k nicht lesbar“), [R00025](R00025-dateien-ausblenden.md) (ausgeblendete Dateien) und [R00003](R00003-commits-und-dateien-sehen.md) (Dateiliste des Commits in „Einzeln“). Alles außer I0027 ist grün; [R00025](R00025-dateien-ausblenden.md)/I0013 ist rot, aber **keine** Voraussetzung (siehe „Abhängigkeiten“).

**Reihenfolge und beide Modi (Entscheidung des product-owners 2026-11-24, `AI-Team/po-entscheidungen.md` Zeile 66):** „nächste“ folgt der **flachen Reihenfolge der Auswahl** (Commits wie in der Commit-Leiste, je Commit die Reihenfolge von `git`), über Commits hinweg, mit Umlauf, in Liste und Baum gleich; sie lebt in der neuen Dateiliste und gilt in „Zusammen“ (je Datei) und „Einzeln“ (je Stelle) mit einem gemeinsamen Zustand, der beim Moduswechsel bleibt.

**Gesperrte Stellen (Vorgabe aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)):** „nächste ungeprüfte“ überspringt gesperrte Stellen (der Mensch kann sie nicht abhaken) und sagt am Ende „Alles Lesbare abgehakt, k nicht lesbar“, statt endlos auf ihnen zu landen.

**Schnitt (WBS I0016 → I0025):** „Nächste ungeprüfte“ stand im Fertig-Kriterium der Karte I0016 und wurde als eigene Interaction abgeschnitten (Probe: über acht Bubbles). Diese Anforderung ist die Navigation; der Haken, der Fortschritt und der Ergebnisabschnitt liegen in [R00011](R00011-datei-abhaken.md), das Zuklappen abgehakter Dateien in I0026 (parallel).

## Geschäftlicher Nutzen

Eine KI schreibt in einem Lauf leicht 200 Commits mit über tausend geänderten Dateien. Der Mensch hakt ab, was er gesehen hat, und sucht dann mit der Maus in der Liste nach der nächsten Datei ohne Haken — bei jeder der tausend Dateien ein Scrollen und Suchen, und leicht geht eine Datei verloren, die nie auf den Schirm kam. Der Knopf „Nächste ungeprüfte“ nimmt ihm das Suchen ab: ein Klick (später die Taste `u`) führt ihn der Reihe nach durch die noch offenen Dateien, und was er nicht mehr findet, kann er nicht übersehen. Die KI erfährt im Ergebnis ([R00011](R00011-datei-abhaken.md)) dieselbe ehrliche Aussage wie bisher — was ungeprüft blieb —, nur kommt der Mensch schneller bis zum Ende. Weil die Navigation nur die schon geladene Liste und den Stand liest, kostet sie keinen zusätzlichen `git`-Aufruf und keinen zusätzlichen Serverweg.

## Funktionale Anforderungen

- **Bedienelement**: ein Knopf „Nächste ungeprüfte“ in der Werkzeugzeile der Dateiliste (Entwurf Fassung 2, neben „Abgehakte ausblenden“) und **derselbe Weg** im leeren Diff-Bereich („Erste ungeprüfte öffnen“, Entwurf Fassung 2). Beide sind per Tab erreichbar, ihr Name beginnt mit dem sichtbaren Text. Ein eigenes Tastenkürzel gibt es hier **nicht** — die Taste `u` gehört zu I0015 (Tastaturbedienung).
- **Reihenfolge**: „nächste“ folgt der Reihenfolge der **gezeigten** Liste — in „Zusammen“ der Netto-Dateiliste ([R00015](R00015-zusammen-logik-und-server.md)), in „Einzeln“ der Dateiliste des Commits ([R00003](R00003-commits-und-dateien-sehen.md)), über Commits hinweg in der Reihenfolge der Auswahl. Flach und Baum folgen derselben Reihenfolge. Start ist die **aktuelle Wahl**; ist nichts gewählt, die erste ungeprüfte Stelle. Es geht vorwärts, am Ende mit **Umlauf** zur ersten ungeprüften.
- **In „Zusammen“ je Datei**: Trägt der Anzeigename der Netto-Datei einen Sperrgrund ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)), ist die Datei gesperrt und wird übersprungen — auch wenn einzelne ihrer Stellen lesbar wären. Eine Datei ist „noch ungeprüft“, wenn sie **mindestens eine abhakbare (lesbare) Stelle ohne Haken** hat. Eine Datei, deren offene Stellen alle gesperrt sind, wird übersprungen (sie kann nie „abgehakt“ werden, [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)); eine Datei mit gemischten Stellen (lesbar und gesperrt) wird erreicht, solange eine lesbare Stelle offen ist.
- **In „Einzeln“ je Stelle**: eine Stelle ist (voller Commit-Hash, Pfad); eine abgehakte oder gesperrte Stelle wird übersprungen.
- **Sprung**: die gefundene Stelle wird gewählt (in „Zusammen“ die Datei, in „Einzeln“ Commit **und** Datei), ihr Diff wird geladen (der vorhandene Weg aus I0027, kein Vorabladen), die Zeile kommt in den sichtbaren Bereich, und der **Fokus bleibt auf dem Knopf**, damit ein weiterer Druck weitergeht. Eine späte Antwort einer früheren Wahl wird verworfen.
- **Moduswechsel**: die Wahl folgt [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Kriterium 5); der Knopf arbeitet in beiden Modi über denselben Haken-Stand, es gibt keinen zweiten Zustand.
- **Alle abgehakt**: gibt es keine ungeprüfte (lesbare) Stelle mehr, ist der Knopf **nicht bedienbar** und daneben steht „Alles abgehakt“. Sind k ≥ 1 Stellen gesperrt, steht „Alles Lesbare abgehakt, k nicht lesbar“ ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)). Bei ausgeblendeten ungeprüften Dateien nennt die Meldung deren Zahl (Empfehlung, offene Frage 1).
- **Ausgeblendete Dateien** ([R00025](R00025-dateien-ausblenden.md)): „nächste“ folgt der gezeigten Liste und überspringt ausgeblendete Dateien (Empfehlung, offene Frage 1). Die ausgeblendete Datei bleibt Teil der Auswahl, zählt in „n von m abgehakt“ und steht im Ergebnis — sie wird nur von der Navigation nicht angesprungen.
- **Kein neuer Weg**: die Navigation rechnet aus der schon geladenen Liste (I0027) und dem Stand ([R00011](R00011-datei-abhaken.md)); **kein neuer Serverendpunkt, kein neuer `git`-Aufruf, kein Nachladen** von Diffs.
- **Sicherheit**: Pfade und fremder Text erscheinen nur als Text (`textContent`, nie HTML); es entsteht keine zweite Zeichenliste (dieselbe Marken-Klasse wie bisher, `AI-Team/gelerntes.md` #17).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): bei 2 000 geänderten Dateien wirkt der Sprung spätestens 1 s nach der Betätigung — der Knopf selbst rechnet nur im Arbeitsspeicher, die Zeit ist die des Dateiwechsels ([R00011](R00011-datei-abhaken.md), [R00012](R00012-oberflaeche-liste-detail-zusammen.md); Messwert ≤ 0,7 s, ≥ 30 % Abstand, `rollen/planer/zeitkriterien.md`). Die Suche nach der nächsten ungeprüften ist ein linearer Durchlauf über die Liste, kein `git`-Aufruf.
- **Sicherheit**: keine neue Angriffsfläche — kein neuer Endpunkt, kein neuer `git`-Aufruf, keine fremde Eingabe; Pfade nur als Text.
- **Logging**: stdout bleibt bis „Beenden“ leer; die Navigation läuft ganz im Browser und schreibt **nichts** auf stderr — es entsteht keine Log-Zeile je Sprung. Ein „nichts mehr ungeprüft“ ist kein Fehler und keine Error-Zeile.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und dem Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`); der Knopf trägt einen Namen, der mit dem sichtbaren Text beginnt; „Alles abgehakt“ ist ein Zustand, keine Sackgasse (die Liste und der Diff bleiben bedienbar).

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (Wegwerf-Ordner, nie das Projekt-Repo; aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md)): `z1` „Start“ legt `README.md` (2 Zeilen) und `src/a.txt` (3 Zeilen) an; `z2` ändert in `src/a.txt` eine Zeile und legt `src/b.txt` (2 Zeilen) an; `z3` ändert in `src/a.txt` und `src/b.txt` je eine Zeile. In „Zusammen“ sind das **3 Dateien** (`README.md`, `src/a.txt`, `src/b.txt`), in „Einzeln“ **6 Stellen** (`z1`: `README.md`, `src/a.txt`; `z2`: `src/a.txt`, `src/b.txt`; `z3`: `src/a.txt`, `src/b.txt`). Aufruf `gitreviewA z1 z2 z3 --kein-browser`, Seite über die Startzeile, Fenster 1280 × 800. Dazu **Repo N plus `v`** aus [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md)/[R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (10 Stellen, davon **3 gesperrt**; in „Zusammen“ 9 Dateien, 3 nicht lesbar). „Nächste ungeprüfte“ = den Knopf in der Werkzeugzeile der Dateiliste betätigen. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Die Navigation liegt **nicht** auf dem Hot Path (`AI-Team/factory.md`); Playwright nur für Browser-Eigenes (Knopf, Tastatur, Fokus, Scroll, Meldung).

### Sprung in „Zusammen“ (je Datei)
- [ ] Gegeben `gitreviewA z1 z2 z3` in „Zusammen“ ohne Haken und keine Datei gewählt, wenn man „Nächste ungeprüfte“ betätigt, dann ist `README.md` gewählt und ihr Diff steht rechts; betätigt man weiter, ist `src/a.txt`, dann `src/b.txt` gewählt, und ein weiteres Mal wieder `README.md` (Umlauf). *Ebene: JS-Unit (B2701, B2702) und Oberfläche gegen Fake.*
- [ ] Gegeben dasselbe, `src/a.txt` gewählt und noch nicht abgehakt, wenn man „Nächste ungeprüfte“ betätigt, dann ist `src/b.txt` gewählt (die nächste **nach** der aktuellen), nicht `src/a.txt` selbst. *Ebene: JS-Unit und Oberfläche.*
- [ ] Gegeben `README.md` in „Zusammen“ abgehakt und nichts gewählt, wenn man „Nächste ungeprüfte“ betätigt, dann ist `src/a.txt` gewählt (die abgehakte Datei wird übersprungen). *Ebene: JS-Unit und Oberfläche.*

### Sprung in „Einzeln“ (je Stelle, über Commits)
- [ ] Gegeben `z1 z2 z3` in „Einzeln“, `z1` gewählt, nichts abgehakt, wenn man „Nächste ungeprüfte“ wiederholt betätigt, dann ist die Reihe `README.md` in `z1`, `src/a.txt` in `z1`, dann `src/a.txt` in `z2` (der Commit-Wähler wechselt mit), `src/b.txt` in `z2`, `src/a.txt` in `z3`, `src/b.txt` in `z3`, und ein weiteres Mal `README.md` in `z1` (Umlauf). Rechnung: 6 Stellen, 2 je Commit. *Ebene: JS-Unit (Reihenfolge über Commits) und Oberfläche (Commit-Wähler wechselt mit).*
- [ ] Gegeben `z1 z2 z3` in „Einzeln“ mit `README.md` in `z1` abgehakt, wenn man „Nächste ungeprüfte“ betätigt (nichts gewählt), dann beginnt die Reihe bei `src/a.txt` in `z1` (die abgehakte Stelle wird übersprungen). *Ebene: JS-Unit und Oberfläche.*

### Gesperrte Stellen (R00014)
- [ ] Gegeben Repo N plus `v` (`gitreviewA $n $v`, 10 Stellen, 3 gesperrt), wenn man in „Einzeln“ „Nächste ungeprüfte“ wiederholt betätigt, dann landet es nie auf einer der drei gesperrten Stellen (`f⟨0xFF⟩.txt` zweimal in `n`, `z⟨U+000A⟩⟨0xFF⟩.txt` in `n`), sondern nur auf lesbaren ungeprüften; sind alle lesbaren abgehakt, ist der Knopf nicht bedienbar und daneben steht „Alles Lesbare abgehakt, 3 nicht lesbar“. *Ebene: Integration gegen die Oberfläche mit Fake und Prozessprobe.*
- [ ] Gegeben Repo N plus `v` in „Zusammen“ (9 Dateien, 3 nicht lesbar), wenn man „Nächste ungeprüfte“ wiederholt betätigt, dann sind die beiden `f⟨0xFF⟩.txt` **nie** ein Ziel — ihr Anzeigename ist nicht eindeutig ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md), `NettoDateiliste.Sperrgrund` „Name nicht eindeutig“), die Datei ist gesperrt und wird übersprungen, ihr Netto-Diff ist nicht lesbar; erreicht werden nur die lesbaren Dateien in der Reihenfolge der Netto-Liste (`a⟨0xFF⟩.sh`, `b⟨0xFF⟩.bin`, `g.txt`, `in.txt`, `r⟨0xFF⟩.txt`, `t⟨0xFE⟩.txt`) mit Umlauf; eine Datei, deren offene Stellen **alle** gesperrt sind, ist nie ein Ziel; sind alle lesbaren abgehakt, ist der Knopf nicht bedienbar und daneben steht „Alles Lesbare abgehakt, 3 nicht lesbar“. *Ebene: Unit (B2702) und Integration gegen die Oberfläche mit Fake.*

### Ausgeblendete Dateien (R00025, nach der Empfehlung; offene Frage 1)
- [ ] Gegeben Repo Q aus [R00025](R00025-dateien-ausblenden.md) mit `--ignore '*.lock'` (eine Datei ausgeblendet, sonst ungeprüft), wenn man „Nächste ungeprüfte“ wiederholt betätigt, dann landet es nie auf der ausgeblendeten Datei; sind nur noch ausgeblendete Dateien ungeprüft, ist der Knopf nicht bedienbar und daneben steht „Alles Sichtbare abgehakt, 1 ausgeblendet“. *Ebene: JS-Unit und Oberfläche.*

### Fokus, Scroll und Moduswechsel
- [ ] Gegeben `z1 z2 z3` in „Zusammen“ mit so vielen Dateien, dass die Liste scrollt, wenn man „Nächste ungeprüfte“ betätigt, dann kommt die gewählte Zeile in den sichtbaren Bereich, der Fokus bleibt auf dem Knopf (ein weiterer Druck geht weiter), und der Diff der gewählten Datei wird geladen; kommt die Diff-Antwort um 1,5 s verzögert und betätigt man den Knopf währenddessen erneut, dann steht am Ende der Diff der zuletzt gewählten Datei (die späte Antwort wird verworfen). *Ebene: Playwright (Fokus, Scroll — Browser-Eigenes) und Oberfläche (verzögerter Fake).*
- [ ] Gegeben in „Zusammen“ `src/a.txt` gewählt, wenn man auf „Einzeln“ wechselt, dann arbeitet „Nächste ungeprüfte“ dort je Stelle über denselben Haken-Stand weiter (kein zweiter Zustand), und die Wahl folgt [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Kriterium 5); der Knopf ist in beiden Modi bedienbar und trägt denselben Namen. *Ebene: Oberfläche.*

### Bedienung und kein neuer Weg
- [ ] Gegeben `z1 z2 z3`, nur Tastatur, wenn man mit Tab zum Knopf „Nächste ungeprüfte“ geht und Enter drückt, dann springt er wie mit der Maus; der Name des Knopfes beginnt mit dem sichtbaren Text („Nächste ungeprüfte“); im leeren Diff-Bereich trägt der Knopf denselben Weg („Erste ungeprüfte öffnen“). *Ebene: Playwright (Tastatur, Fokus, Name — Browser-Eigenes).*
- [ ] Gegeben `z1 z2 z3`, wenn man die Suche nach der nächsten ungeprüften mehrfach betätigt und beendet, dann ist die Zahl der `git`-Aufrufe dieselbe wie ohne (kein neuer Serverendpunkt, kein neuer `git`-Aufruf, kein Nachladen von Diffs). *Ebene: Prozessprobe (Aufrufzählung).*

## Betroffene Verzeichnisstruktur

Wie in [R00004](R00004-diff-einer-datei-lesen.md) (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- `web/` — neuer reiner Baustein `naechste-werte.js` (Einträge mit Zustand bilden, die nächste ungeprüfte finden; läuft unter Node und im Browser, wie `diff-werte.js`/`haken-werte.js`) und `naechste.js` (Knopf, Meldung, Sprung, Anschluss an die Liste, den Stand und die Modi).
- Server: **keine Änderung** — die Navigation rechnet aus der schon geladenen Liste und dem Stand.
- `tests/` und `e2e/` — Wegwerf-Repo Z, Repo N plus `v`, Repo Q (ausgeblendet); DSL `naechste`, Treiber; Unit-Tests des Bausteins unter Node.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen (Optionen unter „Notizen“). Der Entwurf Fassung 2 zeichnet den Knopf „Nächste ungeprüfte“ (Werkzeugzeile der Dateiliste) und „Erste ungeprüfte öffnen“ (leerer Diff-Bereich); seine Gestaltung folgt kanbanD und Material 3.

### Ablauf

1. **Einträge mit Zustand** — je gezeigter Liste (Netto-Liste in „Zusammen“, Dateiliste des Commits in „Einzeln“) und dem Haken-Stand ([R00011](R00011-datei-abhaken.md), Sperrgründe [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)) einen Zustand je Eintrag bilden: abgehakt / ungeprüft / gesperrt; ausgeblendete Dateien ([R00025](R00025-dateien-ausblenden.md)) sind keine Einträge (B2702).
2. **Die nächste ungeprüfte finden** — ab der aktuellen Wahl vorwärts, gesperrte übersprungen, mit Umlauf; ohne Wahl der erste ungeprüfte; gibt es keine, meldet es das (B2701).
3. **Sprung ausführen** — die Stelle wählen (Datei in „Zusammen“, Commit + Datei in „Einzeln“), den Diff laden (vorhandenes `datei-gewaehlt` aus I0027), die Zeile in den Blick scrollen, den Fokus auf dem Knopf lassen (B2703).
4. **Knopf und Meldung** — Knopf in der Werkzeugzeile und im leeren Diff-Bereich, Name mit dem sichtbaren Text; bei „keine ungeprüfte“ nicht bedienbar mit der Meldung (B2704).

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** die Dateiliste aus I0027 (Werkzeugzeile, Wahl, `datei-gewaehlt`), der leere Diff-Bereich, der Haken-Stand ([R00011](R00011-datei-abhaken.md)), neuer reiner Baustein `web/naechste-werte.js`.

- `Eintrag` (Wert, rein) — ein Listeneintrag mit Zustand (`abgehakt` / `ungeprueft` / `gesperrt`); in „Zusammen“ eine Datei, in „Einzeln“ eine Stelle.
- `Eintragsliste` (benannte Collection) — die Einträge in der Reihenfolge der gezeigten Liste; `Naechster(aktuelleStelle)` → `Eintrag` oder `Keiner` (Umlauf).
- JS `naechste-werte.js` (Operation, rein, läuft unter Node und im Browser) — `eintraege(liste, stand, modus, ausgeblendet)`, `naechster(eintraege, aktuelle)`, `meldung(zustand)`.
- JS `naechste.js` (Oberfläche) — Knopf, Meldung, Sprung; hört auf die Liste und den Stand und setzt die Wahl über das vorhandene `datei-gewaehlt` (I0027).

### Änderungen an bestehenden Klassen

`haken-werte.js` (der Zustand je Datei/Stelle aus B1106 wird mitgenutzt), `dateiliste.js`/`modus.js` (die gezeigte Liste und die Wahl), `index.html`/`gitreviewa.css` (Knopf in der Werkzeugzeile und im leeren Diff-Bereich, Stil der Meldung). `diff.js`, die Färbung (`faerben.js`, `farbschlangen.js`), `patchZeilen`, `sichtbarTeile` und die Serverendpunkte bleiben **unberührt**.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction, Akzeptanz gegen die Oberfläche mit Fake, Playwright nur Hot Path und Browser-Eigenes — **die Navigation liegt nicht auf dem Hot Path.**

**Unit (rein, unter Node):**
- `naechster` — leere Liste, ein Eintrag, nur abgehakt, gesperrte dazwischen, Umlauf, aktuelle Stelle nicht in der Liste, alle abgehakt.
- `eintraege` — „Zusammen“ je Datei (abgehakt = alle Stellen abgehakt, teilweise = ungeprüft, gesperrt), „Einzeln“ je Stelle, ausgeblendet; `meldung` (alles abgehakt, k nicht lesbar, n ausgeblendet).

**Integration (Oberfläche gegen Fake und Prozess):**
- Oberfläche gegen Fake: Sprung in beiden Modi, ab der aktuellen Wahl, Umlauf, übersprungene abgehakte/gesperrte/ausgeblendete Einträge, Meldung, Wechsel des Commits in „Einzeln“, verzögerte Antwort.
- Prozessprobe: kein zusätzlicher `git`-Aufruf, kein neuer Endpunkt, keine neue stderr-Zeile.

**E2E (Playwright, nur Browser-Eigenes):** Knopf (Tab, Name, Fokus), Scroll der gewählten Zeile in den Blick, Meldung „Alles abgehakt“/„Alles Lesbare abgehakt, k nicht lesbar“. Kein Hot-Path-Fall.

## Abhängigkeiten

- Abhängig von: [R00011](R00011-datei-abhaken.md) (Stelle, Haken, Stand, grün), [R00015](R00015-zusammen-logik-und-server.md)/I0010 (Netto-Dateiliste, grün), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (gesperrte Stellen, grün), [R00003](R00003-commits-und-dateien-sehen.md) (Dateiliste in „Einzeln“, grün) und [R00012](R00012-oberflaeche-liste-detail-zusammen.md)/I0027 (die Dateiliste, **rot** — `Braucht I0027`, weil der Knopf in ihr lebt). [R00025](R00025-dateien-ausblenden.md)/I0013 ist **nicht** Voraussetzung (die Navigation folgt der gezeigten Liste; ohne Ausblenden gibt es nichts auszublenden) — nur die Empfehlung zu ausgeblendeten Dateien nimmt auf sie Bezug.
- Blockiert: I0015 (Tastaturbedienung nimmt die Taste `u` für „nächste ungeprüfte“ in die Belegung auf).

Nicht Teil dieser Anforderung (eigene Karten): die Taste `u` (I0015), das Zuklappen abgehakter Dateien (I0026), der Haken, der Fortschritt und der Ergebnisabschnitt ([R00011](R00011-datei-abhaken.md)), das Anmerken, ein eigenes Tastenkürzel, ein Zähler am Knopf (Empfehlung: nein, offene Frage 2), das Anspringen ausgeblendeter Dateien (offene Frage 1), eine Auswahl „alle ungeprüften nacheinander automatisch“, ein Sprung innerhalb des Diffs zu einer Zeile.

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort):

1. **Ausgeblendete Dateien ([R00025](R00025-dateien-ausblenden.md)):** Empfehlung: „nächste ungeprüfte“ folgt der **gezeigten** Liste und überspringt ausgeblendete Dateien (wer sie ausgeblendet hat, will nicht zu ihnen springen); sind nur noch ausgeblendete Dateien ungeprüft, sagt der Knopf das („Alles Sichtbare abgehakt, n ausgeblendet“), damit nichts still verloren geht. Alternative: die Navigation geht über die ganze Auswahl — dann landet sie auf einer Datei, die nicht in der Liste steht, und der Knopf sagt „Alles abgehakt“ im Einklang mit „n von m“.
2. **Zähler am Knopf:** Empfehlung: **nein** — der Fortschritt im Kopf ([R00012](R00012-oberflaeche-liste-detail-zusammen.md), mit „ (k nicht lesbar)“ aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)) ist der eine Zähler; der Knopf sagt nur „es gibt noch eine“ oder „Alles abgehakt“. Alternative: der Knopf trägt die Zahl der noch ungeprüften („Nächste ungeprüfte (3)“).
3. **Fokus nach dem Sprung:** Empfehlung: der Fokus bleibt auf dem Knopf, damit ein weiterer Druck weitergeht; die gewählte Zeile kommt nur in den Blick. Alternative: der Fokus wandert auf die gewählte Zeile der Dateiliste.
4. **Wortlaut der Meldung:** Empfehlung: „Alles abgehakt“, bei k ≥ 1 gesperrten Stellen „Alles Lesbare abgehakt, k nicht lesbar“ (wörtlich aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)), bei n ≥ 1 ausgeblendeten ungeprüften zusätzlich „, n ausgeblendet“ (folgt aus Frage 1).

Ohne Rückfrage entschieden (Begründung unter „Notizen“): die Reihenfolge ist die der gezeigten Liste (Entscheidung des product-owners, Zeile 66); beide Modi teilen den Haken-Stand; gesperrte Stellen werden übersprungen; der Knopf lebt in der Dateiliste aus I0027 und im leeren Diff-Bereich; die Navigation ist ganz im Browser (kein neuer Serverweg, kein neuer `git`-Aufruf, kein Nachladen); Pfade nur als Text; die Taste `u` gehört zu I0015.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00001/R00003 hinaus.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 5 Bubbles unterhalb I0025 (B2701–B2705), davon 1 klar (2 h) und 4 unklar (2–4 h) — Untergrenze 10 h, obere Schätzung 18 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; die Richtwerte sind ein Vielfaches davon. Enthalten: nur I0025. I0026 (Abgehakte zuklappen) ist parallel geplant und nicht gezählt. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: Eine KI hat bis zu 200 Commits mit über tausend geänderten Dateien geschrieben, und der Mensch arbeitet sie über längere Zeit ab; nach der Hälfte sucht er in der Liste mit der Maus nach der nächsten Datei ohne Haken, verliert den Faden und lässt eine Datei ungeprüft, die nie auf den Schirm kam — und die KI liest „Keine Anmerkungen.“ als Freigabe. Das Zielbild ist ein Review, in dem der Stand der Prüfung sichtbar ist und der Mensch die offenen Dateien zügig durchgeht. Wenn ein Knopf (später die Taste `u`) ihn von der aktuellen Stelle zur nächsten **ohne Haken** führt, abgehakte und gesperrte Stellen überspringt, mit Umlauf arbeitet und am Ende ehrlich sagt, dass nichts Lesbares mehr offen ist, dann geht er der Reihe nach durch, ohne eine Datei zu übersehen. Gerade dieser Schnitt ist der Hebel, weil die Navigation nur liest, was ohnehin schon vorliegt — die Liste aus I0027 und den Stand aus [R00011](R00011-datei-abhaken.md) —, sodass sie keinen `git`-Aufruf, keinen Serverweg und kein Nachladen braucht und weder das Modell von Stellen, Haken und Anmerkungen noch den Vertrag mit der KI ([R00002](R00002-beenden-mit-ergebnis.md)) berührt. Sie zahlt genau dort ein, wo die Aufmerksamkeit verloren geht — in der langen Dateiliste —, und macht die Zusage „zur nächsten ungeprüften springen“ der Vision wahr.

## Missing-Docs

- Verhalten des Fokus und des Scrollens, wenn die gewählte Zeile im Baum (nicht flach) liegt oder im gerade gewechselten Commit einer anderen Datei entspricht — beim Bauen entscheiden; das Kriterium (Zeile in den Blick, Fokus auf dem Knopf) verträgt beide Wege.
- Stil des Knopfes und der Meldung „Alles abgehakt“ in kanbanD und Material 3 — der Entwurf Fassung 2 zeigt den Knopf, nicht den Zustand; vor dem Bauen gegen kanbanD prüfen.

## Notizen

### Optionen (Ort der Navigation)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. Navigation im Browser über die gezeigte Liste und den Stand, ein reiner Baustein (`naechste-werte.js`) (gewählt)** | Baustein als Unit unter Node; Oberfläche gegen Fake wie R00012; eine Rechnung (JS) | gering: nur die schon geladene Liste, kein neuer Weg | klein |
| 2. Navigation im Server (Interactor) über die Stellen der Auswahl | Akzeptanz gegen den Interactor | eine Serveranfrage je Klick; der Server müsste den Zustand je Datei liefern, den der Browser für die Kästchen schon hat — doppelte Wahrheit; berührt die Listenendpunkte von I0027 | mittel |
| 3. Den Fortschritt als Reihenfolgequelle (der Kopf führt den nächsten Zeiger) | — | der Kopf zählt, navigiert aber nicht; ein Zeiger im Kopf wäre ein zweiter Zustand neben der Wahl und bräche die Linie „die Wahl ist die Stelle“ | klein |

Gewählt: **1.** Die Navigation ist eine Sicht auf die bereits gezeigte Liste (I0027 liefert sie) und den Stand ([R00011](R00011-datei-abhaken.md)), es entsteht kein neuer `git`-Aufruf und kein neuer Datenweg, und die Finde-Regel wird nur einmal implementiert (der reine JS-Baustein, wie `diff-werte.js`, `haken-werte.js`, `modus.js`). **Option 2** verworfen: ein neuer Serverweg ohne Not, gegen die Leitplanke „kein Nachladen“ und den Schnitt aus I0016. **Option 3** verworfen: ein Zeiger im Kopf wäre ein zweiter Zustand, den beide Modi und die Wahl nicht kennen.

### Verworfene Alternativen

- **Rückwärts springen („vorige ungeprüfte“):** der Wunsch der Vision ist „zur nächsten ungeprüften“; ein zweiter Knopf und eine zweite Richtung sind neuer Umfang ohne belegten Bedarf (später als kleine Ergänzung möglich).
- **Ein Zähler am Knopf** („Nächste ungeprüfte (3)“): der Fortschritt im Kopf ist schon der Zähler; eine zweite Zahl müsste erklären, was sie zählt (Dateien oder Stellen) — offene Frage 2.
- **Anspringen ausgeblendeter Dateien:** widerspricht dem Zweck des Ausblendens; offene Frage 1.
- **Ein eigenes Tastenkürzel hier:** die Tastenbelegung steht an einem Ort (I0015), sonst Tastenkonflikt über vier Karten (Entscheidung des product-owners, Zeile 72).
- **Die Navigation im Diff-Bereich (Zeilensprung):** die Interaction springt zu einer **Datei**, nicht zu einer Zeile; ein Zeilensprung ist eine andere Sache.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-25 | NFA „Logging“ (Z. 44): die Navigation läuft ganz im Browser und schreibt **nichts** auf stderr, es entsteht keine Log-Zeile je Sprung (vorher „je Sprung eine Debug-Zeile auf stderr“); Halbsatz „und auf stderr nur mit Marken (dieselbe Funktion wie R00011, keine zweite Zeichenliste)“ in der Sicherheit-NFA (Z. 43) gestrichen; Testzeile (Z. 117) „keine neue stderr-Zeile“ statt „Debug-Zeile je Sprung“; AK (Z. 62) auf das Sperrmodell eingeengt — die beiden `f⟨0xFF⟩.txt` tragen den Datei-Sperrgrund „Name nicht eindeutig“ und sind **nie** ein Ziel, erreicht werden nur die sechs lesbaren Dateien der Netto-Liste; Ursachensatz in Z. 31 (Sperrgrund am Anzeigenamen sperrt die ganze Datei) und Zusatz in Z. 49 („in „Zusammen“ 9 Dateien, 3 nicht lesbar“) | Entscheidungen des product-owners 2026-11-25 (`AI-Team/po-entscheidungen.md`, Zeilen 162–163, Commit `c4427d2`; Bericht `.factory/laeufe/25-product-owner-3.md`, Abschnitt „Folgen“): der Sprung ist ein Klick im Browser, ohne Serverweg gibt es kein stderr, ein Kriterium für die Zeile wäre nie grün (der entwickler hat sie nie gebaut); das alte AK verlangte gegen [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) einen Codefehler, die Probe am laufenden Programm zeigt den Sperrgrund. Kein neuer Umfang, Code unverändert |
