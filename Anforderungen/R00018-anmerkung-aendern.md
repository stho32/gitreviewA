---
id: R00018
status: Neu
datum: 2026-11-24
---

# R00018: Anmerkung ändern

## Beschreibung

Der prüfende Mensch ändert den Text einer schon angelegten Anmerkung an ihrer Stelle: er betätigt am Anmerkungskopf „Ändern“, das Notizfeld steht mit dem vorhandenen Text da, und nach „Speichern“ trägt die Anmerkung den neuen Text. Angesprochen wird die Anmerkung über ihre **stabile Nummer** ([R00010](R00010-zeile-annotieren.md): Zähler statt „Anzahl + 1“), nicht über ihre Stelle — so bleiben die Stelle (Commit, Datei, Zeile) und die Position im Ergebnis unverändert, und nur dieser eine Eintrag wechselt. Das gilt für Zeilen- und für Dateianmerkungen (ohne Zeile, `<Datei> (ganze Datei)`, [R00002](R00002-beenden-mit-ergebnis.md)). Der Text folgt denselben Regeln wie beim Anlegen (nicht leer, höchstens 10 000 Zeichen, keine Steuer- und Richtungszeichen — er landet unverändert als Zitat auf stdout), und die Sperre aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) gilt auch hier. Löschen einer Anmerkung ist eine eigene Interaction (I0024), nicht Teil dieser Anforderung.

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen“ (Notizen an Zeilen oder Dateien), „Ergebnis als Rückkanal“ (der Text steht als Zitat auf stdout) und die Leitplanken „Nichts wird gespeichert“ (nur RAM) und „stdout gehört allein dem Ergebnis“.

Baut auf auf: [R00010](R00010-zeile-annotieren.md) (Anlegen, Anzeige am Diff, stabile Nummer, `Anmerkungstext`, `GET /api/anmerkungen`), [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat, Anfrageschutz, Anlegen-Schnittstelle) und [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Sperre je Stelle).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Anmerkung, Stelle (`Datei:Zeile`), Nummer (stabil, von der Position im Ergebnis verschieden), Ergebnis und `<Datei> (ganze Datei)` sind die von R00002 und R00010.

## Geschäftlicher Nutzen

Wer beim Prüfen merkt, dass eine Anmerkung den Punkt nicht trifft (Tippfehler, zu knapp, falsche Wortwahl), kann sie heute nur löschen und neu schreiben — dabei ändert sich die Position, die Nummer und unter Umständen die Stelle. Mit dem Ändern bleibt die Anmerkung, wo sie hingehört, und nur der Satz wird besser: die aufrufende KI liest am Ende denselben `Datei:Zeile`-Eintrag mit dem berichtigten Wortlaut. Die Anmerkung ist der einzige Text, den der Mensch an die KI gibt; ihn korrigieren zu können, ist der Unterschied zwischen einem brauchbaren Auftrag und einem, den die KI missdeutet. Das Ändern teilt sich Textregel, Sperre und Adressierung mit dem Anlegen — kein zweiter Weg, der etwas anderes prüft.

## Funktionale Anforderungen

