/**
 * Controllo prezzi: confronto tra prezzo a sistema (listino) e prezzo di bolla.
 * Logica il più possibile pura, così da essere testabile a parte.
 */

/**
 * Calcola la variazione percentuale (bolla vs sistema).
 * @return {number} percentuale con segno, 0 se prezzo sistema nullo.
 */
function variazionePercentuale_(prezzoSistema, prezzoBolla) {
  var ps = Number(prezzoSistema) || 0;
  var pb = Number(prezzoBolla) || 0;
  if (ps === 0) return 0;
  return +(((pb - ps) / ps) * 100).toFixed(2);
}

/**
 * Confronta le righe di una bolla con il listino corrente del fornitore.
 * @param {string} idFornitore
 * @param {Array<{codice, prezzoBolla}>} righeBolla
 * @return {Array<{codice, prezzoSistema, prezzoBolla, variazione, alert}>}
 */
function confrontaPrezzi(idFornitore, righeBolla) {
  return (righeBolla || []).map(function (r) {
    var voce = Repo.voceListino(idFornitore, r.codice);
    var ps = voce ? parsePrezzo_(voce.Prezzo) : 0;
    var pb = Number(r.prezzoBolla) || 0;
    var variazione = variazionePercentuale_(ps, pb);
    return {
      codice: String(r.codice),
      descrizione: (voce && voce.Nome_Art_Fornitore) || r.descrizione || '',
      prezzoSistema: ps,
      prezzoBolla: pb,
      variazione: variazione,
      alert: Math.abs(variazione) >= SOGLIA_VARIAZIONE_PREZZO
    };
  });
}

/**
 * Registra nello Storico Prezzi gli scostamenti di un ordine e ritorna quelli
 * in alert. Aggiorna il listino solo se richiesto (aggiornaListino=true) —
 * di default NON tocca i prezzi a listino (scelta prudente).
 */
function registraScostamenti(idOrdine, idFornitore, righeBolla, aggiornaListino) {
  var confronto = confrontaPrezzi(idFornitore, righeBolla);
  var t = resolveTable_('STORICO_PREZZI');
  var oggi = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  confronto.forEach(function (c) {
    if (c.prezzoBolla === 0) return; // niente prezzo bolla → niente confronto
    t.append({
      Data: oggi,
      ID_Ordine: idOrdine,
      ID_Prodotto: c.codice,
      Nome_Prodotto: c.descrizione,
      Prezzo_Sistema: c.prezzoSistema,
      Prezzo_Bolla: c.prezzoBolla,
      'Variazione_%': c.variazione,
      Aggiornato: aggiornaListino ? 'TRUE' : 'FALSE'
    });
  });

  return confronto.filter(function (c) { return c.alert; });
}

/** Alert prezzi recenti dallo storico (per la dashboard). */
function alertPrezziRecenti(limite) {
  var righe = Repo.storicoPrezzi().filter(function (r) {
    var v = Math.abs(Number(String(r['Variazione_%']).replace(',', '.')) || 0);
    return v >= SOGLIA_VARIAZIONE_PREZZO;
  });
  righe.sort(function (a, b) { return (b._row || 0) - (a._row || 0); });
  return righe.slice(0, limite || 20);
}
