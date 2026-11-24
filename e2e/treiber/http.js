'use strict';
// Treiber API: rohe HTTP-Anfragen, damit Host, Origin, Methode und Inhaltstyp frei gesetzt werden können.
const http = require('http');

function anfrage(adresse, pfad, hostKopf) {
  return senden(adresse, pfad, { methode: 'GET', host: hostKopf });
}

/** Sendet eine Anfrage; `kopf` ergänzt die Kopfzeilen, ein Wert `undefined` lässt die Kopfzeile weg. */
function senden(adresse, pfad, { methode, host, kopf = {}, koerper } = {}) {
  const ziel = new URL(pfad, adresse);
  const kopfzeilen = { Host: host || ziel.host };
  for (const [name, wert] of Object.entries(kopf)) {
    if (wert !== undefined) {
      kopfzeilen[name] = wert;
    }
  }
  return new Promise((beantwortet, fehlgeschlagen) => {
    const optionen = { host: ziel.hostname, port: ziel.port, path: ziel.pathname, method: methode, headers: kopfzeilen, agent: false };
    const anfrageObjekt = http.request(optionen, antwort => {
      let antwortKoerper = '';
      antwort.setEncoding('utf8');
      antwort.on('data', daten => { antwortKoerper += daten; });
      antwort.on('end', () => beantwortet({ status: antwort.statusCode, koerper: antwortKoerper }));
    });
    anfrageObjekt.on('error', fehlgeschlagen);
    if (koerper !== undefined) {
      anfrageObjekt.write(koerper);
    }
    anfrageObjekt.end();
  });
}

module.exports = { anfrage, senden };
