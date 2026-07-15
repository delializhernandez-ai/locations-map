# HubSpot Locations Map

A React application that displays locations from your HubSpot custom "Locations" object on an interactive Google Map with search and filtering capabilities.

## Features

- 🗺️ Interactive Google Map with location markers
- 🔍 Search locations by name, address, or city
- 🏷️ Filter locations by state/province
- 📍 Automatic geocoding of addresses
- 📱 Responsive design for mobile and desktop
- ⚡ Built with Vite for fast development

## Prerequisites

Before you start, you'll need:

1. **Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
   - Create a new project
   - Enable the Maps JavaScript API and Geocoding API
   - Create an API key from the Credentials page
   - Make sure to restrict it to your domain

2. **HubSpot API Key**
   - Go to [HubSpot Settings](https://app.hubspot.com/l/api-key/)
   - Generate a private app or use your account API key
   - The key needs access to your custom Locations object

3. **Node.js** (v16 or higher)

## Setup Instructions

### 1. Install Dependencies

```bash
cd locations-map
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your API keys:

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_HUBSPOT_API_KEY=your_hubspot_api_key_here
VITE_HUBSPOT_OBJECT_TYPE=p41558850_locations
```

⚠️ **Important**: Never commit `.env.local` to version control. The `.gitignore` file is already configured to prevent this.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## HubSpot Custom Object Setup

This app expects a custom object in HubSpot with the following properties (external names):

- `property_name` - Name of the location
- `property_address` - Primary address
- `property_address_2` - Secondary address (optional)
- `city` - City
- `state_province_territory` - State/Province
- `zip_postal_code` - Postal code
- `latitude` - Latitude (optional - will be auto-geocoded if missing)
- `longitude` - Longitude (optional - will be auto-geocoded if missing)

## Usage

1. The app will automatically fetch all locations from your HubSpot custom object
2. Use the search bar to find locations by name, address, or city
3. Use the state filter dropdown to view locations in a specific state
4. Click on any marker on the map to view location details
5. The info window shows all available location information

## Building for Production

```bash
npm run build
```

The production build will be created in the `dist` directory.

## Troubleshooting

### API Key Issues
- Make sure your API keys are correctly set in `.env.local`
- Check that your Google Maps API key has the correct APIs enabled
- Verify your HubSpot API key has access to your Locations object

### Location Geocoding
- If locations don't appear on the map, check that addresses are properly formatted
- The app will automatically geocode addresses if latitude/longitude aren't provided
- Geocoding requires both the Google Maps Geocoding API to be enabled

### No Locations Showing
- Verify you have locations in your HubSpot custom object
- Check the browser console for any API errors
- Ensure the HubSpot API key has read access to the object

## Project Structure

```
locations-map/
├── src/
│   ├── components/
│   │   ├── LocationsMap.jsx      # Main map component
│   │   └── LocationsMap.css      # Component styles
│   ├── services/
│   │   └── hubspotService.js     # HubSpot API integration
│   ├── App.jsx                    # Main app component
│   ├── App.css                    # App styles
│   └── main.jsx                   # Entry point
├── .env.example                   # Environment variables template
├── .env.local                     # Local environment variables (not committed)
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies
├── vite.config.js                 # Vite configuration
└── README.md                      # This file
```

## Technologies Used

- **React** - UI framework
- **Vite** - Build tool and dev server
- **@react-google-maps/api** - Google Maps integration
- **Google Maps API** - Mapping and geocoding
- **HubSpot API** - Data source

## License

MIT
