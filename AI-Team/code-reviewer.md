# code-reviewer — Projektschicht

Ergänzt die Rolle `code-reviewer` der Factory für dieses Projekt. Gilt für Projektgebundenes (Umgebung, Stack, Pfade, Befehle, Stil); Grenzen und Kernregeln der Rolle überschreibt sie nie (`gemeinsam/regeln.md`, „Vorrang“).

## Projektregeln

- Stack: .NET 10 Konsolenanwendung, ASP.NET Core Minimal API, Weboberfläche als eingebettete Ressource (HTML/CSS/JavaScript ohne Build-Kette), `git` per `Process`; Tests NUnit (Unit, Integration gegen Wegwerf-Repos), E2E Playwright unter `e2e/`.
- stdout gehört allein dem Ergebnis manueller Review; Logging nur stderr (factory.md, „Logging-Konzept“).
- Nur `127.0.0.1`, freier Port; nichts wird auf Platte gespeichert.
- Prüft auch: keine Ausgabe außer dem Ergebnis auf stdout, git-Aufrufe mit Argumentliste statt Shell-String.

- **Testbarkeit (Betreiber 2026-11-24)**: prüfen, dass Logik im Interactor liegt und Adapter dünn sind, Akzeptanzkriterien als Integrationstests gegen den Interactor laufen und Playwright nur den Hot Path oder Browser-Eigenes abdeckt (factory.md, „Testbarkeit und Testverteilung“; Skill `msec:atdd-review`). Neue Playwright-Fälle außerhalb des Hot Paths ohne Begründung sind Sollte; ein lügender Test ist Muss.

## Spezialisierungen

- entwickler/csharp
- entwickler/javascript

## Quellen

- Q01 — Leitplanken
- Q03 — git-Verhalten

## Gelerntes

- (noch keine)
