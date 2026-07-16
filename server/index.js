import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, put } from '@vercel/blob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

async function loadGeocodeCache() {
  try {
    const filePath = path.resolve(__dirname, '..', 'data', 'geocoded-locations.json');
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Same shared Vercel Blob cache the deployed api/locations.js uses, so the
// full HubSpot list isn't refetched on every local request either.
const LIST_CACHE_PATHNAME = 'locations-cache.json';
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;

async function readListCache() {
  try {
    const result = await get(LIST_CACHE_PATHNAME, { access: 'private' });
    if (result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return {
      results: parsed.results,
      isStale: Date.now() - parsed.fetchedAt > LIST_CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

let refreshInFlight = false;
function refreshListCacheInBackground() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  fetchAllFromHubSpot()
    .then(writeListCache)
    .catch((error) => console.error('Background refresh failed:', error.message))
    .finally(() => {
      refreshInFlight = false;
    });
}

async function writeListCache(results) {
  try {
    await put(LIST_CACHE_PATHNAME, JSON.stringify({ fetchedAt: Date.now(), results }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Failed to write list cache:', error.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const HUBSPOT_API_KEY = process.env.VITE_HUBSPOT_API_KEY;
const HUBSPOT_OBJECT_TYPE = process.env.VITE_HUBSPOT_OBJECT_TYPE || '2-16842375';

if (!HUBSPOT_API_KEY) {
  console.error('❌ Error: VITE_HUBSPOT_API_KEY not found in .env.local');
  process.exit(1);
}

console.log(`✅ HubSpot API Key configured`);
console.log(`✅ Object Type: ${HUBSPOT_OBJECT_TYPE}`);

async function fetchAllFromHubSpot() {
  const allLocations = [];
  let after = null;
  let pageNum = 1;

  while (true) {
    let url = `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_OBJECT_TYPE}?limit=100&properties=property_name,property_address,property_address_2,property_city,property_state,property_zip_code,location_status,brand,location_company_name`;
    if (after) {
      url += `&after=${after}`;
    }

    console.log(`📍 Fetching page ${pageNum}...`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API Error: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json();
    allLocations.push(...(data.results || []));
    console.log(`✅ Page ${pageNum}: ${data.results?.length || 0} locations`);

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
      pageNum++;
    } else {
      break;
    }
  }

  return allLocations;
}

app.get('/api/locations', async (req, res) => {
  try {
    const geocodeCache = await loadGeocodeCache();

    let allLocations;
    const cached = await readListCache();
    if (cached) {
      allLocations = cached.results;
      if (cached.isStale) {
        console.log('📦 Serving stale location list, refreshing in background');
        refreshListCacheInBackground();
      } else {
        console.log('📦 Serving location list from cache');
      }
    } else {
      allLocations = await fetchAllFromHubSpot();
      await writeListCache(allLocations);
    }

    const results = allLocations.map((record) => {
      const cached = geocodeCache[record.id];
      if (cached) {
        record.properties.latitude = cached.lat;
        record.properties.longitude = cached.lng;
      }
      return record;
    });

    res.json({ results, paging: { total: results.length } });
  } catch (error) {
    console.error('❌ Server Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch locations',
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/locations\n`);
});
