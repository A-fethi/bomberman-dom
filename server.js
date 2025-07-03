import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory path for file serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server configuration
const PORT = process.env.PORT || 8000;
const server = createServer();
const wss = new WebSocketServer({ server });

// Room management for multiplayer sessions
const rooms = new Map();
let nextRoomId = 1;

// Game configuration constants
const GAME_CONFIG = {
    maxPlayers: 4,
    minPlayers: 2,
    countdownDuration: 10, // seconds before game starts
    waitingTimeout: 20,    // seconds to wait for players
    mapSize: { width: 15, height: 13 }
};

/**
 * GameRoom class manages all game state for a single room
 */
class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map(); // playerId -> playerData
        this.gameStatus = 'waiting'; // 'waiting', 'starting', 'playing', 'finished'
        this.countdown = null;
        this.gameMap = null;
        this.winner = null;
        this.createdAt = Date.now();

        // Timer references
        this.waitingTimer = null;
        this.countdownTimer = null;
        this.waitingTimerInterval = null;
        this.waitingStartTime = null;
        
        // Chat history for the room
        this.chatHistory = [];
    }

    /**
     * Add a player to the room with initial game state
     */
    addPlayer(playerId, playerData) {
        if (this.players.size >= GAME_CONFIG.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        // Ensure nickname is unique in this room
        for (const player of this.players.values()) {
            if (player.nickname && player.nickname.toLowerCase() === playerData.nickname.toLowerCase()) {
                return { success: false, error: 'Nickname already taken in this room' };
            }
        }

        // Set initial direction based on spawn position
        let initialDirection = 'right';
        const spawnPosition = this.getSpawnPosition(this.players.size);

        // Players on right side should face left
        if ((spawnPosition.x === 13 && spawnPosition.y === 1) || (spawnPosition.x === 13 && spawnPosition.y === 11)) {
            initialDirection = 'left';
        }

        // Initialize player state
        this.players.set(playerId, {
            ...playerData,
            id: playerId,
            joinedAt: Date.now(),
            lives: 3,
            position: spawnPosition,
            bombs: 1,
            flameRange: 1,
            speed: 1,
            direction: initialDirection,
            powerups: { bomb: 0, flame: 0, speed: 0 }, // Track collected powerups
            activeBombs: 0,  // Currently placed bombs
            speedTimeout: null // For speed powerup timer
        });

        // Start game timers if we have enough players
        this.checkAndStartTimers();
        return { success: true, player: this.players.get(playerId) };
    }

    /**
     * Remove player from room and clean up if room becomes empty
     */
    removePlayer(playerId) {
        const removed = this.players.delete(playerId);

        if (removed) {
            // Stop timers if we no longer have minimum players
            if (this.players.size < GAME_CONFIG.minPlayers) {
                this.stopWaitingTimer();
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                    this.gameStatus = 'waiting';
                    this.countdown = null;

                    this.broadcast({
                        type: 'countdown_cancelled',
                        message: 'Not enough players to start game'
                    });
                }
            }

            // Clean up empty rooms
            if (this.players.size === 0) {
                rooms.delete(this.roomId);
            }
        }

        return removed;
    }

    // Get predefined spawn positions based on player count
    getSpawnPosition(playerIndex) {
        const spawnPositions = [
            { x: 1, y: 1 },    // Top-left
            { x: 13, y: 1 },   // Top-right 
            { x: 1, y: 11 },   // Bottom-left
            { x: 13, y: 11 }   // Bottom-right
        ];
        return spawnPositions[playerIndex] || spawnPositions[0];
    }

    // Start timer waiting for more players
    startWaitingTimer() {
        if (this.waitingTimer) return; // Already started

        this.waitingStartTime = Date.now();
        console.log(`⏰ Room ${this.roomId}: Starting waiting timer (${GAME_CONFIG.waitingTimeout}s)`);

        this.broadcast({
            type: 'waiting_timer_started',
            waitingTimeLeft: GAME_CONFIG.waitingTimeout
        });

        // Update timer every second
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

    // Stop the waiting for players timer
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
        this.broadcast({
            type: 'waiting_timer_stopped'
        });
    }

    // Handle when waiting period ends
    handleWaitingTimeout() {
        console.log(`⏰ Room ${this.roomId}: Waiting timeout reached with ${this.players.size} players`);

        if (this.players.size >= GAME_CONFIG.minPlayers) {
            this.startCountdown();
        } else {
            // Not enough players - restart waiting timer
            this.waitingTimer = null;
            this.startWaitingTimer();
        }
    }

    // Start countdown before game begins
    startCountdown() {
        if (this.countdownTimer) return; // Already started

        this.gameStatus = 'starting';
        this.countdown = GAME_CONFIG.countdownDuration;
        this.generateMap();

        console.log(`🎮 Room ${this.roomId}: Starting countdown (${this.countdown}s)`);

        this.broadcast({
            type: 'countdown_started',
            countdown: this.countdown
        });

        // Update countdown every second
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

    // Start the actual game
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

    // Manage game timers based on player count
    checkAndStartTimers() {
        // Start waiting timer if we have minimum players
        if (this.players.size >= GAME_CONFIG.minPlayers && !this.waitingTimer && this.gameStatus === 'waiting') {
            this.startWaitingTimer();
        }

        // Skip waiting if room is full
        if (this.players.size >= GAME_CONFIG.maxPlayers && this.waitingTimer) {
            this.stopWaitingTimer();
            this.startCountdown();
        }
    }

    // Generate the game map with walls and destructible blocks
    generateMap() {
        this.gameMap = this.createBasicMap();
    }

    // Create the initial game map layout
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

    // Get current room state for clients
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
                speed: player.speed,
                direction: player.direction
            })),
            gameStatus: this.gameStatus,
            countdown: this.countdown,
            gameMap: this.gameMap,
            winner: this.winner,
            maxPlayers: GAME_CONFIG.maxPlayers,
            minPlayers: GAME_CONFIG.minPlayers,
            chatHistory: this.chatHistory
        };
    }

    // Check if game should end (only one player left)
    checkGameEnd() {
        if (this.gameStatus !== 'playing') return;

        const activePlayers = Array.from(this.players.values()).filter(p => !p.eliminated);

        if (activePlayers.length <= 1) {
            this.gameStatus = 'finished';

            if (activePlayers.length === 1) {
                this.winner = activePlayers[0].nickname;
                console.log(`🏆 Game ended! Winner: ${this.winner}`);
            } else {
                this.winner = null;
                console.log(`🏁 Game ended! No winner - all players eliminated`);
            }

            this.broadcast({
                type: 'game_ended',
                winner: this.winner,
                players: Array.from(this.players.values()).map(player => ({
                    id: player.id,
                    nickname: player.nickname,
                    lives: player.lives,
                    eliminated: player.eliminated
                }))
            });
        }
    }

    // Send message to all players in room
    broadcast(message, excludePlayerId = null) {
        console.log('📤 Server: Broadcasting message to', this.players.size, 'players, excluding:', excludePlayerId);
        this.players.forEach((player, playerId) => {
            if (playerId !== excludePlayerId && player.ws) {
                console.log('📤 Server: Sending to player:', player.nickname, 'message type:', message.type);
                player.ws.send(JSON.stringify(message));
            } else if (playerId === excludePlayerId) {
                if (message.type !== 'player_moved' && message.type !== 'bomb_placed') {
                    console.log('📤 Server: Skipping excluded player:', player.nickname);
                } else {
                    console.log('📤 Server: Player moved or bomb placed, sending to all players:', player.nickname);
                    player.ws.send(JSON.stringify(message));
                }
            } else if (!player.ws) {
                console.log('❌ Server: Player has no WebSocket:', player.nickname);
            }
        });
    }
}

