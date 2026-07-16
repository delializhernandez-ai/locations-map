const API_BASE_URL = '';

// State abbreviation mapping
const STATE_MAP = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY',
};

const normalizeState = (state) => {
  if (!state) return '';
  const normalized = state.trim().toLowerCase();
  return STATE_MAP[normalized] || state.toUpperCase();
};

const convertToLocationObject = (hubspotObject) => {
  const props = hubspotObject.properties || {};

  return {
    id: hubspotObject.id,
    name: props.property_name || '',
    address: props.property_address || '',
    address2: props.property_address_2 || '',
    city: props.property_city || '',
    state: normalizeState(props.property_state || ''),
    status: props.location_status || '',
    vertical: props.brand || '',
    companyName: props.location_company_name || '',
    zip: props.property_zip_code || '',
    lat: props.latitude ? parseFloat(props.latitude) : null,
    lng: props.longitude ? parseFloat(props.longitude) : null,
    rawProperties: props,
  };
};

export const fetchLocations = async () => {
  try {
    const url = `${API_BASE_URL}/api/locations`;
    console.log('Fetching from backend:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Fetched locations:', data);

    const locations = data.results.map(convertToLocationObject);

    // Coordinates are geocoded and stored on the HubSpot record ahead of
    // time (see scripts/geocode-backfill.js) so no per-load geocoding is
    // needed here. Locations still missing coordinates are simply skipped.
    return locations.filter((loc) => loc.lat && loc.lng);
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};

