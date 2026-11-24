# Gelerntes — projektgebunden

Lehren, die an dieses Projekt gebunden sind und mehrere Rollen betreffen. Lehren einer einzelnen Rolle stehen in `AI-Team/<rolle>.md`; allgemeine Lehren schlägt der Director für die Factory vor.

- **2026-11-24 (#1, Security-Review)**: Das geprüfte Repo ist fremd. Seine `.git/config` und `.gitattributes` können beim Lesen Programme starten: `log.showSignature` + `gpg.program`/`gpg.ssh.program` (bei `git log`/`show`), und für Diffs zusätzlich `diff.external`, `diff.<treiber>.textconv`/`command` über `.gitattributes`. Jeder git-Aufruf von gitreviewA setzt deshalb `-c log.showSignature=false` und bei Diffs `--no-ext-diff --no-textconv`; jede Karte mit neuem git-Aufruf bekommt einen Test mit Marker-Skript im Wegwerf-Repo. Gilt für entwickler, planer, code-reviewer, security-reviewer.
