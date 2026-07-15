const HUBSPOT_API_KEY = process.env.VITE_HUBSPOT_API_KEY;
const HUBSPOT_OBJECT_TYPE = process.env.VITE_HUBSPOT_OBJECT_TYPE || '2-16842375';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      allLocations.push(...(data.results || []));

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
