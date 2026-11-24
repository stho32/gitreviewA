# Quellen

Was die Rollen dieses Projekts lesen dürfen, wo es liegt und wie sie es nutzen. Angelegt bei der Bestückung (Factory: `rollen/director/bestueckung.md`), fortgeschrieben nur vom Director. Eine Rolle liest die Zeilen, in denen sie oder `alle` steht. Prüfen: `python3 werkzeuge/quellen.py pruefen <projekt>/AI-Team` (aus der Factory).

## Verzeichnis

| ID | Was | Ort | Nutzung | Ins Repo | Für Rollen |
|---|---|---|---|---|---|
| Q01 | Vision gitreviewA (Zielbild, Leitplanken, Lastprofil, Logging) | repo:Anforderungen/R00000-vision.md | lesen | ja | alle |
| Q02 | WBS gitreviewA bis Interaction | repo:Dokumentation/Planung/gitreviewa.md | lesen | ja | alle |
| Q03 | git-Dokumentation (`git diff`, `git show`, `git rev-list`, Diff-Formate) | url:https://git-scm.com/docs | lesen | nein — extern | planer, entwickler, code-reviewer, security-reviewer |
| Q04 | VS Code URL-Schema (`vscode://file/<pfad>:<zeile>`) | url:https://code.visualstudio.com/docs/editor/command-line#_opening-vs-code-with-urls | lesen | nein — extern | planer, entwickler, entwicklertester |
| Q05 | kanbanD — verwandtes Werkzeug des Betreibers (Kommandozeile startet lokale Weboberfläche, freier Port, Browser öffnen, eingebettete Oberfläche, Tastaturbedienung); Code darf übernommen und nach C# übertragen werden (Betreiber 2026-11-24) | extern:/home/shoff/Projekte/kanbanD | lesen | nein — eigenes Repo, nur übertragen, was gebraucht wird | planer, entwickler, code-reviewer |

## Offen

- (nichts)
