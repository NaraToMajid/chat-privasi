class PrivateChat {
    constructor() {
        this.ws = null;
        this.userId = 'User_' + Math.random().toString(36).substr(2, 6);
        this.currentCategory = 'A';
        this.currentRoom = 1;
        this.isConnected = false;
        this.sessionTimer = null;
        this.timeLeft = 900; // 15 menit
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderSelector();
        this.connectWebSocket();
        this.setupResponsive();
    }
    
    cacheElements() {
        // Selector screen elements
        this.selectorScreen = document.getElementById('selector');
        this.chatScreen = document.getElementById('chat');
        this.catValue = document.getElementById('catValue');
        this.roomValue = document.getElementById('roomValue');
        this.roomDisplay = document.getElementById('roomDisplay');
        this.prevCatBtn = document.getElementById('prevCat');
        this.nextCatBtn = document.getElementById('nextCat');
        this.prevRoomBtn = document.getElementById('prevRoom');
        this.nextRoomBtn = document.getElementById('nextRoom');
        this.enterBtn = document.getElementById('enterBtn');
        
        // Chat screen elements
        this.roomTitle = document.getElementById('roomTitle');
        this.userCount = document.getElementById('userCount');
        this.timerElement = document.getElementById('timer');
        this.backBtn = document.getElementById('backBtn');
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        
        // Status indicator
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
    }
    
    bindEvents() {
        // Navigation buttons
        this.prevCatBtn.addEventListener('click', () => this.navigateCategory(-1));
        this.nextCatBtn.addEventListener('click', () => this.navigateCategory(1));
        this.prevRoomBtn.addEventListener('click', () => this.navigateRoom(-1));
        this.nextRoomBtn.addEventListener('click', () => this.navigateRoom(1));
        this.enterBtn.addEventListener('click', () => this.enterRoom());
        
        // Chat controls
        this.backBtn.addEventListener('click', () => this.leaveRoom());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Prevent zoom on mobile
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
    }
    
    setupResponsive() {
        // Adjust status indicator position based on screen orientation
        this.handleResize();
    }
    
    handleResize() {
        const isPortrait = window.innerHeight > window.innerWidth;
        const inputAreaHeight = document.querySelector('.input-area')?.offsetHeight || 70;
        
        if (isPortrait) {
            // Di mode portrait, naikkan status indicator agar tidak menutupi input
            this.statusIndicator.style.bottom = `${inputAreaHeight + 15}px`;
        } else {
            // Di mode landscape, kembalikan ke posisi default
            this.statusIndicator.style.bottom = '15px';
        }
    }
    
    navigateCategory(direction) {
        const categories = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let index = categories.indexOf(this.currentCategory) + direction;
        
        if (index < 0) index = categories.length - 1;
        if (index >= categories.length) index = 0;
        
        this.currentCategory = categories[index];
        this.renderSelector();
    }
    
    navigateRoom(direction) {
        this.currentRoom += direction;
        
        if (this.currentRoom < 1) this.currentRoom = 100;
        if (this.currentRoom > 100) this.currentRoom = 1;
        
        this.renderSelector();
    }
    
    renderSelector() {
        this.catValue.textContent = this.currentCategory;
        this.roomValue.textContent = this.currentRoom.toString().padStart(3, '0');
        this.roomDisplay.textContent = `${this.currentCategory}-${this.currentRoom.toString().padStart(3, '0')}`;
        
        // Add animation effect
        this.catValue.style.transform = 'scale(1.1)';
        this.roomValue.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            this.catValue.style.transform = 'scale(1)';
            this.roomValue.style.transform = 'scale(1)';
        }, 150);
    }
    
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateStatus(true, 'Terhubung');
            
            // Send initial connection info
            this.ws.send(JSON.stringify({
                type: 'init',
                userId: this.userId
            }));
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateStatus(false, 'Terputus');
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                
                setTimeout(() => {
                    this.connectWebSocket();
                }, delay);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus(false, 'Error');
        };
    }
    
    updateStatus(connected, text) {
        if (connected) {
            this.statusDot.className = 'status-dot connected';
            this.statusText.textContent = text;
            this.statusIndicator.style.borderColor = '#0f0';
        } else {
            this.statusDot.className = 'status-dot';
            this.statusText.textContent = text;
            this.statusIndicator.style.borderColor = '#f00';
        }
    }
    
    handleServerMessage(data) {
        switch (data.type) {
            case 'init':
                this.userId = data.userId || this.userId;
                break;
                
            case 'joined':
                this.roomTitle.textContent = `Room ${data.roomId}`;
                this.userCount.textContent = `${data.userCount} pengguna online`;
                this.startSessionTimer();
                this.addSystemMessage(`Anda masuk sebagai ${this.userId}`);
                break;
                
            case 'system':
                this.addSystemMessage(data.message);
                if (data.userCount !== undefined) {
                    this.userCount.textContent = `${data.userCount} pengguna online`;
                }
                break;
                
            case 'message':
                this.addMessage(
                    data.userId === this.userId ? 'sent' : 'received',
                    data.userId === this.userId ? 'Anda' : data.userId,
                    data.text,
                    data.timestamp
                );
                break;
                
            case 'timeout':
                this.leaveRoom();
                this.showNotification('Sesi 15 menit berakhir');
                break;
        }
    }
    
    enterRoom() {
        if (!this.isConnected) {
            this.showNotification('Menunggu koneksi...');
            return;
        }
        
        const roomId = `${this.currentCategory}-${this.currentRoom.toString().padStart(3, '0')}`;
        
        this.ws.send(JSON.stringify({
            type: 'join',
            category: this.currentCategory,
            room: this.currentRoom,
            userId: this.userId
        }));
        
        // Switch screens
        this.selectorScreen.style.display = 'none';
        this.chatScreen.style.display = 'flex';
        
        // Clear messages
        this.messagesContainer.innerHTML = '';
        
        // Focus input
        setTimeout(() => {
            this.messageInput.focus();
        }, 100);
        
        // Update responsive layout
        this.handleResize();
    }
    
    leaveRoom() {
        // Switch screens
        this.chatScreen.style.display = 'none';
        this.selectorScreen.style.display = 'flex';
        
        // Stop session timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        // Reset timer display
        this.timeLeft = 900;
        this.updateTimerDisplay();
        
        // Clear input
        this.messageInput.value = '';
        
        // Reset responsive layout
        this.handleResize();
    }
    
    startSessionTimer() {
        this.timeLeft = 900;
        
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        this.updateTimerDisplay();
        
        this.sessionTimer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.leaveRoom();
                this.showNotification('Sesi 15 menit berakhir');
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.isConnected) return;
        
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'message',
                text: text,
                userId: this.userId
            }));
            
            this.messageInput.value = '';
            this.messageInput.focus();
        } else {
            this.showNotification('Koneksi terputus');
        }
    }
    
    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.textContent = text;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addMessage(type, sender, text, timestamp = Date.now()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const time = new Date(timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-user">${sender}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-content">${this.escapeHtml(text)}</div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            padding: 12px 24px;
            border-radius: 25px;
            border: 1px solid #0f0;
            z-index: 10000;
            font-size: 14px;
            backdrop-filter: blur(10px);
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translate(-50%, -20px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, -20px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Start the app
    window.chatApp = new PrivateChat();
});
