using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using GitReviewA.Aufruf;
using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Haken;
using GitReviewA.Zusammen;

namespace GitReviewA.Git;

internal static class GitLeser
{
    private const int MergeBaseOhneGemeinsamenVorfahren = 1;

    public static Commitzeilen Lesen(CommitHashes hashes, string arbeitsordner)
    {
        var start = GitLogStart(hashes, arbeitsordner);
        var ausgabe = Ausfuehren(start, "git log");
        return GitLogAusgabe.Zerlegen(ausgabe);
    }

    /// <summary>Je Commit der Auswahl sein erster Eltern-Hash, in Auswahlreihenfolge; leer bei einer Wurzel.</summary>
    public static Elternfolge ElternfolgeLesen(CommitHashes auswahl, string arbeitsordner)
    {
        var start = GitElternfolgeStart(auswahl, arbeitsordner);
        var ausgabe = Ausfuehren(start, $"git log (Elternfolge von {auswahl.Anzahl} Commits)");
        return ElternfolgeAus(ausgabe, auswahl);
    }

    /// <summary>
    /// Die Netto-Änderungen der lückenlosen Kette in einem Aufruf: jede Datei einmal gegen den Elternstand des ältesten Commits.
    /// Eine leere Basis ist der leere Baum (ein Wurzelcommit). Umbenennungen erkennt `-M`, Submodule bleiben sichtbar.
    /// </summary>
    public static Dateiaenderungen NettoDateienLesen(string basis, string spitze, string arbeitsordner)
    {
        var start = GitDiffNettoStart(basis, spitze, arbeitsordner);
        var ausgabe = AusfuehrenAlsBytes(start, $"git diff (Netto {Kurz(basis)}..{Kurz(spitze)})");
        return DateiaenderungenParser.Parse(ausgabe);
    }

    /// <summary>Merge-Commits gegen den ersten Elternteil (Entscheidung des PO, gilt auch für den Diff einer Datei).</summary>
    public static Dateiaenderungen DateienLesen(string hash, string arbeitsordner)
    {
        var start = GitShowDateienStart(hash, arbeitsordner);
        var ausgabe = AusfuehrenAlsBytes(start, $"git show {hash}");
        return DateiaenderungenParser.Parse(ausgabe);
    }

    /// <summary>Alle Dateien der Auswahl mit einem Aufruf, auf derselben Basis wie <see cref="DateienLesen"/>.</summary>
    public static Dateiuebersicht UebersichtLesen(CommitHashes auswahl, string arbeitsordner)
    {
        var start = GitLogUebersichtStart(auswahl, arbeitsordner);
        var anzahl = auswahl.Anzahl.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var ausgabe = AusfuehrenAlsBytes(start, $"git log (Übersicht von {anzahl} Commits)");
        return UebersichtParser.Parse(ausgabe, auswahl);
    }

    /// <summary>
    /// Pfade der Dateiliste sind wurzelrelativ; jeder weitere git-Aufruf läuft deshalb in der Wurzel des Arbeitsbaums.
    /// Scheitert die Repoprüfung, wirft der Git-Leser einen <see cref="GitFehler"/>; die Zuordnung zum Aufrufgrund
    /// macht die Aufruf-Schicht (<see cref="GitReviewA.Aufruf.Reposituation"/>), nicht das Git-Layer.
    /// </summary>
    public static string WurzelLesen(string startordner)
    {
        var start = GitStart.Im(startordner);
        start.ArgumentList.Add("rev-parse");
        start.ArgumentList.Add("--show-toplevel");
        return Ausfuehren(start, "git rev-parse --show-toplevel").TrimEnd('\n');
    }

    /// <summary>Ohne Arbeitsbaum ist es ein nacktes Repository; der Aufrufer entscheidet, was ein scheiternder rev-parse bedeutet.</summary>
    public static bool IstNacktesRepository(string startordner)
    {
        var start = GitStart.Im(startordner);
        start.ArgumentList.Add("rev-parse");
        start.ArgumentList.Add("--is-bare-repository");
        var ausgabe = Ausfuehren(start, "git rev-parse --is-bare-repository").TrimEnd('\n');
        return string.Equals(ausgabe, "true", StringComparison.Ordinal);
    }

    /// <summary>
    /// Der volle Hash, zu dem git die Eingabe auflöst (`git rev-parse --verify --quiet`, ohne zu peelen): <c>null</c>, wenn kein
    /// Objekt passt oder der Hexpräfix mehrdeutig ist. Ein annotiertes Tag-Objekt wird **nicht** still zum Commit (der Aufrufer prüft
    /// die Objektart über <see cref="ObjectartLesen"/>); ein Tag- oder Zweigname, der wie das Präfix heißt, löst auf sein Ziel auf,
    /// und die Präfixprüfung des Aufrufers fängt die stille Umlenkung ab (Lehre #2).
    /// </summary>
    public static string? RevisionAufloesen(string eingabe, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("rev-parse");
        start.ArgumentList.Add("--verify");
        start.ArgumentList.Add("--quiet");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(eingabe);
        var lauf = WarteAufEndeMitGrenze(Starte(start), $"git rev-parse --verify {eingabe}", Ausgabegrenze.Standard);
        if (lauf.ExitCode != 0)
        {
            return null;
        }
        var ausgabe = lauf.Ausgabe.Trim();
        return ausgabe.Length == 0 ? null : ausgabe;
    }