- **Ändern**: „Ändern“ am Anmerkungskopf einer Anmerkung öffnet ein Notizfeld mit dem vorhandenen Text; „Speichern“ (Strg+Enter) schickt den neuen Text, „Abbrechen“ (Esc) schließt ohne Wirkung.
- **Adressierung**: geändert wird über die **stabile Nummer** der Anmerkung (R00010). Nummer, Stelle (Commit, Datei, Zeile) und Position im Ergebnis (Reihenfolge des Anlegens) bleiben; eine Änderung verbraucht keine Nummer und verschiebt nichts.
- **Beide Arten**: Zeilenanmerkungen (`Datei:Zeile`) und Dateianmerkungen ohne Zeile (`Datei (ganze Datei)`) sind änderbar.
- **Text**: dieselben Regeln wie beim Anlegen (nicht leer und nicht nur Leerraum, höchstens 10 000 Zeichen, keine Steuer- und Richtungszeichen; Tab, LF, CRLF, Umlaute und Emoji bleiben erlaubt). Abgelehnt wird mit 400 und der Meldung des Anlegens; der alte Text bleibt.
- **Sperre** ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)): eine Anmerkung an einer gesperrten Stelle wird abgelehnt (400, Sperrgrund) — dieselbe **eine** Regel wie beim Anlegen (`Stellensperre`, keine zweite Kopie). Die Stelle ist beim Ändern nicht wählbar (nur der Text), also lässt sich die Sperre nicht über eine Änderung umgehen: der Text ist kein Teil der Stelle, und die Prüfung läuft auf derselben Stelle (Commit, Datei) wie beim Anlegen.
- **Nach dem Beenden**: eine Änderung wird abgelehnt (409) wie das Anlegen; nichts wird geändert.
- **Schnittstelle**: `POST /api/anmerkungen/{nummer}` mit dem Körper `{ "text": "…" }` → 200 `{nummer, text}`, 400 (Text ungültig oder Stelle gesperrt), 404 (Nummer gibt es nicht), 409 (Lauf beendet); der Anfrageschutz bleibt unverändert (403 fremde Herkunft, 405 außer POST, 415 ohne `application/json`), `GET /api/anmerkungen` bleibt hinter der Host-Prüfung ohne CORS-Kopf.
- **Anzeige**: nach Erfolg steht der neue Text an derselben Stelle in genau einer Anmerkung; der Anmerkungskopf nennt die **stabile Nummer** der Anmerkung („Anmerkung n“), während das Ergebnis weiter nach Position nummeriert ([R00002](R00002-beenden-mit-ergebnis.md)); bei einem Fehler steht die Meldung im Feld, das Feld bleibt offen und der Text bleibt erhalten; „Speichern“ ist während der Anfrage gesperrt.
- **Ergebnis und Liste**: bleiben Byte für Byte wie in [R00010](R00010-zeile-annotieren.md) und [R00002](R00002-beenden-mit-ergebnis.md); nur der zitierte Text der einen Anmerkung wechselt, die `## n.`-Nummerierung nach Position und die Stelle bleiben.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): Die Änderung ist eine Suche über höchstens 500 Anmerkungen und ein Ersetzen im Speicher (ein Vorgang in konstanter Ordnung). Eine neue Messung ist nicht nötig; der Entwickler prüft, dass die Lastprofil-Messungen aus R00010 (500 Anmerkungen, Dateiwechsel ≤ 1 s, Messwert ≤ 0,7 s) und R00002 („Beenden“ ≤ 1 s) im Gesamtlauf grün bleiben.
- **Sicherheit** (Label `sicherheit`): Der neue Text ist Eingabe des Menschen und erscheint in der Oberfläche und auf stdout. In der Oberfläche nur über `textContent` (kein `innerHTML`, kein Markdown); auf stdout als Zitat (R00002). Der Text geht durch **dieselbe** Prüfung wie beim Anlegen (`Anmerkungstext`) — sonst wäre das Ändern der Umweg, auf dem ein Steuerzeichen doch auf stdout oder Markup ins DOM käme. Der Endpunkt liegt hinter demselben Anfrageschutz und derselben Host-Prüfung wie das Anlegen; Abweisungen nennen nie den Wortlaut des Textes.
- **Logging**: stdout bleibt bis „Beenden“ leer. Erfolgreiche Änderung: Debug-Zeile mit Nummer und Textlänge, **nie** der Text; abgelehnte Änderung mit Grund, ohne Text.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD (`kd-*.css`) und Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`, Anmerkungskopf), keine eigenen Vorgaben; das Feld ist per Tastatur vollständig bedienbar und trägt einen Namen für Screenreader; Fehlermeldungen als `role="alert"`.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (Commits `p`, `q`, `s`) wie in [R00004](R00004-diff-einer-datei-lesen.md) und `user-stories/R00018.md`: `q` ändert `lang.txt` (20 Zeilen, `z19` ist dort **Zeile 18**) und `src/b.txt` (`eins` 1/1, `−zwei`, `+ZWEI` neu 2, `+drei` neu 3). Aufruf `gitreviewA $q $p --kein-browser`; „wählen“ = Klick in der Dateiliste. Anmerkungen „über die Schnittstelle anlegen“ = `curl -X POST -H 'Content-Type: application/json' -d '{"commit":"<voller Hash>","datei":"…","zeile":n,"text":"…"}' http://127.0.0.1:<port>/api/anmerkungen`; für eine Dateianmerkung ohne `zeile`. „Ändern“ = Knopf am Anmerkungskopf der Anmerkungszeile. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird (Begründung unter „Tests“): **Integration** heißt NUnit gegen den Interactor oder den Endpunkt bzw. das Programm als Prozess mit echtem `git` im Wegwerf-Repo; **E2E** ist die einzige Playwright-Ebene (Bedienweg und Browser-Eigenes); **Unit** sind reine Funktionen (C# und `web/`-JS).

