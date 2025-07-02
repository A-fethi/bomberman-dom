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
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({
                                currentScreen: 'waiting',
                                nicknameError: ''
                            });
                        });
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
                                currentScreen: 'game',
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
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({
                                currentScreen: 'nickname',
                                nicknameError: message.message
                            });
                        });
                        break;
                        
                    case 'explosion':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            const explosions = (gameState.explosions || []);
                            // Update the map: turn affected cells to empty (unless already a power-up)
                            let newMap = gameState.gameMap;
                            if (gameState.gameMap && message.affectedCells) {
                                newMap = gameState.gameMap.map((row, y) =>
                                    row.map((cell, x) => {
                                        if (message.affectedCells.some(c => c.x === x && c.y === y)) {
                                            // If not already a power-up, set to empty
                                            if (cell.type !== 'powerup') {
                                                return { type: 'empty' };
                                            }
                                        }
                                        return cell;
                                    })
                                );
                            }
                            
                            // Add new explosion with auto-cleanup
                            const newExplosion = { 
                                position: message.position, 
                                affectedCells: message.affectedCells, 
                                timestamp: Date.now() 
                            };
                            
                            updateGameState({
                                explosions: [...explosions, newExplosion],
                                gameMap: newMap
                            });
                            
                            console.log(`💥 Added explosion at`, message.position, `Total explosions:`, explosions.length + 1);
                            
                            // Remove explosion after animation duration (1.2 seconds to match CSS)
                            setTimeout(() => {
                                const currentState = getGameState();
                                const updatedExplosions = (currentState.explosions || []).filter(exp => 
                                    exp.timestamp !== newExplosion.timestamp
                                );
                                updateGameState({
                                    explosions: updatedExplosions
                                });
                                console.log(`🧹 Cleaned up explosion at`, message.position, `Remaining explosions:`, updatedExplosions.length);
                            }, 1200);
                        });
                        break;
                        
                    case 'powerup_spawned':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            if (!gameState.gameMap) return;
                            // Overwrite the cell with the power-up
                            const newMap = gameState.gameMap.map((row, y) =>
                                row.map((cell, x) =>
                                    (x === message.position.x && y === message.position.y)
                                        ? { type: 'powerup', power: message.power }
                                        : cell
                                )
                            );
                            updateGameState({ gameMap: newMap });
                        });
                        break;

                    case 'player_damaged':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            const updatedPlayers = gameState.players.map(player => 
                                player.id === message.playerId 
                                    ? { ...player, lives: message.lives }
                                    : player
                            );
                            updateGameState({
                                players: updatedPlayers
                            });
                        });
                        break;
                    case 'player_eliminated':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            const updatedPlayers = gameState.players.map(player => 
                                player.id === message.playerId 
                                    ? { ...player, eliminated: true, lives: 0 }
                                    : player
                            );
                            updateGameState({
                                players: updatedPlayers
                            });
                        });
                        break;

                    case 'powerup_collected':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            // Update player stats
                            const updatedPlayers = gameState.players.map(player => 
                                player.id === message.playerId 
                                    ? { ...player, ...message.playerStats }
                                    : player
                            );
                            
                            // Update map to remove power-up
                            let newMap = gameState.gameMap;
                            if (gameState.gameMap) {
                                newMap = gameState.gameMap.map((row, y) =>
                                    row.map((cell, x) =>
                                        (x === message.position.x && y === message.position.y)
                                            ? { type: 'empty' }
                                            : cell
                                    )
                                );
                            }
                            
                            // Show power-up notification if it's the local player
                            const localPlayer = gameState.players.find(p => p.nickname === gameState.nickname);
                            let powerupNotification = null;
                            if (localPlayer && localPlayer.id === message.playerId) {
                                const powerupEmojis = {
                                    'bomb': '💣',
                                    'flame': '🔥',
                                    'speed': '⚡'
                                };
                                const powerupNames = {
                                    'bomb': 'Bomb Capacity',
                                    'flame': 'Flame Range',
                                    'speed': 'Movement Speed'
                                };
                                powerupNotification = {
                                    emoji: powerupEmojis[message.powerType] || '🎁',
                                    text: `${powerupNames[message.powerType] || message.powerType} +1!`
                                };
                                
                                // Auto-hide notification after 3 seconds
                                setTimeout(() => {
                                    updateGameState({ powerupNotification: null });
                                }, 3000);
                            }
                            
                            updateGameState({
                                players: updatedPlayers,
                                gameMap: newMap,
                                powerupNotification
                            });
                            
                            console.log(`🎁 Power-up collected: ${message.powerType} by player ${message.playerId}`);
                        });
                        break;

                    case 'bomb_removed':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            // Remove bomb from bombs array
                            const updatedBombs = (gameState.bombs || []).filter(bomb => 
                                !(bomb.x === message.position.x && bomb.y === message.position.y)
                            );
                            
                            updateGameState({
                                bombs: updatedBombs
                            });
                            
                            console.log(`💥 Bomb removed at position:`, message.position);
                        });
                        break;

                    case 'game_ended':
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({
                                currentScreen: 'gameOver',
                                gameStatus: 'finished',
                                winner: message.winner,
                                players: message.players
                            });
                            
                            console.log(`🏁 Game ended! Winner:`, message.winner);
                        });
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
                    ? { ...player, position: message.position, direction: message.direction }
                    : player
            );

            updateGameState({
                players: updatedPlayers
            });
        });
    }

    handleBombPlaced(message) {
        // Track bombs in game state for animation
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            const bombs = (gameState.bombs || []);
            updateGameState({
                bombs: [...bombs, { x: message.position.x, y: message.position.y, timestamp: Date.now() }]
            });
        });
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