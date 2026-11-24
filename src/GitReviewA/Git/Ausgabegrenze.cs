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
}
