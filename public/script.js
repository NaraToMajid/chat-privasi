class ORAPRIVCHAT {
    constructor() {
        this.ws = null;
        this.userId = '';
        this.currentCat = 'A';
        this.currentRoom = 1;
        this.sessionTimer = null;
        this.timeLeft = 900;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateRoomPreview();
        this.connectWebSocket();
    }
    
    cacheElements() {
        // Screens
        this.splashScreen = document.getElementById('splashScreen');
        this.roomSelector = document.getElementById('roomSelector');
        this.chatInterface = document.getElementById('chatInterface');
        
        // Selector elements
        this.catDisplay = document.getElementById('catDisplay');
        this.roomDisplay = document.getElementById('roomDisplay');
        this.roomPreview = document.getElementById('roomPreview');
        
        // Chat elements
        this.roomName = document.getElementById('roomName');
        this.userCount = document.getElementById('userCount');
        this.timerDisplay = document.getElementById('timer');
        this.userIdDisplay = document.getElementById('userId');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        
        // Status
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusDot = this.connectionStatus.querySelector('.status-dot');
        this.statusText = this.connectionStatus.querySelector('.status-text');
    }
    
    bindEvents() {
        // Navigation buttons
        document.getElementById('startBtn').onclick = () => this.showRoomSelector();
        document.getElementById('prevCatBtn').onclick = () => this.navigateCategory(-1);
        document.getElementById('nextCatBtn').onclick = () => this.navigateCategory(1);
        document.getElementById('prevRoomBtn').onclick = () => this.navigateRoom(-1);
        document.getElementById('nextRoomBtn').onclick = () => this.navigateRoom(1);
        document.getElementById('joinBtn').onclick = () => this.joinRoom();
        document.getElementById('backBtn').onclick = () => this.leaveRoom();
        
        // Chat actions
        document.getElementById('sendBtn').onclick = () => this.sendMessage();
        this.messageInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };
        
        // File attachment
        document.getElementById('attachBtn').onclick = () => {
            document.getElementById('fileInput').click();
        };
        document.getElementById('fileInput').onchange = (e) => this.handleFileUpload(e);
        
        // Keep session alive
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        });
    }
    
    showRoomSelector() {
        this.splashScreen.style.display = 'none';
        this.roomSelector.style.display = 'block';
    }
    
    navigateCategory(direction) {
        const categories = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let index = categories.indexOf(this.currentCat) + direction;
        
        if (index < 0) index = 25;
        if (index >= categories.length) index = 0;
        
        this.currentCat = categories[index];
        this.catDisplay.textContent = this.currentCat;
        this.updateRoomPreview();
    }
    
    navigateRoom(direction) {
        this.currentRoom += direction;
        
        if (this.currentRoom < 1) this.currentRoom = 100;
        if (this.currentRoom > 100) this.currentRoom = 1;
        
        this.roomDisplay.textContent = this.currentRoom.toString().padStart(3, '0');
        this.updateRoomPreview();
    }
    
    updateRoomPreview() {
        const roomId = `${this.currentCat}-${this.currentRoom.toString().padStart(3, '0')}`;
        this.roomPreview.textContent = roomId;
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('🔗 Connecting to:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            this.updateConnectionStatus(true, 'Connected');
            this.reconnectAttempts = 0;
            
            // Generate user ID if not exists
            if (!this.userId) {
                this.userId = 'Anon-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                this.userIdDisplay.innerHTML = `<i class="fas fa-user-secret"></i> ${this.userId}`;
            }
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log('❌ WebSocket disconnected:', event.code, event.reason);
            this.updateConnectionStatus(false, 'Disconnected');
            
            // Attempt reconnection
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                
                console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})`);
                this.updateConnectionStatus(false, `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                
                setTimeout(() => this.connectWebSocket(), delay);
            } else {
                this.updateConnectionStatus(false, 'Connection failed');
                alert('Failed to connect to server. Please refresh the page.');
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.updateConnectionStatus(false, 'Connection error');
        };
    }
    
    updateConnectionStatus(connected, message) {
        this.statusDot.className = 'status-dot' + (connected ? ' connected' : '');
        this.statusText.innerHTML = `<i class="fas fa-wifi"></i> ${message}`;
        
        if (connected) {
            this.connectionStatus.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        } else {
            this.connectionStatus.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        }
    }
    
    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'init':
                this.userId = data.userId;
                this.userIdDisplay.innerHTML = `<i class="fas fa-user-secret"></i> ${this.userId}`;
                break;
                
            case 'joined':
                this.showChatInterface(data.roomId, data.userCount);
                break;
                
            case 'system':
                this.addSystemMessage(data.message);
                if (data.userCount !== undefined) {
                    this.updateUserCount(data.userCount);
                }
                break;
                
            case 'message':
                this.addChatMessage(data.userId, data.text, data.timestamp);
                break;
                
            case 'media':
                this.addMediaMessage(data.userId, data.mediaType, data.data, data.timestamp);
                break;
                
            case 'timeout':
                this.leaveRoom();
                this.showNotification('Session expired (15 minutes)');
                break;
        }
    }
    
    showChatInterface(roomId, userCount) {
        this.roomSelector.style.display = 'none';
        this.chatInterface.style.display = 'flex';
        
        this.roomName.innerHTML = `<i class="fas fa-door-open"></i> ${roomId}`;
        this.updateUserCount(userCount);
        this.startSessionTimer();
        
        // Clear welcome message and add join message
        this.messagesContainer.innerHTML = '';
        this.addSystemMessage(`Joined ${roomId}`);
        
        this.messageInput.focus();
    }
    
    updateUserCount(count) {
        this.userCount.innerHTML = `<i class="fas fa-users"></i> ${count} online`;
    }
    
    startSessionTimer() {
        this.timeLeft = 900;
        
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        this.sessionTimer = setInterval(() => {
            this.timeLeft--;
            
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            this.timerDisplay.innerHTML = `<i class="fas fa-clock"></i> ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.timeLeft <= 0) {
                this.leaveRoom();
                this.showNotification('Session expired');
            }
            
            // Warning at 1 minute remaining
            if (this.timeLeft === 60) {
                this.addSystemMessage('Session expires in 1 minute');
            }
        }, 1000);
    }
    
    joinRoom() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showNotification('Connecting to server...');
            return;
        }
        
        const roomData = {
            type: 'join',
            category: this.currentCat,
            room: this.currentRoom,
            userId: this.userId
        };
        
        this.ws.send(JSON.stringify(roomData));
    }
    
    leaveRoom() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        this.chatInterface.style.display = 'none';
        this.roomSelector.style.display = 'block';
        this.messagesContainer.innerHTML = '';
        this.messageInput.value = '';
        
        // Reset timer display
        this.timerDisplay.innerHTML = '<i class="fas fa-clock"></i> 15:00';
    }
    
    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const messageData = {
            type: 'message',
            text: text
        };
        
        this.ws.send(JSON.stringify(messageData));
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.focus();
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('File too large (max 5MB)');
            return;
        }
        
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            this.showNotification('Only images and videos allowed');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                this.showNotification('Not connected');
                return;
            }
            
            const mediaData = {
                type: 'media',
                mediaType: isImage ? 'image' : 'video',
                data: e.target.result
            };
            
            this.ws.send(JSON.stringify(mediaData));
        };
        
        reader.readAsDataURL(file);
        event.target.value = '';
    }
    
    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.textContent = text;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addChatMessage(sender, text, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender === this.userId ? 'sent' : 'received'}`;
        
        const time = new Date(timestamp || Date.now());
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        const displayName = sender === this.userId ? 'You' : sender;
        const icon = sender === this.userId ? '<i class="fas fa-user"></i>' : '<i class="fas fa-user-secret"></i>';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${icon} ${displayName}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-content">${this.escapeHtml(text)}</div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addMediaMessage(sender, mediaType, data, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender === this.userId ? 'sent' : 'received'}`;
        
        const time = new Date(timestamp || Date.now());
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        const displayName = sender === this.userId ? 'You' : sender;
        const icon = sender === this.userId ? '<i class="fas fa-user"></i>' : '<i class="fas fa-user-secret"></i>';
        
        let mediaHtml = '';
        if (mediaType === 'image') {
            mediaHtml = `<img src="${data}" alt="Image">`;
        } else if (mediaType === 'video') {
            mediaHtml = `<video controls><source src="${data}" type="video/mp4"></video>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${icon} ${displayName}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-content">
                ${mediaHtml}
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(30, 30, 30, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add notification animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Start the app
    window.chatApp = new ORAPRIVCHAT();
});