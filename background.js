// background.js — Firefox MV2
// All network fetching happens here (no CORS restrictions)

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'FETCH_IP_INFO') {
    return fetchIPInfo(); // Firefox: return Promise directly
  }
  if (msg.type === 'GEO_RESULT') {
    browser.storage.local.set({ realLocation: msg.data });
  }
  if (msg.type === 'REVERSE_GEOCODE') {
    return reverseGeocode(msg.lat, msg.lon);
  }
});

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchJSON(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

// ── IP Info — tries 4 APIs in order ──────────────────────────────────────────
async function fetchIPInfo() {

  // 1️⃣ ipinfo.io — best ISP/ASN database, 50k/month free
  try {
    const d = await fetchJSON('https://ipinfo.io/json');
    if (d.ip && !d.bogon) {
      const orgParts = (d.org || '').match(/^(AS\d+)\s*(.*)$/);
      const [lat, lon] = (d.loc || ',').split(',').map(Number);
      console.log('[BG] ✅ ipinfo.io:', d.ip, d.city, d.region, d.org);
      return {
        ip:           d.ip,
        city:         d.city     || '',
        region:       d.region   || '',
        country_code: d.country  || '',
        country_name: getCountryName(d.country),
        isp:          cleanISP(orgParts?.[2] || d.org || ''),
        asn:          orgParts?.[1] || '',
        tz:           d.timezone || '',
        lat:          isNaN(lat) ? null : lat,
        lon:          isNaN(lon) ? null : lon,
        source:       'ipinfo.io'
      };
    }
  } catch (e) { console.warn('[BG] ipinfo.io failed:', e.message); }

  // 2️⃣ ipapi.co — 1000/day free
  try {
    const d = await fetchJSON('https://ipapi.co/json/');
    if (d.ip && !d.error) {
      console.log('[BG] ✅ ipapi.co:', d.ip, d.city, d.org);
      return {
        ip:           d.ip,
        city:         d.city         || '',
        region:       d.region       || '',
        country_code: d.country_code || '',
        country_name: d.country_name || '',
        isp:          cleanISP(d.org || ''),
        asn:          d.asn          || '',
        tz:           d.timezone     || '',
        lat:          d.latitude,
        lon:          d.longitude,
        source:       'ipapi.co'
      };
    }
  } catch (e) { console.warn('[BG] ipapi.co failed:', e.message); }

  // 3️⃣ ipwho.is — unlimited free
  try {
    const d = await fetchJSON('https://ipwho.is/');
    if (d.ip && d.success) {
      console.log('[BG] ✅ ipwho.is:', d.ip, d.city);
      return {
        ip:           d.ip,
        city:         d.city         || '',
        region:       d.region       || '',
        country_code: d.country_code || '',
        country_name: d.country      || '',
        isp:          cleanISP(d.connection?.isp || d.connection?.org || ''),
        asn:          d.connection?.asn ? `AS${d.connection.asn}` : '',
        tz:           d.timezone?.id  || '',
        lat:          d.latitude,
        lon:          d.longitude,
        source:       'ipwho.is'
      };
    }
  } catch (e) { console.warn('[BG] ipwho.is failed:', e.message); }

  // 4️⃣ freeipapi.com — fallback
  try {
    const d = await fetchJSON('https://freeipapi.com/api/json');
    if (d.ipAddress) {
      console.log('[BG] ✅ freeipapi:', d.ipAddress, d.cityName);
      return {
        ip:           d.ipAddress,
        city:         d.cityName    || '',
        region:       d.regionName  || '',
        country_code: d.countryCode || '',
        country_name: d.countryName || '',
        isp:          cleanISP(d.isp || ''),
        asn:          '',
        tz:           d.timeZone    || '',
        lat:          d.latitude,
        lon:          d.longitude,
        source:       'freeipapi.com'
      };
    }
  } catch (e) { console.warn('[BG] freeipapi failed:', e.message); }

  throw new Error('All IP APIs failed — check your internet connection');
}

// ── Reverse geocode lat/lon → address (OpenStreetMap Nominatim, free) ─────────
async function reverseGeocode(lat, lon) {
  try {
    const d = await fetchJSON(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      8000
    );
    const a = d.address || {};
    return {
      suburb:   a.suburb || a.neighbourhood || a.quarter || '',
      city:     a.city   || a.town || a.village || a.county || '',
      state:    a.state  || '',
      postcode: a.postcode || '',
      country:  a.country  || '',
      display:  d.display_name || ''
    };
  } catch (e) {
    console.warn('[BG] Nominatim failed:', e.message);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanISP(raw) {
  if (!raw) return '';
  return raw
    .replace(/Broadband Internet Service Provider INDIA/gi, '')
    .replace(/Internet Service Provider/gi, '')
    .replace(/Private Limited/gi, '')
    .replace(/\bPvt\.?\s*Ltd\.?\b/gi, '')
    .replace(/\bLimited\b/gi, '')
    .replace(/\bInc\.?\b/gi, '')
    .replace(/\bLLC\.?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[,.\s]+$/, '');
}

function getCountryName(code) {
  if (!code) return '';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; }
  catch { return code; }
}
