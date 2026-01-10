class PrivateChat {
    constructor() {
        this.ws = null;
        this.userId = 'user_' + Math.random().toString(36).substr(2, 6);
        this.currentCategory = 'A';
        this.currentRoom = 1;
        this.isConnected = false;
        this.sessionTimer = null;
        this.timeLeft = 900; // 15 menit
        this.reconnectTimeout = null;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.currentUpload = null;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderSelector();
        this.connectWebSocket();
        this.setupUI();
    }
    
    cacheElements() {
        // Selector screen
        this.selectorScreen = document.getElementById('selector');
        this.chatScreen = document.getElementById('chat');
        this.catValue = document.getElementById('catValue');
        this.roomValue = document.getElementById('roomValue');
        this.roomDisplay = document.getElementById('roomDisplay');
        
        // Buttons
        this.prevCatBtn = document.getElementById('prevCat');
        this.nextCatBtn = document.getElementById('nextCat');
        this.prevRoomBtn = document.getElementById('prevRoom');
        this.nextRoomBtn = document.getElementById('nextRoom');
        this.enterBtn = document.getElementById('enterBtn');
        this.backBtn = document.getElementById('backBtn');
        this.sendBtn = document.getElementById('sendBtn');
        this.attachBtn = document.getElementById('attachBtn');
        this.cancelUploadBtn = document.getElementById('cancelUpload');
        
        // Chat elements
        this.roomTitle = document.getElementById('roomTitle');
        this.userCount = document.getElementById('userCount');
        this.timerElement = document.getElementById('timer');
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.fileInput = document.getElementById('fileInput');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');
        
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusIcon = document.getElementById('statusIcon');
        this.statusText = document.getElementById('statusText');
        
        // Notification
        this.notification = document.getElementById('notification');
    }
    
    bindEvents() {
        // Navigation
        this.prevCatBtn.addEventListener('click', () => this.navigateCategory(-1));
        this.nextCatBtn.addEventListener('click', () => this.navigateCategory(1));
        this.prevRoomBtn.addEventListener('click', () => this.navigateRoom(-1));
        this.nextRoomBtn.addEventListener('click', () => this.navigateRoom(1));
        this.enterBtn.addEventListener('click', () => this.enterRoom());
        this.backBtn.addEventListener('click', () => this.leaveRoom());
        
        // Messaging
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // File handling
        this.attachBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.cancelUploadBtn.addEventListener('click', () => this.cancelUpload());
        
        // Prevent file dialog from opening multiple times
        this.fileInput.addEventListener('click', (e) => e.stopPropagation());
    }
    
    setupUI() {
        // Set initial timer display
        this.updateTimerDisplay();
        
        // Setup responsive behavior
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }
    
    handleResize() {
        const isPortrait = window.innerHeight > window.innerWidth;
        const inputHeight = document.querySelector('.input-container')?.offsetHeight || 70;
        
        // Adjust status indicator position in portrait mode
        if (isPortrait) {
            this.statusIndicator.style.bottom = `${inputHeight + 20}px`;
        } else {
            this.statusIndicator.style.bottom = '1rem';
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
    }
    
    connectWebSocket() {
        if (this.ws) {
            this.ws.close();
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✓ WebSocket connected');
            this.isConnected = true;
            this.updateStatus(true, 'Connected');
            
            // Send user identification
            this.ws.send(JSON.stringify({
                type: 'init',
                userId: this.userId
            }));
            
            // Setup ping to keep connection alive
            this.setupPing();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
                this.showNotification('Error parsing message');
            }
        };
        
        this.ws.onclose = () => {
            console.log('✗ WebSocket disconnected');
            this.isConnected = false;
            this.updateStatus(false, 'Disconnected');
            this.scheduleReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus(false, 'Connection Error');
        };
    }
    
    setupPing() {
        // Send ping every 30 seconds to keep connection alive
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }
    
    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        this.reconnectTimeout = setTimeout(() => {
            if (!this.isConnected) {
                this.connectWebSocket();
            }
        }, 3000);
    }
    
    updateStatus(connected, text) {
        if (connected) {
            this.statusIcon.textContent = '●';
            this.statusIcon.className = 'status-icon connected';
            this.statusText.textContent = text;
        } else {
            this.statusIcon.textContent = '●';
            this.statusIcon.className = 'status-icon';
            this.statusText.textContent = text;
        }
    }
    
    handleServerMessage(data) {
        switch (data.type) {
            case 'init':
                this.userId = data.userId || this.userId;
                break;
                
            case 'joined':
                this.roomTitle.textContent = `Room ${data.roomId}`;
                this.userCount.textContent = `${data.userCount} users`;
                this.startSessionTimer();
                this.showNotification(`Joined room ${data.roomId}`);
                break;
                
            case 'system':
                this.addSystemMessage(data.message);
                if (data.userCount !== undefined) {
                    this.userCount.textContent = `${data.userCount} users`;
                }
                break;
                
            case 'message':
                this.addMessage(
                    data.userId === this.userId ? 'sent' : 'received',
                    data.userId === this.userId ? 'You' : `User${data.userId.substr(5, 3)}`,
                    data.text,
                    data.timestamp
                );
                break;
                
            case 'media':
                this.addMediaMessage(
                    data.userId === this.userId ? 'sent' : 'received',
                    data.userId === this.userId ? 'You' : `User${data.userId.substr(5, 3)}`,
                    data.mediaType,
                    data.data,
                    data.filename,
                    data.filesize,
                    data.timestamp
                );
                break;
                
            case 'timeout':
                this.leaveRoom();
                this.showNotification('Session expired (15 minutes)');
                break;
                
            case 'upload_progress':
                this.updateUploadProgress(data.progress);
                break;
                
            case 'upload_complete':
                this.uploadComplete();
                break;
                
            case 'upload_error':
                this.uploadError(data.error);
                break;
        }
    }
    
    enterRoom() {
        if (!this.isConnected) {
            this.showNotification('Connecting to server...');
            return;
        }
        
        const roomId = `${this.currentCategory}-${this.currentRoom.toString().padStart(3, '0')}`;
        
        this.ws.send(JSON.stringify({
            type: 'join',
            category: this.currentCategory,
            room: this.currentRoom,
            userId: this.userId
        }));
        
        // Switch to chat screen
        this.selectorScreen.classList.remove('active');
        this.chatScreen.style.display = 'flex';
        
        // Clear messages except welcome
        const welcomeMsg = this.messagesContainer.querySelector('.welcome-message');
        this.messagesContainer.innerHTML = '';
        if (welcomeMsg) {
            this.messagesContainer.appendChild(welcomeMsg);
        }
        
        // Focus input
        setTimeout(() => {
            this.messageInput.focus();
        }, 100);
    }
    
    leaveRoom() {
        // Switch to selector screen
        this.chatScreen.style.display = 'none';
        this.selectorScreen.classList.add('active');
        
        // Stop session timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        // Reset timer
        this.timeLeft = 900;
        this.updateTimerDisplay();
        
        // Clear input
        this.messageInput.value = '';
        
        // Hide upload progress if visible
        this.hideUploadProgress();
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
                this.showNotification('Session expired');
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
                userId: this.userId,
                timestamp: Date.now()
            }));
            
            // Clear input
            this.messageInput.value = '';
            this.messageInput.focus();
        } else {
            this.showNotification('Connection lost');
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file size (5MB max)
        if (file.size > this.maxFileSize) {
            this.showNotification(`File too large (max ${this.formatFileSize(this.maxFileSize)})`);
            event.target.value = '';
            return;
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Only images and videos are allowed');
            event.target.value = '';
            return;
        }
        
        // Start upload
        this.uploadFile(file);
        event.target.value = '';
    }
    
    uploadFile(file) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showNotification('Not connected to server');
            return;
        }
        
        this.currentUpload = {
            file: file,
            progress: 0
        };
        
        // Show upload progress
        this.showUploadProgress();
        
        // Simulate upload progress (in real app, this would be handled server-side)
        const simulateProgress = () => {
            if (this.currentUpload) {
                this.currentUpload.progress += 10;
                this.updateUploadProgress(this.currentUpload.progress);
                
                if (this.currentUpload.progress < 100) {
                    setTimeout(simulateProgress, 200);
                } else {
                    // Upload complete
                    setTimeout(() => {
                        this.sendFileMessage(file);
                        this.uploadComplete();
                    }, 500);
                }
            }
        };
        
        simulateProgress();
    }
    
    sendFileMessage(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'media',
                    mediaType: file.type.startsWith('image/') ? 'image' : 'video',
                    data: event.target.result,
                    filename: file.name,
                    filesize: file.size,
                    userId: this.userId,
                    timestamp: Date.now()
                }));
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    showUploadProgress() {
        this.uploadProgress.style.display = 'flex';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Uploading...';
    }
    
    updateUploadProgress(progress) {
        if (this.currentUpload) {
            this.currentUpload.progress = progress;
            this.progressFill.style.width = `${progress}%`;
            this.progressText.textContent = `Uploading... ${progress}%`;
        }
    }
    
    uploadComplete() {
        this.currentUpload = null;
        this.hideUploadProgress();
        this.showNotification('File uploaded successfully');
    }
    
    uploadError(error) {
        this.currentUpload = null;
        this.hideUploadProgress();
        this.showNotification(`Upload failed: ${error}`);
    }
    
    cancelUpload() {
        this.currentUpload = null;
        this.hideUploadProgress();
        this.showNotification('Upload cancelled');
    }
    
    hideUploadProgress() {
        this.uploadProgress.style.display = 'none';
        this.progressFill.style.width = '0%';
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(text)}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addMessage(type, sender, text, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const time = new Date(timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(text)}</div>
                <div class="message-meta">
                    <span class="message-sender">${sender}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addMediaMessage(type, sender, mediaType, data, filename, filesize, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const time = new Date(timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        let mediaContent = '';
        if (mediaType === 'image') {
            mediaContent = `<img src="${data}" class="message-media" alt="${filename}" loading="lazy">`;
        } else if (mediaType === 'video') {
            mediaContent = `<video controls class="message-media"><source src="${data}" type="video/mp4"></video>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${mediaContent}
                <div class="message-file">
                    <div class="file-icon">📎</div>
                    <div class="file-info">
                        <div class="file-name">${this.escapeHtml(filename)}</div>
                        <div class="file-size">${this.formatFileSize(filesize)}</div>
                    </div>
                </div>
                <div class="message-meta">
                    <span class="message-sender">${sender}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(message, duration = 3000) {
        this.notification.textContent = message;
        this.notification.classList.add('show');
        
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, duration);
    }
}

// Initialize the chat application
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.chatApp = new PrivateChat();
    
    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
            e.preventDefault();
        }
    });
    
    // Handle back button/gesture
    window.addEventListener('popstate', () => {
        if (window.chatApp) {
            window.chatApp.leaveRoom();
        }
    });
});
