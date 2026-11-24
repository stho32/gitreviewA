---
id: R00005
status: Neu
datum: 2026-11-24
---

# R00005: Review abbrechen

## Beschreibung

Bricht die prüfende Person den Lauf ohne „Beenden“ ab (Strg+C im Terminal oder ein Beendigungssignal wie SIGTERM), gibt gitreviewA **kein Ergebnis** aus: stdout bleibt leer, auf stderr steht „Review abgebrochen“, und der Prozess endet mit Exit-Code 130. Die aufrufende KI erkennt so am Exit-Code und an der leeren Ausgabe, dass kein Urteil vorliegt — auch wenn der Mensch schon Anmerkungen angelegt hatte. Ein geschlossener Browser-Tab beendet den Lauf nicht; es gibt kein Zeitlimit.

Zahlt ein auf: [Vision](R00000-vision.md) — „Abbruch erkennbar“ (Entscheidung des Betreibers 2026-11-24, Ergänzungshistorie) und „Ergebnis als Rückkanal“ (stdout gehört allein dem Ergebnis; ein halbes Ergebnis würde von der KI als vollständiges Urteil gelesen).

Baut auf [R00002](R00002-beenden-mit-ergebnis.md) auf: dort sind Beenden-Ablauf (Einmal-Schalter, Ergebnis erst beim geordneten Ende auf stdout) und Anmerkungsspeicher festgelegt. Heute beenden SIGINT und SIGTERM den Prozess sauber mit Exit-Code 0 und leerem stdout (Befund aus dem Code-Review von R00001) — Exit 0 meldet der KI fälschlich „Review ordentlich zu Ende“. Diese Anforderung ändert genau das.

## Geschäftlicher Nutzen

Ohne diese Anforderung sieht die aufrufende KI bei einem Abbruch denselben Exit-Code 0 wie bei einem Review ohne Anmerkungen — beides mit leerem oder unklarem stdout. Mit ihr ist „kein Urteil“ eindeutig: Exit 130 und eine Meldung auf stderr; die Meldung „Keine Anmerkungen.“ kommt nur aus einem ordentlich beendeten Lauf.

## Funktionale Anforderungen

- Strg+C und SIGTERM während des Laufs beenden den Prozess mit Exit-Code 130 und der Meldung „Review abgebrochen“ auf stderr (Logformat `<Zeit> <STUFE> [Kontext] Meldung`, Stufe Warnung).
- Bei einem Abbruch wird nichts auf stdout geschrieben, auch dann nicht, wenn Anmerkungen vorliegen. Anmerkungen gehen verloren (nur Arbeitsspeicher, Vision „Nichts wird gespeichert“).
- Das Schließen des Browser-Tabs ändert nichts am Lauf: der Prozess wartet weiter, die Oberfläche ist unter derselben Adresse wieder erreichbar, angelegte Anmerkungen bleiben. Es gibt kein Zeitlimit.
- Ist „Beenden“ bereits angenommen (erste Anforderung bestätigt, R00002), gewinnt das Beenden: das Ergebnis erscheint vollständig, Exit-Code 0.

## Nicht-funktionale Anforderungen

- Ausgabe: stdout enthält bei einem Abbruch keine Zeichen (0 Bytes); die Meldung steht genau einmal auf stderr, auch wenn das Signal mehrfach kommt.
- Zeit: Der Prozess endet höchstens 5 s nach dem Signal (Messpunkt: Signal gesendet → Prozess beendet), auch wenn die Oberfläche im Browser offen ist und eine Verbindung hält. Die Grenze ist eine Hypothese (nicht gemessen); sie schützt davor, dass ein offener Tab das Ende verzögert.
- Plattform: Strg+C gilt überall, SIGTERM dort, wo die Plattform es kennt (Linux, macOS). E2E läuft auf Linux (Entwicklungsrechner).

## Akzeptanzkriterien

### Abbruch ohne Ergebnis
- [ ] Gegeben ein laufender Review mit zwei angelegten Anmerkungen (Beispiele wie R00002), wenn der Lauf per Strg+C (SIGINT) abgebrochen wird, dann ist stdout leer (0 Bytes), stderr enthält genau eine Zeile mit „Review abgebrochen“ und der Prozess endet mit Exit-Code 130.
- [ ] Gegeben ein laufender Review ohne Anmerkung, wenn der Lauf per SIGTERM abgebrochen wird, dann gilt dasselbe: stdout leer, die Meldung genau einmal auf stderr, Exit-Code 130 (kein „Keine Anmerkungen.“). Kommt das Signal zweimal kurz hintereinander, steht die Meldung trotzdem genau einmal da.
- [ ] Gegeben die in einem Browser geöffnete Oberfläche (die Verbindung bleibt offen), wenn der Lauf abgebrochen wird, dann endet der Prozess höchstens 5 s nach dem Signal mit Exit-Code 130.

### Geschlossener Tab
- [ ] Gegeben die geöffnete Oberfläche und eine angelegte Anmerkung, wenn der Tab geschlossen wird, dann läuft der Prozess weiter (kein Exit, nichts auf stdout), die Oberfläche lässt sich unter derselben Adresse neu öffnen, und „Beenden“ liefert danach ein Ergebnis mit dieser Anmerkung und Exit-Code 0.

### Grenzfall Beenden gegen Abbruch
- [ ] Gegeben ein Review, dessen „Beenden“ bereits bestätigt wurde, wenn danach ein Abbruchsignal eintrifft, dann steht das Ergebnis vollständig auf stdout und der Prozess endet mit Exit-Code 0; ohne bestätigtes „Beenden“ gewinnt der Abbruch.

