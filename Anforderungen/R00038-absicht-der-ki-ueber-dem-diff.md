---
id: R00038
status: Neu
datum: 2026-11-25
---

# R00038: Absicht der KI über dem Diff

## Beschreibung

Über dem Diff der gewählten Datei steht, **warum** sie geändert wurde: die Commits der Auswahl, die diese Datei ändern, je Commit mit Kurz-Hash und Betreff, der Rumpf der Commit-Nachricht aufklappbar. In „Zusammen“ sind es alle Commits, die die Datei ändern, in „Einzeln“ der gewählte Commit. Der Block scrollt mit dem Diff.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (in der Mitte der Diff mit der Absicht der KI, den Commit-Nachrichten zur Datei; ergänzt 2026-11-25).

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Modi, Commit-Zeile), [R00003](R00003-commits-und-dateien-sehen.md) (Message = Text nach dem Betreff), [R00015](R00015-zusammen-logik-und-server.md) (Stellen je Datei, Umbenennung).

### Domänenbezug

Kein Glossar. „Absicht der KI“ heißt hier: die Commit-Nachrichten der Commits, die die Datei ändern — was die KI über ihre Änderung gesagt hat.

## Geschäftlicher Nutzen

In „Zusammen“ sieht der Mensch eine Datei netto über alle Commits, aber nicht mehr, was die KI mit den Änderungen wollte; die Nachrichten stehen zugeklappt in der Commit-Zeile, getrennt von der Datei. Wer weiß, was gewollt war („Null-Prüfung ergänzt“), prüft gezielt, ob es auch so gebaut ist — und merkt, wenn eine Datei geändert wurde, die zu keiner Nachricht passt.

## Funktionale Anforderungen

- **Welche Commits** (Pflichtpunkt 5: eine Stelle): eine reine Rechnung bestimmt aus Modus, gewählter Datei, den Stellen der Übersicht und den Commits der Auswahl die Commits, die die Datei ändern — in „Zusammen“ alle Stellen des Netto-Eintrags (bei einer Umbenennung auch die unter dem alten Pfad, PO Zeile 69), in „Einzeln“ der gewählte Commit. Reihenfolge wie in der Commit-Zeile.
- **Block**: über der ersten Diff-Zeile, **im** Diff-Rollbereich (er scrollt mit dem Diff weg). Je Commit eine Zeile: Kurz-Hash (7 Zeichen) und Betreff; hat der Commit einen Rumpf, ein Knopf „Nachricht“ (Start zu, `aria-expanded`), der den Rumpf darunter zeigt. Ändern mehr als 5 Commits die Datei, stehen die ersten 5 da und ein Knopf „k weitere“ zeigt den Rest.
- **Ohne Commit** (keine Datei gewählt, Zustand „Datei wählen“): kein Block.
- **Wechsel**: der Block wird bei Datei-, Commit- und Moduswechsel neu bestimmt; Ansicht, Anordnung, Umbruch, Leerraum, Suche und Lücken lassen ihn stehen, der Diff wird dafür nicht neu gezeichnet.
- **Kein neuer Weg**: kein neuer Endpunkt, kein neuer `git`-Aufruf — Betreff und Rumpf kommen aus `GET /api/commits`, die Stellen aus der Übersicht.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): bis 200 Commits je Datei (Lastprofil) — sichtbar höchstens 5 Zeilen, der Rest auf Wunsch; ein Rumpf erscheint nur aufgeklappt und ganz, lange Zeilen umbrochen, kein waagerechter Bildlauf. Der Rumpf ist durch das Lesen der Commits begrenzt (R00003, Ausgabegrenze 8 MiB). Der Block liegt im Rollbereich und drückt den Diff nicht weg (Pflichtpunkt 3).
- **Sicherheit**: Betreff und Rumpf sind fremder Text — nur `textContent`, unsichtbare und richtungsändernde Zeichen als Marke `⟨U+…⟩` (dieselbe Zeichenliste wie R00011/R00012).
- **Performance**: der Block verlängert den Dateiwechsel nicht über die Zusagen der Vision (≤ 200 ms typisch); keine zusätzliche Anfrage.
- **Logging** (Pflichtpunkt 4): nur Browser — nichts auf stderr.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (`user-stories/R00012.md`: `z1` „Start“, `z2` „a ändern, b neu“, `z3` „a und b ändern“) und **Repo M** (neu, `user-stories/R00038.md`: sechs Commits `m1`–`m6` ändern je `x.txt`, `m4` mit Rumpf `<b>fett</b>` und `a`+U+202E+`b`). Aufruf `gitreviewA <Hashes> --kein-browser`, 1280 × 800.

