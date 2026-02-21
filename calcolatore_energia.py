#!/usr/bin/env python3
"""
Calcolatore Costi Energetici - Famiglia Tutto Elettrico (Italia)
================================================================
Stima i consumi e i costi per una famiglia senza gas, con pannelli solari,
pompa di calore e auto elettrica.

Personalizza i parametri nella sezione CONFIGURAZIONE per adattarli alla tua situazione.
"""


# =============================================================================
# CONFIGURAZIONE - Modifica questi valori per la tua famiglia
# =============================================================================

# Famiglia
NUM_PERSONE = 6

# Casa
SUPERFICIE_MQ = 130          # Superficie riscaldata (m²)
CLASSE_ENERGETICA = "C"      # A, B, C, D, E, F, G
ZONA_CLIMATICA = "E"         # A, B, C, D, E, F (vedi comune di residenza)

# Pompa di calore
COP_MEDIO = 3.5              # Coefficiente di prestazione medio annuale
HA_ACS_POMPA_CALORE = True   # Acqua calda sanitaria con pompa di calore

# Pannelli solari
POTENZA_IMPIANTO_KWP = 6.0   # Potenza nominale impianto fotovoltaico
HA_BATTERIA = False           # Accumulo con batteria
CAPACITA_BATTERIA_KWH = 0    # Capacità batteria (0 se non presente)
PERCENTUALE_AUTOCONSUMO = 35  # % autoconsumo senza batteria (30-40 tipico)

# Auto elettrica
KM_ANNUI = 15000              # Chilometri percorsi all'anno
CONSUMO_AUTO_KWH_100KM = 18  # Consumo medio (kWh per 100 km)
PERCENTUALE_RICARICA_CASA = 80  # % ricariche fatte a casa

# Elettrodomestici
LAVAGGI_SETTIMANA = 7         # Numero lavaggi lavatrice a settimana
USA_ASCIUGATRICE = True       # Usa asciugatrice regolarmente
ASCIUGATRICE_POMPA_CALORE = True  # Asciugatrice a pompa di calore (più efficiente)
PIANO_INDUZIONE = True        # Cucina a induzione (obbligatorio senza gas)

# Costi energia
COSTO_KWH_EURO = 0.28        # Costo medio per kWh dal fornitore
PREZZO_VENDITA_ECCEDENZA = 0.10  # Prezzo vendita energia in eccesso (Ritiro Dedicato / SSP)

# =============================================================================
# CALCOLI
# =============================================================================

def fabbisogno_termico_kwh(superficie, classe, zona):
    """Stima il fabbisogno termico annuo in kWh termici."""
    # kWh termici per m² per anno in base alla classe energetica
    consumi_classe = {
        "A": 25, "B": 40, "C": 65, "D": 90, "E": 120, "F": 150, "G": 200
    }
    # Fattore correttivo per zona climatica
    fattore_zona = {
        "A": 0.5, "B": 0.65, "C": 0.8, "D": 0.95, "E": 1.0, "F": 1.15
    }
    base = consumi_classe.get(classe.upper(), 65)
    fattore = fattore_zona.get(zona.upper(), 1.0)
    return superficie * base * fattore


