namespace GitReviewA.Git;

/// <summary>
/// Die Bytegrenze, bis zu der die Ausgabe eines `git`-Aufrufs gelesen wird. Das geprüfte Repo ist fremd: eine feindlich große Datei
/// darf den Lauf nicht lahmlegen, deshalb liest der Server den Diff nur bis hierher und meldet darüber den Ausgang „zu groß“ statt
/// still zu kürzen. Der Produktwert steht in <see cref="Standard"/>, Tests setzen über den Konstruktor einen kleinen Wert.
/// </summary>
internal sealed record Ausgabegrenze(long Bytes)
{
    /// <summary>8 MiB — PO-Entscheidung 2026-11-24 (R00017 Frage 2, kanbanD `GRENZE_EINZELN`, ADR-0032 N5).</summary>
    public static readonly Ausgabegrenze Standard = new(8_388_608);

    /// <summary>Die Grenze als Text (eine Stelle für jede Meldung, die sie nennt): MiB, unter einem MiB in KiB — ein Testparameter von 4 KiB heißt dann „4 KiB“.</summary>
    public static string AlsText(long bytes)
    {
        var mib = bytes / (1024.0 * 1024.0);
        if (mib >= 1)
        {
            return $"{mib.ToString("0.#", System.Globalization.CultureInfo.InvariantCulture)} MiB";
        }
        var kib = bytes / 1024.0;
        return $"{kib.ToString("0.#", System.Globalization.CultureInfo.InvariantCulture)} KiB";
    }
}
