'use strict';
const path = require('path');

// Der Ausgabeordner von `dotnet build` (Gate: Build vor E2E); GITREVIEWA_DLL ersetzt ihn für Proben aus einer Kopie.
const STANDARD_PFAD = path.resolve(__dirname, '../../src/GitReviewA/bin/Debug/net10.0/gitreviewA.dll');

function programmPfad() {
  const ersatzPfad = process.env.GITREVIEWA_DLL;
  if (ersatzPfad) {
    return ersatzPfad;
  }
  return STANDARD_PFAD;
}

module.exports = { programmPfad };
