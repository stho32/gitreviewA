---
id: R00010
status: Neu
datum: 2026-11-24
---

# R00010: Zeile annotieren

## Beschreibung

Der prüfende Mensch klickt im Diff auf eine Zeile im Stand nach dem Commit (hinzugefügt oder unverändert), schreibt in das Notizfeld unter der Zeile seine Anmerkung und speichert. Die Anmerkung steht danach unter dieser Zeile, bleibt dort beim Wechsel von Datei, Commit und Ansicht und nach dem Neuladen der Seite sichtbar und erscheint beim „Beenden“ im Ergebnis als `Datei:Zeile` (Format und Weg: [R00002](R00002-beenden-mit-ergebnis.md)). Die Zeile der Anmerkung ist die **Nummer neu** der Diff-Zeile ([R00004](R00004-diff-einer-datei-lesen.md)), also dieselbe Angabe, die die lesende KI im Ergebnis erhält. Eine entfernte Zeile hat keine Nummer neu und ist nicht annotierbar; die Oberfläche sagt, wohin die Anmerkung gehört. Ändern und Löschen einer Anmerkung sind eigene Interactions (I0023, I0024), nicht Teil dieser Anforderung.

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen“ und „Ergebnis als Rückkanal“ (Stellenangabe `Datei:Zeile` direkt als Arbeitsauftrag lesbar), Leitplanken „Nichts wird gespeichert“ (nur RAM), „stdout gehört allein dem Ergebnis“ und Lastprofil (500 Annotationen).

Baut auf auf: [R00004](R00004-diff-einer-datei-lesen.md) (Diff-Zeilen mit `data-art`, `data-alt`, `data-neu`, `datei-gewaehlt`, `commit-gewaehlt`), [R00002](R00002-beenden-mit-ergebnis.md) (Anmerkungsspeicher, `POST /api/anmerkungen`, Ergebnisformat, Anfrageschutz) und [R00001](R00001-mit-commit-hashes-aufrufen.md) (Gerüst, Host-Prüfung).