    /// <summary>Alle Objekt-Hashes, deren Name mit dem Hexpräfix beginnt (`git rev-parse --disambiguate`); leer, wenn keiner passt.</summary>
    public static CommitHashes KandidatenAufloesen(string praefix, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("rev-parse");
        start.ArgumentList.Add($"--disambiguate={praefix}");
        var lauf = WarteAufEndeMitGrenze(Starte(start), "git rev-parse --disambiguate", Ausgabegrenze.Standard);
        if (lauf.ExitCode != 0)
        {
            return new CommitHashes([]);
        }
        return new CommitHashes(lauf.Ausgabe.Split('\n', StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>Die Objektart (commit, tree, blob, tag) eines Objekts; <c>null</c>, wenn git sie nicht nennt.</summary>
    public static string? ObjectartLesen(string hash, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("cat-file");
        start.ArgumentList.Add("-t");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(hash);
        var lauf = WarteAufEndeMitGrenze(Starte(start), $"git cat-file -t {Kurz(hash)}", Ausgabegrenze.Standard);
        if (lauf.ExitCode != 0)
        {
            return null;
        }
        var art = lauf.Ausgabe.Trim();
        return art.Length == 0 ? null : art;
    }

    /// <summary>
    /// Der Eintrag eines Pfads im Commit (`git ls-tree -l -z --full-tree` über <see cref="GitStart"/>, Pfad wörtlich über
    /// `--literal-pathspecs`): genau ein Eintrag, dessen Name <b>byte-gleich</b> der gesuchte Pfad ist. git normalisiert im Pathspec
    /// `./`, `//` und `..` — ein solcher Pfad gilt hier **nicht** als Treffer (R00046, „wörtlich“). Ein abschließender Schrägstrich
    /// wird vor dem Aufruf abgeschnitten (sonst listete `ls-tree` den Verzeichnisinhalt) und zählt danach nur für einen Baum.
    /// Die Grenze gilt auch hier: über der Grenze kein Eintrag, sondern <see cref="GitZuGross"/>.
    /// </summary>
    public static CommitEintrag? EintragLesen(string vollerHash, string pfad, string arbeitsordner, Ausgabegrenze grenze)
    {
        var suchpfad = pfad.TrimEnd('/');
        if (suchpfad.Length == 0)
        {
            return null;
        }
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("--literal-pathspecs");
        start.ArgumentList.Add("ls-tree");
        start.ArgumentList.Add("-l");
        start.ArgumentList.Add("-z");
        start.ArgumentList.Add("--full-tree");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(vollerHash);
        start.ArgumentList.Add("--");
        start.ArgumentList.Add(suchpfad);
        var lauf = WarteAufEndeMitGrenze(Starte(start), $"git ls-tree -l {Kurz(vollerHash)} -- {UnsichtbareZeichen.AlsMarken(pfad)}", grenze);
        if (lauf.ExitCode != 0)
        {
            // Ein Pfad wie `/x` oder `../x` läuft aus dem Baum (`outside repository`) — kein Objekt, kein Eintrag.
            return null;
        }
        var eintrag = ZerlegeEintrag(lauf.Ausgabe);
        if (eintrag is null || !string.Equals(eintrag.Pfad, suchpfad, StringComparison.Ordinal))
        {
            return null;
        }
        var schraegstrichAufNichtBaum = pfad.EndsWith('/') && eintrag.Art != Baumart.Verzeichnis;
        return schraegstrichAufNichtBaum ? null : eintrag;
    }

    /// <summary>Genau ein NUL-abgeschlossener Eintrag aus `ls-tree -l -z`; mehr oder weniger ist kein Treffer.</summary>
    private static CommitEintrag? ZerlegeEintrag(string ausgabe)
    {
        var eintraege = ausgabe.Split('\0', StringSplitOptions.RemoveEmptyEntries);
        if (eintraege.Length != 1)
        {
            return null;
        }
        var zeile = eintraege[0];
        var tab = zeile.IndexOf('\t', StringComparison.Ordinal);
        if (tab < 0)
        {
            return null;
        }
        var felder = zeile[..tab].Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var hatVierFelder = felder.Length == 4;
        var art = hatVierFelder ? ArtFuerModus(felder[0]) : null;
        if (art is null)
        {
            return null;
        }
        var groesse = long.TryParse(felder[3], System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var wert) ? wert : 0;
        return new CommitEintrag(zeile[(tab + 1)..], art.Value, groesse);
    }

    private static Baumart? ArtFuerModus(string modus)
    {
        return modus switch
        {
            "040000" => Baumart.Verzeichnis,
            "120000" => Baumart.SymbolischerLink,
            "160000" => Baumart.Submodul,
            "100755" => Baumart.AusfuehrbareDatei,
            _ when modus.StartsWith("100", StringComparison.Ordinal) => Baumart.Datei,
            _ => null,
        };
    }

    /// <summary>Welche der genannten Hashes sich nicht zu einem Commit auflösen lassen — für die Meldung, nicht für den Abbruch.</summary>
    public static CommitHashes NichtAufloesbareHashes(CommitHashes hashes, string arbeitsordner)
    {
        var nichtAufloesbar = new List<string>();
        foreach (var hash in hashes)
        {
            if (!LoestSichAuf(hash, arbeitsordner))
            {
                nichtAufloesbar.Add(hash);
            }
        }
        return new CommitHashes(nichtAufloesbar);
    }

    private static bool LoestSichAuf(string hash, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("rev-parse");
        start.ArgumentList.Add("--quiet");
        start.ArgumentList.Add("--verify");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add($"{hash}^{{commit}}");
        var lauf = WarteAufEnde(Starte(start));
        return lauf.ExitCode == 0;
    }

    /// <summary>
    /// Pfade gehen wörtlich an git (kein Pathspec-Muster); bei einer Umbenennung beide Pfade, sonst zeigt git die Datei als neu.
    /// Kontext, Leerzeilen, Farben, Submodul-Darstellung und Pfadbezug setzt der Aufruf selbst — die Konfiguration des fremden Repos
    /// verschiebt sonst die Zeilennummern oder leert den Patch (`diff.submodule=log`, `diff.relative`).
    /// <paramref name="leerraum"/> setzt `-w` auf denselben Aufruf (R00026).
    /// </summary>
    public static string DiffLesen(string hash, Dateiaenderung datei, Diffumfang umfang, string arbeitsordner, Leerraum leerraum = Leerraum.Beachten)
    {
        return DiffLesen(hash, datei, umfang, arbeitsordner, Ausgabegrenze.Standard, leerraum);
    }

    /// <summary>Wie <see cref="DiffLesen(string, Dateiaenderung, Diffumfang, string, Leerraum)"/>, aber über der <paramref name="grenze"/> Bytes kein Rumpf, sondern <see cref="GitZuGross"/>.</summary>
    public static string DiffLesen(string hash, Dateiaenderung datei, Diffumfang umfang, string arbeitsordner, Ausgabegrenze grenze, Leerraum leerraum = Leerraum.Beachten)
    {
        var traegtRohbytes = TraegtRohbytes(datei);
        if (traegtRohbytes)
        {
            var mitRohbytes = GitLogStdinDiffStart(umfang, arbeitsordner, alsText: false, leerraum);
            return AusfuehrenMitEingabe(mitRohbytes, DiffEingabe(hash, datei), $"git log --stdin {hash} -- {datei.Pfad}", grenze);
        }
        var start = GitShowDiffStart(hash, datei, umfang, arbeitsordner, alsText: false, leerraum);
        return Ausfuehren(start, $"git show {hash} -- {datei.Pfad}", grenze);
    }

    /// <summary>Wie <see cref="DiffAlsTextLesen(string, Dateiaenderung, Diffumfang, string)"/>, aber mit `--text`: zeigt auch eine als binär eingestufte Datei mit allen Bytes.</summary>
    public static string DiffAlsTextLesen(string hash, Dateiaenderung datei, Diffumfang umfang, string arbeitsordner, Leerraum leerraum = Leerraum.Beachten)
    {
        return DiffAlsTextLesen(hash, datei, umfang, arbeitsordner, Ausgabegrenze.Standard, leerraum);
    }

    /// <summary>Wie <see cref="DiffAlsTextLesen(string, Dateiaenderung, Diffumfang, string, Leerraum)"/>, aber über der <paramref name="grenze"/> Bytes kein Rumpf, sondern <see cref="GitZuGross"/>.</summary>
    public static string DiffAlsTextLesen(string hash, Dateiaenderung datei, Diffumfang umfang, string arbeitsordner, Ausgabegrenze grenze, Leerraum leerraum = Leerraum.Beachten)
    {
        var traegtRohbytes = TraegtRohbytes(datei);
        if (traegtRohbytes)
        {
            var mitRohbytes = GitLogStdinDiffStart(umfang, arbeitsordner, alsText: true, leerraum);
            return AusfuehrenMitEingabe(mitRohbytes, DiffEingabe(hash, datei), $"git log --stdin --text {hash} -- {datei.Pfad}", grenze);
        }
        var start = GitShowDiffStart(hash, datei, umfang, arbeitsordner, alsText: true, leerraum);
        return Ausfuehren(start, $"git show --text {hash} -- {datei.Pfad}", grenze);
    }

    /// <summary>
    /// Der Netto-Diff einer Datei über die lückenlose Kette: ein Patch gegen den Elternstand des ältesten Commits, unabhängig von der
    /// Commit-Reihenfolge. Revisionen und Pfade kommen über stdin (<c>git diff --stdin</c>, wie <c>git log --stdin</c> in #28): .NET kann
    /// ein Byte außerhalb von UTF-8 nicht als Argument übergeben, und ein Pfad aus der Anfrage darf nie Argument werden.
    /// <paramref name="leerraum"/> setzt `-w` auf denselben Aufruf (R00026).
    /// Über der <paramref name="grenze"/> Bytes kein Rumpf, sondern <see cref="GitZuGross"/> (wie <see cref="DiffLesen(string, Dateiaenderung, Diffumfang, string, Ausgabegrenze)"/>).
    /// </summary>
    public static string NettoDiffLesen(string basis, string spitze, Dateiaenderung datei, Diffumfang umfang, string arbeitsordner, Ausgabegrenze grenze, Leerraum leerraum)
    {
        var start = GitDiffStdinStart(umfang, arbeitsordner, leerraum);
        return AusfuehrenMitEingabe(start, NettoEingabe(basis, spitze, datei), $"git diff --stdin {Kurz(basis)}..{Kurz(spitze)} -- {datei.Pfad}", grenze);
    }

    /// <summary>Zeilen für `git diff --stdin`: Basis (leer = leerer Baum), Spitze, `--`, der Pfad und bei einer Umbenennung der alte Pfad, je als Bytes.</summary>
    private static byte[] NettoEingabe(string basis, string spitze, Dateiaenderung datei)
    {
        var eingabe = new List<byte>();
        eingabe.AddRange(Encoding.ASCII.GetBytes($"{BasisOderLeerbaum(basis)}\n{spitze}\n--\n"));
        eingabe.AddRange(NameAlsBytes(datei.Pfad, datei.Rohpfad));
        eingabe.Add((byte)'\n');
        var alterPfad = datei.AlterPfad;
        if (alterPfad is not null)
        {
            eingabe.AddRange(NameAlsBytes(alterPfad, datei.RohAlterPfad));
            eingabe.Add((byte)'\n');
        }
        return eingabe.ToArray();
    }

    /// <summary>
    /// Der Wert des `diff`-Attributs (`unspecified`, `set`, `unset` oder ein Treibername) unter denselben Schutzoptionen wie der Diff:
    /// nur `.git/info/attributes` wirkt noch. Mit `-z` übersteht jeder Pfad die Ausgabe: Pfad NUL `diff` NUL Wert NUL.
    /// </summary>
    public static string DiffAttributLesen(Dateiaenderung datei, string arbeitsordner)
    {
        var pfad = datei.Pfad;
        var aufruf = $"git check-attr diff -- {pfad}";
        var felder = AttributAusgabe(datei, arbeitsordner, aufruf).Split('\0');
        var istEinEintrag = felder.Length == 4 && felder[0] == pfad && felder[1] == "diff" && felder[3].Length == 0;
        if (!istEinEintrag)
        {
            throw new GitFehler($"{aufruf} lieferte keinen einzelnen Eintrag");
        }
        return felder[2];
    }

    /// <summary>Ein Name mit Rohbytes geht über stdin an git (NUL-getrennt mit `-z`); die Ausgabe nennt ihn mit Marke wie die Dateiliste.</summary>
    private static string AttributAusgabe(Dateiaenderung datei, string arbeitsordner, string aufruf)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("check-attr");
        start.ArgumentList.Add("-z");
        var rohpfad = datei.Rohpfad;
        if (rohpfad is not null)
        {
            start.ArgumentList.Add("--stdin");
            start.ArgumentList.Add("diff");
            var eingabe = new List<byte>(rohpfad.Bytes.ToArray()) { 0 };
            return AusfuehrenMitEingabe(start, eingabe.ToArray(), aufruf);
        }
        start.ArgumentList.Add("diff");
        start.ArgumentList.Add("--");
        start.ArgumentList.Add(datei.Pfad);
        return Ausfuehren(start, aufruf);
    }


    /// <summary>
    /// Ob der Arbeitsbaum für diesen Pfad vom Commit abweicht: `git diff --quiet` gegen den Commit und den Pfad, mit den Schutzoptionen
    /// der übrigen Lesepfade. Exit 0 = unverändert, 1 = geändert, alles andere ein <see cref="GitFehler"/>. Ein Name mit Rohbytes oder
    /// LF/CR geht nie an git — er wäre dort ein anderer Pfad (Gelerntes #28).
    /// </summary>
    public static bool ArbeitsbaumGeaendertLesen(string hash, Dateiaenderung datei, string arbeitsordner, Ausgabegrenze grenze)
    {
        var nameGehtNichtAnGit = datei.Rohpfad is not null || datei.RohAlterPfad is not null || Namenspruefung.TraegtZeilenende(datei);
        if (nameGehtNichtAnGit)
        {
            throw new GitFehler("Arbeitsbaumprüfung abgewiesen: Name mit ungültigem Byte oder Zeilenende geht nicht an git");
        }
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("--literal-pathspecs");
        start.ArgumentList.Add("diff");
        start.ArgumentList.Add("--quiet");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        start.ArgumentList.Add("--no-relative");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(hash);
        start.ArgumentList.Add("--");
        start.ArgumentList.Add(datei.Pfad);
        var aufruf = $"git diff --quiet {hash} -- {UnsichtbareZeichen.AlsMarken(datei.Pfad)}";
        var lauf = WarteAufEndeMitGrenze(Starte(start), aufruf, grenze);
        var istUnveraendert = lauf.ExitCode == 0;
        if (istUnveraendert)
        {
            return false;
        }
        var istGeaendert = lauf.ExitCode == 1;
        if (istGeaendert)
        {
            return true;
        }
        throw new GitFehler($"{aufruf} endete mit {lauf.ExitCode}: {lauf.Fehlertext}");
    }

    /// <summary>
    /// Ein Bereich ergibt dieselbe Liste wie <c>git rev-list</c>. Mehrere Bereiche ergeben die Vereinigung der einzelnen Bereiche,
    /// neuester zuerst und Kind vor Eltern wie <c>git rev-list --date-order</c>: bei git selbst würde der Anfang eines Bereichs
    /// auch die anderen Bereiche beschneiden. Die Reihenfolge hängt nur an der Vereinigung, nicht an der Reihenfolge der Bereiche,
    /// auch bei gleichen Commit-Zeiten. Je Bereich wird höchstens ein Commit mehr als die Grenze gelesen, damit eine zu große Auswahl erkennbar ist.
    /// </summary>
    public static Commitzeilen LeseBereiche(Bereiche bereiche, string arbeitsordner)
    {
        var istEinBereich = bereiche.Anzahl == 1;
        if (istEinBereich)
        {
            return LeseBereich(bereiche[0], arbeitsordner);
        }
        var vereinigteHashes = VereinigeBereiche(bereiche, arbeitsordner);
        var gemeinsameVorfahren = LeseGemeinsameVorfahrenDerAnfaenge(bereiche, arbeitsordner);
        return LeseNeuesteZuerst(vereinigteHashes, gemeinsameVorfahren, arbeitsordner);
    }

    private static Commitzeilen LeseBereich(string bereich, string arbeitsordner)
    {
        var start = GitLogBereichStart(bereich, arbeitsordner);
        var ausgabe = Ausfuehren(start, $"git log {bereich}");
        return GitLogAusgabe.Zerlegen(ausgabe);
    }

    private static CommitHashes VereinigeBereiche(Bereiche bereiche, string arbeitsordner)
    {
        var vereinigt = new List<string>();
        var bekannt = new HashSet<string>(StringComparer.Ordinal);
        foreach (var bereich in bereiche)
        {
            foreach (var zeile in LeseBereich(bereich, arbeitsordner))
            {
                var istNeu = bekannt.Add(zeile.Hash);
                if (istNeu)
                {
                    vereinigt.Add(zeile.Hash);
                }
            }
        }
        return new CommitHashes(vereinigt.Take(Auswahlgrenze.Hoechstzahl + 1));
    }

    /// <summary>
    /// Kein Commit der Vereinigung ist Vorfahr eines gemeinsamen Vorfahren aller Anfänge — dort darf der Verlauf enden,
    /// damit <c>--date-order</c> nicht die ganze Geschichte durchläuft. Ohne gemeinsamen Vorfahren bleibt die Liste leer.
    /// </summary>
    private static CommitHashes LeseGemeinsameVorfahrenDerAnfaenge(Bereiche bereiche, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("merge-base");
        start.ArgumentList.Add("--octopus");
        start.ArgumentList.Add("--all");
        start.ArgumentList.Add("--end-of-options");
        foreach (var bereich in bereiche)
        {
            start.ArgumentList.Add(AnfangDes(bereich));
        }
        var lauf = WarteAufEnde(Starte(start));
        var keinGemeinsamerVorfahr = lauf.ExitCode == MergeBaseOhneGemeinsamenVorfahren && lauf.Ausgabe.Length == 0;
        if (keinGemeinsamerVorfahr)
        {
            return new CommitHashes([]);
        }
        PruefeErfolg(lauf, "git merge-base");
        return new CommitHashes(lauf.Ausgabe.Split('\n', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string AnfangDes(string bereich)
    {
        var anfang = bereich[..bereich.IndexOf(Bereichspruefer.Bereichstrenner, StringComparison.Ordinal)];
        var anfangFehlt = anfang.Length == 0;
        if (anfangFehlt)
        {
            return "HEAD";
        }
        return anfang;
    }

    private static Commitzeilen LeseNeuesteZuerst(CommitHashes hashes, CommitHashes gemeinsameVorfahren, string arbeitsordner)
    {
        var start = GitLogMitFormat(arbeitsordner);
        start.ArgumentList.Add("--date-order");
        start.ArgumentList.Add("--end-of-options");
        var hashesUnabhaengigVonDerBereichsreihenfolge = new SortedSet<string>(StringComparer.Ordinal);
        foreach (var hash in hashes)
        {
            hashesUnabhaengigVonDerBereichsreihenfolge.Add(hash);
        }
        foreach (var hash in hashesUnabhaengigVonDerBereichsreihenfolge)
        {
            start.ArgumentList.Add(hash);
        }
        foreach (var vorfahr in gemeinsameVorfahren)
        {
            start.ArgumentList.Add($"^{vorfahr}");
        }
        start.ArgumentList.Add("--");
        var verlauf = GitLogAusgabe.Zerlegen(Ausfuehren(start, "git log"));
        return NurDieAusDerVereinigung(verlauf, hashesUnabhaengigVonDerBereichsreihenfolge);
    }

    private static Commitzeilen NurDieAusDerVereinigung(Commitzeilen verlauf, SortedSet<string> vereinigung)
    {
        var auswahl = new List<Commitzeile>();
        foreach (var zeile in verlauf)
        {
            var gehoertZurVereinigung = vereinigung.Contains(zeile.Hash);
            if (gehoertZurVereinigung)
            {
                auswahl.Add(zeile);
            }
        }
        return new Commitzeilen(auswahl);
    }

    private static ProcessStartInfo GitDiffNettoStart(string basis, string spitze, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("diff");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add("--raw");
        start.ArgumentList.Add("--numstat");
        start.ArgumentList.Add("--no-abbrev");
        start.ArgumentList.Add("-z");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(BasisOderLeerbaum(basis));
        start.ArgumentList.Add(spitze);
        return start;
    }

    private static string BasisOderLeerbaum(string basis)
    {
        var istLeer = basis.Length == 0;
        return istLeer ? GitStart.Leerbaum : basis;
    }

    private static string Kurz(string hash)
    {
        var istLeer = hash.Length == 0;
        return istLeer ? "leer" : hash[..7];
    }

    private static ProcessStartInfo GitElternfolgeStart(CommitHashes auswahl, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("log");
        start.ArgumentList.Add("--no-walk=unsorted");
        start.ArgumentList.Add("--format=%H%x1f%P");
        start.ArgumentList.Add("--end-of-options");
        foreach (var hash in auswahl)
        {
            start.ArgumentList.Add(hash);
        }
        start.ArgumentList.Add("--");
        return start;
    }

    /// <summary>Eine Zeile je Commit, `<hash>` Feldtrenner `<erster Elternteil>`; weitere Elternteile eines Merges fallen weg.</summary>
    private static Elternfolge ElternfolgeAus(string ausgabe, CommitHashes auswahl)
    {
        var zeilen = ausgabe.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (zeilen.Length != auswahl.Anzahl)
        {
            throw new GitFehler($"unerwartete Ausgabe von git log (Elternfolge: {zeilen.Length} Zeilen für {auswahl.Anzahl} Commits)");
        }
        var folge = new List<Elternzeile>(zeilen.Length);
        for (var stelle = 0; stelle < zeilen.Length; stelle++)
        {
            var felder = zeilen[stelle].Split('\u001f');
            var istZeileDesErwartetenCommits = felder.Length == 2 && felder[0] == auswahl[stelle];
            if (!istZeileDesErwartetenCommits)
            {
                throw new GitFehler($"unerwartete Ausgabe von git log (Elternfolge: Commit {auswahl[stelle][..7]} fehlt an seiner Stelle)");
            }
            folge.Add(new Elternzeile(auswahl[stelle], ErsterElternteil(felder[1])));
        }
        return new Elternfolge(folge);
    }

    private static string ErsterElternteil(string eltern)
    {
        return eltern.Split(' ')[0];
    }

    private static ProcessStartInfo GitLogStart(CommitHashes hashes, string arbeitsordner)
    {
        var start = GitLogMitFormat(arbeitsordner);
        start.ArgumentList.Add("--no-walk=unsorted");
        start.ArgumentList.Add("--end-of-options");
        foreach (var hash in hashes)
        {
            start.ArgumentList.Add(hash);
        }
        return start;
    }

    private static ProcessStartInfo GitLogBereichStart(string bereich, string arbeitsordner)
    {
        var start = GitLogMitFormat(arbeitsordner);
        start.ArgumentList.Add($"--max-count={Auswahlgrenze.Hoechstzahl + 1}");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(bereich);
        start.ArgumentList.Add("--");
        return start;
    }

    private static ProcessStartInfo GitLogMitFormat(string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("log");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--encoding=UTF-8");
        start.ArgumentList.Add("-z");
        start.ArgumentList.Add(GitLogAusgabe.Format);
        return start;
    }

    private static ProcessStartInfo GitShowDateienStart(string hash, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("show");
        start.ArgumentList.Add("--format=");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        HaengeBasisAn(start);
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add("--raw");
        start.ArgumentList.Add("--numstat");
        start.ArgumentList.Add("--no-abbrev");
        start.ArgumentList.Add("-z");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(hash);
        return start;
    }

    private static ProcessStartInfo GitLogUebersichtStart(CommitHashes auswahl, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("log");
        start.ArgumentList.Add("--no-walk=unsorted");
        start.ArgumentList.Add("--format=%x1e%H");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        HaengeBasisAn(start);
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add("--raw");
        start.ArgumentList.Add("--numstat");
        start.ArgumentList.Add("--no-abbrev");
        start.ArgumentList.Add("-z");
        start.ArgumentList.Add("--end-of-options");
        foreach (var hash in auswahl)
        {
            start.ArgumentList.Add(hash);
        }
        start.ArgumentList.Add("--");
        return start;
    }

    private static ProcessStartInfo GitShowDiffStart(string hash, Dateiaenderung datei, Diffumfang umfang, string arbeitsordner, bool alsText, Leerraum leerraum)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("--literal-pathspecs");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("diff.suppressBlankEmpty=false");
        start.ArgumentList.Add("show");
        start.ArgumentList.Add("--format=");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        HaengeBasisAn(start);
        HaengeLeerraumAn(start, leerraum);
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add(KontextFuer(umfang));
        start.ArgumentList.Add("--inter-hunk-context=0");
        start.ArgumentList.Add("--submodule=short");
        start.ArgumentList.Add("--no-relative");
        if (alsText)
        {
            start.ArgumentList.Add("--text");
        }
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(hash);
        start.ArgumentList.Add("--");
        start.ArgumentList.Add(datei.Pfad);
        var alterPfad = datei.AlterPfad;
        if (alterPfad is not null)
        {
            start.ArgumentList.Add(alterPfad);
        }
        return start;
    }

    private static bool TraegtRohbytes(Dateiaenderung datei)
    {
        return datei.Rohpfad is not null || datei.RohAlterPfad is not null;
    }

    /// <summary>
    /// Wie <see cref="GitShowDiffStart"/>, aber Hash und Pfade kommen über stdin (<see cref="DiffEingabe"/>): .NET kann ein Byte außerhalb
    /// von UTF-8 nicht als Argument übergeben. `log.follow` des fremden Repos würde bei einem Pfad einer Umbenennung folgen, die die Dateiliste nicht zeigt.
    /// </summary>
    private static ProcessStartInfo GitLogStdinDiffStart(Diffumfang umfang, string arbeitsordner, bool alsText, Leerraum leerraum)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("--literal-pathspecs");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("diff.suppressBlankEmpty=false");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("log.follow=false");
        start.ArgumentList.Add("log");
        start.ArgumentList.Add("--stdin");
        start.ArgumentList.Add("--no-walk");
        start.ArgumentList.Add("-p");
        start.ArgumentList.Add("--format=");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        HaengeBasisAn(start);
        HaengeLeerraumAn(start, leerraum);
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add(KontextFuer(umfang));
        start.ArgumentList.Add("--inter-hunk-context=0");
        start.ArgumentList.Add("--submodule=short");
        start.ArgumentList.Add("--no-relative");
        if (alsText)
        {
            start.ArgumentList.Add("--text");
        }
        return start;
    }

    /// <summary>
    /// Wie <see cref="GitShowDiffStart"/>, aber Revisionen und Pfade kommen über stdin (<c>git diff --stdin</c>): .NET kann ein Byte
    /// außerhalb von UTF-8 nicht als Argument übergeben, und ein Pfad aus der Anfrage darf nie Argument werden.
    /// </summary>
    private static ProcessStartInfo GitDiffStdinStart(Diffumfang umfang, string arbeitsordner, Leerraum leerraum)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("--literal-pathspecs");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("diff.suppressBlankEmpty=false");
        start.ArgumentList.Add("diff");
        start.ArgumentList.Add("--stdin");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        HaengeLeerraumAn(start, leerraum);
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add(KontextFuer(umfang));
        start.ArgumentList.Add("--inter-hunk-context=0");
        start.ArgumentList.Add("--submodule=short");
        start.ArgumentList.Add("--no-relative");
        return start;
    }

    /// <summary>Zeilen für `git log --stdin`: der volle Hash, `--`, der Pfad und bei einer Umbenennung der alte Pfad, je als Bytes.</summary>
    private static byte[] DiffEingabe(string hash, Dateiaenderung datei)
    {
        var eingabe = new List<byte>();
        eingabe.AddRange(Encoding.ASCII.GetBytes($"{hash}\n--\n"));
        eingabe.AddRange(NameAlsBytes(datei.Pfad, datei.Rohpfad));
        eingabe.Add((byte)'\n');
        var alterPfad = datei.AlterPfad;
        if (alterPfad is not null)
        {
            eingabe.AddRange(NameAlsBytes(alterPfad, datei.RohAlterPfad));
            eingabe.Add((byte)'\n');
        }
        return eingabe.ToArray();
    }

    /// <summary>Ein Name ohne Rohbytes ist gültiges UTF-8 und steht Zeichen für Zeichen im angezeigten Namen.</summary>
    private static byte[] NameAlsBytes(string name, Rohname? rohname)
    {
        if (rohname is null)
        {
            return Encoding.UTF8.GetBytes(name);
        }
        return rohname.Bytes.ToArray();
    }

    /// <summary>
    /// Merges gegen den ersten Elternteil, Wurzelcommits gegen den leeren Baum — ausdrücklich, weil `log.diffMerges` und `log.showRoot`
    /// des fremden Repos sonst den Merge bzw. den Wurzelcommit ohne Dateien zeigen.
    /// </summary>
    private static void HaengeBasisAn(ProcessStartInfo start)
    {
        start.ArgumentList.Add("-m");
        start.ArgumentList.Add("--first-parent");
        start.ArgumentList.Add("--diff-merges=first-parent");
        start.ArgumentList.Add("--root");
    }

    /// <summary>
    /// `-w` (`--ignore-all-space`): reine Leerraum-Änderungen innerhalb einer Zeile verschwinden, die Zeilen stehen als Kontext da;
    /// eine hinzugefügte oder entfernte leere Zeile bleibt sichtbar. Ohne die Stellung vergleicht git unverändert.
    /// </summary>
    private static void HaengeLeerraumAn(ProcessStartInfo start, Leerraum leerraum)
    {
        if (leerraum == Leerraum.Ignorieren)
        {
            start.ArgumentList.Add("--ignore-all-space");
        }
    }

    /// <summary>Die ganze Datei ist ein Abschnitt mit so viel Kontext, wie git zulässt: dieselbe Zeilenrechnung wie für die Änderungen, keine zweite Quelle.</summary>
    private static string KontextFuer(Diffumfang umfang)
    {
        switch (umfang)
        {
            case Diffumfang.Aenderungen:
                return "-U3";
            case Diffumfang.Ganz:
                return $"-U{int.MaxValue}";
            default:
                throw new ArgumentOutOfRangeException(nameof(umfang), umfang, "Unbekannter Diffumfang");
        }
    }

    private static string Ausfuehren(ProcessStartInfo start, string aufruf)
    {
        var lauf = WarteAufEnde(Starte(start));
        PruefeErfolg(lauf, aufruf);
        return lauf.Ausgabe;
    }

    /// <summary>Wie <see cref="Ausfuehren(ProcessStartInfo, string)"/>, aber höchstens <paramref name="grenze"/> Byte; darüber wird der Prozess beendet und <see cref="GitZuGross"/> geworfen.</summary>
    private static string Ausfuehren(ProcessStartInfo start, string aufruf, Ausgabegrenze grenze)
    {
        var lauf = WarteAufEndeMitGrenze(Starte(start), aufruf, grenze);
        PruefeErfolg(lauf, aufruf);
        return lauf.Ausgabe;
    }

    /// <summary>Die Eingabe geht als Bytes an stdin; sie ist kurz (ein Hash und bis zu zwei Namen) und vollständig geschrieben, bevor git ausgibt.</summary>
    private static string AusfuehrenMitEingabe(ProcessStartInfo start, byte[] eingabe, string aufruf)
    {
        start.RedirectStandardInput = true;
        var gestartet = Starte(start);
        using (var stdin = gestartet.StandardInput.BaseStream)
        {
            stdin.Write(eingabe);
        }
        var lauf = WarteAufEnde(gestartet);
        PruefeErfolg(lauf, aufruf);
        return lauf.Ausgabe;
    }

    /// <summary>Wie <see cref="AusfuehrenMitEingabe(ProcessStartInfo, byte[], string)"/>, aber höchstens <paramref name="grenze"/> Byte; darüber wird der Prozess beendet und <see cref="GitZuGross"/> geworfen.</summary>
    private static string AusfuehrenMitEingabe(ProcessStartInfo start, byte[] eingabe, string aufruf, Ausgabegrenze grenze)
    {
        start.RedirectStandardInput = true;
        var gestartet = Starte(start);
        using (var stdin = gestartet.StandardInput.BaseStream)
        {
            stdin.Write(eingabe);
        }
        var lauf = WarteAufEndeMitGrenze(gestartet, aufruf, grenze);
        PruefeErfolg(lauf, aufruf);
        return lauf.Ausgabe;
    }

    /// <summary>Namen in der Ausgabe sind Bytes: erst der Parser entscheidet je Name, ob er gültiges UTF-8 ist.</summary>
    private static byte[] AusfuehrenAlsBytes(ProcessStartInfo start, string aufruf)
    {
        using var prozess = Starte(start);
        var fehler = new StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        using var ausgabe = new MemoryStream();
        prozess.StandardOutput.BaseStream.CopyTo(ausgabe);
        prozess.WaitForExit();
        PruefeErfolg(new GitLauf(prozess.ExitCode, "", fehler.ToString().Trim()), aufruf);
        return ausgabe.ToArray();
    }

    /// <summary>
    /// Die Bytes eines Blobs aus dem fremden Repo: `git cat-file blob <Revision>:<Pfad>` mit Argumentliste. Ein Name mit Rohbytes
    /// geht über den stdin-Weg (`git cat-file --batch`, wie #28) — .NET kann ein Byte außerhalb von UTF-8 nicht als Argument
    /// übergeben, und ein solcher Name darf nie Argument werden. Gelesen wird gegen die <paramref name="grenze"/>: hatte git mehr,
    /// sind die Bytes der Anfang bis zur Grenze und <see cref="Blobinhalt.UeberschritteneGrenze"/> ist gesetzt — der Aufrufer
    /// entscheidet, was das bedeutet. Ein fehlender Blob ist ein <see cref="GitFehler"/>. Ein Name mit Zeilenende geht nicht über
    /// stdin (git trennt an LF und schnitte CR ab) und endet als <see cref="GitFehler"/>.
    /// </summary>
    public static Blobinhalt BlobLesen(string revision, string pfad, Rohname? rohpfad, string arbeitsordner, Ausgabegrenze grenze)
    {
        var gehtUeberStdin = rohpfad is not null;
        if (gehtUeberStdin)
        {
            var nameTraegtZeilenende = rohpfad!.EnthaeltZeilenende;
            if (nameTraegtZeilenende)
            {
                throw new GitFehler("Blob abgewiesen: Name mit Zeilenende geht nicht über stdin an git");
            }
            var aufruf = $"git cat-file --batch {revision}:<Name>";
            var start = GitCatFileBatchStart(arbeitsordner);
            var ausgabe = AusfuehrenMitEingabeBytes(start, BatchEingabe(revision, rohpfad), aufruf, grenze);
            return BlobAusBatch(ausgabe.Bytes, aufruf, ausgabe.UeberschritteneGrenze);
        }
        var blobStart = GitCatFileBlobStart(revision, pfad, arbeitsordner);
        return AusfuehrenBytes(blobStart, $"git cat-file blob {revision}:{UnsichtbareZeichen.AlsMarken(pfad)}", grenze);
    }

    private static ProcessStartInfo GitCatFileBlobStart(string revision, string pfad, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("cat-file");
        start.ArgumentList.Add("blob");
        start.ArgumentList.Add($"{revision}:{pfad}");
        return start;
    }

    private static ProcessStartInfo GitCatFileBatchStart(string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("cat-file");
        start.ArgumentList.Add("--batch");
        return start;
    }

    /// <summary>Die Zeile für `git cat-file --batch`: `<Revision>:` und der Name als Rohbytes, abgeschlossen mit LF.</summary>
    private static byte[] BatchEingabe(string revision, Rohname rohpfad)
    {
        var eingabe = new List<byte>();
        eingabe.AddRange(Encoding.ASCII.GetBytes($"{revision}:"));
        eingabe.AddRange(rohpfad.Bytes.ToArray());
        eingabe.Add((byte)'\n');
        return eingabe.ToArray();
    }

    /// <summary>
    /// Die Ausgabe von `git cat-file --batch` (`<oid> blob <Größe>\n<Inhalt>\n`) auf den Inhalt verkürzt. Ein fehlender oder
    /// kein Blob (etwa ein Baum) ist ein <see cref="GitFehler"/> — nie ein fremder oder gekürzter Inhalt; ist der Inhalt wegen der
    /// Ausgabegrenze abgeschnitten, ist der gelesene Anfang samt Grenze das Ergebnis.
    /// </summary>
    private static Blobinhalt BlobAusBatch(byte[] ausgabe, string aufruf, Ausgabegrenze? ueberschritteneGrenze)
    {
        var zeilenende = Array.IndexOf(ausgabe, (byte)'\n');
        if (zeilenende < 0)
        {
            throw new GitFehler($"{aufruf} lieferte keine Kopfzeile");
        }
        var kopf = Encoding.ASCII.GetString(ausgabe, 0, zeilenende);
        var felder = kopf.Split(' ');
        var hatBlobzeile = felder.Length == 3 && felder[1] == "blob";
        var groesse = -1L;
        var istBlobzeile = hatBlobzeile && long.TryParse(felder[2], System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out groesse);
        if (!istBlobzeile || groesse < 0)
        {
            throw new GitFehler($"{aufruf} lieferte keinen Blob");
        }
        var inhaltAnfang = zeilenende + 1;
        var inhaltEnde = inhaltAnfang + groesse;
        if (ausgabe.Length < inhaltEnde)
        {
            var istAnfangBisZurGrenze = ueberschritteneGrenze is not null;
            if (!istAnfangBisZurGrenze)
            {
                throw new GitFehler($"{aufruf} lieferte den Inhalt unvollständig");
            }
            return new Blobinhalt(ausgabe[inhaltAnfang..], ueberschritteneGrenze);
        }
        return new Blobinhalt(ausgabe[inhaltAnfang..(int)inhaltEnde], ueberschritteneGrenze);
    }

    /// <summary>Wie <see cref="Ausfuehren(ProcessStartInfo, string)"/>, aber die Ausgabe sind Bytes (für Binärinhalte wie Bilder).</summary>
    private static Blobinhalt AusfuehrenBytes(ProcessStartInfo start, string aufruf, Ausgabegrenze grenze)
    {
        var lauf = WarteAufEndeMitGrenzeBytes(Starte(start), aufruf, grenze);
        var istAbgeschnitten = lauf.UeberschritteneGrenze is not null;
        if (!istAbgeschnitten)
        {
            PruefeErfolgBytes(lauf, aufruf);
        }
        return new Blobinhalt(lauf.Inhalt, lauf.UeberschritteneGrenze);
    }

    /// <summary>Wie <see cref="AusfuehrenBytes"/> mit Eingabe über stdin (ein Name mit Rohbytes).</summary>
    private static Blobinhalt AusfuehrenMitEingabeBytes(ProcessStartInfo start, byte[] eingabe, string aufruf, Ausgabegrenze grenze)
    {
        start.RedirectStandardInput = true;
        var gestartet = Starte(start);
        using (var stdin = gestartet.StandardInput.BaseStream)
        {
            stdin.Write(eingabe);
        }
        var lauf = WarteAufEndeMitGrenzeBytes(gestartet, aufruf, grenze);
        var istAbgeschnitten = lauf.UeberschritteneGrenze is not null;
        if (!istAbgeschnitten)
        {
            PruefeErfolgBytes(lauf, aufruf);
        }
        return new Blobinhalt(lauf.Inhalt, lauf.UeberschritteneGrenze);
    }

    private static GitBytelauf WarteAufEndeMitGrenzeBytes(Process gestartet, string aufruf, Ausgabegrenze grenze)
    {
        using var prozess = gestartet;
        var fehler = new StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        var inhalt = LesenBytesMitGrenze(prozess, grenze, out var ueberschritteneGrenze);
        prozess.WaitForExit();
        return new GitBytelauf(prozess.ExitCode, inhalt, fehler.ToString().Trim(), ueberschritteneGrenze);
    }

    /// <summary>
    /// Liest Stdout als Bytes bis zur Grenze; hatte git mehr, wird der Prozess beendet und der bis zur Grenze gelesene Anfang samt
    /// der Grenze gemeldet — nie still gekürzt, ohne es zu sagen (die Bildart kommt aus den ersten Bytes, bevor die Größe zählt).
    /// </summary>
    private static byte[] LesenBytesMitGrenze(Process prozess, Ausgabegrenze grenze, out Ausgabegrenze? ueberschritteneGrenze)
    {
        ueberschritteneGrenze = null;
        using var speicher = new MemoryStream();
        var puffer = new byte[81920];
        while (true)
        {
            var gelesen = prozess.StandardOutput.BaseStream.Read(puffer, 0, puffer.Length);
            if (gelesen == 0)
            {
                break;
            }
            var bisZurGrenze = grenze.Bytes - speicher.Length;
            if (gelesen > bisZurGrenze)
            {
                speicher.Write(puffer, 0, (int)bisZurGrenze);
                ueberschritteneGrenze = grenze;
                Beende(prozess);
                break;
            }
            speicher.Write(puffer, 0, gelesen);
        }
        return speicher.ToArray();
    }

    private static void PruefeErfolgBytes(GitBytelauf lauf, string befehl)
    {
        var gitIstGescheitert = lauf.ExitCode != 0;
        if (gitIstGescheitert)
        {
            throw new GitFehler($"{befehl} endete mit {lauf.ExitCode}: {lauf.Fehlertext}");
        }
    }

    private sealed record GitBytelauf(int ExitCode, byte[] Inhalt, string Fehlertext, Ausgabegrenze? UeberschritteneGrenze);

    private static void PruefeErfolg(GitLauf lauf, string befehl)
    {
        var gitIstGescheitert = lauf.ExitCode != 0;
        if (gitIstGescheitert)
        {
            throw new GitFehler($"{befehl} endete mit {lauf.ExitCode}: {lauf.Fehlertext}");
        }
    }

    private static GitLauf WarteAufEnde(Process gestartet)
    {
        using var prozess = gestartet;
        var fehler = new StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        var ausgabe = prozess.StandardOutput.ReadToEnd();
        prozess.WaitForExit();
        return new GitLauf(prozess.ExitCode, ausgabe, fehler.ToString().Trim());
    }

    /// <summary>
    /// Wie <see cref="WarteAufEnde(Process)"/>, aber die Stdout wird stückweise bis zur <paramref name="grenze"/> gelesen; darüber wird der
    /// Prozess beendet und <see cref="GitZuGross"/> geworfen. Kein gekürzter Rumpf: entweder die ganze Ausgabe oder der Ausgang „zu groß“.
    /// </summary>
    private static GitLauf WarteAufEndeMitGrenze(Process gestartet, string aufruf, Ausgabegrenze grenze)
    {
        using var prozess = gestartet;
        var fehler = new StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        var ausgabe = LesenMitGrenze(prozess, aufruf, grenze);
        prozess.WaitForExit();
        return new GitLauf(prozess.ExitCode, ausgabe, fehler.ToString().Trim());
    }

    /// <summary>Liest Stdout als Bytes, bis der Puffer leer ist; überschreitet die Ausgabe die Grenze, wird der Prozess beendet.</summary>
    private static string LesenMitGrenze(Process prozess, string aufruf, Ausgabegrenze grenze)
    {
        using var speicher = new MemoryStream();
        var puffer = new byte[81920];
        while (true)
        {
            var gelesen = prozess.StandardOutput.BaseStream.Read(puffer, 0, puffer.Length);
            if (gelesen == 0)
            {
                break;
            }
            if (speicher.Length + gelesen > grenze.Bytes)
            {
                Beende(prozess);
                throw new GitZuGross(aufruf, grenze.Bytes);
            }
            speicher.Write(puffer, 0, gelesen);
        }
        return FremdeBytes.Utf8MitBytemarken.GetString(speicher.ToArray());
    }

    /// <summary>Beendet einen noch laufenden Prozess samt Kindern; war er schon beendet, ist nichts zu tun. Ein gescheitertes Beenden
    /// darf den Ausgang „zu groß“ nicht verdecken — der Aufrufer wirft ihn unabhängig davon.</summary>
    private static void Beende(Process prozess)
    {
        if (prozess.HasExited)
        {
            return;
        }
        try
        {
            prozess.Kill(entireProcessTree: true);
            prozess.WaitForExit();
        }
        catch (InvalidOperationException)
        {
            // Der Prozess hat sich zwischen Prüfung und Kill selbst beendet.
        }
        catch (SystemException)
        {
            // Das Beenden ist gescheitert; der Aufrufer meldet weiter „zu groß“.
        }
    }

    private static Process Starte(ProcessStartInfo start)
    {
        Process? prozess;
        try
        {
            prozess = Process.Start(start);
        }
        catch (Win32Exception fehler)
        {
            throw new GitNichtGefunden($"git ließ sich nicht starten — ist git installiert und im PATH? ({fehler.Message})");
        }
        if (prozess is null)
        {
            throw new GitNichtGefunden("git ließ sich nicht starten");
        }
        return prozess;
    }

    private sealed record GitLauf(int ExitCode, string Ausgabe, string Fehlertext);
}
