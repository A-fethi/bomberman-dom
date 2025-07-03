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
        this.connectionStatus = 'disconnected';
        this.statusCallbacks = [];
        console.log('✅ WebSocketManager: Constructor completed');
    }

    getServerUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (protocol === 'wss:' ? '443' : '8000');
        return `${protocol}//${host}:${port}`;
    }

    connect() {
        if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
            console.log('🔌 WebSocketManager: Already connecting or connected');
            return;
        }

        this.isConnecting = true;
        this.updateConnectionStatus('connecting');
        console.log('🔌 WebSocketManager: Connecting to:', this.serverUrl);

        try {
            this.ws = new WebSocket(this.serverUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('❌ WebSocketManager: Connection failed:', error);
            this.handleConnectionError();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('🟢 WebSocket connected');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            this.processMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 Client: Received message:', message.type);
                
                switch (message.type) {
                    case 'room_joined':
                        this.handleRoomJoined(message.data);
                        break;
                    case 'player_joined':
                        this.handlePlayerJoined(message);
                        break;
                    case 'player_left':
                        this.handlePlayerLeft(message);
                        break;
                    case 'countdown_update':
                        this.handleCountdownUpdate(message);
                        break;
                    case 'countdown_started':
                        this.handleCountdownStarted(message);
                        break;
                    case 'countdown_cancelled':
                        this.handleCountdownCancelled(message);
                        break;
                    case 'waiting_timer_started':
                        this.handleWaitingTimerStarted(message);
                        break;
                    case 'waiting_timer_update':
                        this.handleWaitingTimerUpdate(message);
                        break;
                    case 'waiting_timer_stopped':
                        this.handleWaitingTimerStopped(message);
                        break;
                    case 'game_started':
                        this.handleGameStarted(message);
                        break;
                    case 'player_moved':
                        this.handlePlayerMoved(message);
                        break;
                    case 'bomb_placed':
                        this.handleBombPlaced(message);
                        break;
                    case 'chat_message':
                        this.handleChatMessage(message);
                        break;
                    case 'error':
                        this.handleErrorMessage(message);
                        break;
                    case 'explosion':
                        this.handleExplosion(message);
                        break;
                    case 'powerup_spawned':
                        this.handlePowerupSpawned(message);
                        break;
                    case 'player_damaged':
                        this.handlePlayerDamaged(message);
                        break;
                    case 'player_eliminated':
                        this.handlePlayerEliminated(message);
                        break;
                    case 'powerup_collected':
                        this.handlePowerupCollected(message);
                        break;
                    case 'bomb_removed':
                        this.handleBombRemoved(message);
                        break;
                    case 'game_ended':
                        this.handleGameEnded(message);
                        break;
                    case 'powerup_used':
                        this.handlePowerupUsed(message);
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
        this.statusCallbacks.forEach(callback => callback(status));
    }

    handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;
            console.log(`🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateConnectionStatus('disconnected');
        }
    }

    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
            console.log('📤 Message queued, waiting for connection');
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    handleRoomJoined(data) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({
                currentScreen: 'waiting',
                nicknameError: '',
                chatMessages: data.chatHistory || [],
                ...data
            });
        });
    }

    handlePlayerJoined(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            updateGameState({
                players: [...(gameState.players || []), message.player]
            });
        });
    }

    handlePlayerLeft(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            updateGameState({
                players: (gameState.players || []).filter(p => p.id !== message.playerId)
            });
        });
    }

    handleCountdownUpdate(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({ countdown: message.countdown });
        });
    }

    handleCountdownStarted(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({ 
                gameStatus: 'starting',
                countdown: message.countdown
            });
        });
    }

    handleCountdownCancelled(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({ 
                gameStatus: 'waiting',
                countdown: null
            });
        });
    }

    handleWaitingTimerStarted(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({ 
                waitingTimeLeft: message.waitingTimeLeft
            });
        });
    }

    handleWaitingTimerUpdate(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({ 
                waitingTimeLeft: message.waitingTimeLeft
            });
        });
    }

    handleWaitingTimerStopped() {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({ 
                waitingTimeLeft: null
            });
        });
    }

    handleGameStarted(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({ 
                currentScreen: 'game',
                gameStatus: 'playing',
                gameMap: message.gameMap
            });
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
            updateGameState({ players: updatedPlayers });
        });
    }

    handleBombPlaced(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            updateGameState({
                bombs: [...(gameState.bombs || []), { 
                    x: message.position.x, 
                    y: message.position.y, 
                    timestamp: Date.now() 
                }]
            });
        });
    }

    handleChatMessage(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            updateGameState({
                chatMessages: [...(gameState.chatMessages || []), message.message]
            });
        });
    }

    handleErrorMessage(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({
                currentScreen: 'nickname',
                nicknameError: message.message
            });
        });
    }

    handleExplosion(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            let newMap = gameState.gameMap;
            if (gameState.gameMap && message.affectedCells) {
                newMap = gameState.gameMap.map((row, y) =>
                    row.map((cell, x) => {
                        if (message.affectedCells.some(c => c.x === x && c.y === y)) {
                            if (cell.type !== 'powerup') {
                                return { type: 'empty' };
                            }
                        }
                        return cell;
                    })
                );
            }
            const newExplosion = { 
                position: message.position, 
                affectedCells: message.affectedCells, 
                timestamp: Date.now() 
            };
            updateGameState({
                explosions: [...(gameState.explosions || []), newExplosion],
                gameMap: newMap
            });
            setTimeout(() => {
                const currentState = getGameState();
                const updatedExplosions = (currentState.explosions || []).filter(exp => 
                    exp.timestamp !== newExplosion.timestamp
                );
                updateGameState({
                    explosions: updatedExplosions
                });
            }, 1200);
        });
    }

    handlePowerupSpawned(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            if (!gameState.gameMap) return;
            const newMap = gameState.gameMap.map((row, y) =>
                row.map((cell, x) =>
                    (x === message.position.x && y === message.position.y)
                        ? { type: 'powerup', power: message.power }
                        : cell
                )
            );
            updateGameState({ gameMap: newMap });
        });
    }

    handlePlayerDamaged(message) {
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
    }

    handlePlayerEliminated(message) {
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
    }

    handlePowerupCollected(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            const updatedPlayers = gameState.players.map(player => 
                player.id === message.playerId 
                    ? { ...player, ...message.playerStats }
                    : player
            );
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
                setTimeout(() => {
                    updateGameState({ powerupNotification: null });
                }, 3000);
            }
            updateGameState({
                players: updatedPlayers,
                gameMap: newMap,
                powerupNotification
            });
        });
    }

    handleBombRemoved(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            const updatedBombs = (gameState.bombs || []).filter(bomb => 
                !(bomb.x === message.position.x && bomb.y === message.position.y)
            );
            updateGameState({
                bombs: updatedBombs
            });
        });
    }

    handleGameEnded(message) {
        import('./GameApp.js').then(({ updateGameState }) => {
            updateGameState({
                currentScreen: 'gameOver',
                gameStatus: 'finished',
                winner: message.winner,
                players: message.players
            });
        });
    }

    handlePowerupUsed(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            const updatedPlayers = gameState.players.map(player => 
                player.id === message.playerId 
                    ? { ...player, ...message.playerStats }
                    : player
            );
            updateGameState({
                players: updatedPlayers
            });
        });
    }

    // Public API
    onConnectionStatusChange(callback) {
        this.statusCallbacks.push(callback);
        callback(this.connectionStatus);
    }

    getConnectionStatus() {
        return this.connectionStatus;
    }

    sendJoinGame(nickname) {
        this.send({ type: 'join_game', nickname });
    }

    startGame() {
        this.send({ type: 'start_game' });
    }

    movePlayer(direction) {
        this.send({ type: 'player_move', direction });
    }

    placeBomb() {
        this.send({ type: 'place_bomb' });
    }

    sendChatMessage(text) {
        this.send({ type: 'chat_message', text });
    }

    leaveGame() {
        this.send({ type: 'leave_game' });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const webSocketManager = new WebSocketManager();
webSocketManager.connect();
console.log('✅ WebSocketManager: Module initialization completed');