**Entscheidungen des product-owners (`AI-Team/po-entscheidungen.md`, 2026-11-24), die hier binden:**
- Eine **entfernte Zeile ist nicht annotierbar** (Zeilen zu #6 und #22): Hinweis „Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei“; das Format `Datei:Zeile` (Zeile ≥ 1, Stand nach dem Commit) bleibt unverändert. Geltung: beide Ansichten („nur Änderungen“ und „ganze Datei“, [R00008](R00008-ganze-datei-mit-diff.md)).
- **Nur RAM**, nichts auf Platte (Vision, Leitplanke).
- Mehrere Anmerkungen je Zeile ohne Grenze; Steuer- und Richtungszeichen abgelehnt (alle Anmerkungsarten); kein Markdown; Anmerkungen außerhalb der Ansicht nur als Hinweis; stabile Nummer je Anmerkung schon hier (Abschnitt „Offene Fragen“, alle vier entschieden).

**Vorlage kanbanD** (Betreiber 2026-11-24; vor dem Schreiben nachgesehen): kanbanDs Review-Seite (R00207, ADR-0033; `web/review-uebersicht.js`, `web/diff.js`) ist **nur lesend** — „kein Kommentar im Diff“ ist dort ein Nicht-Ziel, und keine Datei unter `web/` kennt Anmerkungen an Diff-Zeilen. Es gibt also nichts zu übernehmen außer dem **Stil** (`kd-tokens.css`, `kd-base.css`: `.btn`, `.inp`, Fokusring, Zielgröße `--kd-ziel`) und den **Regeln für fremden Text** (nur `textContent`, nie HTML; Marken für Unsichtbares wie `sichtbarTeile`). Die Zeilenanmerkung ist neu gebaut. kanbanD rendert Kommentare im Aufgabenfenster als Markdown (R00178); das wird hier ausdrücklich **nicht** übernommen (Offene Frage 3).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Anmerkung, Stelle (`Datei:Zeile`), Ergebnis, Diff-Zeile, Nummer alt/neu sind die von R00002 und R00004.

## Geschäftlicher Nutzen

Ohne Anmerkung an der Zeile hat das Ergebnis nichts zu sagen: der Mensch sieht im Diff, was falsch ist, und müsste die Stelle von Hand abtippen. Mit der Zeilenanmerkung genügt ein Klick, ein Satz und „Speichern“; die KI bekommt am Ende `src/Foo.cs:42` mit dem Satz dazu und kann die Stelle ohne Rückfrage anfassen. Diese Karte ist der heißeste Punkt des Hot Paths (Aufruf → Commit → Datei → Diff → Zeile annotieren → Beenden mit Ergebnis auf stdout).

## Funktionale Anforderungen

- **Zeile wählen**: ein Klick auf eine Diff-Zeile mit Nummer neu (hinzugefügt oder unverändert) öffnet unter ihr ein Notizfeld mit Fokus im Textfeld. Ist beim Klick Text ausgewählt, öffnet sich nichts (Text bleibt kopierbar). Ein Klick auf eine Zeile, die schon eine Anmerkung trägt, öffnet ein weiteres neues Feld (mehrere Anmerkungen je Zeile sind erlaubt, R00002 kennt keine Grenze).
- **Nicht annotierbar**: eine **entfernte** Zeile (nur Nummer alt) öffnet kein Feld und zeigt den Hinweis „Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei“ (verschwindet bei der nächsten Wahl einer Zeile oder Datei); ein Abschnittskopf (`@@ …`) und die Zeile `\ No newline at end of file` tun nichts.
- **Notizfeld**: mehrzeiliges Textfeld mit dem Namen „Anmerkung zu <Datei>, Zeile <n>“, „Speichern“, „Abbrechen“; Strg+Enter speichert, Esc bricht ab. Während die Anfrage läuft, ist „Speichern“ gesperrt (kein doppeltes Anlegen).
- **Speichern**: legt über `POST /api/anmerkungen` (R00002) an: Commit = der gewählte Commit (voller Hash), Datei = der Pfad über dem Diff (bei Umbenennung der neue Pfad), Zeile = Nummer neu der Zeile, Text = der Text des Feldes. Bei Erfolg schließt das Feld, die Anmerkung steht unter der Zeile, der Fokus steht auf der Zeile.
- **Fehler**: lehnt der Server ab (400 mit Meldung, 409 nach dem Beenden) oder antwortet er nicht (Netz, 500), steht die Meldung im Feld („Anmerkung konnte nicht gespeichert werden“ bei Netz und 500, sonst der Satz des Servers), das Feld bleibt offen, der Text bleibt; nichts wird doppelt oder in einer anderen Datei angelegt, auch wenn man währenddessen die Datei wechselt.
- **Anzeige**: je Anmerkung eine eigene Anmerkungszeile **unter** ihrer Diff-Zeile mit dem Text als reinem Text (Zeilenumbrüche des Textes sichtbar, nie HTML, nie Markdown) und der Stelle `<Datei>:<n>`. Eine Anmerkungszeile ist **keine Diff-Zeile**: sie trägt kein `data-art`, `data-alt`, `data-neu`; die Zeilenzählungen von R00004 und R00008 und die Farbauflage von R00007 bleiben unberührt. Mehrere Anmerkungen an einer Zeile stehen in Anlegereihenfolge untereinander.
- **Bleibt sichtbar**: eine Anmerkung (Commit, Datei, Zeile) erscheint in jedem Diff dieses Commits und dieser Datei an dieser Nummer neu — in „nur Änderungen“ und „ganze Datei“, mit und ohne Umbruch, nach Wechsel von Datei und Commit und zurück, nach Neuladen der Seite. Sie erscheint nie an einer anderen Zeile, Datei oder einem anderen Commit (auch nicht, wenn dort dieselbe Nummer vorkommt, auch nicht an einer entfernten Zeile mit derselben Nummer alt).
- **Außerhalb der Ansicht**: hat eine Datei Anmerkungen an Zeilen, die die gezeigte Ansicht nicht zeigt (Beispiel: „nur Änderungen“ zeigt Zeile 10 nicht), steht über dem Diff der Hinweis „1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10“ (mehrere: „2 Anmerkungen an Zeilen, die diese Ansicht nicht zeigen: Zeile 10, Zeile 12“). Die Anmerkung bleibt im Ergebnis. Zeigt die Ansicht die Zeile (z. B. „ganze Datei“), entfällt der Hinweis für sie.
- **Tastatur**: der Diff-Bereich hat einen Tab-Stopp; Pfeil auf/ab wechselt die Zeile, Enter öffnet das Notizfeld (oder zeigt bei einer entfernten Zeile den Hinweis). Nach Speichern und Abbrechen steht der Fokus wieder auf der Zeile. (I0015 Tastaturbedienung baut darauf auf und erweitert.)
- **Eingabe**: der Text gilt nach den Regeln von R00002 (nicht leer, höchstens 10 000 Zeichen) und zusätzlich: **Steuer- und Richtungszeichen werden abgelehnt** (400 „Text enthält Steuer- oder Richtungszeichen“) — Zeichen U+0000–U+0008, U+000B, U+000C, U+000E–U+001F, U+007F–U+009F sowie U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069. Tab, Zeilenumbruch (LF, CRLF), Umlaute und Emoji (auch mit U+200D) sind erlaubt. Grund: der Text landet unverändert auf stdout, wo ein Terminal Steuerfolgen ausführt und Richtungszeichen die Zeile verdrehen (Sicherheitswissen, `AI-Team/gelerntes.md`).
- **Liste**: `GET /api/anmerkungen` liefert alle Anmerkungen des Laufs (`nummer`, `commit`, `datei`, `zeile`, `text`) in Anlegereihenfolge; die Oberfläche lädt sie beim Start und hält sie danach nach jedem Anlegen nach. Quelle der Wahrheit ist der Server (was die Oberfläche zeigt, ist, was das Ergebnis enthält).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): 500 Anmerkungen zu je 200 Zeichen an einer Datei mit 20 000 Diff-Zeilen stehen ≤ 1 s nach dem Klick auf die Datei vollständig im Dokument (Obergrenze des Dateiwechsels; Messwert ≤ 0,7 s, ≥ 30 % Abstand, `rollen/planer/zeitkriterien.md`; liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium). Der Entwickler hält außerdem die Antwortzeit von `GET /api/anmerkungen` bei 500 Anmerkungen als Integrationsmessung im Bericht fest (Vermutung: ≪ 100 ms, ungemessen). „Beenden“ mit 500 Anmerkungen bleibt ≤ 1 s (R00002).
- **Sicherheit** (Label `sicherheit`): Anmerkungstext, Pfade und Namen sind Eingabe des Menschen bzw. des fremden Repos und erscheinen in der Oberfläche und auf stdout. In der Oberfläche nur über `textContent` (kein `innerHTML`, kein Markdown, keine Links); Pfade im Namen des Feldes nur als Attributwert über `setAttribute`/`textContent`. Auf stdout bleibt der Text Zitat (R00002); zusätzlich die Zeichenregel oben. `GET /api/anmerkungen` ist über die Host-Prüfung (nur `127.0.0.1:<port>`) gegen DNS-Rebinding geschützt und trägt keine CORS-Freigabe, damit keine fremde Seite die Anmerkungen lesen kann. Das Anlegen bleibt durch den Anfrageschutz von R00002 geschützt (Origin, nur POST, nur `application/json`).
- **Logging**: stdout bleibt bis zum Beenden leer. Anlegen: Debug-Zeile auf stderr mit Nummer und Textlänge, **nie** der Text; abgelehnte Anmerkung mit Grund, ohne Text.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD (`kd-*.css`), keine Wireframes, keine eigenen Gestaltungsvorgaben; Bedienziele mindestens `--kd-ziel`; das Feld ist per Tastatur vollständig bedienbar und trägt einen Namen für Screenreader; Fehlermeldungen als `role="alert"`.
- **Verträglichkeit mit parallelen Karten**: R00007 (Färbung) und R00008 (ganze Datei) bleiben unverändert und gelten mit; die Anmerkungszeilen stören weder deren Zeilenzählung noch deren Auflage auf den Zeilenelementen.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (Commits `p`, `q`, `s`) und **Repo U** (`u`) wie in [R00004](R00004-diff-einer-datei-lesen.md) und `user-stories/R00004.md`; neu: **Repo X** mit einem Commit `x`, der die Datei `<b>x</b>.txt` (eine Zeile `eins`) hinzufügt. Aufruf wie in R00004 (`gitreviewA q p`, Wahl `q`, „wählen“ = Klick in der Dateiliste); „annotieren“ = die Zeile anklicken, den Text ins Feld schreiben, „Speichern“. Die Angaben „Ebene“ nennen, wo das Kriterium geprüft wird (Begründung unter „Tests“).

