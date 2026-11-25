'use strict';
// Treiber Ordner D (User Story R00043): Dateien außerhalb jedes Repositories, Start der Dateiansicht als echter Prozess.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { programmStarten, adresseAbwarten, programmBeenden } = require('./programm.js');

function ordnerDAnlegen() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-d-'));
  const pfad = name => path.join(ordner, name);
  fs.writeFileSync(pfad('a.sql'), "SELECT 1;\n-- Kommentar\nSELECT 'ä';\n");
  fs.writeFileSync(pfad('crlf.sql'), 'CREATE TABLE t (id int);\r\nINSERT INTO t VALUES (1);\r\n');
  fs.writeFileSync(pfad('ohne-ende.sql'), 'SELECT 2;');
  fs.writeFileSync(pfad('bom.sql'), Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('SELECT 3;\n')]));
  fs.writeFileSync(pfad('leer.sql'), '');
  fs.writeFileSync(pfad('latin1.sql'), Buffer.concat([Buffer.from("SELECT 'caf"), Buffer.from([0xE9]), Buffer.from("';\n")]));
  fs.writeFileSync(pfad('utf16.sql'), Buffer.from([0xFF, 0xFE, 0x53, 0x00, 0x45, 0x00]));
  fs.writeFileSync(pfad('bin.dat'), Buffer.from([0x41, 0x00, 0x42]));
  fs.writeFileSync(pfad('trojan.sql'), 'SELECT 1; -- \u202e;2 TCELES\n');
  fs.writeFileSync(pfad('xss.sql'), '<img src=x onerror=alert(1)>\n');
  fs.writeFileSync(pfad('<b>x<b>.sql'), '<img src=x onerror=alert(1)>\n');
  fs.writeFileSync(pfad('cr.sql'), '-- harmlos\rDROP TABLE x;\n');
  fs.writeFileSync(pfad('-x.sql'), "SELECT '-x';\n");
  fs.writeFileSync(pfad('zeile\numbruch.sql'), 'SELECT 1;\n');
  fs.writeFileSync(pfad('cr\r.sql'), 'SELECT 1;\n');
  fs.writeFileSync(pfad('f\uFFFD.sql'), 'INHALT-FFFD\n');
  fs.writeFileSync(pfad('lang.sql'), Array.from({ length: 30000 }, (_, i) => `SELECT ${i + 1};`).join('\n') + '\n');
  fs.writeFileSync(pfad('breit.sql'), 'x'.repeat(50000) + '\n');
  fs.writeFileSync(pfad('viele.sql'), Array.from({ length: 1000 }, (_, i) => `SELECT ${i + 1};`).join('\n') + '\n');
  fs.mkdirSync(pfad('ordner'));
  fs.mkdirSync(pfad('unter'));
  fs.symlinkSync('/etc/hostname', pfad('link.sql'));
  fs.symlinkSync(pfad('gibtsnicht'), pfad('kaputt.sql'));
  fs.symlinkSync(ordner, pfad('ordnerlink'));
  execFileSync('mkfifo', [pfad('fifo.sql')]);
  fs.copyFileSync(pfad('a.sql'), pfad('gesperrt.sql'));
  fs.chmodSync(pfad('gesperrt.sql'), 0o000);
  return { ordner, pfad };
}

function entfernen(d) {
  try {
    fs.chmodSync(d.pfad('gesperrt.sql'), 0o644);
  } catch {
    // schon weg
  }
  fs.rmSync(d.ordner, { recursive: true, force: true });
}

async function starten(d, angabe) {
  const lauf = programmStarten(d.ordner, ['--dateien', angabe, '--kein-browser', '--port', '0']);
  lauf.adresse = await adresseAbwarten(lauf, 15000);
  return lauf;
}

async function oeffnen(page, lauf) {
  await page.goto(lauf.adresse);
  await page.waitForSelector('#da-name:not(:empty)', { state: 'attached' });
}

async function beenden(lauf) {
  await programmBeenden(lauf);
}

module.exports = { ordnerDAnlegen, entfernen, starten, oeffnen, beenden };