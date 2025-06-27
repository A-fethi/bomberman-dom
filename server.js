import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Phase 3: Server configuration
const PORT = process.env.PORT || 8000;
const server = createServer();
const wss = new WebSocketServer({ server });

// Phase 3: Room management for multi-room architecture
const rooms = new Map();
let nextRoomId = 1;

// Phase 3: Game configuration
const GAME_CONFIG = {
    maxPlayers: 4,
    minPlayers: 2,
    countdownDuration: 10, // 10 seconds countdown before game starts
    waitingTimeout: 20, // 20 seconds to wait for more players
    mapSize: { width: 15, height: 13 }
};

// Phase 3: Room class for managing game rooms
class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map(); // playerId -> playerData
        this.gameStatus = 'waiting'; // 'waiting', 'starting', 'playing', 'finished'
        this.countdown = null;
        this.gameMap = null;
        this.winner = null;
        this.createdAt = Date.now();
        
        // Timer management
        this.waitingTimer = null;
        this.countdownTimer = null;
        this.waitingTimerInterval = null;
        this.waitingStartTime = null;
    }

    addPlayer(playerId, playerData) {
        if (this.players.size >= GAME_CONFIG.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        this.players.set(playerId, {
            ...playerData,
            id: playerId,
            joinedAt: Date.now(),
            lives: 3,
            position: this.getSpawnPosition(this.players.size),
            bombs: 1,
            flameRange: 1,
            speed: 1
        });

        // Check and start timers after adding player
        this.checkAndStartTimers();

        return { success: true, player: this.players.get(playerId) };
    }

    removePlayer(playerId) {
        const removed = this.players.delete(playerId);
        
        if (removed) {
            // If we no longer have minimum players, stop timers
            if (this.players.size < GAME_CONFIG.minPlayers) {
                this.stopWaitingTimer();
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                    this.gameStatus = 'waiting';
                    this.countdown = null;
                    
                    // Broadcast that countdown was cancelled
                    this.broadcast({
                        type: 'countdown_cancelled',
                        message: 'Not enough players to start game'
                    });
                }
            }
            
            if (this.players.size === 0) {
                // Delete empty room
                rooms.delete(this.roomId);
            }
        }
        
        return removed;
    }

    getSpawnPosition(playerIndex) {
        // Phase 3: Corner spawn positions for 2-4 players
        const spawnPositions = [
            { x: 1, y: 1 },           // Top-left
            { x: 13, y: 1 },          // Top-right
            { x: 1, y: 11 },          // Bottom-left
            { x: 13, y: 11 }          // Bottom-right
        ];
        return spawnPositions[playerIndex] || spawnPositions[0];
    }

    startWaitingTimer() {
        if (this.waitingTimer) return; // Already started
        
        this.waitingStartTime = Date.now();
        console.log(`⏰ Room ${this.roomId}: Starting waiting timer (${GAME_CONFIG.waitingTimeout}s)`);
        
        // Broadcast timer start to all players
        this.broadcast({
            type: 'waiting_timer_started',
            waitingTimeLeft: GAME_CONFIG.waitingTimeout
        });
        
        // Start real-time timer updates
        this.waitingTimerInterval = setInterval(() => {
            const timeLeft = Math.max(0, GAME_CONFIG.waitingTimeout - Math.floor((Date.now() - this.waitingStartTime) / 1000));
            
            this.broadcast({
                type: 'waiting_timer_update',
                waitingTimeLeft: timeLeft
            });
            
            if (timeLeft <= 0) {
                clearInterval(this.waitingTimerInterval);
                this.waitingTimerInterval = null;
                this.handleWaitingTimeout();
            }
        }, 1000);
        
        this.waitingTimer = setTimeout(() => {
            this.handleWaitingTimeout();
        }, GAME_CONFIG.waitingTimeout * 1000);
    }

    stopWaitingTimer() {
        if (this.waitingTimer) {
            clearTimeout(this.waitingTimer);
            this.waitingTimer = null;
        }
        
        if (this.waitingTimerInterval) {
            clearInterval(this.waitingTimerInterval);
            this.waitingTimerInterval = null;
        }
        
        console.log(`⏰ Room ${this.roomId}: Stopped waiting timer`);
        
        // Broadcast timer stop to all players
        this.broadcast({
            type: 'waiting_timer_stopped'
        });
    }

    handleWaitingTimeout() {
        console.log(`⏰ Room ${this.roomId}: Waiting timeout reached with ${this.players.size} players`);
        
        if (this.players.size >= GAME_CONFIG.minPlayers) {
            // Start the 10-second countdown
            this.startCountdown();
        } else {
            // Not enough players, reset timer
            this.waitingTimer = null;
            this.startWaitingTimer();
        }
    }

    startCountdown() {
        if (this.countdownTimer) return; // Already started
        
        this.gameStatus = 'starting';
        this.countdown = GAME_CONFIG.countdownDuration;
        this.generateMap();
        
        console.log(`🎮 Room ${this.roomId}: Starting countdown (${this.countdown}s)`);
        
        // Broadcast countdown start
        this.broadcast({
            type: 'countdown_started',
            countdown: this.countdown
        });
        
        this.countdownTimer = setInterval(() => {
            this.countdown--;
            
            this.broadcast({
                type: 'countdown_update',
                countdown: this.countdown
            });
            
            if (this.countdown <= 0) {
                this.startGame();
            }
        }, 1000);
    }

    startGame() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        
        this.gameStatus = 'playing';
        console.log(`🎮 Room ${this.roomId}: Game started!`);
        
        this.broadcast({
            type: 'game_started',
            gameMap: this.gameMap
        });
    }

    checkAndStartTimers() {
        // If we have minimum players and no timer is running, start waiting timer
        if (this.players.size >= GAME_CONFIG.minPlayers && !this.waitingTimer && this.gameStatus === 'waiting') {
            this.startWaitingTimer();
        }
        
        // If we have maximum players, stop waiting timer and start countdown immediately
        if (this.players.size >= GAME_CONFIG.maxPlayers && this.waitingTimer) {
            this.stopWaitingTimer();
            this.startCountdown();
        }
    }

    generateMap() {
        // Phase 3: Basic map generation (will be enhanced in Phase 5)
        this.gameMap = this.createBasicMap();
    }

    createBasicMap() {
        const { width, height } = GAME_CONFIG.mapSize;
        const map = [];

        for (let y = 0; y < height; y++) {
            map[y] = [];
            for (let x = 0; x < width; x++) {
                // Border walls
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    map[y][x] = { type: 'wall', destructible: false };
                }
                // Safe spawn areas (corners)
                else if ((x <= 2 && y <= 2) || (x >= width - 3 && y <= 2) ||
                         (x <= 2 && y >= height - 3) || (x >= width - 3 && y >= height - 3)) {
                    map[y][x] = { type: 'empty' };
                }
                // Random destructible blocks (70% chance)
                else if (Math.random() < 0.7) {
                    map[y][x] = { type: 'block', destructible: true };
                }
                else {
                    map[y][x] = { type: 'empty' };
                }
            }
        }

        return map;
    }

    getRoomData() {
        return {
            roomId: this.roomId,
            players: Array.from(this.players.values()).map(player => ({
                id: player.id,
                nickname: player.nickname,
                joinedAt: player.joinedAt,
                lives: player.lives,
                position: player.position,
                bombs: player.bombs,
                flameRange: player.flameRange,
                speed: player.speed
            })),
            gameStatus: this.gameStatus,
            countdown: this.countdown,
            gameMap: this.gameMap,
            winner: this.winner,
            maxPlayers: GAME_CONFIG.maxPlayers,
            minPlayers: GAME_CONFIG.minPlayers
        };
    }

    broadcast(message, excludePlayerId = null) {
        console.log('📤 Server: Broadcasting message to', this.players.size, 'players, excluding:', excludePlayerId);
        this.players.forEach((player, playerId) => {
            if (playerId !== excludePlayerId && player.ws) {
                console.log('📤 Server: Sending to player:', player.nickname, 'message type:', message.type);
                player.ws.send(JSON.stringify(message));
            } else if (playerId === excludePlayerId) {
                console.log('📤 Server: Skipping excluded player:', player.nickname);
            } else if (!player.ws) {
                console.log('❌ Server: Player has no WebSocket:', player.nickname);
            }
        });
    }
}

