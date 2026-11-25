---
id: R00039
status: Neu
datum: 2026-11-25
---

# R00039: Werkzeugleiste einzeilig mit „Ansicht ▾“

## Beschreibung

Der Kopf des Diffs wird **eine** Zeile: Pfad, Haken, „Datei anmerken“, „In VS Code“, die Suche und ein Menü **„Ansicht ▾“**. Das Menü enthält die Anzeigeverfahren, die heute als einzelne Schalter nebeneinander stehen — Ansicht (nur Änderungen / ganze Datei), Anordnung (untereinander / nebeneinander), Leerraum ignorieren und Umbruch —, jeweils mit ihrem Zustand. Die Kürzel `s`, `v`, `l`, `w` wirken wie bisher, auch bei geschlossenem Menü. Die Leiste hat eine feste Höhe.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (einzeilige Werkzeugleiste, Suche und „Ansicht ▾“ statt einzelner Schalter; ergänzt 2026-11-25) und „Lesbare Diffs“.

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Diff-Werkzeugkasten), [R00030](R00030-tastaturbedienung.md) (Katalog, `ziel`), [R00008](R00008-ganze-datei-mit-diff.md), [R00023](R00023-nebeneinander-ansicht.md), [R00026](R00026-leerraum-und-luecken.md), [R00032](R00032-umbruch-standardmaessig-an.md), [R00027](R00027-im-diff-suchen.md).

### Domänenbezug

Kein Glossar. „Anzeigeverfahren“ sind Ansicht, Anordnung, Leerraum und Umbruch (Pflichtpunkt 2 aus `AI-Team/planer.md`).

## Geschäftlicher Nutzen

Heute brechen die Schalter im Diff-Kopf bei üblichen Breiten in zwei bis drei Zeilen um und nehmen dem Diff Höhe; die meisten stellt man einmal und dann nicht wieder. Eine Zeile mit einem Menü gibt dem Diff die Höhe zurück und hält die selten gebrauchten Schalter einen Klick (oder ein Kürzel) entfernt.

## Funktionale Anforderungen

- **Menü „Ansicht ▾“**: ein Menüknopf (`aria-haspopup="menu"`, `aria-expanded`) öffnet ein Menü mit vier Gruppen: **Ansicht** (Einträge „nur Änderungen“, „ganze Datei“ als `menuitemradio`), **Anordnung** („untereinander“, „nebeneinander“, `menuitemradio`), **Leerraum ignorieren** und **Umbruch** (`menuitemcheckbox`); jeder Eintrag zeigt seinen Zustand (`aria-checked` und sichtbares Häkchen). Eine Wahl wirkt wie heute der Schalter und schließt das Menü.
- **Eine Quelle je Zustand** (Pflichtpunkt 5): die Zustände bleiben in ihren Modulen (R00008, R00023, R00026, R00032); das Menü ist nur ein anderes Bedienelement, kein zweiter Zustand. Startwerte, „Wahl bleibt beim Wechsel“ und „Neuladen = Start“ bleiben, wie die Anforderungen sie festlegen.
- **Leiste**: in dieser Reihenfolge Pfad, Haken, „Datei anmerken“, „In VS Code“, Suche (Feld, Zähler „k von n“), „Ansicht ▾“. Der Pfad wird bei Platzmangel in der Mitte mit „…“ gekürzt; der volle Pfad steht im zugänglichen Namen und als Titel. Gründe (VS Code nicht möglich, Datei gesperrt) und Suchfehler stehen in derselben Zeile hinter ihrem Bedienelement.
- **Feste Höhe** (Pflichtpunkt 3): ab 600 px Breite des Diff-Bereichs ist die Leiste eine Zeile; darunter höchstens zwei Zeilen (die Suche rückt in die zweite). Die Leiste wächst nie über zwei Zeilen, gleich wie lang Pfad, Grund oder Meldung sind.
- **Tastatur**: das Menü öffnet mit Enter/Leertaste/Pfeil runter, Pfeile wandern, Enter/Leertaste wählen, Esc schließt, der Fokus kehrt auf den Knopf zurück (APG Menu Button). Die Kürzel `s`, `v`, `l`, `w` wirken bei geschlossenem Menü wie bisher; ihr `ziel` im Katalog zeigt auf den Menüknopf, damit Hilfe und Hinweis den sichtbaren Ort nennen.
- **Was nicht ins Menü kommt**: Suche, Haken, „Datei anmerken“, „In VS Code“ bleiben direkt sichtbar (häufig gebraucht); der Modus „Zusammen“/„Einzeln“ bleibt im Kopf (R00012).

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): Pfad bis 4 096 Zeichen und mit Marken `⟨U+…⟩` → gekürzt in der Leiste, ganz im Namen; Grund- und Fehlertexte sind feste Texte aus den Anforderungen (je höchstens etwa 60 Zeichen) und werden bei Platzmangel gekürzt, ganz im Namen.
- **Sicherheit**: der Pfad bleibt `textContent`/Attribut über `setAttribute` (R00011); Marken bleiben in der gekürzten Form sichtbar, wenn sie im sichtbaren Teil liegen, und im Namen ganz.
- **Benutzerfreundlichkeit**: Material 3 Menu; Zustände nie nur Farbe; das Menü überdeckt den Diff, statt ihn zu verschieben.
- **Logging** (Pflichtpunkt 4): nur Browser — nichts auf stderr.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (`user-stories/R00004.md`) und **Repo Z** (`user-stories/R00012.md`). Aufruf `gitreviewA <Hashes> --kein-browser`, Start in „Zusammen“.