### Ändern wirkt
- [ ] 1. Gegeben `q` und `lang.txt` mit der Anmerkung „Klammer fehlt“ an Zeile 18, wenn man am Anmerkungskopf „Ändern“ betätigt, den Text zu „Klammer und Typprüfung fehlt“ ändert und „Speichern“ betätigt, dann antwortet der Server mit 200 und Nummer 1, steht unter `z19` genau eine Anmerkungszeile mit dem neuen Text, und nach „Beenden“ nennt stdout `Anmerkungen: 1`, `## 1. lang.txt:18`, `Commit: <voller Hash von q>` und `> Klammer und Typprüfung fehlt` bei Exit-Code 0. *Ebene: Integration (Interactor, Endpunkt, Programm für stdout) und E2E (Bedienweg und Anzeige).*

### Stelle, Position und Nummer bleiben
- [ ] 2. Gegeben `q` mit zwei Anmerkungen (Nummer 1 an `lang.txt:18` „erster“, Nummer 2 an `src/b.txt:2` „zweiter“), wenn Nummer 1 auf „erster, berichtigt“ geändert wird, dann nennt `GET /api/anmerkungen` weiter Nummer 1 vor Nummer 2, die Stelle von Nummer 1 bleibt `lang.txt:18`, und stdout nennt weiter `Anmerkungen: 2`, `## 1. lang.txt:18` mit „erster, berichtigt“ und `## 2. src/b.txt:2` mit „zweiter“. Rechnung: Position = Reihenfolge des Anlegens; 2 Anmerkungen bleiben 2. *Ebene: Unit (Speicher) und Integration (Interactor, Liste, Programm).*
- [ ] 3. Gegeben eine über die Schnittstelle angelegte Dateianmerkung ohne Zeile an `README.md` mit dem Text „Abschnitt Installation veraltet“, wenn ihr Text auf „Abschnitt Installation fehlt“ geändert wird, dann bleibt die Stelle `README.md (ganze Datei)`, und stdout nennt `## 1. README.md (ganze Datei)` mit dem neuen Text. *Ebene: Integration (Interactor, Endpunkt, Programm).*
- [ ] 4. Gegeben ein frischer Lauf, wenn nacheinander drei Anmerkungen angelegt, danach die zweite geändert und danach eine vierte angelegt wird, dann bekommt die vierte die Nummer 4 (die Änderung verbraucht keine Nummer), und die Liste nennt die Nummern 1, 2, 3, 4 in Anlegereihenfolge. Rechnung: 3 angelegt + 1 geändert (keine neue Nummer) + 1 angelegt = Nummern 1–4. *Ebene: Integration (Interactor).*

### Ablehnungen
- [ ] 5. Gegeben eine Anmerkung mit Nummer 1, wenn die Änderung für Nummer 7 angefragt wird (die es nicht gibt), dann wird sie abgelehnt (404) mit einer Meldung, und `GET /api/anmerkungen` nennt weiter genau Nummer 1 mit ihrem unveränderten Text. *Ebene: Integration (Interactor und Endpunkt).*
- [ ] 6. Gegeben ein beendeter Lauf, wenn eine Änderung angefragt wird, dann wird sie abgelehnt (409) wie das Anlegen und nichts geändert; das Ergebnis bleibt wie beim Beenden. *Ebene: Integration (Interactor und Endpunkt).*

