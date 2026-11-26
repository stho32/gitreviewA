---
id: R00050
status: Neu
datum: 2026-11-26
---

# R00050: Beenden und Abbrechen im Kopf

## Beschreibung

Im Kopf der Oberfläche stehen „Ergebnis kopieren“, **„Abbrechen“** und **„Beenden“** (Beenden rechts außen, die Hauptaktion). Beide Knöpfe öffnen einen **Bestätigungsdialog**, bevor etwas wirkt:

- **Beenden** nennt, was an die KI geht (Zahl der Anmerkungen) und wie viele Dateien nicht abgehakt sind. **Enter** bestätigt, **Esc** geht zurück, der Lauf geht weiter. Bestätigt: Ergebnis auf stdout, Exit 0, Endzustand „Review beendet“ (R00002).
- **Abbrechen** warnt, dass alle Anmerkungen und Haken verloren gehen und die KI kein Ergebnis bekommt. Bestätigt: wirkt wie Strg+C (R00005): nichts auf stdout, `WARNUNG [Abbruch] Review abgebrochen` auf stderr, Exit 130, Endzustand „Review abgebrochen“ in der Oberfläche. Der Weg läuft über einen neuen Endpunkt `POST /api/abbrechen`.
- Ein geschlossener oder neu geladener Tab ändert nichts (R00005); ein offener Dialog überlebt kein Neuladen, der Lauf und sein Stand schon.

Zahlt ein auf: [Vision](R00000-vision.md) — „Beenden und Abbrechen im Kopf“, „Abbruch erkennbar“, „Ergebnis als Rückkanal“.

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Kopf, Zähler), [R00002](R00002-beenden-mit-ergebnis.md) (Beenden, Einmal-Schalter), [R00005](R00005-review-abbrechen.md) (Abbruch, Exit 130; sein Satz „Knopf Abbrechen … nach Bestätigung“ wird hier geliefert), [R00011](R00011-datei-abhaken.md) und [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Haken, gesperrt), [R00030](R00030-tastaturbedienung.md) (Katalog, Dialog, Fokus), [R00037](R00037-ergebnis-spalte-live.md) (Ergebnis-Spalte, Kopf).

**Danach folgt** [R00041](R00041-abschlussschritt-vor-beenden.md) (I0042): der Dialog dieser Anforderung wird dort um Abschnitte erweitert, nicht neu gebaut (siehe „Anschluss an I0042“).

### Domänenbezug

Kein Glossar. „Ungeprüft“ heißt hier wie in R00011: nicht abgehakt. „Datei“ ist abgehakt, wenn **alle** ihre Stellen abgehakt sind (R00012); dieselbe Rechnung wie der Zähler im Kopf in „Zusammen“.

## Geschäftlicher Nutzen

Heute beendet „Beenden“ sofort, ohne Rückfrage, und der Lauf lässt sich nur im Terminal abbrechen. Ein versehentlicher Klick schickt ein unfertiges Urteil an die KI; wer die Oberfläche offen hat, aber das Terminal nicht erreicht (die KI hat den Prozess im Hintergrund gestartet), kann nicht abbrechen. Der Dialog zeigt im letzten Moment, was rausgeht und was ungeprüft bleibt; „Abbrechen“ gibt dem Menschen den Weg, der „kein Urteil“ sagt.

## Funktionale Anforderungen

