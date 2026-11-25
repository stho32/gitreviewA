using GitReviewA.Haken;

namespace GitReviewA.Zusammen;

/// <summary>
/// Die Dateien der Auswahl, jede einmal, in der Reihenfolge der Quelle (lückenlos die Netto-Änderungen, sonst die erste Erscheinung).
/// <see cref="Beschriftung"/> sagt, ob die Zahlen netto sind.
/// </summary>
internal sealed class NettoDateiliste
{
    public const string LueckenlosBeschriftung = "lückenlos · netto";
    public const string JeCommitBeschriftung = "keine lückenlose Kette · je Commit";

    private readonly NettoDatei[] dateien;

    public NettoDateiliste(bool lueckenlos, IEnumerable<NettoDatei> dateien)
    {
        Lueckenlos = lueckenlos;
        this.dateien = dateien.ToArray();
    }

    public bool Lueckenlos { get; }

    public string Beschriftung => Lueckenlos ? LueckenlosBeschriftung : JeCommitBeschriftung;

    public int Anzahl => dateien.Length;

    public NettoDatei this[int index] => dateien[index];

    /// <summary>Die Einträge mit diesem Anzeigepfad — mehrere bei gleichem Anzeigenamen zweier Rohnamen.</summary>
    public NettoDatei[] MitAnzeigepfad(string anzeigepfad)
    {
        return dateien.Where(datei => datei.Anzeigepfad == anzeigepfad).ToArray();
    }

    /// <summary>Leer, wenn genau ein Eintrag den Anzeigenamen trägt; sonst derselbe Grund, mit dem der Diff den Namen abweist
    /// (R00014). Sperre und Stapel vergleichen damit denselben Schlüssel: den Anzeigenamen.</summary>
    public string Sperrgrund(string anzeigepfad)
    {
        return MitAnzeigepfad(anzeigepfad).Length > 1 ? Sperrgruende.NameNichtEindeutig : string.Empty;
    }

    public IEnumerator<NettoDatei> GetEnumerator()
    {
        return ((IEnumerable<NettoDatei>)dateien).GetEnumerator();
    }
}
