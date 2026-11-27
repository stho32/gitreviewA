---
id: R00055
status: Neu
datum: 2026-11-27
ursprung: Refactoring
---

# R00055: Eine Breitenregel für Formularfelder im Rollbereich

## Zusammenfassung

Jedes Eingabefeld der Oberfläche nimmt die Breite seines Behälters, gedeckelt durch eine Obergrenze in `ch`, und diese Regel steht an **einer** Stelle in `gitreviewa.css`. Heute trägt jedes Feld seine eigene Breite; zwei davon (R00052, R00053) ragten deshalb über ihren Behälter. Ein neues Feld soll den Fehler nicht wiederholen können. Kein neues Verhalten.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (jeder Rollbereich bleibt ganz bedienbar, ohne dass ein Inhalt ihn sprengt).

## Ausgangssituation

Bestand der Felder in `src/GitReviewA/web/` (gezählt per `grep` auf `<input|<textarea|<select|createElement('input'|'textarea')`, Stand `2d47f7c`). Textfelder, Auswahl und Nicht-Textfelder getrennt:

| Feld | Ort | Breitenregel heute | Bindung an den Behälter |
|---|---|---|---|
| Dateien suchen `.dateisuche-eingabe` | `index.html:138` | `gitreviewa.css:102` `inline-size:16rem; flex:0 1 16rem; max-inline-size:100%; min-inline-size:0` | ja (R00052), Obergrenze in `rem` |
| Muster ausblenden `.ausblenden-eingabe` | `index.html:145` | `gitreviewa.css:109` keine; Elternzeile `.ausblenden-feld` (Z. 107) ohne `min-inline-size:0` | **nein**; Breite ist die Standardbreite des Browsers (Hypothese: überläuft bei 240 px Seitenleiste — nicht gemessen, erste Probe) |
| Im Diff suchen `.diff-suche` | `index.html:171` | `gitreviewa.css:302` `flex:1 1 3rem; inline-size:3rem; min-inline-size:2rem; max-inline-size:40vw` | teilweise; Obergrenze am Viewport (`vw`), nicht am Behälter |
| Anmerkungsfeld `.anm-eingabe` (textarea) | `anmerkungen.js:772` | `gitreviewa.css:252` und `:255` zwei Regeln: `inline-size:100%; max-inline-size:72ch; min-inline-size:0` | ja (R00053), doppelt deklariert |
| Suche der Dateiansicht `.da-suche` | `dateiansicht.html:58` | `dateiansicht.css:109` `inline-size:12rem`; Elternteil `.da-suche-feld` `flex:none`, `.da-werkzeug` ohne Umbruch | **nein**; feste Breite |
| Commit wählen `.gr-waehler-auswahl` (select) | `index.html:117` | `gitreviewa.css:61` `width:100%` | ja, ohne `ch`-Obergrenze |

Keine Textfelder, ohne Breitenfrage: Schalter `#ausblenden`, `#da-umbruch` (feste 32 px, `gitreviewa.css:207`), Kästchen `#diff-haken`, `.haken` (`dateiliste.js:345`, 18 px) und die Optionsfelder der Art (`anmerkungen.js:813`).

Fünf verschiedene Schreibweisen für dieselbe Aussage (`rem`, `vw`, `%`, `ch`, nichts). Die Probe dazu heute: je Feld ein eigener Test (`dateisuche-geometrie.spec.js`, `anmerkungen-geometrie.spec.js`); ein neues Feld hat keine.

## Ziel

