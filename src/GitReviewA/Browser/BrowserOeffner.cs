using System.ComponentModel;
using System.Diagnostics;

namespace GitReviewA.Browser;

internal static class BrowserOeffner
{
    /// <summary>Startet den Browser und wartet nicht auf ihn; seine Ausgaben werden verworfen, damit stdout dem Ergebnis bleibt.</summary>
    public static void Oeffnen(ProcessStartInfo start)
    {
        var adresse = AdresseVon(start);
        try
        {
            var browser = Process.Start(start);
            if (browser is not null && start.RedirectStandardOutput)
            {
                browser.OutputDataReceived += (_, _) => { };
                browser.ErrorDataReceived += (_, _) => { };
                browser.BeginOutputReadLine();
                browser.BeginErrorReadLine();
            }
        }
        catch (Win32Exception fehler)
        {
            throw new BrowserFehler($"Browser ließ sich nicht öffnen ({fehler.Message}) — bitte {adresse} selbst aufrufen.");
        }
    }

    private static string AdresseVon(ProcessStartInfo start)
    {
        if (start.UseShellExecute)
        {
            return start.FileName;
        }
        return start.ArgumentList[0];
    }
}
