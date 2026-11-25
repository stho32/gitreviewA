using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Text;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Server;

/// <summary>
/// Befundkarte #55: fremde Herkunft auf lesenden <c>/api/</c>-Anfragen (L6) und Pfadvarianten (L15).
/// Die Proben senden rohe Anfragen an den echten Server, damit Schreibweise, Prozentkodierung und
/// Punktsegmente so ankommen, wie ein fremder Browser sie sendet — der HttpClient normalisiert sie weg.
/// </summary>
public class LeseherkunftTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    private static readonly string[] ApiEndpunkte =
    [
        "/api/commits",
        "/api/zustand",
        "/api/anmerkungen",
        "/api/haken",
        "/api/ergebnis",
        $"/api/commits/{HashA}/dateien",
    ];

    /// <summary>Pfad-Schreibweisen, die die Routenauswahl heute auf einen <c>/api/</c>-Endpunkt abbildet.</summary>
    private static readonly string[] ErreichendeVarianten =
    [
        "/API/zustand",
        "/Api/Zustand",
        "/api/zustand/",
        "/api/%2e%2e/api/zustand",
        "/api/./zustand",
        "/api/zustand/../zustand",
        "/%61pi/zustand",
        "/ap%69/zustand",
        "/%41PI/zustand",
        "/api/%2e/zustand",
    ];

    /// <summary>Pfad-Schreibweisen, die die Routenauswahl schon heute nicht trifft.</summary>
    private static readonly string[] NichterreichendeVarianten =
    [
        "//api/zustand",
        "/api//zustand",
        "/api/..%2fapi/zustand",
        "/api%2fzustand",
        "/%2fapi/zustand",
        "/api/zustand%2f",
    ];

    [TestCaseSource(nameof(ApiEndpunkte))]
    public async Task Wenn_GET_auf_api_mit_fremdem_Origin_dann_403_ohne_Inhalt(string pfad)
    {
        await using var server = await StarteServer();

        var (status, _, koerper) = await RoheAnfrage(server, pfad, ("Origin", "http://evil.example"));

        Assert.That(status, Is.EqualTo(403));
        Assert.That(koerper, Does.Not.Contain(HashA));
    }

    [Test]
    public async Task Wenn_GET_auf_api_mit_Origin_null_oder_Variante_dann_403()
    {
        await using var server = await StarteServer();
        var port = new Uri(server.Adresse).Port;
        var fremdeOrigins = new[]
        {
            "null",
            "http://evil.example",
            $"http://localhost:{port}",
            $"https://127.0.0.1:{port}",
            $"http://127.0.0.1:{port + 1}",
            $"http://127.0.0.1:{port}/",
            $"http://127.0.0.1:{port}.evil.example",
            "HTTP://127.0.0.1:" + port.ToString(CultureInfo.InvariantCulture),
        };

        foreach (var origin in fremdeOrigins)
        {
            var (status, _, _) = await RoheAnfrage(server, "/api/commits", ("Origin", origin));
            Assert.That(status, Is.EqualTo(403), $"Origin „{origin}“");
        }
    }

    [Test]
    public async Task Wenn_GET_auf_api_ohne_oder_mit_eigenem_Origin_dann_200()
    {
        await using var server = await StarteServer();
        var port = new Uri(server.Adresse).Port;

        var (ohneOrigin, _, ohneKoerper) = await RoheAnfrage(server, "/api/commits");
        var (mitEigenemOrigin, _, eigenerKoerper) = await RoheAnfrage(server, "/api/commits", ("Origin", $"http://127.0.0.1:{port}"));

        Assert.That(ohneOrigin, Is.EqualTo(200));
        Assert.That(mitEigenemOrigin, Is.EqualTo(200));
        Assert.That(eigenerKoerper, Is.EqualTo(ohneKoerper));
    }

    [Test]
    public async Task Wenn_GET_auf_api_mit_doppeltem_Origin_auch_eigenem_dann_403()
    {
        await using var server = await StarteServer();
        var port = new Uri(server.Adresse).Port;

        var (status, _, _) = await RoheAnfrage(
            server,
            "/api/commits",
            ("Origin", $"http://127.0.0.1:{port}"),
            ("Origin", "http://evil.example"));

        Assert.That(status, Is.EqualTo(403));
    }

    [TestCase("cross-site", 403)]
    [TestCase("Cross-Site", 403)]
    [TestCase("same-origin", 200)]
    [TestCase("same-site", 200)]
    [TestCase("none", 200)]
    public async Task Wenn_GET_auf_api_mit_Sec_Fetch_Site_dann_nach_Herkunft(string wert, int erwartet)
    {
        await using var server = await StarteServer();

        var (status, _, _) = await RoheAnfrage(server, "/api/commits", ("Sec-Fetch-Site", wert));

        Assert.That(status, Is.EqualTo(erwartet));
    }

    [Test]
    public async Task Wenn_GET_auf_api_mit_cross_site_und_eigenem_Origin_dann_403()
    {
        await using var server = await StarteServer();
        var port = new Uri(server.Adresse).Port;

        var (status, _, _) = await RoheAnfrage(
            server,
            "/api/commits",
            ("Origin", $"http://127.0.0.1:{port}"),
            ("Sec-Fetch-Site", "cross-site"));

        Assert.That(status, Is.EqualTo(403));
    }

    [Test]
    public async Task Wenn_GET_auf_api_mit_zwei_Sec_Fetch_Site_Koepfen_dann_403()
    {
        await using var server = await StarteServer();

        var (status, _, _) = await RoheAnfrage(
            server,
            "/api/commits",
            ("Sec-Fetch-Site", "same-origin"),
            ("Sec-Fetch-Site", "same-origin"));

        Assert.That(status, Is.EqualTo(403));
    }

    [Test]
    public async Task Wenn_GET_auf_Nicht_api_Pfad_dann_bleibt_die_Oberflaeche_erreichbar()
    {
        await using var server = await StarteServer();

        var (startseite, _, _) = await RoheAnfrage(server, "/");
        var (stil, _, _) = await RoheAnfrage(server, "/kd-tokens.css");

        Assert.That(startseite, Is.EqualTo(200));
        Assert.That(stil, Is.EqualTo(200));
    }

    [TestCaseSource(nameof(ErreichendeVarianten))]
    public async Task Wenn_Pfadvariante_einen_Endpunkt_erreicht_dann_mit_fremdem_Origin_403(string pfad)
    {
        await using var server = await StarteServer();

        var (ohneOrigin, _, _) = await RoheAnfrage(server, pfad);
        var (mitFremdemOrigin, _, koerper) = await RoheAnfrage(server, pfad, ("Origin", "http://evil.example"));

        Assert.That(ohneOrigin, Is.EqualTo(200), $"„{pfad}“ erreicht keinen Endpunkt");
        Assert.That(mitFremdemOrigin, Is.EqualTo(403), $"„{pfad}“ umgeht die Herkunftsprüfung");
        Assert.That(koerper, Does.Not.Contain("\"zustand\""));
    }

    [TestCaseSource(nameof(NichterreichendeVarianten))]
    public async Task Wenn_Pfad_keinen_Endpunkt_trifft_dann_404_und_mit_fremdem_Origin_kein_Inhalt(string pfad)
    {
        await using var server = await StarteServer();

        var (ohneOrigin, _, _) = await RoheAnfrage(server, pfad);
        var (mitFremdemOrigin, _, koerper) = await RoheAnfrage(server, pfad, ("Origin", "http://evil.example"));

        Assert.That(ohneOrigin, Is.EqualTo(404));
        Assert.That(mitFremdemOrigin, Is.EqualTo(403).Or.EqualTo(404));
        Assert.That(koerper, Does.Not.Contain("\"zustand\""));
    }

    [TestCaseSource(nameof(ApiEndpunkte))]
    public async Task Wenn_api_Endpunkt_antwortet_dann_tragen_alle_Antworten_die_Schutzkoepfe(string pfad)
    {
        await using var server = await StarteServer();

        var (status, kopf, _) = await RoheAnfrage(server, pfad);
        var (statusFremd, kopfFremd, _) = await RoheAnfrage(server, pfad, ("Origin", "http://evil.example"));

        Assert.That(status, Is.EqualTo(200));
        Assert.That(statusFremd, Is.EqualTo(403));
        AssertSchutzkoepfe(kopf, pfad);
        AssertSchutzkoepfe(kopfFremd, pfad);
    }

    private static void AssertSchutzkoepfe(string kopf, string pfad)
    {
        Assert.Multiple(() =>
        {
            Assert.That(kopf, Does.Contain("Content-Security-Policy: default-src 'self'"), pfad);
            Assert.That(kopf, Does.Contain("frame-ancestors 'none'"), pfad);
            Assert.That(kopf, Does.Contain("X-Content-Type-Options: nosniff"), pfad);
            Assert.That(kopf, Does.Contain("Cache-Control: no-store"), pfad);
            Assert.That(kopf, Does.Not.Contain("Access-Control-Allow-"), pfad);
        });
    }

    private static async Task<Webserver> StarteServer()
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Anna Beispiel", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), TestUebersichtsquelle.Leer(), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static async Task<(int Status, string Kopf, string Koerper)> RoheAnfrage(Webserver server, string ziel, params (string Name, string Wert)[] kopfzeilen)
    {
        var port = new Uri(server.Adresse).Port;
        using var verbindung = new TcpClient();
        await verbindung.ConnectAsync(IPAddress.Loopback, port);
        using var strom = verbindung.GetStream();
        var zeilen = new List<string> { $"GET {ziel} HTTP/1.1", $"Host: 127.0.0.1:{port}", "Connection: close" };
        zeilen.AddRange(kopfzeilen.Select(kopf => $"{kopf.Name}: {kopf.Wert}"));
        await strom.WriteAsync(Encoding.ASCII.GetBytes(string.Join("\r\n", zeilen) + "\r\n\r\n"));
        using var puffer = new MemoryStream();
        await strom.CopyToAsync(puffer);
        var text = Encoding.UTF8.GetString(puffer.ToArray());
        var trenner = text.IndexOf("\r\n\r\n", StringComparison.Ordinal);
        string kopftext;
        string koerper;
        if (trenner < 0)
        {
            kopftext = text;
            koerper = string.Empty;
        }
        else
        {
            kopftext = text[..trenner];
            koerper = text[(trenner + 4)..];
        }
        var status = int.Parse(kopftext.Split("\r\n")[0].Split(' ')[1], CultureInfo.InvariantCulture);
        return (status, kopftext, koerper);
    }
}
