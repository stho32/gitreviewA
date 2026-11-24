using GitReviewA.Aufruf;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Zusammen;

/// <summary>
/// B1404: die Netto-Dateiliste rein zusammensetzen. Repo Z als Zahlen der Kriterien 1, 2 und 7 (netto bzw. Summe der Abschnitte,
/// jede Datei einmal, zuständiger Commit), eine Umbenennung (der alte Pfad gehört zur selben Datei) und das Doppelgänger-Paar
/// (zwei Einträge bei gleichem Anzeigenamen, geschlüsselt über den Rohnamen).
/// </summary>
public class NettoDateilisteBauenTests
{
    [Test]
    [Description("R00015 B1404: lückenlos jede Datei einmal, netto gezählt, mit ihren Stellen und dem jüngsten ändernden Commit")]
    public void Wenn_die_Kette_lueckenlos_ist_dann_die_Netto_Dateien_mit_netto_Zahlen()
    {
        var liste = Baue(RepoZ.Lueckenlos(), RepoZ.Netto(), RepoZ.Uebersicht(), ["z3", "z2", "z1"]);

        Assert.That((liste.Lueckenlos, liste.Beschriftung, liste.Anzahl), Is.EqualTo((true, "lückenlos · netto", 3)));
        Assert.That(liste.AlsArray().Select(Anzeige), Is.EqualTo(new[]
        {
            ("README.md", "A", (int?)2, (int?)0),
            ("src/a.txt", "A", (int?)4, (int?)0),
            ("src/b.txt", "A", (int?)2, (int?)0),
        }));
        Assert.That(Stellen(liste, "src/a.txt"), Is.EqualTo(new[] { "z1", "z2", "z3" }));
        Assert.That(Zustaendiger(liste, "src/a.txt"), Is.EqualTo("z3"));
        Assert.That(Zustaendiger(liste, "README.md"), Is.EqualTo("z1"), "der letzte Commit z3 berührt README.md nicht");
        Assert.That(Zustaendiger(liste, "src/b.txt"), Is.EqualTo("z3"));
    }

    [Test]
    [Description("R00015 B1404, Kriterium 2: ohne Kette die Vereinigung, die Zahlen als Summe der Abschnitte")]
    public void Wenn_die_Kette_nicht_lueckenlos_ist_dann_die_Vereinigung_mit_Summe_der_Abschnitte()
    {
        var liste = Baue(RepoZ.NichtLueckenlos(), RepoZ.Leer(), RepoZ.Uebersicht(), ["z3", "z1"]);

        Assert.That((liste.Lueckenlos, liste.Beschriftung, liste.Anzahl), Is.EqualTo((false, "keine lückenlose Kette · je Commit", 3)));
        Assert.That(liste.AlsArray().Select(Anzeige), Is.EqualTo(new[]
        {
            ("README.md", "A", (int?)2, (int?)0),
            ("src/a.txt", "M", (int?)4, (int?)0),
            ("src/b.txt", "M", (int?)1, (int?)1),
        }));
        Assert.That(Stellen(liste, "src/a.txt"), Is.EqualTo(new[] { "z1", "z3" }), "z2 fehlt");
        Assert.That(Zustaendiger(liste, "src/a.txt"), Is.EqualTo("z3"));
    }

    [Test]
    [Description("R00015 B1404, Kriterium 3: eine Umbenennung erscheint einmal, der alte Pfad gehört zu ihren Stellen")]
    public void Wenn_in_der_Kette_umbenannt_wird_dann_ein_Eintrag_mit_beiden_Stellen()
    {
        var netto = new Dateiaenderungen([new Dateiaenderung("R", "neu.txt", "alt.txt", 1, 1)]);
        var uebersicht = Uebersicht(
            ("z1", [new Dateiaenderung("A", "alt.txt", null, 3, 0)]),
            ("u", [new Dateiaenderung("R", "neu.txt", "alt.txt", 1, 1)]));

        var liste = Baue(Lueckenlos("z1", "u"), netto, uebersicht, ["u", "z1"]);

        Assert.That(liste.Anzahl, Is.EqualTo(1));
        Assert.That(liste[0].Anzeigepfad, Is.EqualTo("neu.txt"));
        Assert.That(liste[0].Stellen.Select(stelle => (stelle.Commit, stelle.Datei.Pfad)).ToArray(),
            Is.EqualTo(new[] { ("z1", "alt.txt"), ("u", "neu.txt") }));
        Assert.That(liste[0].ZustaendigerCommit, Is.EqualTo("u"));
    }