- [ ] 1. Gegeben Repo Z in „Zusammen“ bei 1280 × 800 und `src/a.txt` gewählt, wenn man die Leiste betrachtet, dann ist sie eine Zeile mit Pfad, Haken, „Datei anmerken“, „In VS Code“, Suche und „Ansicht ▾“; die Schalter Ansicht, Anordnung, Leerraum und Umbruch stehen nicht mehr einzeln darin. *Ebene: Playwright (Darstellung).*
- [ ] 2. Gegeben das geöffnete Menü, wenn man nacheinander „ganze Datei“, „nebeneinander“, „Leerraum ignorieren“ und „Umbruch“ wählt, dann wechselt der Diff jedes Mal wie mit dem bisherigen Schalter, der Eintrag zeigt danach `aria-checked="true"` (bzw. bei Umbruch `false`, weil der Start „an“ ist, R00032), und nach Datei- und Moduswechsel („Einzeln“) bleiben die Wahlen; nach dem Neuladen gelten die Startwerte. *Ebene: Integration (Oberfläche gegen Fake), alle vier Verfahren in „Zusammen“ und „Einzeln“ abgetastet.*
- [ ] 3. Gegeben das Menü ist geschlossen, wenn man `s`, `v`, `l`, `w` drückt, dann wechseln Ansicht, Anordnung, Leerraum und Umbruch wie bisher, und das Menü zeigt beim nächsten Öffnen den neuen Zustand; in der Hilfe nennen die vier Einträge „Ansicht ▾“ als Ort. *Ebene: Integration (Oberfläche) und Unit (Katalog `ziel`).*
- [ ] 4. Gegeben der Fokus auf „Ansicht ▾“, wenn man Enter drückt, mit Pfeil runter zu „nebeneinander“ geht, Enter drückt und danach das Menü erneut öffnet und Esc drückt, dann ist „nebeneinander“ gewählt, das Menü geschlossen und der Fokus wieder auf dem Knopf; `aria-expanded` folgt dem Zustand. *Ebene: Playwright (Browser-Eigenes: Tastatur, Fokus).*
- [ ] 5. Gegeben ein Pfad aus 300 Zeichen mit U+202E und ein Diff-Bereich von 600 px bzw. 400 px Breite, wenn die Datei gewählt ist, dann ist die Leiste bei 600 px eine Zeile und bei 400 px höchstens zwei Zeilen hoch, der Pfad ist in der Mitte mit „…“ gekürzt, der zugängliche Name nennt ihn ganz mit `⟨U+202E⟩`, und die erste Diff-Zeile beginnt unmittelbar unter der Leiste. *Ebene: Playwright (Darstellung, Höhe gemessen).*

