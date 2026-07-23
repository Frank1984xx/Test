# Smart Order — Gruppo Ethos

Strato applicativo ("smart") sopra il foglio Google **Smart Order**, che fa da
database per la gestione approvvigionamenti dei ristoranti del Gruppo Ethos.

Il foglio contiene già i dati (ristoranti, listini fornitori, ordini, bolle,
fatture elettroniche, pagamenti, movimenti di magazzino, storico prezzi). Questo
progetto aggiunge la logica che rende il flusso **automatico**:

```
Listino  →  Ordine  →  Email al fornitore  →  Bolla (foto/OCR + verifica)
                                                  │
                        Storico prezzi ◄──────────┤ (Prezzo listino vs bolla)
                                                  ▼
                              Fattura elettronica (XML) → Riconciliazione → Pagamento
```

## Perché Google Apps Script

L'app è scritta in **Google Apps Script** perché si aggancia direttamente al
foglio esistente:

- nessun hosting né credenziali esterne da gestire;
- invio email ordini nativo (`MailApp`);
- OCR delle bolle tramite Google Drive;
- deploy come **Web App** con interfaccia utente.

Il codice è gestito con [`clasp`](https://github.com/google/clasp) così da vivere
in questo repo GitHub ed essere versionato.

## Struttura

| File | Ruolo |
|---|---|
| `src/00_Config.gs`  | ID foglio, nomi logici tabelle, costanti |
| `src/01_Sheets.gs`  | Accesso al foglio **per intestazioni** (robusto ai nomi dei tab) |
| `src/02_Repo.gs`    | Accessori tipizzati alle tabelle (ristoranti, listino, ordini…) |
| `src/03_Ordini.gs`  | Creazione ordine, calcolo totale, invio email, `Email_Inviata` |
| `src/04_Bolle.gs`   | OCR bolla + verifica prodotti vs ordine + discrepanze |
| `src/05_Prezzi.gs`  | Confronto prezzo listino vs bolla, variazione % |
| `src/06_Fatture.gs` | Parsing fattura elettronica (XML FatturaPA) + riconciliazione |
| `src/10_WebApp.gs`  | `doGet`, API lato server per la UI |
| `src/Index.html`    | Interfaccia Web App (dashboard, nuovo ordine, ordini, alert) |

## Deploy

Prerequisiti: Node.js e `clasp` (`npm i -g @google/clasp`), quindi `clasp login`.

1. Copia `.clasp.json.example` in `.clasp.json` e inserisci lo `scriptId` del
   progetto Apps Script legato al foglio Smart Order
   (nel foglio: *Estensioni → Apps Script*, poi *Impostazioni progetto → ID*).
2. Imposta l'ID del foglio in `src/00_Config.gs` (`SPREADSHEET_ID`) — oppure
   lascia vuoto se lo script è **bound** al foglio.
3. `clasp push` per caricare il codice.
4. Dal progetto Apps Script: *Distribuisci → Nuova distribuzione → Web app*.

## Stato

Implementato in questa iterazione:

- [x] Accesso al foglio per intestazioni (resiliente ai nomi dei tab)
- [x] Repository tipizzato di tutte le tabelle
- [x] Flusso **Ordini**: creazione, calcolo totale, invio email, `Email_Inviata`
- [x] **Controllo prezzi**: confronto listino vs bolla con variazione %
- [x] **Web App**: dashboard, nuovo ordine, elenco ordini, alert scostamenti
- [x] **Bolle**: OCR foto + verifica prodotti vs ordine (prima versione)
- [x] **Fatture**: parsing XML FatturaPA + riconciliazione con bolle (prima versione)

Da chiudere (vedi anche le note nel codice):

- [ ] **Anagrafica Fornitori con email**: oggi manca; senza, l'invio ordine non
      ha destinatario. Serve un tab `Fornitori` con almeno `ID_Fornitore, Nome, Email`.
- [ ] **Allineamento ID fornitore**: il listino usa codici tipo `00004`/`00058`,
      la mappatura Fornitori↔Ristoranti usa `FORN-001`. Da uniformare.
