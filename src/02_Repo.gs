/**
 * Repository: accessori tipizzati alle tabelle del foglio.
 * Nasconde alla logica di business i dettagli di accesso (01_Sheets.gs).
 */

var Repo = {

  ristoranti: function () {
    return resolveTable_('RISTORANTI').readAll();
  },

  ristorante: function (idRistorante) {
    return resolveTable_('RISTORANTI').findBy('ID_Ristorante', idRistorante);
  },

  /** Righe di listino, opzionalmente filtrate per fornitore. */
  listino: function (idFornitore) {
    var t = resolveTable_('LISTINO');
    if (!idFornitore) return t.readAll();
    return t.filter(function (r) {
      return String(r.ID_Fornitore) === String(idFornitore);
    });
  },

  /** Voce di listino per (fornitore, codice prodotto) attualmente valida. */
  voceListino: function (idFornitore, codiceProdotto) {
    var righe = resolveTable_('LISTINO').filter(function (r) {
      return String(r.ID_Fornitore) === String(idFornitore) &&
        String(r.Codice_Prodotto) === String(codiceProdotto);
    });
    // Preferisci la riga senza Data_Fine (listino corrente).
    righe.sort(function (a, b) {
      return (a.Data_Fine ? 1 : 0) - (b.Data_Fine ? 1 : 0);
    });
    return righe.length ? righe[0] : null;
  },

  /** Fornitori attivi per un ristorante (dalla mappatura). */
  fornitoriDiRistorante: function (idRistorante) {
    return resolveTable_('FORNITORI_RISTORANTI').filter(function (r) {
      return String(r.ID_Ristorante) === String(idRistorante) &&
        String(r.Attivo).toUpperCase() !== 'FALSE';
    });
  },

  /**
   * Anagrafica fornitore (nome + email). Ritorna null se il tab Fornitori
   * non esiste o il fornitore non è presente. Vedi note in README.
   */
  fornitore: function (idFornitore) {
    var t = resolveTable_('FORNITORI');
    if (!t) return null;
    return t.findBy('ID_Fornitore', idFornitore);
  },

  ordini: function () {
    return resolveTable_('ORDINI').readAll();
  },

  ordine: function (idOrdine) {
    return resolveTable_('ORDINI').findBy('ID_Ordine', idOrdine);
  },

  bolle: function () {
    return resolveTable_('BOLLE').readAll();
  },

  bollaDiOrdine: function (idOrdine) {
    return resolveTable_('BOLLE').findBy('ID_Ordine', idOrdine);
  },

  fattureXml: function () {
    return resolveTable_('FATTURE_XML').readAll();
  },

  pagamenti: function () {
    return resolveTable_('PAGAMENTI').readAll();
  },

  storicoPrezzi: function () {
    return resolveTable_('STORICO_PREZZI').readAll();
  }
};

/**
 * Genera un ID progressivo del tipo PREFIX-YYYYMMDD-XXXX unico nella tabella.
 * Usa Utilities per data (timezone del progetto) — niente Date.now() hardcoded.
 */
function generaId_(prefix) {
  var oggi = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var rand = Utilities.getUuid().replace(/-/g, '').substring(0, 4).toUpperCase();
  return prefix + '-' + oggi + '-' + rand;
}

/** Parsa un prezzo in formato italiano ("4,99") o numerico in Number. */
function parsePrezzo_(v) {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return 0;
  var s = String(v).trim().replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
