---
id: R00037
status: Neu
datum: 2026-11-25
---

# R00037: Ergebnis-Spalte live

## Beschreibung

Rechts neben dem Diff steht die Spalte **„Ergebnis für die KI“**. Sie zeigt genau den Text, den „Beenden“ in diesem Moment auf stdout ausgeben würde, und zeigt nach jedem Anlegen, Ändern und Löschen einer Anmerkung und nach jedem Haken den neuen Stand. Die Spalte ist ein eigener Bereich mit eigenem Bildlauf und lässt sich ein- und ausklappen; ist das Fenster zu schmal für drei Bereiche, ist sie eingeklappt.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (rechts „Ergebnis für die KI“, das mitwächst; ergänzt 2026-11-25) und „Ergebnis als Rückkanal“.

Baut auf auf: [R00020](R00020-befunde-kopieren.md) (`GET /api/ergebnis`, eine Erzeugungsstelle), [R00033](R00033-seitenleiste-bleibt-stehen.md) (getrennte Rollbereiche), [R00035](R00035-seitenleiste-ein-und-ausklappen.md) (Einklappen am Rand, Streifen), [R00034](R00034-breite-der-seitenleiste-ziehen.md) (Breitenregel links).

**Abgelöste Zusage**: [R00020](R00020-befunde-kopieren.md) Kriterium 7 verlangt im Fehlerfall der Zwischenablage, dass „die Seite den Ergebnisinhalt nirgends“ zeigt (PO Zeile 112: kein Dialog als Ersatzweg). Mit Richtung A (Betreiber 2026-11-25) zeigt die Seite das Ergebnis immer in dieser Spalte; der Satz „die Seite zeigt den Ergebnisinhalt nirgends an“ gilt deshalb nicht mehr. Der übrige Inhalt von Kriterium 7 (Meldung, kein Ersatzweg, Lauf läuft weiter, nach Neuladen kopierbar) bleibt. R00020 selbst bleibt unverändert.

### Domänenbezug

Kein Glossar im Projekt. „Ergebnis“ ist das „Ergebnis manueller Review“ aus R00002.

## Geschäftlicher Nutzen

Heute sieht der Mensch erst nach „Beenden“ (oder über die Zwischenablage), was bei der KI ankommt. Mit der Spalte sieht er beim Prüfen, wie seine Anmerkungen gelesen werden — Stelle, Art, Text, ungeprüfte Dateien —, und korrigiert, bevor das Ergebnis endgültig ist. Fehler im Rückkanal (falsche Zeile, vergessene Datei) fallen auf, solange sie noch zu beheben sind.

## Funktionale Anforderungen

