const HUBSPOT_API_KEY = process.env.VITE_HUBSPOT_API_KEY;
const HUBSPOT_OBJECT_TYPE = process.env.VITE_HUBSPOT_OBJECT_TYPE || '2-16842375';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Default statuses
    const defaultStatuses = ['Active', 'Inactive', 'Archived', 'Pending'];
    res.json({ options: defaultStatuses });
  } catch (error) {
    console.error('Error fetching status options:', error);
    res.json({ options: ['Active', 'Inactive', 'Archived', 'Pending'] });
  }
}
