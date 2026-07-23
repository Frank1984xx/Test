/**
 * Fatture elettroniche (FatturaPA).
 *
 * Parsing dell'XML SDI per estrarre testata, totali e righe di dettaglio, con
 * scrittura di Righe_JSON e riconciliazione base con le bolle dell'ordine.
 *
 * Nota namespace: i file FatturaPA usano prefissi variabili (p:, ns2:, oppure
 * nessuno). Per robustezza cerchiamo gli elementi per NOME LOCALE, ignorando il
 * namespace.
 */

/**
 * Importa/normalizza una fattura già presente nella tabella Fatture XML:
 * legge XML_Content, popola Righe_JSON e i totali se mancanti.
 * @param {string} idFattura valore della colonna ID
 * @return {Object} riepilogo parsing
 */
function importaFattura(idFattura) {
  var t = resolveTable_('FATTURE_XML');
  var riga = t.findBy('ID', idFattura);
  if (!riga) throw new Error('Fattura non trovata: ' + idFattura);
  if (!riga.XML_Content) throw new Error('XML_Content vuoto per: ' + idFattura);

  var parsed = parseFatturaXml(riga.XML_Content);

  t.updateRow(riga._row, {
    PIva_Fornitore: riga.PIva_Fornitore || parsed.pIvaFornitore,
    Nome_Fornitore: riga.Nome_Fornitore || parsed.nomeFornitore,
    Numero_Fattura: riga.Numero_Fattura || parsed.numero,
    Data_Fattura: riga.Data_Fattura || parsed.data,
    Tipo_Documento: riga.Tipo_Documento || parsed.tipoDocumento,
    Importo_Totale: parsed.importoTotale,
    Imponibile: parsed.imponibile,
    IVA: parsed.iva,
    Righe_JSON: JSON.stringify(parsed.righe)
  });

  return parsed;
}

/**
 * Parsa una stringa XML FatturaPA.
 * @return {Object} testata, totali e righe.
 */
function parseFatturaXml(xml) {
  var doc = XmlService.parse(xml);
  var root = doc.getRootElement();

  var header = findChildLocal_(root, 'FatturaElettronicaHeader');
  var body = findChildLocal_(root, 'FatturaElettronicaBody');

  var cedente = header && findChildLocal_(header, 'CedentePrestatore');
  var datiAnagrafici = cedente && findChildLocal_(cedente, 'DatiAnagrafici');
  var idFiscale = datiAnagrafici && findChildLocal_(datiAnagrafici, 'IdFiscaleIVA');
  var anagrafica = datiAnagrafici && deepFindLocal_(datiAnagrafici, 'Denominazione');

  var datiGenerali = body && deepFindLocal_(body, 'DatiGeneraliDocumento');

  var righe = [];
  if (body) {
    var lines = deepFindAllLocal_(body, 'DettaglioLinee');
    righe = lines.map(function (l) {
      return {
        numeroLinea: textLocal_(l, 'NumeroLinea'),
        descrizione: textLocal_(l, 'Descrizione'),
        quantita: numItalian_(textLocal_(l, 'Quantita')),
        prezzoUnitario: numItalian_(textLocal_(l, 'PrezzoUnitario')),
        prezzoTotale: numItalian_(textLocal_(l, 'PrezzoTotale')),
        aliquotaIVA: numItalian_(textLocal_(l, 'AliquotaIVA'))
      };
    });
  }

  var riepiloghi = body ? deepFindAllLocal_(body, 'DatiRiepilogo') : [];
  var imponibile = riepiloghi.reduce(function (s, r) {
    return s + numItalian_(textLocal_(r, 'ImponibileImporto'));
  }, 0);
  var iva = riepiloghi.reduce(function (s, r) {
    return s + numItalian_(textLocal_(r, 'Imposta'));
  }, 0);

  return {
    pIvaFornitore: idFiscale ? textLocal_(idFiscale, 'IdCodice') : '',
    nomeFornitore: anagrafica ? anagrafica.getText() : '',
    numero: datiGenerali ? textLocal_(datiGenerali, 'Numero') : '',
    data: datiGenerali ? textLocal_(datiGenerali, 'Data') : '',
    tipoDocumento: datiGenerali ? textLocal_(datiGenerali, 'TipoDocumento') : '',
    imponibile: +imponibile.toFixed(2),
    iva: +iva.toFixed(2),
    importoTotale: +(imponibile + iva).toFixed(2),
    righe: righe
  };
}

/**
 * Riconciliazione base: confronta il totale fattura con la somma delle bolle
 * associate all'ordine (o agli ordini) e ritorna lo scostamento.
 * @param {string} idFattura
 * @param {Array<string>} idOrdini ordini da abbinare
 */
function riconciliaFattura(idFattura, idOrdini) {
  var t = resolveTable_('FATTURE_XML');
  var riga = t.findBy('ID', idFattura);
  if (!riga) throw new Error('Fattura non trovata: ' + idFattura);

  var totaleFattura = parsePrezzo_(riga.Importo_Totale);
  var totaleOrdini = (idOrdini || []).reduce(function (s, id) {
    var o = Repo.ordine(id);
    return s + (o ? parsePrezzo_(o.Totale_Ordine) : 0);
  }, 0);

  var scostamento = +(totaleFattura - totaleOrdini).toFixed(2);
  var oggi = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  t.updateRow(riga._row, {
    Bolle_Associate: (idOrdini || []).join(','),
    Totale_Bolle: +totaleOrdini.toFixed(2),
    Scostamento: scostamento,
    Stato: Math.abs(scostamento) < 0.01 ? 'Riconciliata' : 'Scostamento',
    Data_Riconciliazione: oggi
  });

  return { totaleFattura: totaleFattura, totaleOrdini: totaleOrdini, scostamento: scostamento };
}

/* ----------------------- helper XML per nome locale ----------------------- */

function findChildLocal_(el, localName) {
  var children = el.getChildren();
  for (var i = 0; i < children.length; i++) {
    if (children[i].getName() === localName) return children[i];
  }
  return null;
}

function deepFindLocal_(el, localName) {
  if (el.getName() === localName) return el;
  var children = el.getChildren();
  for (var i = 0; i < children.length; i++) {
    var found = deepFindLocal_(children[i], localName);
    if (found) return found;
  }
  return null;
}

function deepFindAllLocal_(el, localName) {
  var out = [];
  (function walk(node) {
    if (node.getName() === localName) out.push(node);
    node.getChildren().forEach(walk);
  })(el);
  return out;
}

function textLocal_(el, localName) {
  var c = el ? deepFindLocal_(el, localName) : null;
  return c ? c.getText().trim() : '';
}

/** Numero FatturaPA (punto come separatore decimale). */
function numItalian_(s) {
  if (!s) return 0;
  var n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}
