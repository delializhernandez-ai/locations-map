import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

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

app.get('/api/locations', async (req, res) => {
  try {
    let allLocations = [];
    let after = null;
    let pageNum = 1;

    // Paginate through all locations
    while (true) {
      let url = `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_OBJECT_TYPE}?limit=100&properties=property_name,property_address,property_address_2,city,property_state,zip_postal_code,latitude,longitude,location_status,brand,location_company_name`;
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
        console.error(`❌ HubSpot API Error: ${response.status} ${response.statusText}`);
        console.error(`Response: ${errorText}`);
        return res.status(response.status).json({
          error: `HubSpot API Error: ${response.status} ${response.statusText}`,
          details: errorText,
        });
      }

      const data = await response.json();
      allLocations.push(...(data.results || []));
      console.log(`✅ Page ${pageNum}: ${data.results?.length || 0} locations`);

      // Check if there are more pages
      if (data.paging?.next?.after) {
        after = data.paging.next.after;
        pageNum++;
      } else {
        break;
      }
    }

    // Count locations with valid coordinates
    const withCoords = allLocations.filter(loc => {
      const props = loc.properties || {};
      return props.latitude && props.longitude;
    });

    // Show first location's properties for debugging
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total locations: ${allLocations.length}`);
    console.log(`   With coordinates: ${withCoords.length}`);
    console.log(`   Missing coordinates: ${allLocations.length - withCoords.length}`);

    if (allLocations.length > 0) {
      console.log(`\n🔍 ALL PROPERTY NAMES AVAILABLE:`);
      const firstProps = allLocations[0].properties || {};
      const propNames = Object.keys(firstProps).sort();
      console.log(`   ${propNames.join(', ')}`);

      console.log(`\n📋 FIRST LOCATION VALUES:`);
      propNames.forEach(key => {
        if (firstProps[key]) console.log(`   ${key}: ${firstProps[key]}`);
      });
    }
    console.log('');

    res.json({ results: allLocations, paging: { total: allLocations.length } });
  } catch (error) {
    console.error('❌ Server Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch locations',
      message: error.message,
    });
  }
});

// Get Location Status enum options
app.get('/api/location-status-options', async (req, res) => {
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/2-16842375?limit=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch property options' });
    }

    // Common location statuses - fallback if we can't get from HubSpot
    const defaultStatuses = ['Active', 'Inactive', 'Archived', 'Pending'];

    res.json({ options: defaultStatuses });
  } catch (error) {
    console.error('Error fetching status options:', error);
    const defaultStatuses = ['Active', 'Inactive', 'Archived', 'Pending'];
    res.json({ options: defaultStatuses });
  }
});

// Get Business Vertical options
app.get('/api/business-vertical-options', async (req, res) => {
  try {
    let allLocations = [];
    let after = null;

    // Fetch locations to extract unique brand values
    while (true) {
      let url = `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_OBJECT_TYPE}?limit=100&properties=brand`;
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
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const data = await response.json();
      allLocations.push(...(data.results || []));

      if (data.paging?.next?.after) {
        after = data.paging.next.after;
      } else {
        break;
      }
    }

    // Extract unique brand values
    const verticals = [...new Set(
      allLocations
        .map(loc => loc.properties?.brand)
        .filter(Boolean)
    )].sort();

    res.json({ options: verticals });
  } catch (error) {
    console.error('Error fetching vertical options:', error);
    res.json({ options: [] });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/locations\n`);
});
