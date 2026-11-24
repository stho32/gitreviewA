# Gelerntes

Was ein Lauf an Verständnis gebracht hat. Eine Zeile je Lauf; „nichts Neues" ist ein gültiger Eintrag.

| Datum | Arbeitspaket | Erkenntnis | Folge |
|---|---|---|---|
| 2026-11-24 | I0001 Mit Commit-Hashes aufrufen | `git commit` startet `git maintenance run --auto --detach`; der losgelöste Prozess erbt die Ausgabe-Pipes und hält `ReadToEnd` offen — und ohne gestaffelte Commit-Zeiten kann kein Test `--no-walk=unsorted` von `--no-walk` unterscheiden | Wegwerf-Repos mit `maintenance.auto=false`, `gc.auto=0` und Zeit je Commit; git-Ausgabe: stdout synchron, stderr per Ereignis |