### Zeile annotieren
- [ ] Gegeben `q` und `lang.txt` angezeigt, wenn man die Zeile `z19` (alt 19, **neu 18**) mit „Klammer fehlt“ annotiert, dann steht die Anmerkung „Klammer fehlt“ direkt unter `z19`, das Feld ist zu, und nach „Beenden“ steht auf stdout genau das Ergebnis mit `## 1. lang.txt:18`, `Commit: <voller Hash von q>` und `> Klammer fehlt` bei Exit-Code 0. Rechnung: 20 Zeilen − `z18` entfernt = `z19` ist Zeile 18 im Stand nach dem Commit. *Ebene: E2E, Hot Path.*
- [ ] Gegeben `q` und `src/b.txt` (`eins` 1/1, `−zwei`, `+ZWEI` neu 2, `+drei` neu 3), wenn man `+ZWEI` annotiert, dann ist die Stelle `src/b.txt:2`, wenn man `eins` annotiert, `src/b.txt:1` (nicht `src/b.txt:2` aus der Nummer alt von `−zwei`). *Ebene: Unit (Zeile → Stelle) und Integration (Interactor legt an, Liste und Ergebnis nennen die Stelle).*
- [ ] Gegeben eine Anmerkung an `q`, `lang.txt`, Zeile 18, wenn man `src/b.txt` wählt, dann `lang.txt` wieder, dann den Commit `p` und dort `lang.txt` (Zeile 18 ist dort `z18`), dann `q` und `lang.txt` und die Seite neu lädt, dann steht die Anmerkung unter `z19` (neu 18) in `q`, nicht bei `−z18` (alt 18, nur Nummer alt) und nicht in `p`; nach dem Neuladen steht sie wieder da. *Ebene: Unit (Anmerkungsstand) und Integration (Liste über den Interactor); im Hot-Path-Fall zusätzlich Dateiwechsel und Neuladen.*
- [ ] Gegeben `q` und `lang.txt` in „nur Änderungen“ (zeigt neu 1–6 und 15–19) und eine über die Schnittstelle angelegte Anmerkung an Zeile 10, wenn man die Datei zeigt, dann steht über dem Diff „1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10“, unter keiner Zeile steht eine Anmerkung, und im Ergebnis steht `lang.txt:10`; zeigt die Ansicht „ganze Datei“ (R00008), steht die Anmerkung unter `z10` und der Hinweis entfällt. *Ebene: Unit (Anmerkungsstand mit Zeilenmengen beider Ansichten).*
- [ ] Gegeben eine Anmerkung an `lang.txt` Zeile 18 in `q`, wenn man dieselbe Zeile `z19` erneut anklickt und „Zweite“ speichert, dann stehen beide unter `z19` (zuerst die ältere), und im Ergebnis stehen sie als `## 1.` und `## 2.` in dieser Reihenfolge. *Ebene: Unit (Anmerkungsstand) und Integration.*

