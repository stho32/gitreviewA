---
id: R00045
status: Neu
datum: 2026-11-25
---

# R00045: Mehrere Dateien in der Seitenleiste (Dateiansicht)

## Beschreibung

`gitreviewA --dateien a.sql b.sql …` zeigt mehrere Dateien in einem Lauf: links stehen sie in der Reihenfolge des Aufrufs in der Seitenleiste, die erste ist gewählt, Klick und `j`/`k` wählen eine andere, rechts steht sie wie in [R00043](R00043-datei-ansehen-und-kopieren.md). Höchstens 50 Angaben, zusammen höchstens 32 MiB. Ist eine Angabe fehlerhaft, nennt gitreviewA **alle** fehlerhaften mit Grund auf stderr und startet nicht (Exit 2). Löst in R00043 die Regel „Die Dateiansicht zeigt eine Datei“ ab.

Zahlt ein auf: [Vision](R00000-vision.md) — „Einzelne Dateien ansehen und kopieren“ („eine oder mehrere genannte Dateien“; Betreiber: „eine oder mehrere SQL Dateien“).

### Domänenbezug

Kein Glossar. „Angabe“, „echter Pfad“ wie R00043.

## Geschäftlicher Nutzen

Eine Migration kommt selten allein: `001-schema.sql`, `002-daten.sql`, `003-index.sql`. Mit einem Aufruf sieht der Mensch alle, in der Reihenfolge, in der die KI sie nennt — also der Reihenfolge, in der er sie ausführen soll —, und geht sie mit `j` durch, statt drei Läufe zu starten.

## Funktionale Anforderungen

- **Liste** (Pflichtpunkt 5, die eine Stelle): der Server bildet beim Start die **Quellenliste** in Aufrufreihenfolge; ihre Nummer (0…n−1) ist die einzige Kennung, die Seitenleiste, Endpunkt (`GET /api/dateiansicht/<n>`), Kopf und Kürzel benutzen. Dieselbe Angabe zweimal (gleicher Wortlaut) steht einmal, an der ersten Stelle; zwei Angaben mit demselben echten Pfad stehen beide da (der Kopf zeigt den echten Pfad).
- **Prüfung beim Start**: jede Angabe wird wie in R00043 geprüft. Ist mindestens eine fehlerhaft, steht **je fehlerhafter Angabe** eine Zeile `FEHLER [Dateiansicht] <Angabe mit Marken>: <Grund>` auf stderr, in Aufrufreihenfolge, danach Exit 2, kein Server. Mehr als 50 Angaben → Exit 2 „zu viele Dateien (51, höchstens 50)“ ohne Einzelprüfung; zusammen über 32 MiB → Exit 2 „zusammen zu groß (über 32 MiB)“.
- **Seitenleiste**: je Datei eine Zeile mit dem Anzeigenamen (Marken für unsichtbare Zeichen, lange Namen in der Mitte gekürzt, voller Name als zugänglicher Name) und der Zeilenzahl; die gewählte ist hervorgehoben (nicht allein durch Farbe). Rollbereich, Breite ziehbar und einklappbar wie im Review (R00033–R00035), dieselbe Mechanik.
- **Wählen**: Klick oder `j`/`k` (mit Umlauf) wählt; der Inhalt wird über die Nummer geladen, eine späte Antwort einer früheren Wahl wird verworfen. Markierung und Suchtreffer gehören der Datei und sind nach dem Wechsel weg, der Umbruch bleibt.
- **Eine Angabe**: die Seitenleiste steht auch bei einer Datei (eine Zeile) — eine Darstellung, kein Sonderfall.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): höchstens 50 Angaben; zusammen höchstens 32 MiB (je Datei weiter 8 MiB); Name in der Liste einzeilig gekürzt; stderr höchstens eine Zeile je Angabe (≤ 50).
- **Performance**: Oberfläche ≤ 2 s nach Aufruf bei 50 Dateien zu je 0,64 MiB (= 32 MiB); Dateiwechsel ≤ 200 ms typisch, ≤ 1 s bei 8 MiB (Lastprofil).
- **Sicherheit**: wie R00043; Nummern außerhalb 0…n−1 → 404.
- **Logging** (Pflichtpunkt 4): Startgründe auf stderr; Wählen und Wechseln nur Browser.