### Eingabe und Sperre
- [ ] 7. Gegeben eine Anmerkung mit dem Text „alt“, wenn nacheinander ein Text von 10 001 Zeichen, ein leerer Text, ein Text aus nur Leerzeichen und ein Text mit U+001B geändert werden soll, dann wird jede Änderung abgelehnt (400 mit „Text ist länger als 10000 Zeichen“, „Text fehlt“ bzw. „Text enthält Steuer- oder Richtungszeichen“) und in Anzeige und Ergebnis steht weiter „alt“; ein Text aus drei Zeilen (erste „Prüfen“, zweite leer, dritte „größer ≥ 3“) mit Tab, CRLF, Umlaut und einem Emoji mit U+200D wird angenommen, und nach „Beenden“ steht jede Zeile als Zitat (`> Prüfen`, `>`, `> größer ≥ 3`). *Ebene: Unit (Textregel, bestehend) und Integration (Interactor; mehrzeiliges Zitat im Ergebnis: Programm).*
- [ ] 8. Gegeben eine Anmerkung, wenn ein Text mit U+202E, U+200F oder U+009B geändert werden soll, dann wird sie abgelehnt (400) und der alte Text bleibt. Gegeben eine Anmerkung an einer gesperrten Stelle (Übersicht meldet „Name nicht eindeutig“; über eine Fake-Übersicht), wenn ihr Text geändert werden soll, dann wird sie abgelehnt (400, „Diff nicht lesbar: Name nicht eindeutig“) und nichts geändert; an einer lesbaren Stelle wird sie angenommen. *Ebene: Unit (Textregel) und Integration (Interactor, Wächter mit Fake-Übersicht — in der Anwendung nicht erreichbar, weil schon das Anlegen an einer gesperrten Stelle abgelehnt wird; dieselbe eine Regel aus R00014).*

### Endpunkt und Schutz
- [ ] 9. Gegeben eine Anmerkung, wenn die Änderung mit fremdem Origin oder fremdem Host (`localhost:<port>`) angefragt wird, dann wird sie abgelehnt (403) und nichts geändert; eine Anfrage ohne Origin-Kopf (Befehlszeile) mit richtigem Host und `Content-Type: application/json` wird angenommen; ohne `application/json` wird abgelehnt (415), mit GET auf `POST /api/anmerkungen/{nummer}` abgelehnt (405); `GET /api/anmerkungen` antwortet weiter mit 200 und ohne `Access-Control-Allow-Origin`. *Ebene: Integration (Endpunkt auf freiem Port).*

### Anzeige und Bedienung
- [ ] 10. Gegeben `q` und `lang.txt` mit einer Anmerkung unter `z19`, nur Tastatur und Maus, wenn man „Ändern“ betätigt, dann heißt das Feld „Anmerkung zu lang.txt, Zeile 18“ und steht mit „Klammer fehlt“ darin, der Anmerkungskopf der Zeile nennt die stabile Nummer („Anmerkung 1“), der Fokus steht im Textfeld, Strg+Enter speichert, danach steht der neue Text unter `z19` in genau einer Anmerkungszeile, der Fokus steht wieder auf dem Anmerkungskopf, und die Anmerkungszeile trägt weiter kein `data-art`, `data-alt`, `data-neu`; ein zweiter Druck auf „Ändern“ öffnet kein zweites Feld. *Ebene: E2E (Bedienweg und Browser-Eigenes: Darstellung, Fokus) und Unit (`mitGeaendertemText`: Reihenfolge, unbekannte Nummer, Dateianmerkung).*
- [ ] 11. Gegeben ein offenes Änderungsfeld, wenn man „Abbrechen“ oder Esc betätigt, dann ist das Feld zu, unter `z19` steht weiter „Klammer fehlt“, und nichts ist geändert; ist die Antwort um 1,5 s verzögert, ist „Speichern“ während der Anfrage gesperrt, ein zweiter Klick sendet nicht erneut, und wird währenddessen `src/b.txt` gewählt und zurück zu `lang.txt`, steht der neue Text dann unter `z19`. *Ebene: E2E (Tastatur, Fokus, verzögerter Fake) und Integration (der Interactor adressiert die Nummer, nicht die Stelle).*
- [ ] 12. Gegeben ein offenes Änderungsfeld, wenn der Server mit 400 (Steuerzeichen), 404 (Nummer gibt es nicht) oder 500 antwortet oder gar nicht, dann steht die Meldung des Servers (400, 404) bzw. „Anmerkung konnte nicht geändert werden“ (5xx, Netz) im Feld, das Feld bleibt offen, der Text bleibt im Feld, und unter der Zeile steht weiter der alte Text. *Ebene: E2E (Fehlerpfade per `route`, Browser-Eigenes).*
- [ ] 13. Gegeben eine Anmerkung, deren Text über die Schnittstelle auf die Zeile `<img src=x onerror=alert(1)>` geändert wurde, wenn die Seite die Anmerkung zeigt und neu lädt, dann steht die Zeile als sichtbarer Text da (spitze Klammern sichtbar), es erscheint kein Dialog, es gibt kein `img`, und auf stdout steht sie nach „Beenden“ unverändert als Zitat. *Ebene: E2E (DOM-Sicherheit, Browser-Eigenes) und Integration (Programm).*

