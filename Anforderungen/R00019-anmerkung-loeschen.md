---
id: R00019
status: Neu
datum: 2026-11-24
---

# R00019: Anmerkung löschen

## Beschreibung

Der prüfende Mensch löscht eine schon angelegte Anmerkung an ihrer Stelle: er betätigt am Anmerkungskopf „Löschen“, und die Anmerkung verschwindet aus der Anzeige und aus dem Ergebnis. Angesprochen wird sie über ihre **stabile Nummer** ([R00010](R00010-zeile-annotieren.md): Zähler statt „Anzahl + 1“), wie beim Ändern; die Nummer einer gelöschten Anmerkung wird **nie wiederverwendet** (der Zähler läuft weiter), während das Ergebnis die **verbleibenden** Anmerkungen lückenlos nach Position ab 1 nummeriert ([R00002](R00002-beenden-mit-ergebnis.md)). Das gilt für Zeilen- und für Dateianmerkungen (ohne Zeile, `<Datei> (ganze Datei)`). Löschen ist **keine Aussage** über die Stelle — anders als Anlegen und Ändern prüft es die Sperre aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) **nicht**: eine Anmerkung an einer gesperrten Stelle bleibt löschbar (wer eine falsche Anmerkung loswerden will, darf nicht an einer Stelle festsitzen, die er nicht lesen konnte). Ändern einer Anmerkung ist eine eigene Interaction (I0023), nicht Teil dieser Anforderung.

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen“ (Notizen an Zeilen oder Dateien), „Ergebnis als Rückkanal“ (die KI bekommt nur die Anmerkungen, die der Mensch stehen lassen will) und die Leitplanken „Nichts wird gespeichert“ (nur RAM) und „stdout gehört allein dem Ergebnis“.

Baut auf auf: [R00010](R00010-zeile-annotieren.md) (Anlegen, Anzeige am Diff, stabile Nummer, `GET /api/anmerkungen`), [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat, Nummerierung nach Position, Anfrageschutz, Anlegen-Schnittstelle) und [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Sperre je Stelle — hier als **nicht** anwendend festgehalten).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Anmerkung, Stelle (`Datei:Zeile`), Nummer (stabil, von der Position im Ergebnis verschieden), Ergebnis und `<Datei> (ganze Datei)` sind die von R00002 und R00010.

## Geschäftlicher Nutzen

Eine Anmerkung ist der einzige Text, den der Mensch an die KI zurückgibt. Trifft er den Punkt nicht (falsche Stelle erwischt, Doppelung, versehentlich abgeschickt), steht sie sonst für immer im Ergebnis: die KI arbeitet an einem Auftrag, den der Mensch nicht mehr will, und der Mensch kann ihn nur „überstimmen“, indem er danebenschreibt. Mit dem Löschen verschwindet der Eintrag an seiner Stelle, und die übrigen rücken im Ergebnis lückenlos nach — die lesende KI sieht genau die Anmerkungen, die stehen bleiben sollen, ohne Lücken und ohne Doppelzählung. Löschen teilt Adressierung und Endpunkt-Weg mit dem Ändern ([R00018](R00018-anmerkung-aendern.md)); es ist der Gegenpol dazu: der Text wird nicht besser, der Eintrag wird zurückgenommen.

## Funktionale Anforderungen