- Eine Regel (eine Klasse bzw. ein Selektor, Stelle in `gitreviewa.css`, Abschnitt „Formularfelder im Rollbereich“): Textfeld und Auswahl nehmen `inline-size:100%` des Behälters, `box-sizing:border-box`, `min-inline-size:0`, `max-inline-size` aus einer Eigenschaft `--feld-max` in `ch` (Vorgabe in der Regel, je Feld überschreibbar, z. B. `72ch` für das Anmerkungsfeld). Wert und Name sind Sache des Entwicklers; maßgeblich ist, dass **keine andere Stelle eine Breite für ein Feld setzt**.
- Die Elternzeilen eines Felds dürfen es nicht über den Behälter schieben (`min-inline-size:0` bzw. Umbruch) — das gehört zur Regel, nicht zu je einem Feld.
- Neue Felder: ein Eintrag der Regel (Klasse) genügt; eine Probe über **alle** Felder der DOM findet ein Feld, das sie vergessen hat.
- Der Standardwert im sichtbaren Ergebnis bleibt: `16rem` des Suchfelds und `72ch` des Anmerkungsfelds ändern sich nicht (Startwerte der heutigen Specs bleiben grün).

## Mikro-Refactoring-Schritte

CSS-Refactoring ohne IDE-Hotkeys; Editor, Suchen/Ersetzen, danach Build und Tests.

### Schritt 1: Messprobe über alle Felder zuerst (B5501)
**Aktion**: Playwright-Spec `e2e/tests/formularfelder-geometrie.spec.js` anlegen; sie sammelt per DOM alle `input` (außer Schalter, Kästchen, Optionsfelder), `textarea`, `select` und prüft je Feld `feld.right ≤ Behälter.right` und kein waagerechter Bildlauf des Rollbereichs.
**Verifizierung**: Lauf vor der Umstellung; rot nur dort, wo der Bestand wirklich überläuft (Hypothese: `.ausblenden-eingabe`, `.da-suche`) — das Ergebnis im Lauf eintragen.

### Schritt 2: Die eine Regel anlegen (B5502)
**Aktion**: Abschnitt „Formularfelder im Rollbereich“ in `gitreviewa.css` mit der Regel aus „Ziel“; noch kein Feld nutzt sie.
**Verifizierung**: Build, bestehende Specs unverändert grün.

### Schritt 3: Felder der Seitenleiste umstellen (B5503)
**Aktion**: `.dateisuche-eingabe`, `.ausblenden-eingabe`, `.gr-waehler-auswahl` an die Regel binden; ihre eigenen Breitenwerte (`16rem`, `width:100%`) entfallen oder werden zum `--feld-max`. `.ausblenden-feld` bekommt `min-inline-size:0`.
**Verifizierung**: `dateisuche-geometrie.spec.js` und die Schritt-1-Probe grün, 256 px bei 400 px Fenster bleibt.

### Schritt 4: Felder im Diff umstellen (B5504)
**Aktion**: `.diff-suche` (`vw`-Obergrenze entfällt) und `.anm-eingabe` (zwei Regeln werden eine; Obergrenze `72ch`) an die Regel binden.
**Verifizierung**: `anmerkungen-geometrie.spec.js`, `im-diff-suchen*.spec.js`, Schritt-1-Probe grün.

### Schritt 5: Feld der Dateiansicht umstellen (B5505)
**Aktion**: `.da-suche` (`12rem`) an die Regel binden; `.da-suche-feld` und `.da-werkzeug` brechen um bzw. schrumpfen statt `flex:none`.
**Verifizierung**: `dateiansicht-suchen.spec.js`, `dateiansicht-hinweis.spec.js`, Schritt-1-Probe auf der Dateiansicht grün.

### Schritt 6: Quelltext-Wächter (B5506)
**Aktion**: ein Test, der `gitreviewa.css` und `dateiansicht.css` liest und prüft, dass `inline-size`, `width` und `max-inline-size` mit Längenwert an Feld-Selektoren nur im Abschnitt der Regel stehen.
**Verifizierung**: Test rot, wenn man in einer Probe-Kopie `.diff-suche{inline-size:20rem}` einfügt (Mutationsprobe), grün sonst.

## Verifikation

Alle Specs des Projekts bleiben grün (kein Test wird angepasst, um grün zu werden); die neue Probe aus Schritt 1 ist grün; Mutationsprobe aus Schritt 6.

## Akzeptanzkriterien

Testebene nach Projektregel: Playwright nur, weil Geometrie nur im Browser prüfbar ist; der Quelltext-Wächter ist ein Unit-Test ohne Browser.

