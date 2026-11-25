---
id: R00035
status: Neu
datum: 2026-11-25
---

# R00035: Seitenleiste ein- und ausklappen

## Beschreibung

Ein Bedienelement **am Trenner** klappt die Seitenleiste (Commit-Zeile und Dateiliste) ganz ein und wieder aus. Eingeklappt verschwindet die Liste, der **Diff bekommt die volle Breite**, und an der Stelle der Grenze bleibt ein **schmaler Streifen** mit dem Ausklapp-Knopf stehen (der Weg zurück bleibt sichtbar); der Fortschritt bleibt im Kopf (der eine Zähler, R00012/R00029). Das Bedienelement trägt `aria-expanded` und nennt den Zustand; beim Einklappen wandert der **Fokus** auf das Bedienelement (nie ins Leere). Eingeklappt bleibt „Nächste ungeprüfte“ ([I0025](R00028-naechste-ungepruefte-datei.md)) bedienbar und zeigt den Diff der gewählten Stelle; der Zustand bleibt beim Wechsel von Datei, Commit, Modus und Ansicht, nach dem Neuladen ist die Seitenleiste wieder da (nur RAM, wie die übrigen Schalter). Das Einklappen **zeichnet den Diff nicht neu** — offenes Notizfeld, Markierungen, Suchtreffer und Bildlaufposition bleiben (Lehre #23).

Zahlt ein auf: [Vision](R00000-vision.md) — „Zusammen ist der Standard, die Dateien führen“ (die Liste führt, aber wer eine breite Datei liest, blendet sie bewusst weg) und „Checkliste im Kopf entlasten“.

Baut auf auf: [R00033](R00033-seitenleiste-bleibt-stehen.md) (fester Rahmen, Seitenleiste und Diff als Rollbereiche), [R00034](R00034-breite-der-seitenleiste-ziehen.md) (der Trenner, an dem der Knopf sitzt), [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Aufbau, Kopf, Fortschritt, Modus), [R00028](R00028-naechste-ungepruefte-datei.md) (nächste ungeprüfte), [R00030](R00030-tastaturbedienung.md) (Tastenkatalog, Fokusring), [R00010](R00010-zeile-annotieren.md)/[R00022](R00022-datei-annotieren.md)/[R00031](R00031-zeilenbereich-annotieren.md) (offenes Notizfeld), [R00023](R00023-nebeneinander-ansicht.md) (zweispaltige Anzeige), [R00027](R00027-im-diff-suchen.md) (Treffer in den Blick).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Seitenleiste, Trenner, Diff-Bereich, Modus, Ansicht und Rollbereich sind die von R00012, R00033 und R00034.

## Geschäftlicher Nutzen

Manche Dateien liest man in der Breite (lange Zeilen, nebeneinander, 20 000 Zeilen), und dann steht die Dateiliste nur im Weg; danach will man sie sofort wieder. Heute ist die Liste immer da und lässt sich nur über die Fensterbreite oder das Scrollen aus dem Blick bringen. Mit einem Klick verschwindet sie und der Diff bekommt die ganze Breite — und mit einem Klick ist sie zurück. Der Nutzen kommt ohne neuen Serverweg und ohne gespeicherten Zustand; es ist derselbe Rahmen, nur in einer zweiten Stellung.

## Funktionale Anforderungen

- **Bedienelement und Ort**: ein Knopf am **Trenner** (R00034), sichtbar an der Grenze; er klappt ein und aus und trägt `role="button"`, `aria-expanded` (`true` ausgeklappt, `false` eingeklappt), einen Namen, der mit dem sichtbaren Text beginnt („Seitenleiste einklappen“ / „Seitenleiste ausklappen“), und ein sichtbares Bild der Wirkung (Pfeilrichtung). Per Tab erreichbar, Fokusring sichtbar (R00030, B2907). Das Kürzel (Empfehlung `b`) ist ein Eintrag im Katalog von I0015 (R00030), keine zweite Liste.
- **Eingeklappt**: die Seitenleiste (Commit-Zeile und Dateiliste) ist nicht sichtbar und **nicht** im Tab-/Lese-Weg (`hidden`/`inert`); der **Diff nimmt die volle Breite**; an der Grenze bleibt ein **schmaler Streifen** mit dem Ausklapp-Knopf stehen. Der **Fortschritt** bleibt im Kopf (der eine Zähler); der Streifen wiederholt ihn nicht.
- **Fokus**: beim Einklappen wandert der Fokus auf das Bedienelement (er bleibt erreichbar und bedienbar); beim Ausklappen bleibt der Fokus auf demselben Bedienelement. `aria-expanded` und der Name ändern sich mit dem Zustand.
- **Ausgeklappt**: die Seitenleiste steht wie in R00033; die zuletzt gesetzte **Breite** (R00034) gilt nach dem Ausklappen weiter, und der Trenner ist wieder bedienbar. Eingeklappt gibt es den Trenn-Zug nicht (keine Breite zu ziehen); die gemerkte Breite bleibt erhalten.
- **Nächste ungeprüfte eingeklappt**: der Knopf „Nächste ungeprüfte“ (I0025) bzw. die Taste `u` (R00030) bleibt bedienbar und zeigt den Diff der gewählten Stelle (der Diff-Bereich ist sichtbar); ist der Knopf in der eingeklappten Liste, wird er im Streifen oder im Kopf erreichbar gehalten (Empfehlung: der Streifen trägt den Ausklapp-Knopf; der Weg zu „Nächste ungeprüfte“ führt über die Taste `u` und den leeren Diff-Bereich, wie in I0025/B2704 „Erste ungeprüfte öffnen“).
- **Zustand**: der Zustand „eingeklappt“ ist ein Zustand der Seite (nur RAM); er bleibt beim Wechsel von Datei, Commit, Modus, Ansicht und Anordnung; nach dem Neuladen ist die Seitenleiste wieder ausgeklappt (nichts wird gespeichert).
- **Ohne Neuzeichnen** (Lehre #23): das Ein-/Ausklappen wirkt über das Layout (eine Klasse an der Rahmenfläche), **ohne** den Diff neu zu zeichnen. Ein offenes Notizfeld, Markierungen, die Treffer der Suche (R00027) und die Bildlaufposition des Diffs bleiben; beim Ausklappen kommt die Liste in der zuletzt gesetzten Breite und der gewählten Zeile zurück, und die gewählte Zeile wird **in den Blick gescrollt** (R00033).
- **Gilt in allen Anzeigeverfahren** (Lehre #7): in beiden Modi („Zusammen“/„Einzeln“), beiden Ansichten („nur Änderungen“/„ganze Datei“) und beiden Anordnungen („untereinander“/„nebeneinander“, R00023).
- **Kein neuer Weg**: kein neuer Serverweg, kein neuer `git`-Aufruf.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): Ein- und Ausklappen wirkt ≤ 1 s nach der Betätigung (der Diff wird nicht neu geladen; Messwert ≤ 0,7 s); das Scrollen durch 20 000 Zeilen bleibt flüssig (`content-visibility`, R00017). **Keine künstliche Last** in den Proben (AI-Team/gelerntes.md).
- **Sicherheit**: unverändert — fremder Text nur über `textContent`; eingeklappte Elemente sind `hidden`/`inert` (kein unsichtbarer Tab-Stopp, keine unsichtbare Bedienung); kein neuer Anfrageweg.
- **Logging**: unverändert — nichts auf stderr, stdout bleibt bis „Beenden“ leer.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Entwurf Fassung 2 (die Lücke füllt Material 3; kanbanD hat kein Vorbild), keine eigenen Vorgaben; `aria-expanded` und der Name machen den Zustand für Screenreader hörbar; der Weg zurück ist immer sichtbar (Streifen mit Knopf, Kürzel `b`).

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md)) und **Repo S** (200 Zeilen, 60 Dateien, aus [R00033](R00033-seitenleiste-bleibt-stehen.md)). Aufruf `gitreviewA <Hashes> --kein-browser`, zweispaltig (1280 × 800). „Eingeklappt“ wird an der Sichtbarkeit der Dateiliste und an `aria-expanded` abgelesen.

