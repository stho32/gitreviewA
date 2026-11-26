using System.Diagnostics.CodeAnalysis;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Ansicht;

/// <summary>
/// Interaction „Angesehen festhalten“ (B4001): prüft die gemeldeten Stellen gegen die Übersicht — derselbe Schlüssel wie beim
/// Haken (voller Hash der Auswahl und die Datei dieses Commits) — und hält sie im <see cref="Ansichtsstand"/>. Je Anfrage
/// höchstens die Stellen einer Datei (bis 200 Commits, R00041); mehr, Unbekanntes oder Gesperrtes lehnt die ganze Anfrage ab,
/// ohne etwas zu merken. Die Debug-Zeile nennt nur die Anzahl, nie einen Namen.
/// </summary>
internal sealed class AngesehenInteractor
{
    public const int HoechsteStellenJeAnfrage = 200;
    private const string Kontext = "Angesehen";
    private const string NichtLesbarGrund = "Übersicht der Dateien konnte nicht gelesen werden";

    private readonly GemerkteUebersicht uebersicht;
    private readonly Ansichtsstand stand;
    private readonly StderrProtokoll protokoll;

    public AngesehenInteractor(GemerkteUebersicht uebersicht, Ansichtsstand stand, StderrProtokoll protokoll)
    {
        this.uebersicht = uebersicht;
        this.stand = stand;
        this.protokoll = protokoll;
    }

    public Angesehenergebnis Markiere(Ansichtanfrage? anfrage)
    {
        if (!VersucheStellenZuLesen(anfrage, out var stellen, out var formgrund))
        {
            return Abgelehnt(Angesehenausgang.Ungueltig, formgrund);
        }
        if (!uebersicht.VersucheZuLesen(protokoll, Kontext, NichtLesbarGrund, out var gelesen, out var lesegrund))
        {
            return Abgelehnt(Angesehenausgang.NichtLesbar, lesegrund);
        }
        foreach (var stelle in stellen)
        {
            var gehoertZurAuswahl = HakenPruefer.GehoertZurAuswahl(stelle, gelesen, out var stellengrund);
            if (!gehoertZurAuswahl)
            {
                return Abgelehnt(Angesehenausgang.Ungueltig, stellengrund);
            }
        }
        stand.Markiere(stellen);
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"{stellen.Count} Stellen angesehen");
        return new Angesehenergebnis(Angesehenausgang.Markiert, stand.Anzahl, string.Empty);
    }

    public IReadOnlyList<Stelle> Angesehen()
    {
        return stand.Angesehen();
    }

    private static bool VersucheStellenZuLesen(Ansichtanfrage? anfrage, out List<Stelle> stellen, out string grund)
    {
        stellen = [];
        if (!VersucheStellenlisteZuLesen(anfrage, out var gelesen, out grund))
        {
            return false;
        }
        foreach (var eintrag in gelesen)
        {
            if (!VersucheStelleZuLesen(eintrag, out var stelle, out grund))
            {
                return false;
            }
            stellen.Add(stelle);
        }
        return true;
    }

    private static bool VersucheStellenlisteZuLesen(Ansichtanfrage? anfrage, [NotNullWhen(true)] out List<Ansichtsstelle>? gelesen, out string grund)
    {
        gelesen = null;
        grund = string.Empty;
        if (anfrage?.Stellen is null)
        {
            grund = "stellen fehlt (Liste aus Stellen)";
            return false;
        }
        if (anfrage.Stellen.Count == 0)
        {
            grund = "stellen ist leer";
            return false;
        }
        if (anfrage.Stellen.Count > HoechsteStellenJeAnfrage)
        {
            grund = $"höchstens {HoechsteStellenJeAnfrage} Stellen je Anfrage";
            return false;
        }
        gelesen = anfrage.Stellen;
        return true;
    }

    private static bool VersucheStelleZuLesen(Ansichtsstelle? eintrag, out Stelle stelle, out string grund)
    {
        stelle = new Stelle(string.Empty, string.Empty);
        grund = string.Empty;
        if (eintrag?.Commit is not { Length: > 0 } commit)
        {
            grund = "commit fehlt";
            return false;
        }
        if (eintrag.Datei is not { Length: > 0 } datei)
        {
            grund = "datei fehlt";
            return false;
        }
        stelle = new Stelle(commit, datei);
        return true;
    }

    private Angesehenergebnis Abgelehnt(Angesehenausgang ausgang, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {grund}");
        return new Angesehenergebnis(ausgang, stand.Anzahl, grund);
    }
}
