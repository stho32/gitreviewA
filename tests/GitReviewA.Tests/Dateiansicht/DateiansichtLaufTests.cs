using System.Text.Json;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00043 Kriterien 1–3 und 7 als Prozess: Startzeile, Liste, Text, „Schließen“ mit Exit 0, Signal mit 130, je Grund Exit 2
/// vor dem Server, stdout in jedem Ausgang 0 Bytes. Start aus dem Ordner D, ohne Browser.
/// </summary>
[NonParallelizable]
public class DateiansichtLaufTests
{
    [Test]
    public async Task Wenn_a_sql_gezeigt_wird_dann_eine_Datei_in_der_Liste_ihr_Text_und_Schliessen_endet_mit_0_und_leerem_stdout()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "--kein-browser", "--port", "0");

        var liste = await lauf.AbrufenAsync("api/dateiansicht");
        var text = await lauf.AbrufenAsync("api/dateiansicht/0");
        var geschlossen = await lauf.SchliessenAsync();
        var ende = await lauf.WarteAufEndeAsync();

        using var dokument = JsonDocument.Parse(liste.Koerper);
        var dateien = dokument.RootElement.GetProperty("dateien").EnumerateArray().ToList();
        Assert.That(dateien, Has.Count.EqualTo(1));
        Assert.That(dateien[0].GetProperty("nummer").GetInt32(), Is.EqualTo(0));
        Assert.That(dateien[0].GetProperty("zeilen").GetInt32(), Is.EqualTo(3));
        Assert.That(dateien[0].GetProperty("kodierung").GetString(), Is.EqualTo("UTF-8"));
        Assert.That(dateien[0].GetProperty("zeilenende").GetString(), Is.EqualTo("LF"));
        using var textdokument = JsonDocument.Parse(text.Koerper);
        Assert.That(textdokument.RootElement.GetProperty("text").GetString(), Is.EqualTo(File.ReadAllText(d.Pfad("a.sql"))));
        Assert.That((liste.Status, text.Status, geschlossen.Status), Is.EqualTo((200, 200, 200)));
        Assert.That(ende, Is.EqualTo(0));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("gitreviewA läuft auf http://127.0.0.1:"));
    }

    [Test]
    public async Task Wenn_ein_Beendigungssignal_kommt_dann_130_und_Review_abgebrochen_ohne_stdout()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "--kein-browser", "--port", "0");
        Assert.That(lauf.Adresse, Is.Not.Null);

        await lauf.SendeSigtermAsync();
        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(130));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("Review abgebrochen"));
    }

    [Test]
    public async Task Wenn_die_Datei_fehlt_dann_Exit_2_genau_eine_Fehlerzeile_und_kein_Server()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "fehlt.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
        Assert.That(Fehlerzeilen(lauf.Fehler), Is.EqualTo(1));
        Assert.That(lauf.Fehler, Does.Contain("FEHLER [Dateiansicht] fehlt.sql: Datei nicht gefunden"));
    }

    [Test]
    public async Task Wenn_ein_Hash_neben_dateien_steht_dann_Exit_2_ohne_Server()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "a1b2c3d4", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("Review oder Dateiansicht, nicht beides"));
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
    }

    [TestCase("--dateien")]
    [TestCase("--dateien", "a.sql", "-")]
    [TestCase("--dateien", "a.sql", "--ignore", "*.md")]
    public async Task Wenn_der_Aufruf_beides_waere_dann_Exit_2(params string[] argumente)
    {
        using var d = OrdnerD.Anlegen();
        var mitOptionen = argumente.Append("--kein-browser").ToArray();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, mitOptionen);

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Is.Not.Empty);
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
    }

    [Test]
    public async Task Wenn_ein_symbolischer_Link_genannt_wird_dann_Exit_2_mit_seinem_Grund()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "link.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("ist ein symbolischer Link — bitte das Ziel nennen"));
    }

    [Test]
    public async Task Wenn_der_Name_unsichtbare_Zeichen_traegt_dann_steht_er_nur_mit_Marken_auf_stderr()
    {
        using var d = OrdnerD.Anlegen();
        var angabe = "fehlt\u202e\u200b\U000E0041.sql";
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", angabe, "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+202E⟩"));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+200B⟩"));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+E0041⟩"));
        Assert.That(lauf.Fehler.IndexOf('\u202E', StringComparison.Ordinal), Is.EqualTo(-1));
        Assert.That(lauf.Fehler.IndexOf('\u200B', StringComparison.Ordinal), Is.EqualTo(-1));
        Assert.That(lauf.Fehler.Contains("\U000E0041", StringComparison.Ordinal), Is.False);
        Assert.That(Fehlerzeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_proc_self_mem_scheitert_dann_Exit_2_ohne_Stacktrace()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "/proc/self/mem", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("Datei nicht lesbar"));
        Assert.That(lauf.Fehler, Does.Not.Contain("   at "));
        Assert.That(Fehlerzeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_der_Pfad_5000_Zeichen_hat_dann_Exit_2_mit_einer_hoechstens_400_Zeichen_langen_Zeile()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", new string('a', 5000), "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        var zeile = Fehlerzeilen(lauf.Fehler);
        var laengste = lauf.Fehler.Split('\n').Select(text => text.TrimEnd('\r')).Where(text => text.Length > 0).Max(text => text.Length);
        Assert.That(zeile, Is.EqualTo(1));
        Assert.That(laengste, Is.LessThanOrEqualTo(400));
    }

    [Test]
    public async Task Wenn_a_sql_nach_dem_Start_geloescht_wird_dann_zeigt_das_Neuladen_den_Stand_vom_Start()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "--kein-browser", "--port", "0");
        var vorher = await lauf.AbrufenAsync("api/dateiansicht/0");

        File.Delete(d.Pfad("a.sql"));
        using var fifo = System.Diagnostics.Process.Start("mkfifo", d.Pfad("a.sql"));
        fifo?.WaitForExit();
        var nachher = await lauf.AbrufenAsync("api/dateiansicht/0");

        Assert.That(nachher.Status, Is.EqualTo(200));
        Assert.That(nachher.Koerper, Is.EqualTo(vorher.Koerper));
    }

    private static int Fehlerzeilen(string fehler)
    {
        return fehler.Split('\n').Count(zeile => zeile.Contains("[Dateiansicht]", StringComparison.Ordinal));
    }
}
