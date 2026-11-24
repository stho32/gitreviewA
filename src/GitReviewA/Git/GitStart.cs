using System.Diagnostics;
using System.Text;

namespace GitReviewA.Git;

/// <summary>
/// Jeder git-Aufruf beginnt hier: das geprüfte Repo ist fremd, und seine Konfiguration darf keine Programme starten.
/// Der Aufrufer hängt nur noch Unterbefehl und Argumente an.
/// </summary>
internal static class GitStart
{
    public static ProcessStartInfo Im(string arbeitsordner)
    {
        var start = new ProcessStartInfo("git")
        {
            WorkingDirectory = arbeitsordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("log.showSignature=false");
        start.Environment["GIT_TERMINAL_PROMPT"] = "0";
        return start;
    }
}