### Nicht annotierbare Zeilen
- [ ] Gegeben `q` und `src/b.txt` angezeigt, wenn man die Zeile `−zwei` (alt 2, keine Nummer neu) anklickt, dann öffnet kein Feld, und es steht der Hinweis „Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei“; ein Klick auf den Kopf `@@ -1,2 +1,3 @@` oder (bei `ende.txt`) auf `\ No newline at end of file` öffnet weder Feld noch Hinweis; nach „Beenden“ steht „Keine Anmerkungen.“. Dasselbe gilt in der Ansicht „ganze Datei“. *Ebene: Unit (Zeile → Ziel) und E2E (Darstellung des Hinweises, Browser-Eigenes).*

### Stabile Nummer
- [ ] Gegeben ein frischer Lauf, wenn nacheinander drei Anmerkungen angelegt werden und eine vierte mit leerem Text abgelehnt wird, danach eine fünfte angelegt, dann liefern die Anlegeantworten die Nummern 1, 2, 3 und 4 (die abgelehnte verbraucht keine Nummer), und `GET /api/anmerkungen` nennt sie in dieser Reihenfolge; die Nummer einer Anmerkung ändert sich nicht, wenn später weitere angelegt werden. Rechnung: 3 angelegt, 1 abgelehnt, 1 angelegt = Nummern 1–4. *Ebene: Integration gegen den Interactor.*

### Notizfeld
- [ ] Gegeben `q` und `lang.txt`, nur Tastatur, wenn man in den Diff-Bereich tabt, mit Pfeil ab zur Zeile `z19` geht und Enter drückt, dann öffnet das Feld „Anmerkung zu lang.txt, Zeile 18“ mit Fokus im Textfeld; Strg+Enter nach einem Text speichert, und der Fokus steht danach auf `z19`; ein zweites Mal Enter, Esc, dann ist das Feld zu, nichts ist angelegt, und der Fokus steht wieder auf `z19`. *Ebene: E2E (Tastatur und Fokus, Browser-Eigenes).*
- [ ] Gegeben ein offenes Feld, wenn man einen Text von 10 001 Zeichen, danach einen leeren Text oder nur Leerzeichen, danach einen Text mit U+001B (Escape) speichert, dann steht jedes Mal die Meldung des Servers im Feld („Text ist länger als 10000 Zeichen“, „Text fehlt“, „Text enthält Steuer- oder Richtungszeichen“), das Feld bleibt offen, der Text bleibt, und nichts ist angelegt; antwortet der Server mit 500 (oder gar nicht), steht „Anmerkung konnte nicht gespeichert werden“, der Text bleibt, und nach dem Kürzen auf 10 000 Zeichen und erneutem Speichern ist die Anmerkung angelegt. *Ebene: E2E (Fehlerpfad durch die Oberfläche; Antworten per `route`).*
- [ ] Gegeben die Antwort auf das Anlegen ist um 1,5 s verzögert, wenn man „Speichern“ zweimal kurz hintereinander betätigt und währenddessen `src/b.txt` wählt, dann entsteht genau eine Anmerkung („Anmerkungen: 1“ im Ergebnis), und nach der Rückkehr zu `lang.txt` steht sie unter `z19`, nicht in `src/b.txt`. *Ebene: E2E (verzögerter Fake, Browser-Eigenes).*

