/*
 * ALTEZ Data Delen - centrale configuratie.
 * De Core API base is de huidige publieke Trimble Connect Core endpoint.
 */
window.ALTEZ_SHARE_CONFIG = {
  coreApiBase: "https://app.connect.trimble.com/tc/api/2.0",
  defaultExpiryMonths: 2,
  defaultPermission: "VIEW",
  defaultUseLatestVersion: false,

  /*
   * Het create-share schema van Trimble bevat de kernvelden hieronder.
   * notify + expiresOn worden gebruikt voor de Share Data-notificatie en vervaldatum.
   * De app toont de volledige serverfout wanneer een tenant/API-versie een afwijkend schema vereist.
   */
  shareFields: {
    notify: "notify",
    expiresOn: "expiresOn"
  }
};
