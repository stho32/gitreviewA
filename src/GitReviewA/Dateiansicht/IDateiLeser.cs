using GitReviewA.Git;

namespace GitReviewA.Dateiansicht;

/// <summary>Der Inhalt einer gelesenen Datei samt dem vom Betriebssystem aufgelösten Pfad — alles aus denselben Bytes (R00043, L2).</summary>
internal sealed record Dateilesung(string Angabe, byte[] Bytes, string EchterPfad);

/// <summary>Der eine Leseort für Dateien vom Datenträger; ein Test reicht einen Haken zwischen Prüfung und Öffnen ein.</summary>
internal interface IDateiLeser
{
    /// <summary>Bytes der genannten Datei oder der Grund, warum sie nicht zeigbar ist.</summary>
    Lesergebnis Lies(string angabe, Ausgabegrenze grenze);
}

/// <summary>Gelesen oder abgelehnt — beides mit demselben Angabewortlaut, damit die stderr-Zeile ihn mit Marken nennt.</summary>
internal sealed record Lesergebnis(Dateilesung? Lesung, Quellengrund? Grund)
{
    public bool IstGelesen => Lesung is not null;

    public static Lesergebnis Gelesen(Dateilesung lesung)
    {
        return new Lesergebnis(lesung, null);
    }

    public static Lesergebnis Abgelehnt(Quellengrund grund)
    {
        return new Lesergebnis(null, grund);
    }
}