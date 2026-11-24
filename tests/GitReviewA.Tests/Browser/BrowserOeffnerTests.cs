using System.Diagnostics;
using System.Runtime.Versioning;
using GitReviewA.Browser;

namespace GitReviewA.Tests.Browser;

[Platform(Exclude = "Win", Reason = "Browser-Attrappe ist ein Shell-Skript")]
[UnsupportedOSPlatform("windows")]
public class BrowserOeffnerTests
{
    private const string Adresse = "http://127.0.0.1:5123/";

    [Test]
    public void Wenn_eigener_Browser_ein_Skript_dann_genau_ein_Aufruf_mit_der_Adresse()
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-browser-").FullName;
        try
        {
            var protokoll = Path.Combine(ordner, "aufrufe.txt");
            var skript = AufzeichnendesSkript(ordner, protokoll);

            BrowserOeffner.Oeffnen(BrowserStart.Fuer(Adresse, skript, Plattform.Linux));

            var aufrufe = WarteAufAufrufe(protokoll);
            Assert.That(aufrufe, Is.EqualTo(new[] { $"1 {Adresse}" }));
        }
        finally
        {
            Directory.Delete(ordner, recursive: true);
        }
    }

    [Test]
    public void Wenn_Browserbefehl_nicht_vorhanden_dann_BrowserFehler()
    {
        var start = BrowserStart.Fuer(Adresse, "/gibt/es/nicht/browser", Plattform.Linux);

        var fehler = Assert.Throws<BrowserFehler>(() => BrowserOeffner.Oeffnen(start));

        Assert.That(fehler.Message, Does.Contain(Adresse));
    }

    private static string AufzeichnendesSkript(string ordner, string protokoll)
    {
        var skript = Path.Combine(ordner, "browser.sh");
        File.WriteAllText(skript, $"#!/bin/sh\nprintf '%s' \"$#\" >> '{protokoll}'\nfor a in \"$@\"; do printf ' %s' \"$a\" >> '{protokoll}'; done\nprintf '\\n' >> '{protokoll}'\n");
        File.SetUnixFileMode(skript, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return skript;
    }

    private static string[] WarteAufAufrufe(string protokoll)
    {
        var frist = Stopwatch.StartNew();
        while (!File.Exists(protokoll) || !File.ReadAllText(protokoll).EndsWith('\n'))
        {
            if (frist.Elapsed > TimeSpan.FromSeconds(5))
            {
                Assert.Fail("das Browser-Skript wurde nicht aufgerufen");
            }
            Thread.Sleep(20);
        }
        return File.ReadAllLines(protokoll);
    }
}
