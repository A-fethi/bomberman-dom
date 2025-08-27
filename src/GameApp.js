import { Vnode, render } from '../node_modules/all4one-js/index.js';
import { createState, effect } from '../node_modules/all4one-js/index.js';
import { webSocketManager } from './WebSocketManager.js';
import { gameLoop } from './GameLoop.js';
import { NicknameEntry } from './components/NicknameEntry.js';
import { WaitingRoom } from './components/WaitingRoom.js';
import { GameBoard } from './components/GameBoard.js';
import { GameOver } from './components/GameOver.js';
import { Chat } from './components/Chat.js';

// Game state management with all4one-js
const initialState = {
    currentScreen: 'nickname', // 'nickname', 'waiting', 'game', 'gameOver'
    nickname: '',
    nicknameInput: '',
    nicknameError: '',
    roomId: null,
    players: [],
    gameStatus: 'waiting', // 'waiting', 'countdown', 'playing', 'finished'
    countdown: null,
    gameMap: null,
    maxPlayers: 4,
    minPlayers: 2,
    chatMessages: [],
    connectionStatus: 'disconnected',

    bombs: [],
    explosions: [],
    
};

export const [getGameState, setGameState] = createState(initialState);

// Create a helper function to update state by merging
export function updateGameState(updates) {
    const currentState = getGameState();
    let newState = { ...currentState, ...updates };
    if (updates.players) {
        newState.players = updatePlayersWithPixelPositions(updates.players);
    }
    setGameState(newState);
}

// Initialize connection status monitoring
webSocketManager.onConnectionStatusChange((status) => {
    updateGameState({ connectionStatus: status });
});

// Initialize game loop

// Start game loop when app initializes
gameLoop.start();

// Add explosion cleanup callback
gameLoop.addUpdateCallback(() => {
    const gameState = getGameState();
    if (gameState.explosions && gameState.explosions.length > 0) {
        const now = Date.now();
        const updatedExplosions = gameState.explosions.filter(exp => 
            now - exp.timestamp < 2000 // Keep explosions for max 2 seconds
        );
        
        if (updatedExplosions.length !== gameState.explosions.length) {
            updateGameState({
                explosions: updatedExplosions
            });
        }
    }
});

function setupMovementControls() {
    const lastMoveTime = {};
    const baseThrottleDelay = 300; // ms for speed 1
    
    return (e) => {
        if (window.isChatInputFocused) return;
        const gameState = getGameState();
        if (gameState.currentScreen !== 'game') return;
        const localPlayer = gameState.players.find(p => p.nickname === gameState.nickname);
        if (localPlayer && localPlayer.movementBlocked) return;

        let direction = null;
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                direction = 'right';
                break;
            case ' ':
                webSocketManager.placeBomb();
                e.preventDefault();
                return;
            default:
                return;
        }
        e.preventDefault();
        
        // Calculate throttle delay based on player speed
        const playerSpeed = localPlayer ? (localPlayer.speed || 1) : 1;
        const throttleDelay = Math.max(100, baseThrottleDelay / playerSpeed); // Min 100ms, max based on speed
        
        const now = Date.now();
        if (!lastMoveTime[direction] || now - lastMoveTime[direction] > throttleDelay) {
            lastMoveTime[direction] = now;
            webSocketManager.movePlayer(direction);
        }
    };
}

// Main application component
export function GameApp() {
    const gameState = getGameState();
    const localPlayer = gameState.players.find(p => p.nickname === gameState.nickname);
    const result = Vnode('div', { class: 'game-app' }, [
        Vnode('div', { class: 'game-header' }, [
            Vnode('h1', {}, 'Bomberman Multiplayer'),
            Vnode('div', { class: 'connection-status' }, [
                Vnode('span', { class: `status-indicator ${gameState.connectionStatus}` }, 
                    gameState.connectionStatus === 'connected' ? '🟢 Connected' : 
                    gameState.connectionStatus === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected'
                )
            ])
        ]),
       
        
        // Render different screens based on current state
        gameState.currentScreen === 'nickname' && NicknameEntry(),
        gameState.currentScreen === 'waiting' && WaitingRoom(),
        gameState.currentScreen === 'game' && Vnode('div', { class: 'game-layout' }, [
            GameBoard(),
            Chat()
        ]),
        gameState.currentScreen === 'gameOver' && GameOver()
    ]);
    return result;
}

window.onkeydown = setupMovementControls();

// Helper: get pixel position for a grid cell
export function gridToPixel(x, y) {
    const cellSize = 32; // px, must match CSS
    // Center the avatar in the cell: offset by half the difference between cell and avatar size
    // Avatar is 60x60px, cell is 32x32px, so center by shifting left/top by (cellSize-avatarSize)/2
    // But avatar is scaled to 70% in .player-avatar, so 32*0.7 = 22.4px
    // We'll center based on cell size, so no offset needed if avatar fits cell
    return { x: x * cellSize, y: y * cellSize };
}

// Server spawn positions for 2-4 players
const SPAWN_POSITIONS = [
    { x: 1, y: 1 },           // Top-left
    { x: 13, y: 1 },          // Top-right
    { x: 1, y: 11 },          // Bottom-left
    { x: 13, y: 11 }          // Bottom-right
];

// When updating players, ensure pixelPosition and targetPosition are set
export function updatePlayersWithPixelPositions(players) {
    return players.map((player, idx) => {
        // Use server spawn if no position
        let gridPos = player.position;
        if (!gridPos) {
            gridPos = SPAWN_POSITIONS[idx % SPAWN_POSITIONS.length];
        }
        const pixelPos = player.pixelPosition || gridToPixel(gridPos.x, gridPos.y);
        const targetPos = player.targetPosition || gridPos;
        return {
            ...player,
            position: gridPos,
            pixelPosition: pixelPos,
            targetPosition: targetPos
        };
    });
}