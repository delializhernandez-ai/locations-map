# Quick Setup Guide - HubSpot Locations Map

## 🚀 Get Started in 5 Minutes

### Step 1: Get Your API Keys

#### Google Maps API Key
1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Search for "Maps JavaScript API" in the search bar
4. Click it and enable it
5. Search for "Geocoding API" and enable it
6. Go to Credentials (left menu) → Create Credentials → API Key
7. Copy your API key

#### HubSpot API Key
1. Go to https://app.hubspot.com/l/api-key/
2. Click "Create private app" or use your existing API key
3. Make sure it has access to your custom Locations object
4. Copy the API key

### Step 2: Configure Your Environment

1. Open `.env.local` in the `locations-map` folder
2. Replace the placeholder values:

```env
VITE_GOOGLE_MAPS_API_KEY=paste_your_google_maps_key_here
VITE_HUBSPOT_API_KEY=paste_your_hubspot_key_here
```

3. Save the file

⚠️ **IMPORTANT**: Never share your `.env.local` file! It contains secret keys.

### Step 3: Start the App

Open a terminal in the `locations-map` folder and run:

```bash
npm run dev
```

You'll see:
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173/` in your browser!

## 🛠️ Your Custom HubSpot Object

Make sure your custom Locations object has these properties (external names):

| Property | External Name | Type | Required |
|----------|---------------|------|----------|
| Name | `property_name` | Text | Yes |
| Address | `property_address` | Text | Yes |
| Address 2 | `property_address_2` | Text | No |
| City | `city` | Text | Yes |
| State | `state_province_territory` | Text | Yes |
| Zip | `zip_postal_code` | Text | Yes |
| Latitude | `latitude` | Number | No* |
| Longitude | `longitude` | Number | No* |

*If latitude/longitude aren't provided, the app will automatically geocode them using the address.

## 🗺️ What You Get

✅ Interactive map showing all your locations  
✅ Search by name, address, or city  
✅ Filter by state  
✅ Click markers to see location details  
✅ Auto-geocoding of addresses  
✅ Mobile-responsive design  

## ❓ Troubleshooting

**Map not showing?**
- Check your `.env.local` file has the correct API keys
- Make sure Google Maps APIs are enabled in Google Cloud Console

**No locations appearing?**
- Verify you have locations in your HubSpot custom object
- Check browser console (F12) for error messages
- Ensure your HubSpot API key has read permissions

**Addresses not geocoding?**
- Make sure "Geocoding API" is enabled in Google Cloud
- Check that addresses are properly formatted

## 📦 Build for Production

When you're ready to deploy:

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

## 🆘 Need Help?

Check the main [README.md](README.md) for detailed information about all features and configuration options.
