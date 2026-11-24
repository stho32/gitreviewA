# Gelerntes — projektgebunden

Lehren, die an dieses Projekt gebunden sind und mehrere Rollen betreffen. Lehren einer einzelnen Rolle stehen in `AI-Team/<rolle>.md`; allgemeine Lehren schlägt der Director für die Factory vor.

- **2026-11-24 (#1, Security-Review)**: Das geprüfte Repo ist fremd. Seine `.git/config` und `.gitattributes` können beim Lesen Programme starten: `log.showSignature` + `gpg.program`/`gpg.ssh.program` (bei `git log`/`show`), und für Diffs zusätzlich `diff.external`, `diff.<treiber>.textconv`/`command` über `.gitattributes`. Jeder git-Aufruf von gitreviewA setzt deshalb `-c log.showSignature=false` und bei Diffs `--no-ext-diff --no-textconv`; jede Karte mit neuem git-Aufruf bekommt einen Test mit Marker-Skript im Wegwerf-Repo. Gilt für entwickler, planer, code-reviewer, security-reviewer.

- **2026-11-24 (#21, Entwicklertest)**: gitreviewA wird typischerweise von einer KI aus einem nicht-interaktiven Skript im Hintergrund gestartet (`… & pid=$!`). Dort erbt der Prozess **ignoriertes SIGINT** (`SigIgn` in `/proc/<pid>/status`). Tests, die über Node/Python starten, sehen das nicht — für Signal- und Startverhalten mindestens einen Test mit Start über `bash -c '… &'` fahren. Gilt für entwickler, entwicklertester, code-reviewer.

- **2026-11-24 (#5, Security-Review)**: Das fremde Repo kann die Anzeige auch ohne Programmstart verfälschen: `refs/replace` (Ersatzcommit unter echtem Hash) → `GIT_NO_REPLACE_OBJECTS=1` in `GitStart`; `.gitmodules`/`diff.ignoreSubmodules` blendet Submodul-Änderungen aus → `--ignore-submodules=none` bei jedem diff/show. Pfade und Namen aus dem Repo zeigen Bidi-/Formatzeichen sichtbar markiert (`⟨U+202E⟩`). Gilt für entwickler, planer, code-reviewer, security-reviewer.

- **2026-11-24 (#2, Reviews)**: git löst Namen vor Hash-Präfixen auf — ein Tag `97f3` im fremden Repo lenkt den Präfix `97f3` auf einen anderen Commit; jede Hexfolge aus Aufruf oder stdin wird nach dem Lesen gegen den gelieferten `%H` geprüft. Wegwerf-Repos in Tests staffeln Commit-Zeiten — für Reihenfolge-Kriterien zusätzlich einen Test mit gleichen Zeiten fahren (KI-Commits entstehen in derselben Sekunde). Gilt für entwickler, code-reviewer, security-reviewer.

- **2026-11-24 (#6, Code-Review)**: gitreviewA nimmt den Aufrufordner als git-Arbeitsordner — Pathspec-Aufrufe hängen damit vom Startordner ab. Jeder neue git-Aufruf mit Pfad bekommt einen Test mit Start aus einem Unterordner des Repos. Gilt für entwickler, code-reviewer, entwicklertester.