### Eingabe und fremder Text
- [ ] Gegeben ein Text mit U+001B, U+0007, U+009B oder U+202E, wenn die Anmerkung angelegt werden soll, dann wird sie abgelehnt (400, „Text enthält Steuer- oder Richtungszeichen“) und nichts gespeichert; ein Text mit Tab, einer Leerzeile, CRLF, „Prüfen: größer ≥ 3“ und einem Emoji mit U+200D wird angenommen und steht nach „Beenden“ als Zitat auf stdout. *Ebene: Unit (Textregel) und Integration (Interactor).*
- [ ] Gegeben `x` mit der Datei `<b>x</b>.txt` und eine Anmerkung mit dem Text `<img src=x onerror=alert(1)>`, `<b>fett</b>` und `**fett**` (drei Zeilen), wenn man sie anlegt und die Seite neu lädt, dann stehen die drei Zeilen als sichtbarer Text da (spitze Klammern und Sternchen sichtbar, Zeilenumbrüche sichtbar), es erscheint kein Dialog, es gibt kein `img` und kein `b` in der Anmerkung, das Feld heißt „Anmerkung zu <b>x</b>.txt, Zeile 1“ (als Text), und der Text steht auf stdout unverändert als Zitat. *Ebene: E2E (DOM-Sicherheit, Browser-Eigenes).*
- [ ] Gegeben `gitreviewA q p --verbose` mit gesammeltem stderr und stdout, wenn man eine Anmerkung mit dem Text „GEHEIMWORT eins“ anlegt, dann steht „GEHEIMWORT“ weder auf stdout (bleibt bis „Beenden“ leer) noch auf stderr, und stderr enthält eine Debug-Zeile mit der Nummer 1 und der Textlänge 15. *Ebene: Integration (Programm als Prozess).*

### Schutz
- [ ] Gegeben zwei Anmerkungen, wenn `GET /api/anmerkungen` mit `Host: 127.0.0.1:<port>` angefragt wird, dann antwortet sie mit 200 und beiden Einträgen in Anlegereihenfolge ohne `Access-Control-Allow-Origin`; mit `Host: localhost:<port>` oder fremdem Host antwortet sie mit 403 und ohne Anmerkung im Körper. *Ebene: Integration (Endpunkt auf freiem Port).*

### Lastprofil
- [ ] Gegeben `gitreviewA u` (Repo U, `gross.txt` mit 20 000 Zeilen) und 500 Anmerkungen zu je 200 Zeichen an den Zeilen 1 bis 500 (über die Schnittstelle angelegt), wenn man `gross.txt` wählt, dann steht spätestens 1 s nach dem Klick die Zeile `zeile 20000` (neu 20000) und die Anmerkung an Zeile 500 im Dokument, und es gibt genau 500 Anmerkungszeilen (gemessen vom Klick bis zu diesem Ereignis, ereignisgenau, Messwert ≤ 0,7 s). *Ebene: E2E (Lastprofil, nur im Browser messbar).*

## Betroffene Verzeichnisstruktur