- **Löschen**: „Löschen“ am Anmerkungskopf einer Anmerkung entfernt sie; sie verschwindet aus der Anzeige und aus dem Ergebnis. Eine eigene Bestätigung gibt es nicht (der Entwurf Fassung 2 zeigt den Knopf direkt am Anmerkungskopf, siehe „Offene Fragen“).
- **Adressierung**: gelöscht wird über die **stabile Nummer** der Anmerkung (R00010). Eine gelöschte Nummer wird **nie wiederverwendet** (der Zähler bleibt unberührt, das Löschen verbraucht keine Nummer); die übrigen Anmerkungen behalten ihre Stelle (Commit, Datei, Zeile) und ihre Anlegereihenfolge.
- **Ergebnisnummerierung**: das Ergebnis nummeriert die **verbleibenden** Anmerkungen **lückenlos nach Position ab 1** (R00002: „fortlaufend ab 1, in der Reihenfolge des Anlegens“); die stabile Nummer erscheint im Ergebnis nicht.
- **Beide Arten**: Zeilenanmerkungen (`Datei:Zeile`) und Dateianmerkungen ohne Zeile (`Datei (ganze Datei)`) sind löschbar.
- **Sperre** ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)): das Löschen prüft die Sperre **nicht** — eine Anmerkung an einer gesperrten Stelle (Commit, Name) wird gelöscht (200). Begründung: Löschen entfernt eine Aussage, es trifft keine neue; eine Sperre würde eine falsche Anmerkung unlöschbar machen. Anlegen und Ändern bleiben an derselben Stelle abgelehnt (400, R00014) — die Asymmetrie ist gewollt.
- **Nach dem Beenden**: ein Löschen wird abgelehnt (409) wie das Anlegen; nichts wird geändert (der Schnappschuss für das Ergebnis ist schon genommen).
- **Schnittstelle**: `POST /api/anmerkungen/{nummer}/loeschen` (leerer Körper oder `{}`) → 200 `{nummer}`, 404 (Nummer gibt es nicht), 409 (Lauf beendet); der Anfrageschutz bleibt unverändert (403 fremde Herkunft, 405 außer POST, 415 ohne `application/json`), `GET /api/anmerkungen` bleibt hinter der Host-Prüfung ohne CORS-Kopf. `POST /api/anmerkungen` (Anlegen) und `POST /api/anmerkungen/{nummer}` (Ändern, I0023) bleiben unberührt.
- **Anzeige**: nach Erfolg verschwindet genau eine Anmerkungszeile; die übrigen bleiben an ihrer Stelle stehen; bei einem Fehler steht die Meldung am Anmerkungskopf, die Anmerkung bleibt sichtbar, „Löschen“ ist während der Anfrage gesperrt. Der Server bleibt Quelle der Wahrheit (die Anzeige lädt nach der Antwort neu).
- **Ergebnis und Liste**: bleiben für die verbleibenden Anmerkungen Byte für Byte wie in [R00010](R00010-zeile-annotieren.md) und [R00002](R00002-beenden-mit-ergebnis.md); nur die gelöschte fehlt, die Positionen der übrigen rücken lückenlos nach, und `Anmerkungen: n` zählt die verbleibenden. Nach dem Löschen der letzten Anmerkung steht genau das leere Ergebnis aus R00002 (`Keine Anmerkungen.`).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): Das Löschen ist eine Suche über höchstens 500 Anmerkungen und ein Entfernen im Speicher (ein Vorgang in linearer Ordnung). Eine neue Messung ist nicht nötig; der Entwickler prüft, dass die Lastprofil-Messungen aus R00010 (500 Anmerkungen, Dateiwechsel ≤ 1 s, Messwert ≤ 0,7 s) und R00002 („Beenden“ ≤ 1 s) im Gesamtlauf grün bleiben.
- **Sicherheit** (Label `sicherheit`): Die Nummer kommt aus dem Pfad, es gibt keinen Nutzertext. Das Löschen entfernt den Text aus dem Speicher; es gibt keine Ausgabe des gelöschten Wortlauts (Anzeige, Protokoll, Ergebnis). Der Endpunkt liegt hinter demselben Anfrageschutz und derselben Host-Prüfung wie das Anlegen; Abweisungen nennen nie den Wortlaut. Die Anzeige entfernt die Zeile über DOM-Operationen, nie über neu geschriebenes HTML.
- **Logging**: stdout bleibt bis „Beenden“ leer. Erfolgreiches Löschen: Debug-Zeile mit Nummer, **nie** der Text; abgelehntes Löschen mit Grund, ohne Text.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD (`kd-*.css`) und Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`, Anmerkungskopf `.anm-kopf` mit „Ändern“ und „Löschen“), keine eigenen Vorgaben; der Knopf ist per Tastatur erreichbar und trägt einen Namen für Screenreader; Fehlermeldungen als `role="alert"`.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (Commits `p`, `q`, `s`) wie in [R00004](R00004-diff-einer-datei-lesen.md) und `user-stories/R00019.md`: `q` ändert `lang.txt` (20 Zeilen, `z19` ist dort **Zeile 18**) und `src/b.txt` (`eins` 1/1, `−zwei`, `+ZWEI` neu 2, `+drei` neu 3). Aufruf `gitreviewA $q $p --kein-browser`; „wählen“ = Klick in der Dateiliste. Anmerkungen „über die Schnittstelle anlegen“ = `curl -X POST -H 'Content-Type: application/json' -d '{"commit":"<voller Hash>","datei":"…","zeile":n,"text":"…"}' http://127.0.0.1:<port>/api/anmerkungen`; für eine Dateianmerkung ohne `zeile`. „Löschen“ = Knopf am Anmerkungskopf der Anmerkungszeile. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird (Begründung unter „Tests“): **Integration** heißt NUnit gegen den Interactor oder den Endpunkt bzw. das Programm als Prozess mit echtem `git` im Wegwerf-Repo; **E2E** ist die einzige Playwright-Ebene (Bedienweg und Browser-Eigenes); **Unit** sind reine Funktionen (C# und `web/`-JS).

