'use strict';
// Treiber API: rohe HTTP-Anfragen, damit Host, Origin, Methode und Inhaltstyp frei gesetzt werden können.
const http = require('http');
const net = require('net');

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
    const optionen = { host: ziel.hostname, port: ziel.port, path: `${ziel.pathname}${ziel.search}`, method: methode, headers: kopfzeilen, agent: false };
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

const HALB_GESENDET_WARTEN_MS = 500;

/**
 * Sendet Kopfzeilen mit `Content-Length: laenge`, aber nur `teil` des Körpers, und hält die Verbindung offen.
 * Wartet, bis der Server antwortet oder `HALB_GESENDET_WARTEN_MS` vergangen sind — so hat der Server die Kopfzeilen
 * gesehen, auch wenn er (richtig) auf den Rest des Körpers wartet. Liefert eine Funktion, die die Verbindung schließt.
 */
function halbSenden(adresse, pfad, { laenge, teil }) {
  const ziel = new URL(pfad, adresse);
  return new Promise((verbunden, fehlgeschlagen) => {
    const verbindung = net.connect({ host: ziel.hostname, port: Number(ziel.port) }, () => {
      const kopf = `POST ${ziel.pathname} HTTP/1.1\r\nHost: ${ziel.host}\r\nContent-Type: application/json\r\nContent-Length: ${laenge}\r\n\r\n`;
      verbindung.write(kopf + teil);
      const schliessen = () => verbindung.destroy();
      const frist = setTimeout(() => verbunden(schliessen), HALB_GESENDET_WARTEN_MS);
      verbindung.once('data', () => {
        clearTimeout(frist);
        verbunden(schliessen);
      });
    });
    verbindung.on('error', () => {});
    verbindung.once('error', fehlgeschlagen);
  });
}

module.exports = { anfrage, senden, halbSenden };
