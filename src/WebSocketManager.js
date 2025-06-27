// Phase 3: WebSocket Manager for client-side connection handling
console.log('🔌 WebSocketManager: Module loading...');
class WebSocketManager {
    constructor() {
        console.log('🔌 WebSocketManager: Constructor called...');
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.serverUrl = this.getServerUrl();
        console.log('🔌 WebSocketManager: Server URL:', this.serverUrl);
        this.messageQueue = [];
        this.isConnecting = false;
        this.connectionStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected'
        this.statusCallbacks = [];
        console.log('✅ WebSocketManager: Constructor completed');
    }

    getServerUrl() {
        // Auto-detect server URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (protocol === 'wss:' ? '443' : '8000');
        return `${protocol}//${host}:${port}`;
    }

    connect() {
        console.log('🔌 WebSocketManager: Connect method called...');
        if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
            console.log('🔌 WebSocketManager: Already connecting or connected, skipping...');
            return;
        }

        this.isConnecting = true;
        this.updateConnectionStatus('connecting');
        console.log('🔌 WebSocketManager: Attempting to connect to:', this.serverUrl);

        try {
            this.ws = new WebSocket(this.serverUrl);
            console.log('🔌 WebSocketManager: WebSocket instance created');
            this.setupEventHandlers();
        } catch (error) {
            console.error('❌ WebSocketManager: Failed to create WebSocket connection:', error);
            this.handleConnectionError();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('🟢 WebSocket connected to server');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            this.processMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 Client: Received message:', message.type, message);
                
                switch (message.type) {
                    case 'room_joined':
                        console.log('📨 Client: Room joined with', message.data.players.length, 'players');
                        this.handleRoomJoined(message.data);
                        break;
                        
                    case 'player_joined':
                        console.log('📨 Client: Player joined:', message.player.nickname);
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            updateGameState({
                                players: [...(gameState.players || []), message.player]
                            });
                        });
                        break;
                        
                    case 'player_left':
                        console.log('📨 Client: Player left:', message.nickname);
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            updateGameState({
                                players: (gameState.players || []).filter(p => p.id !== message.playerId)
                            });
                        });
                        break;
                        
                    case 'countdown_update':
                        console.log('📨 Client: Countdown update:', message.countdown);
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ countdown: message.countdown });
                        });
                        break;
                        
                    case 'countdown_started':
                        console.log('📨 Client: Countdown started:', message.countdown);
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                gameStatus: 'starting',
                                countdown: message.countdown
                            });
                        });
                        break;
                        
                    case 'countdown_cancelled':
                        console.log('📨 Client: Countdown cancelled:', message.message);
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                gameStatus: 'waiting',
                                countdown: null
                            });
                        });
                        break;
                        
                    case 'waiting_timer_started':
                        console.log('📨 Client: Waiting timer started:', message.waitingTimeLeft);
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                waitingTimeLeft: message.waitingTimeLeft
                            });
                        });
                        break;
                        
                    case 'waiting_timer_update':
                        console.log('📨 Client: Waiting timer update:', message.waitingTimeLeft);
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                waitingTimeLeft: message.waitingTimeLeft
                            });
                        });
                        break;
                        
                    case 'waiting_timer_stopped':
                        console.log('📨 Client: Waiting timer stopped');
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                waitingTimeLeft: null
                            });
                        });
                        break;
                        
                    case 'game_started':
                        console.log('📨 Client: Game started');
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                gameStatus: 'playing',
                                gameMap: message.gameMap
                            });
                        });
                        break;
                        
                    case 'player_moved':
                        this.handlePlayerMoved(message);
                        break;
                        
                    case 'bomb_placed':
                        this.handleBombPlaced(message);
                        break;
                        
                    case 'chat_message':
                        console.log('📨 Client: Chat message from:', message.message.player);
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            updateGameState({
                                chatMessages: [...(gameState.chatMessages || []), message.message]
                            });
                        });
                        break;
                        
                    case 'error':
                        console.error('❌ Client: Server error:', message.message);
                        break;
                        
                    default:
                        console.warn('⚠️ Client: Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('❌ Client: Error parsing message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('🔴 WebSocket connection closed:', event.code, event.reason);
            this.isConnecting = false;
            this.updateConnectionStatus('disconnected');
            
            if (!event.wasClean) {
                this.handleConnectionError();
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.handleConnectionError();
        };
    }

    updateConnectionStatus(status) {
        this.connectionStatus = status;
        // Notify any listeners about status change
        this.statusCallbacks.forEach(callback => callback(status));
    }

    onConnectionStatusChange(callback) {
        this.statusCallbacks.push(callback);
        // Immediately call with current status
        callback(this.connectionStatus);
    }

    getConnectionStatus() {
        return this.connectionStatus;
    }

    handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateConnectionStatus('disconnected');
        }
    }

    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for later if not connected
            this.messageQueue.push(message);
            console.log('📤 Message queued, waiting for connection...');
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    handleRoomJoined(roomData) {
        // Import here to avoid circular dependency
        import('./GameApp.js').then(({ updateGameState }) => {
            console.log('🏠 WebSocketManager: Room joined with', roomData.players.length, 'players');
            updateGameState(roomData);
        });
    }

    handlePlayerMoved(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            const updatedPlayers = gameState.players.map(player => 
                player.id === message.playerId 
                    ? { ...player, position: message.position }
                    : player
            );

            updateGameState({
                players: updatedPlayers
            });
        });
    }

    handleBombPlaced(message) {
        // Phase 3: Basic bomb handling (will be enhanced in Phase 5)
        console.log('💣 Bomb placed at:', message.position);
    }

    // Phase 3: Client action methods
    sendJoinGame(nickname) {
        console.log('📤 Client: Sending join_game for nickname:', nickname);
        this.send({
            type: 'join_game',
            nickname
        });
    }

    startGame() {
        this.send({
            type: 'start_game'
        });
    }

    movePlayer(direction) {
        this.send({
            type: 'player_move',
            direction
        });
    }

    placeBomb() {
        this.send({
            type: 'place_bomb'
        });
    }

    sendChatMessage(text) {
        this.send({
            type: 'chat_message',
            text
        });
    }

    leaveGame() {
        this.send({
            type: 'leave_game'
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    getCurrentPlayerId() {
        // Import here to avoid circular dependency
        return new Promise((resolve) => {
            import('./GameApp.js').then(({ getGameState }) => {
                const gameState = getGameState();
                const localPlayer = gameState.players.find(p => p.isLocal);
                resolve(localPlayer?.id);
            });
        });
    }

    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Phase 3: Create and export singleton instance
console.log('🔌 WebSocketManager: Creating singleton instance...');
export const webSocketManager = new WebSocketManager();

// Phase 3: Auto-connect when module loads
console.log('🔌 WebSocketManager: Auto-connecting...');
webSocketManager.connect();
console.log('✅ WebSocketManager: Module initialization completed'); 