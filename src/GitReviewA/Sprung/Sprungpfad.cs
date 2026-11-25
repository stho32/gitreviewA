using GitReviewA.Fremdtext;
using GitReviewA.Git;

namespace GitReviewA.Sprung;

internal enum Sprungablehnung
{
    Keine,
    StatusGeloescht,
    NameNichtUebergebbar,
    PfadVerlaesstRepository,
}

/// <summary>`AbsoluterPfad` steht genau dann da, wenn die Ablehnung <see cref="Sprungablehnung.Keine"/> ist.</summary>
internal sealed record Sprungpfadergebnis(Sprungablehnung Ablehnung, string? AbsoluterPfad);

/// <summary>
/// Aus der Datei des Commits und der Repositorywurzel den absoluten Pfad des Sprungziels bilden — rein, ohne git und Dateisystem.
/// Kein Sprung bei Status `D` (die Datei steht dann nicht im Arbeitsbaum), bei Rohbytes oder einem Zeichen aus
/// <see cref="UnsichtbareZeichen"/> im neuen **oder** alten Namen (der sichtbare Pfad täuschte sonst über das Ziel) und wenn der
/// Pfad die Wurzel verlässt (ein `..`-Bestandteil oder ein absoluter Pfad).
/// </summary>
internal static class Sprungpfad
{
    private const string Wurzelverlassen = "..";

    public static Sprungpfadergebnis Bilde(Dateiaenderung datei, string repositorywurzel)
    {
        var istImArbeitsbaumGeloescht = datei.Status == "D";
        if (istImArbeitsbaumGeloescht)
        {
            return new Sprungpfadergebnis(Sprungablehnung.StatusGeloescht, null);
        }
        var traegtNichtUebergebbarenNamen = TraegtRohbytes(datei) || TraegtUnsichtbareZeichen(datei);
        if (traegtNichtUebergebbarenNamen)
        {
            return new Sprungpfadergebnis(Sprungablehnung.NameNichtUebergebbar, null);
        }
        var verlaesstDieWurzel = VerlaesstWurzel(datei.Pfad);
        if (verlaesstDieWurzel)
        {
            return new Sprungpfadergebnis(Sprungablehnung.PfadVerlaesstRepository, null);
        }
        return new Sprungpfadergebnis(Sprungablehnung.Keine, Path.Combine(repositorywurzel, datei.Pfad));
    }

    private static bool TraegtRohbytes(Dateiaenderung datei)
    {
        return datei.Rohpfad is not null || datei.RohAlterPfad is not null;
    }

    /// <summary>Bei einer Umbenennung zählt auch der alte Name: er geht als zweiter Pfad an git und sähe im Link anders aus.</summary>
    private static bool TraegtUnsichtbareZeichen(Dateiaenderung datei)
    {
        var neuerNameTraegtUnsichtbares = UnsichtbareZeichen.EnthaeltUnsichtbares(datei.Pfad);
        var alterNameTraegtUnsichtbares = datei.AlterPfad is not null && UnsichtbareZeichen.EnthaeltUnsichtbares(datei.AlterPfad);
        return neuerNameTraegtUnsichtbares || alterNameTraegtUnsichtbares;
    }

    private static bool VerlaesstWurzel(string pfad)
    {
        var istAbsolut = Path.IsPathRooted(pfad);
        if (istAbsolut)
        {
            return true;
        }
        foreach (var teil in pfad.Split('/'))
        {
            var istWurzelverlassen = teil == Wurzelverlassen;
            if (istWurzelverlassen)
            {
                return true;
            }
        }
        return false;
    }
}