- **Knöpfe im Kopf**: „Ergebnis kopieren“, „Abbrechen“, „Beenden“ in dieser Reihenfolge von links nach rechts; „Beenden“ ist hervorgehoben. Der Kopf bleibt eine Zeile (Pflichtpunkt 3); den Platz gibt zuerst der Zähler „kopf-zahlen“ ab (gekürzt mit „…“, voller Text im Namen), nie ein Knopf.
- **Ein Dialog, eine Beschreibung** (Pflichtpunkt 5, die eine Stelle): eine reine Funktion `dialogBeschreibung(art, lage)` liefert für `art` = `beenden` | `abbrechen` Titel, Hinweiszeilen, Beschriftung des Bestätigungsknopfs und die **Vorgabe** (`bestaetigen` oder `zurueck`: welcher Knopf zuerst den Fokus hat und was Enter tut). Es gibt keine zweite Stelle, die zwischen den beiden Arten unterscheidet; Anzeige, Fokus, Enter-Verhalten und Endzustand lesen alle diese Beschreibung. I0042 ergänzt `abschnitte` in derselben Beschreibung.
- **Dialog Beenden** — Titel „Review beenden und Ergebnis senden?“. Zeilen: „<n> Anmerkungen in <k> Dateien gehen auf stdout an die aufrufende KI.“ (n = 0: „Keine Anmerkungen: die KI erhält ‚Keine Anmerkungen.‘“; n = 1: „1 Anmerkung in 1 Datei …“) und „<u> von <m> Dateien sind nicht abgehakt.“ — mit „ (<g> nicht lesbar)“ hinter u, wenn g ≥ 1 gesperrte Dateien dabei sind (R00014: gesperrt zählt als ungeprüft); u = 0: „Alle <m> Dateien sind abgehakt.“; m = 0: „Keine Dateien in der Auswahl.“ Knöpfe „Zurück (Esc)“ und „Beenden (Enter)“; Vorgabe `bestaetigen`.
- **Dialog Abbrechen** — Titel „Review abbrechen?“. Zeilen: „Alle <n> Anmerkungen und <h> Haken gehen verloren.“ und „Die KI erhält kein Ergebnis (stdout bleibt leer, Exit 130).“ Bei n = 0 und h = 0 entfällt die erste Zeile; die zweite bleibt. Knöpfe „Zurück (Esc)“ und „Abbrechen“; Vorgabe `zurueck`: der Fokus steht auf „Zurück“, **Enter bestätigt nicht** (nur ein Klick oder Tab + Enter auf „Abbrechen“).
- **Immer fragen**: auch bei n = 0 und h = 0 öffnet „Abbrechen“ den Dialog (der Abbruch selbst ist unumkehrbar: kein Fortsetzen).
- **Zählweise unabhängig vom Modus und von der Sicht**: u und m zählen Dateien über die **ganze Auswahl** in „Zusammen“ wie in „Einzeln“, mit und ohne Dateisuche (R00049), ausgeblendete Muster (R00025) und ausgeblendete Abgehakte (R00029) — dieselbe Rechnung wie der Zähler in „Zusammen“ (`fortschrittZusammen`), keine zweite. Anmerkungen und Haken kommen vom Server (`GET /api/anmerkungen`, `GET /api/haken`) beim Öffnen des Dialogs, nicht aus einem Zwischenstand der Oberfläche. Ist die Netto-Liste oder eine Quelle nicht lesbar, steht in der Zeile „… konnte nicht bestimmt werden“; Bestätigen bleibt möglich.
- **Bedienung**: Der Dialog ist modal (Fokus gefangen, Hintergrund inert und abgeschirmt, wie die Hilfe), nie höher als das Fenster, sein Inhalt rollt innen (Pflichtpunkt 3). **Enter** wirkt wie der Bestätigungsknopf, **solange der Fokus nicht auf einem anderen Knopf oder Eintrag des Dialogs steht** (dort wirkt Enter auf diesen; I0042 hängt Einträge an). **Esc** und „Zurück“ und ein Klick auf den Scrim schließen; der Fokus kehrt auf den auslösenden Knopf zurück. Bei offenem Dialog wirken die Kürzel nicht, auch `?` öffnet die Hilfe nicht darüber (Tastenschicht: der Dialog meldet sich bei `offenerDialog` an der einen Stelle in `tasten.js`).
- **Kürzel** (offene Frage 1, vorläufig): `q` öffnet den Dialog „Beenden“ (er beendet nie selbst); „Abbrechen“ hat **kein** Kürzel (nicht Teil des Katalogs, erreichbar per Tab). Eintrag im Katalog `tasten-werte.js` mit `ziel: '#beenden'`, Bereich Allgemein, Laufart Review; Hilfe und Hinweis folgen daraus.
- **Abbrechen-Weg**: Bestätigen sendet `POST /api/abbrechen` (Körper `{}`). Der Server nimmt den ersten Abbruch an (**ein Einmal-Schalter für Beenden und Abbrechen zusammen**: wer zuerst angenommen wird, gewinnt), antwortet 200 `{"zustand":"abgebrochen"}`, stoppt den Server geordnet; der Hauptablauf entscheidet über die vorhandene `AbbruchEntscheidung` (nichts auf stdout, `WARNUNG [Abbruch] Review abgebrochen` genau einmal auf stderr, Exit 130). Das Signal Strg+C/SIGTERM bleibt unverändert und nimmt denselben Weg. Ist „Beenden“ schon angenommen, antwortet der Endpunkt 409 `{"zustand":"beendet"}`; ist der Abbruch schon angenommen, antwortet `POST /api/beenden` 409 `{"zustand":"abgebrochen"}`; die Oberfläche zeigt in beiden Fällen den **tatsächlich geltenden** Endzustand.
- **Endzustände**: „Review beendet“ (wie heute, Hinweis „Das Ergebnis steht in der Konsole …“) und neu „Review abgebrochen“ mit dem Hinweis „Es gibt kein Ergebnis. Dieses Fenster kann geschlossen werden.“ (offene Frage 3). Beide ersetzen die Bedienung; „Ergebnis kopieren“, „Abbrechen“ und „Beenden“ verschwinden.
- **Tab zu, Neuladen**: ein geschlossener Tab beendet und bricht nichts ab; Neuladen schließt einen offenen Dialog, der Lauf, die Anmerkungen und Haken bleiben (Server). Es gibt keinen Browser-Dialog „Seite verlassen?“ (offene Frage 4).

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): der Dialog zeigt nur Zahlen und feste Texte, keinen Namen aus dem Repo — keine Länge je Element, keine Marken nötig (I0042 fügt Namen hinzu und trägt dann die Marken-Pflicht). Zahlen bis 2 000 Dateien, 500 Anmerkungen, 2 000 Haken (Lastprofil). `POST /api/abbrechen` liest den Körper wie `POST /api/beenden` bis zum Ende; ein Körper, der nie ganz ankommt, ist kein Abbruch. Ausgabe: stdout 0 Bytes, stderr genau eine Abbruchzeile.
- **Zeit** (R00047, grobe Schranken): der Dialog steht spätestens 5 s nach dem Klick (Lastprofil); „Abbrechen“ endet den Prozess spätestens 5 s nach der Bestätigung (wie R00005); keine Aufgabe friert die Oberfläche länger als 2 s ein. Keine engeren Ziele.
- **Sicherheit**: `POST /api/abbrechen` ist zustandsändernd — Anfrageschutz wie `POST /api/beenden` (Host, Origin, nur POST, nur `application/json`, kein CORS), über dieselbe Stelle (`GeschuetzterEndpunkt`); kein `GET` löst Abbruch aus. Texte im Dialog nur über `textContent`.
- **Logging** (Pflichtpunkt 4, Ausführungsort): Server — es gibt keine zweite Zeile für den Knopf; die eine Abbruchzeile ist `WARNUNG [Abbruch] Review abgebrochen` (R00005) und erscheint genau einmal, egal ob Signal oder Knopf. Die Oberfläche schreibt nichts auf stderr.
- **Benutzerfreundlichkeit**: Material 3 Dialog (Basic dialog), Stil kanbanD; Fokusring und Fokusrückgabe wie die Hilfe (R00030); die Vorgabe „Zurück“ bei Abbrechen folgt der Regel „zerstörerische Aktion nie als Voreinstellung“.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (`user-stories/R00012.md`, Dateien `README.md`, `src/a.txt`, `src/b.txt`; drei Commits `z1 z2 z3`), **Repo N plus `v`** (`user-stories/R00014.md`, gesperrte Stellen), **Commit `g`** (2 000 Dateien, `user-stories/R00011.md` Szenario 10). Aufruf `gitreviewA <Hashes> --kein-browser`, Fenster 1280 × 800, Start in „Zusammen“. Prozess als Kind gestartet, stdout, stderr und Exit-Code getrennt aufgefangen, wie in `e2e/treiber/programm.js`.

