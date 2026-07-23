/**
 * Test della logica pura (senza runtime Apps Script).
 * Carica i file .gs in una sandbox con i global di GAS stubbati e verifica le
 * funzioni che non toccano il foglio: calcolo prezzi, parsing numeri/prezzi,
 * verifica prodotti bolla, parsing XML FatturaPA.
 *
 * Esecuzione:  node tests/run_tests.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- Sandbox con stub minimi dei global Apps Script -------------------------
const sandbox = {
  Utilities: {
    formatDate: () => '2026-07-23',
    getUuid: () => 'abcd1234-0000-0000-0000-000000000000'
  },
  Session: { getScriptTimeZone: () => 'Europe/Rome', getActiveUser: () => ({ getEmail: () => '' }) },
  // Costanti dal Config
  SOGLIA_VARIAZIONE_PREZZO: 5,
  console
};
vm.createContext(sandbox);

function load(file) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}
['02_Repo.gs', '05_Prezzi.gs', '04_Bolle.gs', '06_Fatture.gs'].forEach(load);

// --- Mini framework ---------------------------------------------------------
let passed = 0, failed = 0;
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`✗ ${msg}\n    atteso: ${e}\n    ottenuto: ${a}`); }
}
function ok(cond, msg) { if (cond) passed++; else { failed++; console.error(`✗ ${msg}`); } }

// --- parsePrezzo_ (formato italiano) ---------------------------------------
eq(sandbox.parsePrezzo_('4,99'), 4.99, 'parsePrezzo "4,99"');
eq(sandbox.parsePrezzo_('1.234,50'), 1234.5, 'parsePrezzo migliaia "1.234,50"');
eq(sandbox.parsePrezzo_(18), 18, 'parsePrezzo numero');
eq(sandbox.parsePrezzo_(''), 0, 'parsePrezzo vuoto');

// --- variazionePercentuale_ -------------------------------------------------
eq(sandbox.variazionePercentuale_(10, 11), 10, 'variazione +10%');
eq(sandbox.variazionePercentuale_(10, 9), -10, 'variazione -10%');
eq(sandbox.variazionePercentuale_(0, 5), 0, 'variazione con sistema=0');

// --- confrontaPrezzi richiede Repo.voceListino: stubbiamo il Repo ----------
sandbox.Repo.voceListino = (forn, cod) => (cod === '116796'
  ? { Prezzo: '4,99', Nome_Art_Fornitore: 'LOMBOCOPPA' } : null);
const conf = sandbox.confrontaPrezzi('00004', [
  { codice: '116796', prezzoBolla: 5.49 },   // +10% -> alert
  { codice: '116796', prezzoBolla: 5.10 }    // +2.2% -> no alert
]);
eq(conf[0].variazione, 10.02, 'confrontaPrezzi variazione riga1');
ok(conf[0].alert === true, 'confrontaPrezzi alert sopra soglia');
ok(conf[1].alert === false, 'confrontaPrezzi no alert sotto soglia');

// --- verificaProdotti_ (match OCR) -----------------------------------------
const ocr = 'DDT n.123\n116796 LOMBOCOPPA SUINO 4,99\nMOZZARELLA JULIENNE 6,50';
const v = sandbox.verificaProdotti_([
  { codice: '116796', descrizione: 'LOMBOCOPPA SUINO C/OSSO', quantita: 2 },
  { codice: '999999', descrizione: 'PRODOTTO ASSENTE XYZ', quantita: 1 }
], ocr);
eq(v.verificati.length, 1, 'verifica: 1 prodotto trovato');
eq(v.discrepanze.length, 1, 'verifica: 1 discrepanza');
eq(v.discrepanze[0].codice, '999999', 'verifica: discrepanza sul codice giusto');

// Nota: parseFatturaXml dipende da XmlService (runtime Apps Script) e va
// verificata lì; non è coperta da questo test node.

// --- Esito ------------------------------------------------------------------
console.log(`\n${passed} test OK, ${failed} falliti.`);
process.exit(failed ? 1 : 0);