Wie in R00001 bis R00004 (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Anmerkungen/` — Interactor `ZeileAnnotierenInteractor`, Textprüfung; `AnmerkungsEndpunkt` wird dünner Adapter, neuer Adapter für `GET`.
- `Server/` — Route `GET /api/anmerkungen` im Webserver.
- `web/` — `anmerkungen-werte.js` (rein: Zeile → Ziel, Anmerkungsstand) und `anmerkungen.js` (Notizfeld, Anmerkungszeilen, Anschluss), eingebunden in `index.html`; kleine Ergänzung in `diff.js` (Ereignis `diff-gezeichnet`); Stil in `gitreviewa.css`.
- `tests/` — Unit und Integration gegen den Interactor; `e2e/` — Hot-Path-Fall und Browser-Eigenes über DSL und Treiber, Wegwerf-Repo X.

## Technische Überlegungen

Vorplanung; welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Zeile wählen** (Oberfläche) — Klick oder Enter auf eine Diff-Zeile → `Zeilenziel` (rein): annotierbar mit Nummer neu | entfernt (Hinweis) | keines (Kopf, Hinweiszeile, Text ausgewählt).
2. **Notizfeld** — öffnen unter der Zeile, Fokus ins Feld; Esc/„Abbrechen“ schließt und gibt den Fokus zurück.
3. **Speichern** — `POST /api/anmerkungen` mit Commit, Datei, Zeile, Text (R00002); Schaltfläche gesperrt, bis die Antwort da ist.
   - 3.1 Server: Anfrageschutz (R00002) → `ZeileAnnotierenInteractor.LegeAn` → Textregeln, Auswahl, Datei, Zeile → Speicher (409 nach Beenden).
   - 3.2 201: Oberfläche nimmt die Anmerkung in ihren Stand auf (Nummer aus der Antwort) und zeichnet sie unter der Zeile, **nur wenn** (Commit, Pfad) noch die gewählte Datei sind; sonst bleibt sie im Stand und erscheint bei der Rückkehr.
   - 3.3 400/409/500/Netz: Meldung im Feld, Feld bleibt offen.
4. **Zeigen** — nach jedem Zeichnen eines Diffs (Ereignis `diff-gezeichnet` mit Commit, Pfad, Ansicht) → `Anmerkungsstand` (rein: Anmerkungen + Commit + Datei + gezeigte Nummern neu → je Nummer die Anmerkungen, dazu die nicht gezeigten) → Anmerkungszeilen einfügen, Hinweis „außerhalb“ setzen.
5. **Start/Neuladen** — `GET /api/anmerkungen` füllt den Stand.

### Grobentwurf

**Einstiegsstellen:** Interactor in `Anmerkungen/` (neu, nimmt die Logik aus `AnmerkungsEndpunkt`), ein neuer GET-Endpunkt, zwei neue Module in `web/`, ein Ereignis aus `diff.js`.

- `ZeileAnnotierenInteractor` (Interactor — ein Interactor je Interaction) — nimmt eine Anfrage, prüft, legt an oder lehnt ab, listet.
  - `AnnotierenErgebnis LegeAn(NeueAnmerkung neu)` — `Angelegt(nummer)` | `Abgelehnt(art, grund)` mit `art` ∈ ungültig (400), beendet (409)
  - `Anmerkungsliste Liste()`
- `AnnotierenErgebnis` (DTO, immutable) — Ausgang des Anlegens.
- `Anmerkungstext` (Operation, rein) — `Pruefergebnis Pruefe(string? text)` (leer, Länge, Steuer- und Richtungszeichen); `AnmerkungsPruefer` ruft sie, die Länge 10 000 und der Leerfall bleiben in R00002-Verhalten.
- `AnmerkungsEndpunkt` (dünner Adapter) — liest JSON, ruft den Interactor, übersetzt in 201/400/409; `AnmerkungenListeEndpunkt` (dünner Adapter) — `GET`.
- `Anmerkungsspeicher` (bestehend, B0101) — **erweitert**: vergibt je angelegter Anmerkung eine **stabile Nummer** aus einem Zähler (ab 1, nur für tatsächlich angelegte Anmerkungen, nie wiederverwendet) statt „Anzahl + 1“; I0023 und I0024 adressieren die Anmerkung über diese Nummer. Die Nummerierung im Ergebnis nach Position (`## 1.`, `## 2.` …, R00002) bleibt davon getrennt und unverändert.
- JS `zeilenziel(zeile, textAusgewaehlt)` (rein) → `{art: 'annotierbar', neu}` | `{art: 'entfernt', hinweis}` | `{art: 'keines'}`; `anmerkungsstand(anmerkungen, commit, datei, gezeigteNummern)` (rein) → `{jeZeile, ausserhalb}`; Oberfläche `anmerkungen.js` (Adapter: Ereignisse, Feld, Anfrage, DOM mit `textContent`).

### Änderungen an bestehenden Klassen
- `AnmerkungsEndpunkt`: Logik (prüfen, anhängen, 409) wandert in den Interactor; die Antworten bleiben dieselben (R00002-Kriterien bleiben grün).
- `AnmerkungsPruefer`: Textregel wird ausgelagert und um die Zeichenregel erweitert.
- `Webserver` (`BildeRueckkanal`): Route `GET /api/anmerkungen`.
- `diff.js`: nach `zeichneZeilen` ein Dokumentereignis `diff-gezeichnet` (Detail: Commit, Pfad, Ansicht); sonst unverändert. R00007 und R00008 hängen sich an dasselbe Ereignis (wer zuerst merged, führt es ein; kein Konflikt in der Rechnung).
- E2E-Treiber `diff-oberflaeche.js`: der Zeilenselektor `#diff .dz tr` zählt Anmerkungszeilen mit — er wird zu `#diff .dz tr[data-art]` (Anmerkungszeilen haben kein `data-art`); sonst zählen die R00004-Kriterien bei annotierten Dateien falsch.

## Tests

Nach Test-Pyramide und Konfiguration (Interactor je Interaction; Playwright nur Hot Path und Browser-Eigenes).

**Unit (rein):** `Anmerkungstext` (Tabelle der Zeichen: ESC, BEL, U+009B, U+202E, U+061C erlaubt/abgelehnt, Tab/CRLF/Emoji mit U+200D erlaubt, 10 000/10 001, leer, nur Leerraum); JS `zeilenziel` (hinzugefügt, unverändert mit alt ≠ neu, entfernt, Kopf, Hinweiszeile, Text ausgewählt); JS `anmerkungsstand` (alt/neu-Kollision `z18`/`z19`, anderer Commit, andere Datei, außerhalb der gezeigten Nummern, zwei an einer Zeile in Reihenfolge).
**Integration (NUnit gegen den Interactor, echtes git im Wegwerf-Repo für die Auswahl):** Anlegen und Auflisten, 400-Gründe, 409 nach Beenden, Stelle `Datei:Zeile` im Ergebnis, Anlegereihenfolge; Endpunkte auf freiem Port (GET: 200/403, kein ACAO); Programm als Prozess (Log ohne Text, stdout leer bis Beenden); Antwortzeit `GET` bei 500.
**E2E (Playwright headless, über DSL und Treiber):**
1. **Hot Path** (Kriterium 1 und der Teil „Dateiwechsel, Neuladen“ von Kriterium 3): Aufruf → Commit → Datei → Diff → Zeile annotieren → Beenden mit Ergebnis auf stdout, ein durchgehender Fall. Liegt auf dem Hot Path (`AI-Team/factory.md`, „Testbarkeit“).
2. **Browser-Eigenes** (ein Spec, nur was Integration und Unit nicht sehen): Hinweis und Fokus bei entfernter Zeile, Tastatur und Fokus, Fehlerpfade (`route`), verzögerte Antwort mit Doppelklick und Dateiwechsel, XSS in Anmerkung und Dateiname, Lastprofil 500.
Alle übrigen Kriterien laufen ohne Browser.

## Abhängigkeiten
- Abhängig von: I0006 Diff einer Datei lesen (R00004, gebaut, Karte #6; `data-art`, `data-alt`, `data-neu`, `datei-gewaehlt`), I0019 Beenden mit Ergebnis (R00002, grün; Speicher, `POST /api/anmerkungen`, Ergebnisformat), I0001 (Gerüst).
- Parallel in Arbeit mit gleichen Modulen: I0022 Ganze Datei mit Diff (R00008, Karte #22), I0008 Syntaxhervorhebung (R00007, Karte #8) — Verträglichkeit siehe oben, beide Anforderungen bleiben unverändert.
- Blockiert: I0023 Anmerkung ändern, I0024 Anmerkung löschen (Braucht I0017), I0018 Datei annotieren (Braucht I0017), I0020 Befunde kopieren (über I0019).

Nicht Teil dieser Anforderung: Ändern und Löschen einer Anmerkung (I0023, I0024), Anmerkung an der Datei (I0018), Anmerkung an entfernter Zeile (PO: nicht annotierbar), Markdown im Anmerkungstext, Speichern auf Platte, Anmerken in der Nebeneinander- und Zusammen-Ansicht (I0007, I0010: sie hängen sich an dieselbe Zeilenwahl und dasselbe Ereignis, die Wahl des Commits dort legt I0010 fest).

## Offene Fragen

Alle vier Fragen sind vom product-owner entschieden (`AI-Team/po-entscheidungen.md`, 2026-11-24, Zeilen „#17 I0017“); keine ist mehr offen.

1. **Mehrere Anmerkungen an derselben Zeile**: **entschieden — ja, ohne Grenze**; Anzeige und Ergebnis in Anlegereihenfolge. Die einzige Obergrenze ist das Lastprofil (500 Anmerkungen). Geltung: Zeilenanmerkungen, ebenso Dateianmerkungen (I0018). (Protokollzeile „Mehrere Anmerkungen an derselben Zeile?“)
2. **Steuer- und Richtungszeichen im Text**: **entschieden — ablehnen** mit 400 und einer Meldung, die den Grund nennt; Tab, LF, CRLF, Umlaute und Emoji sind erlaubt; der Text des Nutzers bleibt im Feld erhalten. Die abgelehnte Zeichenmenge gilt für **alle Anmerkungsarten** (Zeile, Datei, Ändern). (Protokollzeile „Steuer- und Richtungszeichen im Anmerkungstext“)
3. **Markdown im Anmerkungstext**: **entschieden — nein**, nur Text (`textContent`); das Ergebnis zitiert ihn unverändert. Später als eigene Karte ergänzbar. (Protokollzeile „Markdown im Anmerkungstext darstellen?“)
4. **Anmerkungen außerhalb der gezeigten Abschnitte**: **entschieden — nur der Hinweis** über dem Diff mit den Zeilennummern; der Text steht in „ganze Datei“ (R00008) und im Ergebnis; keine Liste mit Text über dem Diff. Geltung: beide Ansichten. (Protokollzeile „Anmerkungen an Zeilen außerhalb der gezeigten Abschnitte“)

Zusätzlich entschieden (Protokollzeile „Zuschnitt: Ändern und Löschen aus I0017 herausgelöst?“): der Schnitt gilt; „änderbar und löschbar“ liegt bei I0023 und I0024, die nach der Abnahme dieser Karte sofort freigegeben werden und vor I0018 laufen. Der Speicher vergibt schon in I0017 eine stabile Nummer je Anmerkung (Zähler statt Anzahl + 1).

## Manuelle Vorbereitungstätigkeiten
- Keine.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 9 Bubbles unterhalb I0017 (B0901–B0909), davon 5 Standard (2 h) und 4 unklar (2–4 h) — Untergrenze 18 h, obere Schätzung 26 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; mit einem gemessenen Slice rechne ich noch nicht um. Enthalten: nur I0017; I0023 und I0024 sind nicht bis Bubble geplant und nicht gezählt.

## Warum löst diese Anforderung das Problem?

Auslöser: der Mensch sieht im Diff eine Stelle, die falsch ist, und hat keinen Weg, sie der aufrufenden KI so zu nennen, dass sie sie ohne Rückfrage findet; Zeilennummern aus dem Diff abtippen kostet Zeit und verrutscht, sobald alte und neue Nummer abweichen. Wenn ein Klick auf die Zeile ein Notizfeld öffnet, der Server die Nummer **neu** der Zeile mit Commit und Datei speichert und „Beenden“ sie als `Datei:Zeile` mit dem Satz ausgibt, dann liest die KI die Stelle im Stand nach dem Commit, auf den sie ohnehin zugreift, und kann sie ohne Nachfrage ändern. Hebel gerade hier: diese Interaction schließt den Hot Path von der ersten Beobachtung bis zum Urteil auf stdout; vorher war der Rückkanal ohne Inhalt. Dass Text und Pfade nur als Text erscheinen und Steuerzeichen schon an der Tür abgewiesen werden, verhindert, dass ein präpariertes Repo oder eingefügter Text die Oberfläche oder das Terminal der KI-Sitzung verändert.

## Missing-Docs
- Genaue Zeichenmenge der Ablehnung — gilt für alle Anmerkungsarten, nicht nur für Zeilen (Unicode-Klassen Cc und die Richtungs-Formatzeichen aus `sichtbarTeile` in `web/diff-werte.js`) und das Verhalten von `ReplaceLineEndings` für U+2028/U+2029/U+0085 im Ergebnis — vor dem Bauen mit einer kleinen Tabelle im Test belegen.
- Fokus- und Tastaturverhalten einer Tabellenzeile mit `tabindex` und Pfeilbewegung im Browser (Playwright `press`) — mit einem kleinen Versuch vor Bubble B0908 belegen; I0015 vereinheitlicht später die Tastatur.

## Notizen

### Optionen (Ort der Anmerkung in der Oberfläche)

| Option | Verträglichkeit mit R00007/R00008 | Lesbarkeit | Aufwand |
|---|---|---|---|
| 1. Anmerkungszeile unter der Diff-Zeile, ohne `data-art` (gewählt) | Zeilenelemente und Farbauflage unberührt; Zählungen über `data-art` | Anmerkung steht an der Stelle | mittel |
| 2. Seitenleiste oder Popover am Rand | berührt keine Zeile | Stelle und Text getrennt, bei 500 Anmerkungen unübersichtlich | mittel |
| 3. Anmerkung in der Textzelle der Zeile | Färbung und Textvergleiche (`.c`) brechen | an der Stelle | gering, aber bricht R00007 |

Gewählt: 1.

### Optionen (Quelle der Anmerkungen in der Oberfläche)

| Option | Wirkung | Risiko |
|---|---|---|
| A. Server ist Wahrheit, `GET /api/anmerkungen` beim Start, Nachhalten nach dem Anlegen (gewählt) | Oberfläche zeigt, was das Ergebnis enthält, auch nach Neuladen | eine kleine, geschützte Leseschnittstelle |
| B. Nur die Oberfläche merkt sich die Anmerkungen | keine neue Schnittstelle | Neuladen leert die Anzeige, das Ergebnis enthält weiter alles — der Mensch beendet in der Annahme, nichts angemerkt zu haben |
| C. Server schickt die Anmerkungen mit jeder Diff-Antwort | kein eigener Abruf | koppelt `GET …/diff` (R00004, R00008) an den Speicher und verdoppelt Verhalten dort |

### Entscheidungen im Zuschnitt
- **Schnitt von I0017**: das Fertig-Kriterium „… änderbar und löschbar“ ergab beim Zählen 14–15 Bubbles (Probe: mehr als etwa acht Bubbles, Ändern und Löschen sind neue Requests). Geschnitten nach neuem Verhalten (Skill, „Inkrement oder Ausbaustufe“): **I0017** = anlegen und zeigen (hier), **I0023 Anmerkung ändern** und **I0024 Anmerkung löschen** parallel danach, jede für sich nützlich und von außen prüfbar. Der Speicher braucht für beide eine stabile Nummer (Zähler statt „Anzahl + 1“); der product-owner hat entschieden, sie **schon in I0017** einzuführen (kostet jetzt fast nichts, nachträglich wäre es Umbau). Die Nummerierung des Ergebnisses nach Position (R00002: „fortlaufend ab 1“) bleibt wie sie ist; das Zusammenspiel mit gelöschten Anmerkungen legt I0024 fest.
- **Klick und Auswahl**: ein Klick bei ausgewähltem Text öffnet nichts, damit Kopieren aus dem Diff möglich bleibt.
- **Tastatur** (Enter öffnet, Pfeile wechseln die Zeile) gehört hierher, weil ohne sie die Interaction nur mit der Maus bedienbar wäre; I0015 verallgemeinert.

### Verworfene Alternativen
- Modales Notizfeld: verdeckt die Zeile, auf die sich die Anmerkung bezieht.
- Anmerkung an der folgenden neuen Zeile bei entfernter Zeile: verfälscht die Stelle (PO: nicht annotierbar, Hinweis).
- Markdown in der Anzeige: widerspricht „Zitat“ im Ergebnis, öffnet Links und Bilder aus Text (Offene Frage 3).
- Eigene Endpunkte je Ansicht: Anmerkungen hängen an (Commit, Datei, Zeile), nicht an der Ansicht.
