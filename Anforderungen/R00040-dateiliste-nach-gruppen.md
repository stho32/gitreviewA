---
id: R00040
status: Neu
datum: 2026-11-25
---

# R00040: Dateiliste nach Gruppen

## Beschreibung

Die Dateiliste steht in drei Gruppen **Code**, **Tests** und **Doku**, jede mit einem Kopf, der ihren Fortschritt nennt („3 von 5 abgehakt“). Eine Regel bestimmt die Gruppe aus dem Pfad. Leere Gruppen fehlen. „Nächste ungeprüfte“ und `j`/`k` gehen in der gezeigten Reihenfolge; das Ergebnis auf stdout bleibt, wie es ist.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (links die Dateiliste, gruppiert nach Code, Tests und Doku, mit Fortschritt je Gruppe; ergänzt 2026-11-25) und „Checkliste im Kopf entlasten“.

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Liste, Modi, Fortschritt), [R00011](R00011-datei-abhaken.md) (Haken), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (gesperrt), [R00025](R00025-dateien-ausblenden.md) (Muster), [R00028](R00028-naechste-ungepruefte-datei.md) (nächste ungeprüfte), [R00029](R00029-abgehakte-dateien-ausblenden.md) (Abgehakte ausblenden), [R00030](R00030-tastaturbedienung.md) (`j`/`k`).

### Domänenbezug

Kein Glossar. „Gruppe“ ist neu: Code, Tests oder Doku, bestimmt allein aus dem Pfad.

## Geschäftlicher Nutzen

Eine KI-Änderung mischt Code, Tests und Doku; in einer flachen Liste von 40 Dateien sieht der Mensch nicht, ob zum geänderten Code Tests gehören oder ob er die Tests schon durchgesehen hat. Mit Gruppen und Fortschritt je Gruppe sieht er auf einen Blick „Code 5 von 9, Tests 0 von 4“ und kann gezielt zuerst den Code und dann die Tests prüfen.

## Funktionale Anforderungen

- **Gruppenregel** (Pflichtpunkt 5: die eine Stelle, die die Gruppe bestimmt): aus dem Anzeigenamen des Pfades (neuer Pfad bei Umbenennung, mit Marken für Rohbytes):
  - **Tests**, wenn ein Ordner `test`, `tests`, `spec`, `specs`, `__tests__` oder `e2e` heißt (ASCII ohne Rücksicht auf Groß/Klein) oder der Dateiname auf eines dieser Muster passt: `*.test.*`, `*.spec.*`, `*Test.*`, `*Tests.*`, `test_*.py`, `*_test.*` (Groß/Klein wie geschrieben);
  - sonst **Doku**, wenn die Endung `.md`, `.markdown`, `.rst` oder `.adoc` ist, ein Ordner `doc`, `docs`, `Dokumentation` oder `Documentation` heißt (ASCII ohne Rücksicht auf Groß/Klein) oder der Dateiname mit `README`, `LIESMICH`, `LICENSE` oder `CHANGELOG` beginnt;
  - sonst **Code**.
  Liste, Gruppenzähler und Navigation lesen nur diese Regel; das Ergebnis kennt sie nicht.
- **Liste**: Gruppenköpfe in der Reihenfolge Code, Tests, Doku; unter jedem Kopf die Einträge der Gruppe in der bisherigen Reihenfolge (flach) bzw. der Baum der Gruppe (Baum). Eine Gruppe ohne gezeigten Eintrag hat keinen Kopf.
- **Fortschritt je Gruppe**: „a von b abgehakt“, mit Zusatz „ (k nicht lesbar)“ bei k ≥ 1 (R00014). In „Zusammen“ zählt der Kopf Dateien, die **Summe der Gruppen ist der Fortschritt im Kopf** (R00012). In „Einzeln“ zählt er die Stellen des gewählten Commits, die Summe ist dessen Zähler im Commit-Wähler. Ausgeblendete Dateien (Muster, Abgehakte) zählen in b, wie im Kopf (PO Zeile 136).
- **Navigation**: `j`/`k` und „Nächste ungeprüfte“ (`u`) folgen der gezeigten Reihenfolge — Gruppe für Gruppe, mit Umlauf (Empfehlung, offene Frage 2).
- **Ergebnis unverändert**: Anmerkungen und der Abschnitt `## Dateien` bleiben in der Reihenfolge der Übersicht, ohne Gruppen (Vertrag R00002/R00011).
- **Kein neuer Weg**: kein neuer Endpunkt, kein neuer `git`-Aufruf.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): 2 000 Dateien (Lastprofil) — die Gruppenregel ist linear in der Pfadlänge und läuft einmal je Liste; der Dateiwechsel bleibt ≤ 200 ms typisch, das Zeichnen der Liste mit 2 000 Dateien und Gruppen ≤ 1 s (Obergrenze, R00012). Pfade bis 4 096 Zeichen; Gruppenköpfe sind feste Wörter.
- **Sicherheit**: Pfade bleiben Text mit Marken (R00011); die Regel arbeitet auf dem Anzeigenamen und gibt nie einen Namen an `git`.
- **Benutzerfreundlichkeit**: Gruppenköpfe sind Überschriften der Liste (Screenreader springt von Gruppe zu Gruppe); der Fortschritt steht als Text, nicht nur als Balken.
- **Logging** (Pflichtpunkt 4): nur Browser — nichts auf stderr.

