'use strict';
// Treiber API: rohe HTTP-Anfragen, damit der Host-Header frei gesetzt werden kann.
const http = require('http');

function anfrage(adresse, pfad, hostKopf) {
  const ziel = new URL(pfad, adresse);
  return new Promise((beantwortet, fehlgeschlagen) => {
    const optionen = { host: ziel.hostname, port: ziel.port, path: ziel.pathname, headers: { Host: hostKopf || ziel.host } };
    const anfrageObjekt = http.get(optionen, antwort => {
      let koerper = '';
      antwort.on('data', daten => { koerper += daten; });
      antwort.on('end', () => beantwortet({ status: antwort.statusCode, koerper }));
    });
    anfrageObjekt.on('error', fehlgeschlagen);
  });
}

module.exports = { anfrage };