### Einklappen und Ausklappen
- [ ] Gegeben der Lauf, ausgeklappt, wenn man den Knopf am Trenner betätigt, dann ist die Seitenleiste (Commit-Zeile und Dateiliste) nicht mehr sichtbar und nicht im Tab-Weg, der Diff-Bereich nimmt die volle Breite ein, an der Grenze steht ein schmaler Streifen mit dem Knopf, `aria-expanded` ist `false`, und der Name des Knopfes beginnt mit „Seitenleiste ausklappen“. *Ebene: Playwright (Browser-Eigenes: Darstellung, `aria-expanded`, Tab-Reihenfolge).*
- [ ] Gegeben eingeklappt, wenn man den Knopf (im Streifen oder per Taste `b`) erneut betätigt, dann ist die Seitenleiste wieder sichtbar — in der zuletzt gesetzten Breite (R00034) und mit der gewählten Zeile **im Blick** — und `aria-expanded` ist `true`. *Ebene: Playwright (Browser-Eigenes).*
- [ ] Gegeben ausgeklappt, wenn man ein- und wieder ausklappt, dann ändert sich die Bildlaufposition des Diffs nicht, und der Diff wurde nicht neu geladen (keine neue Diff-Anfrage). *Ebene: Playwright (Browser-Eigenes; keine Anfrage gezählt).*

