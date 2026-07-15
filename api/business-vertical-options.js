const HUBSPOT_API_KEY = process.env.VITE_HUBSPOT_API_KEY;
const HUBSPOT_OBJECT_TYPE = process.env.VITE_HUBSPOT_OBJECT_TYPE || '2-16842375';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}