## Akzeptanzkriterien

Vorbereitung: **Repo G** (neu, `user-stories/R00040.md`): ein Commit `g1` mit `src/app.js`, `src/Contest.cs`, `src/a.txt`, `tests/app.test.js`, `web/haken-werte.spec.js`, `tests/README.md`, `docs/api.md`, `README.md`; ein zweiter Commit `g2` ändert `src/app.js` und `docs/api.md`. **Repo N plus `v`** (gesperrte Stellen, `user-stories/R00014.md`). Aufruf `gitreviewA <Hashes> --kein-browser`, Start in „Zusammen“.

### Regel
- [ ] 1. Gegeben die Pfade von Repo G und zusätzlich `src/LatestTest.cs`, `E2E/x.ts`, `Docs/Bild.png`, `LIESMICH.txt`, `t⟨0xFE⟩/a.md`, wenn die Gruppenregel sie einordnet, dann sind `src/app.js`, `src/Contest.cs`, `src/a.txt` Code; `tests/app.test.js`, `web/haken-werte.spec.js`, `tests/README.md`, `src/LatestTest.cs`, `E2E/x.ts` Tests; `docs/api.md`, `README.md`, `Docs/Bild.png`, `LIESMICH.txt`, `t⟨0xFE⟩/a.md` Doku. Rechnung: `tests/README.md` ist Tests, weil Tests vor Doku gilt; `src/Contest.cs` passt nicht auf `*Test.*` (kleines t); `src/a.txt` ist Code, weil `.txt` keine Doku-Endung ist. *Ebene: Unit.*

### Liste und Fortschritt
- [ ] 2. Gegeben Repo G (`g1 g2`) in „Zusammen“ und `src/app.js`, `tests/app.test.js` abgehakt, wenn die Liste steht, dann zeigt sie „Code 1 von 3 abgehakt“, „Tests 1 von 3 abgehakt“, „Doku 0 von 2 abgehakt“ in dieser Reihenfolge, und der Kopf nennt „2 von 8 Dateien abgehakt“. Rechnung: 1 + 1 + 0 = 2, 3 + 3 + 2 = 8. *Ebene: Unit (Zähler) und Integration (Oberfläche gegen Fake).*
- [ ] 3. Gegeben Repo G in „Einzeln“ mit `g2` gewählt, wenn die Liste steht, dann gibt es nur die Gruppen Code (`src/app.js`) und Doku (`docs/api.md`) mit „0 von 1“; die Gruppe Tests hat keinen Kopf, und die Summe 0 von 2 ist der Zähler von `g2` im Commit-Wähler. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 4. Gegeben Repo G in „Zusammen“, wenn man das Muster `docs/**` setzt, „Abgehakte ausblenden“ einschaltet, auf „Baum“ umschaltet und `README.md` abhakt, dann fehlt `docs/api.md` in der Liste, zählt aber weiter in „Doku … von 2“; abgehakte Dateien verschwinden aus ihrer Gruppe, die Zähler bleiben; im Baum steht je Gruppe ein eigener Baum; eine Gruppe, deren Einträge alle ausgeblendet sind, hat keinen Kopf. *Ebene: Integration (Oberfläche gegen Fake), Darstellungen flach und Baum abgetastet.*
- [ ] 5. Gegeben Repo N plus `v` in „Zusammen“, wenn die Liste steht, dann trägt jede Gruppe mit gesperrten Dateien den Zusatz „ (k nicht lesbar)“, und die Summe der k über die Gruppen ist das k im Kopf. *Ebene: Integration (Oberfläche gegen Fake).*

### Navigation und Ergebnis
- [ ] 6. Gegeben Repo G in „Zusammen“, nichts abgehakt, `src/app.js` gewählt (letzte Code-Datei; Reihenfolge von `git`: `src/Contest.cs`, `src/a.txt`, `src/app.js`), wenn man `j` drückt und danach `u` betätigt, dann ist zuerst die erste Datei der Gruppe Tests (`tests/README.md`) gewählt und danach `tests/app.test.js` als nächste ungeprüfte in der gezeigten Reihenfolge; von der letzten Doku-Datei aus geht `u` mit Umlauf zur ersten ungeprüften Code-Datei. *Ebene: Integration (Oberfläche gegen Fake), ein Fall Playwright (Tastatur).*
- [ ] 7. Gegeben Repo G mit zwei Haken und einer Anmerkung, wenn beendet wird, dann ist stdout Byte für Byte so wie ohne Gruppen (Reihenfolge der Übersicht, keine Gruppennamen). *Ebene: Integration (Programm, stdout).*

