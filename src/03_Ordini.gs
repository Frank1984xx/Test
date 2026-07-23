/**
 * Flusso Ordini.
 *
 * Creazione ordine → calcolo totale dal listino → salvataggio → invio email al
 * fornitore → marcatura Email_Inviata / Stato.
 */

/**
 * Crea un ordine.
 * @param {Object} input
 *   - idRistorante {string}
 *   - idFornitore  {string}
 *   - righe        {Array<{codice, descrizione?, quantita}>}
 *   - dataConsegnaPrevista {string=}  (yyyy-MM-dd)
 *   - note {string=}
 *   - inviaEmail {boolean=}  (default true)
 * @return {Object} riepilogo ordine creato
 */
function creaOrdine(input) {
  if (!input || !input.idRistorante) throw new Error('idRistorante mancante.');
  if (!input.idFornitore) throw new Error('idFornitore mancante.');
  if (!input.righe || !input.righe.length) throw new Error('Nessuna riga ordine.');

  var ristorante = Repo.ristorante(input.idRistorante);
  if (!ristorante) throw new Error('Ristorante non trovato: ' + input.idRistorante);

  // Arricchisci le righe con prezzo/descrizione dal listino e calcola il totale.
  var righe = input.righe.map(function (r) {
    var voce = Repo.voceListino(input.idFornitore, r.codice);
    var prezzo = voce ? parsePrezzo_(voce.Prezzo) : 0;
    var descr = r.descrizione || (voce ? voce.Nome_Art_Fornitore : '') || '';
    var qta = Number(r.quantita) || 0;
    return {
      codice: String(r.codice),
      descrizione: descr,
      quantita: qta,
      prezzo: prezzo,
      subtotale: +(prezzo * qta).toFixed(2)
    };
  });

  var totale = +righe.reduce(function (s, r) { return s + r.subtotale; }, 0).toFixed(2);

  var idOrdine = generaId_('ORD');
  var oggi = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var t = resolveTable_('ORDINI');
  var rowNumber = t.append({
    ID_Ordine: idOrdine,
    ID_Ristorante: input.idRistorante,
    Data_Ordine: oggi,
    Data_Consegna_Prevista: input.dataConsegnaPrevista || '',
    ID_Fornitore: input.idFornitore,
    Stato: STATO_ORDINE.BOZZA,
    Dettaglio_Prodotti: JSON.stringify(righe),
    Totale_Ordine: totale,
    ID_Utente: Session.getActiveUser().getEmail() || '',
    Note: input.note || '',
    Email_Inviata: 'FALSE'
  });

  var risultato = {
    idOrdine: idOrdine,
    row: rowNumber,
    totale: totale,
    righe: righe,
    stato: STATO_ORDINE.BOZZA,
    emailInviata: false,
    avvisi: []
  };

  if (input.inviaEmail !== false) {
    var esito = inviaEmailOrdine_(idOrdine, input.idFornitore, ristorante, righe, totale);
    risultato.emailInviata = esito.inviata;
    if (esito.avviso) risultato.avvisi.push(esito.avviso);
    t.updateRow(rowNumber, {
      Email_Inviata: esito.inviata ? 'TRUE' : 'FALSE',
      Stato: esito.inviata ? STATO_ORDINE.INVIATO : STATO_ORDINE.BOZZA
    });
    if (esito.inviata) risultato.stato = STATO_ORDINE.INVIATO;
  }

  return risultato;
}

/**
 * Invia l'email d'ordine al fornitore. Degrada con eleganza se manca
 * l'anagrafica fornitori / l'email.
 * @return {{inviata: boolean, avviso?: string}}
 */
function inviaEmailOrdine_(idOrdine, idFornitore, ristorante, righe, totale) {
  var forn = Repo.fornitore(idFornitore);
  var email = forn && forn.Email ? String(forn.Email).trim() : '';
  if (!email) {
    return {
      inviata: false,
      avviso: 'Email fornitore non disponibile (manca anagrafica Fornitori per ' +
        idFornitore + '): ordine salvato ma non inviato.'
    };
  }

  var nomeForn = forn.Nome || idFornitore;
  var oggetto = 'Ordine ' + idOrdine + ' — ' + (ristorante.Nome || ristorante.ID_Ristorante);

  var corpo = renderEmailOrdine_(idOrdine, nomeForn, ristorante, righe, totale);

  MailApp.sendEmail({
    to: email,
    subject: oggetto,
    htmlBody: corpo,
    replyTo: ristorante.Email || undefined,
    name: 'Gruppo Ethos — Smart Order'
  });

  return { inviata: true };
}

/** Compone il corpo HTML dell'email d'ordine. */
function renderEmailOrdine_(idOrdine, nomeForn, ristorante, righe, totale) {
  var righeHtml = righe.map(function (r) {
    return '<tr>' +
      '<td style="padding:4px 8px;border:1px solid #ddd">' + r.codice + '</td>' +
      '<td style="padding:4px 8px;border:1px solid #ddd">' + escapeHtml_(r.descrizione) + '</td>' +
      '<td style="padding:4px 8px;border:1px solid #ddd;text-align:right">' + r.quantita + '</td>' +
      '<td style="padding:4px 8px;border:1px solid #ddd;text-align:right">' +
        formatEuro_(r.prezzo) + '</td>' +
      '<td style="padding:4px 8px;border:1px solid #ddd;text-align:right">' +
        formatEuro_(r.subtotale) + '</td>' +
      '</tr>';
  }).join('');

  return '' +
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">' +
    '<p>Spett.le <strong>' + escapeHtml_(nomeForn) + '</strong>,</p>' +
    '<p>in allegato l\'ordine <strong>' + idOrdine + '</strong> per ' +
      escapeHtml_(ristorante.Nome || '') + '.</p>' +
    '<table style="border-collapse:collapse;margin:12px 0">' +
      '<thead><tr style="background:#f2f2f2">' +
        '<th style="padding:4px 8px;border:1px solid #ddd">Codice</th>' +
        '<th style="padding:4px 8px;border:1px solid #ddd">Prodotto</th>' +
        '<th style="padding:4px 8px;border:1px solid #ddd">Q.tà</th>' +
        '<th style="padding:4px 8px;border:1px solid #ddd">Prezzo</th>' +
        '<th style="padding:4px 8px;border:1px solid #ddd">Subtot.</th>' +
      '</tr></thead>' +
      '<tbody>' + righeHtml + '</tbody>' +
      '<tfoot><tr>' +
        '<td colspan="4" style="padding:4px 8px;text-align:right"><strong>Totale</strong></td>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;text-align:right"><strong>' +
          formatEuro_(totale) + '</strong></td>' +
      '</tr></tfoot>' +
    '</table>' +
    '<p>Grazie,<br>' + escapeHtml_(ristorante.Nome || 'Gruppo Ethos') + '</p>' +
    '</div>';
}

function formatEuro_(n) {
  return '€ ' + (Number(n) || 0).toFixed(2).replace('.', ',');
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
