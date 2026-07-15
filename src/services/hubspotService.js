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
    city: props.city || '',
    state: normalizeState(props.property_state || ''),
    status: props.location_status || '',
    vertical: props.brand || '',
    companyName: props.location_company_name || '',
    zip: props.zip_postal_code || '',
    lat: props.latitude ? parseFloat(props.latitude) : null,
    lng: props.longitude ? parseFloat(props.longitude) : null,
    rawProperties: props,
  };
};

const geocodeAddress = async (address, city, state, zip) => {
  try {
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        fullAddress
      )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return { lat: null, lng: null };
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

    let locations = data.results.map(convertToLocationObject);

    locations = await Promise.all(
      locations.map(async (location) => {
        if (!location.lat || !location.lng) {
          const { lat, lng } = await geocodeAddress(
            location.address,
            location.city,
            location.state,
            location.zip
          );
          return { ...location, lat, lng };
        }
        return location;
      })
    );

    return locations.filter((loc) => loc.lat && loc.lng);
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};

export const fetchLocationStatusOptions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/location-status-options`);
    if (!response.ok) throw new Error('Failed to fetch status options');
    const data = await response.json();
    return data.options || [];
  } catch (error) {
    console.error('Error fetching status options:', error);
    return ['Active', 'Inactive', 'Archived', 'Pending'];
  }
};

export const fetchBusinessVerticalOptions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/business-vertical-options`);
    if (!response.ok) throw new Error('Failed to fetch vertical options');
    const data = await response.json();
    return data.options || [];
  } catch (error) {
    console.error('Error fetching vertical options:', error);
    return [];
  }
};
