# planer — Projektschicht

Ergänzt die Rolle `planer` der Factory für dieses Projekt. Gilt für Projektgebundenes (Umgebung, Stack, Pfade, Befehle, Stil); Grenzen und Kernregeln der Rolle überschreibt sie nie (`gemeinsam/regeln.md`, „Vorrang“).

## Projektregeln

- Anforderungen unter `Anforderungen/`, WBS `Dokumentation/Planung/gitreviewa.md`; Rolling Wave.
- Offene Richtungsfragen der Vision nicht beantworten — als Frage an den product-owner.
- Wenige, prüfbare Kriterien je Karte (Betreiber will Tempo); jedes Kriterium ist ein möglicher Befund.

- Kriterien zur Oberfläche am Stil von kanbanD messen (factory.md, „Gestaltung und Vorlage kanbanD“), keine eigenen Gestaltungsvorgaben erfinden.

- **Testbarkeit (Betreiber 2026-11-24)**: Kriterien in Fachsprache (was der Nutzer erreicht); je Kriterium die Testebene vorschlagen — Standard Integrationstest gegen den Interactor, Playwright nur auf dem Hot Path oder wenn nur im Browser prüfbar (factory.md, „Testbarkeit und Testverteilung“).

## Spezialisierungen

Keine aus der Factory.

## Quellen

- Q01, Q02 — Vision und WBS

## Gelerntes

- 2026-11-24 (#1, #5): User Stories liegen unter `Anforderungen/user-stories/RXXXXX.md` (Ablageort der Anforderungs-Familie, `./user-stories/` relativ zur Anforderung) — nicht im Repo-Root.