### Löschen wirkt
- [ ] 1. Gegeben `q` und `lang.txt` mit der Anmerkung „Klammer fehlt“ an Zeile 18, wenn man am Anmerkungskopf „Löschen“ betätigt, dann antwortet der Server mit 200 und Nummer 1, unter `z19` steht keine Anmerkungszeile mehr, und nach „Beenden“ besteht stdout aus genau `# Ergebnis manueller Review`, einer Leerzeile, `Keine Anmerkungen.` und einem Zeilenumbruch bei Exit-Code 0. *Ebene: Integration (Interactor, Endpunkt, Programm für stdout) und E2E (Bedienweg und Anzeige).*

### Stelle und Reihenfolge der übrigen bleiben
- [ ] 2. Gegeben `q` mit zwei Anmerkungen (Nummer 1 an `lang.txt:18` „erster“, Nummer 2 an `src/b.txt:2` „zweiter“), wenn Nummer 1 gelöscht wird, dann nennt `GET /api/anmerkungen` nur noch Nummer 2 an `src/b.txt:2`, und stdout nennt `Anmerkungen: 1`, `## 1. src/b.txt:2` mit „zweiter“ (die verbliebene rückt auf Position 1). Rechnung: 2 Anmerkungen − 1 gelöscht = 1; die stabile Nummer 2 bleibt, die Position wird 1. *Ebene: Unit (Speicher) und Integration (Interactor, Liste, Programm).*
- [ ] 3. Gegeben `q` mit einer über die Schnittstelle angelegten Dateianmerkung ohne Zeile an `README.md` („Abschnitt Installation veraltet“) und einer Zeilenanmerkung an `lang.txt:18`, wenn die Dateianmerkung gelöscht wird, dann fehlt die Stelle `README.md (ganze Datei)`, und stdout nennt `Anmerkungen: 1` und `## 1. lang.txt:18`. *Ebene: Integration (Interactor, Endpunkt, Programm).*
- [ ] 4. Gegeben ein frischer Lauf, wenn nacheinander drei Anmerkungen angelegt, danach die zweite gelöscht und danach eine vierte angelegt wird, dann bekommt die vierte die Nummer 4 (die gelöschte Nummer 2 wird nicht wiederverwendet), `GET /api/anmerkungen` nennt die Nummern 1, 3, 4 in Anlegereihenfolge, und stdout nennt `Anmerkungen: 3` mit `## 1.`, `## 2.`, `## 3.` lückenlos nach Position. Rechnung: 3 angelegt (Nummern 1, 2, 3) − 1 gelöscht (keine Nummer frei) + 1 angelegt (Nummer 4) = Nummern 1, 3, 4; Positionen 1–3. *Ebene: Integration (Interactor).*