Grenz- und Leerfälle bedacht: keine Datei gewählt (Leiste ohne Pfad und ohne dateibezogene Knöpfe, „Ansicht ▾“ bleibt bedienbar — wie heute die Schalter); Binärdatei und große Datei (Menü bleibt, Einträge ohne Wirkung wie heute); Suche mit Fehler (Meldung in der Zeile, Kriterium 5 für die Höhe). Verworfen als Kriterium: Menüposition am Fensterrand (Material 3).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterium 5, NFA „Grenzen“; 2 Anzeigeverfahren — Kriterium 2 tastet alle vier in beiden Modi ab, „Zusammen“ zuerst; 3 festes Layout — Kriterium 5 (höchstens zwei Zeilen); 4 Ausführungsort — nur Browser; 5 eine Quelle je Zustand — Funktionale Anforderungen und Kriterium 3.

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/ansicht-menue.js` (neu), `index.html`, `gitreviewa.css`, `tasten-werte.js` (`ziel`).
- `e2e/` (Specs, die Schalter direkt bedienen, ziehen auf das Menü um), `tests/`.

## Technische Überlegungen

**Vorplanung** — Bubbles B3801–B3804 unter I0040. **Artboard**: Variante A („Ansicht ▾“); Entwurf Fassung 2 zeichnet einzelne Gruppen (Z. 470–478) — die Betreiber-Entscheidung 2026-11-25 ist jünger und geht vor; der Wireframe-Nachzug ist Sache von `/wireframe` (Linie PO Zeile 185).

### Ablauf

1. Menüknopf → Menü mit Einträgen aus den Zuständen (B3801).
2. Wahl → das Modul des Zustands schaltet (wie bisher), Menü schließt.
3. Leiste mit fester Höhe und gekürztem Pfad (B3802); Kürzel und `ziel` (B3803).

### Grobentwurf

- `ansicht-menue.js` (Oberfläche) — baut das Menü aus den vier Zuständen, liest und schreibt nur über deren öffentliche Funktionen.

### Änderungen an bestehenden Klassen

`index.html` (Schalter in das Menü), `tasten-werte.js` (`ziel` von `s`, `v`, `l`, `w`), die Module der vier Zustände bekommen bei Bedarf einen Lese-/Schreibweg ohne DOM-Schalter.

## Tests

**Unit:** Katalog (`ziel`).
**Integration:** Menü schaltet die vier Zustände in beiden Modi.
**E2E:** Darstellung (eine Zeile, Höhe), Menü per Tastatur — Browser-Eigenes, nicht Hot Path. Vorhandene Specs, die `.umbruch-schalter`, `.leerraum-schalter`, `.anordnung-wahl`, `.diffansicht-wahl` direkt bedienen, ziehen auf das Menü oder die Kürzel um.

## Abhängigkeiten

- Abhängig von: I0027 (R00012, grün), I0015 Tastaturbedienung (R00030, grün).
- Blockiert: nichts.

## Offene Fragen

Keine offenen. Der product-owner hat beide Fragen am 2026-11-25 entschieden (`AI-Team/po-entscheidungen.md`, Zeile 196); die Antworten sind oben eingearbeitet:

1. **Inhalt des Menüs** — entschieden (PO Zeile 196): wie beschrieben (vier Anzeigeverfahren; Suche, Haken, Datei anmerken, VS Code bleiben draußen). Alternative „auch ‚Datei anmerken‘ und ‚In VS Code‘ ins Menü“ verworfen — dann wären zwei häufige Wege einen Klick weiter weg.
2. **Breite für eine Zeile** — entschieden (PO Zeile 196): 600 px Diff-Breite, darunter höchstens zwei Zeilen; Grenzwert innerhalb der Leitplanken (Material 3 „medium“ beginnt bei 600 dp).

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- `/wireframe verfeinern D0002` anbieten (Leiste mit Menü nachzeichnen), keine Sperre.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 4 Bubbles unterhalb I0040 (B3801–B3804), alle unklar (2–4 h) — 8–16 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist Richtung A: eine einzeilige Werkzeugleiste mit „Ansicht ▾“ statt einzelner Schalter. Heute wächst der Diff-Kopf mit jeder Karte um einen Schalter und bricht um; jede Zeile mehr nimmt dem Diff Höhe, die der Mensch zum Lesen braucht. Wenn die selten gebrauchten Anzeigeverfahren in einem Menü stehen und die häufigen Wege direkt bleiben, hat der Kopf eine feste, kleine Höhe, und künftige Verfahren kommen ins Menü statt in die Leiste. Der Hebel ist das Bedienelement, nicht die Zustände: sie bleiben, wo sie sind, und die Kürzel wirken unverändert.

## Missing-Docs

- Ob der Material-3-Menüknopf mit `menuitemradio`-Gruppen in den Zielbrowsern mit Screenreadern die Gruppen ansagt — mit einem kleinen Versuch belegen.

## Notizen

### Verworfene Alternativen

- Überlauf-Menü, das nur aufnimmt, was nicht passt: verworfen — Bedienelemente wandern je nach Breite, der Ort ist nicht vorhersagbar.
- Ein Menü je Verfahren: verworfen — wieder vier Knöpfe in der Leiste.
