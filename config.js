// Optional live database endpoint.
// Leave blank to use ./data/bacteria.json bundled with the site.
// When your Google Sheet + Apps Script web app is ready, paste its /exec URL here.
window.BACTERIA_SURVIVAL_CONFIG = {
  googleAppsScriptUrl: "",
  localDataUrl: "./data/bacteria.json",
  liveLoadTimeoutMs: 7000
};