- **Eine Quelle** (Pflichtpunkt 5): der Text der Spalte kommt aus `GET /api/ergebnis` (R00020), also aus demselben `ErgebnisFormatierer` wie stdout und „Ergebnis kopieren“. Die Oberfläche formatiert nichts selbst.
- **Auffrischen**: nach jedem erfolgreichen Anlegen, Ändern, Löschen einer Anmerkung und Setzen oder Entnehmen eines Hakens (auch Stapel-Haken in „Zusammen“) holt die Spalte den Stand neu. Höchstens **eine** Anfrage läuft gleichzeitig; kommen währenddessen weitere Änderungen, folgt **genau eine** weitere Anfrage; eine ältere Antwort überschreibt nie eine neuere. Ausblenden, Ansicht, Modus und Suche ändern das Ergebnis nicht und lösen nichts aus.
- **Darstellung**: Überschrift „Ergebnis für die KI“; darunter der Text unverändert als vorformatierter Text (`textContent`), lange Zeilen umbrochen, kein waagerechter Bildlauf. Die Bildlaufposition bleibt beim Auffrischen.
- **Fehler**: scheitert das Holen, steht eine Zeile „Ergebnis konnte nicht geladen werden“ über dem Text, der letzte Stand bleibt sichtbar und ist als „veraltet“ gekennzeichnet; die nächste Änderung versucht es erneut.
- **Einklappen**: ein Knopf am linken Rand der Spalte (am Rand zum Diff) klappt sie ein und aus — eingeklappt bleibt ein schmaler Streifen mit dem Knopf, die Spalte ist `hidden`/`inert`, der Diff bekommt die Breite. Der Knopf trägt `aria-expanded`, einen Namen „Ergebnis-Spalte einklappen“/„… ausklappen“ und das Kürzel `r`; diese Karte setzt den Katalogeintrag mit `ziel` (Katalog aus R00030; R00030 bleibt unverändert, der Eintrag entsteht hier wie bei jeder Karte, die ein Bedienelement mit Kürzel baut). Der Fokus wandert beim Einklappen auf den Knopf. Gebaut über dieselbe Einklapp-Mechanik wie R00035 (je Seite), keine Kopie.
- **Breiten** (entschieden, PO Zeile 194): Breite der Spalte 320 px. Start ausgeklappt ab 1012 px Fensterbreite (360 Seitenleiste + 320 Diff + 320 Spalte + 2 × 6 Trenner), darunter eingeklappt. Unter 812 px (240 + 320 + 240 + 2 × 6, die drei Mindestbreiten) ist Ausklappen nicht möglich; der Knopf ist gesperrt und nennt den Grund „Fenster zu schmal“. Unter 566 px (eine Spalte, R00033) gibt es weder Spalte noch Streifen; „Ergebnis kopieren“ bleibt. Die Höchstbreite der linken Seitenleiste (R00034) rechnet die ausgeklappte Spalte ein, sodass der Diff nie unter 320 px fällt.
- **Zustand**: ein-/ausgeklappt ist Zustand der Seite (nur RAM), bleibt bei Datei-, Commit-, Modus-, Ansichts- und Anordnungswechsel; nach dem Neuladen gilt der Start nach Fensterbreite.
- **Nach „Beenden“** zeigt die Spalte den ausgegebenen Stand und frischt nicht mehr auf.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): Am Lastprofil (500 Anmerkungen zu je 200 Zeichen, 2 000 Stellen mit Haken) steht der neue Stand ≤ 1 s nach der Antwort des Speicherns in der Spalte (Messwert ≤ 0,7 s, `rollen/planer/zeitkriterien.md` der Factory). Darüber (bis 500 × 10 000 Zeichen plus Bereichszitate, rund 7 MB) gibt es keine Zeitzusage, aber die Oberfläche bleibt bedienbar, weil höchstens zwei Anfragen je Änderungsfolge laufen. Je Zeile gilt keine Kürzung in der Spalte (der Text ist der von stdout), lange Zeilen werden umbrochen; die Zitatzeilen sind schon auf 200 Zeichen begrenzt (R00031).
- **Sicherheit**: der Text enthält Namen aus dem fremden Repo und Text des Menschen; er erscheint nur über `textContent`, nie als HTML; die Marken `⟨U+…⟩` stammen aus dem Formatierer. `GET /api/ergebnis` bleibt durch Host-Prüfung und fehlende CORS-Freigabe geschützt (R00020); kein neuer Endpunkt.
- **Logging** (Pflichtpunkt 4): die Oberfläche schreibt nichts auf stderr; der Server bleibt bei der Debug-Zeile mit Länge aus R00020.
- **Benutzerfreundlichkeit**: Überschrift und Rollbereich haben Namen für Screenreader; das Auffrischen ist **keine** Live-Region (sonst läse der Screenreader bei jeder Anmerkung das ganze Ergebnis vor; Linie von PO Zeile 161).

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (`user-stories/R00012.md`), **Repo N plus `v`** (gesperrte Stellen, `user-stories/R00014.md`), **Commit `g`** (2 000 Dateien, `user-stories/R00011.md` Szenario 10). Aufruf `gitreviewA <Hashes> --kein-browser`, Fenster 1280 × 800, Start in „Zusammen“.

