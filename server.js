const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// API endpoint for IP lookup
app.get('/api/lookup/:ip?', async (req, res) => {
    // If an IP is provided in the path, use it. Otherwise, use the requestor's IP.
    const targetIp = req.params.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // A token is not strictly required for ipinfo.io's free tier,
    // but it's good practice to use one to avoid rate limiting.
    const IPINFO_TOKEN = process.env.IPINFO_TOKEN || ''; 
    const apiUrl = `https://ipinfo.io/${targetIp}?token=${IPINFO_TOKEN}`;

    try {
        const apiRes = await fetch(apiUrl);
        if (!apiRes.ok) {
            const errorText = await apiRes.text();
            console.error(`IPinfo API error: ${errorText}`);
            return res.status(apiRes.status).json({ error: 'Failed to retrieve IP data.' });
        }
        const data = await apiRes.json();
        res.json(data);
    } catch (error) {
        console.error('Server-side fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Fallback for SPA: any request that doesn't match a static file or the API
// should serve the main index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 