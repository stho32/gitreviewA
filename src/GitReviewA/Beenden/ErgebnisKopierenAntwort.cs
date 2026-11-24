namespace GitReviewA.Beenden;

/// <summary>Antwort von „Ergebnis kopieren“: das Ergebnis manueller Review als Markdown (Format R00002), derselbe Text wie auf stdout.</summary>
internal sealed record ErgebnisKopierenAntwort(string Ergebnis);