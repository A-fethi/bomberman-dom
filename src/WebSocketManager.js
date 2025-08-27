// WebSocket Manager for client-side connection handling
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.serverUrl = this.getServerUrl();
        this.messageQueue = [];
        this.isConnecting = false;
        this.connectionStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected'
        this.statusCallbacks = [];
    }

    getServerUrl() {
        // Auto-detect server URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (protocol === 'wss:' ? '443' : '8000');
        return `${protocol}//${host}:${port}`;
    }

    connect() {
        if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.isConnecting = true;
        this.updateConnectionStatus('connecting');

        try {
            this.ws = new WebSocket(this.serverUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('❌ WebSocketManager: Failed to create WebSocket connection:', error);
            this.handleConnectionError();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            this.processMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                switch (message.type) {
                    case 'room_joined':
                        this.handleRoomJoined(message.data);
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({
                                currentScreen: 'waiting',
                                nicknameError: '',
                                chatMessages: message.data.chatHistory || []
                            });
                        });
                        break;
                        
                    case 'player_joined':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            updateGameState({
                                players: [...(gameState.players || []), message.player]
                            });
                        });
                        break;
                        
                    case 'player_left':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            updateGameState({
                                players: (gameState.players || []).filter(p => p.id !== message.playerId)
                            });
                        });
                        break;
                        
                    case 'countdown_update':
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ countdown: message.countdown });
                        });
                        break;
                        
                    case 'countdown_started':
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                gameStatus: 'starting',
                                countdown: message.countdown
                            });
                        });
                        break;
                        
                    case 'countdown_cancelled':
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                gameStatus: 'waiting',
                                countdown: null
                            });
                        });
                        break;
                        
                    case 'waiting_timer_started':
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                waitingTimeLeft: message.waitingTimeLeft
                            });
                        });
                        break;
                        
                    case 'waiting_timer_update':
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                waitingTimeLeft: message.waitingTimeLeft
                            });
                        });
                        break;
                        
                    case 'waiting_timer_stopped':
                        import('./GameApp.js').then(({ updateGameState }) => {
                            updateGameState({ 
                                waitingTimeLeft: null
                            });
                        });
                        break;
                        
                    case 'game_started':
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
                            

                            
                            // Remove explosion after animation duration (1.2 seconds to match CSS)
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
                                    ? { 
                                        ...player, 
                                        lives: message.lives,
                                        isRespawning: true,
                                    }
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
                            

                        });
                        break;

                    case 'powerup_limit_reached':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            // Update player stats (even though power-up wasn't collected, stats are sent)
                            const updatedPlayers = gameState.players.map(player => 
                                player.id === message.playerId 
                                    ? { ...player, ...message.playerStats }
                                    : player
                            );
                            
                            updateGameState({
                                players: updatedPlayers
                            });
                            

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
                            

                        });
                        break;

                    case 'powerup_used':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            // Update player stats for the player who used a powerup
                            const updatedPlayers = gameState.players.map(player => 
                                player.id === message.playerId 
                                    ? { ...player, ...message.playerStats }
                                    : player
                            );
                            updateGameState({
                                players: updatedPlayers
                            });
                        });
                        break;

                    case 'player_blocked':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            const updatedPlayers = gameState.players.map(p =>
                                p.id === message.playerId ? { ...p, movementBlocked: true } : p
                            );
                            updateGameState({ players: updatedPlayers });
                        });
                        break;
                    case 'player_unblocked':
                        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
                            const gameState = getGameState();
                            const updatedPlayers = gameState.players.map(p =>
                                p.id === message.playerId ? { ...p, movementBlocked: false } : p
                            );
                            updateGameState({ players: updatedPlayers });
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
            updateGameState(roomData);
        });
    }

    handlePlayerMoved(message) {
        import('./GameApp.js').then(({ getGameState, updateGameState }) => {
            const gameState = getGameState();
            const updatedPlayers = gameState.players.map(player => 
                player.id === message.playerId 
                    ? { 
                        ...player, 
                        position: message.position, 
                        direction: message.direction,
                        targetPosition: message.position // Set target for animation
                    }
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

    // Client action methods
    sendJoinGame(nickname) {
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

// Create and export singleton instance
export const webSocketManager = new WebSocketManager();

// Auto-connect when module loads
webSocketManager.connect(); 