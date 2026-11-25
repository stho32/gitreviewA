using System.Net;
using System.Net.Http.Headers;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Json;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00022/R00014 „Die Sperre prüft denselben kanonischen Namen wie Stapel, Netto und Ergebnis“ (Befund des
/// security-reviewer zu Karte 18; Wurzel aus #27/M2 und Lehre #29): zwei Dateien eines Commits, deren Anzeigename gleich ist —
/// die eine wörtlich `a⟨U+202E⟩b.txt`, die andere mit dem echten Zeichen U+202E —, sind zwei Dateien. Der Diff und die Netto-Liste
/// weisen den Anzeigenamen als nicht eindeutig ab (R00014); die Dateianmerkung muss dieselbe Antwort geben, in der Anzeige- wie in
/// der Rohform. Die Anzeige im Browser prüft <c>e2e/tests/zusammen-namenskollision.spec.js</c>.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen mit U+202E legt nur bash unter Linux")]
[UnsupportedOSPlatform("windows")]
public class AnmerkungsNamenskollisionTests
{
    private const string Anzeigename = "a⟨U+202E⟩b.txt";
    private const string Rohform = "a\u202eb.txt";
    private const string NichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";

    private const string Skript = """
        set -e
        printf 'literal\n' > 'a⟨U+202E⟩b.txt'
        printf 'echt\n' > $'a\u202eb.txt'
        git add -A && git commit -q -m "Zwei Namen, ein Anzeigename"
        """;

    [Test]
    [Description("Befund #18: die Anmerkungs-Sperre vergleicht denselben Anzeigenamen wie Diff, Stapel und Ergebnis")]
    public void Wenn_zwei_Dateien_denselben_Anzeigenamen_tragen_dann_wird_die_Dateianmerkung_in_Anzeige_und_Rohform_abgelehnt()
    {
        using var repo = FremdeNamenRepo.AusSkript(Skript, "c1");
        var gr = HakenSperreSprache.Aufruf(repo, "c1");

        var anzeigeform = gr.AnnotiereDatei("c1", Anzeigename, "kollision marke");
        var rohform = gr.AnnotiereDatei("c1", Rohform, "kollision roh");
        var kontrolle = gr.AnnotiereDatei("c1", "normal.txt", "lesbar");

        Assert.That((anzeigeform.Ausgang, anzeigeform.Nummer, anzeigeform.Grund), Is.EqualTo(("ungültig", (int?)null, NichtEindeutig)));
        Assert.That((rohform.Ausgang, rohform.Nummer, rohform.Grund), Is.EqualTo(("ungültig", (int?)null, NichtEindeutig)));
        Assert.That((kontrolle.Ausgang, kontrolle.Nummer), Is.EqualTo(("angelegt", (int?)1)), "Kontrolle: die lesbare Stelle wird angenommen, keine Nummer verbraucht");
        var ergebnis = gr.Beenden();
        Assert.That(ergebnis, Does.Contain("## 1. normal.txt (ganze Datei)"), "nur die lesbare Stelle steht im Ergebnis");
        Assert.That(ergebnis.Split('\n').Count(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)), Is.EqualTo(1), "keine Anmerkung an der mehrdeutigen Stelle");
    }

    [Test]
    [Description("Befund #18: der Haken-Stand (Einzeln) nennt dieselbe Stelle gesperrt — Sperre und Ergebnis laufen nie auseinander")]
    public void Wenn_der_Anzeigename_mehrdeutig_ist_dann_meldet_der_Hakenstand_beide_Stellen_gesperrt()
    {
        using var repo = FremdeNamenRepo.AusSkript(Skript, "c1");
        var gr = HakenSperreSprache.Aufruf(repo, "c1");

        var stellen = gr.StellenMitSperrgrund();
        var diffAnzeigeform = gr.Diff("c1", Anzeigename);
        var diffRohform = gr.Diff("c1", Rohform);

        Assert.That(stellen, Has.Length.EqualTo(2), "Kontrolle: beide Dateien der Kollision stehen im Stand");
        Assert.That(stellen, Has.All.EndsWith("|" + NichtEindeutig));
        Assert.That(diffAnzeigeform.Ausgang, Is.EqualTo("name nicht lesbar"), "der Einzeln-Diff endet am mehrdeutigen Namen wie die Sperre");
        Assert.That(diffRohform.Ausgang, Is.EqualTo("name nicht lesbar"));
    }

    [Test]
    [Description("Befund #18: derselbe Ausgang über die API — POST /api/anmerkungen weist beide Formen mit 400 ab")]
    public async Task Wenn_ueber_die_API_eine_Dateianmerkung_am_mehrdeutigen_Anzeigenamen_angelegt_wird_dann_400_und_nichts_gespeichert()
    {
        using var repo = FremdeNamenRepo.AusSkript(Skript, "c1");
        var hash = repo.Hash("c1");
        var commits = GitLeser.Lesen(new CommitHashes([hash]), repo.Ordner);
        var arbeitsordner = GitLeser.WurzelLesen(repo.Ordner);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        await using var server = await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), new GitUebersichtsquelle(commits, arbeitsordner), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
        using var client = new HttpClient();

        var anzeigeform = await Poste(client, server, hash, "a⟨U+202E⟩b.txt");
        var rohform = await Poste(client, server, hash, "a\u202eb.txt");
        var kontrolle = await Poste(client, server, hash, "normal.txt");

        Assert.That((anzeigeform.Status, anzeigeform.Meldung), Is.EqualTo((HttpStatusCode.BadRequest, NichtEindeutig)));
        Assert.That((rohform.Status, rohform.Meldung), Is.EqualTo((HttpStatusCode.BadRequest, NichtEindeutig)));
        Assert.That(kontrolle.Status, Is.EqualTo(HttpStatusCode.Created), "Kontrolle: die lesbare Stelle wird angenommen");
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    private static async Task<(HttpStatusCode Status, string Meldung)> Poste(HttpClient client, Webserver server, string commit, string datei)
    {
        var koerper = JsonSerializer.Serialize(new Dictionary<string, object?> { ["commit"] = commit, ["datei"] = datei, ["text"] = "x" });
        using var anfrage = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), "api/anmerkungen"));
        anfrage.Content = new StringContent(koerper, Encoding.UTF8);
        anfrage.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        using var antwort = await client.SendAsync(anfrage);
        using var inhalt = JsonDocument.Parse(await antwort.Content.ReadAsStringAsync());
        var hatMeldung = inhalt.RootElement.TryGetProperty("meldung", out var meldung);
        return (antwort.StatusCode, hatMeldung ? meldung.GetString() ?? string.Empty : string.Empty);
    }
}
