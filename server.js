require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// Load partner credentials from environment
const PARTNER_SECRET = process.env.PARTNER_SECRET;
const PARTNER_API_KEY = process.env.PARTNER_API_KEY;
const HOUSETABZ_API_BASE = process.env.HOUSETABZ_API_BASE || 'https://api.housetabz.com'; // Your actual backend
const PARTNER_ID = process.env.PARTNER_ID || '2'; // Your actual partner ID

if (!PARTNER_SECRET || !PARTNER_API_KEY) {
  console.warn('⚠️ PARTNER_SECRET or PARTNER_API_KEY is not set in environment variables');
}

// Disable ETag to prevent caching issues
app.disable('etag');

// Serve static partner-demo files
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON request bodies
app.use(express.json());

// Serve main demo page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Demo API endpoints
app.post('/api/partner/create-bill', (req, res) => {
  console.log('Demo: Create bill request received:', req.body);
  return res.json({
    success: true,
    message: 'Demo bill created successfully',
    billId: `demo_bill_${Date.now()}`
  });
});

app.post('/api/partner/test-webhook', (req, res) => {
  console.log('Demo: Test webhook request received:', req.body);
  return res.json({
    success: true,
    message: 'Demo webhook test successful'
  });
});

// FIXED: Handle staged-request properly
app.post('/api/partner/staged-request', async (req, res) => {
  try {
    const timestamp = req.header('housetabz-timestamp') || Math.floor(Date.now() / 1000).toString();
    const payload = req.body;
    
    console.log('Demo: Received staged-request:', payload);

    if (!timestamp) {
      return res.status(400).json({ success: false, message: 'Missing housetabz-timestamp header' });
    }

    // Compute HMAC-SHA256 signature
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', PARTNER_SECRET)
      .update(signedPayload)
      .digest('hex');

    console.log('Demo: Forwarding to HouseTabz backend with signature');

    // Forward to your actual HouseTabz backend API
    const houseTabzUrl = `${HOUSETABZ_API_BASE}/api/partners/${PARTNER_ID}/staged-request`;
    
    const response = await fetch(houseTabzUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PARTNER_API_KEY,
        'housetabz-timestamp': timestamp,
        'housetabz-signature': signature
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Demo: HouseTabz backend response:', data);
    
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in /api/partner/staged-request:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message,
      details: 'Check partner demo server logs'
    });
  }
});

// Partner dashboard logs (demo)
app.get('/partner-dashboard/logs', (req, res) => {
  res.send(`
    <html>
      <head><title>Partner Demo Logs</title></head>
      <body style="font-family: monospace; padding: 20px;">
        <h2>Partner Integration Logs (Demo)</h2>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          <p>[${new Date().toISOString()}] Demo server started</p>
          <p>[${new Date().toISOString()}] Ready to receive HouseTabz integration requests</p>
          <p>[${new Date().toISOString()}] Partner ID: ${PARTNER_ID}</p>
          <p>[${new Date().toISOString()}] Backend URL: ${HOUSETABZ_API_BASE}</p>
          <p><em>In production, this would show real webhook deliveries and API calls</em></p>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HouseTabz Partner Demo running at http://localhost:${PORT}`);
  console.log(`📄 Demo page: http://localhost:${PORT}`);
  console.log(`📊 Logs: http://localhost:${PORT}/partner-dashboard/logs`);
  console.log(`🔧 Partner ID: ${PARTNER_ID}`);
  console.log(`🔧 Backend: ${HOUSETABZ_API_BASE}`);
});