// ========== GAME TABLE MANAGER - MAIN APPLICATION ========== //

// ========== DATA MANAGEMENT ========== //
class GameTableManager {
    constructor() {
        this.rooms = this.loadRooms();
        this.currentUser = null;
        this.currentRoomId = null;
        this.gameTypes = {
            poker: '🎰 Poker',
            blackjack: '🃏 Blackjack',
            chess: '♟️ Chess',
            trivia: '🧠 Trivia',
            custom: '🎮 Custom Game'
        };
        this.init();
    }

    // Initialize application
    init() {
        this.setupEventListeners();
        this.renderRooms();
    }

    // ========== LOCAL STORAGE ========== //
    loadRooms() {
        const stored = localStorage.getItem('gameRooms');
        return stored ? JSON.parse(stored) : {};
    }

    saveRooms() {
        localStorage.setItem('gameRooms', JSON.stringify(this.rooms));
    }

    // ========== ROOM MANAGEMENT ========== //
    createRoom(name, gameType, maxPlayers) {
        if (!name.trim() || !gameType) {
            this.showToast('Please fill in all fields', 'error');
            return false;
        }

        const roomId = 'room_' + Date.now();
        this.rooms[roomId] = {
            id: roomId,
            name: name.trim(),
            gameType: gameType,
            maxPlayers: parseInt(maxPlayers),
            players: [],
            status: 'waiting', // waiting, ready, playing
            admin: null,
            createdAt: new Date().toISOString()
        };

        this.saveRooms();
        this.renderRooms();
        this.showToast(`Room "${name}" created successfully!`, 'success');
        this.clearRoomForm();
        return true;
    }

    deleteRoom(roomId) {
        if (!this.rooms[roomId]) return false;

        const roomName = this.rooms[roomId].name;
        delete this.rooms[roomId];
        this.saveRooms();

        if (this.currentRoomId === roomId) {
            this.closeModal();
        }

        this.renderRooms();
        this.showToast(`Room "${roomName}" deleted successfully!`, 'success');
        return true;
    }

    // ========== PLAYER MANAGEMENT ========== //
    joinRoom(roomId, playerName) {
        const room = this.rooms[roomId];
        if (!room) {
            this.showToast('Room not found', 'error');
            return false;
        }

        if (room.players.length >= room.maxPlayers) {
            this.showToast('Room is full!', 'error');
            return false;
        }

        if (!playerName.trim()) {
            this.showToast('Please enter your name', 'error');
            return false;
        }

        // Check if player already in room
        if (room.players.some(p => p.id === playerName)) {
            this.showToast('You are already in this room', 'error');
            return false;
        }

        // Set admin if first player
        if (room.players.length === 0) {
            room.admin = playerName;
        }

        const player = {
            id: playerName,
            name: playerName.trim(),
            ready: false,
            joinedAt: new Date().toISOString()
        };

        room.players.push(player);
        this.currentUser = playerName;
        this.currentRoomId = roomId;

        this.saveRooms();
        this.updateRoomModal(roomId);
        this.showToast(`Welcome to ${room.name}, ${playerName}!`, 'success');
        return true;
    }

    leaveRoom(roomId, playerName) {
        const room = this.rooms[roomId];
        if (!room) return false;

        const playerIndex = room.players.findIndex(p => p.id === playerName);
        if (playerIndex === -1) return false;

        room.players.splice(playerIndex, 1);

        // Transfer admin if needed
        if (room.admin === playerName) {
            room.admin = room.players.length > 0 ? room.players[0].id : null;
            if (room.admin && room.players.length > 0) {
                this.showToast(`${room.players[0].name} is now the room admin`, 'success');
            }
        }

        // Delete empty rooms
        if (room.players.length === 0) {
            delete this.rooms[roomId];
        }

        this.currentUser = null;
        this.currentRoomId = null;

        this.saveRooms();
        this.renderRooms();
        this.closeModal();
        this.showToast('You left the room', 'success');
        return true;
    }

    togglePlayerReady(roomId, playerName) {
        const room = this.rooms[roomId];
        if (!room) return false;

        const player = room.players.find(p => p.id === playerName);
        if (!player) return false;

        player.ready = !player.ready;
        this.updateRoomStatus(roomId);
        this.saveRooms();
        this.updateRoomModal(roomId);
        return true;
    }

    // ========== GAME STATUS ========== //
    updateRoomStatus(roomId) {
        const room = this.rooms[roomId];
        if (!room || room.players.length === 0) return;

        const allReady = room.players.every(p => p.ready);
        if (allReady && room.players.length > 1) {
            room.status = 'ready';
        } else {
            room.status = 'waiting';
        }
    }

    startGame(roomId) {
        const room = this.rooms[roomId];
        if (!room) return false;

        if (room.admin !== this.currentUser) {
            this.showToast('Only the admin can start the game', 'error');
            return false;
        }

        const allReady = room.players.every(p => p.ready);
        if (!allReady) {
            this.showToast('All players must be ready to start the game', 'error');
            return false;
        }

        if (room.players.length < 2) {
            this.showToast('Need at least 2 players to start', 'error');
            return false;
        }

        room.status = 'playing';
        this.saveRooms();
        this.updateRoomModal(roomId);
        this.showToast(`Game started! Playing ${this.gameTypes[room.gameType]}`, 'success');
        return true;
    }

