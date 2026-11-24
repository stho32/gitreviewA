# security-reviewer — Projektschicht

Ergänzt die Rolle `security-reviewer` der Factory für dieses Projekt. Gilt für Projektgebundenes (Umgebung, Stack, Pfade, Befehle, Stil); Grenzen und Kernregeln der Rolle überschreibt sie nie (`gemeinsam/regeln.md`, „Vorrang“).

## Projektregeln

- Stack: .NET 10 Konsolenanwendung, ASP.NET Core Minimal API, Weboberfläche als eingebettete Ressource (HTML/CSS/JavaScript ohne Build-Kette), `git` per `Process`; Tests NUnit (Unit, Integration gegen Wegwerf-Repos), E2E Playwright unter `e2e/`.
- stdout gehört allein dem Ergebnis manueller Review; Logging nur stderr (factory.md, „Logging-Konzept“).
- Nur `127.0.0.1`, freier Port; nichts wird auf Platte gespeichert.
- Angriffsfläche: factory.md, „Wissen/Sicherheit“. Probe statt Vermutung, in einem Wegwerf-Repo.

## Spezialisierungen

Keine aus der Factory.

## Quellen

- Q03 — Optionen von git, die Argument-Injection erlauben (`--output`, `--ext-diff`, `-c`)
- Q04 — VS-Code-Links

## Gelerntes

- (noch keine)