Grenz- und Leerfälle bedacht: eine Auswahl nur mit Code (eine Gruppe, Kriterium 3 zeigt fehlende Köpfe); alle ausgeblendet (Kriterium 4; der Leerfall-Hinweis aus R00029 bleibt); Rohbyte-Namen (Kriterium 1); 2 000 Dateien (NFA, gemessen wie R00012). Verworfen: Gruppen einklappbar (nicht beauftragt, wäre eine Ausbaustufe).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — NFA „Grenzen“; 2 Anzeigeverfahren — Kriterien 2–4 („Zusammen“ zuerst, „Einzeln“, flach und Baum, beide Ausblend-Gründe); 3 festes Layout — Gruppenköpfe liegen im Rollbereich der Liste (R00033), nicht betroffen darüber hinaus; 4 Ausführungsort — nur Browser; 5 eine Stelle — die Gruppenregel (Kriterium 1), Wege Liste, Zähler, Navigation; das Ergebnis nutzt sie nicht (Kriterium 7).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/gruppen-werte.js` (neu, rein: Regel und Zähler), `dateiliste.js`, `naechste.js`/`naechste-werte.js`, `tasten.js`, `gitreviewa.css`.
- `tests/` (Node-Unit), `e2e/`.

## Technische Überlegungen

**Vorplanung** — Bubbles B3901–B3905 unter I0041. **Artboard**: Variante A (Gruppen mit Fortschritt); Entwurf Fassung 2 zeigt die Liste ohne Gruppen — die Betreiber-Entscheidung ist jünger.

### Ablauf

1. Liste (Modus, Darstellung, Sicht) → Gruppe je Eintrag über die Regel (B3901).
2. Gruppenköpfe und Einträge zeichnen (B3902), Zähler je Gruppe (B3903).
3. `j`/`k`/`u` über die gezeigte Reihenfolge (B3904).

### Grobentwurf

- `gruppen-werte.js` (rein) — `gruppeDes(anzeigename)` → `code | tests | doku`; `zaehlerJeGruppe(eintraege, hakenstand, modus)`; `gezeigteReihenfolge(eintraege)`.

### Änderungen an bestehenden Klassen

`dateiliste.js` (Gruppen), `naechste-werte.js` (Reihenfolge als Eingabe statt flacher Auswahl), `tasten.js` (`j`/`k` über die gezeigte Reihenfolge).

## Tests

**Unit:** Regel (alle Beispiele aus Kriterium 1), Zähler (Summe gleich Kopf über Zusammen/Einzeln, gesperrt, ausgeblendet), Reihenfolge.
**Integration:** Oberfläche gegen Fake (Kriterien 2–6), Programm (Kriterium 7).
**E2E:** ein Tastaturfall — nicht Hot Path.

## Abhängigkeiten

- Abhängig von: I0027 (R00012, grün), I0025 Nächste ungeprüfte (R00028, grün), I0026 Abgehakte ausblenden (R00029, grün).
- Blockiert: nichts.

## Offene Fragen

1. **Die Regel**: Empfehlung wie beschrieben. Alternativen: Muster aus einer Aufrufoption (neuer Umfang an der Aufrufoberfläche) oder eine vierte Gruppe „Sonstiges“ für Konfiguration (`*.json`, `*.yml`) — der Betreiber nennt drei Gruppen.
2. **Reihenfolge der Navigation**: Empfehlung: `j`/`k` und „Nächste ungeprüfte“ folgen der gezeigten, gruppierten Reihenfolge. Das löst PO Zeile 66 („nächste ungeprüfte“ folgt der flachen Reihenfolge der Auswahl) ab, in der Linie von PO Zeile 149 („der gezeigten Liste folgen“); das Ergebnis bleibt in der Reihenfolge der Übersicht. Alternative: Navigation bleibt flach — dann springt `u` zwischen den Gruppen hin und her.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 5 Bubbles unterhalb I0041 (B3901–B3905), 2 klar (2 h), 3 unklar (2–4 h) — 10–16 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist Richtung A: die Dateiliste ist nach Code, Tests und Doku gruppiert, mit Fortschritt je Gruppe. In einer flachen Liste mischt sich, was der Mensch unterschiedlich prüft — Code genau, Tests auf Abdeckung, Doku auf Stimmigkeit —, und der eine Zähler im Kopf sagt nicht, welche Art noch offen ist. Wenn eine Regel jede Datei einer Gruppe zuordnet und jede Gruppe ihren Stand nennt, sieht er sofort, ob die Tests zum Code schon gelesen sind, und geht Gruppe für Gruppe durch. Der Hebel ist die Sicht der Liste; Haken, Zähler im Kopf und Ergebnis bleiben dieselben, weil die Summe der Gruppen der Kopf ist.

## Missing-Docs

- Keine.

## Notizen

### Verworfene Alternativen

- Gruppen aus `.gitattributes` (`linguist-documentation`): verworfen — fremde Konfiguration des geprüften Repos (Sicherheitslinie, `AI-Team/gelerntes.md`) und selten gepflegt.
- Gruppe als Spalte statt Kopf: verworfen — kein Fortschritt je Gruppe sichtbar.