1. **Kein Feld ragt über seinen Behälter** (Playwright). Gegeben Repo P und eine Ergebnisauswahl mit Anmerkung im Ändern-Modus, Fenster 1280 × 800 und 812 × 800, Ergebnis-Spalte offen und zu, Seitenleiste 240 und 640 px, wenn jede Ansicht der Oberfläche geöffnet ist (Seitenleiste, Diff, Dateiansicht), dann liegt für **jedes** Eingabefeld (`input` mit Text, `textarea`, `select`) die rechte Kante ≤ der rechten Innenkante seines Rollbereichs, und dessen `scrollLeft` ist 0.
2. **Auch mit dem längsten Inhalt** (Playwright). Gegeben dieselben Fälle und ein Suchtext von 200 Zeichen (Grenze aus B4501), ein Ausblendmuster von 200 Zeichen, eine bestehende Anmerkung und ein Notizfeld mit 2 000 Zeichen ohne Leerzeichen (Hypothese: längster Fall; Grenze der Anmerkung steht nicht in der WBS), dann gilt Kriterium 1 unverändert, und die Feldbreite hängt nicht vom Inhalt ab.
3. **Alle Anzeigeverfahren** (Playwright, Pflichtpunkt 2). Kriterium 1 gilt im Standardmodus „Zusammen“ zuerst, dann „Einzeln“, mit und ohne Umbruch, untereinander und nebeneinander.
4. **Die Regel steht an einer Stelle** (Unit-Test über die CSS-Dateien, Pflichtpunkt 5). Außerhalb des Abschnitts „Formularfelder im Rollbereich“ setzt kein Selektor eines Textfelds oder einer Auswahl eine Längenbreite; die Regel nennt `ch`. Ein neues Feld mit der Klasse besteht Kriterium 1 ohne eigene Breite.
5. **Keine sichtbare Änderung der Startwerte** (Playwright, vorhandene Specs). Suchfeld der Dateiliste 256 px bei Platz, Anmerkungsfeld höchstens 72ch; `dateisuche-geometrie.spec.js` und `anmerkungen-geometrie.spec.js` laufen unverändert grün.

Nicht betroffen: Grenzen je Eingabe und Ausgabe (Pflichtpunkt 1; keine Längengrenze ändert sich, Kriterium 2 nutzt sie nur), NFA zum Ausführungsort (Pflichtpunkt 4; reines Browser-Layout, keine stderr-Zeile).

## Rollback-Strategie

Je Schritt ein Commit; zurück mit `git revert <sha>`. Schritt 2 ändert nichts Sichtbares, Schritte 3–5 je eine Fläche.

## Warum löst diese Anforderung das Problem?

Zwei Befunde der Karte #63 hatten dieselbe Ursache, an zwei Stellen einzeln behoben. Solange jedes Feld seine eigene Breite setzt, wiederholt das nächste Feld den Fehler. Mit einer Regel für alle und einer Probe über alle Felder der DOM fällt ein vergessenes Feld im Test auf, bevor es der Entwicklertester findet.

## Offene Fragen

1. An den product-owner: **Gilt die Dateiansicht (`--dateien`) mit?** Empfehlung: ja — ein Browser-Layout, kein neues Verhalten; sonst bliebe das einzige feste Feld (`12rem`) außerhalb der Regel. Bis zur Antwort gilt ja.
2. An den product-owner: **Obergrenze der Felder in `ch`** außer Anmerkung (72ch). Empfehlung: Suchfelder 32ch (entspricht heutigen `16rem` bei 13 px, Start bleibt sichtbar gleich), Auswahl ohne Obergrenze. Sichtbare Folge nur bei sehr breiten Behältern.

## Notizen

- Quelle: R00053 Offene Frage 1 („später als eigene kleine Karte“), Karte #65.
- Koordination: #64 plant parallel (I0054/R00054) und schreibt in dieselbe WBS-Datei; Zusammenführen der Tabellenzeilen am Ende der Interaction-Blöcke nötig.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-27 | Angelegt | Karte #65, Konsolidierung nach R00052/R00053 |
