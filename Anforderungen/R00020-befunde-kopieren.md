---
id: R00020
status: Neu
datum: 2026-11-24
---

# R00020: Befunde kopieren

## Beschreibung

Der prüfende Mensch legt das „Ergebnis manueller Review“ mit einem Knopf als Markdown in die Zwischenablage, ohne den Lauf zu beenden. Der kopierte Text ist derselbe, den „Beenden“ auf stdout schreibt — Byte für Byte aus derselben Erzeugungsstelle —, damit er ihn schon während des Reviews an eine KI oder in ein Notizfenster übergeben kann. Anmerkungen, Haken und gesperrte Stellen bleiben unverändert, der Lauf nimmt weiter Eingaben an, und „Beenden“ liefert danach wie bisher das Ergebnis auf stdout.

Zahlt ein auf: [Vision](R00000-vision.md) — „Ergebnis als Rückkanal“ (das Ergebnis ist die Rückmeldung an die KI; die Zwischenablage ist ein zweiter Weg für den Menschen, sie früher zu übergeben) und „Beenden und Abbrechen im Kopf“ (die Aktion liegt im Kopf der Oberfläche). Die Vision nennt stdout als den Kanal zum aufrufenden Prozess; der Kopierweg ergänzt ihn für den Menschen und ändert den Vertrag mit der KI nicht.

## Geschäftlicher Nutzen

Heute bekommt der Mensch das Ergebnis nur über „Beenden“, und das endet den Lauf. Will er eine Zwischenbilanz an die KI geben oder einen Befund in ein Gespräch einfügen, muss er entweder den Review beenden (und verliert die Gelegenheit, weiterzulesen) oder den Text abtippen. Mit dem Knopf übergibt er den Stand in einem Schritt und arbeitet weiter. Weil der Text aus derselben Stelle kommt wie stdout, sagt die eingefügte Fassung genau das, was der Lauf in diesem Augenblick als Ergebnis hätte — es gibt kein zweites Format, das auseinanderlaufen könnte.

## Funktionale Anforderungen