def calcola_consumi():
    """Calcola tutti i consumi elettrici annui in kWh."""
    consumi = {}

    # 1. Riscaldamento con pompa di calore
    fabbisogno = fabbisogno_termico_kwh(SUPERFICIE_MQ, CLASSE_ENERGETICA, ZONA_CLIMATICA)
    consumi["Riscaldamento (pompa di calore)"] = round(fabbisogno / COP_MEDIO)

    # 2. Acqua calda sanitaria
    if HA_ACS_POMPA_CALORE:
        # ~600-800 kWh termici per persona/anno, diviso COP
        kwh_termici_acs = NUM_PERSONE * 700
        consumi["Acqua calda sanitaria"] = round(kwh_termici_acs / COP_MEDIO)
    else:
        consumi["Acqua calda sanitaria (boiler)"] = round(NUM_PERSONE * 500)

    # 3. Cottura
    if PIANO_INDUZIONE:
        # ~150-180 kWh/persona/anno con induzione
        consumi["Cottura (induzione)"] = round(NUM_PERSONE * 160)
    else:
        consumi["Cottura (fornelli elettrici)"] = round(NUM_PERSONE * 200)

    # 4. Lavatrice
    kwh_per_lavaggio = 1.0  # Media per ciclo
    consumi["Lavatrice"] = round(LAVAGGI_SETTIMANA * 52 * kwh_per_lavaggio)

    # 5. Asciugatrice
    if USA_ASCIUGATRICE:
        kwh_per_asciugatura = 1.5 if ASCIUGATRICE_POMPA_CALORE else 3.5
        cicli_asciugatrice = LAVAGGI_SETTIMANA * 0.8  # Non tutto va in asciugatrice
        consumi["Asciugatrice"] = round(cicli_asciugatrice * 52 * kwh_per_asciugatura)

    # 6. Frigorifero/congelatore
    consumi["Frigorifero/congelatore"] = 350  # Classe A moderna

    # 7. Illuminazione e elettronica
    # ~200 kWh base + ~80 per persona
    consumi["Illuminazione + elettronica"] = round(200 + NUM_PERSONE * 80)

    # 8. Altro (aspirapolvere, forno elettrico, microonde, ecc.)
    consumi["Altri elettrodomestici"] = round(150 + NUM_PERSONE * 50)

    # 9. Auto elettrica (solo ricarica a casa)
    kwh_auto_totali = KM_ANNUI * CONSUMO_AUTO_KWH_100KM / 100
    consumi["Auto elettrica (ricarica casa)"] = round(
        kwh_auto_totali * PERCENTUALE_RICARICA_CASA / 100
    )

    return consumi


def calcola_produzione_solare():
    """Stima la produzione annua dei pannelli solari."""
    # Produzione media in Italia: ~1.100-1.400 kWh per kWp installato
    # Dipende dalla zona (Nord ~1.100, Centro ~1.250, Sud ~1.400)
    produzione_per_kwp = {
        "A": 1400, "B": 1350, "C": 1300, "D": 1250, "E": 1150, "F": 1100
    }
    kwh_per_kwp = produzione_per_kwp.get(ZONA_CLIMATICA.upper(), 1250)
    return round(POTENZA_IMPIANTO_KWP * kwh_per_kwp)


def calcola_autoconsumo(produzione, consumo_totale):
    """Calcola l'autoconsumo in base alla configurazione."""
    if HA_BATTERIA and CAPACITA_BATTERIA_KWH > 0:
        # Con batteria l'autoconsumo sale al 60-80%
        percentuale = min(75, PERCENTUALE_AUTOCONSUMO + 30)
    else:
        percentuale = PERCENTUALE_AUTOCONSUMO

    autoconsumo = round(produzione * percentuale / 100)
    # Non puoi autoconsumere più di quanto consumi
    return min(autoconsumo, consumo_totale)


