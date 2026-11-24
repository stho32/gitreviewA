# Gelerntes

Was ein Lauf an Verständnis gebracht hat. Eine Zeile je Lauf; „nichts Neues" ist ein gültiger Eintrag.

| Datum | Arbeitspaket | Erkenntnis | Folge |
|---|---|---|---|
| 2026-11-24 | I0001 Mit Commit-Hashes aufrufen | `git commit` startet `git maintenance run --auto --detach`; der losgelöste Prozess erbt die Ausgabe-Pipes und hält `ReadToEnd` offen — und ohne gestaffelte Commit-Zeiten kann kein Test `--no-walk=unsorted` von `--no-walk` unterscheiden | Wegwerf-Repos mit `maintenance.auto=false`, `gc.auto=0` und Zeit je Commit; git-Ausgabe: stdout synchron, stderr per Ereignis |
| 2026-11-24 | I0001 Nacharbeit Security-Review | Ob `git log` ein Signaturprogramm startet, entscheidet der Kopf der Signatur im Commit (`BEGIN PGP` → `gpg.program`, `BEGIN SSH` → `gpg.ssh.program`, braucht `gpg.ssh.allowedSignersFile`), nicht `gpg.format`; `-c log.showSignature=false` vor dem Unterbefehl schaltet beide ab | git-Aufrufe beginnen in `GitStart.Im`; Proben mit Marker-Skript brauchen je Signaturart einen passenden Kopf und eine Kontrolle über `git log` |
| 2026-11-24 | I0019 Beenden mit Ergebnis | Geordnetes Ende ohne stdout-Rest: Endpunkt schließt den Speicher ab, antwortet, `Response.CompleteAsync()`, erst dann `StopApplication()`; das Ergebnis schreibt `Main` nach `WaitForShutdownAsync` roh als UTF-8 ohne BOM — 500 Anmerkungen bis Prozessende ≈ 30 ms. Der Anfrageschutz hängt am Endpunkt (Pfadvarianten `/API/Anmerkungen`, `/api/anmerkungen/` erreichen denselben Endpunkt); in JS greift ein Standardwert auch bei ausdrücklich übergebenem `undefined` | Schutz als Hülle um den `RequestDelegate`, nicht als Pfad-Middleware; „Kopfzeile weglassen“ in der Testsprache als `null` |
