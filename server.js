const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json({ limit: '5mb' }));

// Route utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check untuk Railway
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        online: Array.from(rooms.values()).reduce((acc, room) => acc + room.length, 0)
    });
});

// Variabel global
const rooms = new Map();
const userTimers = new Map();

// WebSocket Connection
wss.on('connection', (ws) => {
    // Generate ID anonim
    const userId = 'Anonim-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    ws.userId = userId;
    
    console.log(`🟢 ${userId} connected`);
    
    // Kirim ID ke client
    ws.send(JSON.stringify({
        type: 'init',
        userId: userId
    }));
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            
            switch(msg.type) {
                case 'join':
                    handleJoin(ws, msg);
                    break;
                    
                case 'message':
                    handleMessage(ws, msg);
                    break;
                    
                case 'media':
                    handleMedia(ws, msg);
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`🔴 ${ws.userId} disconnected`);
        cleanupUser(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        cleanupUser(ws);
    });
});

// Fungsi Handler
function handleJoin(ws, msg) {
    const roomId = `${msg.category}-${msg.room.toString().padStart(3, '0')}`;
    ws.roomId = roomId;
    
    // Buat room jika belum ada
    if (!rooms.has(roomId)) {
        rooms.set(roomId, []);
    }
    
    const roomUsers = rooms.get(roomId);
    roomUsers.push({ ws, userId: ws.userId });
    
    // Reset timer 15 menit
    resetUserTimer(ws);
    
    // Kirim konfirmasi ke pengguna
    ws.send(JSON.stringify({
        type: 'joined',
        roomId: roomId,
        userCount: roomUsers.length,
        timestamp: Date.now()
    }));
    
    // Broadcast ke room
    broadcastToRoom(roomId, {
        type: 'system',
        message: `${ws.userId} bergabung`,
        userCount: roomUsers.length,
        timestamp: Date.now()
    });
    
    console.log(`👥 ${ws.userId} joined ${roomId} (Total: ${roomUsers.length})`);
}

function handleMessage(ws, msg) {
    if (!ws.roomId) return;
    
    resetUserTimer(ws);
    
    broadcastToRoom(ws.roomId, {
        type: 'message',
        userId: ws.userId,
        text: msg.text,
        timestamp: Date.now()
    });
}

function handleMedia(ws, msg) {
    if (!ws.roomId) return;
    
    resetUserTimer(ws);
    
    broadcastToRoom(ws.roomId, {
        type: 'media',
        userId: ws.userId,
        mediaType: msg.mediaType,
        data: msg.data,
        timestamp: Date.now()
    });
}

// Fungsi Bantuan
function broadcastToRoom(roomId, message) {
    if (!rooms.has(roomId)) return;
    
    rooms.get(roomId).forEach(user => {
        if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify(message));
        }
    });
}

function resetUserTimer(ws) {
    if (userTimers.has(ws.userId)) {
        clearTimeout(userTimers.get(ws.userId));
    }
    
    const timer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'timeout',
                message: '⏰ Sesi 15 menit berakhir'
            }));
            ws.close();
        }
        cleanupUser(ws);
    }, 15 * 60 * 1000); // 15 menit
    
    userTimers.set(ws.userId, timer);
}

function cleanupUser(ws) {
    if (ws.roomId && rooms.has(ws.roomId)) {
        const roomUsers = rooms.get(ws.roomId);
        const index = roomUsers.findIndex(u => u.ws === ws);
        
        if (index !== -1) {
            const userId = roomUsers[index].userId;
            roomUsers.splice(index, 1);
            
            // Broadcast ke room
            broadcastToRoom(ws.roomId, {
                type: 'system',
                message: `${userId} keluar`,
                userCount: roomUsers.length,
                timestamp: Date.now()
            });
            
            // Hapus room jika kosong
            if (roomUsers.length === 0) {
                rooms.delete(ws.roomId);
                console.log(`🗑️  Room ${ws.roomId} dihapus (kosong)`);
            }
        }
    }
    
    // Hapus timer
    if (userTimers.has(ws.userId)) {
        clearTimeout(userTimers.get(ws.userId));
        userTimers.delete(ws.userId);
    }
}

// Ping semua client setiap 30 detik
setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.ping();
        }
    });
}, 30000);

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
});