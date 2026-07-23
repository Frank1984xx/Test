/**
 * Accesso al foglio Smart Order PER INTESTAZIONI.
 *
 * Non ci fidiamo dei nomi dei tab (possono essere rinominati / tradotti):
 * ogni tabella logica di TABLES viene individuata scandendo i fogli e cercando
 * la riga di intestazione che contiene tutte le colonne della sua `signature`.
 *
 * Espone una piccola astrazione "Table" con lettura/append/update per header.
 */

/** Ritorna lo Spreadsheet attivo o quello indicato da SPREADSHEET_ID. */
function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Nessun foglio attivo e SPREADSHEET_ID vuoto. Imposta SPREADSHEET_ID in 00_Config.gs.'
    );
  }
  return ss;
}

/** Normalizza un'intestazione per confronto tollerante (case/spazi/underscore). */
function normalizeHeader_(h) {
  return String(h == null ? '' : h)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '_');
}

/**
 * Individua, dentro un foglio, la riga (0-based) che funge da intestazione per
 * la signature richiesta. Cerca nelle prime 5 righe (le tabelle non sempre
 * iniziano a riga 1). Ritorna {headerRow, headers, colIndex} oppure null.
 */
function findHeaderRow_(sheet, signature) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return null;
  var scan = Math.min(5, sheet.getLastRow());
  if (scan === 0) return null;

  var wanted = signature.map(normalizeHeader_);
  var values = sheet.getRange(1, 1, scan, lastCol).getValues();

  for (var r = 0; r < values.length; r++) {
    var norm = values[r].map(normalizeHeader_);
    var colIndex = {};
    var found = 0;
    for (var w = 0; w < wanted.length; w++) {
      var idx = norm.indexOf(wanted[w]);
      if (idx >= 0) {
        colIndex[signature[w]] = idx;
        found++;
      }
    }
    if (found === wanted.length) {
      // Mappa TUTTE le intestazioni non vuote (non solo la signature).
      var headers = {};
      for (var c = 0; c < values[r].length; c++) {
        var name = String(values[r][c]).trim();
        if (name && !(name in headers)) headers[name] = c;
      }
      return { headerRow: r, headers: headers, colIndex: colIndex };
    }
  }
  return null;
}

// Cache per invocazione (evita di riscandire i fogli).
var _tableCache = {};

/**
 * Risolve una tabella logica (chiave di TABLES) in un oggetto Table.
 * Lancia se non trovata, salvo `optional: true`.
 */
function resolveTable_(tableKey) {
  if (_tableCache[tableKey]) return _tableCache[tableKey];

  var def = TABLES[tableKey];
  if (!def) throw new Error('Tabella logica sconosciuta: ' + tableKey);

  var ss = getSpreadsheet_();
  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    var hit = findHeaderRow_(sheets[i], def.signature);
    if (hit) {
      var t = new Table_(sheets[i], hit.headerRow, hit.headers, def);
      _tableCache[tableKey] = t;
      return t;
    }
  }

  if (def.optional) return null;
  throw new Error(
    'Tabella "' + def.name + '" non trovata. Attese le colonne: ' +
    def.signature.join(', ')
  );
}

/**
 * Astrazione su una tabella tabellare individuata per header.
 * Tutte le operazioni sono per NOME colonna, mai per indice hardcoded.
 */
function Table_(sheet, headerRow, headers, def) {
  this.sheet = sheet;
  this.headerRow = headerRow;       // 0-based
  this.headers = headers;           // { 'Nome_Colonna': colIndex0based }
  this.def = def;
}

/** Numero della prima riga dati (1-based, per l'API Range). */
Table_.prototype.firstDataRow = function () {
  return this.headerRow + 2;
};

/** Indice 0-based della colonna, o -1 se assente. */
Table_.prototype.col = function (name) {
  return name in this.headers ? this.headers[name] : -1;
};

/** True se la colonna esiste. */
Table_.prototype.has = function (name) {
  return name in this.headers;
};

/**
 * Legge tutte le righe dati come oggetti { Colonna: valore, _row: <1-based> }.
 * Salta le righe completamente vuote.
 */
Table_.prototype.readAll = function () {
  var startRow = this.firstDataRow();
  var lastRow = this.sheet.getLastRow();
  if (lastRow < startRow) return [];

  var lastCol = this.sheet.getLastColumn();
  var values = this.sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();

  var names = Object.keys(this.headers);
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var isEmpty = row.every(function (v) { return v === '' || v === null; });
    if (isEmpty) continue;
    var obj = { _row: startRow + r };
    for (var n = 0; n < names.length; n++) {
      obj[names[n]] = row[this.headers[names[n]]];
    }
    out.push(obj);
  }
  return out;
};

/** Trova la prima riga dove `colName` === value (confronto stringa). */
Table_.prototype.findBy = function (colName, value) {
  var all = this.readAll();
  var target = String(value);
  for (var i = 0; i < all.length; i++) {
    if (String(all[i][colName]) === target) return all[i];
  }
  return null;
};

/** Filtra le righe con predicato. */
Table_.prototype.filter = function (predicate) {
  return this.readAll().filter(predicate);
};

/**
 * Accoda una riga. `obj` è { Colonna: valore }; le colonne assenti dall'header
 * vengono ignorate. Ritorna il numero di riga (1-based) inserito.
 */
Table_.prototype.append = function (obj) {
  var lastCol = this.sheet.getLastColumn();
  var rowArr = new Array(lastCol).fill('');
  Object.keys(obj).forEach(function (k) {
    var idx = this.col(k);
    if (idx >= 0) rowArr[idx] = obj[k];
  }, this);

  var targetRow = Math.max(this.sheet.getLastRow() + 1, this.firstDataRow());
  this.sheet.getRange(targetRow, 1, 1, lastCol).setValues([rowArr]);
  return targetRow;
};

/** Aggiorna singole celle di una riga già esistente (1-based). */
Table_.prototype.updateRow = function (rowNumber, patch) {
  Object.keys(patch).forEach(function (k) {
    var idx = this.col(k);
    if (idx >= 0) this.sheet.getRange(rowNumber, idx + 1).setValue(patch[k]);
  }, this);
};
