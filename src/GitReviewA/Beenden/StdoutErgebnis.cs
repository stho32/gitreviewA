using System.Text;

namespace GitReviewA.Beenden;

/// <summary>stdout gehört allein dem Ergebnis: UTF-8 ohne BOM, direkt auf den Strom, vollständig geleert.</summary>
internal static class StdoutErgebnis
{
    private static readonly UTF8Encoding Utf8OhneBom = new(encoderShouldEmitUTF8Identifier: false);

    public static void Schreibe(string ergebnis)
    {
        using var stdout = Console.OpenStandardOutput();
        stdout.Write(Utf8OhneBom.GetBytes(ergebnis));
        stdout.Flush();
    }
}
