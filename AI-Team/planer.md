# planer — Projektschicht

Ergänzt die Rolle `planer` der Factory für dieses Projekt. Gilt für Projektgebundenes (Umgebung, Stack, Pfade, Befehle, Stil); Grenzen und Kernregeln der Rolle überschreibt sie nie (`gemeinsam/regeln.md`, „Vorrang“).

## Projektregeln

- Anforderungen unter `Anforderungen/`, WBS `Dokumentation/Planung/gitreviewa.md`; Rolling Wave.
- Offene Richtungsfragen der Vision nicht beantworten — als Frage an den product-owner.
- Wenige, prüfbare Kriterien je Karte (Betreiber will Tempo); jedes Kriterium ist ein möglicher Befund.

- Kriterien zur Oberfläche am Stil von kanbanD messen (factory.md, „Gestaltung und Vorlage kanbanD“), keine eigenen Gestaltungsvorgaben erfinden.

- **Testbarkeit (Betreiber 2026-11-24)**: Kriterien in Fachsprache (was der Nutzer erreicht); je Kriterium die Testebene vorschlagen — Standard Integrationstest gegen den Interactor, Playwright nur auf dem Hot Path oder wenn nur im Browser prüfbar (factory.md, „Testbarkeit und Testverteilung“).

- **Pflichtpunkte jeder Detailplanung (Director 2026-11-25, aus den Nacharbeiten des Tages)** — je Punkt ein Kriterium oder ausdrücklich „nicht betroffen“:
  1. **Grenzen jeder Eingabe und Ausgabe, auch je Einheit**: nicht nur Anzahl (Treffer, Zeilen), sondern auch Länge je Element (Zeichen je Zeile, Treffer je Zeile) — besonders für alles, was auf stdout landet (Vertrag mit der KI). Anlass: #30 (Treffer je Zeile quadratisch, 45 s), #35 (8-MiB-Zitatzeile auf stdout).
  2. **Alle Anzeigeverfahren, der Standardmodus ausdrücklich zuerst**: „Zusammen“ (netto und je Abschnitt ohne Kette), „Einzeln“, untereinander/nebeneinander, nur Änderungen/ganze Datei, Umbruch, Suche, Lücken, große Diffs. Anlass: #12 (kein Bild in „Zusammen“).
  3. **Festes Layout: jedes wachsende Element** über oder neben einem Rollbereich bekommt eine Obergrenze oder liegt im Rollbereich. Anlass: #34 (Datei-Anmerkungen drücken den Diff auf 0 px).
  4. **NFA passt zum Ausführungsort**: Browser-Verhalten bekommt keine Prozess-stderr-Zeile. Anlass: R00027, PO c4427d2.
  5. **Eine Unterscheidung, ein Ort**: führt die Interaction eine neue Art ein (z. B. Bereich neben Zeile und Datei), nennt ein Kriterium die eine Stelle, die die Art bestimmt, und alle Wege, die sie nutzen (Anzeige, Sperre, Zähler, Ergebnis). Anlass: #35 (Bereich erschien zugleich als Dateianmerkung), #15 (zweite Hinweisliste neben dem Katalog).

## Spezialisierungen

Keine aus der Factory.

## Quellen

- Q01, Q02 — Vision und WBS

## Gelerntes

- 2026-11-24 (#1, #5): User Stories liegen unter `Anforderungen/user-stories/RXXXXX.md` (Ablageort der Anforderungs-Familie, `./user-stories/` relativ zur Anforderung) — nicht im Repo-Root.

- **Nur im Worktree der Karte schreiben** (2026-11-24, #10 und #14): Der Arbeitsort steht im Auftragskopf. Dateien unter `/home/shoff/Projekte/gitreviewA/` (Hauptbaum, `main`) nie anlegen oder ändern — auch nicht vorübergehend; Pfade immer mit dem Worktree-Präfix schreiben und vor dem Commit `git -C <worktree> status` sowie `git -C /home/shoff/Projekte/gitreviewA status` prüfen.
