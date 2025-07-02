// Phase 2: Main Game Application with room support
console.log('📦 GameApp: Module loading...');
import { Vnode, render } from '../node_modules/all4one-js/index.js';
console.log('✅ GameApp: Vnode, render imports successful');
import { createState, effect } from '../node_modules/all4one-js/index.js';
console.log('✅ GameApp: createState, effect imports successful');
import { webSocketManager } from './WebSocketManager.js'; // Use the singleton WebSocketManager
console.log('✅ GameApp: webSocketManager import successful');
import { gameLoop } from './GameLoop.js';
console.log('✅ GameApp: gameLoop import successful');
import { performanceMonitor } from './PerformanceMonitor.js';
console.log('✅ GameApp: performanceMonitor import successful');
import { NicknameEntry } from './components/NicknameEntry.js';
console.log('✅ GameApp: NicknameEntry import successful');
import { WaitingRoom } from './components/WaitingRoom.js';
console.log('✅ GameApp: WaitingRoom import successful');
import { GameBoard } from './components/GameBoard.js';
console.log('✅ GameApp: GameBoard import successful');
import { GameOver } from './components/GameOver.js';
console.log('✅ GameApp: GameOver import successful');
import { Chat } from './components/Chat.js';
console.log('✅ GameApp: Chat import successful');

// Phase 2: Game state management with all4one-js
console.log('🎯 GameApp: Creating state...');
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
    // Performance monitoring
    showPerformanceStats: false,
    performanceStats: {
        fps: 0,
        frameDrops: 0,
        warnings: [],
        isOptimal: true
    },
    bombs: [],
    explosions: [],
    // Power-up notifications
    powerupNotification: null
};

export const [getGameState, setGameState] = createState(initialState);

// Create a helper function to update state by merging
export function updateGameState(updates) {
    const currentState = getGameState();
    const newState = { ...currentState, ...updates };
    console.log('🔄 GameApp: Updating state from:', currentState, 'to:', newState);
    setGameState(newState);
}

console.log('✅ GameApp: State created successfully');

// Phase 2: Initialize connection status monitoring
console.log('🔌 GameApp: Setting up WebSocket connection monitoring...');
webSocketManager.onConnectionStatusChange((status) => {
    console.log('📡 GameApp: Connection status changed to:', status);
    updateGameState({ connectionStatus: status });
});

// Phase 3: Initialize game loop and performance monitoring
console.log('🎮 GameApp: Setting up game loop and performance monitoring...');

// Start game loop when app initializes
gameLoop.start();

// Add performance monitoring callback
gameLoop.addUpdateCallback(() => {
    const stats = gameLoop.getStats();
    updateGameState({
        performanceStats: {
            fps: stats.fps,
            frameDrops: stats.frameDrops,
            warnings: stats.warnings,
            isOptimal: stats.isOptimal
        }
    });
});

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

// Performance stats toggle (Ctrl+P)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        const currentState = getGameState();
        updateGameState({
            showPerformanceStats: !currentState.showPerformanceStats
        });
    }
});

let moveInterval = null;
let currentDirection = null;
const keyToDirection = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
};

function startMoving(direction, speed) {
    if (moveInterval) return; // already moving

    sendMove(direction); // instant first move

    // movement delay in ms: the higher the speed, the faster the player
    const baseDelay = 250;
    const speedFactor = 40;
    const delay = Math.max(60, baseDelay - speed * speedFactor); // delay based on speed

    currentDirection = direction;

    moveInterval = setInterval(() => {
        sendMove(direction);
    }, delay);
}

function stopMoving() {
    if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
        currentDirection = null;
    }
}

function sendMove(direction) {
    const gameState = getGameState();
    if (gameState.gameStatus !== 'playing') return;

    const localPlayer = gameState.players.find(p => p.nickname === gameState.nickname);
    if (!localPlayer || localPlayer.eliminated) return;

    // Use the webSocketManager to send the move
    webSocketManager.movePlayer(direction);
}

// Movement key handlers
window.addEventListener('keydown', (e) => {
    if (!keyToDirection[e.key]) return;

    const gameState = getGameState();
    const direction = keyToDirection[e.key];
    const player = gameState.players.find(p => p.nickname === gameState.nickname);

    if (!player) return;

    if (direction !== currentDirection) {
        stopMoving();
        startMoving(direction, player.speed || 1);
    }
});

window.addEventListener('keyup', (e) => {
    if (keyToDirection[e.key] === currentDirection) {
        stopMoving();
    }
});

// Bomb placement key handler - Spacebar triggers bomb placement
window.addEventListener('keydown', (e) => {
    if (e.key === ' ') { // Spacebar
        e.preventDefault(); // prevent page scroll
        handlePlaceBomb();
    }
});

