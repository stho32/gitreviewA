using System.Diagnostics;

namespace GitReviewA.Browser;

internal static class BrowserStart
{
    public static ProcessStartInfo Fuer(string adresse, string? eigenerBrowser, Plattform plattform)
    {
        if (eigenerBrowser is { Length: > 0 } eigenerBefehl)
        {
            return MitAdresseAlsArgument(eigenerBefehl, adresse);
        }
        return plattform switch
        {
            Plattform.Linux => MitAdresseAlsArgument("xdg-open", adresse),
            Plattform.MacOS => MitAdresseAlsArgument("open", adresse),
            Plattform.Windows => new ProcessStartInfo(adresse) { UseShellExecute = true },
            _ => throw new ArgumentOutOfRangeException(nameof(plattform), plattform, "unbekannte Plattform"),
        };
    }

    public static Plattform DieserRechner()
    {
        if (OperatingSystem.IsWindows())
        {
            return Plattform.Windows;
        }
        if (OperatingSystem.IsMacOS())
        {
            return Plattform.MacOS;
        }
        return Plattform.Linux;
    }

    private static ProcessStartInfo MitAdresseAlsArgument(string befehl, string adresse)
    {
        var start = new ProcessStartInfo(befehl)
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        start.ArgumentList.Add(adresse);
        return start;
    }
}
