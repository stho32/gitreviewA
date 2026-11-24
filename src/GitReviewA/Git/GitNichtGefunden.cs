namespace GitReviewA.Git;

/// <summary>git ließ sich nicht starten — etwa weil kein <c>git</c> im Suchpfad liegt; eigener Typ für den Aufrufgrund.</summary>
internal sealed class GitNichtGefunden(string meldung) : GitFehler(meldung);
