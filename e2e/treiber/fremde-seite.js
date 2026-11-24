'use strict';
// Treiber fremde Webseite: ein eigener Server auf `localhost:<anderer Port>`, dessen Seite Anfragen an gitreviewA schickt.
const http = require('http');

/**
 * Startet einen Server, dessen Startseite `skript` ausführt; `ziel` steht im Skript als Konstante ZIEL.
 * Liefert Adresse und eine Funktion zum Stoppen.
 */
function fremdeSeiteStarten(ziel, skript) {
  const seite = `<!doctype html><meta charset="utf-8"><title>fremd</title><script>const ZIEL = ${JSON.stringify(ziel)};\n${skript}</script>`;
  const server = http.createServer((anfrage, antwort) => {
    antwort.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
    antwort.end(seite);
  });
  return new Promise(gestartet => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const stoppen = () => new Promise(fertig => {
        server.closeAllConnections();
        server.close(() => fertig());
      });
      gestartet({ adresse: `http://localhost:${port}/`, stoppen });
    });
  });
}

module.exports = { fremdeSeiteStarten };
