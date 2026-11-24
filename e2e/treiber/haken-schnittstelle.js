'use strict';
// Treiber API „Datei abhaken“: setzt Haken und liest den Stand über `/api/haken`, mit frei wählbaren Kopfzeilen.
const { senden } = require('./http.js');

/** Setzt einen Haken; `rohKoerper` statt JSON, `origin`, `host`, `inhaltstyp` (`null` = ohne Kopfzeile), `methode`. */
async function hakenSetzen(adresse, haken, { origin, host, inhaltstyp = 'application/json', methode = 'POST', rohKoerper } = {}) {
  let koerper = rohKoerper;
  if (koerper === undefined) {
    koerper = JSON.stringify(haken);
  }
  let typ = inhaltstyp;
  if (typ === null) {
    typ = undefined;
  }
  const antwort = await senden(adresse, '/api/haken', { methode, host, kopf: { Origin: origin, 'Content-Type': typ }, koerper });
  return { status: antwort.status, ...jsonOderLeer(antwort.koerper) };
}

async function standLesen(adresse, host) {
  const antwort = await senden(adresse, '/api/haken', { methode: 'GET', host });
  return { status: antwort.status, text: antwort.koerper, ...jsonOderLeer(antwort.koerper) };
}

function jsonOderLeer(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

module.exports = { hakenSetzen, standLesen };
