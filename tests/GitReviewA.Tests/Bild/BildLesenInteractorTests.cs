using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Bild;
using GitReviewA.Dateien;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Akzeptanz;

namespace GitReviewA.Tests.Bild;

/// <summary>B2305: die Interaction „Bild lesen“ gegen echtes git — Hash, Name und Seite vor jedem Aufruf geprüft.</summary>
[UnsupportedOSPlatform("windows")]
internal sealed class BildLesenInteractorTests
{
    [Test]
    public void Wenn_logo_nachher_dann_Png_mit_den_Bytes_des_Commits()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/logo.png", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.Gelesen));
        Assert.That(ergebnis.Antwort!.Art, Is.EqualTo(Bildart.Png));
        Assert.That(ergebnis.Antwort.Bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png2)));
    }

    [Test]
    public void Wenn_logo_vorher_dann_Png_mit_den_Bytes_des_ersten_Elternteils()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/logo.png", Bildseite.Vorher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.Gelesen));
        Assert.That(ergebnis.Antwort!.Bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png1)));
    }

    [Test]
    public void Wenn_alle_vier_Typen_dann_je_ihr_Typ()
    {
        using var repo = BildRepo.V();
        var interactor = Interactor(repo);

        Assert.That(interactor.Lesen(new Bildanfrage(repo.Hash("q"), "bilder/foto.jpg", Bildseite.Nachher)).Antwort!.Art, Is.EqualTo(Bildart.Jpeg));
        Assert.That(interactor.Lesen(new Bildanfrage(repo.Hash("q"), "bilder/bunt.gif", Bildseite.Nachher)).Antwort!.Art, Is.EqualTo(Bildart.Gif));
        Assert.That(interactor.Lesen(new Bildanfrage(repo.Hash("q"), "bilder/klein.webp", Bildseite.Nachher)).Antwort!.Art, Is.EqualTo(Bildart.Webp));
    }

    [Test]
    public void Wenn_Textdatei_oder_Svg_oder_Text_mit_png_Endung_dann_kein_Bild()
    {
        using var repo = BildRepo.V();
        var interactor = Interactor(repo);

        Assert.That(interactor.Lesen(new Bildanfrage(repo.Hash("q"), "notizen2.txt", Bildseite.Nachher)).Ausgang, Is.EqualTo(Bildausgang.KeinBild));
        Assert.That(interactor.Lesen(new Bildanfrage(repo.Hash("q"), "bilder/karte.svg", Bildseite.Nachher)).Ausgang, Is.EqualTo(Bildausgang.KeinBild));
        Assert.That(interactor.Lesen(new Bildanfrage(repo.Hash("q"), "bilder/keinbild.png", Bildseite.Nachher)).Ausgang, Is.EqualTo(Bildausgang.KeinBild));
    }

    /// <summary>B1: eine Binärdatei, deren Kopf mit `RIFF` beginnt und vor der Webp-Stelle endet — kein Bild, keine Ausnahme.</summary>
    [Test]
    public void Wenn_kurze_kaputte_Kopfbytes_dann_kein_Bild_statt_einer_Ausnahme()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/roh.bin", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.KeinBild));
    }

    [Test]
    public void Wenn_Name_mit_Rohbyte_dann_Png()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/b⟨0xFF⟩.png", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.Gelesen));
        Assert.That(ergebnis.Antwort!.Bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png1)));
    }

    [Test]
    public void Wenn_Hash_nicht_in_der_Auswahl_dann_nicht_gefunden()
    {
        using var repo = BildRepo.V();
        var fremderHash = new string('a', 40);

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(fremderHash, "bilder/logo.png", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.NichtGefunden));
    }

    [Test]
    public void Wenn_Pfad_nicht_in_der_Dateiliste_dann_nicht_gefunden()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/gibt-es-nicht.png", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.NichtGefunden));
    }

    [Test]
    public void Wenn_neue_Datei_dann_keine_vorher_Seite()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/neu.png", Bildseite.Vorher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.KeinBild));
    }

    [Test]
    public void Wenn_geloeschte_Datei_dann_keine_nachher_Seite()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/weg.png", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.KeinBild));
    }

    /// <summary>B2: die Bildart kommt aus den ersten Bytes, bevor die Größe zählt — eine Binärdatei ohne Bildtyp bleibt „kein Bild“,
    /// auch wenn git mehr als die Ausgabegrenze hatte.</summary>
    [Test]
    public void Wenn_Binaerdatei_ueber_der_Grenze_dann_kein_Bild_statt_zu_gross()
    {
        using var repo = BildRepo.V();

        var ergebnis = Interactor(repo, new Ausgabegrenze(100)).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/daten.bin", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.KeinBild));
    }

    /// <summary>B2: genau an der Grenze wird der Blob noch ganz gelesen — ohne Bildtyp ebenfalls „kein Bild“.</summary>
    [Test]
    public void Wenn_Binaerdatei_genau_an_der_Grenze_dann_kein_Bild()
    {
        using var repo = BildRepo.V();
        var groesse = new FileInfo(Path.Combine(repo.Ordner, "bilder", "daten.bin")).Length;

        var ergebnis = Interactor(repo, new Ausgabegrenze(groesse)).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/daten.bin", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.KeinBild));
    }

    [Test]
    public void Wenn_ueber_der_Grenze_dann_zu_gross_mit_der_Grenze()
    {
        using var repo = BildRepo.V();
        var grenze = new Ausgabegrenze(BildRepo.Bytes(BildRepo.PngGross).Length - 1);

        var ergebnis = Interactor(repo, grenze).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/gross.png", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.ZuGross));
        Assert.That(ergebnis.Meldung, Does.Contain(grenze.Bytes.ToString(System.Globalization.CultureInfo.InvariantCulture)));
    }

    [Test]
    public void Wenn_Objektdatei_entfernt_dann_nicht_lesbar()
    {
        using var repo = BildRepo.V();
        repo.BlobObjektEntfernen(repo.Hash("q"), "bilder/logo.png");

        var ergebnis = Interactor(repo).Lesen(new Bildanfrage(repo.Hash("q"), "bilder/logo.png", Bildseite.Nachher));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Bildausgang.NichtLesbar));
    }

    private static BildLesenInteractor Interactor(BildRepo repo, Ausgabegrenze? grenze = null)
    {
        var wurzel = GitLeser.WurzelLesen(repo.Ordner);
        var commits = GitLeser.Lesen(new CommitHashes([repo.Hash("p"), repo.Hash("q")]), repo.Ordner);
        var quelle = grenze is null ? new GitBildquelle(wurzel) : new GitBildquelle(wurzel, grenze);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Debug);
        return new BildLesenInteractor(commits, new GemerkteDateiquelle(new GitDateiquelle(wurzel)), quelle, protokoll);
    }
}