- [ ] 1. Gegeben Repo Z in „Zusammen“, wenn man `src/a.txt` wählt, dann stehen über dem Diff drei Zeilen mit Kurz-Hash und Betreff von `z1`, `z2`, `z3` in der Reihenfolge der Commit-Zeile; wählt man `README.md`, steht nur `z1`. Rechnung: `src/a.txt` wird von `z1` (neu), `z2` und `z3` geändert, `README.md` nur von `z1`. *Ebene: Unit (Rechnung) und Integration (Oberfläche gegen Fake).*
- [ ] 2. Gegeben Repo Z in „Einzeln“ mit `z2` gewählt, wenn man `src/a.txt` wählt, dann steht nur `z2`; wechselt man auf `z3`, steht nur `z3`. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 3. Gegeben Repo M in „Zusammen“ und `x.txt`, wenn die Datei gewählt ist, dann stehen 5 Zeilen (`m1`–`m5` in Leistenreihenfolge) und ein Knopf „1 weitere“; nach dem Betätigen steht auch `m6`. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 4. Gegeben Repo M und `x.txt`, wenn man bei `m4` „Nachricht“ aufklappt, dann steht der Rumpf als Text `<b>fett</b>` (spitze Klammern, nicht fett) und `a⟨U+202E⟩b`, `aria-expanded` ist `true`; kein Element `b` entsteht. *Ebene: Playwright (DOM-Sicherheit, Browser-Eigenes).*
- [ ] 5. Gegeben Repo Z, `src/a.txt` gewählt, der Diff halb hinuntergescrollt, wenn man auf „ganze Datei“, „nebeneinander“, Umbruch und Leerraum umschaltet und sucht, dann bleibt der Block derselbe, und der Diff wird nicht neu geladen (keine neue Diff-Anfrage); scrollt man nach oben, steht der Block über der ersten Zeile; Seitenleiste und Kopf stehen. *Ebene: Playwright (Browser-Eigenes, Anfragen gezählt).*
- [ ] 6. Gegeben eine Umbenennung (`alt.txt` in `n1` angelegt, in `n2` zu `neu.txt` umbenannt und geändert) in „Zusammen“, wenn man `neu.txt` wählt, dann stehen `n1` und `n2`. *Ebene: Unit (Rechnung).*

Grenz- und Leerfälle bedacht: keine Datei gewählt (kein Block, Funktionale Anforderungen); Commit ohne Rumpf (kein Knopf „Nachricht“); 200 Commits (5 sichtbar, Kriterium 3 tastet die Grenze bei 6 ab); gesperrte Datei (R00014) — der Block steht wie bei jeder Datei, die Commits sind lesbar (kein eigenes Kriterium). Verworfen: Absicht als eigener Rollbereich über dem Diff (bräuchte eine Obergrenze und nähme Diff-Höhe weg).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterium 3, NFA „Grenzen“; 2 Anzeigeverfahren — Kriterien 1, 2, 5 („Zusammen“ zuerst, dann „Einzeln“, Ansichten, Anordnungen, Umbruch, Suche); 3 festes Layout — der Block liegt im Rollbereich (Kriterium 5); 4 Ausführungsort — nur Browser; 5 eine Stelle — die Rechnung „Commits der Datei“ (Kriterien 1, 6).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/absicht-werte.js` (neu, rein), `absicht.js` (neu), `index.html`, `gitreviewa.css`.
- `tests/` (Node-Unit wie `haken-werte`), `e2e/`.

## Technische Überlegungen

**Vorplanung** — Bubbles B3701–B3704 unter I0039. **Artboard**: Variante A (Absicht der KI über dem Diff); Entwurf Fassung 2 zeigt `.diff-herkunft` im Diff-Kopf ohne Nachricht — die Lücke füllt Material 3 (list mit expandierbaren Einträgen).

### Ablauf

1. `datei-gewaehlt`/`modus-gewechselt`/Commit-Wechsel → Commits der Datei (B3701).
2. Block im Diff-Rollbereich zeichnen, Rumpf und „k weitere“ aufklappbar (B3702).
3. Anzeige-Wechsel lassen ihn stehen (B3703).

### Grobentwurf

- `absicht-werte.js` (rein) — `commitsDerDatei(modus, wahl, stellen, commits)` → Liste; `sichtbare(commits, 5)`.
- `absicht.js` (Oberfläche) — Block, Knöpfe, Marken über die vorhandene Funktion.

### Änderungen an bestehenden Klassen

`diff.js` (Platz für den Block im Rollbereich vor den Zeilen), keine Serverklasse.

## Tests

**Unit:** Rechnung (Zusammen, Einzeln, Umbenennung, 0/1/6 Commits).
**Integration:** Oberfläche gegen Fake (Block, „k weitere“).
**E2E:** DOM-Sicherheit des Rumpfs, Stehenbleiben beim Umschalten — Browser-Eigenes, nicht Hot Path.

## Abhängigkeiten

- Abhängig von: I0027 Oberfläche Liste–Detail (R00012, grün).
- Blockiert: nichts.

## Offene Fragen

1. **Wie viele Zeilen sichtbar**: Empfehlung 5, darüber „k weitere“ — eine Datei mit vielen Commits soll den Diff nicht unter den Bildrand schieben; Alternative: alle zeigen (bei 200 Commits stünde der Diff 200 Zeilen tiefer). Grenzwert innerhalb der Leitplanken, Entscheidung des product-owner.
2. **Rumpf zu oder offen beim Start**: Empfehlung zu — der Betreff trägt die Absicht meist allein; offen hieße, jede Datei beginnt mit Text statt Diff.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 4 Bubbles unterhalb I0039 (B3701–B3704), 2 klar (2 h), 2 unklar (2–4 h) — 8–12 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist Richtung A: über dem Diff steht die Absicht der KI. In „Zusammen“, dem Standard, ist die Verbindung zwischen Datei und Nachricht verloren gegangen, weil die Commits nur noch eine zugeklappte Zeile sind. Wenn die Nachrichten genau der Commits, die die Datei ändern, über ihrem Diff stehen, vergleicht der Mensch Absicht und Änderung an einem Ort, ohne die Commit-Zeile aufzuklappen und zu suchen. Der Hebel ist eine reine Rechnung über vorhandene Daten: kein neuer Weg zum Server, kein neues Lesen aus dem fremden Repo.

## Missing-Docs

- Keine.

## Notizen

### Verworfene Alternativen

- Nachricht im Diff-Kopf (feste Leiste): verworfen — wachsender Text über dem Rollbereich (Pflichtpunkt 3).
- Nachricht je Abschnitt im Diff (am Hunk): verworfen — netto gibt es keine Zuordnung von Abschnitt zu Commit (R00015), außer ohne lückenlose Kette, wo die Abschnitte schon beschriftet sind.
