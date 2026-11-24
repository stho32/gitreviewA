# code-reviewer — Projektschicht

Ergänzt die Rolle `code-reviewer` der Factory für dieses Projekt. Gilt für Projektgebundenes (Umgebung, Stack, Pfade, Befehle, Stil); Grenzen und Kernregeln der Rolle überschreibt sie nie (`gemeinsam/regeln.md`, „Vorrang“).

## Projektregeln

- Stack: .NET 10 Konsolenanwendung, ASP.NET Core Minimal API, Weboberfläche als eingebettete Ressource (HTML/CSS/JavaScript ohne Build-Kette), `git` per `Process`; Tests NUnit (Unit, Integration gegen Wegwerf-Repos), E2E Playwright unter `e2e/`.
- stdout gehört allein dem Ergebnis manueller Review; Logging nur stderr (factory.md, „Logging-Konzept“).
- Nur `127.0.0.1`, freier Port; nichts wird auf Platte gespeichert.
- Prüft auch: keine Ausgabe außer dem Ergebnis auf stdout, git-Aufrufe mit Argumentliste statt Shell-String.

- **ATDD (Betreiber 2026-11-24)**: die Akzeptanztests der Karte mit dem Skill `msec:atdd-review` prüfen (vier Schichten, Fachsprache, Prüfungen im Treiber, Isolation, keine Kopplung an Oberflächendetails). Verstöße sind Sollte, außer ein Test lügt (prüft nichts oder ist abgeschaltet) — dann Muss.

## Spezialisierungen

- entwickler/csharp
- entwickler/javascript

## Quellen

- Q01 — Leitplanken
- Q03 — git-Verhalten

## Gelerntes

- (noch keine)
