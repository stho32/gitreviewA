using System.Diagnostics;
using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Akzeptanz;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Beenden;

/// <summary>
/// B3007 „Markierte Zeilen lesen“ (R00031 Kriterium 9 und 12): der neue Lesepfad für das Zitat der markierten Zeilen — über `GitStart`
/// mit allen Schutzoptionen, Ausgabegrenze und Namensprüfung an der Aufrufstelle (Lehre #10). Namen aus fremden Bytes gehen über stdin.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class BereichszeilenTests
{
    private const string AusgabegrenzeGrund = "über der Ausgabegrenze";
    private const string DateiendeGrund = "hinter dem Dateiende";

    [Test]
    [Description("R00031 Kriterium 9: die Zeilen von..bis in der Nummer neu, mit Marken für fremden Text")]
    public void Wenn_Bereich_1_bis_3_dann_die_drei_Zeilen_in_der_Nummer_neu()
    {
        using var repo = DiffRepo.A();
        var leser = Leser(repo, "q", Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("q"), "lang.txt", 1, 3);

        Assert.That((lesung.Ausgang, lesung.Zeilen), Is.EqualTo((Bereichszeilenausgang.Gelesen, new[] { "z01", "z02", "Z03" })));
    }

    [Test]
    [Description("R00031 Kriterium 9: die letzte Zeile ohne abschließendes LF gehört dazu")]
    public void Wenn_die_letzte_Zeile_gelesen_wird_dann_gehört_sie_zum_Bereich()
    {
        using var repo = DiffRepo.A();
        var leser = Leser(repo, "q", Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("q"), "lang.txt", 19, 19);

        Assert.That((lesung.Ausgang, lesung.Zeilen), Is.EqualTo((Bereichszeilenausgang.Gelesen, new[] { "z20" })));
    }

    [Test]
    [Description("R00031 Kriterium 12: bis hinter dem Dateiende heißt kein Zitat, nicht ein still gekürztes")]
    public void Wenn_bis_hinter_dem_Dateiende_dann_Grund_und_keine_Zeilen()
    {
        using var repo = DiffRepo.A();
        var leser = Leser(repo, "q", Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("q"), "lang.txt", 18, 25);

        Assert.That(lesung.Ausgang, Is.EqualTo(Bereichszeilenausgang.HinterDemDateiende));
        Assert.That(lesung.Grund, Does.Contain(DateiendeGrund));
        Assert.That(lesung.Zeilen, Is.Empty);
    }

    [Test]
    [Description("R00031 Kriterium 12 (Lehre #10): knapp über der Ausgabegrenze „zu groß“, knapp darunter das Zitat")]
    public void Wenn_die_Datei_ueber_der_Ausgabegrenze_liegt_dann_Grund_und_darunter_das_Zitat()
    {
        using var repo = DiffRepo.A();
        var inhalt = File.ReadAllBytes(Path.Combine(repo.Ordner, "lang.txt"));
        // Die Ausgabe von `git cat-file --batch` ist Kopfzeile (`<oid> blob <Größe>\n`) + Inhalt + LF.
        var kopfzeile = repo.Hash("q").Length + " blob ".Length + inhalt.Length.ToString(System.Globalization.CultureInfo.InvariantCulture).Length + 1;
        var genau = new Ausgabegrenze(inhalt.Length + kopfzeile + 1);
        var einByteZuWenig = new Ausgabegrenze(inhalt.Length + kopfzeile);

        var passt = Leser(repo, "q", genau).Lies(repo.Hash("q"), "lang.txt", 1, 1);
        var zuGross = Leser(repo, "q", einByteZuWenig).Lies(repo.Hash("q"), "lang.txt", 1, 1);

        Assert.That((passt.Ausgang, passt.Zeilen), Is.EqualTo((Bereichszeilenausgang.Gelesen, new[] { "z01" })));
        Assert.That(zuGross.Ausgang, Is.EqualTo(Bereichszeilenausgang.UeberDerGrenze));
        Assert.That(zuGross.Grund, Does.Contain(AusgabegrenzeGrund));
    }

    [Test]
    [Description("R00031 Kriterium 12 (Lehre #10): die Namensprüfung steht an der Aufrufstelle — ein Name mit Zeilenende geht gar nicht erst an git")]
    public void Wenn_der_Name_ein_Zeilenende_traegt_dann_Grund_und_kein_git_Aufruf()
    {
        using var repo = FremdeNamenRepo.N();
        var marker = MarkerSkript(repo.Ordner, "marker-zeilenende");
        repo.Git("config", "core.fsmonitor", marker);
        repo.Git("config", "log.showSignature", "true");
        repo.Git("config", "gpg.program", marker);
        // Ein Name ohne Rohbytes (die Anzeige trägt LF und CR): die Sperre lässt ihn zu, der Aufruf darf ihn nicht an git geben.
        var quelle = new TestUebersichtsquelle(new Dateiuebersicht(
            [new Commitdateien(repo.Hash("n"), new Dateiaenderungen([new Dateiaenderung("M", "z\n⟨0xFF⟩\r.txt", null, 1, 0)]))],
            [new Uebersichtsstelle(new Stelle(repo.Hash("n"), "z\n⟨0xFF⟩\r.txt"), string.Empty)]));
        var leser = LeserMitQuelle(quelle, repo.Ordner, Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("n"), "z\n⟨0xFF⟩\r.txt", 1, 1);

        Assert.That((lesung.Ausgang, lesung.Grund), Is.EqualTo((Bereichszeilenausgang.NichtLesbar, "Diff nicht lesbar: Name nicht übergebbar")));
        Assert.That(lesung.Zeilen, Is.Empty);
        Assert.That(File.Exists(Path.Combine(repo.Ordner, "marker-zeilenende")), Is.False, "kein fremdes Programm gestartet");
    }

    [Test]
    [Description("R00031 Kriterium 12: der Name mit Rohbytes geht über stdin und der Text kommt mit Marken")]
    public void Wenn_der_Name_Rohbytes_traegt_dann_ueber_stdin_und_der_Text_mit_Marken()
    {
        using var repo = FremdeNamenRepo.N();
        var marker = MarkerSkript(repo.Ordner, "marker-rohbyte");
        repo.Git("config", "core.fsmonitor", marker);
        repo.Git("config", "log.showSignature", "true");
        repo.Git("config", "gpg.program", marker);
        var leser = LeserMitGitQuelle(repo.Ordner, repo.Hash("b"), Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("b"), "r⟨0xFF⟩.txt", 1, 1);

        Assert.That((lesung.Ausgang, lesung.Zeilen), Is.EqualTo((Bereichszeilenausgang.Gelesen, new[] { "geheim" })));
        Assert.That(File.Exists(Path.Combine(repo.Ordner, "marker-rohbyte")), Is.False, "kein fremdes Programm gestartet");
    }

    [Test]
    [Description("R00031: der Lesepfad liefert den fremden Text roh — die Marke setzt der Ausgaberand (ErgebnisFormatierer)")]
    public void Wenn_eine_Zeile_ein_Richtungszeichen_traegt_dann_kommt_sie_roh_aus_dem_Lesepfad()
    {
        using var repo = DiffRepo.A();
        var leser = Leser(repo, "q", Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("q"), "fremd.txt", 3, 3);

        Assert.That((lesung.Ausgang, lesung.Zeilen), Is.EqualTo((Bereichszeilenausgang.Gelesen, new[] { "a\u202Eb" })));
    }

    [Test]
    [Description("R00031: eine Datei, die die Übersicht nicht kennt, ist nicht lesbar")]
    public void Wenn_die_Datei_nicht_zur_Uebersicht_gehoert_dann_Grund()
    {
        using var repo = DiffRepo.A();
        var leser = Leser(repo, "q", Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("q"), "gibtsnicht.txt", 1, 1);

        Assert.That(lesung.Ausgang, Is.EqualTo(Bereichszeilenausgang.NichtLesbar));
        Assert.That(lesung.Grund, Does.Contain("nicht lesbar"));
    }

    [Test]
    [Description("R00031: lässt sich die Übersicht nicht lesen, gibt es kein Zitat (nichts still behaupten)")]
    public void Wenn_die_Uebersicht_nicht_lesbar_ist_dann_Grund_und_keine_Zeilen()
    {
        using var repo = DiffRepo.A();
        var leser = LeserMitQuelle(TestUebersichtsquelle.Scheiternd(), repo.Ordner, Ausgabegrenze.Standard);

        var lesung = leser.Lies(repo.Hash("q"), "lang.txt", 1, 1);

        Assert.That(lesung.Ausgang, Is.EqualTo(Bereichszeilenausgang.NichtLesbar));
        Assert.That(lesung.Zeilen, Is.Empty);
    }

    [Test]
    [Description("R00031 Kriterium 12 (Lehre #28): in einem Partial-Clone startet der Blob-Zugriff keinen Lazy-Fetch")]
    public void Wenn_das_Repo_ein_Partial_Clone_ist_dann_startet_der_Blob_Zugriff_kein_fremdes_Programm()
    {
        using var repo = PartialCloneMitMarker(out var marker);
        var hash = repo.Hash;
        var quelle = new TestUebersichtsquelle(new Dateiuebersicht(
            [new Commitdateien(hash, new Dateiaenderungen([new Dateiaenderung("M", "geheim.txt", null, 2, 0)]))],
            [new Uebersichtsstelle(new Stelle(hash, "geheim.txt"), string.Empty)]));

        var lesung = LeserMitQuelle(quelle, repo.Ordner, Ausgabegrenze.Standard).Lies(hash, "geheim.txt", 1, 2);

        Assert.That(File.Exists(marker), Is.False, "der Blob-Zugriff holte über remote.origin.uploadpack nach");
        Assert.That(lesung.Ausgang, Is.Not.EqualTo(Bereichszeilenausgang.Gelesen), "der Blob fehlt im Klon, kein stiller Inhalt");
        GitIn(repo.Ordner, "cat-file", "blob", $"{hash}:geheim.txt");
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: ohne den Schutz holt git den Blob und startet das Programm");
    }

    /// <summary>Ein Partial-Clone (`--filter=blob:none`) mit Marker-Programm als `remote.origin.uploadpack`; der Blob fehlt im Klon.</summary>
    private static PartialClone PartialCloneMitMarker(out string marker)
    {
        using var origin = WegwerfRepo.MitCommits();
        origin.SchreibeDatei("geheim.txt", "geheim1\ngeheim2\n");
        var hash = origin.Committe("Mit Inhalt", "Anna Beispiel", "2026-03-04T09:15:00+01:00", "");
        origin.Git("config", "uploadpack.allowFilter", "true");
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-klon-").FullName;
        var programm = Path.Combine(ordner, "upload-pack.sh");
        marker = Path.Combine(ordner, "marker.txt");
        File.WriteAllText(programm, $"#!/bin/sh\necho lief >> '{marker}'\nexit 1\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        GitIn(ordner, "clone", "-q", "--filter=blob:none", "--no-checkout", new Uri(origin.Ordner).AbsoluteUri, "klon");
        var klon = Path.Combine(ordner, "klon");
        GitIn(klon, "config", "remote.origin.uploadpack", programm);
        return new PartialClone(klon, hash);
    }

    private static string GitIn(string ordner, params string[] argumente)
    {
        var start = new ProcessStartInfo("git") { WorkingDirectory = ordner, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in argumente)
        {
            start.ArgumentList.Add(argument);
        }
        start.Environment["GIT_CONFIG_NOSYSTEM"] = "1";
        start.Environment["GIT_CONFIG_GLOBAL"] = "/dev/null";
        using var prozess = Process.Start(start)!;
        var ausgabe = prozess.StandardOutput.ReadToEnd();
        var fehler = prozess.StandardError.ReadToEnd();
        prozess.WaitForExit();
        return prozess.ExitCode == 0 ? ausgabe : string.Empty;
    }

    private sealed record PartialClone(string Ordner, string Hash) : IDisposable
    {
        public void Dispose()
        {
            Directory.Delete(Path.GetDirectoryName(Ordner)!, recursive: true);
        }
    }

    private static Bereichszeilen Leser(DiffRepo repo, string commit, Ausgabegrenze grenze)
    {
        return LeserMitGitQuelle(repo.Ordner, repo.Hash(commit), grenze);
    }

    /// <summary>Der echte Lesepfad der Übersicht (`git log --raw`), wie ihn der Webserver verdrahtet.</summary>
    private static Bereichszeilen LeserMitGitQuelle(string ordner, string hash, Ausgabegrenze grenze)
    {
        var commits = GitLeser.Lesen(new CommitHashes([hash]), ordner);
        var arbeitsordner = GitLeser.WurzelLesen(ordner);
        return LeserMitQuelle(new GitUebersichtsquelle(commits, arbeitsordner), arbeitsordner, grenze);
    }

    private static Bereichszeilen LeserMitQuelle(IUebersichtsquelle quelle, string ordner, Ausgabegrenze grenze)
    {
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Debug);
        return new Bereichszeilen(new GemerkteUebersicht(quelle), ordner, grenze, protokoll);
    }

    private static string MarkerSkript(string ordner, string name)
    {
        var skript = Path.Combine(ordner, ".git", $"{name}.sh");
        File.WriteAllText(skript, $"#!/bin/sh\ntouch '{Path.Combine(ordner, name)}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(skript, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return skript;
    }
}