- **Knopf**: Im Kopf der Oberfläche steht „Ergebnis kopieren“; ein Klick legt das Ergebnis manueller Review als Markdown in die Zwischenablage. Der Lauf läuft weiter: kein „Beenden“, kein Siegel, nichts auf stdout, der Prozess bleibt am Leben, die Oberfläche bleibt bedienbar.
- **Eine Erzeugungsstelle**: Der Text entsteht aus derselben Funktion wie die Ausgabe von „Beenden“ (`ErgebnisFormatierer` über die Schnappschüsse von Anmerkungen und Haken). Endpunkt und Oberfläche formatieren nicht selbst; der Beenden-Weg in `Program` wird auf denselben Interactor umgestellt, sodass es genau einen Aufruf gibt.
- **Inhalt**: identisch mit stdout in jedem Zustand — ohne Anmerkung `Keine Anmerkungen.`, mit Anmerkungen nummeriert nach Position und als Zitat, Abschnitt `## Dateien` ab dem ersten Haken, Sperrgründe an gesperrten Stellen wörtlich ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)), unsichtbare und richtungsändernde Zeichen als Marken (`⟨U+202E⟩`, `⟨U+200B⟩`, `⟨U+E0041⟩`, `⟨0xFF⟩`), UTF-8 ohne BOM, Zeilenende LF, genau ein Zeilenumbruch am Ende. Das Format selbst legt [R00002](R00002-beenden-mit-ergebnis.md) fest; diese Anforderung ändert es nicht.
- **Schnittstelle**: `GET /api/ergebnis` → 200 `{ "ergebnis": "<Markdown>" }`. Die Anfrage ändert keinen Zustand; sie liegt hinter der Host-Prüfung ohne CORS-Kopf (wie `GET /api/anmerkungen`), `Cache-Control: no-store` kommt aus dem gemeinsamen Kopf, andere Methoden antworten 405, ein fremder Host 403. Eine Debug-Zeile nennt die Länge, nie den Wortlaut.
- **Zwischenablage**: Der Browser schreibt den Text mit `navigator.clipboard.writeText`; `http://127.0.0.1:<port>` gilt als sicherer Kontext, die API ist dort verfügbar. Fehlt die API oder verweigert der Browser das Schreiben, erscheint eine Meldung; einen `document.execCommand('copy')`-Ersatzweg gibt es nicht (Empfehlung, offene Frage 2).
- **Rückmeldung**: Erfolg „Ergebnis kopiert“ als Status (Live-Region, höflich angesagt), Fehler „Kopieren nicht möglich: Zwischenablage nicht verfügbar“ bzw. „… verweigert“. Der Knopf ist während der Anfrage gesperrt und nimmt danach wieder an; Meldungen nennen nie den Inhalt. Eine Bestätigung vor dem Kopieren gibt es nicht.
- **Nach dem Beenden**: Mit der übrigen Bedienung verschwindet auch der Knopf; die Oberfläche zeigt „Review beendet“ ([R00002](R00002-beenden-mit-ergebnis.md)). Ein Kopieren nach angenommenem „Beenden“ ist kein eigener Fall, weil es keine Bedienung mehr gibt.
- **Wiederholbar und ohne Zwischenspeicher**: Jede Betätigung erzeugt den Stand im Augenblick der Anfrage; nach weiteren Anmerkungen oder Haken liefert die nächste Kopie den neuen Stand.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): Bei 500 Anmerkungen zu je 200 Zeichen antwortet `GET /api/ergebnis` und ist der Text in der Zwischenablage spätestens 1 s nach der Betätigung (Messpunkt: Klick → Erfolgsmeldung; Richtwert, ungemessen). Der Entwickler prüft beim Bau, dass die Grenze von „Beenden“ bis Ausgabe aus [R00002](R00002-beenden-mit-ergebnis.md) nicht schlechter wird.
- **Sicherheit**: Die Anfrage ist lesend und ändert nichts; sie liegt hinter derselben Host-Prüfung wie die übrigen GET-Endpunkte, es gibt keine CORS-Freigabe. Der Text enthält fremde Namen nur mit Marken (dieselbe Funktion wie stdout, keine zweite Zeichenliste — `AI-Team/gelerntes.md`, #17); Fehler- und Debug-Meldungen nennen nie den Wortlaut, sondern höchstens die Länge. Die Zwischenablage wird nur auf Betätigung des Menschen beschrieben, nie automatisch.
- **Logging**: stdout bleibt bis „Beenden“ leer; je Kopie eine Debug-Zeile mit der Länge des Ergebnisses, nicht dem Text; Fehler als Error mit Kontext.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`) — der Entwurf zeigt den Knopf nicht, die Einordnung folgt dem Kopf (offene Frage 1). Der sichtbare Text beginnt mit dem zugänglichen Namen, der Knopf ist per Tastatur und Maus erreichbar, die Rückmeldung ist ohne Farbwahrnehmung lesbar.

## Akzeptanzkriterien

Vorbereitung: **Repo K** im Wegwerf-Ordner (nie das Projekt-Repo; Skript in `user-stories/R00020.md`): `k1` „Start“ legt `a.txt` (`eins`, `zwei`) und `README.md` (`Titel`) an; `k2` „a ändern“ ändert in `a.txt` die Zeile `zwei` zu `ZWEI` und hängt `drei` an. Stellen: `k1` 2, `k2` 1, zusammen 3. Aufruf `gitreviewA $k1 $k2 --kein-browser`; Hashes mit `git rev-parse`. „Kopieren“ = `GET /api/ergebnis` (Integration) bzw. Klick auf „Ergebnis kopieren“ (E2E); „annotieren“ = `POST /api/anmerkungen` mit vollem Hash, Datei, Zeile und Text; „abhaken“ = `POST /api/haken`; „beenden“ = `POST /api/beenden`. **Byte für Byte gleich** heißt: die UTF-8-Kodierung ohne BOM mit LF ist byteweise identisch (bei der Zwischenablage: der gelesene Text so geschrieben). **Repo N** aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (`user-stories/R00014.md`, um `v` ergänzt) liefert die gesperrten Stellen, **Repo W** (unten in `user-stories/R00020.md`) den fremden Namen mit U+202E, U+200B und U+E0041. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Integration“ heißt NUnit gegen den Interactor und den Endpunkt bzw. das Programm als Prozess mit echtem `git` im Wegwerf-Repo, „E2E“ ist Playwright (headless) und kommt nur für die Zwischenablage vor.

### Die Kopie ist das Ergebnis
- [ ] 1. Gegeben ein frischer Lauf mit Repo K ohne Anmerkung und ohne Haken, wenn kopiert wird, dann besteht die Antwort aus genau dem leeren Ergebnis (`# Ergebnis manueller Review`, Leerzeile, `Keine Anmerkungen.`, Zeilenumbruch), stdout ist leer (0 Bytes), und der Prozess läuft weiter (kein Exit, kein „Review beendet“). *Ebene: Integration (Interactor, Endpunkt und Programm als Prozess).*
- [ ] 2. Gegeben Repo K mit der Anmerkung „Warum groß?“ an `a.txt:2` in `k2` (Nummer 1) und `README.md` in `k1` abgehakt, wenn kopiert und danach beendet wird, dann entspricht die Kopie Byte für Byte dem Beispiel unten und stdout nach dem Beenden Byte für Byte derselben Kopie; der Prozess endet mit Exit-Code 0. Rechnung: 1 Anmerkung, 1 von 3 Stellen abgehakt, 2 ungeprüft (`a.txt` in `k1` und `k2`); `README.md` steht in `k1` vor `a.txt` (Reihenfolge von `git`). *Ebene: Integration (Interactor, Endpunkt, Programm mit stdout).*
- [ ] 3. Gegeben ein frischer Lauf mit Repo K, wenn zuerst ohne Anmerkungen kopiert, danach eine Anmerkung an `a.txt:2` in `k2` angelegt und erneut kopiert wird, dann nennt die zweite Kopie `Anmerkungen: 1` und `## 1. a.txt:2`, und „Beenden“ schreibt dieselbe zweite Fassung auf stdout mit Exit-Code 0 — die Kopie siegelt weder Anmerkungen noch Haken. *Ebene: Integration (Programm als Prozess).*
- [ ] 4. Gegeben **Repo N** wie in [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) mit `g.txt` in `n` abgehakt und ohne Anmerkung, wenn kopiert und danach beendet wird, dann entspricht die Kopie Byte für Byte dem Ergebnis aus R00014 Kriterium 4 (drei Zeilen mit ` — Diff nicht lesbar: …`), stdout ist Byte für Byte gleich der Kopie, und der Prozess endet mit Exit-Code 0. *Ebene: Integration (Interactor und Programm; gesperrte Stellen und unlesbare Diffs).*
- [ ] 5. Gegeben **Repo W** mit einem Commit `w`, der die Datei `u⟨U+202E⟩⟨U+200B⟩⟨U+E0041⟩.txt` hinzufügt, und einer Anmerkung „Text“ an Zeile 1, wenn kopiert und danach beendet wird, dann enthält die Kopie den Namen mit den drei Marken `⟨U+202E⟩`, `⟨U+200B⟩`, `⟨U+E0041⟩` (nicht die Zeichen selbst), keine rohen Steuerzeichen, und ist Byte für Byte gleich stdout. *Ebene: Integration (Interactor und Programm; fremde Zeichen).*

```
# Ergebnis manueller Review

Anmerkungen: 1

## 1. a.txt:2

Commit: <voller Hash von k2>

> Warum groß?

## Dateien

Abgehakt: 1 von 3

- README.md (Commit <voller Hash von k1>)

Ungeprüft: 2 von 3

- a.txt (Commit <voller Hash von k1>)
- a.txt (Commit <voller Hash von k2>)
```

### Bedienung und Zwischenablage (nur im Browser prüfbar)
- [ ] 6. Gegeben Repo K im Browser, die Anmerkung und der Haken aus Kriterium 2, wenn man „Ergebnis kopieren“ betätigt, dann steht „Ergebnis kopiert“ als Status da, der Inhalt der Zwischenablage (als UTF-8 ohne BOM geschrieben) ist Byte für Byte gleich dem Beispiel und gleich stdout nach dem Beenden, der Lauf läuft weiter (die Dateiliste bleibt bedienbar), und nach „Beenden“ ist der Knopf samt übriger Bedienung verschwunden. *Ebene: E2E (Playwright; das Schreiben in die Zwischenablage ist nur im Browser prüfbar, kein Hot-Path-Fall).*
- [ ] 7. Gegeben ein Browser, in dem `navigator.clipboard.writeText` fehlt oder mit `NotAllowedError` ablehnt (per `addInitScript` gesetzt), wenn man „Ergebnis kopieren“ betätigt, dann steht „Kopieren nicht möglich: Zwischenablage nicht verfügbar“ bzw. „… verweigert“ da, die Seite zeigt den Ergebnisinhalt nirgends an, weder auf stdout noch in der Seite steht ein Ergebnis, der Lauf läuft weiter, und nach dem Neuladen ohne die Sperre kopiert derselbe Knopf erfolgreich. *Ebene: E2E (Browser-Eigenes: Fehlerpfad).*

### Schnittstelle und Schutz
- [ ] 8. Gegeben ein laufender Review, wenn `GET /api/ergebnis` mit fremdem Host (nicht `127.0.0.1:<port>`) angefragt wird, dann wird abgelehnt (403); mit `POST /api/ergebnis` abgelehnt (405); die Antwort trägt keinen `Access-Control-Allow-Origin`-Kopf; zwei GET-Anfragen hintereinander liefern denselben Text, ändern keinen Zustand (kein Siegel, stdout bleibt leer) und tragen `Cache-Control: no-store`. *Ebene: Integration (Endpunkt auf freiem Port).*

Grenz- und Leerfälle bedacht: keine Anmerkung und kein Haken (Kriterium 1); die letzte Anmerkung und den letzten Haken nach einer Kopie (Kriterium 3); gesperrte Stellen und unlesbare Diffs (Kriterium 4, derselbe Weg wie stdout); fremde Zeichen (Kriterium 5); fehlende Zwischenablage (Kriterium 7); fremder Host und fremde Methode (Kriterium 8). Verworfen als eigenes Kriterium: 500 Anmerkungen (die Grenze aus R00002 gilt; eine eigene Zeitmessung nur im Browser wäre kein neuer Nachweis), Übersicht nicht lesbar (die Kopie nutzt `GemerktOderLeer` und ist dann wie stdout ohne Abschnitt `## Dateien` — derselbe Weg, kein eigener Fall), ein Kopieren nach „Beenden“ (die Bedienung ist weg, kein eigener Fall).

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (Themenordner in `src/GitReviewA/`, Oberfläche unter `web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Beenden/` — neuer Interactor `ErgebnisKopierenInteractor`, DTO `ErgebnisKopierenAntwort`, dünner Adapter `ErgebnisKopierenEndpunkt`; `ErgebnisFormatierer` und `StdoutErgebnis` bleiben unverändert, `Program` schreibt über den Interactor.
- `Server/` — eine Route `GET /api/ergebnis` in `Webserver.BildeRueckkanal`.
- `web/` — `ergebnis-kopieren.js` (Knopf, Anfrage, Zwischenablage, Rückmeldung), `index.html` (Knopf und Statuszeile im Kopf), `gitreviewa.css`.
- `tests/GitReviewA.Tests/Akzeptanz/` — Treiber und Sprache wie `ZeileAnnotierenTests`; `e2e/` — ein Spec für die Zwischenablage (Kriterien 6 und 7).

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden und wie die Klassen heißen, entscheidet der Entwickler beim Bauen.

### Ablauf

1. **Kopieren wählen** (Oberfläche) — Klick auf „Ergebnis kopieren“ → `GET /api/ergebnis`; der Knopf ist gesperrt, bis die Antwort da ist.
2. **Ergebnis erzeugen** (Interactor, lesend)
   - 2.1 `Anmerkungsspeicher.Schnappschuss()` und `DateiAbhakenInteractor.Ergebnisstand()` lesen (kein Siegel, kein `git`-Aufruf; eine unlesbare Übersicht liefert den leeren Stand wie beim Beenden).
   - 2.2 `ErgebnisFormatierer.Formatiere(anmerkungen, dateien)` — dieselbe Funktion wie die Ausgabe von „Beenden“.
   - 2.3 Debug-Zeile mit Länge, nie mit dem Text.
3. **Antwort** — 200 mit `{ ergebnis }`; kein Zustandswechsel.
4. **Zwischenablage** (Oberfläche) — `navigator.clipboard.writeText(text)`; Erfolg → „Ergebnis kopiert“; Ausnahme oder fehlende API → Meldung, kein Ersatzweg; Knopf wieder frei.
5. **Beenden unverändert** — `Program` schreibt das Ergebnis über denselben Interactor auf stdout, Exit 0; der Knopf verschwindet mit der Bedienung.

### Grobentwurf

**Einstiegsstellen:** der Kopf in `web/index.html`, `Webserver.BildeRueckkanal` und `Program.GibErgebnisOderAbbruchAus`.

- `ErgebnisKopierenInteractor` (Interactor) — liest beide Speicher und formatiert; kein Schreiben, kein Siegel.
  - `ErgebnisKopierenAntwort Erzeuge()`
- `ErgebnisKopierenAntwort` (DTO, immutable) — das Markdown-Ergebnis als `Ergebnis`.
- `ErgebnisKopierenEndpunkt` (dünner Adapter) — `GET /api/ergebnis` → 200 JSON; keine Logik.
- `Program` (Adapter, geändert) — `StdoutErgebnis.Schreibe(new ErgebnisKopierenInteractor(server.Anmerkungen, server.DateiAbhaken).Erzeuge().Ergebnis)`; die zweite Formatierstelle entfällt.
- `web/ergebnis-kopieren.js` (Adapter) — Knopf, `fetch`, `navigator.clipboard.writeText`, Rückmeldung; der Text wird nicht angezeigt und nicht zwischengespeichert.

### Änderungen an bestehenden Klassen

- `Program.GibErgebnisOderAbbruchAus` — ruft den neuen Interactor statt `ErgebnisFormatierer.Formatiere` direkt.
- `Webserver.BildeRueckkanal` — zusätzliche `MapGet("/api/ergebnis", …)`; die vorhandenen Routen bleiben unverändert.
- `web/index.html` — Knopf `ergebnis-kopieren` im Kopf vor „Beenden“, Statuszeile `kopieren-status`; `gitreviewa.css` — Stil wie die vorhandenen Kopfknöpfe (`kz-btn`).
- Unverändert (bewusst): `ErgebnisFormatierer`, `StdoutErgebnis`, `Anfrageschutz`, `GeschuetzterEndpunkt`, `BeendenEndpunkt`, der Anmerkungs- und Hakenspeicher.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction; Akzeptanzkriterien als NUnit-Integration gegen `ErgebnisKopierenInteractor` und den Endpunkt (Treiber in-process, echtes `git` im Wegwerf-Repo); Playwright nur für die Zwischenablage (Kriterien 6 und 7, Browser-Eigenes, kein Hot Path).

**Unit (rein):** `ErgebnisFormatierer` bleibt durch R00002/R00011/R00014 gedeckt; neu ist die Zusammensetzung im Interactor (leerer Stand, Anmerkung, Haken, gesperrte Stelle) und dass der Interactor nichts siegelt (Schnappschuss vor und nach dem Aufruf gleich).
**Integration:** Kriterien 1 bis 5 und 8 gegen Interactor, Endpunkt und das Programm als Prozess (stdout, stderr und Exit-Code getrennt); Mutanten: Kopie siegelt den Speicher → Kriterium 3 rot; Endpunkt formatiert selbst (zweite Erzeugungsstelle) und weicht vom Formatierer ab → Kriterium 2 rot; Interactor nimmt die gesperrten Stellen nicht mit → Kriterium 4 rot; Host-Prüfung fehlt → Kriterium 8 rot.
**E2E:** ein Spec für Kriterium 6 und 7; Zwischenablage über `context.grantPermissions(['clipboard-read', 'clipboard-write'])` und `navigator.clipboard.readText()`, Fehlerpfad per `addInitScript`.

## Abhängigkeiten

- Abhängig von: I0019 Beenden mit Ergebnis ([R00002](R00002-beenden-mit-ergebnis.md), grün), I0016 Datei abhaken und I0030 Sperre ([R00011](R00011-datei-abhaken.md), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md), für den Inhalt).
- Blockiert: I0027 Oberfläche (nimmt den Knopf in den neuen Kopf auf), I0028 Beenden und Abbrechen im Kopf (ordnet die Kopfaktionen), I0015 Tastaturbedienung (Kürzel, falls gewünscht).
- Nicht Teil dieser Anforderung: ein zweites Ausgabeformat (JSON als Kopie), Speichern der Kopie als Datei, ein Tastenkürzel (I0015), ein Ersatzweg über `document.execCommand`.

## Offene Fragen

1. An den product-owner: **Ort und Beschriftung des Knopfs.** Der Entwurf Fassung 2 zeigt keinen Kopierknopf. Empfehlung: im Kopf neben „Beenden“, links von „Abbrechen“, sichtbarer Text „Ergebnis kopieren“, ohne Zahl am Knopf (die Anmerkungszahl zeigt der Beenden-Knopf ab I0028); I0027 und I0028 übernehmen ihn in den neuen Kopf.
2. An den product-owner: **Rückfall ohne Clipboard-API.** Empfehlung: kein `document.execCommand('copy')`-Ersatzweg (veraltet, nach dem asynchronen Holen ist die Nutzergeste verbraucht, und ein zweiter Weg wäre eine zweite Fehlerquelle); stattdessen eine klare Meldung, der Lauf läuft weiter, ein erneuter Versuch ist möglich. Alternative: bei Fehler den Text in einem Dialog zum manuellen Kopieren zeigen (mehr Oberfläche, eigener Zustand).
3. An den product-owner: **Wortlaut der Rückmeldung.** Empfehlung: schlicht „Ergebnis kopiert“ ohne Zahl; die Zahl steht im Ergebnis selbst und, ab I0028, am Beenden-Knopf. Alternative: „Ergebnis kopiert (n Anmerkungen)“.

Keine der Fragen blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 5 Bubbles unterhalb I0020 (B1901–B1905), davon 3 klar (2 h) und 2 unklar (2–4 h) — Untergrenze 10 h, obere Schätzung 14 h. Enthalten: nur I0020. Nicht gezählt: I0027, I0028 und I0015, die den Knopf in ihre Oberfläche aufnehmen.

## Warum löst diese Anforderung das Problem?

Auslöser: Der Mensch liest einen Zwischenstand und will ihn der KI geben, aber „Beenden“ beendet den Lauf — also tippt er ab oder beendet früher als gewollt. Das Zielbild ist ein Rückkanal, der den Stand liefert, wann der Mensch ihn geben will. Wenn derselbe Formatierer, der stdout speist, auch die Kopie erzeugt, dann ist der eingefügte Text beweisbar derselbe wie das spätere Ergebnis (Kriterien 2 bis 5), und die Kopie kann den Vertrag mit der KI nicht verändern. Weil die Kopie nicht siegelt (Kriterium 3), bleibt der Review offen, und „Beenden“ behält seine Rolle als einziger Abschluss. Der Hebel ist die **eine Erzeugungsstelle**: sie macht die Kopie prüfbar (Byte-Vergleich) und verhindert, dass eine zweite Formatierung in JavaScript oder im Endpunkt still auseinanderläuft.

## Missing-Docs

- `navigator.clipboard` und Berechtigungen in Chromium und Firefox für `http://127.0.0.1:<port>` (Secure Context) sowie das Setzen der Berechtigung in Playwright (`grantPermissions`, `clipboard-read`/`clipboard-write`): vor dem Bauen mit einem kleinen Versuch belegen, samt Fehlerfall ohne Berechtigung.
- Ob die Zwischenablage den Text mit LF unverändert aufnimmt (keine Umwandlung in CRLF) — im selben Versuch prüfen.

## Notizen

### Optionen (Weg des Textes in die Zwischenablage)

| | Option | Erzeugungsstelle | Testbarkeit | Risiko | Aufwand |
|---|---|---|---|---|---|
| A | **Server erzeugt über den gemeinsamen Interactor, `GET /api/ergebnis`, Browser schreibt in die Zwischenablage** (gewählt) | genau eine (C#) | Byte-Vergleich Kopie/stdout; Clipboard nur im Browser | Endpunkt liefert den Text auch an fremde Seiten? Nein: Host-Prüfung, kein CORS | 5 Bubbles, 10–14 h |
| B | Browser holt Anmerkungen und Haken und formatiert selbst | zweite (JavaScript) | zwei Formatierer müssen gleich bleiben; Byte-Vergleich nur durch Nachbau | Drift: jede Formatänderung muss an zwei Stellen passieren | 4–6 Bubbles, ungemessen |
| C | Kopie als Datei/Download | eine (C#) | Datei vergleichbar | schreibt auf die Platte (Leitplanke „Nichts wird gespeichert“), ein weiterer Weg zum Öffnen | 5–7 Bubbles, ungemessen |

Gewählt: A. B verletzt „eine Erzeugungsstelle“ und damit die prüfbare Zusage „Byte für Byte“; C widerspricht der Leitplanke und dem Ziel, den Text direkt einzufügen.

### Antwortform der Schnittstelle

`application/json` mit `{ "ergebnis": "…" }` (gewählt, wie die übrigen Endpunkte) gegen `text/markdown`. JSON ist konsistent mit `GET /api/anmerkungen` und `GET /api/haken`, der Roundtrip ist verlustfrei; das Format selbst bleibt Markdown (R00002). Ein `Content-Type: text/markdown` wäre kürzer, aber ein zweiter Antworttyp ohne Nutzen.

### Verworfene Alternativen

- Kopieren über die Zwischenablage des Servers (xclip o. Ä.): hängt an der Plattform, funktioniert ohne Browser nicht und wäre eine zweite, ungetestete Grenze.
- Automatisches Kopieren nach jeder Änderung: der Mensch entscheidet, wann er den Stand übergibt; automatische Zwischenablage überschreibt seine eigene.
- Ein Dialog mit dem Text als Ausweg: eigene Oberfläche und ein Zustand mehr; erst nötig, wenn Frage 2 anders entschieden wird.

### Vorgaben für Folgekarten (nicht Abnahme dieser Karte)

- **I0027 Oberfläche** — der neue Kopf nimmt „Ergebnis kopieren“ neben „Beenden“ auf; der Knopf bleibt an dieselbe Anfrage gebunden und zeigt dieselbe Rückmeldung.
- **I0028 Beenden und Abbrechen im Kopf** — ordnet die Kopfaktionen (Kürzel, „Ergebnis kopieren“, „Abbrechen“, „Beenden“); die Bestätigung von „Beenden“ ändert am Kopieren nichts.
- **I0015 Tastaturbedienung** — ein Kürzel für das Kopieren ist möglich, aber nicht Teil dieser Karte.