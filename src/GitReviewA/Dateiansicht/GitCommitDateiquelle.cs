using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Dateiansicht;

/// <summary>
/// Die Commitquelle über git (R00046, B4262/B4263): jeder Aufruf läuft über <see cref="GitStart"/> (keine fremde Konfiguration,
/// keine Ersatzrefs, kein Lazy-Fetch), die Ausgabegrenze hängt an der Aufrufstelle, gelesen wird über den bestehenden Blob-Leser.
/// Das Repository wird einmal festgestellt; ohne Repository oder ohne git bekommt jede Commitquelle den Wortlaut aus R00016.
/// </summary>
internal sealed class GitCommitDateiquelle : ICommitDateiquelle
{
    private const string Datentraeger = "./";

    private readonly string arbeitsordner;
    private readonly Quellenbuchung buchung;
    private string? wurzel;
    private Quellengrund? repogrund;
    private string? startpraefix;

    public GitCommitDateiquelle(string arbeitsordner, Quellenbuchung buchung)
    {
        this.arbeitsordner = arbeitsordner;
        this.buchung = buchung;
    }

    public Commitaufloesung Aufloese(string hashEingabe)
    {
        if (!StelleRepositoryFest())
        {
            return Commitaufloesung.Abgelehnt(repogrund!);
        }
        var vollerHash = GitLeser.RevisionAufloesen(hashEingabe, arbeitsordner);
        if (vollerHash is null)
        {
            var kandidaten = GitLeser.KandidatenAufloesen(hashEingabe, arbeitsordner);
            return Commitaufloesung.Abgelehnt(kandidaten.Anzahl >= 1 ? Quellengrund.CommitMehrdeutig : Quellengrund.CommitNichtGefunden);
        }
        if (!HashpraefixPruefer.PraefixPasst(hashEingabe, vollerHash))
        {
            return Commitaufloesung.Abgelehnt(Quellengrund.CommitMehrdeutig);
        }
        if (GitLeser.ObjectartLesen(vollerHash, arbeitsordner) != "commit")
        {
            return Commitaufloesung.Abgelehnt(Quellengrund.KeinCommit);
        }
        return Commitaufloesung.Erkannt(vollerHash);
    }

    public Eintragsergebnis Eintrag(string vollerHash, string pfad, Ausgabegrenze grenze)
    {
        if (!StelleRepositoryFest())
        {
            return Eintragsergebnis.Abgelehnt(repogrund!);
        }
        var eintrag = GitLeser.EintragLesen(vollerHash, Rootrelativ(pfad), arbeitsordner, grenze);
        if (eintrag is null)
        {
            return Eintragsergebnis.Abgelehnt(Quellengrund.PfadImCommitNichtGefunden);
        }
        return eintrag.Art switch
        {
            Baumart.Verzeichnis => Eintragsergebnis.Abgelehnt(Quellengrund.IstImCommitEinVerzeichnis),
            Baumart.SymbolischerLink => Eintragsergebnis.Abgelehnt(Quellengrund.IstImCommitEinSymbolischerLink),
            Baumart.Submodul => Eintragsergebnis.Abgelehnt(Quellengrund.IstImCommitEinSubmodul),
            _ => Eintragsergebnis.Gefunden(eintrag),
        };
    }

    public Bloblesung Blob(string vollerHash, string pfad, Ausgabegrenze grenze)
    {
        if (!StelleRepositoryFest())
        {
            return Bloblesung.Abgelehnt(repogrund!);
        }
        var inhalt = GitLeser.BlobLesen(vollerHash, pfad, null, arbeitsordner, grenze);
        if (inhalt.UeberschritteneGrenze is not null)
        {
            buchung.Buchen(inhalt.Bytes.LongLength);
            return Bloblesung.Abgelehnt(Quellengrund.ZuGross);
        }
        if (!buchung.Buchen(inhalt.Bytes.LongLength))
        {
            return Bloblesung.Abgelehnt(Quellengrund.ZusammenZuGross);
        }
        return Bloblesung.Gelesen(inhalt.Bytes);
    }

    /// <summary>Ein `./`-Pfad ist relativ zum Startordner, jeder andere relativ zur Wurzel des Repositories (PO Zeile 211).</summary>
    private string Rootrelativ(string pfad)
    {
        if (!pfad.StartsWith(Datentraeger, StringComparison.Ordinal))
        {
            return pfad;
        }
        return Startpraefix() + pfad[Datentraeger.Length..];
    }

    private string Startpraefix()
    {
        if (startpraefix is not null)
        {
            return startpraefix;
        }
        var relativ = Path.GetRelativePath(wurzel!, arbeitsordner).Replace('\\', '/');
        startpraefix = relativ is "." or "" ? string.Empty : relativ + "/";
        return startpraefix;
    }

    /// <summary>Einmal je Lauf: die Wurzel des Arbeitsbaums oder der R00016-Grund (kein Repository, nacktes Repository, kein git).</summary>
    private bool StelleRepositoryFest()
    {
        if (wurzel is not null)
        {
            return true;
        }
        if (repogrund is not null)
        {
            return false;
        }
        try
        {
            wurzel = Reposituation.WurzelOderGrund(arbeitsordner);
            return true;
        }
        catch (Aufruffehler fehler)
        {
            repogrund = fehler.Grund switch
            {
                Aufrufgrund.GitNichtGefunden => Quellengrund.GitNichtGefunden,
                Aufrufgrund.NacktesRepository => Quellengrund.NacktesRepository,
                _ => Quellengrund.KeinRepository,
            };
            return false;
        }
    }
}
