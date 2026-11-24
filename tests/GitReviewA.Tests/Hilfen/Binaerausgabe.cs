namespace GitReviewA.Tests.Hilfen;

/// <summary>Wege, auf denen ein fremdes Repo Textdateien in `*.txt` von git als binär ausgeben lässt — gemeinsam für Dateiliste und Diff.</summary>
internal static class Binaerausgabe
{
    public const string OhneAbschaltung = "ohne Abschaltung";

    public static void Einstellen(WegwerfRepo repo, string abschaltung)
    {
        if (abschaltung == ".gitattributes -diff")
        {
            repo.SchreibeDatei(".gitattributes", "*.txt -diff\n");
        }
        if (abschaltung == ".gitattributes binary")
        {
            repo.SchreibeDatei(".gitattributes", "*.txt binary\n");
        }
        if (abschaltung == ".gitattributes Treiber mit binary=true")
        {
            repo.SchreibeDatei(".gitattributes", "*.txt diff=verbergen\n");
            repo.Git("config", "diff.verbergen.binary", "true");
        }
        if (abschaltung == "config core.bigFileThreshold=1")
        {
            repo.Git("config", "core.bigFileThreshold", "1");
        }
        if (abschaltung == "config core.attributesFile")
        {
            var datei = Path.Combine(repo.Ordner, ".git", "fremde-attribute");
            File.WriteAllText(datei, "*.txt -diff\n");
            repo.Git("config", "core.attributesFile", datei);
        }
    }
}