## Akzeptanzkriterien

Vorbereitung: Ordner D aus `user-stories/R00043.md`, dazu `001.sql`, `002.sql`, `003.sql` (`user-stories/R00045.md`). Aufruf `gitreviewA --dateien … --kein-browser`.

- [ ] 1. Gegeben Ordner D, wenn man `--dateien 003.sql 001.sql 002.sql` startet, dann nennt `GET /api/dateiansicht` drei Dateien mit den Nummern 0, 1, 2 in genau dieser Reihenfolge (`003.sql` zuerst), die Seitenleiste zeigt sie so, `003.sql` ist gewählt; `j` wählt `001.sql`, `k` wieder `003.sql`, `k` danach `002.sql` (Umlauf). *Ebene: Integration (Liste am Interactor) und Playwright (Wahl, Tastatur).*
- [ ] 2. Gegeben Ordner D, wenn man `--dateien a.sql fehlt.sql ordner bin.dat` startet, dann stehen auf stderr genau drei `FEHLER [Dateiansicht]`-Zeilen in dieser Reihenfolge (`fehlt.sql` nicht gefunden, `ordner` Verzeichnis, `bin.dat` Binärdatei), Exit 2, kein Server, stdout 0 Bytes. *Ebene: Integration gegen den Interactor.*
- [ ] 3. Gegeben 50 bzw. 51 Angaben von `a.sql`-Kopien, wenn man startet, dann läuft der Lauf mit 50, und mit 51 endet er mit „zu viele Dateien (51, höchstens 50)“, Exit 2. Gegeben vier Dateien zu je 8 388 608 Bytes und eine fünfte mit 1 Byte, dann endet der Start mit „zusammen zu groß (über 32 MiB)“. Rechnung: 4 × 8 388 608 = 33 554 432 = 32 MiB genau (zeigbar), + 1 Byte = darüber. *Ebene: Unit (Grenzen) und Integration.*
- [ ] 4. Gegeben `--dateien a.sql a.sql ./a.sql`, dann stehen zwei Zeilen in der Liste (`a.sql` einmal, `./a.sql` einmal) mit demselben echten Pfad im Kopf. *Ebene: Integration.*
- [ ] 5. Gegeben drei Dateien und die Antwort für `002.sql` um 1,5 s verzögert, wenn man `002.sql` und sofort `001.sql` wählt, dann steht am Ende `001.sql` da, nicht die späte Antwort; eine Markierung in `001.sql` ist nach `j`/`k` zurück nicht mehr da, der ausgeschaltete Umbruch bleibt aus. *Ebene: Playwright (verzögerte Antwort über `route`, Browser-Eigenes).*
- [ ] 6. Gegeben 50 Dateien mit Namen von je 120 Zeichen, dann scrollt die Seitenleiste für sich, jeder Name steht einzeilig gekürzt, Kopf und Inhalt bleiben an Ort und Höhe; ein Name mit U+202E steht als `⟨U+202E⟩`. *Ebene: Playwright (Darstellung, DOM-Sicherheit).*

