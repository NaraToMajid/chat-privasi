[file name]: deepseek_javascript_20260110_58b93c.js
[file content begin]
class PrivateChatPro {
    constructor() {
        // User & Room Configuration
        this.userId = 'user_' + Math.random().toString(36).substr(2, 8);
        this.username = `User${this.userId.substr(5, 4)}`;
        this.currentCategory = 'A';
        this.currentRoom = 1;
        this.roomId = null;
        
        // Connection
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.pingInterval = null;
        
        // Session Management
        this.sessionTimer = null;
        this.timeLeft = 900; // 15 minutes in seconds
        this.sessionActive = false;
        
        // Message & Reply Management
        this.replyingTo = null;
        this.uploadedFile = null;
        this.uploadProgress = 0;
        this.emojiPickerActive = false;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime'];
        
        // UI State
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isPortrait = window.innerHeight > window.innerWidth;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupResponsive();
        this.renderSelector();
        this.connectWebSocket();
        this.setupEmojiPicker();
        this.preventZoom();
        this.updateUserIdDisplay();
    }
    
    cacheElements() {
        // Screens
        this.selectorScreen = document.getElementById('selectorScreen');
        this.chatScreen = document.getElementById('chatScreen');
        
        // Selector Elements
        this.catValue = document.getElementById('catValue');
        this.roomValue = document.getElementById('roomValue');
        this.roomDisplay = document.getElementById('roomDisplay');
        this.prevCatBtn = document.getElementById('prevCat');
        this.nextCatBtn = document.getElementById('nextCat');
        this.prevRoomBtn = document.getElementById('prevRoom');
        this.nextRoomBtn = document.getElementById('nextRoom');
        this.enterBtn = document.getElementById('enterBtn');
        
        // Chat Elements
        this.roomTitle = document.getElementById('roomTitle');
        this.userCount = document.getElementById('userCount');
        this.timerElement = document.getElementById('timer');
        this.backBtn = document.getElementById('backBtn');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.attachBtn = document.getElementById('attachBtn');
        this.fileInput = document.getElementById('fileInput');
        this.emojiBtn = document.getElementById('emojiBtn');
        
        // Reply System
        this.replyPreview = document.getElementById('replyPreview');
        this.replySender = document.getElementById('replySender');
        this.replyText = document.getElementById('replyText');
        this.cancelReplyBtn = document.getElementById('cancelReply');
        
        // Upload System
        this.uploadPreview = document.getElementById('uploadPreview');
        this.previewImage = document.getElementById('previewImage');
        this.captionInput = document.getElementById('captionInput');
        this.captionCount = document.getElementById('captionCount');
        this.removePreviewBtn = document.getElementById('removePreview');
        
        // Status & UI
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusIcon = document.querySelector('.status-icon');
        this.statusText = document.querySelector('.status-text');
        this.toast = document.getElementById('toast');
        this.emojiPicker = document.getElementById('emojiPicker');
        this.emojiGrid = document.getElementById('emojiGrid');
        this.closeEmojiBtn = document.getElementById('closeEmoji');
        
        // User ID Display
        this.userIdDisplay = document.getElementById('userIdDisplay');
    }
    
    bindEvents() {
        // Navigation
        this.prevCatBtn.addEventListener('click', () => this.navigateCategory(-1));
        this.nextCatBtn.addEventListener('click', () => this.navigateCategory(1));
        this.prevRoomBtn.addEventListener('click', () => this.navigateRoom(-1));
        this.nextRoomBtn.addEventListener('click', () => this.navigateRoom(1));
        this.enterBtn.addEventListener('click', () => this.enterRoom());
        this.backBtn.addEventListener('click', () => this.leaveRoom());
        
        // Message Input
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.messageInput.addEventListener('focus', () => this.hideEmojiPicker());
        
        // File Upload
        this.attachBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removePreviewBtn.addEventListener('click', () => this.clearUploadPreview());
        this.captionInput.addEventListener('input', () => this.updateCaptionCounter());
        
        // Reply System
        this.cancelReplyBtn.addEventListener('click', () => this.cancelReply());
        
        // Emoji Picker
        this.emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());
        this.closeEmojiBtn.addEventListener('click', () => this.hideEmojiPicker());
        
