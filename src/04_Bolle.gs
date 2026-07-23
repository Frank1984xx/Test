/**
 * Bolle di consegna: registrazione, OCR della foto, verifica prodotti vs ordine.
 *
 * L'OCR usa il servizio avanzato Drive (Drive.Files.insert con
 * ocr=true / convert=true): l'immagine viene convertita in Google Doc e se ne
 * legge il testo. Il testo viene poi confrontato con il dettaglio dell'ordine.
 *
 * Prima versione: il match prodotti è basato su codice/descrizione presenti nel
 * testo OCR. Da raffinare con parsing strutturato per singolo fornitore.
 */

/**
 * Registra una bolla per un ordine ed esegue OCR + verifica.
 * @param {Object} input
 *   - idOrdine {string}
 *   - numeroBollaFornitore {string=}
 *   - fotoUrl {string}  URL/ID file Drive dell'immagine della bolla
 *   - note {string=}
 * @return {Object} esito con discrepanze
 */
function registraBolla(input) {
  if (!input || !input.idOrdine) throw new Error('idOrdine mancante.');
  if (!input.fotoUrl) throw new Error('URL foto bolla mancante.');

  var ordine = Repo.ordine(input.idOrdine);
  if (!ordine) throw new Error('Ordine non trovato: ' + input.idOrdine);

  var testoOcr = '';
  var avvisi = [];
  try {
    testoOcr = ocrDaDrive_(input.fotoUrl);
  } catch (e) {
    avvisi.push('OCR non riuscito: ' + e.message);
  }

  var righeOrdine = parseDettaglioOrdine_(ordine.Dettaglio_Prodotti);
  var verifica = verificaProdotti_(righeOrdine, testoOcr);

  var stato = verifica.discrepanze.length ? STATO_BOLLA.DISCREPANZE : STATO_BOLLA.OK;
  var oggi = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var t = resolveTable_('BOLLE');
  var idBolla = generaId_('BOL');
  t.append({
    ID_Bolla: idBolla,
    ID_Ordine: input.idOrdine,
    Numero_Bolla_Fornitore: input.numeroBollaFornitore || '',
    Data_Ricezione: oggi,
    Foto_Bolla_URL: input.fotoUrl,
    OCR_Testo: testoOcr,
    Prodotti_Verificati: JSON.stringify(verifica.verificati),
    Discrepanze: JSON.stringify(verifica.discrepanze),
    Stato: stato,
    Note: input.note || ''
  });

  // Se la bolla è coerente, l'ordine si può considerare consegnato.
  if (stato === STATO_BOLLA.OK) {
    var ot = resolveTable_('ORDINI');
    var orow = ot.findBy('ID_Ordine', input.idOrdine);
    if (orow) ot.updateRow(orow._row, { Stato: STATO_ORDINE.CONSEGNATO });
  }

  return {
    idBolla: idBolla,
    stato: stato,
    verificati: verifica.verificati,
    discrepanze: verifica.discrepanze,
    avvisi: avvisi
  };
}

/**
 * Esegue OCR su un file immagine di Drive e ritorna il testo.
 * Accetta un URL Drive o direttamente un fileId.
 */
function ocrDaDrive_(fotoUrl) {
  var fileId = estraiFileId_(fotoUrl);
  if (!fileId) throw new Error('Impossibile ricavare il fileId da: ' + fotoUrl);

  var blob = DriveApp.getFileById(fileId).getBlob();
  var resource = { title: 'ocr-tmp-' + fileId, mimeType: blob.getContentType() };
  var docFile = Drive.Files.insert(resource, blob, { ocr: true, convert: true });

  try {
    var text = DocumentApp.openById(docFile.id).getBody().getText();
    return text || '';
  } finally {
    // Pulisci il Doc temporaneo generato dall'OCR.
    try { Drive.Files.remove(docFile.id); } catch (ignore) {}
  }
}

/** Ricava un fileId da un URL Drive o da un id nudo. */
function estraiFileId_(s) {
  var str = String(s || '');
  var m = str.match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

/** Deserializza il dettaglio prodotti dell'ordine (JSON) in modo sicuro. */
function parseDettaglioOrdine_(raw) {
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

/**
 * Verifica ogni riga d'ordine contro il testo OCR.
 * Match se il codice o (parte della) descrizione compaiono nel testo.
 * @return {{verificati: Array, discrepanze: Array}}
 */
function verificaProdotti_(righeOrdine, testoOcr) {
  var testo = normalizzaTesto_(testoOcr);
  var verificati = [];
  var discrepanze = [];

  righeOrdine.forEach(function (r) {
    var codice = String(r.codice || '').toLowerCase();
    var descr = normalizzaTesto_(r.descrizione || '');
    var tokenDescr = descr.split(' ').filter(function (w) { return w.length >= 4; });

    var trovatoCodice = codice && testo.indexOf(codice) >= 0;
    var trovatoDescr = tokenDescr.some(function (w) { return testo.indexOf(w) >= 0; });

    if (trovatoCodice || trovatoDescr) {
      verificati.push({ codice: r.codice, descrizione: r.descrizione, quantita: r.quantita });
    } else {
      discrepanze.push({
        codice: r.codice,
        descrizione: r.descrizione,
        motivo: 'Prodotto ordinato non rilevato nella bolla'
      });
    }
  });

  return { verificati: verificati, discrepanze: discrepanze };
}

/** Normalizza testo per confronto (minuscole, spazi singoli). */
function normalizzaTesto_(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
