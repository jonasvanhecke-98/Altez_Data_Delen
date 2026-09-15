# ALTEZ Data Delen - testversie v1

Deze extensie is bedoeld voor Trimble Connect for Browser als `3dviewer` extensie.

## Wat deze versie doet

- Leest alleen de modellen die momenteel `loaded` zijn in de 3D Viewer.
- Selecteert standaard alle geladen modellen.
- Opent eerst een eigen **Data delen** venster; er wordt dus nooit automatisch gedeeld.
- Standaard sharetype: **Iedere gebruiker met de koppeling** (`PUBLIC`).
- Vult standaard het e-mailadres van de ingelogde Trimble-gebruiker in.
- Het e-mailadres blijft aanpasbaar.
- Vervaldatum: standaard vandaag + 2 maanden.
- Toegang: standaard **Alleen bekijken** (`VIEW`).
- **Laatste versie tonen** staat standaard uit; de actieve modelversie wordt meegestuurd.
- Bij `Delen` wordt `POST /shares` aangeroepen met de access token van de huidige gebruiker.
- De share-aanvraag bevat `notify: [email]`, zodat Trimble de notificatiemail naar het ingevulde adres kan sturen.
- Na succes verschijnt de echte sharelink met knop **Kopiëren**.
- Bij een fout toont de popup servermelding + request details, zodat de API-call gericht aangepast kan worden.

## Eerst de interface testen zonder Trimble

Host de map of gebruik een eenvoudige webserver en open:

`index.html?demo=1`

De demo maakt geen echte share aan en verstuurt geen mail.

## Installeren via GitHub Pages

Deze `manifest.json` gaat uit van repositorynaam:

`Altez_Data_Delen`

onder GitHub-account:

`jonasvanhecke-98`

1. Maak de repository `Altez_Data_Delen`.
2. Upload alle bestanden uit deze map in de root van de repository.
3. Zet **Settings -> Pages -> Deploy from a branch -> main / root** aan.
4. Controleer dat de pagina opent op:
   `https://jonasvanhecke-98.github.io/Altez_Data_Delen/`
5. Voeg in Trimble Connect bij **Project Settings -> Apps & Capabilities -> Add custom** deze manifest-URL toe:
   `https://jonasvanhecke-98.github.io/Altez_Data_Delen/manifest.json`
6. Open het project in de 3D Viewer en open **ALTEZ Data Delen**.
7. De eerste keer dat je op Delen klikt, kan Trimble toestemming vragen voor gebruik van de access token. Sta dit toe en klik daarna opnieuw op Delen.

## Testscenario

1. Laad 2 of meer IFC-modellen in de 3D Viewer.
2. Open de extensie; controleer of exact die modellen worden geteld.
3. Klik **Data delen**.
4. Controleer of je eigen Trimble-e-mailadres is ingevuld.
5. Controleer of vervaldatum op +2 maanden staat.
6. Controleer **Alleen bekijken** en dat **Laatste versie tonen** uit staat.
7. Pas eventueel een veld aan.
8. Klik **Delen**.
9. Controleer dat een Trimble-sharelink verschijnt.
10. Controleer je mailbox op de Trimble-deelmail.

## Belangrijk voor de eerste echte test

De publiek bevestigde kern van `POST /shares` is `mode`, `projectId`, `permission`, `objects`, `useLatestVersion` en `message`. De Share Data UI ondersteunt daarnaast e-mailnotificatie en vervaldatum. Deze testversie stuurt die als `notify` en `expiresOn`.

Als jouw huidige Trimble-tenant voor één van die velden een andere actuele propertynaam verwacht, zal de extensie de serverfout in **Technische details** tonen. Stuur die fout door; dan kan alleen `config.js` / de payloadmapping aangepast worden zonder de UI opnieuw te bouwen.
