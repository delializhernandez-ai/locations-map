import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, put } from '@vercel/blob';
import { waitUntil } from '@vercel/functions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HUBSPOT_API_KEY = process.env.VITE_HUBSPOT_API_KEY;
const HUBSPOT_OBJECT_TYPE = process.env.VITE_HUBSPOT_OBJECT_TYPE || '2-16842375';

// Fetching ~6,500 records means ~65 sequential HubSpot pages; the default
// 10s Vercel timeout isn't enough, so raise it to fit the full pagination.
export const config = {
  maxDuration: 60,
};

// HubSpot has no latitude/longitude property on this object, so geocoded
// coordinates live in a JSON cache (see scripts/geocode-backfill.js) keyed
// by record id, and get merged into each result here.
async function loadGeocodeCache() {
  try {
    const filePath = path.resolve(__dirname, '..', 'data', 'geocoded-locations.json');
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// The full location list (names/addresses/statuses) is expensive to fetch
// live from HubSpot (~65 sequential paginated requests), so it's cached in
// Vercel Blob. Expired entries are served anyway (stale-while-revalidate)
// while a background refresh updates the cache, so no visitor ever waits
// on the full HubSpot crawl. Coordinates are still merged in fresh from
// the geocode cache so staleness only affects HubSpot-sourced fields.
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

async function fetchAllFromHubSpot() {
  const allLocations = [];
  let after = null;

  while (true) {
    let url = `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_OBJECT_TYPE}?limit=100&properties=property_name,property_address,property_address_2,property_city,property_state,property_zip_code,location_status,brand,location_company_name,package`;
    if (after) {
      url += `&after=${after}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    allLocations.push(...(data.results || []));

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  return allLocations;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const geocodeCache = await loadGeocodeCache();

    let allLocations;
    const cached = await readListCache();
    if (cached) {
      allLocations = cached.results;
      if (cached.isStale) {
        // Serve the stale list immediately; refresh the cache after the
        // response is sent so this visitor doesn't wait on HubSpot.
        waitUntil(
          fetchAllFromHubSpot()
            .then(writeListCache)
            .catch((error) => console.error('Background refresh failed:', error.message))
        );
      }
    } else {
      // Cache has never been populated — nothing to serve stale, so this
      // one request pays the full fetch cost.
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
    console.error('Server Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch locations',
      message: error.message,
    });
  }
}