### Ablehnungen
- [ ] 5. Gegeben eine Anmerkung mit Nummer 1, wenn das Löschen für Nummer 7 angefragt wird (die es nicht gibt), dann wird es abgelehnt (404) mit einer Meldung, und `GET /api/anmerkungen` nennt weiter genau Nummer 1 mit ihrem unveränderten Text. *Ebene: Integration (Interactor und Endpunkt).*
- [ ] 6. Gegeben ein beendeter Lauf, wenn ein Löschen angefragt wird, dann wird es abgelehnt (409) wie das Anlegen und nichts geändert; das Ergebnis bleibt wie beim Beenden. *Ebene: Integration (Interactor und Endpunkt).*

### Sperre greift nicht
- [ ] 7. Gegeben eine Anmerkung an einer Stelle, die die Übersicht als gesperrt meldet („Diff nicht lesbar: Name nicht eindeutig“; über eine Fake-Übersicht — in der Anwendung nicht erreichbar, weil schon das Anlegen dort abgelehnt wird), wenn sie gelöscht wird, dann wird sie gelöscht (200) und fehlt danach in Anzeige und Ergebnis; das **Anlegen** an derselben Stelle bleibt abgelehnt (400, Sperrgrund, R00014). Rechnung: Löschen ist fail-open, Anlegen fail-closed. *Ebene: Integration (Interactor mit Fake-Übersicht; Wächter).*

### Endpunkt und Schutz
- [ ] 8. Gegeben eine Anmerkung, wenn das Löschen mit fremdem Origin oder fremdem Host (`localhost:<port>`) angefragt wird, dann wird es abgelehnt (403) und nichts geändert; eine Anfrage ohne Origin-Kopf (Befehlszeile) mit richtigem Host und `Content-Type: application/json` wird angenommen; ohne `application/json` wird abgelehnt (415), mit GET auf `POST /api/anmerkungen/{nummer}/loeschen` abgelehnt (405); `GET /api/anmerkungen` antwortet weiter mit 200 und ohne `Access-Control-Allow-Origin`. *Ebene: Integration (Endpunkt auf freiem Port).*

### Anzeige und Bedienung
- [ ] 9. Gegeben `q` und `lang.txt` mit einer Anmerkung unter `z19`, nur Tastatur und Maus, wenn man am Anmerkungskopf „Löschen“ betätigt, dann ist die Anmerkungszeile weg, unter `z19` steht keine Anmerkungszeile mehr, und nach dem Neuladen der Seite (`GET /api/anmerkungen`) erscheint sie nicht wieder; eine zweite Betätigung an derselben Stelle gibt es nicht (die Zeile ist entfernt), und die übrigen Anmerkungen bleiben unberührt. *Ebene: E2E (Bedienweg und Browser-Eigenes: Darstellung) und Unit (`ohneAnmerkung`: Nummer in der Mitte, unbekannte Nummer, Dateianmerkung ohne Zeile, Reihenfolge und Länge).*
- [ ] 10. Gegeben ein offener Lauf mit einer Anmerkung, wenn der Server mit 404 (Nummer gibt es nicht) oder 500 antwortet oder gar nicht, dann steht die Meldung des Servers (404) bzw. „Anmerkung konnte nicht gelöscht werden“ (5xx, Netz) am Anmerkungskopf, und die Anmerkung bleibt sichtbar und im Ergebnis; ist die Antwort um 1,5 s verzögert, ist „Löschen“ während der Anfrage gesperrt, ein zweiter Klick sendet nicht erneut, und wird währenddessen `src/b.txt` gewählt und zurück zu `lang.txt`, ist die Anmerkung danach gelöscht und fehlt im Ergebnis. *Ebene: E2E (Fehlerpfade per `route`, verzögerter Fake, Browser-Eigenes) und Integration (der Interactor adressiert die Nummer, nicht die Stelle).*
- [ ] 11. Gegeben `q` mit genau einer Anmerkung, wenn sie gelöscht und danach „Beenden“ betätigt wird, dann besteht stdout aus genau `# Ergebnis manueller Review`, einer Leerzeile, `Keine Anmerkungen.` und einem Zeilenumbruch bei Exit-Code 0 (Byte für Byte wie [R00002](R00002-beenden-mit-ergebnis.md) ohne Anmerkungen). *Ebene: Integration (Programm als Prozess).*

