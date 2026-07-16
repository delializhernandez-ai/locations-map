// Geocode HubSpot locations that are new or whose address changed since
// the last run, and write the results to data/geocoded-locations.json,
// keyed by record id. api/locations.js reads this cache and merges it
// into each response so the app never re-geocodes on page load.
//
// Run locally: node scripts/geocode-backfill.js
// Runs nightly via .github/workflows/geocode-backfill.yml
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

const env = process.env;
const HUBSPOT_API_KEY = env.VITE_HUBSPOT_API_KEY;
const HUBSPOT_OBJECT_TYPE = env.VITE_HUBSPOT_OBJECT_TYPE || '2-16842375';
const GOOGLE_MAPS_API_KEY = env.VITE_GOOGLE_MAPS_API_KEY;
const CACHE_PATH = path.resolve(__dirname, '..', 'data', 'geocoded-locations.json');

if (!HUBSPOT_API_KEY || !GOOGLE_MAPS_API_KEY) {
  console.error('Missing VITE_HUBSPOT_API_KEY or VITE_GOOGLE_MAPS_API_KEY in .env.local');
  process.exit(1);
}

const PROPERTIES = [
  'property_name',
  'property_address',
  'property_address_2',
  'property_city',
  'property_state',
  'property_zip_code',
].join(',');

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

async function loadCache() {
  try {
    const raw = await readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function fetchAllLocations() {
  const all = [];
  let after = null;

  while (true) {
    let url = `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_OBJECT_TYPE}?limit=100&properties=${PROPERTIES}`;
    if (after) url += `&after=${after}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${HUBSPOT_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`HubSpot fetch failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    all.push(...(data.results || []));
    process.stdout.write(`\rFetched ${all.length} locations...`);

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  console.log('');
  return all;
}

function buildAddressKey(props) {
  return [props.property_address, props.property_city, props.property_state, props.property_zip_code]
    .filter(Boolean)
    .join(', ');
}

async function geocodeAddress(address, city, state, zip) {
  const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
  if (!fullAddress) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    fullAddress
  )}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.results?.[0]) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('OVER_QUERY_LIMIT');
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching all locations from HubSpot...');
  const allLocations = await fetchAllLocations();

  const cache = await loadCache();

  // Older cache entries predate address-drift detection and have no
  // `address` fingerprint. Backfill it in place without re-geocoding.
  let migrated = 0;
  for (const record of allLocations) {
    const cached = cache[record.id];
    if (cached && !cached.address) {
      cached.address = buildAddressKey(record.properties || {});
      migrated++;
    }
  }
  if (migrated > 0) {
    await saveCache(cache);
    console.log(`Migrated ${migrated} cache entries to include an address fingerprint.`);
  }

  const missing = allLocations.filter((loc) => {
    const props = loc.properties || {};
    const hasAddress = props.property_address || props.property_city;
    if (!hasAddress) return false;

    const cached = cache[loc.id];
    if (!cached) return true; // never geocoded
    return cached.address !== buildAddressKey(props); // address changed since last geocode
  });

  console.log(
    `${allLocations.length} total locations, ${Object.keys(cache).length} already cached, ${missing.length} to geocode.\n`
  );

  if (missing.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  const results = { geocoded: 0, no_result: 0, error: 0 };
  const errors = [];

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (record) => {
        const props = record.properties || {};
        const label = props.property_name || record.id;
        try {
          const coords = await geocodeAddress(
            props.property_address,
            props.property_city,
            props.property_state,
            props.property_zip_code
          );
          if (!coords) return { id: record.id, label, status: 'no_result' };
          cache[record.id] = { ...coords, address: buildAddressKey(props) };
          return { id: record.id, label, status: 'geocoded' };
        } catch (error) {
          return { id: record.id, label, status: 'error', error: error.message };
        }
      })
    );

    for (const r of batchResults) {
      results[r.status]++;
      if (r.status === 'error') errors.push(r);
    }

    // Save incrementally so progress isn't lost if the script is interrupted.
    await saveCache(cache);

    process.stdout.write(
      `\rProcessed ${Math.min(i + BATCH_SIZE, missing.length)}/${missing.length} ` +
        `(geocoded: ${results.geocoded}, no result: ${results.no_result}, errors: ${results.error})`
    );

    await sleep(BATCH_DELAY_MS);
  }

  console.log('\n\nDone.');
  console.log(`Geocoded and cached: ${results.geocoded}`);
  console.log(`No geocoding result: ${results.no_result}`);
  console.log(`Errors: ${results.error}`);
  console.log(`\nCache written to ${CACHE_PATH}`);

  if (errors.length > 0) {
    console.log('\nRecords with errors:');
    errors.slice(0, 20).forEach((e) => console.log(`  - ${e.label} (${e.id}): ${e.error}`));
    if (errors.length > 20) console.log(`  ...and ${errors.length - 20} more`);
  }
}

main().catch((error) => {
  console.error('\nBackfill failed:', error.message);
  process.exit(1);
});
