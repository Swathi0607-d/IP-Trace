// content.js — injected into active tab by Firefox extension
// Requests real GPS/WiFi location using Mozilla Location Services

(function () {
  // Prevent double injection
  if (window.__myIPInfoGeoRunning) return;
  window.__myIPInfoGeoRunning = true;

  if (!('geolocation' in navigator)) {
    browser.runtime.sendMessage({
      type: 'GEO_RESULT',
      data: { error: 'Geolocation not supported in this browser', granted: false }
    });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Success — real GPS/WiFi coordinates
      browser.runtime.sendMessage({
        type: 'GEO_RESULT',
        data: {
          granted:  true,
          lat:      pos.coords.latitude,
          lon:      pos.coords.longitude,
          accuracy: pos.coords.accuracy, // in metres
          altitude: pos.coords.altitude,
          ts:       pos.timestamp
        }
      });
    },
    (err) => {
      // Failed — user denied or timed out
      const reasons = {
        1: 'Location permission denied by user',
        2: 'Location unavailable (check device settings)',
        3: 'Location request timed out'
      };
      browser.runtime.sendMessage({
        type: 'GEO_RESULT',
        data: {
          granted: false,
          error:   reasons[err.code] || err.message,
          code:    err.code
        }
      });
    },
    {
      enableHighAccuracy: true, // use GPS chip if available
      timeout:            10000, // 10 seconds
      maximumAge:         60000  // accept cached result up to 1 min old
    }
  );
})();