### Fokus, Tastatur, Tab-Reihenfolge
- [ ] Gegeben ausgeklappt mit dem Fokus in der Dateiliste, wenn man den Knopf betätigt (Maus oder Taste `b`), dann steht der Fokus auf dem Knopf am Trenner/Streifen (nicht ins Leere), und ein Screenreader hört den neuen Namen und `aria-expanded="false"`. *Ebene: Playwright (Browser-Eigenes: Fokus, `aria-*`).*
- [ ] Gegeben eingeklappt, wenn man mit Tab durch die Oberfläche geht, dann sind die Elemente der eingeklappten Seitenleiste **nicht** erreichbar (`hidden`/`inert`), die Reihenfolge bleibt Kopf → Streifen/Knopf → Diff → Statuszeile, und der Diff-Bereich bleibt ein Tab-Stopp. *Ebene: Playwright (Browser-Eigenes: Tab-Reihenfolge).*
- [ ] Gegeben eingeklappt, wenn man die Taste `b` drückt und danach in einem Textfeld tippt, dann wirkt `b` nur außerhalb von Feldern (wie R00030). *Ebene: Playwright (Browser-Eigenes) und Unit (Katalog/Kontext, R00030).*

### Nächste ungeprüfte eingeklappt
- [ ] Gegeben Repo Z in „Zusammen“, eingeklappt, eine Datei noch ungeprüft, wenn man die Taste `u` drückt, dann wechselt der Diff zur nächsten ungeprüften Stelle und beginnt oben (die Seitenleiste bleibt eingeklappt); ist im leeren Diff-Bereich der Knopf „Erste ungeprüfte öffnen“ (I0025/B2704) sichtbar, dann ist er bedienbar, auch wenn die Liste eingeklappt ist. *Ebene: Playwright (Browser-Eigenes).*
- [ ] Gegeben alle Lesbaren abgehakt und eingeklappt, wenn man `u` drückt, dann bleibt der Diff stehen und es erscheint die Meldung aus R00028 („Alles abgehakt“ bzw. „Alles Lesbare abgehakt, k nicht lesbar“). *Ebene: Playwright (Browser-Eigenes).*

