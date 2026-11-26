using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Der Treiber der Commit-Angaben für die Integrationstests zu R00048: er ruft den Aufruf-Interactor in-process mit einer Auswahl
/// (Einzelcommits, Bereiche oder stdin) und liefert die gelesenen Commitzeilen oder den Abweisungsgrund. Der Testfall nennt nur die
/// Auswahl und die erwarteten Felder; dass daraus `git log` wird und wie die Abweisung aussieht, steht hier.
/// </summary>
[System.Runtime.Versioning.UnsupportedOSPlatform("windows")]
internal static class CommitSprache
{
    private static readonly DateTimeOffset Jetzt = new(2026, 11, 26, 9, 0, 0, TimeSpan.FromHours(1));

    public static Auswahl Einzelne(params string[] hashes)
    {
        return Auswahl.AusEinzelcommits(new CommitHashes(hashes));
    }

    public static Auswahl AusBereichen(params string[] bereiche)
    {
        return Auswahl.AusBereichen(new Bereiche(bereiche));
    }

    public static Aufruffolge UeberStdin(string ordner, StringWriter stderr, params string[] hashes)
    {
        var eingabe = string.Join('\n', hashes) + "\n";
        return Laufe(ordner, Auswahl.UeberStdin(), stderr, eingabe);
    }

    /// <summary>Liest die Auswahl; eine Abweisung lässt den Test scheitern (der erwartete Erfolg steht im Testfall).</summary>
    public static Commitzeilen Lies(string ordner, Auswahl auswahl, StringWriter? stderr = null)
    {
        var folge = Laufe(ordner, auswahl, stderr ?? new StringWriter());
        Assert.That(folge.IstErfolg, Is.True, $"der Aufruf wurde abgewiesen: {folge.Fehler?.Meldung}");
        return folge.Commits!;
    }

    /// <summary>Liest die Auswahl und erwartet eine Abweisung (Exit 2 wie jeder ungültige Aufruf).</summary>
    public static Aufruffehler LiesMitFehler(string ordner, Auswahl auswahl, StringWriter? stderr = null)
    {
        var folge = Laufe(ordner, auswahl, stderr ?? new StringWriter());
        Assert.That(folge.IstErfolg, Is.False, "der Aufruf war gültig, erwartet war eine Abweisung");
        return folge.Fehler!;
    }

    public static Aufruffolge Laufe(string ordner, Auswahl auswahl, StringWriter stderr, string stdinText = "")
    {
        var auftrag = new Startauftrag(auswahl, 0, false, Protokollstufe.Warnung, new Musterliste([]));
        var anfrage = new Aufrufanfrage(auftrag, new Standardeingabe(new StringReader(stdinText), IstTerminal: false), ordner);
        return AufrufInteractor.StarteAsync(anfrage, Protokoll(stderr)).GetAwaiter().GetResult();
    }

    private static StderrProtokoll Protokoll(StringWriter ziel)
    {
        return new StderrProtokoll(ziel, new TestUhr(Jetzt), Protokollstufe.Warnung);
    }
}
