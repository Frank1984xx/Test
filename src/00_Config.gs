/**
 * Configurazione Smart Order.
 *
 * Le tabelle NON sono referenziate per nome-tab (che può cambiare), ma per la
 * loro riga di intestazione: ogni tabella è descritta dalle colonne chiave che
 * deve contenere. Vedi 01_Sheets.gs (resolveTable_).
 */

// Se lo script è "bound" al foglio Smart Order, lascia stringa vuota.
// Altrimenti incolla qui l'ID del foglio (dalla URL: /d/<ID>/edit).
var SPREADSHEET_ID = '';

/**
 * Definizione logica delle tabelle. `signature` = colonne che identificano
 * univocamente la tabella; `key` = colonna ID primaria (per lookup/append).
 */
var TABLES = {
  RISTORANTI: {
    name: 'Ristoranti',
    signature: ['ID_Ristorante', 'Nome', 'Email'],
    key: 'ID_Ristorante'
  },
  LISTINO: {
    name: 'Listino Fornitori',
    signature: ['ID_Fornitore', 'Codice_Prodotto', 'Prezzo'],
    key: 'Codice_Prodotto'
  },
  FORNITORI_RISTORANTI: {
    name: 'Fornitori Ristoranti',
    signature: ['ID_Fornitore', 'ID_Ristorante', 'Attivo'],
    key: 'ID_Fornitore'
  },
  MOVIMENTI: {
    name: 'Movimenti',
    signature: ['ID_Movimento', 'Tipo', 'Codice_Prodotto', 'Quantita'],
    key: 'ID_Movimento'
  },
  FATTURE_XML: {
    name: 'Fatture XML',
    signature: ['ID', 'PIva_Fornitore', 'Numero_Fattura', 'XML_Content'],
    key: 'ID'
  },
  PAGAMENTI: {
    name: 'Pagamenti',
    signature: ['ID_Fattura', 'ID_Fornitore', 'Data_Scadenza', 'Stato'],
    key: 'ID_Fattura'
  },
  STORICO_PREZZI: {
    name: 'Storico Prezzi',
    signature: ['ID_Ordine', 'Prezzo_Sistema', 'Prezzo_Bolla', 'Variazione_%'],
    key: 'ID_Ordine'
  },
  ORDINI: {
    name: 'Ordini',
    signature: ['ID_Ordine', 'ID_Ristorante', 'ID_Fornitore', 'Stato', 'Email_Inviata'],
    key: 'ID_Ordine'
  },
  BOLLE: {
    name: 'Bolle',
    signature: ['ID_Bolla', 'ID_Ordine', 'Foto_Bolla_URL', 'OCR_Testo', 'Discrepanze'],
    key: 'ID_Bolla'
  },
  // Anagrafica fornitori con email. OGGI PUÒ NON ESISTERE nel foglio: il codice
  // degrada con eleganza (ordine salvato ma email non inviata). Vedi README.
  FORNITORI: {
    name: 'Fornitori',
    signature: ['ID_Fornitore', 'Email'],
    key: 'ID_Fornitore',
    optional: true
  }
};

// Stati ordine.
var STATO_ORDINE = {
  BOZZA: 'Bozza',
  INVIATO: 'Inviato',
  CONSEGNATO: 'Consegnato',
  ANNULLATO: 'Annullato'
};

// Stati bolla.
var STATO_BOLLA = {
  DA_VERIFICARE: 'Da verificare',
  OK: 'Verificata',
  DISCREPANZE: 'Con discrepanze'
};

// Soglia oltre la quale una variazione di prezzo è considerata "alert".
var SOGLIA_VARIAZIONE_PREZZO = 5; // percentuale