// Phase 2: Main application component
export function GameApp() {
    console.log('🎮 GameApp: Function called, getting state...');
    const gameState = getGameState();
    console.log('📊 GameApp: Current state:', gameState);
    
    console.log('🎨 GameApp: Building Vnode tree...');
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
        
        // Performance stats overlay (toggle with Ctrl+P)
        gameState.showPerformanceStats && Vnode('div', { class: 'performance-overlay' }, [
            Vnode('div', { class: 'performance-stats' }, [
                Vnode('h3', {}, 'Performance Stats'),
                Vnode('div', { class: 'stat-row' }, [
                    Vnode('span', {}, 'FPS:'),
                    Vnode('span', { 
                        class: gameState.performanceStats.fps >= 50 ? 'stat-good' : 'stat-warning' 
                    }, `${gameState.performanceStats.fps} (target: 60)`)
                ]),
                Vnode('div', { class: 'stat-row' }, [
                    Vnode('span', {}, 'Frame Drops:'),
                    Vnode('span', { 
                        class: gameState.performanceStats.frameDrops === 0 ? 'stat-good' : 'stat-warning' 
                    }, gameState.performanceStats.frameDrops)
                ]),
                Vnode('div', { class: 'stat-row' }, [
                    Vnode('span', {}, 'Status:'),
                    Vnode('span', { 
                        class: gameState.performanceStats.isOptimal ? 'stat-good' : 'stat-error' 
                    }, gameState.performanceStats.isOptimal ? 'Optimal' : 'Issues Detected')
                ]),
                gameState.performanceStats.warnings.length > 0 && 
                Vnode('div', { class: 'performance-warnings' }, [
                    Vnode('h4', {}, 'Warnings:'),
                    ...gameState.performanceStats.warnings.map(warning => 
                        Vnode('div', { class: 'warning-item' }, warning)
                    )
                ]),
                Vnode('div', { class: 'performance-help' }, [
                    Vnode('small', {}, 'Press Ctrl+P to toggle • Target: 60 FPS • No frame drops')
                ])
            ])
        ]),
        
        // Power-up notification overlay
        gameState.powerupNotification && Vnode('div', { class: 'powerup-notification' }, [
            Vnode('div', { class: 'powerup-notification-content' }, [
                Vnode('span', { class: 'powerup-emoji' }, gameState.powerupNotification.emoji),
                Vnode('span', { class: 'powerup-text' }, gameState.powerupNotification.text)
            ])
        ]),
        
        // Phase 2: Render different screens based on current state
        gameState.currentScreen === 'nickname' && (() => {
            console.log('📝 GameApp: Rendering NicknameEntry...');
            return NicknameEntry();
        })(),
        gameState.currentScreen === 'waiting' && (() => {
            console.log('⏳ GameApp: Rendering WaitingRoom...');
            return WaitingRoom();
        })(),
        gameState.currentScreen === 'game' && (() => {
            console.log('🎯 GameApp: Rendering GameBoard...');
            return Vnode('div', { class: 'game-layout' }, [
                GameBoard(),
                Chat()
            ]);
        })(),
        gameState.currentScreen === 'gameOver' && (() => {
            console.log('🏁 GameApp: Rendering GameOver...');
            return GameOver();
        })()
    ]);
    console.log('✅ GameApp: Vnode tree built successfully');
    return result;
}

// Phase 2: Event handlers
export function handleNicknameSubmit(nickname) {
    setGameState({ 
        nickname,
        currentScreen: 'waiting'
    });
    
    // Phase 3: Connect to WebSocket and join game
    webSocketManager.sendJoinGame(nickname);
}

export function handleStartGame() {
    webSocketManager.startGame();
    setGameState({
        bombs: [],
        explosions: []
    });
}

export function handleLeaveRoom() {
    webSocketManager.leaveGame();
    setGameState({
        currentScreen: 'nickname',
        roomId: null,
        players: [],
        gameStatus: 'waiting',
        countdown: null,
        gameMap: null,
        chatMessages: []
    });
}

export function handlePlayerMove(direction) {
    webSocketManager.movePlayer(direction);
}

export function handlePlaceBomb() {
    console.log('🚩 GameApp: Placing bomb...');
    webSocketManager.placeBomb();
}

export function handleSendChatMessage(text) {
    const newMessage = {
        id: Date.now(),
        text,
        sender: getGameState().nickname,
        timestamp: new Date().toISOString(),
        isLocal: true
    };

    setGameState({
        chatMessages: [...getGameState().chatMessages, newMessage]
    });

    webSocketManager.sendChatMessage(text);
}

export function handlePlayAgain() {
    setGameState({
        currentScreen: 'waiting',
        gameStatus: 'waiting',
        countdown: null,
        gameMap: null,
        winner: null,
        bombs: [],
        explosions: []
    });
}

export function handleBackToMenu() {
    setGameState({
        currentScreen: 'nickname',
        roomId: null,
        players: [],
        gameStatus: 'waiting',
        countdown: null,
        gameMap: null,
        chatMessages: [],
        bombs: [],
        explosions: []
    });
}

// Phase 2: Initialize app (uncomment to enable)
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('🎮 Bomberman DOM Game - Phase 2 Initialized');
//     render(() => GameApp(), document.getElementById('app'));
// }); 