// Phase 3: Find or create room for player
function findOrCreateRoom() {
    // Find a room with available space
    for (const [roomId, room] of rooms) {
        if (room.players.size < GAME_CONFIG.maxPlayers && room.gameStatus === 'waiting') {
            return room;
        }
    }

    // Create new room if none available
    const newRoom = new GameRoom(nextRoomId++);
    rooms.set(newRoom.roomId, newRoom);
    return newRoom;
}

// Phase 3: WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('🟢 New WebSocket connection:', req.socket.remoteAddress);
    
    let playerId = null;
    let currentRoom = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📨 Received message:', message.type, 'from player:', playerId);

            switch (message.type) {
                case 'join_game':
                    const result = handleJoinGame(ws, message, playerId, currentRoom);
                    if (result) {
                        playerId = result.playerId;
                        currentRoom = result.currentRoom;
                    }
                    break;
                    
                case 'start_game':
                    handleStartGame(ws, message, playerId, currentRoom);
                    break;
                    
                case 'player_move':
                    handlePlayerMove(ws, message, playerId, currentRoom);
                    break;
                    
                case 'place_bomb':
                    handlePlaceBomb(ws, message, playerId, currentRoom);
                    break;
                    
                case 'chat_message':
                    handleChatMessage(ws, message, playerId, currentRoom);
                    break;
                    
                case 'leave_game':
                    handleLeaveGame(ws, message, playerId, currentRoom);
                    break;
                    
                default:
                    console.warn('⚠️ Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('❌ Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        console.log('🔴 Player disconnected:', playerId);
        if (currentRoom && playerId) {
            handlePlayerDisconnect(playerId, currentRoom);
        }
    });

    // Phase 3: Message handlers
    function handleJoinGame(ws, message, playerId, currentRoom) {
        const { nickname } = message;
        
        console.log('🟢 Server: handleJoinGame called for nickname:', nickname);
        
        if (!nickname || nickname.length < 2 || nickname.length > 15) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid nickname'
            }));
            return;
        }

        // Generate unique player ID and update outer scope
        playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('🟢 Server: Generated playerId:', playerId);
        
        // Find or create room and update outer scope
        currentRoom = findOrCreateRoom();
        console.log('🟢 Server: Found/created room:', currentRoom.roomId, 'with', currentRoom.players.size, 'players');
        
        // Add player to room
        const result = currentRoom.addPlayer(playerId, {
            nickname,
            ws
        });

        if (!result.success) {
            console.log('❌ Server: Failed to add player:', result.error);
            ws.send(JSON.stringify({
                type: 'error',
                message: result.error
            }));
            return;
        }

        console.log('✅ Server: Player added successfully. Room now has', currentRoom.players.size, 'players');

        // Send room data to player
        const roomData = currentRoom.getRoomData();
        console.log('📤 Server: Sending room_joined to player with', roomData.players.length, 'players');
        ws.send(JSON.stringify({
            type: 'room_joined',
            data: roomData
        }));

        // Notify other players
        const broadcastMessage = {
            type: 'player_joined',
            player: {
                id: result.player.id,
                nickname: result.player.nickname,
                joinedAt: result.player.joinedAt,
                lives: result.player.lives,
                position: result.player.position,
                bombs: result.player.bombs,
                flameRange: result.player.flameRange,
                speed: result.player.speed
            }
        };
        console.log('📤 Server: Broadcasting player_joined to other players:', broadcastMessage);
        currentRoom.broadcast(broadcastMessage, playerId);

        console.log(`👤 Server: Player ${nickname} joined room ${currentRoom.roomId}`);

        return { playerId, currentRoom };
    }

    function handleStartGame(ws, message, playerId, currentRoom) {
        if (!currentRoom || !playerId) return;

        if (currentRoom.startGame()) {
            // Start countdown
            const countdownInterval = setInterval(() => {
                currentRoom.countdown--;
                
                currentRoom.broadcast({
                    type: 'countdown_update',
                    countdown: currentRoom.countdown
                });

                if (currentRoom.countdown <= 0) {
                    clearInterval(countdownInterval);
                    currentRoom.gameStatus = 'playing';
                    
                    currentRoom.broadcast({
                        type: 'game_started',
                        gameMap: currentRoom.gameMap
                    });
                }
            }, 1000);

            console.log(`🎮 Game started in room ${currentRoom.roomId}`);
        }
    }

    function handlePlayerMove(ws, message, playerId, currentRoom) {
        if (!currentRoom || currentRoom.gameStatus !== 'playing') return;
        
        const { direction } = message;
        const player = currentRoom.players.get(playerId);
        
        if (!player) return;

        // Phase 3: Basic movement (will be enhanced in Phase 5)
        const newPosition = { ...player.position };
        
        switch (direction) {
            case 'up': newPosition.y = Math.max(1, newPosition.y - 1); break;
            case 'down': newPosition.y = Math.min(11, newPosition.y + 1); break;
            case 'left': newPosition.x = Math.max(1, newPosition.x - 1); break;
            case 'right': newPosition.x = Math.min(13, newPosition.x + 1); break;
        }

        // Check if position is valid (not a wall)
        if (currentRoom.gameMap[newPosition.y][newPosition.x].type !== 'wall') {
            player.position = newPosition;
            
            currentRoom.broadcast({
                type: 'player_moved',
                playerId,
                position: newPosition
            }, playerId);
        }
    }

    function handlePlaceBomb(ws, message, playerId, currentRoom) {
        if (!currentRoom || currentRoom.gameStatus !== 'playing') return;
        
        const player = currentRoom.players.get(playerId);
        if (!player) return;

        // Phase 3: Basic bomb placement (will be enhanced in Phase 5)
        currentRoom.broadcast({
            type: 'bomb_placed',
            playerId,
            position: player.position
        });

        console.log(`💣 Bomb placed by ${player.nickname} at`, player.position);
    }

    function handleChatMessage(ws, message, playerId, currentRoom) {
        if (!currentRoom || !playerId) return;
        
        const { text } = message;
        const player = currentRoom.players.get(playerId);
        
        if (!player || !text || text.trim().length === 0) return;

        const chatMessage = {
            id: Date.now(),
            player: player.nickname,
            message: text.trim(),
            timestamp: new Date().toLocaleTimeString()
        };

        currentRoom.broadcast({
            type: 'chat_message',
            message: chatMessage
        });

        console.log(`💬 Chat from ${player.nickname}: ${text}`);
    }

    function handleLeaveGame(ws, message, playerId, currentRoom) {
        handlePlayerDisconnect(playerId, currentRoom);
    }

    function handlePlayerDisconnect(playerId, currentRoom) {
        if (!currentRoom || !playerId) return;

        const player = currentRoom.players.get(playerId);
        if (player) {
            currentRoom.broadcast({
                type: 'player_left',
                playerId,
                nickname: player.nickname
            });

            currentRoom.removePlayer(playerId);
            console.log(`👋 Player ${player.nickname} left room ${currentRoom.roomId}`);
        }
    }
});

// Phase 3: Static file serving
server.on('request', (req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = join(__dirname, filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        
        // Set appropriate content type
        const contentType = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon'
        }[ext] || 'text/plain';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        console.error('Error serving file:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

// Phase 3: Start server
server.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket Server running on ws://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${__dirname}`);
    console.log(`🎮 Bomberman Multiplayer Game - Phase 3 Ready!`);
}); 