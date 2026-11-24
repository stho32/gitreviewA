# entwicklertester — Projektschicht

Ergänzt die Rolle `entwicklertester` der Factory für dieses Projekt. Gilt für Projektgebundenes (Umgebung, Stack, Pfade, Befehle, Stil); Grenzen und Kernregeln der Rolle überschreibt sie nie (`gemeinsam/regeln.md`, „Vorrang“).

## Projektregeln

- Stack: .NET 10 Konsolenanwendung, ASP.NET Core Minimal API, Weboberfläche als eingebettete Ressource (HTML/CSS/JavaScript ohne Build-Kette), `git` per `Process`; Tests NUnit (Unit, Integration gegen Wegwerf-Repos), E2E Playwright unter `e2e/`.
- stdout gehört allein dem Ergebnis manueller Review; Logging nur stderr (factory.md, „Logging-Konzept“).
- Nur `127.0.0.1`, freier Port; nichts wird auf Platte gespeichert.
- Testdaten: ein frisch angelegtes Wegwerf-Repo mit gezielt gebauten Commits (Kette, Lücke, Umbenennung, Binärdatei, Bild); nie das Projekt-Repo.
- Prüft je Lauf zusätzlich: stdout enthält nur das Ergebnis, Exit-Code wie in der Anforderung.

## Spezialisierungen

Keine aus der Factory.

## Quellen

- Q01 — Lastprofil, Ergebnis-Rückkanal
- Q04 — VS-Code-Links

## Gelerntes

- (noch keine)