        // Window Events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        
        // Prevent unwanted behaviors
        document.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        document.addEventListener('gesturestart', (e) => e.preventDefault());
    }
    
    preventZoom() {
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    }
    
    handleTouchStart(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }
    
    setupResponsive() {
        this.handleResize();
        this.updateLayout();
    }
    
    handleResize() {
        this.isPortrait = window.innerHeight > window.innerWidth;
        this.updateLayout();
        
        // Adjust emoji picker position
        if (this.emojiPickerActive) {
            this.positionEmojiPicker();
        }
        
        // Adjust connection status position
        this.positionConnectionStatus();
    }
    
    handleOrientationChange() {
        setTimeout(() => {
            this.handleResize();
        }, 100);
    }
    
    updateLayout() {
        if (this.isPortrait) {
            // Mobile portrait layout adjustments
            document.documentElement.style.setProperty('--spacing-lg', '12px');
            document.documentElement.style.setProperty('--spacing-xl', '20px');
            
            // Adjust input area for mobile
            const inputArea = document.querySelector('.input-area');
            if (inputArea) {
                inputArea.style.minHeight = '70px';
            }
            
            // Adjust connection status for mobile
            this.connectionStatus.style.bottom = '80px';
        } else {
            // Landscape/desktop layout
            document.documentElement.style.setProperty('--spacing-lg', '16px');
            document.documentElement.style.setProperty('--spacing-xl', '24px');
            
            // Adjust connection status
            this.connectionStatus.style.bottom = '20px';
        }
    }
    
    positionConnectionStatus() {
        if (this.isPortrait) {
            this.connectionStatus.style.bottom = '80px';
            this.connectionStatus.style.right = '10px';
        } else {
            this.connectionStatus.style.bottom = '20px';
            
            // Center horizontally for desktop
            const appWidth = document.getElementById('app').offsetWidth;
            const windowWidth = window.innerWidth;
            const leftPosition = (windowWidth - appWidth) / 2 + 20;
            this.connectionStatus.style.right = `${leftPosition}px`;
        }
    }
    
    positionEmojiPicker() {
        if (this.isPortrait) {
            this.emojiPicker.style.bottom = '70px';
            this.emojiPicker.style.right = '10px';
        } else {
            this.emojiPicker.style.bottom = '80px';
            this.emojiPicker.style.right = '20px';
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
    
    updateUserIdDisplay() {
        if (this.userIdDisplay) {
            this.userIdDisplay.textContent = this.userId;
        }
    }
    
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            console.log('Attempting to connect to WebSocket:', wsUrl);
            
            this.ws.onopen = () => {
                console.log('✓ WebSocket connected successfully');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                this.showToast('Connected to server');
                
                // Start ping interval
                this.startPing();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    console.log('Received WebSocket message:', event.data);
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error, 'Raw data:', event.data);
                    this.showToast('Error processing message');
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('✗ WebSocket disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.updateConnectionStatus(false);
                
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
                
                if (!event.wasClean) {
                    this.scheduleReconnect();
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
                this.showToast('Connection error');
            };
            
            // Add event listener for testing
            window.testWebSocket = () => {
                console.log('WebSocket state:', this.ws.readyState);
                console.log('Is connected:', this.isConnected);
                console.log('Current room:', this.roomId);
                console.log('Session active:', this.sessionActive);
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.showToast('Failed to connect to server');
            this.scheduleReconnect();
        }
    }
    
    startPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const pingMessage = { 
                    type: 'ping',
                    timestamp: Date.now(),
                    userId: this.userId
                };
                this.ws.send(JSON.stringify(pingMessage));
                console.log('Sent ping');
            }
        }, 25000); // Ping every 25 seconds
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showToast('Cannot connect to server. Please refresh.');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connectWebSocket();
            }
        }, delay);
    }
    
    updateConnectionStatus(connected) {
        if (!this.connectionStatus) return;
        
        const statusIcon = this.connectionStatus.querySelector('.status-icon');
        const statusText = this.connectionStatus.querySelector('.status-text');
        
        if (connected) {
            statusIcon.className = 'status-icon connected';
            statusIcon.classList.remove('fa-wifi');
            statusIcon.classList.add('fa-check-circle');
            statusText.textContent = 'Connected';
            this.connectionStatus.style.borderColor = 'var(--success)';
            this.connectionStatus.style.opacity = '0.8';
        } else {
            statusIcon.className = 'status-icon';
            statusIcon.classList.remove('fa-check-circle');
            statusIcon.classList.add('fa-wifi');
            statusText.textContent = 'Connecting...';
            this.connectionStatus.style.borderColor = 'var(--error)';
            this.connectionStatus.style.opacity = '0.6';
        }
    }
    
    handleServerMessage(data) {
        console.log('Processing server message:', data);
        
        switch (data.type) {
            case 'room_joined':
                this.handleRoomJoined(data);
                break;
                
            case 'user_count':
                this.updateUserCount(data.count);
                break;
                
            case 'message':
                this.displayMessage(data);
                break;
                
            case 'reply':
                this.displayReply(data);
                break;
                
            case 'media':
                this.displayMediaMessage(data);
                break;
                
            case 'system':
                this.displaySystemMessage(data);
                break;
                
            case 'error':
                this.showToast(data.message || 'An error occurred');
                break;
                
            case 'pong':
                console.log('Received pong from server');
                break;
                
            case 'ack':
                // Message acknowledged by server
                console.log('Message acknowledged by server:', data.messageId);
                this.removeSendingIndicator(data.tempId);
                break;
                
            case 'notification':
                this.showToast(data.message, 3000);
                break;
                
            default:
                console.warn('Unknown message type:', data.type);
        }
    }
    
    handleRoomJoined(data) {
        this.roomId = data.roomId;
        if (this.roomTitle && this.roomTitle.querySelector('span')) {
            this.roomTitle.querySelector('span').textContent = `Room ${data.roomId}`;
        }
        this.sessionActive = true;
        this.startSessionTimer();
        this.showToast(`Joined room ${data.roomId}`);
        
        // Add welcome message
        this.addWelcomeMessage();
    }
    
    enterRoom() {
        console.log('Enter room button clicked');
        
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showToast('Not connected to server. Connecting...');
            this.connectWebSocket();
            setTimeout(() => this.enterRoom(), 1000);
            return;
        }
        
        const roomId = `${this.currentCategory}-${this.currentRoom.toString().padStart(3, '0')}`;
        console.log('Joining room:', roomId);
        
        const joinMessage = {
            type: 'join_room',
            category: this.currentCategory,
            room: this.currentRoom,
            userId: this.userId,
            username: this.username,
            timestamp: Date.now()
        };
        
        console.log('Sending join message:', joinMessage);
        
        try {
            this.ws.send(JSON.stringify(joinMessage));
        } catch (error) {
            console.error('Failed to send join message:', error);
            this.showToast('Failed to join room');
            return;
        }
        
        // Switch screens
        this.selectorScreen.classList.remove('active');
        this.chatScreen.style.display = 'flex';
        
        // Clear messages
        this.messagesContainer.innerHTML = '';
        
        // Show temporary message
        this.displaySystemMessage({
            type: 'system',
            text: 'Joining room...'
        });
        
        // Focus input
        setTimeout(() => {
            if (this.messageInput) {
                this.messageInput.focus();
            }
        }, 300);
        
        // Update layout
        this.updateLayout();
    }
    
    leaveRoom() {
        console.log('Leaving room');
        
        if (this.sessionActive && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const leaveMessage = {
                    type: 'leave_room',
                    userId: this.userId,
                    roomId: this.roomId,
                    timestamp: Date.now()
                };
                this.ws.send(JSON.stringify(leaveMessage));
            } catch (error) {
                console.error('Failed to send leave message:', error);
            }
        }
        
        // Switch screens
        this.chatScreen.style.display = 'none';
        this.selectorScreen.classList.add('active');
        
        // Reset session
        this.sessionActive = false;
        this.roomId = null;
        this.stopSessionTimer();
        this.timeLeft = 900;
        this.updateTimerDisplay();
        
        // Clear states
        this.cancelReply();
        this.clearUploadPreview();
        if (this.messageInput) {
            this.messageInput.value = '';
            this.autoResizeTextarea();
        }
        
        // Update layout
        this.updateLayout();
        
        console.log('Left room successfully');
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
                this.showToast('Session expired (15 minutes)');
            }
        }, 1000);
    }
    
    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    updateTimerDisplay() {
        if (!this.timerElement) return;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateUserCount(count) {
        if (this.userCount && this.userCount.querySelector('span')) {
            this.userCount.querySelector('span').textContent = count;
        }
    }
    
    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
        
        // Escape key cancels reply or upload preview
        if (e.key === 'Escape') {
            if (this.replyingTo) {
                this.cancelReply();
            }
            if (this.uploadedFile) {
                this.clearUploadPreview();
            }
        }
    }
    
    autoResizeTextarea() {
        if (!this.messageInput) return;
        
        const textarea = this.messageInput;
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 100);
        textarea.style.height = newHeight + 'px';
        
        // Update input wrapper height
        const wrapper = textarea.closest('.message-input-wrapper');
        if (wrapper) {
            wrapper.style.maxHeight = Math.min(newHeight + 32, 150) + 'px';
        }
    }
    
    sendMessage() {
        console.log('Send message called');
        
        const text = this.messageInput ? this.messageInput.value.trim() : '';
        const hasFile = this.uploadedFile !== null;
        
        if (!text && !hasFile) {
            console.log('No content to send');
            return;
        }
        
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showToast('Not connected to server');
            console.error('WebSocket not connected. State:', this.ws ? this.ws.readyState : 'no ws');
            return;
        }
        
        if (!this.sessionActive) {
            this.showToast('Please join a room first');
            return;
        }
        
        const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const messageData = {
            type: hasFile ? 'upload_media' : (this.replyingTo ? 'reply' : 'message'),
            id: messageId,
            userId: this.userId,
            username: this.username,
            timestamp: Date.now(),
            roomId: this.roomId
        };
        
        // Add reply data if exists
        if (this.replyingTo) {
            messageData.replyTo = {
                id: this.replyingTo.id,
                username: this.replyingTo.sender,
                text: this.replyingTo.text
            };
        }
        
        if (hasFile) {
            // Handle file upload
            this.handleFileUpload(messageData);
        } else {
            // Send text message
            messageData.text = text;
            
            try {
                console.log('Sending message:', messageData);
                this.ws.send(JSON.stringify(messageData));
                
                // Display message locally immediately
                this.displayMessage({
                    ...messageData,
                    type: 'sent'
                });
                
                // Clear input and states
                if (this.messageInput) {
                    this.messageInput.value = '';
                    this.autoResizeTextarea();
                }
                this.cancelReply();
                
                console.log('Message sent successfully');
                
            } catch (error) {
                console.error('Failed to send message:', error);
                this.showToast('Failed to send message');
            }
        }
    }
    
    handleFileUpload(messageData) {
        if (!this.uploadedFile) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            messageData.file = {
                name: this.uploadedFile.name,
                type: this.uploadedFile.type,
                size: this.uploadedFile.size,
                data: e.target.result // Base64 encoded
            };
            
            if (this.captionInput) {
                messageData.caption = this.captionInput.value.trim();
            }
            
            try {
                console.log('Sending file message:', { ...messageData, file: { ...messageData.file, data: '[BASE64_DATA]' } });
                this.ws.send(JSON.stringify(messageData));
                
                // Display message locally
                this.displayMediaMessage({
                    ...messageData,
                    type: 'sent',
                    fileUrl: e.target.result,
                    fileName: this.uploadedFile.name
                });
                
                // Clear states
                this.clearUploadPreview();
                if (this.messageInput) {
                    this.messageInput.value = '';
                    this.autoResizeTextarea();
                }
                this.cancelReply();
                
                console.log('File sent successfully');
                
            } catch (error) {
                console.error('Failed to send file:', error);
                this.showToast('Failed to send file');
            }
        };
        
        reader.onerror = (error) => {
            console.error('Failed to read file:', error);
            this.showToast('Failed to process file');
        };
        
        reader.readAsDataURL(this.uploadedFile);
    }
    
    removeSendingIndicator(tempId) {
        // Remove temporary message indicator
        const tempElement = document.querySelector(`[data-temp-id="${tempId}"]`);
        if (tempElement) {
            tempElement.remove();
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('File selected:', file.name, file.type, file.size);
        
        // Validate file size
        if (file.size > this.maxFileSize) {
            this.showToast(`File too large (max 5MB)`);
            event.target.value = '';
            return;
        }
        
        // Validate file type
        if (!this.allowedTypes.includes(file.type)) {
            this.showToast('Only images and videos are allowed');
            event.target.value = '';
            return;
        }
        
        // Store file
        this.uploadedFile = file;
        
        // Show preview
        this.showFilePreview(file);
        
        // Clear file input
        event.target.value = '';
    }
    
    showFilePreview(file) {
        if (!this.uploadPreview) return;
        
        this.uploadPreview.classList.add('active');
        
        // Create preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (this.previewImage) {
                    this.previewImage.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                }
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            if (this.previewImage) {
                this.previewImage.innerHTML = `
                    <div class="video-preview">
                        <i class="fas fa-video"></i>
                        <span>${file.name}</span>
                    </div>
                `;
            }
        }
        
        // Focus caption input
        setTimeout(() => {
            if (this.captionInput) {
                this.captionInput.focus();
            }
        }, 100);
    }
    
    clearUploadPreview() {
        this.uploadedFile = null;
        if (this.uploadPreview) {
            this.uploadPreview.classList.remove('active');
        }
        if (this.previewImage) {
            this.previewImage.innerHTML = '';
        }
        if (this.captionInput) {
            this.captionInput.value = '';
            this.updateCaptionCounter();
        }
    }
    
    updateCaptionCounter() {
        if (!this.captionInput || !this.captionCount) return;
        
        const length = this.captionInput.value.length;
        this.captionCount.textContent = length;
        
        if (length > 180) {
            this.captionCount.style.color = 'var(--warning)';
        } else if (length > 190) {
            this.captionCount.style.color = 'var(--error)';
        } else {
            this.captionCount.style.color = 'var(--white-70)';
        }
    }
    
    setupEmojiPicker() {
        if (!this.emojiGrid) return;
        
        // Common emojis
        const emojis = ['😀', '😂', '🥰', '😎', '🤔', '😱', '👍', '👎', '❤️', '🔥', '🎉', '🙏', '💯', '👋', '🤝', '💪', '🧠', '✨', '🌟', '📸', '🎥', '🔒', '⏰', '🚀'];
        
        this.emojiGrid.innerHTML = '';
        emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'emoji-btn';
            button.textContent = emoji;
            button.addEventListener('click', () => this.insertEmoji(emoji));
            this.emojiGrid.appendChild(button);
        });
    }
    
    toggleEmojiPicker() {
        if (!this.emojiPicker) return;
        
        this.emojiPickerActive = !this.emojiPickerActive;
        this.emojiPicker.classList.toggle('active', this.emojiPickerActive);
        
        if (this.emojiPickerActive) {
            this.positionEmojiPicker();
        }
    }
    
    hideEmojiPicker() {
        if (!this.emojiPicker) return;
        
        this.emojiPickerActive = false;
        this.emojiPicker.classList.remove('active');
    }
    
    insertEmoji(emoji) {
        if (!this.messageInput) return;
        
        const textarea = this.messageInput;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        textarea.value = text.substring(0, start) + emoji + text.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
        
        this.autoResizeTextarea();
        this.hideEmojiPicker();
    }
    
    // Reply System
    setupReply(messageId, sender, text) {
        this.replyingTo = { id: messageId, sender: sender, text: text };
        
        if (this.replySender && this.replyText && this.replyPreview) {
            this.replySender.textContent = sender;
            this.replyText.textContent = text.length > 50 ? text.substring(0, 50) + '...' : text;
            this.replyPreview.classList.add('active');
        }
        
        // Scroll reply preview into view
        if (this.replyPreview) {
            this.replyPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Focus message input
        if (this.messageInput) {
            this.messageInput.focus();
        }
    }
    
    cancelReply() {
        this.replyingTo = null;
        if (this.replyPreview) {
            this.replyPreview.classList.remove('active');
        }
    }
    
    // Message Display
    displayMessage(data) {
        if (!this.messagesContainer) return;
        
        const messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${data.type}`;
        
        // Check if this is a reply
        const hasReply = data.replyTo && typeof data.replyTo === 'object';
        
        messageGroup.innerHTML = `
            <div class="message ${data.type}">
                <div class="message-content">
                    ${hasReply ? this.createReplyIndicator(data.replyTo) : ''}
                    ${data.text ? `<div class="message-text">${this.escapeHtml(data.text)}</div>` : ''}
                    <div class="message-meta">
                        <span class="message-sender">${data.username}</span>
                        <span class="message-time">${this.formatTime(data.timestamp)}</span>
                    </div>
                    ${data.type === 'received' ? `
                    <div class="message-actions">
                        <button class="action-btn-small reply-btn" data-message-id="${data.id}" data-sender="${data.username}" data-text="${this.escapeHtml(data.text || '')}">
                            <i class="fas fa-reply"></i>
                            <span>Reply</span>
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageGroup);
        this.scrollToBottom();
        
        // Add reply event listener
        if (data.type === 'received') {
            const replyBtn = messageGroup.querySelector('.reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', (e) => {
                    const messageId = e.currentTarget.dataset.messageId;
                    const sender = e.currentTarget.dataset.sender;
                    const text = e.currentTarget.dataset.text;
                    this.setupReply(messageId, sender, text);
                });
            }
        }
    }
    
    displayReply(data) {
        if (!this.messagesContainer) return;
        
        const messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${data.type}`;
        
        messageGroup.innerHTML = `
            <div class="message ${data.type}">
                <div class="message-content">
                    ${this.createReplyIndicator(data.replyTo)}
                    <div class="message-text">${this.escapeHtml(data.text)}</div>
                    <div class="message-meta">
                        <span class="message-sender">${data.username}</span>
                        <span class="message-time">${this.formatTime(data.timestamp)}</span>
                    </div>
                    ${data.type === 'received' ? `
                    <div class="message-actions">
                        <button class="action-btn-small reply-btn" data-message-id="${data.id}" data-sender="${data.username}" data-text="${this.escapeHtml(data.text)}">
                            <i class="fas fa-reply"></i>
                            <span>Reply</span>
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageGroup);
        this.scrollToBottom();
        
        // Add reply event listener
        if (data.type === 'received') {
            const replyBtn = messageGroup.querySelector('.reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', (e) => {
                    const messageId = e.currentTarget.dataset.messageId;
                    const sender = e.currentTarget.dataset.sender;
                    const text = e.currentTarget.dataset.text;
                    this.setupReply(messageId, sender, text);
                });
            }
        }
    }
    
    displayMediaMessage(data) {
        if (!this.messagesContainer) return;
        
        const messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${data.type}`;
        
        const hasReply = data.replyTo && typeof data.replyTo === 'object';
        const isImage = data.fileType ? data.fileType.startsWith('image/') : 
                      (data.file && data.file.type && data.file.type.startsWith('image/')) ||
                      (data.fileUrl && data.fileUrl.startsWith('data:image'));
        
        messageGroup.innerHTML = `
            <div class="message ${data.type}">
                <div class="message-content">
                    ${hasReply ? this.createReplyIndicator(data.replyTo) : ''}
                    <div class="message-media-container">
                        ${isImage ? 
                            `<img src="${data.fileUrl || (data.file && data.file.data)}" class="message-media" alt="${data.fileName || 'Media'}" loading="lazy">` :
                            `<video controls class="message-media"><source src="${data.fileUrl || (data.file && data.file.data)}" type="${data.fileType || 'video/mp4'}"></video>`
                        }
                    </div>
                    ${data.caption ? `<div class="media-caption">${this.escapeHtml(data.caption)}</div>` : ''}
                    <div class="message-meta">
                        <span class="message-sender">${data.username}</span>
                        <span class="message-time">${this.formatTime(data.timestamp)}</span>
                    </div>
                    ${data.type === 'received' ? `
                    <div class="message-actions">
                        <button class="action-btn-small reply-btn" data-message-id="${data.id}" data-sender="${data.username}" data-text="${data.caption || 'Media'}">
                            <i class="fas fa-reply"></i>
                            <span>Reply</span>
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageGroup);
        this.scrollToBottom();
        
        // Add reply event listener
        if (data.type === 'received') {
            const replyBtn = messageGroup.querySelector('.reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', (e) => {
                    const messageId = e.currentTarget.dataset.messageId;
                    const sender = e.currentTarget.dataset.sender;
                    const text = e.currentTarget.dataset.text;
                    this.setupReply(messageId, sender, text);
                });
            }
        }
    }
    
    displaySystemMessage(data) {
        if (!this.messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(data.text)}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    createReplyIndicator(replyData) {
        if (!replyData) return '';
        
        return `
            <div class="reply-indicator ${replyData.type || ''}">
                <i class="fas fa-reply reply-indicator-icon"></i>
                <div class="reply-indicator-content">
                    <div class="reply-indicator-sender">${replyData.username || replyData.sender || 'User'}</div>
                    <div class="reply-indicator-text">${this.escapeHtml(replyData.text || 'Media')}</div>
                </div>
            </div>
        `;
    }
    
    addWelcomeMessage() {
        if (!this.messagesContainer) return;
        
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'message system';
        welcomeMsg.innerHTML = `
            <div class="message-content">
                <div class="message-text">
                    <i class="fas fa-user-secret"></i>
                    Welcome to the room! All messages are anonymous and will be deleted after the session ends.
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(welcomeMsg);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        if (!this.messagesContainer) return;
        
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    formatTime(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (error) {
            return '--:--';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showToast(message, duration = 3000) {
        if (!this.toast) return;
        
        this.toast.textContent = message;
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, duration);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
        if (e.scale !== 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Initialize chat app
    window.chatApp = new PrivateChatPro();
    
    // Handle back button
    window.addEventListener('popstate', () => {
        if (window.chatApp && window.chatApp.sessionActive) {
            window.chatApp.leaveRoom();
        }
    });
    
    // Prevent accidental navigation
    window.addEventListener('beforeunload', (e) => {
        if (window.chatApp && window.chatApp.sessionActive) {
            e.preventDefault();
            e.returnValue = '';
            return 'You have an active chat session. Are you sure you want to leave?';
        }
    });
    
    // Debug helper
    window.debugChat = () => {
        console.log('=== CHAT DEBUG INFO ===');
        console.log('WebSocket:', window.chatApp.ws);
        console.log('WebSocket State:', window.chatApp.ws ? window.chatApp.ws.readyState : 'No WebSocket');
        console.log('Is Connected:', window.chatApp.isConnected);
        console.log('Session Active:', window.chatApp.sessionActive);
        console.log('Room ID:', window.chatApp.roomId);
        console.log('Current User:', window.chatApp.userId);
        console.log('========================');
    };
});
[file content end]