### Gleich stdout (Pflichtpunkt 5)
- [ ] 1. Gegeben Repo Z mit zwei Anmerkungen und einem Haken, wenn man danach „Beenden“ betätigt, dann ist der Text der Spalte unmittelbar vor dem Beenden Zeichen für Zeichen gleich stdout; ohne Anmerkung und Haken zeigt die Spalte `# Ergebnis manueller Review`, eine Leerzeile und `Keine Anmerkungen.`. *Ebene: Integration (Oberfläche gegen das laufende Programm, Text verglichen) — Playwright, weil nur im Browser prüfbar, was die Spalte zeigt.*

### Live
- [ ] 2. Gegeben Repo Z und die Spalte mit „Keine Anmerkungen.“, wenn man `src/a.txt:2` mit „ZWEI groß?“ anmerkt, die Anmerkung ändert, löscht und danach `src/b.txt` abhakt, dann zeigt die Spalte nach jedem Schritt den neuen Stand (`## 1. src/a.txt:2` mit dem Text, dann der geänderte Text, dann „Keine Anmerkungen.“, dann der Abschnitt `## Dateien` mit `src/b.txt` unter „Abgehakt“). *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 3. Gegeben ein Fake, der jede Anfrage an `GET /api/ergebnis` 300 ms verzögert, wenn man in 100 ms zehn Haken setzt, dann laufen höchstens zwei Anfragen (Zähler am Fake), keine gleichzeitig, und die Spalte zeigt am Ende den Stand mit allen zehn Haken; antwortet die ältere Anfrage nach der neueren, bleibt der neuere Stand stehen. *Ebene: Unit (Auffrischregel) und Integration (Oberfläche gegen Fake, verzögert).*
- [ ] 4. Gegeben eine Spalte mit Bildlaufposition in der Mitte, wenn eine weitere Anmerkung entsteht, dann bleibt die Position; wenn das Holen mit 500 scheitert, steht „Ergebnis konnte nicht geladen werden“, der letzte Stand bleibt als „veraltet“ gekennzeichnet, und die nächste Änderung holt den Stand erfolgreich. *Ebene: Integration (Oberfläche gegen Fake), Fehlerpfad.*
- [ ] 5. Gegeben der Commit `g` aus `user-stories/R00011.md` Szenario 10 (2 000 Dateien, 1 000 über die Schnittstelle abgehakt) und 500 Anmerkungen zu je 200 Zeichen an Zeilen dieser Dateien (über die Schnittstelle; Lastprofil), wenn man eine weitere Anmerkung speichert, dann steht sie ≤ 1 s nach der Antwort des Speicherns in der Spalte (Messwert ≤ 0,7 s, ereignisgenau). *Ebene: Playwright (Lastprofil, nur im Browser messbar).*

### Bereich, Einklappen, Breiten (Pflichtpunkte 2 und 3)
- [ ] 6. Gegeben 1280 × 800, wenn die Seite startet, dann steht die Spalte ausgeklappt (320 px) rechts als eigener Rollbereich mit eigener Bildlaufleiste: Scrollen in der Spalte bewegt weder Diff noch Seitenleiste und umgekehrt; Kopf und Statuszeile stehen; eine Anmerkung mit einer Zeile aus 5 000 Zeichen erzeugt keinen waagerechten Bildlauf. *Ebene: Playwright (Darstellung).*
- [ ] 7. Gegeben ausgeklappt, wenn man den Knopf am Rand oder `r` betätigt, dann ist die Spalte nicht sichtbar und nicht im Tab-Weg, ein Streifen mit dem Knopf bleibt, `aria-expanded` ist `false`, der Fokus steht auf dem Knopf, und der Diff ist um die Spaltenbreite breiter; erneutes Betätigen klappt aus. Der Zustand bleibt bei Datei-, Commit-, Modus-, Ansichts- und Anordnungswechsel und ist nach dem Neuladen wieder der Start. *Ebene: Playwright (Browser-Eigenes).*
- [ ] 8. Gegeben die Fensterbreiten 1011 px, 900 px, 811 px und 565 px, wenn die Seite startet, dann ist die Spalte bei 1011 und 900 px eingeklappt und ausklappbar (Diff danach ≥ 320 px), bei 811 px eingeklappt mit gesperrtem Knopf und dem Grund „Fenster zu schmal“, bei 565 px gibt es weder Spalte noch Streifen; zieht man bei 1280 px mit ausgeklappter Spalte die linke Seitenleiste auf das Höchstmaß, bleibt der Diff ≥ 320 px. *Ebene: Unit (Breitenregel) und Playwright (Darstellung).*

