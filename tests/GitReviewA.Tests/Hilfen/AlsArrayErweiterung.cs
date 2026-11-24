using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Hilfen;

internal static class AlsArrayErweiterung
{
    public static string[] AlsArray(this CommitHashes hashes)
    {
        var liste = new List<string>();
        foreach (var hash in hashes)
        {
            liste.Add(hash);
        }
        return liste.ToArray();
    }

    public static string[] AlsArray(this Bereiche bereiche)
    {
        var liste = new List<string>();
        foreach (var bereich in bereiche)
        {
            liste.Add(bereich);
        }
        return liste.ToArray();
    }

    public static Commitzeile[] AlsArray(this Commitzeilen zeilen)
    {
        var liste = new List<Commitzeile>();
        foreach (var zeile in zeilen)
        {
            liste.Add(zeile);
        }
        return liste.ToArray();
    }

    public static Dateiaenderung[] AlsArray(this Dateiaenderungen aenderungen)
    {
        var liste = new List<Dateiaenderung>();
        foreach (var aenderung in aenderungen)
        {
            liste.Add(aenderung);
        }
        return liste.ToArray();
    }

    public static Stelle[] AlsArray(this Dateiuebersicht uebersicht)
    {
        var liste = new List<Stelle>();
        foreach (var stelle in uebersicht)
        {
            liste.Add(stelle);
        }
        return liste.ToArray();
    }

    public static Elternzeile[] AlsArray(this Elternfolge folge)
    {
        var liste = new List<Elternzeile>();
        foreach (var zeile in folge)
        {
            liste.Add(zeile);
        }
        return liste.ToArray();
    }

    public static NettoDatei[] AlsArray(this NettoDateiliste liste)
    {
        var dateien = new List<NettoDatei>();
        foreach (var datei in liste)
        {
            dateien.Add(datei);
        }
        return dateien.ToArray();
    }
}