Grenz- und Leerfälle bedacht: 50/51 und 32 MiB genau/+1 (3), eine Angabe (Liste mit einer Zeile, R00043 gilt), doppelte Angabe (4), alle Angaben fehlerhaft (2 mit nur Fehlern, ein Test beim Bauen). Verworfen: fehlerhafte Angaben in der Liste mit Grund zeigen und die übrigen öffnen (offene Frage 2 in R00043, Empfehlung Exit 2).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 3, 6 (Anzahl, Summe, Namenslänge, stderr je Angabe); 2 Anzeigeverfahren — Wechsel unter Umbruch an (Standard) und aus (Kriterium 5), zugeklappte Datei in der Liste wie R00043; 3 festes Layout — Kriterium 6 (Seitenleiste ist Rollbereich, Namen einzeilig); 4 Ausführungsort — Startgründe stderr, Wählen nur Browser; 5 eine Stelle — die Quellenliste mit ihrer Nummer (Kriterien 1, 4: Liste, Endpunkt, Kopf, Kürzel).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Dateiansicht/` — Quellenliste, Grenzen im Startinteractor.
- `src/GitReviewA/Aufruf/Aufrufleser.cs` — mehrere Angaben.
- `src/GitReviewA/web/` — `dateiansicht.js` (Seitenleiste, Wechsel), Trenner und Einklappen wiederverwendet.

## Technische Überlegungen

**Vorplanung** — Bubbles B4241–B4244 unter I0046.

### Ablauf

1. Angaben → Quellenliste (Doppelte, Anzahl) → je Angabe prüfen (R00043) → alle Gründe sammeln → Summe prüfen (B4241).
2. Seite → `GET /api/dateiansicht` → Seitenleiste (B4242) → Wahl → `GET /api/dateiansicht/<n>` (B4243).

### Grobentwurf

- `Quellenliste` (benannte Collection) — Angaben in Reihenfolge; `int Anzahl`, `long SummeBytes`.
- `Quellengrenzen` (Operation, rein) — `Aufruffehler? Pruefe(int anzahl, long summeBytes)`; Werte 50 und 33 554 432.

### Änderungen an bestehenden Klassen

`DateiansichtStartInteractor` (alle Gründe sammeln), `Aufrufleser` (mehrere Angaben), `dateiansicht.js`, `tasten-werte.js` (`j`/`k` mit Laufart).

## Tests

**Unit:** Quellengrenzen (50/51, Summe genau/+1), Doppelte.
**Integration:** Start mit mehreren Gründen, Reihenfolge, Liste.
**E2E (Playwright, Browser-Eigenes):** Wahl, Tastatur, verzögerte Antwort, Darstellung der Liste.

## Abhängigkeiten

- Abhängig von: I0044 Eine Datei ansehen und ganz kopieren (R00043, rot), I0034 Seitenleiste bleibt stehen (R00033, grün).
- Blockiert: nichts.

## Offene Fragen

An den product-owner; bis zur Antwort gilt die Empfehlung.

1. **Grenzen 50 Angaben und 32 MiB zusammen**: Empfehlung so (Hypothese: 50 deckt jeden Migrationssatz, den ein Mensch in einem Lauf liest; 32 MiB = vier Dateien an der Einzelgrenze, hält den RAM des Laufs unter ~100 MiB, weil der Inhalt beim Start gelesen und gehalten wird).
2. **Doppelte Angaben**: gleicher Wortlaut einmal, verschiedener Wortlaut mit gleichem echten Pfad zweimal (Empfehlung: einfach, nichts verschwindet still außer der wörtlichen Wiederholung).

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 4 Bubbles unterhalb I0046 (B4241–B4244), 2 klar (2 h), 2 unklar (2–4 h) — 8–12 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Betreiber nennt „eine oder mehrere SQL Dateien“. Mit einer Datei je Lauf müsste die KI drei Läufe nacheinander starten, und der Mensch verlöre die Reihenfolge. Wenn der Server die Angaben in Aufrufreihenfolge als eine nummerierte Liste hält und die Seitenleiste genau diese Liste zeigt, sieht der Mensch alle Dateien in der Reihenfolge, in der er sie ausführen soll, und wechselt mit einer Taste. Der Hebel ist die eine Liste mit Nummern: der Browser kann damit wählen, ohne je einen Pfad zu nennen, und ein fehlerhafter Name in der Mitte hält den Lauf an, bevor der Mensch eine unvollständige Reihe ausführt.

## Missing-Docs

- Keine.

## Notizen

### Verworfene Alternativen

- Alle Dateien untereinander in einem Rollbereich: verworfen — 50 Dateien ergäben eine endlose Seite, Kopieren je Datei wäre unklar.
- Sortieren nach Namen: verworfen — die Reihenfolge des Aufrufs ist die Reihenfolge des Ausführens.