### Sicherheit
- [ ] 9. Gegeben Repo N plus `v` (Namen mit Rohbytes und U+202E) und eine Anmerkung mit dem Text `<img src=x onerror=alert(1)>`, wenn die Spalte auffrischt, dann steht der Text wörtlich da (kein Element `img`, kein Dialog), Namen tragen die Marken wie auf stdout, und die Zeilen „Ungeprüft“ nennen den Grund „Diff nicht lesbar“. *Ebene: Playwright (DOM-Sicherheit).*

### Katalog
- [ ] 10. Gegeben die Hilfe (`?`), wenn man sie öffnet, dann steht `r` genau einmal im Katalog mit „Ergebnis-Spalte ein-/ausklappen“ und zeigt als Ort („Ziel“) auf den Knopf am Rand; es gibt keinen zweiten Katalog. *Ebene: Unit (Katalog, R00030).*

Grenz- und Leerfälle bedacht: leeres Ergebnis (1); Fehler beim Holen (4); schnelle Folge und Reihenfolge (3); Lastprofil (5); schmale Fenster (8); nach „Beenden“ keine Anfrage mehr (kein eigenes Kriterium, gleiche Prüfung wie 3 mit Zähler — aufgenommen als Unit der Auffrischregel). Verworfen: Live-Region (siehe NFA).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 3, 5, 6 und NFA „Grenzen“; 2 Anzeigeverfahren — Kriterium 7 (alle Wechsel; „Zusammen“ ist der Start aller Kriterien), das Ergebnis selbst hängt von keiner Ansicht ab; 3 festes Layout — die Spalte ist Rollbereich, die Fehlerzeile ist eine Zeile (Kriterien 4, 6); 4 Ausführungsort — Browser ohne stderr; 5 eine Quelle — Kriterium 1.

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/ergebnis-spalte.js` (neu), `ergebnis-werte.js` (neu, Auffrischregel), `index.html`, `gitreviewa.css`.
- `src/GitReviewA/web/einklappen.js` (aus R00035, je Seite verallgemeinert), `trenner-werte.js` (Höchstbreite links mit Spalte), `tasten-werte.js` (`r`).
- `e2e/` und `tests/` wie R00020/R00035.

## Technische Überlegungen

**Vorplanung** — Bubbles B3601–B3606 unter I0038. **Artboard**: Variante A von „gitreviewA – Review-Fluss A/B“ (rechte Spalte „Ergebnis für die KI“); Entwurf Fassung 2 zeichnet keine dritte Spalte, die Lücke füllt Material 3 (Supporting pane der Canonical Layouts).

### Ablauf

1. Änderungsereignis (`anmerkung-*`, `haken-*`) → Auffrischregel (B3601).
2. `GET /api/ergebnis` → Text in die Spalte, Position bleibt (B3602, B3603).
3. Knopf/`r` → ein-/ausklappen (B3604); Fensterbreite → Start und Sperre (B3605).

### Grobentwurf

- `ergebnis-werte.js` (rein) — `naechsteAnfrage(zustand, ereignis)` → `anfragen | warten | nichts`; Antwortfolge nach Fassung der Anfrage.
- `ergebnis-spalte.js` (Oberfläche) — Spalte, Fehlerzeile, Kennzeichen „veraltet“.
- `einklappen.js` — Seite als Parameter (`links`/`rechts`).

### Änderungen an bestehenden Klassen

Keine Serverklasse. `trenner-werte.js` (Höchstbreite links), `einklappen.js` (je Seite), `tasten-werte.js` (`r`), `haken.js`/`anmerkungen.js` senden ihre Ereignisse (falls noch nicht vorhanden). Der Test zu R00020 Kriterium 7 prüft nur noch Meldung und fehlenden Ersatzweg.

## Tests

**Unit:** Auffrischregel (eine, zehn, Reihenfolge, nach „Beenden“), Breitenregel (1012, 1011, 812, 811, 566, 565), Katalog (`r` einmal).
**Integration:** Oberfläche gegen Fake (live, Fehler, Position, verzögerter Fake).
**E2E (Playwright):** gleich stdout, Lastprofil, Rollbereich, Einklappen, Breiten, DOM-Sicherheit — Browser-Eigenes; nicht Hot Path.

## Abhängigkeiten

- Abhängig von: I0020 Befunde kopieren (R00020, grün), I0034 Seitenleiste bleibt stehen (R00033, grün), I0036 Seitenleiste ein- und ausklappen (R00035, rot — Einklapp-Mechanik).
- Blockiert: I0042 Abschlussschritt (R00041), I0043 Ergebnis-Spalte ziehen (R00042).

## Offene Fragen

Keine offenen. Der product-owner hat beide Fragen am 2026-11-25 entschieden (`AI-Team/po-entscheidungen.md`, Zeile 194); die Antworten sind oben eingearbeitet:

1. **Breiten und Start** — entschieden (PO Zeile 194): 320 px, ausgeklappt ab 1012 px, unter 812 px nicht ausklappbar, unter 566 px keine Spalte (Rechnung oben). Alternative „immer eingeklappt starten“ verworfen — dann sieht der Mensch den Nutzen der Richtung A erst nach einem Klick.
2. **Kürzel `r`** — entschieden (PO Zeile 194): frei im Katalog (belegt: `? Esc j k u x m [ ] h n p s v w l g o / a e b Enter ↑↓`, dazu `1 2 3` aus R00036); `r` für „Ergebnis“; den Katalogeintrag setzt diese Karte (Kriterium 10), R00030 bleibt unverändert.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- `/wireframe verfeinern D0004` anbieten (Spalte nachzeichnen), keine Sperre (PO Zeile 180).

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 6 Bubbles unterhalb I0038 (B3601–B3606), 1 klar (2 h), 5 unklar (2–4 h) — 12–22 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist Richtung A: rechts eine Spalte „Ergebnis für die KI“, die live mitwächst. Heute ist das Ergebnis bis zum Ende unsichtbar; ein Fehler darin (Anmerkung an der falschen Datei, Haken vergessen) fällt erst auf, wenn nichts mehr zu ändern ist. Wenn die Spalte nach jeder Änderung denselben Text zeigt wie stdout, prüft der Mensch den Rückkanal beim Arbeiten mit, und was er sieht, ist garantiert, was die KI bekommt — weil es eine Erzeugungsstelle gibt. Der Hebel ist die vorhandene Schnittstelle `GET /api/ergebnis`: kein neuer Formatierer, nur ein neuer Leser. Einklappen und Breitenregel halten den Diff, die Hauptsache, lesbar.

## Missing-Docs

- Ob 7 MB `textContent` in einem `pre` im Zielbrowser ohne lange Aufgabe gesetzt werden — vor dem Bauen messen; falls nicht, ist das ein eigener Befund, keine Kürzung (die Spalte muss gleich stdout sein).

## Notizen

### Optionen (Auffrischen)

| Option | Aktualität | Aufwand | Risiko |
|---|---|---|---|
| **1. Nach eigener Änderung holen, höchstens eine Anfrage plus eine nachlaufend (gewählt)** | sofort | klein | keiner bei einem Tab je Lauf (Vision) |
| 2. Server schiebt Änderungen (Server-Sent Events) | sofort | neuer Kanal, neue Sicherheitsfläche | Mehrbenutzer-Denken ohne Bedarf |
| 3. Im Browser selbst formatieren | sofort | zweiter Formatierer | zwei Wahrheiten — verworfen |

### Verworfene Alternativen

- Spalte als Dialog oder Reiter: verworfen — Richtung A will sie neben dem Diff.
- Kürzen langer Zeilen in der Spalte: verworfen — die Spalte soll gleich stdout sein; Umbruch genügt.
