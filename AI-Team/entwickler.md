# entwickler — Projektschicht

Ergänzt die Rolle `entwickler` der Factory für dieses Projekt. Gilt für Projektgebundenes (Umgebung, Stack, Pfade, Befehle, Stil); Grenzen und Kernregeln der Rolle überschreibt sie nie (`gemeinsam/regeln.md`, „Vorrang“).

## Projektregeln

- Stack: .NET 10 Konsolenanwendung, ASP.NET Core Minimal API, Weboberfläche als eingebettete Ressource (HTML/CSS/JavaScript ohne Build-Kette), `git` per `Process`; Tests NUnit (Unit, Integration gegen Wegwerf-Repos), E2E Playwright unter `e2e/`.
- stdout gehört allein dem Ergebnis manueller Review; Logging nur stderr (factory.md, „Logging-Konzept“).
- Nur `127.0.0.1`, freier Port; nichts wird auf Platte gespeichert.
- Im Worktree nur betroffene Tests und `dotnet build -warnaserror`; volles Gate macht der Director auf `main`.
- Stilkatalog vor dem Schreiben: Skill `csharp-stil`, Skill `javascript-stil`.

- Design und Review-Code aus kanbanD übernehmen: factory.md, „Gestaltung und Vorlage kanbanD“ — erst dort nachsehen, dann neu schreiben.

- **Testbarkeit (Betreiber 2026-11-24)**: je Interaction ein Interactor, Adapter dünn; Akzeptanzkriterien als NUnit-Integrationstests gegen den Interactor (ATDD, Skill `msec:atdd-build`, Treiber in-process); Playwright nur für den Hot Path und Browser-Eigenes — factory.md, „Testbarkeit und Testverteilung“. Im Bericht je Kriterium die Testebene nennen.

## Spezialisierungen

- csharp — C#-Hausstil und Vorlagen
- javascript — Oberfläche ohne Framework

## Quellen

- Q01, Q02 — Leitplanken und Umfang
- Q03 — Diff-Formate und Optionen von git
- Q04 — Format der VS-Code-Links
- Q05 — kanbanD als Vorlage: Start mit freiem Port und Browser, eingebettete Oberfläche, Tastaturkürzel, Diff-/Git-Aufrufe; übernehmen erlaubt (Rust → C#, JavaScript direkt)

## Gelerntes

- (noch keine)
