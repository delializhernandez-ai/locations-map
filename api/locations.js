import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let allLocations = [];
    let after = null;
    let pageNum = 1;
    const geocodeCache = await loadGeocodeCache();

    // Paginate through all locations
    while (true) {
      let url = `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_OBJECT_TYPE}?limit=100&properties=property_name,property_address,property_address_2,property_city,property_state,property_zip_code,location_status,brand,location_company_name`;
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
        console.error(`HubSpot API Error: ${response.status}`);
        return res.status(response.status).json({
          error: `HubSpot API Error: ${response.status}`,
          details: errorText,
        });
      }

      const data = await response.json();
      const results = (data.results || []).map((record) => {
        const cached = geocodeCache[record.id];
        if (cached) {
          record.properties.latitude = cached.lat;
          record.properties.longitude = cached.lng;
        }
        return record;
      });
      allLocations.push(...results);

      if (data.paging?.next?.after) {
        after = data.paging.next.after;
        pageNum++;
      } else {
        break;
      }
    }

    res.json({ results: allLocations, paging: { total: allLocations.length } });
  } catch (error) {
    console.error('Server Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch locations',
      message: error.message,
    });
  }
}