    [Test]
    [Description("R00015 B1404, Kriterium 10: zwei Rohnamen mit gleichem Anzeigenamen bleiben zwei Einträge")]
    public void Wenn_zwei_Rohnamen_denselben_Anzeigenamen_haben_dann_zwei_Eintraege()
    {
        var literal = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0);
        var roh = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0, new Rohname("f\xFF.txt"u8.ToArray()));
        var liste = Baue(NichtLueckenlos("n"), RepoZ.Leer(), Uebersicht(("n", [literal, roh])), ["n"]);

        Assert.That(liste.Anzahl, Is.EqualTo(2), "der Anzeigename wird nicht Schlüssel");
        Assert.That(liste.MitAnzeigepfad("f⟨0xFF⟩.txt"), Has.Length.EqualTo(2));
    }

    [Test]
    [Description("R00015 B1404: ein Steuerzeichen im Namen steht im Anzeigepfad als Marke")]
    public void Wenn_ein_Name_ein_Steuerzeichen_traegt_dann_steht_es_als_Marke()
    {
        var mitZeilenumbruch = new Dateiaenderung("A", "z\n⟨0xFF⟩.txt", null, 1, 0, new Rohname("z\n\xFF.txt"u8.ToArray()));
        var liste = Baue(NichtLueckenlos("n"), RepoZ.Leer(), Uebersicht(("n", [mitZeilenumbruch])), ["n"]);

        Assert.That(liste[0].Anzeigepfad, Is.EqualTo("z⟨U+000A⟩⟨0xFF⟩.txt"));
    }

    private static NettoDateiliste Baue(Kette kette, Dateiaenderungen netto, Dateiuebersicht uebersicht, string[] juengsteZuerst)
    {
        return NettoDateilisteBauen.Baue(kette, netto, uebersicht, new CommitHashes(juengsteZuerst));
    }

    private static Kette NichtLueckenlos(string einziger)
    {
        return new Kette(false, string.Empty, new CommitHashes([einziger]));
    }

    private static Kette Lueckenlos(params string[] kette)
    {
        var zeilen = kette.Select((commit, stelle) => new Elternzeile(commit, stelle == 0 ? string.Empty : kette[stelle - 1]));
        return KetteBeurteilen.Beurteile(new Elternfolge(zeilen), new CommitHashes(kette));
    }

    private static Dateiuebersicht Uebersicht(params (string Commit, Dateiaenderung[] Dateien)[] commits)
    {
        var commitdateien = commits.Select(commit => new Commitdateien(commit.Commit, new Dateiaenderungen(commit.Dateien))).ToArray();
        var stellen = commitdateien
            .SelectMany(commit => commit.Dateien.AlsArray().Select(datei => new Uebersichtsstelle(new Stelle(commit.Commit, datei.Pfad), string.Empty)));
        return new Dateiuebersicht(commitdateien, stellen);
    }

    private static (string Pfad, string Status, int? Plus, int? Minus) Anzeige(NettoDatei datei)
    {
        return (datei.Anzeigepfad, datei.Datei.Status, datei.Datei.Plus, datei.Datei.Minus);
    }

    private static string[] Stellen(NettoDateiliste liste, string anzeigepfad)
    {
        return liste.MitAnzeigepfad(anzeigepfad).Single().Stellen.Select(stelle => stelle.Commit).ToArray();
    }

    private static string Zustaendiger(NettoDateiliste liste, string anzeigepfad)
    {
        return liste.MitAnzeigepfad(anzeigepfad).Single().ZustaendigerCommit;
    }

    /// <summary>Repo Z als reine Daten (ohne git): die Zahlen der Kriterien 1, 2 und 7.</summary>
    private static class RepoZ
    {
        public static Kette Lueckenlos()
        {
            return KetteBeurteilen.Beurteile(
                new Elternfolge([new Elternzeile("z1", ""), new Elternzeile("z2", "z1"), new Elternzeile("z3", "z2")]),
                new CommitHashes(["z1", "z2", "z3"]));
        }

        public static Kette NichtLueckenlos()
        {
            return KetteBeurteilen.Beurteile(
                new Elternfolge([new Elternzeile("z1", ""), new Elternzeile("z3", "z2")]),
                new CommitHashes(["z1", "z3"]));
        }

        public static Dateiaenderungen Netto()
        {
            return new Dateiaenderungen([
                new Dateiaenderung("A", "README.md", null, 2, 0),
                new Dateiaenderung("A", "src/a.txt", null, 4, 0),
                new Dateiaenderung("A", "src/b.txt", null, 2, 0),
            ]);
        }

        public static Dateiaenderungen Leer()
        {
            return new Dateiaenderungen([]);
        }

        public static Dateiuebersicht Uebersicht()
        {
            return NettoDateilisteBauenTests.Uebersicht(
                ("z1", [new Dateiaenderung("A", "README.md", null, 2, 0), new Dateiaenderung("A", "src/a.txt", null, 3, 0)]),
                ("z2", [new Dateiaenderung("M", "src/a.txt", null, 1, 1), new Dateiaenderung("A", "src/b.txt", null, 2, 0)]),
                ("z3", [new Dateiaenderung("M", "src/a.txt", null, 1, 0), new Dateiaenderung("M", "src/b.txt", null, 1, 1)]));
        }
    }
}
