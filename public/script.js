class ChatApp {
    constructor() {
        this.ws = null;
        this.userId = 'Anonim-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        this.currentCategory = 'A';
        this.currentRoom = 1;
        this.isConnected = false;
        this.sessionTimer = null;
        this.sessionTimeLeft = 15 * 60;
        this.replyingTo = null;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderSelector();
        this.connectWebSocket();
        this.updateUserIdDisplay();
    }
    
    cacheElements() {
        // Screen selector elements
        this.screenSelector = document.getElementById('screenSelector');
        this.chatScreen = document.getElementById('chatScreen');
        this.categoryValue = document.getElementById('categoryValue');
        this.roomValue = document.getElementById('roomValue');
        this.prevCategoryBtn = document.getElementById('prevCategory');
        this.nextCategoryBtn = document.getElementById('nextCategory');
        this.prevRoomBtn = document.getElementById('prevRoom');
        this.nextRoomBtn = document.getElementById('nextRoom');
        this.enterBtn = document.getElementById('enterBtn');
        
        // Chat screen elements
        this.roomTitle = document.getElementById('roomTitle');
        this.roomStats = document.getElementById('roomStats');
        this.sessionTimerElement = document.getElementById('sessionTimer');
        this.backBtn = document.getElementById('backBtn');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.mediaBtn = document.getElementById('mediaBtn');
        this.fileInput = document.getElementById('fileInput');
        this.replyBtn = document.getElementById('replyBtn');
        this.replyPreview = document.getElementById('replyPreview');
        this.cancelReplyBtn = document.getElementById('cancelReply');
        this.userIdDisplay = document.getElementById('userIdDisplay');
        
        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        
        // Modal elements
        this.imageModal = document.getElementById('imageModal');
        this.modalImage = document.getElementById('modalImage');
        this.modalClose = document.getElementById('modalClose');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
    }
    
    bindEvents() {
        // Navigation buttons
        this.prevCategoryBtn.addEventListener('click', () => this.navigateCategory(-1));
        this.nextCategoryBtn.addEventListener('click', () => this.navigateCategory(1));
        this.prevRoomBtn.addEventListener('click', () => this.navigateRoom(-1));
        this.nextRoomBtn.addEventListener('click', () => this.navigateRoom(1));
        this.enterBtn.addEventListener('click', () => this.enterRoom());
        
        // Chat controls
        this.backBtn.addEventListener('click', () => this.leaveRoom());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Media and reply
        this.mediaBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.replyBtn.addEventListener('click', () => this.showReplySelector());
        this.cancelReplyBtn.addEventListener('click', () => this.cancelReply());
        
        // Modal controls
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        
        // Close modal on background click
        this.imageModal.addEventListener('click', (e) => {
            if (e.target === this.imageModal) {
                this.closeModal();
            }
        });
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
        this.categoryValue.textContent = this.currentCategory;
        this.roomValue.textContent = this.currentRoom.toString().padStart(3, '0');
    }
    
    updateUserIdDisplay() {
        this.userIdDisplay.textContent = this.userId;
    }
    
    connectWebSocket() {
        // Simulasi koneksi WebSocket (dalam implementasi nyata, ganti dengan URL server WebSocket Anda)
        console.log('Menyambung ke server...');
        
        // Simulasi koneksi sukses setelah 1 detik
        setTimeout(() => {
            this.isConnected = true;
            this.updateStatus(true);
            console.log('Terhubung ke server (simulasi)');
        }, 1000);
        
        // Simulasi pesan dari server
        setInterval(() => {
            if (this.isConnected && Math.random() > 0.7) {
                this.handleIncomingMessage();
            }
        }, 5000);
    }
    
    updateStatus(connected) {
        this.statusDot.classList.toggle('connected', connected);
        this.statusText.textContent = connected ? 'Terhubung' : 'Terputus';
    }
    
    enterRoom() {
        if (!this.isConnected) {
            alert('Belum terhubung ke server. Tunggu sebentar...');
            return;
        }
        
        const roomId = `${this.currentCategory}-${this.currentRoom.toString().padStart(3, '0')}`;
        
        // Simulasi pengiriman permintaan join ke server
        console.log(`Bergabung ke room: ${roomId} sebagai ${this.userId}`);
        
        // Switch screens
        this.screenSelector.classList.remove('active');
        this.chatScreen.classList.add('active');
        this.roomTitle.textContent = `Room ${roomId}`;
        this.roomStats.textContent = '1 pengguna online';
        this.messageInput.focus();
        
        // Clear messages
        this.messagesContainer.innerHTML = '';
        
        // Add welcome message
        this.addMessage({
            type: 'system',
            message: `Selamat datang di Room ${roomId}. Percakapan Anda 100% anonim.`,
            timestamp: Date.now()
        });
        
        // Simulasi user lain bergabung
        setTimeout(() => {
            this.addMessage({
                type: 'system',
                message: 'Pengguna lain telah bergabung',
                timestamp: Date.now(),
                userCount: 2
            });
            this.roomStats.textContent = '2 pengguna online';
        }, 1500);
        
        // Start session timer
        this.startSessionTimer();
    }
    
    leaveRoom() {
        // Switch screens
        this.chatScreen.classList.remove('active');
        this.screenSelector.classList.add('active');
        
        // Clear session timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        // Reset reply
        this.cancelReply();
    }
    
    startSessionTimer() {
        this.sessionTimeLeft = 15 * 60;
        
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        this.sessionTimer = setInterval(() => {
            this.sessionTimeLeft--;
            
            const minutes = Math.floor(this.sessionTimeLeft / 60);
            const seconds = this.sessionTimeLeft % 60;
            this.sessionTimerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.sessionTimeLeft <= 0) {
                this.leaveRoom();
                alert('Sesi 15 menit telah berakhir. Silakan masuk kembali.');
            }
        }, 1000);
    }
    
    handleIncomingMessage() {
        const messages = [
            "Halo! Bagaimana kabarmu?",
            "Sesi ini benar-benar anonim ya?",
            "Percakapan akan terhapus otomatis setelah 15 menit",
            "Bisa kirim gambar juga lho",
            "Sudah berapa lama di sini?"
        ];
        
        const users = ['User1', 'AnonX', 'Pengguna', 'Teman'];
        
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        this.addMessage({
            type: 'received',
            userId: randomUser,
            text: randomMessage,
            timestamp: Date.now()
        });
    }
    
    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;
        
        if (!this.isConnected) {
            alert('Tidak terhubung ke server');
            return;
        }
        
        // Simulasi pengiriman pesan ke server
        console.log('Mengirim pesan:', text);
        
        // Tambahkan pesan ke chat
        this.addMessage({
            type: 'sent',
            userId: this.userId,
            text: text,
            timestamp: Date.now(),
            replyTo: this.replyingTo
        });
        
        // Reset input
        this.messageInput.value = '';
        this.messageInput.focus();
        this.cancelReply();
        
        // Simulasi balasan dari user lain setelah 1-3 detik
        if (Math.random() > 0.3) {
            setTimeout(() => {
                this.handleIncomingMessage();
            }, 1000 + Math.random() * 2000);
        }
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran file maksimal 5MB');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('Hanya gambar yang didukung');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            if (!this.isConnected) {
                alert('Tidak terhubung ke server');
                return;
            }
            
            // Simulasi pengiriman gambar ke server
            console.log('Mengirim gambar:', file.name);
            
            // Tambahkan gambar ke chat
            this.addMessage({
                type: 'sent',
                userId: this.userId,
                image: e.target.result,
                timestamp: Date.now(),
                fileName: file.name
            });
            
            // Reset input
            event.target.value = '';
        };
        
        reader.readAsDataURL(file);
    }
    
    addMessage(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.type}`;
        
        const time = new Date(msg.timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        let content = '';
        
        if (msg.type === 'system') {
            content = `
                <div class="message-content">
                    <i class="fas fa-info-circle"></i>
                    ${msg.message}
                </div>
            `;
        } else {
            // Jika ada reply
            let replySection = '';
            if (msg.replyTo) {
                replySection = `
                    <div class="message-reply">
                        <div class="message-reply-user">${msg.replyTo.userId}:</div>
                        <div class="message-reply-text">${msg.replyTo.text.substring(0, 50)}${msg.replyTo.text.length > 50 ? '...' : ''}</div>
                    </div>
                `;
            }
            
            // Jika ada gambar
            let imageSection = '';
            if (msg.image) {
                imageSection = `
                    <img src="${msg.image}" class="message-image" alt="Gambar" data-image="${msg.image}" data-filename="${msg.fileName || 'gambar'}">
                `;
            }
            
            // Action buttons
            let actionButtons = '';
            if (msg.type === 'received') {
                actionButtons = `
                    <div class="message-actions">
                        <button class="action-btn reply-action" data-message-id="${msg.timestamp}">
                            <i class="fas fa-reply"></i> Balas
                        </button>
                        ${msg.image ? `<button class="action-btn download-action" data-image="${msg.image}" data-filename="${msg.fileName || 'gambar'}">
                            <i class="fas fa-download"></i> Unduh
                        </button>` : ''}
                    </div>
                `;
            }
            
            content = `
                <div class="message-header">
                    <div class="message-user">${msg.userId}</div>
                    <div class="message-time">${timeStr}</div>
                </div>
                <div class="message-content">
                    ${replySection}
                    ${msg.text || ''}
                    ${imageSection}
                    ${actionButtons}
                </div>
            `;
        }
        
        messageDiv.innerHTML = content;
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        // Add event listeners for action buttons
        if (msg.type === 'received') {
            const replyBtn = messageDiv.querySelector('.reply-action');
            if (replyBtn) {
                replyBtn.addEventListener('click', (e) => {
                    const messageId = e.currentTarget.getAttribute('data-message-id');
                    const messageText = msg.text || '[Gambar]';
                    this.setReplyTo(msg.userId, messageText, messageId);
                });
            }
            
            const downloadBtn = messageDiv.querySelector('.download-action');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    const imageUrl = e.currentTarget.getAttribute('data-image');
                    const filename = e.currentTarget.getAttribute('data-filename');
                    this.downloadImageFromUrl(imageUrl, filename);
                });
            }
            
            // Add click event for images
            const imageElement = messageDiv.querySelector('.message-image');
            if (imageElement) {
                imageElement.addEventListener('click', (e) => {
                    const imageUrl = e.currentTarget.getAttribute('data-image');
                    this.openImageModal(imageUrl);
                });
            }
        }
    }
    
    setReplyTo(userId, text, messageId) {
        this.replyingTo = { userId, text, messageId };
        this.replyPreview.querySelector('.reply-text').textContent = `Membalas ${userId}: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
        this.replyPreview.classList.add('active');
        this.messageInput.focus();
    }
    
    cancelReply() {
        this.replyingTo = null;
        this.replyPreview.classList.remove('active');
    }
    
    showReplySelector() {
        // In a real app, this would highlight messages to reply to
        alert('Klik tombol "Balas" pada pesan yang ingin Anda balas');
    }
    
    openImageModal(imageUrl) {
        this.modalImage.src = imageUrl;
        this.imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        this.imageModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.modalImage.src = '';
    }
    
    downloadImage() {
        const imageUrl = this.modalImage.src;
        const filename = `chat-image-${Date.now()}.jpg`;
        this.downloadImageFromUrl(imageUrl, filename);
    }
    
    downloadImageFromUrl(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});