// Find available room or create new one
function findOrCreateRoom() {
    // Find room with available slots
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

// Handle WebSocket connections
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

    // Handle player joining game
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

        // Generate unique player ID
        playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('🟢 Server: Generated playerId:', playerId);

        // Find or create room
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

        // Send room data to joining player
        const roomData = currentRoom.getRoomData();
        console.log('📤 Server: Sending room_joined to player with', roomData.players.length, 'players');
        ws.send(JSON.stringify({
            type: 'room_joined',
            data: roomData
        }));

        // Notify other players about new player
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
                speed: result.player.speed,
                direction: result.player.direction
            }
        };
        console.log('📤 Server: Broadcasting player_joined to other players:', broadcastMessage);
        currentRoom.broadcast(broadcastMessage, playerId);

        console.log(`👤 Server: Player ${nickname} joined room ${currentRoom.roomId}`);

        return { playerId, currentRoom };
    }

    // Handle game start request
    function handleStartGame(ws, message, playerId, currentRoom) {
        if (!currentRoom || !playerId) return;

        if (currentRoom.startGame()) {
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

    // Handle player movement
    function handlePlayerMove(ws, message, playerId, currentRoom) {
        if (!currentRoom || currentRoom.gameStatus !== 'playing') return;
        console.log(message);

        const player = currentRoom.players.get(playerId);
        if (!player || player.eliminated) return;
        console.log(`🕹️ Player ${playerId} requested move:`, message.direction);

        const { direction } = message;
        const newPosition = { ...player.position };

        // Update position based on direction
        switch (direction) {
            case 'up':
                newPosition.y = Math.max(1, newPosition.y - 1);
                break;
            case 'down':
                newPosition.y = Math.min(11, newPosition.y + 1);
                break;
            case 'left':
                newPosition.x = Math.max(1, newPosition.x - 1);
                player.direction = 'left';
                break;
            case 'right':
                newPosition.x = Math.min(13, newPosition.x + 1);
                player.direction = 'right';
                break;
            default:
                console.log('Invalid direction:', direction);
                return;
        }

        // Validate new position
        if (!isValidPosition(newPosition, currentRoom.gameMap)) {
            console.log(`🚫 ${player.nickname}: Invalid move to (${newPosition.x},${newPosition.y})`);
            return;
        }

        // Check if position is occupied by another player
        const isOccupied = Array.from(currentRoom.players.values()).some(
            p => p.id !== playerId && !p.eliminated && p.position.x === newPosition.x && p.position.y === newPosition.y
        );
        if (isOccupied) {
            return;
        }

        // Check for powerup collection
        const cell = currentRoom.gameMap[newPosition.y][newPosition.x];
        if (cell.type === 'powerup') {
            const powerType = cell.power;
            switch (powerType) {
                case 'bomb':
                    if (!player.powerups) player.powerups = { bomb: 0, flame: 0, speed: 0 };
                    player.powerups.bomb = (player.powerups.bomb || 0) + 1;
                    if (player.powerups.bomb === 1) {
                        player.bombs = Math.min(player.bombs + 1, 5);
                    }
                    console.log(`💣 ${player.nickname} collected bomb power-up. Bombs: ${player.bombs}, Uses: ${player.powerups.bomb}`);
                    break;
                case 'flame':
                    if (!player.powerups) player.powerups = { bomb: 0, flame: 0, speed: 0 };
                    player.powerups.flame = (player.powerups.flame || 0) + 1;
                    if (player.powerups.flame === 1) {
                        player.flameRange = Math.min(player.flameRange + 1, 5);
                    }
                    console.log(`🔥 ${player.nickname} collected flame power-up. Range: ${player.flameRange}, Uses: ${player.powerups.flame}`);
                    break;
                case 'speed':
                    player.speed = Math.min(player.speed + 0.5, 3);
                    console.log(`⚡ ${player.nickname} collected speed power-up. Speed: ${player.speed}`);
                    break;
            }

            // Remove collected powerup
            currentRoom.gameMap[newPosition.y][newPosition.x] = { type: 'empty' };

            // Notify players about powerup collection
            currentRoom.broadcast({
                type: 'powerup_collected',
                playerId,
                position: newPosition,
                powerType,
                playerStats: {
                    bombs: player.bombs,
                    flameRange: player.flameRange,
                    speed: player.speed,
                    powerups: player.powerups
                }
            });

            console.log(`🎁 ${player.nickname} collected ${powerType} power-up at`, newPosition);
        }

        // Update player position
        player.position = newPosition;

        // Broadcast movement to all players
        currentRoom.broadcast({
            type: 'player_moved',
            playerId,
            position: newPosition,
            direction: player.direction
        }, playerId);
    }

    // Check if position is valid (not blocked)
    function isValidPosition(position, gameMap) {
        if (position.x < 0 || position.x >= gameMap[0].length || position.y < 0 || position.y >= gameMap.length) {
            return false;
        }
        const cell = gameMap[position.y][position.x];
        return cell.type !== 'wall' && cell.type !== 'block';
    }

    // Check if path between positions is clear
    function isPathValid(startPos, endPos, gameMap) {
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;

        const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

        let currentX = startPos.x;
        let currentY = startPos.y;

        while (currentX !== endPos.x || currentY !== endPos.y) {
            if (currentX !== endPos.x) currentX += stepX;
            if (currentY !== endPos.y) currentY += stepY;

            if (!isValidPosition({ x: currentX, y: currentY }, gameMap)) {
                return false;
            }
        }

        return true;
    }

    // Handle bomb placement
    function handlePlaceBomb(ws, message, playerId, currentRoom) {
        if (!currentRoom || currentRoom.gameStatus !== 'playing') return;

        const player = currentRoom.players.get(playerId);
        if (!player || player.eliminated) return;

        // Check bomb limit
        const maxBombs = 1 + (player.powerups && player.powerups.bomb ? player.powerups.bomb : 0);
        if (player.activeBombs >= maxBombs) {
            return;
        }
        player.activeBombs++;

        // Handle bomb powerup usage
        if (player.bombs > 1 && player.powerups && player.powerups.bomb > 0) {
            player.powerups.bomb--;
            if (player.powerups.bomb === 0) {
                player.bombs = 1;
            }
            currentRoom.broadcast({
                type: 'powerup_used',
                playerId,
                playerStats: {
                    bombs: player.bombs,
                    flameRange: player.flameRange,
                    speed: player.speed,
                    powerups: player.powerups
                }
            });
        }

        const bombPosition = { x: player.position.x, y: player.position.y };

        // Notify players about bomb placement
        currentRoom.broadcast({
            type: 'bomb_placed',
            playerId,
            position: bombPosition
        });

        console.log(`💣 Bomb placed by ${player.nickname} at`, bombPosition);

        // Bomb explosion after 2 seconds
        setTimeout(() => {
            const explosionRange = player.flameRange || 1;
            const directions = [
                { dx: 0, dy: 0 }, // center
                { dx: 1, dy: 0 }, // right
                { dx: -1, dy: 0 }, // left
                { dx: 0, dy: 1 }, // down
                { dx: 0, dy: -1 } // up
            ];
            let affectedCells = [];
            
            // Calculate explosion pattern
            directions.forEach(dir => {
                for (let i = 0; i <= explosionRange; i++) {
                    const x = bombPosition.x + dir.dx * i;
                    const y = bombPosition.y + dir.dy * i;
                    if (x < 0 || y < 0 || y >= currentRoom.gameMap.length || x >= currentRoom.gameMap[0].length) break;
                    const cell = currentRoom.gameMap[y][x];
                    if (cell.type === 'wall') break;
                    affectedCells.push({ x, y });
                    if (cell.type === 'block') {
                        // Destroy block
                        currentRoom.gameMap[y][x] = { type: 'empty' };
                        // Random chance to spawn powerup
                        if (Math.random() < 0.3) {
                            const powerTypes = ['bomb', 'flame', 'speed'];
                            const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
                            currentRoom.gameMap[y][x] = { type: 'powerup', power: powerType };
                            currentRoom.broadcast({
                                type: 'powerup_spawned',
                                position: { x, y },
                                power: powerType
                            });
                        }
                        break;
                    }
                }
            });

            // Damage players in explosion radius
            let damagedPlayers = [];
            currentRoom.players.forEach((p, pid) => {
                if (affectedCells.some(cell => cell.x === p.position.x && cell.y === p.position.y)) {
                    p.lives = Math.max(0, (p.lives || 1) - 1);
                    if (p.lives === 0) {
                        p.eliminated = true;
                        currentRoom.broadcast({
                            type: 'player_eliminated',
                            playerId: pid,
                            nickname: p.nickname
                        });
                    } else {
                        damagedPlayers.push({ id: pid, lives: p.lives, nickname: p.nickname });
                        // Respawn player
                        const playerIndex = Array.from(currentRoom.players.keys()).indexOf(pid);
                        const spawnPos = currentRoom.getSpawnPosition(playerIndex);
                        p.position = { ...spawnPos };
                        currentRoom.broadcast({
                            type: 'player_moved',
                            playerId: pid,
                            position: p.position,
                            direction: p.direction
                        });
                    }
                }
            });

            // Check for game end
            currentRoom.checkGameEnd();

            // Broadcast explosion
            currentRoom.broadcast({
                type: 'explosion',
                position: bombPosition,
                affectedCells
            });

            // Notify about damaged players
            damagedPlayers.forEach(dp => {
                currentRoom.broadcast({
                    type: 'player_damaged',
                    playerId: dp.id,
                    lives: dp.lives,
                    nickname: dp.nickname
                });
            });

            // Remove bomb after explosion
            currentRoom.broadcast({
                type: 'bomb_removed',
                position: bombPosition
            });
            if (player.activeBombs > 0) player.activeBombs--;

            console.log(`💥 Bomb exploded and removed at`, bombPosition);

            // Handle flame powerup usage
            if (player.flameRange > 1 && player.powerups && player.powerups.flame > 0) {
                player.powerups.flame--;
                if (player.powerups.flame === 0) {
                    player.flameRange = 1;
                }
                currentRoom.broadcast({
                    type: 'powerup_used',
                    playerId,
                    playerStats: {
                        bombs: player.bombs,
                        flameRange: player.flameRange,
                        speed: player.speed,
                        powerups: player.powerups
                    }
                });
            }
        }, 2000);
    }

    // Handle chat messages
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

        // Add to chat history (limit to 50 messages)
        currentRoom.chatHistory.push(chatMessage);
        if (currentRoom.chatHistory.length > 50) {
            currentRoom.chatHistory = currentRoom.chatHistory.slice(-50);
        }

        // Broadcast to other players
        currentRoom.broadcast({
            type: 'chat_message',
            message: chatMessage
        }, playerId);

        console.log(`💬 Chat from ${player.nickname}: ${text}`);
    }

    // Handle player leaving game
    function handleLeaveGame(ws, message, playerId, currentRoom) {
        handlePlayerDisconnect(playerId, currentRoom);
    }

    // Handle player disconnection
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

// Serve static files
server.on('request', (req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = join(__dirname, filePath);

    // Prevent directory traversal
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

        // Set content type based on file extension
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

// Start the server
server.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket Server running on ws://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${__dirname}`);
    console.log(`🎮 Bomberman Multiplayer Game - Phase 3 Ready!`);
});