## Betroffene Verzeichnisstruktur

Themenordner `Beenden/` (aus R00002) und Programmeinstieg (`Program.cs`); neu: ein Ablauf-Baustein für den Abbruch im Themenordner `Beenden/`; Tests spiegeln den Ordner; E2E in `e2e/tests/abbrechen.spec.js` mit den Treibern aus `e2e/treiber/`.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf

1. Beim Start des Laufs registriert der Einstieg die Abbruchsignale (SIGINT, SIGTERM; Strg+C).
2. Trifft ein Signal ein: Zustand „Abbruch“ setzen (Einmal-Schalter, atomar), Meldung auf stderr (nur beim ersten Mal), Server geordnet stoppen.
3. Der Einstieg prüft nach dem Stopp: Ist der Speicher abgeschlossen (Beenden angenommen, R00002), Ergebnis schreiben, Exit 0; sonst nichts auf stdout schreiben, Exit 130.
4. Tab-Schließen erzeugt keinen Ablauf (kein Heartbeat, keine Überwachung der Verbindungen).

### Grobentwurf

- `Abbruchsignal` (Adapter) — übersetzt Prozesssignale in ein einziges „Abbruch angefordert“-Ereignis.
- `AbbruchEntscheidung` (Operation, rein) — Beenden angenommen? Abbruch angefordert? → `Ergebnis ausgeben, Exit 0` oder `nichts ausgeben, Exit 130`.
- Änderungen: `Program.cs` (Exit-Code 130, Registrierung), `BeendenEndpunkt` bleibt; Beenden-Einmal-Schalter ist die Grenze für den Grenzfall.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble (ATDD: Akzeptanztests in `e2e/` mit DSL und Treiber, Fachsprache).

**Unit:** `AbbruchEntscheidung` (Tabelle: nur Beenden, nur Abbruch, beides, nichts).
**E2E:** Programm im Wegwerf-Repo auf freiem Port starten, stdout, stderr und Exit-Code getrennt auffangen; Signale an die gemerkte PID senden (SIGINT, SIGTERM; nie über Prozessmuster); zweimal kurz hintereinander; Browser geöffnet (Playwright, headless) bei Abbruch; Tab schließen, neu öffnen, beenden. Auf das Ende des Prozesses ereignisgenau warten, nicht pollen. Grenzfall Beenden gegen Abbruch auf Unit-Ebene, E2E nur mit Toleranz (ist der Prozess schon beendet, ist das Signal wirkungslos).

## Abhängigkeiten

- Abhängig von: I0019 Beenden mit Ergebnis (R00002; Einmal-Schalter, Speicher abgeschlossen), I0001 Gerüst (R00001).
- Blockiert: nichts.

Nicht Teil dieser Anforderung: Gesamturteil im Ergebnis, Zeitlimit, Heartbeat für Tab-Schließen, Sichern von Anmerkungen über den Lauf hinaus.

## Offene Fragen

1. An den product-owner: **Grenzfall Beenden gegen Abbruch.** Empfehlung: Beenden gewinnt, sobald die erste Anforderung bestätigt ist (die Person hat „Beenden“ gewählt und die Oberfläche hat „Review beendet“ gezeigt; Ergebnis und Exit 0 stimmen dazu). Alternative: Abbruch gewinnt immer.
2. An den product-owner: **Plattform Windows.** Dort gibt es kein SIGTERM; Strg+C genügt als Abbruch, SIGTERM-Verhalten nur dort, wo die Plattform es kennt (Empfehlung; E2E nur auf Linux).
3. An den product-owner: **Stufe der Meldung bei hoher Mindeststufe** der Protokollierung. Empfehlung: „Review abgebrochen“ erscheint auf Stufe Warnung und damit in der Standardstufe; wer die Mindeststufe auf Fehler stellt, sieht sie nicht, den Exit-Code 130 aber immer.

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 3 Bubbles unterhalb I0021 (B0401–B0403), 2 Standard (2 h), 1 unklar (2–4 h) — Untergrenze 6 h, obere Schätzung 8 h. Gemessene Ist-Zeiten aus R00001 liegen deutlich darunter.

## Warum löst diese Anforderung das Problem?

Der Auslöser: die KI startet `gitreviewA`, der Mensch bricht mit Strg+C ab. Heute liefert der Prozess Exit 0 und leeres stdout — die KI liest das wie „nichts zu beanstanden“. Wenn der Abbruch Exit 130 und „Review abgebrochen“ auf stderr liefert und nie ein Ergebnis druckt, dann kann die KI zwischen Urteil und Nicht-Urteil unterscheiden, und ein Teilergebnis wird nicht fälschlich als vollständiges gelesen.

## Missing-Docs
- Verhalten von .NET beim Abfangen von SIGINT und SIGTERM zusammen mit dem Host-Lebenszyklus (wer setzt Exit-Code 0?): vor dem Bauen mit einem Wegwerf-Programm proben.

## Notizen

**Optionen: Abbruch ohne Beenden**

| Option | Wirkung | Risiko |
|---|---|---|
| 1. Kein Ergebnis, Exit 130, Meldung auf stderr (gewählt, Betreiber) | KI erkennt „kein Urteil“ | Anmerkungen gehen verloren |
| 2. Teilergebnis ausgeben, Exit 130 | Anmerkungen gerettet | KI liest ein halbes Urteil als vollständig |
| 3. Wie heute (Exit 0, leer) | nichts zu bauen | Abbruch nicht vom Review ohne Anmerkungen unterscheidbar |

**Verworfen**: Zeitlimit und Heartbeat bei geschlossenem Tab (Betreiber: Tab zu wartet weiter, kein Zeitlimit).
