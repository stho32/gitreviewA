using System.Diagnostics;
using System.Text;

namespace GitReviewA.Git;

/// <summary>
/// Jeder git-Aufruf beginnt hier: das geprüfte Repo ist fremd, seine Konfiguration darf keine Programme starten,
/// seine Ersatzrefs (refs/replace) keinen anderen Inhalt unter einem angezeigten Hash unterschieben
/// und seine Einstellungen und Attribute keine Dateien kürzen oder Änderungen als binär verbergen (Attribute weder aus dem Baum
/// noch aus `core.attributesFile`; nur `.git/info/attributes` lässt sich nicht abschalten — dafür „als Text zeigen“ im Diff).
/// Der Aufrufer hängt nur noch Unterbefehl und Argumente an.
/// </summary>
internal static class GitStart
{
    private const string Leerbaum = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

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
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("diff.relative=false");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("core.bigFileThreshold=512m");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("core.attributesFile=");
        start.ArgumentList.Add($"--attr-source={Leerbaum}");
        start.Environment["GIT_TERMINAL_PROMPT"] = "0";
        start.Environment["GIT_NO_REPLACE_OBJECTS"] = "1";
        return start;
    }
}
