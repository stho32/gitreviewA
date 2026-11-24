---
id: R00002
status: Neu
datum: 2026-11-24
---

# R00002: Beenden mit Ergebnis

## Beschreibung

Die prüfende Person beendet den Lauf, und gitreviewA gibt das „Ergebnis manueller Review“ als Markdown auf stdout aus und endet mit Exit-Code 0. Das Ergebnis nennt je Anmerkung Commit, Datei, Zeile und Text; ohne Anmerkungen nennt es genau das. Diese Anforderung legt das **Ergebnisformat** und den Weg Beenden → Ausgabe → Exit fest und liefert den kleinen Arbeitsspeicher für Anmerkungen samt Anlegen-Schnittstelle, aus dem die Ausgabe liest. Die Bedienung zum Annotieren (I0017, I0018) und Abhaken (I0016) kommt später und liefert nur noch Einträge.

Zahlt ein auf: [Vision](R00000-vision.md) — „Ergebnis als Rückkanal“ (stdout gehört allein dem Ergebnis, direkt als Arbeitsauftrag lesbar) und Lastprofil („Beenden“ bis Ausgabe ≤ 1 s, 500 Annotationen).

Annahme zum Gerüst: Aufruf, freier Port, eingebettete Oberfläche und wartender Prozess stammen aus R00001 (I0001, Karte #1, parallel geplant). Namen von Projekten, Ordnern und Optionen legt R00001 fest; hier genannte Namen sind Vorplanung.

## Geschäftlicher Nutzen

Ohne diese Anforderung hat der Review keinen Ausgang: Der Mensch sieht Commits, aber die aufrufende KI bekommt nie ein Urteil. Mit ihr endet jeder Lauf in einem festen, maschinen- und menschenlesbaren Text an dem Ort, den die KI ohnehin liest. Das Format ist hier einmal festgelegt, damit I0017, I0018, I0016 und I0020 nur noch Einträge liefern.

## Funktionale Anforderungen

- „Beenden“ in der Oberfläche beendet den Lauf, schreibt das Ergebnis auf stdout und beendet den Prozess mit Exit-Code 0.
- Das Ergebnis ist Markdown nach dem unten festgelegten **Ergebnisformat**.
- Anmerkungen leben nur im Arbeitsspeicher des Laufs; eine Schnittstelle zum Anlegen existiert schon hier (Begründung unter „Notizen“).
- Das Beenden wirkt genau einmal, auch bei doppelter Anforderung.
- Die neuen Endpunkte verändern Zustand und sind gegen fremde Webseiten und DNS-Rebinding geschützt.

### Ergebnisformat (festgelegt, Markdown, UTF-8 ohne BOM, Zeilenende LF)

Ohne Anmerkungen:

```
# Ergebnis manueller Review

Keine Anmerkungen.
```

Mit Anmerkungen (Beispiel mit zwei Einträgen; `<hash>` steht für den vollen Commit-Hash, 40 Hexziffern):

```
# Ergebnis manueller Review

Anmerkungen: 2

## 1. src/Foo.cs:42

Commit: <hash>

> Null-Prüfung fehlt

## 2. README.md (ganze Datei)

Commit: <hash>

> Abschnitt Installation veraltet
```

Regeln:

- Jede Datei endet mit genau einem Zeilenumbruch; Abschnitte sind durch genau eine Leerzeile getrennt.
- Nummerierung ab 1, fortlaufend, in der Reihenfolge des Anlegens.
- Stellenangabe: `<Datei>:<Zeile>` mit Dateipfad wie von `git` geliefert (relativ, mit `/`), Zeile ab 1 im Stand nach dem Commit; ohne Zeilenbezug `<Datei> (ganze Datei)`.
- Der Text steht als Zitat: jede Textzeile beginnt mit `> `, eine leere Textzeile mit `>`. So kann Text aus der Oberfläche keine Überschrift oder Struktur des Ergebnisses erzeugen.
- Textzeilenenden werden zu LF vereinheitlicht; sonst bleibt der Text unverändert.
- **Reserviert** (hier nicht geliefert): Ein Abschnitt `## Dateien` mit „Abgehakt: …“ und „Ungeprüft: …“ folgt hinter den Anmerkungen, sobald Haken existieren (I0016). Ohne Haken fehlt der Abschnitt.
- **Bewusst nicht enthalten**: ein Gesamturteil. „Keine Anmerkungen.“ bedeutet nur, dass der Mensch nichts angemerkt hat, nicht „freigegeben“ (offene Frage an den product-owner).

## Nicht-funktionale Anforderungen

- Performance: Zwischen der Beenden-Anforderung und dem Ende des Prozesses vergehen höchstens 1 s bei 500 Anmerkungen zu je 200 Zeichen (Vision: Lastprofil; Messpunkt: Anforderung gesendet → Prozess beendet).
- Sicherheit: Siehe Gruppe „Schutz“. Weder Host noch Origin fremder Herkunft löst Beenden oder Anlegen aus; es gibt keine CORS-Freigabe.
- Ausgabe: stdout enthält ausschließlich das Ergebnis. Start- und Logmeldungen gehen nur auf stderr (Vision, Logging-Konzept).

## Akzeptanzkriterien

### Ergebnis auf stdout
- [ ] Gegeben ein laufender Review ohne Anmerkung, wenn beendet wird, dann besteht stdout aus genau `# Ergebnis manueller Review`, einer Leerzeile, `Keine Anmerkungen.` und einem Zeilenumbruch, und der Prozess endet mit Exit-Code 0.
- [ ] Gegeben zwei Anmerkungen — Commit A, Datei `src/Foo.cs`, Zeile 42, „Null-Prüfung fehlt“, danach Commit B, Datei `README.md` ohne Zeile, „Abschnitt Installation veraltet“ —, wenn beendet wird, dann entspricht stdout Byte für Byte dem Beispiel oben (mit den vollen Hashes von A und B) und der Prozess endet mit Exit-Code 0.
- [ ] Gegeben eine Anmerkung mit dem Text „Zeile 1“, einer Leerzeile und „## Fertig“, wenn beendet wird, dann steht jede der drei Textzeilen als Zitat (`> Zeile 1`, `>`, `> ## Fertig`) und das Ergebnis enthält keine zusätzliche Überschrift.
- [ ] Gegeben eine Anmerkung mit dem Text „Prüfen: größer ≥ 3“, wenn beendet wird, dann steht der Text auf stdout unverändert in UTF-8 ohne BOM.
- [ ] Gegeben ein Lauf, der beim Start und im Betrieb Meldungen ausgibt, wenn beendet wird, dann steht auf stdout nur das Ergebnis (erste Zeile ist die Überschrift, nichts davor oder danach) und alle Meldungen stehen auf stderr.
- [ ] Gegeben ein laufender Review, wenn das Beenden zweimal kurz hintereinander angefordert wird, dann steht das Ergebnis genau einmal auf stdout und der Prozess endet mit Exit-Code 0.
- [ ] Gegeben 500 Anmerkungen zu je 200 Zeichen, wenn beendet wird, dann endet der Prozess mit Exit-Code 0 höchstens 1 s nach der Anforderung und stdout enthält 500 nummerierte Anmerkungen (`## 1.` bis `## 500.`).

### Beenden in der Oberfläche
- [ ] Gegeben die geöffnete Oberfläche, wenn „Beenden“ betätigt wird, dann zeigt sie die Meldung „Review beendet“ statt der Bedienung und der Prozess endet mit Exit-Code 0.

### Anmerkungen anlegen
- [ ] Gegeben ein Commit der Auswahl des Laufs, wenn eine Anmerkung mit Commit (voller Hash), Datei `src/Foo.cs`, Zeile 42 und Text angelegt wird, dann bestätigt gitreviewA mit der Nummer 1 (die nächste Anmerkung bekommt 2) und die Anmerkung steht im Ergebnis.
- [ ] Gegeben ein laufender Review, wenn eine Anmerkung angelegt wird mit einem Commit außerhalb der Auswahl, einem abgekürzten Hash, einer leeren Datei, einer Datei mit Zeilenumbruch, Zeile 0, Zeile −1, leerem oder nur aus Leerraum bestehendem Text oder einem Text von 10 001 Zeichen, dann wird sie abgelehnt (400) mit einer Meldung, nichts wird gespeichert und das Ergebnis bleibt unverändert; ein Text von genau 10 000 Zeichen wird angenommen.
- [ ] Gegeben ein bereits beendeter Review, wenn eine Anmerkung angelegt werden soll, dann wird sie abgelehnt (409) und erscheint nicht im Ergebnis.

### Schutz
- [ ] Gegeben ein laufender Review, wenn Beenden oder Anlegen mit fremdem Origin (nicht die eigene Adresse) oder fremdem Host (nicht `127.0.0.1:<port>` und nicht `localhost:<port>`) angefordert wird, dann wird abgelehnt (403), der Lauf geht weiter, stdout bleibt leer und nichts wird gespeichert; eine Anforderung ohne Origin-Kopf (Befehlszeile) mit richtigem Host wird angenommen.
- [ ] Gegeben ein laufender Review, wenn Beenden oder Anlegen ohne Inhaltstyp `application/json` angefordert wird, dann wird abgelehnt (415); wenn Beenden per GET angefordert wird, dann wird abgelehnt (405); in beiden Fällen geht der Lauf weiter und stdout bleibt leer.

## Betroffene Verzeichnisstruktur

Struktur legt R00001 fest (Annahme: ein Server-Projekt mit Themenordnern, Testprojekt daneben, `e2e/` für Playwright). Vorplanung: Themenordner `Anmerkungen/` (Speicher, Prüfung, Endpunkt), `Beenden/` (Format, Ablauf, Endpunkt, Anfrageschutz), Oberfläche: Knopf und Endzustand in der eingebetteten Seite; Tests spiegeln die Themenordner.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf

1. **Anmerkung anlegen** (`POST /api/anmerkungen`, JSON)
   - 1.1 Anfrageschutz: Host, Origin, Inhaltstyp
   - 1.2 Eingabe prüfen (Auswahl des Laufs, Felder, Längen)
   - 1.3 Speicher hängt an und vergibt die Nummer; Antwort 201 mit Nummer
   - 1.4 Ist der Lauf beendet: 409
2. **Beenden** (`POST /api/beenden`, JSON `{}`)
   - 2.1 Anfrageschutz wie 1.1
   - 2.2 Einmal-Schalter (atomar): nur die erste Anforderung gewinnt, weitere bekommen 200 ohne Wirkung
   - 2.3 Antwort 200 an den Browser; Oberfläche zeigt „Review beendet“
   - 2.4 Schnappschuss des Speichers → Ergebnis formatieren → nach stdout schreiben und leeren (Flush)
   - 2.5 Server geordnet stoppen; der Prozess endet mit Exit-Code 0

### Grobentwurf

**Einstiegsstellen:** zwei neue Endpunkte im Minimal-API-Gerüst von R00001; Knopf in der eingebetteten Oberfläche.

- `Anmerkung` (DTO, immutable) — Nummer, Commit, Datei, Zeile (optional), Text.
- `NeueAnmerkung` (DTO, immutable) — die ungeprüfte Eingabe des Endpunkts.
- `Anmerkungen` (benannte Collection, Speicher im Arbeitsspeicher, thread-sicher, Reihenfolge des Anlegens) — `Anmerkung Haenge(NeueAnmerkung neu)`, `IReadOnlyList<Anmerkung> Schnappschuss()`
- `AnmerkungsPruefer` (Operation, rein) — `Pruefergebnis Pruefe(NeueAnmerkung neu, Commits auswahl)`
- `ErgebnisFormatierer` (Operation, rein) — `string Formatiere(IReadOnlyList<Anmerkung> anmerkungen)`
- `AnfrageSchutz` (Operation, rein; Middleware-Adapter) — `Schutzurteil Beurteile(Anfragekopf kopf, int port)`
- `BeendenAblauf` (Integration) — `Beendet` Einmal-Schalter, `int Beende()`: formatiert, schreibt auf stdout, stoppt den Host, liefert 0.
- Endpunkte als dünne Adapter; keine Logik darin.

### Änderungen an bestehenden Klassen

Aus R00001: Programmeinstieg gibt den Exit-Code von `BeendenAblauf` zurück (statt dauerhaft zu warten); Host-Aufbau registriert Speicher und Schutz; die Auswahl der Commits muss als Menge abfragbar sein (Annahme: R00001 hält sie ohnehin).

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; jedes Kriterium wird mindestens einmal auf der Ebene geprüft, auf der es sichtbar ist.

**Unit (rein):** `ErgebnisFormatierer` (Leerfall, zwei Beispiele, mehrzeilig, Umlaute, 500 Einträge), `AnmerkungsPruefer` (alle Ablehnungsgründe, Grenze 10 000/10 001), `AnfrageSchutz` (Host-/Origin-Tabelle), `Anmerkungen` (Nummernvergabe, Reihenfolge, parallel angelegt).
**Integration:** Endpunkte gegen die echte Minimal-API im Speicher (400/403/405/409/415, 201 mit Nummer).
**E2E:** Programm als Prozess in einem Wegwerf-Repo starten (freier Port), Anmerkungen per HTTP anlegen, Beenden per Oberfläche (Playwright) und per HTTP; stdout, stderr und Exit-Code getrennt auffangen; 500-Anmerkungen-Probe mit Zeitmessung; doppeltes Beenden; Anfragen mit fremdem Origin und Host.

## Abhängigkeiten

- Abhängig von: R00001 (I0001 Mit Commit-Hashes aufrufen — Gerüst, Auswahl, wartender Prozess, noch nicht grün)
- Blockiert: I0020 Befunde kopieren (Braucht I0019); I0017 und I0018 liefern später Einträge für den Speicher über die hier geschaffene Anlegen-Schnittstelle

## Offene Fragen

- Gesamturteil und Exit-Code (Vision): bleibt Exit 0, und trägt das Ergebnis später ein Urteil? Bis dahin gilt: Exit 0, kein Urteil.
- Lauf ohne „Beenden“ (Tab zu, Strg+C): hier nicht geregelt; es erscheint kein Ergebnis.
- Format: nur Markdown (hier) oder zusätzlich JSON?
- Soll der Abschnitt „Dateien“ (abgehakt/ungeprüft) ab I0016 Teil des Ergebnisses sein? Empfehlung: ja, wie oben reserviert.
- Soll das Ergebnis die geprüften Commits (Hash und Betreff) vorab nennen, damit es ohne Aufrufkontext lesbar ist? Empfehlung: nicht jetzt.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: Die aufrufende KI wartet auf das Urteil des Menschen und hat bisher keinen Ort, an dem es erscheint; ohne festen Ausgang tippt der Mensch Feedback ab. Das Zielbild ist ein Lauf, der mit einem Klick endet und das Urteil auf stdout hinterlässt. Wenn „Beenden“ den Einmal-Schalter setzt, den Speicher als Schnappschuss formatiert, vollständig nach stdout schreibt und den Prozess mit 0 beendet, dann liest die KI an der Stelle, die sie ohnehin liest, einen Text, den sie als Arbeitsauftrag nehmen kann. Dass das Format hier einmal fest ist und Anmerkungstext als Zitat steht, verhindert, dass spätere Karten das Format ändern oder dass Text aus der Oberfläche die Struktur des Ergebnisses verändert. Gerade dieser Slice ist der Hebel, weil jede spätere Anmerkung und jedes Abhaken erst durch ihn bei der KI ankommt.

## Missing-Docs

- Geordnetes Beenden eines Minimal-API-Hosts mit Exit-Code aus `Main` und vollständigem Flush von stdout (.NET 10) — vor dem Bauen mit einem kleinen Versuch belegen.

## Notizen

**Optionen: Zugang zum Speicher**

| Option | Testbarkeit des Ergebnisses im echten Programm | Risiko | Aufwand |
|---|---|---|---|
| 1. Anlegen-Schnittstelle jetzt (gewählt) | Entwicklertest und E2E stellen das Gegeben über das Programm her | kleine Angriffsfläche, geschützt wie Beenden | etwa 2 Bubbles |
| 2. Nur ein Test-Endpunkt (nur in Debug-Aufbau) | Entwicklertest am Release-Programm nicht möglich | Code, den das ausgelieferte Programm nicht prüft | etwa 1 Bubble |
| 3. Keine Schnittstelle, nur Unit-Tests am Speicher | Beenden mit Anmerkungen nie im echten Programm gesehen | Format erst mit I0017 geprüft | 0 |

Entscheidung: Option 1. Ein Gegeben muss ohne Datenbank-Hand herstellbar sein; I0017 braucht die Schnittstelle ohnehin und erweitert sie nur um Ändern und Löschen.

**Optionen: Ergebnisform**

| Option | Lesbarkeit für KI | Schutz gegen Text aus der Oberfläche |
|---|---|---|
| A. Überschrift je Anmerkung, Text als Zitat (gewählt) | gut, eine Stelle je Abschnitt | Text kann keine Überschrift erzeugen |
| B. Nummerierte Liste mit Einrückung | gut | Einrückungsfehler bei mehr als 9 Einträgen und mehrzeiligem Text |
| C. JSON | maschinell gut, für Menschen schlecht | stark, aber zweites Format ist offene Richtungsfrage |

**Optionen: Beenden**

| Option | Wirkung | Risiko |
|---|---|---|
| X. Geordnet: antworten, schreiben, Host stoppen, Exit 0 aus dem Einstieg (gewählt) | Antwort kommt beim Browser an, stdout vollständig | mehr Zusammenspiel mit dem Gerüst |
| Y. Hartes Prozessende nach dem Schreiben | einfach | Antwort kann abbrechen, Puffer nicht sicher geleert |
| Z. Ergebnis erst nach dem Stopp des Servers schreiben | stdout sicher nach der letzten Anforderung | Browser sieht Verbindungsabbruch statt Meldung |

**Entscheidungen im Zuschnitt**: Voller Commit-Hash (eindeutig für die KI, kein Raten bei Kürzeln); Reihenfolge des Anlegens statt Sortierung (einfach, vorhersehbar); „Zeile“ ist die Zeile im Stand nach dem Commit — Anmerkungen an gelöschten Zeilen regelt I0017 bei Bedarf.

**Verworfen/Out-of-scope**: Gesamturteil, JSON, Verhalten ohne „Beenden“, Dateiliste (reserviert), Ändern und Löschen von Anmerkungen (I0017).