Grenz- und Leerfälle bedacht: Text genau 10 000 Zeichen wird angenommen, 10 001 abgelehnt (Kriterium 7); Leerfall „nur Leerraum“ und Fehlfall „Steuerzeichen“ sind in Kriterium 7; eine Nummer, die es nicht gibt, in Kriterium 5; eine Umbenennung, ein Wurzel-, Merge- und leerer Commit laufen über dieselbe Stelle und dieselbe Anmerkung wie beim Anlegen und bleiben dort gedeckt (I0023 liest keine Datei neu). Verworfen als eigene Kriterien: mehrere Anmerkungen an derselben Zeile ändern (derselbe Weg wie Kriterium 2); Ändern nach dem Beenden mit einer gesperrten Stelle (409 gewinnt wie in R00011); eine Zeitmessung für die Änderung (die vorhandenen Lastprofil-Messungen gelten unverändert); eine Kennzeichnung „geändert“ im Ergebnis (Frage 3: nein).

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (Themenordner in `src/GitReviewA/`, Oberfläche unter `web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Anmerkungen/` — neuer Interactor `AnmerkungAendernInteractor`, `Aenderungswunsch` und `Aenderungsergebnis` (DTOs), neuer dünner Adapter `AnmerkungAendernEndpunkt`; `Anmerkungsspeicher` um die Änderungsoperation erweitert.
- `Server/` — eine Route `POST /api/anmerkungen/{nummer}` in `Webserver.BildeRueckkanal`.
- `web/` — `anmerkungen-werte.js` (rein: `mitGeaendertemText`) und `anmerkungen.js` (Anmerkungskopf mit „Ändern“, Feld, Anfrage, Anzeige), Stil in `gitreviewa.css`.
- `tests/GitReviewA.Tests/Akzeptanz/` — Treiber und Sprache wie `ZeileAnnotierenTests`; `e2e/` — ein Spec, DSL `zeile-annotieren` und Treiber `anmerkungen-oberflaeche` erweitert.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden und wie die Klassen heißen, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Ändern wählen** (Oberfläche) — Klick auf „Ändern“ am Anmerkungskopf → das Notizfeld ersetzt den Text der Anmerkungszeile, vorbelegt mit dem vorhandenen Text; der Anmerkungskopf und damit die Position bleiben stehen.
2. **Speichern** — `POST /api/anmerkungen/{nummer}` mit `{text}`; „Speichern“ ist gesperrt, bis die Antwort da ist.
   - 2.1 Server: Anfrageschutz (R00002, unverändert) → `AnmerkungAendernInteractor.Aendere`.
   - 2.2 Interactor: Text prüfen (`Anmerkungstext`, wie beim Anlegen) → Nummer im Speicher nachschlagen (sonst 404) → Sperre der gefundenen Stelle prüfen (R00014) → Speicher ersetzt den Text (409 nach dem Beenden).
   - 2.3 200: die Anzeige nimmt den neuen Text an derselben Stelle auf (`mitGeaendertemText`) und lädt nach; nur zeichnen, wenn (Commit, Pfad) noch die gewählte Datei sind.
   - 2.4 400/404/409/500/Netz: Meldung im Feld, Feld bleibt offen, Text bleibt.
3. **Ergebnis** — unverändert (`ErgebnisFormatierer`): dieselbe Anmerkung an derselben Position, nur mit dem neuen Text als Zitat.

### Grobentwurf

**Einstiegsstellen:** `Anmerkungsspeicher`, die Anmerkungszeile in `web/anmerkungen.js`, die Route in `Webserver.BildeRueckkanal`; `Anfrageschutz`, `GeschuetzterEndpunkt`, `Stellensperre`, `Anmerkungstext` und `ErgebnisFormatierer` bleiben unverändert.

- `Aenderungswunsch` (DTO, immutable) — Nummer aus dem Pfad und der ungeprüfte Text aus dem Körper.
- `Aenderungsergebnis` (DTO, immutable) — Ausgang (`Geaendert`, `Ungueltig`, `NichtGefunden`, `Beendet`), die geänderte Anmerkung (bei Erfolg) und der Grund.
- `Anmerkungsspeicher` (Operation mit Zustand, erweitert) — `bool VersucheZuAendern(int nummer, string text, out Anmerkung? geaendert)`; sucht und ersetzt unter derselben Sperre wie Anhängen und Abschließen, lässt Nummer, Commit, Datei und Zeile stehen, `false` nach dem Abschließen.
- `AnmerkungAendernInteractor` (Interactor) — `Aenderungsergebnis Aendere(Aenderungswunsch? wunsch)`; ruft die bestehende Textregel `Anmerkungstext` (B0901), `Stellensperre` (bestehend, R00014) und den Speicher; protokolliert Nummer und Textlänge, nie Text.
- `AnmerkungAendernEndpunkt` (dünner Adapter) — Nummer aus dem Pfad und `{text}` aus dem Körper, ruft den Interactor, übersetzt in 200/400/404/409.
- JS `mitGeaendertemText(anmerkungen, nummer, text)` (rein) — dieselbe Liste in derselben Reihenfolge mit dem neuen Text an der Nummer; `anmerkungen.js` (Adapter: Anmerkungskopf, Feld, Anfrage, DOM mit `textContent`).

### Änderungen an bestehenden Klassen

- `Anmerkungsspeicher`: neue Operation `VersucheZuAendern` neben `VersucheAnzuhaengen` und `VersucheAbzuschliessen` (dieselbe Sperre).
- `Webserver.BildeRueckkanal`: zusätzliche Route `POST /api/anmerkungen/{nummer}`; `POST /api/anmerkungen`, `GET /api/anmerkungen`, `/api/haken` und `/api/beenden` unberührt.
- `web/anmerkungen.js`: `anmerkungszeileElement` bekommt den Anmerkungskopf mit „Ändern“; ein Änderungsfeld mit Vorbelegung, Speichern und Abbrechen; die Antwort ersetzt den Text (`mitGeaendertemText`) und lädt nach.
- `web/anmerkungen-werte.js`: neue reine Funktion `mitGeaendertemText`.
- Unverändert (bewusst): `Anfrageschutz` und `GeschuetzterEndpunkt` (der Weg bleibt POST), `Stellensperre`, `Anmerkungstext`, `AnmerkungsPruefer`, `ErgebnisFormatierer`.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction; Akzeptanzkriterien als NUnit-Integration gegen den Interactor und den Endpunkt (Treiber in-process, echtes `git` im Wegwerf-Repo); Playwright nur für den Bedienweg des Änderns und Browser-Eigenes — **kein** Hot-Path-Fall, das Ändern liegt nicht auf dem Hot Path (`AI-Team/factory.md`, „Testbarkeit“).

**Unit (rein):** `Anmerkungsspeicher.VersucheZuAendern` (ändern, unbekannte Nummer, zweimal ändern, nach dem Abschließen, paralleles Ändern); `Anmerkungstext` (bestehende Tabelle, unverändert); JS `mitGeaendertemText` (Nummer in der Mitte, unbekannte Nummer, Dateianmerkung ohne Zeile, Reihenfolge und Länge bleiben).
**Integration:** die Kriterien 1 bis 9 gegen `AnmerkungAendernInteractor` und den Endpunkt (200/400/404/409; 403/405/415; Textregeln; Sperre per Fake-Übersicht); Programm als Prozess (Ergebnis Byte für Byte auf stdout, Nummer verbraucht keine, mehrzeiliges Zitat); Mutanten: Sperrprüfung aus → Kriterium 8 rot, Textprüfung aus → Kriterium 7 rot, Änderung verbraucht eine Nummer → Kriterium 4 rot, Text ersetzt die ganze Anmerkung (Stelle/Nummer verloren) → Kriterium 2 rot.
**E2E (Playwright headless, über DSL und Treiber):** ein Spec — der Bedienweg (Anmerkung sichtbar → „Ändern“ → Speichern → neuer Text an derselben Stelle) und Browser-Eigenes (Fokus, Tastatur, Fehlerpfade per `route`, DOM-Sicherheit, verzögerte Antwort); Wegwerf-Repo A und eine Dateianmerkung.

## Abhängigkeiten

- Abhängig von: I0017 Zeile annotieren (R00010, grün; Speicher mit stabiler Nummer, `Anmerkungstext`, `GET /api/anmerkungen`), I0019 Beenden mit Ergebnis (R00002, grün; Ergebnisformat, Anfrageschutz, Anlegen-Schnittstelle), I0030 Sperre (R00014, grün; dieselbe Regel).
- Blockiert: I0018 Datei annotieren (Braucht I0023 und I0024: eine Dateianmerkung wird über denselben Weg geändert).

Nicht Teil dieser Anforderung: Löschen einer Anmerkung (I0024), Ändern der Stelle (Commit, Datei oder Zeile) einer Anmerkung, Anmerkung in der Neben- und Zusammen-Ansicht ändern (I0007, I0010 — sie hängen sich an dieselbe Anmerkungszeile und denselben Anmerkungskopf), Tastenkürzel für „Ändern“ (I0015), eine Kennzeichnung „geändert“ im Ergebnis (Frage 3: nein), Speichern auf Platte.

## Offene Fragen

Keine. Die drei Fragen sind vom product-owner entschieden (2026-11-24, `AI-Team/po-entscheidungen.md`, Zeilen 106–108); die Antworten sind oben eingearbeitet.

1. ~~**Statuscode bei unbekannter Nummer**: 404 oder 400 wie beim Anlegen unbekannter Stellen?~~ **Entschieden: 404** — die Nummer steht im Pfad und benennt die Anmerkung als Ressource; „Nummer gibt es nicht“ (404) bleibt von „Text ungültig oder Stelle gesperrt“ (400) und „Lauf beendet“ (409) unterscheidbar. Kriterium 5 gilt dafür wörtlich, wie es dasteht; I0024 spiegelt denselben Weg.
2. ~~**Anmerkungsnummer in der Oberfläche**: zeigt der Anmerkungskopf die stabile Nummer (Entwurf Fassung 2 zeigt „Anmerkung n“)?~~ **Entschieden: ja** — der Kopf nennt die **stabile Nummer** („Anmerkung n“), das Ergebnis nummeriert weiter nach Position ([R00002](R00002-beenden-mit-ergebnis.md)); eingearbeitet als Satz unter „Anzeige“ und als Zusicherung in Kriterium 10. Abweichung von der Empfehlung des planers: die Anzeige wird dort mitgeprüft statt ungeprüft zu bleiben (der E2E öffnet den Anmerkungskopf schon für „Ändern“).
3. ~~**Kennzeichnung „geändert“ im Ergebnis**: soll eine geänderte Anmerkung im Ergebnis als geändert erscheinen?~~ **Entschieden: nein** — das Ergebnisformat ist Vertrag mit der lesenden KI ([R00002](R00002-beenden-mit-ergebnis.md), Byte für Byte); eine Änderung ist eine Korrektur des Menschen, keine Information für die KI. Steht so unter „Nicht Teil dieser Anforderung“ und in den verworfenen Kriterien.

Ohne Rückfrage entschieden (im Bericht festgehalten): nur der Text ist änderbar, nicht die Stelle (so die Notiz der WBS und das Fertig-Kriterium); die Adressierung geht über die stabile Nummer; der Weg ist `POST /api/anmerkungen/{nummer}` mit `{text}` (der geteilte `Anfrageschutz` bleibt unverändert POST); Stelle und Position im Ergebnis bleiben; dieselben Text- und Sperrregeln wie beim Anlegen.

## Manuelle Vorbereitungstätigkeiten
- Keine.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 6 Bubbles unterhalb I0023 (B1701–B1706), davon 3 klar (2 h) und 3 unklar (2–4 h) — Untergrenze 12 h, obere Schätzung 18 h. Enthalten: nur I0023; I0024 (Löschen) ist nicht bis Bubble geplant und nicht gezählt. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; mit einem gemessenen Slice rechne ich noch nicht um.

## Warum löst diese Anforderung das Problem?

Auslöser: Der Mensch schreibt beim Prüfen einen Satz, und erst wenn er ihn stehen sieht, merkt er, dass er nicht passt — heute hilft nur Löschen und Neuschreiben. Das Zielbild ist ein Rückkanal, dessen Einträge so gut sind wie der Prüfer sie meint, ohne dass er die Stelle verliert. Kette: Der Anmerkungskopf bekommt „Ändern“ → das Feld steht mit dem alten Text da, Speichern schickt ihn über `POST /api/anmerkungen/{nummer}` (Kriterium 1, 10) → der Interactor prüft denselben Text und dieselbe Sperre wie das Anlegen, der Speicher tauscht unter der Sperre nur den Text und lässt Nummer, Stelle und Position stehen (Kriterien 2, 3, 4, 7, 8) → die Liste und das Ergebnis nennen denselben `Datei:Zeile`-Eintrag mit dem neuen Wortlaut (Kriterien 1, 2, 3). Der Hebel ist die **stabile Nummer** aus R00010: erst sie macht die Änderung zu einer Korrektur derselben Anmerkung statt zu einem neuen Eintrag, und weil Löschen (I0024) und Dateianmerkungen (I0018) dieselbe Nummer und dieselbe Stelle brauchen, ist sie der Punkt, an dem beide anschließen. Eine Änderung, die den Text an der Oberfläche tauscht, ohne denselben Prüfpfad zu gehen, wäre der Umweg um die Text- und Sperrregel — deshalb teilt sie beides mit dem Anlegen.

## Missing-Docs

- Der Anmerkungskopf und das Änderungsfeld im Entwurf Fassung 2 (`.anm-kopf`, `.btn-text`) — mit einem kleinen Versuch vor dem Bauen belegen (Kopfzeile, Fokus beim Öffnen, Rückkehr des Fokus, Tab-Reihenfolge innerhalb der Anmerkungszeile); I0027 und I0015 vereinheitlichen später die Gestaltung und die Tasten.
- Zusammenwirken des „Ändern“-Knopfs am Anmerkungskopf mit dem wandernden `tabindex` der Diff-Zeilen aus B0908 (R00010) — kleiner Versuch, bevor das Feld gebaut wird.

## Notizen

### Optionen (Weg der Änderung)

| Option | Wirkung | Risiko/Aufwand |
|---|---|---|
| A. `POST /api/anmerkungen/{nummer}` mit `{text}` (gewählt) | `Anfrageschutz` und `GeschuetzterEndpunkt` bleiben unverändert (nur POST); die Route ist vom Sammelpfad getrennt; I0024 kann denselben Weg spiegeln | klein: ein Adapter und eine Route |
| B. `PUT /api/anmerkungen/{nummer}` | sprachlich passender | `Anfrageschutz` und `GeschuetzterEndpunkt` müssten eine Methodenmenge erlauben (Umbau am geteilten Schutz von Beenden, Haken und Anlegen); `Allow`-Kopf und Tests der drei anderen Endpunkte betroffen |
| C. `POST /api/anmerkungen` mit `nummer` im Körper | kein neuer Pfad | vermischt Anlegen und Ändern in einem Endpunkt; die Antwort wird zweideutig (201 gegen 200), der Sammelpfad trägt zwei Bedeutungen |

Gewählt: A. Der geteilte Sicherheitsschutz bleibt unangetastet, und die Adressierung über die Nummer ist für I0024 vorbereitet.

### Optionen (Ort des Änderungsfelds)

| Option | Wirkung | Risiko |
|---|---|---|
| A. Das Feld ersetzt den Text der Anmerkungszeile, der Anmerkungskopf bleibt (gewählt) | die Anmerkung bleibt an ihrer Stelle sichtbar adressiert, der Fokus bleibt in der Zeile | gering |
| B. Das Feld erscheint unter der Anmerkungszeile | zwei Zeilen je Änderung; `zeigeAnmerkungen` müsste fremde Feldzeilen unter Anmerkungen unterscheiden | mehr Umbau in `anmerkungen.js` |
| C. Ein modales Feld | verdeckt die Stelle und die Nachbar-Anmerkungen | widerspricht „Anmerkungen stehen an ihrer Stelle“ |

Gewählt: A.

### Verworfene Alternativen

- Stellen-Änderung in derselben Interaction — verworfen: das Fertig-Kriterium der WBS sagt „Stelle … bleibt“; die Stelle zu ändern wäre Löschen und Neuanlegen.
- Zwei Endpunkte (Anlegen und Ändern am Sammelpfad) — verworfen: Zweideutigkeit der Antwort (Option C).
- Ändern als erneutes `POST /api/anmerkungen` mit neuer Nummer und Löschen der alten — verworfen: verändert Position und Reihenfolge (Kriterium 2), verbraucht eine Nummer und widerspricht der stabilen Nummer aus R00010.
- Eigene Textregel für die Änderung — verworfen: dieselbe Funktion wie beim Anlegen, sonst wäre das Ändern der Umweg um die Steuerzeichen-Regel.
- Playwright für jede Bedienaussage — verworfen: Ändern liegt nicht auf dem Hot Path; ein Spec für Bedienweg und Browser-Eigenes genügt.
