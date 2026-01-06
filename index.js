const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const port = process.env.PORT || 3000;

// Setup HTTP Server & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());

// Broadcast function
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Stats
let lastSignal = null;
let lastSignalTime = null;

// WEBHOOK ENDPOINT (TradingView sends POST here)
app.post('/webhook', (req, res) => {
    const payload = req.body;
    
    // Validate payload
    if (!payload || !payload.action) {
        return res.status(400).send('Missing action');
    }

    // Log & Broadcast
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔔 Webhook Received:`, payload);
    
    lastSignal = payload;
    lastSignalTime = timestamp;

    // Send to TradeShark Desktop App
    broadcast({
        type: 'SIGNAL',
        payload: payload,
        timestamp: timestamp
    });

    res.status(200).send('OK');
});

// STATUS PAGE
app.get('/', (req, res) => {
    res.send(`
        <h1>TradeShark Relay 🦈</h1>
        <p>Status: <strong>Running</strong></p>
        <p>Connected Clients: <strong>${wss.clients.size}</strong></p>
        <p>Last Signal: <strong>${lastSignal ? lastSignal.action : 'None'}</strong> (${lastSignalTime})</p>
    `);
});

// WEBSOCKET HANDLER
wss.on('connection', (ws) => {
    console.log('💻 TradeShark Client Connected');
    ws.send(JSON.stringify({ type: 'INFO', message: 'Connected to Relay' }));

    ws.on('close', () => console.log('❌ Client Disconnected'));
});

// Start Server
server.listen(port, () => {
    console.log(`🚀 Relay Server listening on port ${port}`);
});
