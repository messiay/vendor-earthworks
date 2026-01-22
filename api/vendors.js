// Vercel Serverless Function to proxy SheetDB requests
// This runs on the server side, bypassing CORS issues

const SHEETDB_API = 'https://sheetdb.io/api/v1/crhv4u171vi50';

export default async function handler(req, res) {
    // Set CORS headers to allow requests from your website
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            // Read all vendors
            const response = await fetch(SHEETDB_API);
            const data = await response.json();
            res.status(200).json(data);
        }
        else if (req.method === 'PATCH') {
            // Update a specific vendor
            const { originalSupplier, updateData } = req.body;

            if (!originalSupplier || !updateData) {
                return res.status(400).json({ error: 'Missing required data' });
            }

            // Proxy the update to SheetDB
            const response = await fetch(`${SHEETDB_API}/Supplier / Brand/${encodeURIComponent(originalSupplier)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: updateData })
            });

            const result = await response.json();
            res.status(200).json(result);
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
