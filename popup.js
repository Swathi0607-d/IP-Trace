// popup.js — Firefox MV2
'use strict';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  loadIPInfo();
  $('refreshBtn').addEventListener('click',     loadIPInfo);
  $('retryBtn').addEventListener('click',       loadIPInfo);
  $('copyBtn').addEventListener('click',        copyIP);
  $('geoBtn').addEventListener('click',         startGeoLocation);
  $('geoRetryBtn').addEventListener('click',    startGeoLocation);
  $('geoRefreshBtn').addEventListener('click',  startGeoLocation);
});

// ── Load IP Info ──────────────────────────────────────────────────────────────
async function loadIPInfo() {
  showState('loading');
  spinRefresh(true);

  try {
    const data = await browser.runtime.sendMessage({ type: 'FETCH_IP_INFO' });
    if (!data?.ip) throw new Error('No data returned');
    renderIPInfo(data);
    showState('content');
  } catch (err) {
    console.error('[Popup] IP fetch error:', err);
    $('errorMsg').textContent = err.message || 'Could not detect IP. Check your connection.';
    showState('error');
  } finally {
    spinRefresh(false);
  }
}

// ── Render IP Info fields ─────────────────────────────────────────────────────
function renderIPInfo(d) {
  $('ipv4').textContent = d.ip || '—';

  setText('city',    d.city);
  setText('region',  d.region);
  setText('isp',     d.isp);
  setText('timezone', formatTZ(d.tz));

  // Country with flag emoji
  const cc   = d.country_code || '';
  const name = d.country_name || cc;
  $('country').textContent = cc ? `${flagEmoji(cc)} ${name}` : (name || '—');

  // ASN — clickable link to ARIN
  const asnEl = $('asnLink');
  if (d.asn) {
    const num = d.asn.match(/\d+/)?.[0];
    asnEl.textContent = d.asn;
    asnEl.href = num ? `https://search.arin.net/rdap/?query=AS${num}` : '#';
  } else {
    asnEl.textContent = '—';
    asnEl.removeAttribute('href');
  }

  // ISP map (routing node location)
  if (d.lat && d.lon) {
    updateMap('ispMapFrame', d.lat, d.lon, 0.15);
    $('ispMapWrap').style.display = 'block';
  }

  $('lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  $('sourceTag').textContent   = d.source ? `via ${d.source}` : '';
}

// ── Geolocation ───────────────────────────────────────────────────────────────
async function startGeoLocation() {
  showGeoState('loading');
  $('geoLoadingText').textContent = 'Requesting location permission…';

  try {
    // Get the active tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab  = tabs[0];

    if (!tab?.id) throw new Error('No active tab found. Open a webpage first.');

    // Check if we can inject (can't inject into about:// pages)
    if (tab.url?.startsWith('about:') || tab.url?.startsWith('moz-extension:')) {
      throw new Error('Please open a normal webpage (like google.com) first, then click again.');
    }

    // Clear old result
    await browser.storage.local.remove('realLocation');

    // Inject content script into active tab
    await browser.tabs.executeScript(tab.id, { file: 'content.js' });

    $('geoLoadingText').textContent = 'Waiting for location permission…';

    // Poll for result (content.js sends via background to storage)
    const geo = await waitForGeoResult(12000);

    if (!geo.granted) {
      throw new Error(geo.error || 'Location permission denied');
    }

    $('geoLoadingText').textContent = 'Getting your address…';

    // Reverse geocode via background (avoids CORS in popup)
    const address = await browser.runtime.sendMessage({
      type: 'REVERSE_GEOCODE',
      lat:  geo.lat,
      lon:  geo.lon
    });

    renderRealLocation(geo, address);
    showGeoState('success');

  } catch (err) {
    console.error('[Popup] Geo error:', err);
    $('geoErrorMsg').textContent = err.message;
    showGeoState('error');
  }
}

// ── Poll storage until content.js result arrives ──────────────────────────────
function waitForGeoResult(timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = setInterval(async () => {
      const stored = await browser.storage.local.get('realLocation');
      if (stored.realLocation) {
        clearInterval(poll);
        await browser.storage.local.remove('realLocation');
        resolve(stored.realLocation);
      }
      if (Date.now() > deadline) {
        clearInterval(poll);
        resolve({ granted: false, error: 'Location request timed out. Try again.' });
      }
    }, 400);
  });
}

// ── Render real location ──────────────────────────────────────────────────────
function renderRealLocation(geo, addr) {
  // Full display address
  const parts = [addr?.suburb, addr?.city, addr?.state, addr?.country].filter(Boolean);
  $('geoAddress').textContent  = parts.join(', ') || addr?.display || '—';
  $('geoSuburb').textContent   = addr?.suburb  || '—';
  $('geoCity').textContent     = addr?.city    || '—';
  $('geoState').textContent    = addr?.state   || '—';
  $('geoAccuracy').textContent = geo.accuracy ? `±${Math.round(geo.accuracy)} metres` : '—';
  $('geoCoords').textContent   = `${geo.lat?.toFixed(5)}, ${geo.lon?.toFixed(5)}`;

  // Postal code — the main one users care about
  const postal = addr?.postcode || '';
  $('geoPostal').textContent = postal || 'Not available';

  // Real location map — zoomed in tight
  updateMap('realMapFrame', geo.lat, geo.lon, 0.015);
}

// ── Update OpenStreetMap iframe ───────────────────────────────────────────────
function updateMap(frameId, lat, lon, zoom) {
  const frame = $(frameId);
  if (!frame || !lat || !lon) return;
  frame.src =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lon - zoom},${lat - zoom},${lon + zoom},${lat + zoom}` +
    `&layer=mapnik&marker=${lat},${lon}`;
}

// ── UI State Helpers ──────────────────────────────────────────────────────────
function showState(s) {
  $('loadingState').style.display = s === 'loading' ? 'flex'  : 'none';
  $('errorState').style.display   = s === 'error'   ? 'flex'  : 'none';
  $('mainContent').style.display  = s === 'content' ? 'block' : 'none';
}

function showGeoState(s) {
  $('geoNotFetched').style.display = s === 'idle'    ? 'block' : 'none';
  $('geoLoading').style.display    = s === 'loading' ? 'flex'  : 'none';
  $('geoError').style.display      = s === 'error'   ? 'block' : 'none';
  $('geoSuccess').style.display    = s === 'success' ? 'block' : 'none';
}

function spinRefresh(on) {
  $('refreshBtn').classList.toggle('spinning', on);
}

// ── Copy IP to clipboard ──────────────────────────────────────────────────────
async function copyIP() {
  const ip = $('ipv4').textContent;
  if (!ip || ip === '—') return;
  try {
    await navigator.clipboard.writeText(ip);
    $('copyBtn').classList.add('copied');
    $('copyLabel').textContent = '✓ Copied!';
    setTimeout(() => {
      $('copyBtn').classList.remove('copied');
      $('copyLabel').textContent = 'Copy';
    }, 2000);
  } catch (e) { console.warn('Clipboard failed:', e); }
}

// ── Utility ───────────────────────────────────────────────────────────────────
function setText(id, val) {
  $(id).textContent = val?.trim() || '—';
}

function formatTZ(tz) {
  if (!tz) return '';
  try {
    const off = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || '';
    return off ? `${tz}  ${off}` : tz;
  } catch { return tz; }
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  try {
    return [...code.toUpperCase()]
      .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
      .join('');
  } catch { return ''; }
}