### Beenden mit Dialog
- [ ] 1. Gegeben Repo Z, zwei Anmerkungen (`src/a.txt:2` und `README.md` ganze Datei) und `README.md` abgehakt, wenn man „Beenden“ betätigt, dann steht ein Dialog mit „Review beenden und Ergebnis senden?“, „2 Anmerkungen in 2 Dateien gehen auf stdout an die aufrufende KI.“ und „2 von 3 Dateien sind nicht abgehakt.“, der Prozess läuft noch (stdout leer, kein Exit), und der Fokus steht im Dialog. Rechnung: 3 Dateien, 1 abgehakt → 2 offen. *Ebene: Integration (Oberfläche gegen Fake) und Unit (`dialogBeschreibung`).*
- [ ] 2. Gegeben der Dialog aus Kriterium 1, wenn man Enter drückt, dann endet der Prozess mit Exit 0, stdout ist Byte für Byte das Ergebnis (wie ohne Dialog, R00002), und die Seite zeigt „Review beendet“. Wenn man stattdessen Esc drückt (oder „Zurück“ betätigt), ist der Dialog zu, der Fokus steht auf „Beenden“, der Prozess läuft, und die Anmerkungen und der Haken sind unverändert. *Ebene: Playwright (Hot Path „Beenden mit Ergebnis“; Fokus und Tasten sind Browser-Eigenes) und Integration (Programm, stdout).*
- [ ] 3. Gegeben Repo Z ohne Anmerkung und ohne Haken, wenn man „Beenden“ betätigt, dann nennt der Dialog „Keine Anmerkungen: die KI erhält ‚Keine Anmerkungen.‘“ und „3 von 3 Dateien sind nicht abgehakt.“; mit genau einer Anmerkung steht „1 Anmerkung in 1 Datei …“; sind alle drei Dateien abgehakt, steht „Alle 3 Dateien sind abgehakt.“. *Ebene: Unit (`dialogBeschreibung`, Grenzen 0/1/n).*
- [ ] 4. Gegeben Repo N plus `v` mit 3 gesperrten Dateien (R00014, Rechnung dort: 3 gesperrt + 6 offene + 1 abgehakt), wenn man „Beenden“ betätigt, dann steht „9 von 10 Dateien sind nicht abgehakt (3 nicht lesbar).“; ein Haken auf eine gesperrte Datei ändert die Zahl nicht. *Ebene: Integration (Oberfläche gegen Fake); Zahlen wie `ergebnis-werte`/R00014.*
- [ ] 5. Gegeben Repo Z in „Zusammen“, `src/a.txt` abgehakt, dann „Einzeln“, wenn man „Beenden“ betätigt, dann steht dieselbe Zahl wie in „Zusammen“ („2 von 3 Dateien …“, nicht eine Stellenzahl); dasselbe mit aktiver Dateisuche `a` (zeigt nur `src/a.txt`), mit ausgeblendetem `README.md` (Muster) und mit „Abgehakte ausblenden“. Rechnung: die Sicht ändert die Zahl nie (Sicht, nicht Auswahl, PO #33). *Ebene: Integration (Oberfläche gegen Fake), beide Modi und die drei Sichten abgetastet.*
- [ ] 6. Gegeben Anmerkungen an `f\xFF.txt` in `z1` und an `f\xFE.txt` in `z2` (Wegwerf-Repo, Namen über python3 angelegt, Lehre #16), wenn man „Beenden“ betätigt, dann zählt der Dialog „2 Anmerkungen in 2 Dateien“ (zwei verschiedene Namen, nicht einer). *Ebene: Integration.*
- [ ] 7. Gegeben Commit `g` (2 000 Dateien, 1 000 abgehakt) und 500 Anmerkungen (Lastprofil), wenn man „Beenden“ betätigt, dann steht der Dialog spätestens 5 s später mit „1000 von 2000 Dateien sind nicht abgehakt.“, ist nicht höher als das Fenster (1280 × 800 und 812 × 600), und sein Inhalt rollt innen. *Ebene: Playwright (Darstellung, Schranke R00047).*

### Abbrechen mit Dialog
- [ ] 8. Gegeben Repo Z, zwei Anmerkungen und ein Haken, wenn man „Abbrechen“ betätigt, dann steht ein Dialog „Review abbrechen?“ mit „Alle 2 Anmerkungen und 1 Haken gehen verloren.“ und „Die KI erhält kein Ergebnis (stdout bleibt leer, Exit 130).“, der Fokus steht auf „Zurück“, und **Enter** schließt den Dialog ohne Abbruch (Prozess läuft weiter). Gegeben Repo Z ohne Anmerkung und Haken, öffnet „Abbrechen“ den Dialog trotzdem, ohne die erste Zeile. *Ebene: Integration (Oberfläche) und Unit; Fokus: Playwright.*
- [ ] 9. Gegeben der Dialog aus Kriterium 8, wenn man den Knopf „Abbrechen“ im Dialog betätigt (Klick oder Tab + Enter), dann endet der Prozess mit Exit 130, stdout hat 0 Bytes, stderr enthält genau eine Zeile `WARNUNG [Abbruch] Review abgebrochen`, und die Seite zeigt „Review abgebrochen“ mit dem Hinweis, ohne die Knöpfe „Beenden“, „Abbrechen“ und „Ergebnis kopieren“. Der Prozess endet spätestens 5 s nach dem Klick. *Ebene: Integration (Programm als Prozess) und Playwright (Endzustand).*
- [ ] 10. Gegeben ein laufender Review, wenn dieselbe Abbruchanforderung zweimal kurz hintereinander eintrifft, oder ein Signal (`kill -INT`) und die Anforderung, dann steht die Abbruchzeile genau einmal auf stderr und der Exit-Code ist 130. *Ebene: Integration (Programm als Prozess; Signal nur an die gemerkte PID).*

### Beenden gegen Abbruch
- [ ] 11. Gegeben „Beenden“ ist angenommen (`POST /api/beenden` → 200), wenn danach `POST /api/abbrechen` eintrifft, dann antwortet der Server 409 `{"zustand":"beendet"}`, das Ergebnis steht vollständig auf stdout und der Exit-Code ist 0. Umgekehrt: nach angenommenem Abbruch antwortet `POST /api/beenden` 409 `{"zustand":"abgebrochen"}`, stdout bleibt leer, Exit 130. Die Oberfläche zeigt jeweils den geltenden Endzustand (zwei offene Tabs: im zweiten „Beenden“ bestätigt, im ersten „Abbrechen“ → erster Tab zeigt „Review beendet“). *Ebene: Integration (Endpunkte, Programm) und ein Playwright-Fall mit zwei Seiten.*

### Schutz und Fehler
- [ ] 12. Gegeben eine fremde Herkunft (`Origin: http://evil.example`), ein `GET`, ein falscher Inhaltstyp und ein fremder `Host`, wenn `/api/abbrechen` aufgerufen wird, dann antwortet der Server 403, 405, 415 und 403, und der Prozess läuft weiter (kein Abbruch). Ein Körper, der nie ganz ankommt, bricht nicht ab. *Ebene: Integration (Endpunkt, Programm als Prozess), Positivkontrolle: ein erlaubter Aufruf bricht ab.*
- [ ] 13. Gegeben `POST /api/abbrechen` scheitert (Fake antwortet 500), wenn man im Dialog „Abbrechen“ bestätigt, dann bleibt die Oberfläche in Betrieb, der Dialog zeigt „Abbrechen ist gescheitert: Antwort 500“, und „Beenden“ bleibt bedienbar; dasselbe für „Beenden“ (Meldung wie heute). Gegeben `GET /api/anmerkungen` scheitert beim Öffnen, dann steht „Anmerkungen konnten nicht bestimmt werden“, und Enter beendet trotzdem. *Ebene: Integration (Oberfläche gegen Fake), Fehlerpfad.*

### Tab und Kopf
- [ ] 14. Gegeben die geöffnete Oberfläche mit einer Anmerkung, wenn der Tab geschlossen wird, dann läuft der Prozess weiter (R00005); wenn man bei offenem Dialog die Seite neu lädt, ist der Dialog zu und kein „Seite verlassen?“-Hinweis erscheint, die Anmerkung steht noch, und „Beenden“ liefert sie. *Ebene: Playwright.*
- [ ] 15. Gegeben Fenster 1280 × 800 und 812 × 600, wenn man den Kopf betrachtet, dann ist er eine Zeile hoch (gleich hoch bei beiden Breiten), „Ergebnis kopieren“, „Abbrechen“ und „Beenden“ sind ganz sichtbar und in dieser Reihenfolge, und der Zähler ist bei Platzmangel mit „…“ gekürzt, sein voller Text steht im Namen. *Ebene: Playwright (Darstellung, Höhe gemessen).*
- [ ] 16. Gegeben die Seite geladen, wenn man `q` drückt (kein Feld fokussiert, kein Dialog offen), dann öffnet der Dialog „Beenden“ und beendet nichts; in einem Eingabefeld, mit Strg/Alt/Meta und bei offenem Dialog (auch `?`) tut `q` nichts; die Hilfe nennt `q` bei „Beenden“, „Abbrechen“ hat keinen Eintrag; bei geöffnetem Dialog trägt der Auslöser den Hinweis. *Ebene: Unit (Katalog) und Integration (Oberfläche).*

Grenz- und Leerfälle bedacht: n = 0, 1, viele (3); u = 0 und m = 0 (3); gesperrt (4); Modus und Sichten (5); Rohbytes (6); 2 000 Dateien und kleines Fenster (7); Abbrechen ohne Verlust (8); Doppelabbruch und Signal (10); Beenden gegen Abbruch beidseitig (11); Fehler (13); Neuladen (14). Verworfen als Kriterium: Aufbau des Dialogs im Pixel (Entwurf Fassung 2 zeigt ihn als Absicht, kein Vertrag).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — NFA, Kriterien 7, 12 (nur Zahlen und feste Texte, Körper wie Beenden); 2 Anzeigeverfahren — Kriterium 5 („Zusammen“ zuerst, „Einzeln“, Dateisuche, Ausblenden, Abgehakte ausblenden; Umbruch, Anordnung, große Diffs: nicht betroffen, der Dialog liegt über der Seite); 3 festes Layout — Kriterien 7 und 15 (Dialog nie höher als das Fenster, Kopf eine Zeile); 4 Ausführungsort — Logging nur im Server, die Oberfläche schreibt nichts auf stderr; 5 eine Unterscheidung, ein Ort — `dialogBeschreibung` (Art, Vorgabe, Endzustand), der eine Einmal-Schalter für Beenden und Abbrechen im Server, die eine Zählrechnung `fortschrittZusammen`, die eine Anmeldung des Dialogs an `offenerDialog`.

## Anschluss an I0042 (R00041)

Damit I0042 den Dialog erweitert, ohne ihn nachzubauen, liefert diese Anforderung:

1. `dialogBeschreibung` hat ein Feld `abschnitte` (Standard: leer), das der Dialog in einen **Rollbereich unter den Hinweiszeilen** zeichnet; I0042 füllt es für `beenden`. Der Rollbereich und die Höhengrenze (Dialog ≤ Fenster) gehören schon hierher (R00041 NFA „nie höher als das Fenster“ ist damit erfüllt).
2. Die Fokusfalle fragt ihre bedienbaren Elemente bei jedem Tab neu ab (kein fester Satz), damit später eingefügte Einträge erreichbar sind.
3. Enter wirkt auf den fokussierten Knopf, sonst als Bestätigung (Funktionale Anforderung „Bedienung“) — Einträge von I0042 lösen so ihren Weg aus, nicht „Beenden“.
4. Der Dialog bietet `schliesse({ grund })`, damit ein Eintrag den Dialog schließen und eine Datei wählen kann, ohne dass die Tastenschicht und der Fokus doppelt geregelt werden; der Fokus kehrt bei „Zurück“ und Esc auf den Auslöser zurück.
5. Der Zeitpunkt, an dem der Dialog Zahlen holt (beim Öffnen), ist die eine Stelle, an der I0042 `GET /api/angesehen` und `GET /api/ergebnis` ergänzt.

Abweichungen R00041 und B4003/B4004 gegen diesen Zuschnitt stehen im Bericht als Fragen (nicht hier geändert).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Beenden/` — neu: `AbbrechenEndpunkt`; `BeendenEndpunkt` und `AbbruchEntscheidung` nutzen den gemeinsamen Einmal-Schalter (`Lauf`/`Laufende`, Name offen).
- `src/GitReviewA/Server/Webserver.cs` — Route `/api/abbrechen` hinter `GeschuetzterEndpunkt`.
- `src/GitReviewA/web/` — neu: `beenden-werte.js` (rein: `dialogBeschreibung`, Zählung), `beenden-dialog.js` (Hülle); `beenden.js` (Knöpfe, Endzustände), `index.html`, `gitreviewa.css`, `tasten-werte.js` (Eintrag `q`), `tasten.js` (`offenerDialog`).
- `tests/` (Unit, Integration), `e2e/` (Specs, DSL und Treiber: `beenden()` bestätigt den Dialog an einer Stelle; bestehende Specs ziehen darüber um).
- README (Oberfläche, Exit-Code 130 durch Knopf): Nachzug durch den dokumentar nach dem Bau.

## Technische Überlegungen

**Vorplanung** — Bubbles B4601–B4606 unter I0028; welche es am Ende werden, entscheidet der Entwickler. **Entwurf**: `Dokumentation/Wireframes/oberflaeche-fassung-2.html` (Kopf Zeilen 374–375, „Beenden bestätigen“ Zeilen 761–767); Vorrang vor Material 3, aber nur als Absicht: der Entwurf zeichnet den Dialog „Abbrechen“ nicht.

### Ablauf

1. Knopf oder `q` → Dialog öffnet, holt Anmerkungen, Haken, Netto-Liste → `dialogBeschreibung` → zeichnen (B4601, B4602).
2. Bestätigen „Beenden“ → `beenden-gestartet` → `POST /api/beenden` wie heute → „Review beendet“.
3. Bestätigen „Abbrechen“ → `POST /api/abbrechen` (B4603) → Einmal-Schalter → Server stoppt → Hauptablauf: `AbbruchEntscheidung`, 130 → Seite zeigt „Review abgebrochen“ (B4604).

### Grobentwurf

- `Laufende` (Server, Einmal-Schalter) — `Versuche(Beenden|Abbrechen) → Angenommen | SchonEntschieden(Art)`; `BeendenEndpunkt` und `AbbrechenEndpunkt` fragen ihn, `AbbruchEntscheidung.Entscheide` liest ihn. Signal: gesetzt über denselben Weg.
- `beenden-werte.js` (rein) — `dialogBeschreibung(art, lage)`, `zaehleAnmerkungen(liste)`, Wortlaute.

### Änderungen an bestehenden Klassen

`BeendenEndpunkt` (409 nach Abbruch), `Program.cs` (Auswertung unverändert über `AbbruchEntscheidung`), `beenden.js` (öffnet Dialog statt sofort zu senden).

## Tests

**Unit:** `dialogBeschreibung` (Grenzen 0/1/n, Vorgabe je Art, gesperrt), Katalogeintrag `q`.
**Integration:** Endpunkte (Schutz, Einmal-Schalter beidseitig, Doppelabbruch), Programm als Prozess (stdout/stderr/Exit, Signal an gemerkte PID, auch aus `bash -c '… &'` gestartet — Lehre #21), Oberfläche gegen Fake (Zählung je Modus und Sicht).
**E2E (Playwright):** Hot Path „Beenden mit Ergebnis“ über den Dialog; Fokus, Esc, Enter, Neuladen, Kopf und Fenstergröße — Browser-Eigenes.

## Abhängigkeiten

- Abhängig von: I0027 Oberfläche Liste–Detail (R00012, grün), I0021 Review abbrechen (R00005, grün); berührt I0038 Ergebnis-Spalte live (grün, Kopf, `beenden-gestartet`) und I0020 (Knopf „Ergebnis kopieren“).
- Blockiert: **I0042 Abschlussschritt vor Beenden** (R00041).

## Offene Fragen

Die Empfehlungen sind eingearbeitet und gelten bis zur Antwort des product-owner.

1. **Tastenkürzel** — Empfehlung: `q` öffnet „Beenden“, „Abbrechen“ ohne Kürzel (zerstörerisch, nur per Tab/Maus). Alternativen: beide ohne Kürzel; `q` und `Umschalt+q`. Referenz: Editoren (VS Code „Fenster schließen“ Strg+Q/Strg+W) führen „Beenden“ mit Kürzel und fragen bei ungespeicherter Arbeit nach.
2. **Abbrechen ohne Verlust (0 Anmerkungen, 0 Haken)** — Empfehlung: trotzdem fragen (der Abbruch selbst ist unumkehrbar und sagt der KI „kein Urteil“). Alternative: ohne Rückfrage, wenn nichts verloren geht (Editoren fragen nur bei ungespeicherten Änderungen).
3. **Wortlaut** der Dialoge und der Endzustand „Review abgebrochen“ mit Hinweis (siehe oben). Beenden-Dialog nach Entwurf Fassung 2.
4. **Neuladen und Tab schließen** — Empfehlung: kein `beforeunload`-Dialog (nichts geht verloren, der Server hält den Stand); Neuladen schließt den offenen Dialog.
5. **Zählung im Beenden-Dialog** — Empfehlung: Dateien über die ganze Auswahl, unabhängig von Modus und Sicht (WBS-Empfehlung); das Ergebnis auf stdout zählt weiter Stellen („Ungeprüft: n von m“, R00011), der Dialog nennt Dateien — zwei Einheiten, im Dialog genannt.
6. **Enter bei „Abbrechen“** — Empfehlung: Enter bestätigt nicht (Vorgabe „Zurück“); die WBS legt nur Beenden fest.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- `/wireframe verfeinern D0004` anbieten: Dialog „Abbrechen“, Endzustand „Review abgebrochen“ und die drei Knöpfe im Kopf nachzeichnen (keine Sperre).
- README: Oberfläche, Abbruch per Knopf (dokumentar).

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 6 Bubbles unterhalb I0028 (B4601–B4606), 2 klar (2 h), 4 unklar (2–4 h) — 12–20 h. Nicht enthalten: I0042 (eigene Anforderung R00041).

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: „Beenden“ wirkt heute sofort und nur das Terminal bricht ab. Ein Klick zu viel schickt ein halbes Urteil an die KI; wer nur die Oberfläche vor sich hat, kann nicht „kein Urteil“ sagen. Wenn ein Dialog die Zahl der Anmerkungen und der ungeprüften Dateien nennt und Enter oder Esc entscheiden lässt, beendet der Mensch bewusst; wenn „Abbrechen“ im Kopf denselben Abbruch wie Strg+C auslöst, bekommt die KI Exit 130 statt eines unfertigen Ergebnisses. Der Hebel ist der eine Dialog: I0042 hängt Abschnitte daran, statt einen zweiten Weg zu bauen.

## Missing-Docs

- Ob der Kopf bei 812 px mit drei Knöpfen und dem Zähler eine Zeile hält — mit einem Playwright-Versuch belegen, bevor das CSS festgelegt wird.

## Notizen

### Optionen: wo der Dialog entsteht

| Option | Wirkung | Risiko |
|---|---|---|
| 1. Eine Beschreibung `dialogBeschreibung(art, lage)` plus eine Dialoghülle (gewählt) | Art, Vorgabe, Endzustand und I0042-Abschnitte an einer Stelle | Hülle neben der Hilfe: zwei Fokusfallen, wenn nicht geteilt |
| 2. Zwei getrennte Dialoge (Beenden, Abbrechen) | einfach zu bauen | zwei Orte für Fokus, Enter, Zählung; I0042 müsste einen davon erweitern |
| 3. Native `<dialog>` mit `showModal()` | Fokusfalle und Esc vom Browser | anderes Verhalten als die Hilfe; Entscheidung des Entwicklers, die Eigenschaften oben gelten in jedem Fall |

### Verworfene Alternativen

- Rückfrage von „Abbrechen“ nur bei Verlust: als Frage 2 offen, vorläufig verworfen.
- Browser-Dialog `beforeunload`: verworfen (Frage 4).
- Zweiter Einmal-Schalter nur für den Abbruch: verworfen — Beenden gegen Abbruch braucht einen gemeinsamen Gewinner (R00005 Grenzfall).
