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
    
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✓ WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            
            // Send user info
            this.ws.send(JSON.stringify({
                type: 'user_info',
                userId: this.userId,
                username: this.username
            }));
            
            // Start ping interval
            this.startPing();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
                this.showToast('Error processing message');
            }
        };
        
        this.ws.onclose = () => {
            console.log('✗ WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
            
            this.scheduleReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus(false);
        };
    }
    
    startPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
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
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connectWebSocket();
            }
        }, delay);
    }
    
    updateConnectionStatus(connected) {
        const statusIcon = this.connectionStatus.querySelector('.status-icon');
        const statusText = this.connectionStatus.querySelector('.status-text');
        
        if (connected) {
            statusIcon.className = 'status-icon connected';
            statusIcon.classList.remove('fa-wifi');
            statusIcon.classList.add('fa-check-circle');
            statusText.textContent = 'Connected';
            this.connectionStatus.style.borderColor = 'var(--success)';
        } else {
            statusIcon.className = 'status-icon';
            statusIcon.classList.remove('fa-check-circle');
            statusIcon.classList.add('fa-wifi');
            statusText.textContent = 'Connecting...';
            this.connectionStatus.style.borderColor = 'var(--error)';
        }
    }
    
    handleServerMessage(data) {
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
                this.showToast(data.message);
                break;
                
            case 'upload_progress':
                this.updateUploadProgress(data.progress);
                break;
                
            case 'upload_complete':
                this.handleUploadComplete(data);
                break;
        }
    }
    
    handleRoomJoined(data) {
        this.roomId = data.roomId;
        this.roomTitle.querySelector('span').textContent = `Room ${data.roomId}`;
        this.sessionActive = true;
        this.startSessionTimer();
        this.showToast(`Joined room ${data.roomId}`);
        
        // Add welcome message
        this.addWelcomeMessage();
    }
    
    enterRoom() {
        if (!this.isConnected) {
            this.showToast('Connecting to server...');
            return;
        }
        
        const roomId = `${this.currentCategory}-${this.currentRoom.toString().padStart(3, '0')}`;
        
        this.ws.send(JSON.stringify({
            type: 'join_room',
            category: this.currentCategory,
            room: this.currentRoom,
            userId: this.userId,
            username: this.username
        }));
        
        // Switch screens
        this.selectorScreen.classList.remove('active');
        this.chatScreen.style.display = 'flex';
        
        // Clear messages
        this.messagesContainer.innerHTML = '';
        
        // Focus input
        setTimeout(() => {
            this.messageInput.focus();
        }, 300);
        
        // Update layout
        this.updateLayout();
    }
    
    leaveRoom() {
        if (this.sessionActive) {
            this.ws.send(JSON.stringify({
                type: 'leave_room',
                userId: this.userId
            }));
        }
        
        // Switch screens
        this.chatScreen.style.display = 'none';
        this.selectorScreen.classList.add('active');
        
        // Reset session
        this.sessionActive = false;
        this.stopSessionTimer();
        this.timeLeft = 900;
        this.updateTimerDisplay();
        
        // Clear states
        this.cancelReply();
        this.clearUploadPreview();
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Update layout
        this.updateLayout();
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
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateUserCount(count) {
        this.userCount.querySelector('span').textContent = count;
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
        const text = this.messageInput.value.trim();
        const hasFile = this.uploadedFile !== null;
        
        if (!text && !hasFile) {
            return;
        }
        
        if (!this.isConnected || !this.sessionActive) {
            this.showToast('Not connected or session inactive');
            return;
        }
        
        const messageData = {
            type: hasFile ? 'upload_media' : (this.replyingTo ? 'reply' : 'message'),
            userId: this.userId,
            username: this.username,
            timestamp: Date.now(),
            replyTo: this.replyingTo,
            roomId: this.roomId
        };
        
        if (hasFile) {
            // Send file with caption
            messageData.file = this.uploadedFile;
            messageData.caption = this.captionInput.value.trim();
            messageData.fileName = this.uploadedFile.name;
            messageData.fileSize = this.uploadedFile.size;
            messageData.fileType = this.uploadedFile.type;
            
            // Show upload progress
            this.showUploadProgress();
            
            // Simulate upload (in real app, this would be actual upload)
            this.simulateFileUpload(messageData);
        } else {
            // Send text message
            messageData.text = text;
            
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(messageData));
                
                // Clear input and states
                this.messageInput.value = '';
                this.autoResizeTextarea();
                this.cancelReply();
                
                // Show sending indicator
                this.showSendingIndicator();
            }
        }
    }
    
    showSendingIndicator() {
        const tempId = 'temp_' + Date.now();
        const tempMessage = {
            id: tempId,
            type: 'sent',
            username: this.username,
            text: this.messageInput.value.trim(),
            timestamp: Date.now()
        };
        
        if (this.replyingTo) {
            tempMessage.replyTo = this.replyingTo;
        }
        
        this.displayMessage(tempMessage);
    }
    
    simulateFileUpload(messageData) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            this.updateUploadProgress(progress);
            
            if (progress >= 100) {
                clearInterval(interval);
                
                // Upload complete
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(messageData));
                }
                
                // Clear states
                this.clearUploadPreview();
                this.messageInput.value = '';
                this.autoResizeTextarea();
                this.cancelReply();
                
                this.showToast('File uploaded successfully');
            }
        }, 100);
    }
    
    showUploadProgress() {
        // This would show actual upload progress UI
        console.log('Upload starting...');
    }
    
    updateUploadProgress(progress) {
        // Update progress bar UI
        const progressBar = document.querySelector('.progress-fill');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
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
        this.uploadPreview.classList.add('active');
        
        // Create preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.previewImage.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            this.previewImage.innerHTML = `
                <div class="video-preview">
                    <i class="fas fa-video"></i>
                    <span>${file.name}</span>
                </div>
            `;
        }
        
        // Focus caption input
        setTimeout(() => {
            this.captionInput.focus();
        }, 100);
    }
    
    clearUploadPreview() {
        this.uploadedFile = null;
        this.uploadPreview.classList.remove('active');
        this.previewImage.innerHTML = '';
        this.captionInput.value = '';
        this.updateCaptionCounter();
    }
    
    updateCaptionCounter() {
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
        this.emojiPickerActive = !this.emojiPickerActive;
        this.emojiPicker.classList.toggle('active', this.emojiPickerActive);
        
        if (this.emojiPickerActive) {
            this.positionEmojiPicker();
        }
    }
    
    hideEmojiPicker() {
        this.emojiPickerActive = false;
        this.emojiPicker.classList.remove('active');
    }
    
    insertEmoji(emoji) {
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
        this.replyingTo = messageId;
        this.replySender.textContent = sender;
        this.replyText.textContent = text.length > 50 ? text.substring(0, 50) + '...' : text;
        this.replyPreview.classList.add('active');
        
        // Scroll reply preview into view
        this.replyPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Focus message input
        this.messageInput.focus();
    }
    
    cancelReply() {
        this.replyingTo = null;
        this.replyPreview.classList.remove('active');
    }
    
    // Message Display
    displayMessage(data) {
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
                    <div class="message-actions">
                        <button class="action-btn-small reply-btn" data-message-id="${data.id}" data-sender="${data.username}" data-text="${this.escapeHtml(data.text || '')}">
                            <i class="fas fa-reply"></i>
                            <span>Reply</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageGroup);
        this.scrollToBottom();
        
        // Add reply event listener
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
    
    displayReply(data) {
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
                    <div class="message-actions">
                        <button class="action-btn-small reply-btn" data-message-id="${data.id}" data-sender="${data.username}" data-text="${this.escapeHtml(data.text)}">
                            <i class="fas fa-reply"></i>
                            <span>Reply</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageGroup);
        this.scrollToBottom();
        
        // Add reply event listener
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
    
    displayMediaMessage(data) {
        const messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${data.type}`;
        
        const hasReply = data.replyTo && typeof data.replyTo === 'object';
        const isImage = data.fileType.startsWith('image/');
        
        messageGroup.innerHTML = `
            <div class="message ${data.type}">
                <div class="message-content">
                    ${hasReply ? this.createReplyIndicator(data.replyTo) : ''}
                    <div class="message-media-container">
                        ${isImage ? 
                            `<img src="${data.fileUrl}" class="message-media" alt="${data.fileName}" loading="lazy">` :
                            `<video controls class="message-media"><source src="${data.fileUrl}" type="${data.fileType}"></video>`
                        }
                    </div>
                    ${data.caption ? `<div class="media-caption">${this.escapeHtml(data.caption)}</div>` : ''}
                    <div class="message-meta">
                        <span class="message-sender">${data.username}</span>
                        <span class="message-time">${this.formatTime(data.timestamp)}</span>
                    </div>
                    <div class="message-actions">
                        <button class="action-btn-small reply-btn" data-message-id="${data.id}" data-sender="${data.username}" data-text="${data.caption || 'Media'}">
                            <i class="fas fa-reply"></i>
                            <span>Reply</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageGroup);
        this.scrollToBottom();
        
        // Add reply event listener
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
    
    displaySystemMessage(data) {
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
        return `
            <div class="reply-indicator ${replyData.type}">
                <i class="fas fa-reply reply-indicator-icon"></i>
                <div class="reply-indicator-content">
                    <div class="reply-indicator-sender">${replyData.username}</div>
                    <div class="reply-indicator-text">${this.escapeHtml(replyData.text || 'Media')}</div>
                </div>
            </div>
        `;
    }
    
    addWelcomeMessage() {
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showToast(message, duration = 3000) {
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
});
