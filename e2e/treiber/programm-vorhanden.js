'use strict';
const fs = require('fs');
const { programmPfad } = require('./programm-pfad.js');

module.exports = function programmVorhanden() {
  const pfad = programmPfad();
  if (!fs.existsSync(pfad)) {
    throw new Error(`gitreviewA ist nicht gebaut: ${pfad} fehlt — zuerst \`dotnet build\` im Wurzelordner.`);
  }
};