    // ========== UI RENDERING ========== //
    renderRooms() {
        const container = document.getElementById('roomsContainer');
        const rooms = Object.values(this.rooms);

        if (rooms.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No rooms available. Create one to get started!</p></div>';
            return;
        }

        container.innerHTML = rooms.map(room => `
            <div class="room-card ${room.players.length >= room.maxPlayers ? 'full' : ''}" onclick="manager.openModal('${room.id}')">
                <div class="room-card-header">
                    <div class="room-name">${this.escapeHtml(room.name)}</div>
                    <div class="game-type-badge">${this.gameTypes[room.gameType]}</div>
                </div>
                
                <div class="room-stats">
                    <div class="stat">
                        <span>👥</span>
                        <span><span class="stat-value">${room.players.length}</span>/${room.maxPlayers}</span>
                    </div>
                    <div class="stat">
                        <span>⏱️</span>
                        <span><span class="stat-value">${this.getTimeAgo(room.createdAt)}</span></span>
                    </div>
                </div>

                <div class="room-footer">
                    <span class="status-badge badge-${room.status}">${this.capitalize(room.status)}</span>
                    <span style="font-size: 0.9rem; color: var(--text-secondary);">
                        ${room.players.length >= room.maxPlayers ? '🔒 Full' : '🔓 Open'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    openModal(roomId) {
        const modal = document.getElementById('roomModal');
        modal.classList.add('active');
        this.currentRoomId = roomId;
        this.updateRoomModal(roomId);
    }

    closeModal() {
        const modal = document.getElementById('roomModal');
        modal.classList.remove('active');
        this.currentRoomId = null;
        this.clearPlayerNameInput();
    }

    updateRoomModal(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;

        // Update room info
        document.getElementById('modalRoomTitle').textContent = this.escapeHtml(room.name);
        document.getElementById('modalGameType').textContent = this.gameTypes[room.gameType];
        document.getElementById('modalPlayerCount').textContent = `${room.players.length}/${room.maxPlayers}`;
        document.getElementById('modalRoomStatus').textContent = this.capitalize(room.status);
        document.getElementById('modalRoomStatus').className = `badge badge-${room.status}`;

        // Update players list
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = room.players.map(player => `
            <div class="player-item">
                <div class="player-info">
                    <span class="player-name">${this.escapeHtml(player.name)}</span>
                    ${room.admin === player.id ? '<span class="player-badge admin-badge-small">👑 Admin</span>' : ''}
                    <span class="player-badge ${player.ready ? 'ready-badge' : 'not-ready-badge'}">
                        ${player.ready ? '✅ Ready' : '⏳ Not Ready'}
                    </span>
                </div>
            </div>
        `).join('');

        // Show/hide user input
        const isJoined = room.players.some(p => p.id === this.currentUser);
        const userSection = document.querySelector('.user-section');
        const playerActionsContainer = document.getElementById('playerActionsContainer');
        const adminActionsContainer = document.getElementById('adminActionsContainer');
        const joinBtn = document.getElementById('joinRoomBtn');

        if (isJoined) {
            userSection.style.display = 'none';
            playerActionsContainer.style.display = 'flex';

            const isReady = room.players.find(p => p.id === this.currentUser)?.ready || false;
            document.getElementById('readyBtn').style.display = isReady ? 'none' : 'block';
            document.getElementById('notReadyBtn').style.display = isReady ? 'block' : 'none';
        } else {
            userSection.style.display = 'flex';
            playerActionsContainer.style.display = 'none';
            joinBtn.disabled = room.players.length >= room.maxPlayers;
        }

        // Show/hide admin actions
        if (isJoined && room.admin === this.currentUser) {
            adminActionsContainer.style.display = 'flex';
            const startBtn = document.getElementById('startGameBtn');
            const allReady = room.players.every(p => p.ready);
            startBtn.disabled = !allReady || room.players.length < 2;
        } else {
            adminActionsContainer.style.display = 'none';
        }
    }

    // ========== EVENT LISTENERS ========== //
    setupEventListeners() {
        // Create Room
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            const name = document.getElementById('roomNameInput').value;
            const gameType = document.getElementById('gameTypeSelect').value;
            const maxPlayers = document.getElementById('maxPlayersInput').value;
            this.createRoom(name, gameType, maxPlayers);
        });

        // Enter key for room creation
        document.getElementById('roomNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('createRoomBtn').click();
        });

        // Modal Controls
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('roomModal').addEventListener('click', (e) => {
            if (e.target.id === 'roomModal') this.closeModal();
        });

        // Join Room
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            const playerName = document.getElementById('playerNameInput').value;
            this.joinRoom(this.currentRoomId, playerName);
        });

        document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('joinRoomBtn').click();
        });

        // Player Actions
        document.getElementById('readyBtn').addEventListener('click', () => {
            this.togglePlayerReady(this.currentRoomId, this.currentUser);
            this.showToast('You marked yourself as ready!', 'success');
        });

        document.getElementById('notReadyBtn').addEventListener('click', () => {
            this.togglePlayerReady(this.currentRoomId, this.currentUser);
            this.showToast('You marked yourself as not ready', 'success');
        });

        document.getElementById('leaveRoomBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to leave this room?')) {
                this.leaveRoom(this.currentRoomId, this.currentUser);
            }
        });

        // Admin Actions
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame(this.currentRoomId);
        });

        document.getElementById('deleteRoomBtn').addEventListener('click', () => {
            const roomName = this.rooms[this.currentRoomId].name;
            if (confirm(`Are you sure you want to delete "${roomName}"?`)) {
                this.deleteRoom(this.currentRoomId);
            }
        });
    }

    // ========== UTILITY FUNCTIONS ========== //
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    clearRoomForm() {
        document.getElementById('roomNameInput').value = '';
        document.getElementById('gameTypeSelect').value = '';
        document.getElementById('maxPlayersInput').value = '4';
    }

    clearPlayerNameInput() {
        document.getElementById('playerNameInput').value = '';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const created = new Date(timestamp);
        const diff = Math.floor((now - created) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========== INITIALIZE APPLICATION ========== //
const manager = new GameTableManager();
