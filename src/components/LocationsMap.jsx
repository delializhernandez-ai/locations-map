import { useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, InfoWindow } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { fetchLocations } from '../services/hubspotService';
import './LocationsMap.css';

const LocationsMap = () => {
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [filterVerticals, setFilterVerticals] = useState([]);
  const [filterPackages, setFilterPackages] = useState([]);
  const [filterBanners, setFilterBanners] = useState([]);
  const [filterVideos, setFilterVideos] = useState([]);
  const [filterFacebooks, setFilterFacebooks] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [verticalOptions, setVerticalOptions] = useState([]);
  const [packageOptions, setPackageOptions] = useState([]);
  const [bannerOptions, setBannerOptions] = useState([]);
  const [videoOptions, setVideoOptions] = useState([]);
  const [facebookOptions, setFacebookOptions] = useState([]);
  const [map, setMap] = useState(null);
  const clustererRef = useRef(null);

  const mapContainerStyle = {
    width: '100%',
    height: '100vh',
  };

  const defaultCenter = {
    lat: 39.8283,
    lng: -98.5795,
  };

  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoading(true);
        const data = await fetchLocations();
        // Status and vertical options come from the loaded data itself, so
        // the dropdowns always reflect values that actually exist in HubSpot.
        const statuses = [...new Set(data.map((loc) => loc.status).filter(Boolean))].sort();
        const verticals = [...new Set(data.map((loc) => loc.vertical).filter(Boolean))].sort();
        const packages = [...new Set(data.map((loc) => loc.geofencePackage).filter(Boolean))].sort();
        const banners = [...new Set(data.map((loc) => loc.creativeBanner).filter(Boolean))].sort();
        const videos = [...new Set(data.map((loc) => loc.creativeVideo).filter(Boolean))].sort();
        const facebooks = [...new Set(data.map((loc) => loc.facebook).filter(Boolean))].sort();
        setLocations(data);
        setFilteredLocations(data);
        setStatusOptions(statuses);
        setVerticalOptions(verticals);
        setPackageOptions(packages);
        setBannerOptions(banners);
        setVideoOptions(videos);
        setFacebookOptions(facebooks);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Failed to load locations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    let filtered = locations;

    if (searchTerm) {
      filtered = filtered.filter(
        (loc) =>
          loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loc.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loc.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loc.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterState) {
      filtered = filtered.filter((loc) => loc.state === filterState);
    }

    if (filterStatus === '__none__') {
      filtered = filtered.filter((loc) => !loc.status);
    } else if (filterStatus) {
      filtered = filtered.filter((loc) => loc.status === filterStatus);
    }

    if (filterVerticals.length > 0) {
      filtered = filtered.filter((loc) => filterVerticals.includes(loc.vertical));
    }

    if (filterPackages.length > 0) {
      filtered = filtered.filter((loc) => filterPackages.includes(loc.geofencePackage));
    }

    if (filterBanners.length > 0) {
      filtered = filtered.filter((loc) => filterBanners.includes(loc.creativeBanner));
    }

    if (filterVideos.length > 0) {
      filtered = filtered.filter((loc) => filterVideos.includes(loc.creativeVideo));
    }

    if (filterFacebooks.length > 0) {
      filtered = filtered.filter((loc) => filterFacebooks.includes(loc.facebook));
    }

    setFilteredLocations(filtered);
  }, [
    searchTerm,
    filterState,
    filterStatus,
    filterVerticals,
    filterPackages,
    filterBanners,
    filterVideos,
    filterFacebooks,
    locations,
  ]);

  // Markers are built imperatively and added to the clusterer in one batch
  // instead of as individual React <Marker> components — with thousands of
  // points, adding them one at a time through React reconciliation is what
  // was freezing the tab.
  useEffect(() => {
    if (!map) return;

    const newMarkers = [];
    filteredLocations.forEach((location, idx) => {
      if (!location.lat || !location.lng) return;
      const marker = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        title: location.name,
      });
      marker.addListener('click', () => setSelectedLocation(idx));
      newMarkers.push(marker);
    });

    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map });
    }
    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers(newMarkers);

    return () => {
      newMarkers.forEach((marker) => marker.setMap(null));
    };
  }, [map, filteredLocations]);

  // All 50 US states
  const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  const handleMapClick = () => {
    setSelectedLocation(null);
  };

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Locations</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="locations-map-container">
      <div className="controls-panel">
        <h1>Locations Map</h1>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name, address, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-container">
          <label htmlFor="state-filter">Filter by State:</label>
          <select
            id="state-filter"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="filter-select"
          >
            <option value="">All States</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-container">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            <option value="__none__">(No Status)</option>
          </select>
        </div>

        <CheckboxFilter
          label="Filter by Business Vertical:"
          options={verticalOptions}
          selected={filterVerticals}
          onChange={setFilterVerticals}
        />

        <CheckboxFilter
          label="Filter by Geofence Package:"
          options={packageOptions}
          selected={filterPackages}
          onChange={setFilterPackages}
        />

        <CheckboxFilter
          label="Filter by Creative - Banner:"
          options={bannerOptions}
          selected={filterBanners}
          onChange={setFilterBanners}
        />

        <CheckboxFilter
          label="Filter by Creative - Video:"
          options={videoOptions}
          selected={filterVideos}
          onChange={setFilterVideos}
        />

        <CheckboxFilter
          label="Filter by Facebook:"
          options={facebookOptions}
          selected={filterFacebooks}
          onChange={setFilterFacebooks}
        />

        <div className="results-info">
          {loading ? (
            <p>Loading locations...</p>
          ) : (
            <p>
              Showing {filteredLocations.length} of {locations.length} locations
            </p>
          )}
        </div>
      </div>

      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={4}
          onLoad={(mapInstance) => setMap(mapInstance)}
          onUnmount={() => setMap(null)}
          onClick={handleMapClick}
        >
          {selectedLocation !== null && filteredLocations[selectedLocation] && (
            <InfoWindow
              position={{
                lat: filteredLocations[selectedLocation].lat,
                lng: filteredLocations[selectedLocation].lng,
              }}
              onCloseClick={() => setSelectedLocation(null)}
            >
              <LocationInfoWindow location={filteredLocations[selectedLocation]} />
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

const LocationInfoWindow = ({ location }) => (
  <div className="info-window">
    <h3>{location.name}</h3>
    {location.status && (
      <p>
        <strong>Status:</strong> {location.status}
      </p>
    )}
    {location.companyName && (
      <p>
        <strong>Company:</strong> {location.companyName}
      </p>
    )}
    <p>
      <strong>Address:</strong>
      <br />
      {location.address}
      {location.address2 && (
        <>
          <br />
          {location.address2}
        </>
      )}
    </p>
    <p>
      <strong>City:</strong> {location.city}
    </p>
    <p>
      <strong>State:</strong> {location.state}
    </p>
    <p>
      <strong>Zip:</strong> {location.zip}
    </p>
    {location.geofencePackage && (
      <p>
        <strong>Geofence Package:</strong> {location.geofencePackage}
      </p>
    )}
    {location.creativeBanner && (
      <p>
        <strong>Creative - Banner:</strong> {location.creativeBanner}
      </p>
    )}
    {location.facebook && (
      <p>
        <strong>Facebook:</strong> {location.facebook}
      </p>
    )}
    {location.creativeVideo && (
      <p>
        <strong>Creative - Video:</strong> {location.creativeVideo}
      </p>
    )}
  </div>
);

const CheckboxFilter = ({ label, options, selected, onChange }) => (
  <div className="filter-container">
    <label>{label}</label>
    <div className="vertical-checkboxes">
      {options.map((option) => (
        <label key={option} className="vertical-checkbox">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={(e) => {
              onChange(
                e.target.checked
                  ? [...selected, option]
                  : selected.filter((v) => v !== option)
              );
            }}
          />
          {option}
        </label>
      ))}
    </div>
    {selected.length > 0 && (
      <button onClick={() => onChange([])} className="clear-verticals">
        Clear selection
      </button>
    )}
  </div>
);

export default LocationsMap;
