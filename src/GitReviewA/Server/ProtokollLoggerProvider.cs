using GitReviewA.Protokoll;

namespace GitReviewA.Server;

/// <summary>Leitet Meldungen von ASP.NET Core und Kestrel in das eine Protokoll auf stderr — nie auf stdout.</summary>
internal sealed class ProtokollLoggerProvider(StderrProtokoll protokoll) : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName)
    {
        return new ProtokollLogger(protokoll, categoryName);
    }

    public void Dispose()
    {
    }

    private sealed class ProtokollLogger(StderrProtokoll protokoll, string kategorie) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return logLevel != LogLevel.None && Stufe(logLevel) >= protokoll.Mindeststufe;
        }

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
            {
                return;
            }
            var meldung = formatter(state, exception);
            if (exception is null)
            {
                protokoll.Melde(Stufe(logLevel), kategorie, meldung);
                return;
            }
            protokoll.Melde(Stufe(logLevel), kategorie, $"{meldung} ({exception.GetType().Name}: {exception.Message})");
        }

        private static Protokollstufe Stufe(LogLevel logLevel)
        {
            return logLevel switch
            {
                LogLevel.Trace or LogLevel.Debug => Protokollstufe.Debug,
                LogLevel.Information => Protokollstufe.Information,
                LogLevel.Warning => Protokollstufe.Warnung,
                LogLevel.Error or LogLevel.Critical => Protokollstufe.Fehler,
                _ => throw new ArgumentOutOfRangeException(nameof(logLevel), logLevel, "unbekannte Log-Stufe"),
            };
        }
    }
}