### Zustand und Anzeigeverfahren (Lehre #7/#23)
- [ ] Gegeben eingeklappt, wenn man die Datei wechselt, den Commit wechselt, auf „Einzeln“/„Zusammen“, auf „ganze Datei“/„nebeneinander“ umschaltet und danach die Seite neu lädt, dann bleibt die Seitenleiste bei allen Wechseln eingeklappt und ist nach dem Neuladen wieder ausgeklappt (nichts gespeichert). *Ebene: Playwright (Browser-Eigenes) und Integration (Oberfläche gegen Fake: Zustand).*
- [ ] Gegeben `src/a.txt` mit einem **offenen** Notizfeld an einer Zeile (Text „Klammer fehlt“) und einem Suchtreffer, wenn man ein- und wieder ausklappt, dann bleiben das offene Feld samt Text und Fokus, die Markierung und der Suchtreffer erhalten; es wird keine neue Diff-Anfrage gestellt. *Ebene: Playwright (Browser-Eigenes; Lehre #23).*

Grenz- und Leerfälle bedacht: leere Dateiliste → Einklappen ändert nichts Sichtbares, der Streifen bleibt; kein zweispaltiger Aufbau (schmales Fenster) → kein Knopf; Ausklappen, während die gewählte Datei ausgeblendet ist (R00029) → die Zeile wird nicht gefunden, der Diff bleibt, der Hinweis aus R00029 gilt. Verworfen als eigenes Kriterium: eine Animation des Einklappens, eine gespeicherte Stellung über das Neuladen hinaus.

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) und R00033/R00034 (Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `web/index.html` — der Knopf am Trenner und der Streifen.
- `web/gitreviewa.css` — der eingeklappte Zustand (Seitenleiste `hidden`/`inert`, Diff volle Breite, Streifen).
- `web/einklappen.js` (neu, Oberfläche) — Zustand, Knopf, `aria-expanded`, Fokus, Anschluss an den Katalog (I0015) und an `datei-gewaehlt`.
- `web/tasten-werte.js` — Katalogeintrag für das Kürzel (I0015).
- `e2e/` — Playwright-Specs (Einklappen, Fokus, `aria-expanded`, Tab-Reihenfolge, nächste ungeprüfte, offenes Feld).

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Die Bubbles stehen in der WBS unter I0036 (B3401–B3405).

**Artboard**: [Entwurf Fassung 2](../Dokumentation/Wireframes/oberflaeche-fassung-2.html) zeichnet **kein** Ein-/Ausklappen (kein Knopf, kein Streifen). Für dieses Bedienelement gilt der Standard (Material 3 und kanbanD füllen die Lücke): ein Knopf an der Grenze mit `aria-expanded`, wie bei geteilten Ansichten üblich; kanbanD hat kein Vorbild.

### Ablauf

1. **Betätigen** — Klick auf den Knopf oder Taste `b` (I0015) → Zustand wechseln (B3401), `aria-expanded` und Name mitziehen.
2. **Layout** — Zustand → die Seitenleiste `hidden`/`inert`, der Diff volle Breite, der Streifen mit dem Knopf sichtbar (B3403); der Diff wird **nicht** neu gezeichnet.
3. **Fokus** — Fokus auf den Knopf; beim Ausklappen bleibt er dort (B3404).
4. **Nächste ungeprüfte** — eingeklappt weiter bedienbar (Taste `u`, Knopf im leeren Diff, I0025) (B3404).
5. **Ausklappen** — Liste in der gemerkten Breite (R00034), gewählte Zeile in den Blick (R00033).

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `web/index.html` (Knopf, Streifen), `gitreviewa.css`, `tasten-werte.js` (I0015), das Ereignis `datei-gewaehlt` (R00033/B3203), der Trenner aus R00034.

- `einklappen.js` (Oberfläche) — Zustand `Eingeklappt` (RAM, Start ausgeklappt), Knopf mit `aria-expanded`, Fokus, Streifen, Anschluss an `datei-gewaehlt`, `eingeklappt-geaendert`.
- Katalog (`tasten-werte.js`, I0015) — ein Eintrag mit `ziel` (der Knopf), damit Hilfe, Statuszeile und Hinweis aus derselben Quelle lesen.

### Änderungen an bestehenden Klassen

`web/index.html` (Knopf, Streifen), `gitreviewa.css` (Zustand), `tasten-werte.js` (Katalogeintrag). Keine Serverklasse. `naechste.js`/`tasten.js`: der Weg `u` und der leere Diff-Bereich bleiben unverändert erreichbar.

## Tests

Nach Test-Pyramide und Konfiguration (Interactor je Interaction; Playwright nur Hot Path und Browser-Eigenes). Der Zustand ist eine kleine Logik → **Integration** (Oberfläche gegen Fake bzw. Zustandseinheit); das Einklappen, der Fokus, `aria-expanded`, die Tab-Reihenfolge und das offene Feld sind **Browser-Eigenes** → Playwright. Kein Serverweg; das Einklappen liegt nicht auf dem Hot Path.

**Unit/Integration:** Zustand (Start ausgeklappt, Wechsel, Neuladen), `aria-expanded` und Name je Zustand, Katalogeintrag (R00030).
**E2E (Playwright headless):** Einklappen/Ausklappen (Sichtbarkeit, volle Breite, Streifen), Fokus und `aria-*`, Tab-Reihenfolge mit `hidden`/`inert`, `u` eingeklappt, offenes Feld/Suchtreffer/Markierung überstehen (Lehre #23), alle Anzeigeverfahren (Lehre #7), Neuladen. Messwert „wirkt ≤ 1 s“ (Messwert ≤ 0,7 s) ereignisgenau, mit Positivkontrolle. Lehre „Wert aus einer Einstellung als Spanne prüfen“ nur, wo eine Zahl im Spiel ist (hier die gemerkte Breite aus R00034).

## Abhängigkeiten

- Abhängig von: I0035 Breite der Seitenleiste ziehen ([R00034](R00034-breite-der-seitenleiste-ziehen.md), rot — der Knopf sitzt am dort gebauten Trenner) und I0027 Oberfläche Liste–Detail ([R00012](R00012-oberflaeche-liste-detail-zusammen.md), grün); fachlich benachbart: I0034 Seitenleiste bleibt stehen ([R00033](R00033-seitenleiste-bleibt-stehen.md), rot — der Streifen und das Ausklappen in den Blick).
- Blockiert: nichts.
- Mitgenutzt und unverändert: I0025 (nächste ungeprüfte, bleibt eingeklappt bedienbar), I0015 (Tastenkatalog, Fokusring), I0007/I0009/I0014/I0022/I0031 (Anzeigeverfahren, Rollbereich), I0017/I0018/I0032 (offenes Feld), I0026/I0013 (ausgeblendete Sicht).
- **Vorgabe an I0015** (R00030, nicht Abnahme dieser Karte): der Katalogeintrag für das Kürzel des Ein-/Ausklappens (Empfehlung `b`) trägt sein `ziel` (den Knopf), damit Hilfe, Statuszeile und Hinweis aus derselben Quelle lesen.

## Offene Fragen

Offen beim product-owner (Gestalt, nicht Vertrag):

1. **Was bleibt eingeklappt sichtbar**: Empfehlung: ein **schmaler Streifen** mit dem Ausklapp-Knopf an der Grenze (der Weg zurück bleibt sichtbar); der **Fortschritt** bleibt im Kopf (der eine Zähler) und wird im Streifen nicht wiederholt. Alternative: nichts bleibt, dann führt nur der Knopf im Kopf zurück.
2. **Ort des Knopfes**: Empfehlung: **am Trenner** (die Grenze ist dort, der Blick ist dort, wenn man mehr Diff-Breite will); deshalb `Braucht I0035`. Alternative: im Kopf der Anwendung (unabhängig vom Trenner, dann kein `Braucht`).
3. **Kürzel**: Empfehlung: ja, ein Kürzel über den Katalog von I0015 (Vorschlag `b`), damit es wie die übrigen Sichten per Tastatur geht; Alternative: kein Kürzel, nur Knopf.
4. **Zustand beim Neuladen**: Empfehlung: nach dem Neuladen wieder ausgeklappt (nichts gespeichert, wie die übrigen Schalter).

Ohne Rückfrage entschieden (Empfehlung des planers, gilt bis zur Antwort): die Breite (R00034) bleibt über das Ein-/Ausklappen erhalten; eingeklappt gibt es den Trenn-Zug nicht; die eingeklappte Seitenleiste ist `hidden`/`inert`; das Ausklappen bringt die gewählte Zeile in den Blick; kein Neuzeichnen des Diffs (Lehre #23); kein neuer Serverweg.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00012/R00033/R00034 hinaus (die Wegwerf-Repos legen die Tests an).

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 5 Bubbles unterhalb I0036 (B3401–B3405), davon 2 klar (2 h) und 3 unklar (2–4 h) — Untergrenze 10 h, obere Schätzung 16 h. Enthalten: nur I0036. Keine Ausbaustufen. Die Vorgabe an I0015 ist nicht gezählt.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: der Betreiber fragt, ob man „die Sidebar mit den Dateien und commits“ nicht „ausklappen und einklappen“ könne. Beim Lesen einer breiten Datei — lange Zeilen, zwei Spalten, 20 000 Zeilen — nimmt die Dateiliste Breite weg, die der Diff braucht; danach will man sie sofort zurück. Zielbild ist eine Seitenleiste, die führt, wenn man sie braucht, und verschwindet, wenn man sie nicht braucht. Wenn ein Knopf an der Grenze die Liste ein- und ausklappt, der Diff die volle Breite bekommt und ein schmaler Streifen den Weg zurück zeigt, dann liest man breite Dateien ohne Umweg. Gerade dieser Schritt ist der Hebel, weil er auf demselben Rahmen (R00033) und demselben Trenner (R00034) aufsetzt: es ist eine zweite Stellung derselben Grenze, kein neuer Aufbau, kein neuer Serverweg — und weil eingeklappt „Nächste ungeprüfte“ weitergeht, verliert man die Checkliste nicht, sondern nur ihre sichtbare Liste.

## Missing-Docs

- Ob `inert` (statt nur `hidden`) für die eingeklappte Seitenleiste in den Zielbrowsern den Tab- und Klick-Weg zuverlässig sperrt — vor dem Bauen mit einem kleinen Versuch belegen.
- Ob das Ausklappen die gemerkte Breite (R00034) und die Wahl ohne Reflow-Sprung (Bildlaufposition der Liste) wiederherstellt — mit 60 Dateien (Repo S) prüfen.

## Notizen

### Optionen (Zustand des Einklappens)

| Option | Orientierung | Aufwand | Risiko |
|---|---|---|---|
| **1. Zustand der Seite, nur RAM (gewählt)** | hoch: bleibt beim Arbeiten, Neuladen stellt den Standard her | klein | ein Neuladen nimmt die Stellung — gewollt („nichts wird gespeichert“) |
| 2. `localStorage` | mittel: bleibt über das Neuladen | klein | widerspricht der Leitplanke „nichts wird gespeichert“ und der Linie aller übrigen Schalter |
| 3. Kein Zustand, Auto-Einklappen bei schmalem Fenster | niedrig: nicht steuerbar | klein | nimmt dem Menschen die Entscheidung; widerspricht dem Auftrag („ausklappen und einklappen“) |

Gewählt: 1 — dieselbe Linie wie „Umbruch“, „Ansicht“, „Anordnung“, „Leerraum“ und „Abgehakte ausblenden“.

### Verworfene Alternativen

- Einklappen als maximale Trenner-Breite (Breite = 0): verworfen — ein Knopf und ein diskreter Zustand sind klarer als eine gezogene Grenze, und der Streifen braucht einen eigenen Zustand.
- Ein zweiter Knopf im Kopf neben dem am Trenner: verworfen — zwei Quellen für denselben Zustand; das Kürzel `b` gibt den Tastaturweg.
- Schichtenschnitt „Zustand/Knopf/Layout“: verworfen — ein Slice.
