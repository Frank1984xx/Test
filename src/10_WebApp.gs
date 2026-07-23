/**
 * Web App: entry point e API lato server chiamate dalla UI (google.script.run).
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Smart Order — Gruppo Ethos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Dati iniziali per la UI: ristoranti + riepilogo. */
function apiBootstrap() {
  var ristoranti = Repo.ristoranti().map(function (r) {
    return { id: r.ID_Ristorante, nome: r.Nome };
  });
  return {
    ristoranti: ristoranti,
    riepilogo: apiRiepilogo()
  };
}

/** KPI per la dashboard. */
function apiRiepilogo() {
  var ordini = Repo.ordini();
  var bolle = Repo.bolle();
  var alert = alertPrezziRecenti(50);

  var perStato = {};
  ordini.forEach(function (o) {
    var s = o.Stato || '—';
    perStato[s] = (perStato[s] || 0) + 1;
  });

  var daVerificare = bolle.filter(function (b) {
    return String(b.Stato) === STATO_BOLLA.DA_VERIFICARE ||
      String(b.Stato) === STATO_BOLLA.DISCREPANZE;
  }).length;

  return {
    ordiniTotali: ordini.length,
    ordiniPerStato: perStato,
    bolleDaVerificare: daVerificare,
    alertPrezzi: alert.length
  };
}

/** Fornitori attivi per un ristorante (per la tendina Nuovo Ordine). */
function apiFornitori(idRistorante) {
  return Repo.fornitoriDiRistorante(idRistorante).map(function (r) {
    var forn = Repo.fornitore(r.ID_Fornitore);
    return {
      id: r.ID_Fornitore,
      nome: (forn && forn.Nome) || r.ID_Fornitore,
      email: (forn && forn.Email) || ''
    };
  });
}

/** Listino (codice, nome, prezzo) di un fornitore per il form ordine. */
function apiListino(idFornitore) {
  return Repo.listino(idFornitore).map(function (r) {
    return {
      codice: r.Codice_Prodotto,
      nome: r.Nome_Art_Fornitore || '',
      prezzo: parsePrezzo_(r.Prezzo)
    };
  });
}

/** Crea un ordine dalla UI. */
function apiCreaOrdine(payload) {
  return creaOrdine(payload);
}

/** Elenco ordini per la tabella (più recenti prima). */
function apiElencoOrdini(limite) {
  var ordini = Repo.ordini().map(function (o) {
    return {
      id: o.ID_Ordine,
      ristorante: o.ID_Ristorante,
      fornitore: o.ID_Fornitore,
      data: formatCell_(o.Data_Ordine),
      stato: o.Stato,
      totale: parsePrezzo_(o.Totale_Ordine),
      emailInviata: String(o.Email_Inviata).toUpperCase() === 'TRUE'
    };
  });
  ordini.reverse();
  return limite ? ordini.slice(0, limite) : ordini;
}

/** Alert prezzi per la dashboard. */
function apiAlertPrezzi() {
  return alertPrezziRecenti(20).map(function (r) {
    return {
      data: formatCell_(r.Data),
      ordine: r.ID_Ordine,
      prodotto: r.Nome_Prodotto,
      sistema: parsePrezzo_(r.Prezzo_Sistema),
      bolla: parsePrezzo_(r.Prezzo_Bolla),
      variazione: String(r['Variazione_%'])
    };
  });
}

function formatCell_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v == null ? '' : v);
}
