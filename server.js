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
        // Enforce unique nickname in the room
        for (const player of this.players.values()) {
            if (player.nickname && player.nickname.toLowerCase() === playerData.nickname.toLowerCase()) {
                return { success: false, error: 'Nickname already taken in this room' };
            }
        }
        let initialDirection = 'right'
        const spawnPosition = this.getSpawnPosition(this.players.size);
        
        if ((spawnPosition.x === 13 && spawnPosition.y === 1) || (spawnPosition.x === 13 && spawnPosition.y === 11)) {
            initialDirection = 'left'
        }

        this.players.set(playerId, {
            ...playerData,
            id: playerId,
            joinedAt: Date.now(),
            lives: 3,
            position: spawnPosition,
            bombs: 1,
            flameRange: 1,
            speed: 1,
            direction: initialDirection
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
                speed: player.speed,
                direction: player.direction
            })),
            gameStatus: this.gameStatus,
            countdown: this.countdown,
            gameMap: this.gameMap,
            winner: this.winner,
            maxPlayers: GAME_CONFIG.maxPlayers,
            minPlayers: GAME_CONFIG.minPlayers
        };
    }

    checkGameEnd() {
        if (this.gameStatus !== 'playing') return;

        // Count active players (not eliminated)
        const activePlayers = Array.from(this.players.values()).filter(p => !p.eliminated);
        
        if (activePlayers.length <= 1) {
            // Game ends - determine winner
            this.gameStatus = 'finished';
            
            if (activePlayers.length === 1) {
                // Single winner
                this.winner = activePlayers[0].nickname;
                console.log(`🏆 Game ended! Winner: ${this.winner}`);
            } else {
                // No winner (all eliminated)
                this.winner = null;
                console.log(`🏁 Game ended! No winner - all players eliminated`);
            }

            // Broadcast game end
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
                speed: result.player.speed,
                direction: result.player.direction
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
        console.log(message);
        const player = currentRoom.players.get(playerId);
        if (!player || player.eliminated) return; // Prevent eliminated players from moving
        console.log(`🕹️ Player ${playerId} requested move:`, message.direction);
        const { direction } = message;
        
        // Calculate movement distance based on speed power-up
        const speed = player.speed || 1;
        const moveDistance = Math.floor(speed); // Integer movement for grid-based system
        
        // Phase 3: Enhanced movement with speed power-up support
        const newPosition = { ...player.position };

        switch (direction) {
            case 'up': 
                newPosition.y = Math.max(1, newPosition.y - moveDistance); 
                break;
            case 'down': 
                newPosition.y = Math.min(11, newPosition.y + moveDistance); 
                break;
            case 'left': 
                newPosition.x = Math.max(1, newPosition.x - moveDistance); 
                player.direction = 'left'; 
                break;
            case 'right': 
                newPosition.x = Math.min(13, newPosition.x + moveDistance); 
                player.direction = 'right'; 
                break;
        }

        // Check if position is valid (not a wall) and handle multi-cell movement
        if (isValidPosition(newPosition, currentRoom.gameMap)) {
            // For multi-cell movement, check all cells in the path
            const pathValid = isPathValid(player.position, newPosition, currentRoom.gameMap);
            if (!pathValid) {
                console.log(`🚫 ${player.nickname}: Invalid path for speed ${speed} movement`);
                return;
            }
            
            // Player collision check: prevent moving into a cell occupied by another player
            const isOccupied = Array.from(currentRoom.players.values()).some(
                p => p.id !== playerId && !p.eliminated && p.position.x === newPosition.x && p.position.y === newPosition.y
            );
            if (isOccupied) {
                // Cell is occupied by another player, do not move
                return;
            }

            // Check for power-up collection
            const cell = currentRoom.gameMap[newPosition.y][newPosition.x];
            if (cell.type === 'powerup') {
                // Collect power-up
                const powerType = cell.power;
                switch (powerType) {
                    case 'bomb':
                        player.bombs = Math.min(player.bombs + 1, 5); // Max 5 bombs
                        console.log(`💣 ${player.nickname} collected bomb power-up. Bombs: ${player.bombs}`);
                        break;
                    case 'flame':
                        player.flameRange = Math.min(player.flameRange + 1, 5); // Max flame range 5
                        console.log(`🔥 ${player.nickname} collected flame power-up. Range: ${player.flameRange}`);
                        break;
                    case 'speed':
                        player.speed = Math.min(player.speed + 0.5, 3); // Max speed 3
                        console.log(`⚡ ${player.nickname} collected speed power-up. Speed: ${player.speed}`);
                        break;
                }

                // Remove power-up from map
                currentRoom.gameMap[newPosition.y][newPosition.x] = { type: 'empty' };

                // Broadcast power-up collection
                currentRoom.broadcast({
                    type: 'powerup_collected',
                    playerId,
                    position: newPosition,
                    powerType,
                    playerStats: {
                        bombs: player.bombs,
                        flameRange: player.flameRange,
                        speed: player.speed
                    }
                });

                console.log(`🎁 ${player.nickname} collected ${powerType} power-up at`, newPosition);
            }

            player.position = newPosition;
            // Only update direction for left/right above

            currentRoom.broadcast({
                type: 'player_moved',
                playerId,
                position: newPosition,
                direction: player.direction // Always send current direction
            }, playerId);
        }
    }

    function isValidPosition(position, gameMap) {
        // Check if position is within bounds and not a wall or block
        if (position.x < 0 || position.x >= gameMap[0].length || position.y < 0 || position.y >= gameMap.length) {
            return false;
        }
        const cell = gameMap[position.y][position.x];
        return cell.type !== 'wall' && cell.type !== 'block';
    }

    function isPathValid(startPos, endPos, gameMap) {
        // Check if all cells in the movement path are valid
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        
        // Determine movement direction
        const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        
        // Check each cell in the path
        let currentX = startPos.x;
        let currentY = startPos.y;
        
        while (currentX !== endPos.x || currentY !== endPos.y) {
            // Move one step towards the target
            if (currentX !== endPos.x) currentX += stepX;
            if (currentY !== endPos.y) currentY += stepY;
            
            // Check if this cell is valid
            if (!isValidPosition({ x: currentX, y: currentY }, gameMap)) {
                return false;
            }
        }
        
        return true;
    }

    function handlePlaceBomb(ws, message, playerId, currentRoom) {
        if (!currentRoom || currentRoom.gameStatus !== 'playing') return;

        const player = currentRoom.players.get(playerId);
        if (!player || player.eliminated) return; // Prevent eliminated players from placing bombs

        // Store the bomb's position at placement time
        const bombPosition = { x: player.position.x, y: player.position.y };

        // Broadcast bomb placement immediately
        currentRoom.broadcast({
            type: 'bomb_placed',
            playerId,
            position: bombPosition
        });

        console.log(`💣 Bomb placed by ${player.nickname} at`, bombPosition);

        // Simulate bomb explosion after 2 seconds
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
            directions.forEach(dir => {
                for (let i = 0; i <= explosionRange; i++) {
                    const x = bombPosition.x + dir.dx * i;
                    const y = bombPosition.y + dir.dy * i;
                    // Stop at walls
                    if (x < 0 || y < 0 || y >= currentRoom.gameMap.length || x >= currentRoom.gameMap[0].length) break;
                    const cell = currentRoom.gameMap[y][x];
                    if (cell.type === 'wall') break;
                    affectedCells.push({ x, y });
                    if (cell.type === 'block') {
                        // Destroy block
                        currentRoom.gameMap[y][x] = { type: 'empty' };
                        // 30% chance to spawn a power-up
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
                        break; // Stop explosion at block
                    }
                }
            });

            // Damage players in affected cells
            let damagedPlayers = [];
            currentRoom.players.forEach((p, pid) => {
                if (affectedCells.some(cell => cell.x === p.position.x && cell.y === p.position.y)) {
                    p.lives = Math.max(0, (p.lives || 1) - 1);
                    if (p.lives === 0) {
                        // Mark player as eliminated but keep them as spectator
                        p.eliminated = true;
                        currentRoom.broadcast({
                            type: 'player_eliminated',
                            playerId: pid,
                            nickname: p.nickname
                        });
                    } else {
                        // Only add to damagedPlayers if they're still alive
                        damagedPlayers.push({ id: pid, lives: p.lives, nickname: p.nickname });
                        // Respawn player at their original spawn position
                        // Find their index in the room's player list
                        const playerIndex = Array.from(currentRoom.players.keys()).indexOf(pid);
                        const spawnPos = currentRoom.getSpawnPosition(playerIndex);
                        p.position = { ...spawnPos };
                        // Broadcast new position
                        currentRoom.broadcast({
                            type: 'player_moved',
                            playerId: pid,
                            position: p.position,
                            direction: p.direction
                        });
                    }
                }
            });

            // Check for game end conditions after player damage
            currentRoom.checkGameEnd();

            // Broadcast explosion
            currentRoom.broadcast({
                type: 'explosion',
                position: bombPosition,
                affectedCells
            });

            // Broadcast damaged players
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

            console.log(`💥 Bomb exploded and removed at`, bombPosition);
        }, 2000);
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

        // Broadcast to other players (exclude sender)
        currentRoom.broadcast({
            type: 'chat_message',
            message: chatMessage
        }, playerId);

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