Grenz- und Leerfälle bedacht: die letzte Anmerkung löschen (Kriterium 11); eine Nummer, die es nicht gibt, und ein zweites Löschen derselben Nummer (derselbe Weg wie Kriterium 5, die zweite Anfrage trifft 404); Löschen nach dem Beenden (Kriterium 6); Dateianmerkung ohne Zeile (Kriterium 3); die gelöschte Nummer bleibt verbraucht (Kriterium 4); eine Umbenennung, ein Wurzel-, Merge- und leerer Commit laufen über dieselbe Stelle und dieselbe Anmerkung wie beim Anlegen und bleiben dort gedeckt (I0024 liest keine Datei neu). Verworfen als eigene Kriterien: eine DOM-Sicherheitsprobe für den gelöschten Text (das Löschen schreibt keinen Text; die verbliebenen Texte prüft R00010 Kriterium „fremder Text bleibt Text“); eine Zeitmessung für das Löschen (die vorhandenen Lastprofil-Messungen gelten unverändert); eine Kennzeichnung „gelöscht“ im Ergebnis (das Format ist Vertrag mit der KI, R00002 — eine gelöschte Anmerkung erscheint gar nicht); Ändern der Stelle (I0023).

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (Themenordner in `src/GitReviewA/`, Oberfläche unter `web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Anmerkungen/` — neuer Interactor `AnmerkungLoeschenInteractor`, `Loeschungswunsch` und `Loeschungsergebnis` (DTOs), neuer dünner Adapter `AnmerkungLoeschenEndpunkt`; `Anmerkungsspeicher` um die Löschoperation erweitert.
- `Server/` — eine Route `POST /api/anmerkungen/{nummer}/loeschen` in `Webserver.BildeRueckkanal`.
- `web/` — `anmerkungen-werte.js` (rein: `ohneAnmerkung`) und `anmerkungen.js` (Anmerkungskopf mit „Löschen“, Anfrage, Zeile entfernen), Stil in `gitreviewa.css`.
- `tests/GitReviewA.Tests/Akzeptanz/` — Treiber und Sprache wie `ZeileAnnotierenTests`; `e2e/` — ein Spec, DSL `zeile-annotieren` und Treiber `anmerkungen-oberflaeche` erweitert.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden und wie die Klassen heißen, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Löschen wählen** (Oberfläche) — Klick auf „Löschen“ am Anmerkungskopf → die Anfrage geht sofort raus; „Löschen“ ist gesperrt, bis die Antwort da ist.
2. **Anfrage** — `POST /api/anmerkungen/{nummer}/loeschen` (leerer Körper).
   - 2.1 Server: Anfrageschutz (R00002, unverändert) → `AnmerkungLoeschenInteractor.Loesche`.
   - 2.2 Interactor: Nummer im Speicher nachschlagen (sonst 404) → Speicher entfernt den Eintrag (409 nach dem Beenden). Keine Textprüfung, keine Sperrprüfung.
   - 2.3 200: die Anzeige entfernt die Anmerkungszeile (`ohneAnmerkung`) und lädt nach; nur zeichnen, wenn (Commit, Pfad) noch die gewählte Datei sind.
   - 2.4 404/409/500/Netz: Meldung am Anmerkungskopf, die Anmerkung bleibt.
3. **Ergebnis** — unverändert (`ErgebnisFormatierer`): die verbleibenden Anmerkungen an denselben Positionen, lückenlos ab 1 neu nummeriert.

### Grobentwurf

**Einstiegsstellen:** `Anmerkungsspeicher`, die Anmerkungszeile in `web/anmerkungen.js`, die Route in `Webserver.BildeRueckkanal`; `Anfrageschutz`, `GeschuetzterEndpunkt` und `ErgebnisFormatierer` bleiben unverändert; `Stellensperre` und `Anmerkungstext` werden hier **nicht** aufgerufen.

- `Loeschungswunsch` (DTO, immutable) — die Nummer aus dem Pfad.
- `Loeschungsergebnis` (DTO, immutable) — Ausgang (`Geloescht`, `NichtGefunden`, `Beendet`), die gelöschte Anmerkung (bei Erfolg) und der Grund.
- `Anmerkungsspeicher` (Operation mit Zustand, erweitert) — `bool VersucheZuLoeschen(int nummer, out Anmerkung? geloescht)`; sucht und entfernt unter derselben Sperre wie Anhängen und Abschließen, lässt die Nummer verbraucht (Zähler unberührt) und die übrigen in Anlegereihenfolge stehen, `false` nach dem Abschließen.
- `AnmerkungLoeschenInteractor` (Interactor) — `Loeschungsergebnis Loesche(Loeschungswunsch? wunsch)`; ruft den Speicher; protokolliert Nummer, nie Text. Ruft **weder** `Anmerkungstext` **noch** `Stellensperre`.
- `AnmerkungLoeschenEndpunkt` (dünner Adapter) — Nummer aus dem Pfad, ruft den Interactor, übersetzt in 200/404/409.
- JS `ohneAnmerkung(anmerkungen, nummer)` (rein) — dieselbe Liste in derselben Reihenfolge ohne den Eintrag; `anmerkungen.js` (Adapter: Anmerkungskopf, Anfrage, DOM-Entfernen).

### Änderungen an bestehenden Klassen

- `Anmerkungsspeicher`: neue Operation `VersucheZuLoeschen` neben `VersucheAnzuhaengen`, `VersucheZuAendern` und `VersucheAbzuschliessen` (dieselbe Sperre; der Zähler bleibt unberührt).
- `Webserver.BildeRueckkanal`: zusätzliche Route `POST /api/anmerkungen/{nummer}/loeschen`; `POST /api/anmerkungen`, `POST /api/anmerkungen/{nummer}`, `GET /api/anmerkungen`, `/api/haken` und `/api/beenden` unberührt.
- `web/anmerkungen.js`: der Anmerkungskopf (aus I0023) bekommt „Löschen“; die Antwort entfernt die Anmerkungszeile (`ohneAnmerkung`) und lädt nach.
- `web/anmerkungen-werte.js`: neue reine Funktion `ohneAnmerkung`.
- Unverändert (bewusst): `Anfrageschutz` und `GeschuetzterEndpunkt` (der Weg bleibt POST), `Anmerkungstext`, `AnmerkungsPruefer`, `Stellensperre` (hier nicht anwendend), `ErgebnisFormatierer`.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction; Akzeptanzkriterien als NUnit-Integration gegen den Interactor und den Endpunkt (Treiber in-process, echtes `git` im Wegwerf-Repo); Playwright nur für den Bedienweg des Löschens und Browser-Eigenes — **kein** Hot-Path-Fall, das Löschen liegt nicht auf dem Hot Path (`AI-Team/factory.md`, „Testbarkeit“).

**Unit (rein):** `Anmerkungsspeicher.VersucheZuLoeschen` (löschen, unbekannte Nummer, zweimal löschen, nach dem Abschließen, paralleles Löschen; Zähler unberührt); JS `ohneAnmerkung` (Nummer in der Mitte, unbekannte Nummer, Dateianmerkung ohne Zeile, Reihenfolge und Länge bleiben).
**Integration:** die Kriterien 1 bis 8 und 11 gegen `AnmerkungLoeschenInteractor` und den Endpunkt (200/404/409; 403/405/415; Sperre greift nicht per Fake-Übersicht; Nummer nicht wiederverwendet); Programm als Prozess (Ergebnis Byte für Byte auf stdout, lückenlose Nummerierung, Leerfall). Mutanten: Löschung gibt die Nummer frei → Kriterium 4 rot; Löschung prüft die Sperre (fälschlich fail-closed) → Kriterium 7 rot; Speicher entfernt den falschen Eintrag (Stelle verloren) → Kriterium 2 rot; 404 für unbekannte Nummer fehlt (200 statt 404) → Kriterium 5 rot.
**E2E (Playwright headless, über DSL und Treiber):** ein Spec — der Bedienweg (Anmerkung sichtbar → „Löschen“ → Zeile weg) und Browser-Eigenes (Fehlerpfade per `route`, verzögerte Antwort, Neuladen); Wegwerf-Repo A und eine Dateianmerkung.

## Abhängigkeiten

- Abhängig von: I0017 Zeile annotieren (R00010, grün; Speicher mit stabiler Nummer, `GET /api/anmerkungen`), I0019 Beenden mit Ergebnis (R00002, grün; Ergebnisformat, Anfrageschutz, Anlegen-Schnittstelle), I0030 Sperre (R00014, grün; dieselbe Regel, hier als nicht anwendend festgehalten).
- Blockiert: I0018 Datei annotieren (Braucht I0023 und I0024: eine Dateianmerkung wird über denselben Weg gelöscht).

Nicht Teil dieser Anforderung: Ändern einer Anmerkung (I0023), Ändern der Stelle (Commit, Datei oder Zeile), Anmerkung in der Neben- und Zusammen-Ansicht löschen (I0007, I0010 — sie hängen sich an dieselbe Anmerkungszeile und denselben Anmerkungskopf), Tastenkürzel für „Löschen“ (I0015), Rückgängig (offene Frage, Empfehlung nein), Bestätigung vor dem Löschen, Speichern auf Platte.

## Offene Fragen

1. **Rückgängig ja/nein**: soll ein gelöschter Eintrag zurückgeholt werden können? **Empfehlung: nein.** Der abgenommene Entwurf Fassung 2 zeigt „Löschen“ als direkten Knopf; die Anmerkung ist ein Satz im RAM und durch erneutes Anmerken der Zeile wiederherstellbar (die Position im Ergebnis bleibt, nur die interne stabile Nummer wechselt — sie erscheint im Ergebnis nicht); ein Undo-Puffer wäre eine Historie, die die Leitplanke „Nichts wird gespeichert“ ausschließt, und ein zweiter Zustand („gelöscht, wiederherstellbar“), den keine Karte sonst kennt. Empfehlung gilt bis zur Antwort.

Ohne Rückfrage entschieden (im Bericht festgehalten): gelöscht wird über die stabile Nummer; der Weg bleibt bei POST (`POST /api/anmerkungen/{nummer}/loeschen`, der geteilte `Anfrageschutz` bleibt unverändert POST — kein Umbau am geteilten Schutz, dieselbe Linie wie I0023); die Nummer einer gelöschten Anmerkung wird nie wiederverwendet; das Ergebnis nummeriert die verbleibenden lückenlos nach Position; Löschen prüft die Sperre aus R00014 **nicht** (Entfernen ist keine Aussage); keine Bestätigung vor dem Löschen (wie der Entwurf).

## Manuelle Vorbereitungstätigkeiten
- Keine.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 6 Bubbles unterhalb I0024 (B1801–B1806), davon 3 klar (2 h) und 3 unklar (2–4 h) — Untergrenze 12 h, obere Schätzung 18 h. Enthalten: nur I0024; I0023 (Ändern) ist eine eigene Karte und nicht gezählt. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; mit einem gemessenen Slice rechne ich noch nicht um.

## Warum löst diese Anforderung das Problem?

Auslöser: Der Mensch hat eine Anmerkung geschrieben, die den Punkt nicht trifft — falsche Stelle, Doppelung, versehentlich abgeschickt —, und im Ergebnis würde sie die KI auf einen Auftrag schicken, den er nicht mehr will. Das Zielbild ist ein Rückkanal, der genau die Einträge enthält, die der Mensch stehen lassen will. Kette: Der Anmerkungskopf bekommt „Löschen“ → die Anfrage geht über `POST /api/anmerkungen/{nummer}/loeschen` (Kriterium 1, 9) → der Interactor schlägt die stabile Nummer nach, der Speicher entfernt den Eintrag und lässt Nummer und Reihenfolge der übrigen stehen (Kriterien 2, 3, 4) → die Liste und das Ergebnis nennen die verbleibenden lückenlos nach Position (Kriterien 2, 4, 11). Der Hebel ist die **stabile Nummer** aus R00010: sie erlaubt, genau einen Eintrag zu entfernen, ohne die Stelle der übrigen anzufassen, und trennt die interne Identität (nie wiederverwendet) von der Position im Ergebnis (lückenlos). Weil Löschen eine Aussage zurücknimmt statt eine neue zu treffen, prüft es die Sperre aus R00014 nicht — sonst bliebe eine falsche Anmerkung an einer unlesbaren Stelle für immer stehen; Anlegen und Ändern bleiben dort gesperrt.

## Missing-Docs

- Der Anmerkungskopf mit „Löschen“ und die Wirkung des Knopfes im Entwurf Fassung 2 (`.anm-kopf`, `.btn-text`) — mit einem kleinen Versuch vor dem Bauen belegen (Fokus beim Öffnen, Tab-Reihenfolge innerhalb der Anmerkungszeile, Fokus nach dem Löschen); I0027 und I0015 vereinheitlichen später die Gestaltung und die Tasten.
- Zusammenspiel des „Löschen“-Knopfs am Anmerkungskopf mit dem wandernden `tabindex` der Diff-Zeilen aus B0908 (R00010) und mit dem „Ändern“-Knopf aus I0023 (B1705) — kleiner Versuch, bevor die Zeile gebaut wird.

## Notizen

### Optionen (Weg des Löschens)

| Option | Wirkung | Risiko/Aufwand |
|---|---|---|
| A. `POST /api/anmerkungen/{nummer}/loeschen` (gewählt) | `Anfrageschutz` und `GeschuetzterEndpunkt` bleiben unverändert (nur POST); die Route ist vom Änderungspfad getrennt; dieselbe Linie wie I0023 | klein: ein Adapter und eine Route |
| B. `DELETE /api/anmerkungen/{nummer}` | sprachlich passender | `Anfrageschutz` und `GeschuetzterEndpunkt` müssten eine Methodenmenge erlauben (Umbau am geteilten Schutz von Beenden, Haken, Anlegen und Ändern); `Allow`-Kopf und Tests der vier anderen Endpunkte betroffen |
| C. `POST /api/anmerkungen/{nummer}` mit leerem `{text}` | kein neuer Pfad | vermischt Ändern und Löschen in einem Endpunkt; ein leerer Text ist zugleich der häufigste Ablehnungsgrund (400) — zweideutig und gefährlich |

Gewählt: A. Der geteilte Sicherheitsschutz bleibt unangetastet, und der Weg spiegelt das Ändern (I0023).

### Optionen (Rückgängig)

| Option | Wirkung | Risiko/Aufwand |
|---|---|---|
| A. Kein Rückgängig, keine Bestätigung (gewählt) | der Entwurf Fassung 2 zeigt den Knopf direkt; die Zeile verschwindet sofort | ein Fehlklick kostet den Satz; durch erneutes Anmerken der Zeile wiederherstellbar |
| B. Bestätigung vor dem Löschen | schützt vor dem Fehlklick | ein Klick mehr, ein Dialog je Anmerkung; weicht vom abgenommenen Entwurf ab |
| C. Rückgängig (Undo-Hinweis nach dem Löschen) | Fehlklick rückholbar | ein clientseitiger Puffer („zuletzt gelöscht“) mit Zeitfenster, ein zweiter Zustand, den das Ergebnis nicht kennt — eine Historie, die „Nichts wird gespeichert“ widerspricht |

Gewählt: A, unter dem Vorbehalt der offenen Frage 1 (der product-owner kann B oder C wählen).

### Verworfene Alternativen

- Stellen-Änderung beim Löschen — verworfen: Löschen entfernt den Eintrag, es verschiebt ihn nicht.
- Löschen als „Text auf leer setzen“ — verworfen: leerer Text ist ein Ablehnungsgrund (400); die Anmerkung würde als leerer Eintrag stehen bleiben.
- Löschen über `DELETE` — verworfen: Umbau am geteilten `Anfrageschutz` für alle Endpunkte (Option B).
- Löschen prüft die Sperre (fail-closed wie das Anlegen) — verworfen: eine Anmerkung an einer gesperrten Stelle bliebe unlöschbar; das Entfernen einer Aussage ist immer erlaubt.
- Nummer der gelöschten Anmerkung wiederverwenden — verworfen: verletzt die stabile Nummer aus R00010 und ließe eine alte Adresse auf einen fremden Eintrag zeigen.
- Playwright für jede Bedienaussage — verworfen: Löschen liegt nicht auf dem Hot Path; ein Spec für Bedienweg und Browser-Eigenes genügt.
