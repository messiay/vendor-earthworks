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
            // Read both sheets in parallel
            // Note: Sheet names are case-sensitive in Google Sheets
            const [sheet1Response, sheet2Response] = await Promise.all([
                fetch(`${SHEETDB_API}?sheet=Sheet1`),
                fetch(`${SHEETDB_API}?sheet=Sheet2`)
            ]);

            const sheet1Data = await sheet1Response.json();
            const sheet2Data = await sheet2Response.json();

            // Handle case where specific sheet fetch fails (returns array of all or error)
            // SheetDB returns error object if sheet not found, or defaults.
            // We'll normalize the response.

            res.status(200).json({
                Sheet1: Array.isArray(sheet1Data) ? sheet1Data : [],
                Sheet2: Array.isArray(sheet2Data) ? sheet2Data : []
            });
        }
        else if (req.method === 'PATCH') {
            // Update a specific vendor
            const { originalSupplier, updateData, sheetName } = req.body;

            if (!originalSupplier || !updateData) {
                return res.status(400).json({ error: 'Missing required data' });
            }

            // Default to Sheet1 if not specified
            const sheet = sheetName || 'Sheet1';

            // Use Query Parameter based update to handle special characters in column names
            // URL: /api/v1/{id}?sheet=Sheet1&Supplier%20%2F%20Brand=Value
            const searchParam = `${encodeURIComponent('Supplier / Brand')}=${encodeURIComponent(originalSupplier)}`;

            // Proxy the update to SheetDB
            const response = await fetch(`${SHEETDB_API}?sheet=${sheet}&${searchParam}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: updateData })
            });

            const result = await response.json();

            // SheetDB returns { updated: 1 } on success
            if (result.updated || result.data) {
                res.status(200).json(result);
            } else {
                // Forward error if provided
                res.status(400).json(result);
            }
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