def stampa_report():
    """Stampa il report completo dei consumi e costi."""
    print("=" * 65)
    print("  CALCOLATORE COSTI ENERGETICI - FAMIGLIA TUTTO ELETTRICO")
    print("=" * 65)
    print()

    # Configurazione
    print(f"  Persone: {NUM_PERSONE}")
    print(f"  Superficie: {SUPERFICIE_MQ} m² | Classe: {CLASSE_ENERGETICA} | Zona: {ZONA_CLIMATICA}")
    print(f"  Impianto FV: {POTENZA_IMPIANTO_KWP} kWp | Batteria: {'Sì' if HA_BATTERIA else 'No'}")
    print(f"  Auto elettrica: {KM_ANNUI} km/anno")
    print(f"  Costo energia: {COSTO_KWH_EURO} €/kWh")
    print()

    # Consumi
    consumi = calcola_consumi()
    consumo_totale = sum(consumi.values())

    print("-" * 65)
    print("  CONSUMI ELETTRICI ANNUI")
    print("-" * 65)
    for voce, kwh in consumi.items():
        costo = kwh * COSTO_KWH_EURO
        barra = "█" * max(1, round(kwh / 300))
        print(f"  {voce:<40} {kwh:>6} kWh  {costo:>7.0f} €")
        print(f"  {barra}")
    print(f"  {'─' * 55}")
    print(f"  {'TOTALE CONSUMO LORDO':<40} {consumo_totale:>6} kWh  {consumo_totale * COSTO_KWH_EURO:>7.0f} €")
    print()

    # Produzione solare
    produzione = calcola_produzione_solare()
    autoconsumo = calcola_autoconsumo(produzione, consumo_totale)
    eccedenza = produzione - autoconsumo

    print("-" * 65)
    print("  PANNELLI SOLARI")
    print("-" * 65)
    print(f"  Produzione annua stimata:        {produzione:>6} kWh")
    print(f"  Autoconsumo diretto:             {autoconsumo:>6} kWh  ({autoconsumo * 100 // produzione}%)")
    print(f"  Eccedenza immessa in rete:        {eccedenza:>6} kWh")
    print()

    # Bilancio
    consumo_netto = consumo_totale - autoconsumo
    costo_energia_rete = consumo_netto * COSTO_KWH_EURO
    ricavo_eccedenza = eccedenza * PREZZO_VENDITA_ECCEDENZA
    costo_netto_annuo = costo_energia_rete - ricavo_eccedenza

    print("-" * 65)
    print("  BILANCIO ECONOMICO")
    print("-" * 65)
    print(f"  Consumo totale:                  {consumo_totale:>6} kWh")
    print(f"  Autoconsumo fotovoltaico:       -{autoconsumo:>6} kWh")
    print(f"  ─────────────────────────────────────────")
    print(f"  Energia prelevata dalla rete:    {consumo_netto:>6} kWh")
    print()
    print(f"  Costo energia dalla rete:                    {costo_energia_rete:>8.0f} €")
    print(f"  Ricavo vendita eccedenza:                    -{ricavo_eccedenza:>7.0f} €")
    print(f"  ─────────────────────────────────────────────────────")
    print(f"  COSTO NETTO ANNUO:                           {costo_netto_annuo:>8.0f} €")
    print(f"  COSTO MEDIO MENSILE:                         {costo_netto_annuo / 12:>8.0f} €")
    print()

    # Confronto con casa tradizionale
    costo_gas_riscaldamento = fabbisogno_termico_kwh(SUPERFICIE_MQ, CLASSE_ENERGETICA, ZONA_CLIMATICA) * 0.08
    costo_gas_acs = NUM_PERSONE * 700 * 0.08
    costo_gas_cottura = NUM_PERSONE * 35
    costo_elettricita_tradizionale = (consumo_totale
                                      - consumi.get("Riscaldamento (pompa di calore)", 0)
                                      - consumi.get("Acqua calda sanitaria", 0)
                                      - consumi.get("Cottura (induzione)", 0)
                                      - consumi.get("Auto elettrica (ricarica casa)", 0)) * 0.28
    costo_benzina = KM_ANNUI * 8 / 100  # 8€/100km con benzina

    costo_tradizionale = (costo_gas_riscaldamento + costo_gas_acs + costo_gas_cottura
                          + costo_elettricita_tradizionale + costo_benzina)

    risparmio = costo_tradizionale - costo_netto_annuo
    risparmio_pct = risparmio / costo_tradizionale * 100 if costo_tradizionale > 0 else 0

    print("-" * 65)
    print("  CONFRONTO CON CASA TRADIZIONALE (gas + benzina)")
    print("-" * 65)
    print(f"  Gas riscaldamento:                           {costo_gas_riscaldamento:>8.0f} €")
    print(f"  Gas acqua calda:                             {costo_gas_acs:>8.0f} €")
    print(f"  Gas cottura:                                 {costo_gas_cottura:>8.0f} €")
    print(f"  Elettricità (senza risc/ACS/cottura/auto):   {costo_elettricita_tradizionale:>8.0f} €")
    print(f"  Benzina auto ({KM_ANNUI} km):               {costo_benzina:>8.0f} €")
    print(f"  ─────────────────────────────────────────────────────")
    print(f"  TOTALE CASA TRADIZIONALE:                    {costo_tradizionale:>8.0f} €")
    print()
    print(f"  RISPARMIO ANNUO:  {risparmio:>8.0f} € ({risparmio_pct:.0f}%)")
    print(f"  RISPARMIO MENSILE: {risparmio / 12:>7.0f} €")
    print()
    print("=" * 65)
    print("  NOTA: Queste sono stime indicative. I consumi reali dipendono")
    print("  da abitudini, isolamento, clima locale e tariffe applicate.")
    print("=" * 65)


if __name__ == "__main__":
    stampa_report()
