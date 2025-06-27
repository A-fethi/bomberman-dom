// Phase 2: Main Game Application with room support
console.log('📦 GameApp: Module loading...');
import { Vnode, render } from '../node_modules/all4one-js/index.js';
console.log('✅ GameApp: Vnode, render imports successful');
import { createState, effect } from '../node_modules/all4one-js/index.js';
console.log('✅ GameApp: createState, effect imports successful');
import { webSocketManager } from './WebSocketManager.js';
console.log('✅ GameApp: webSocketManager import successful');
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
    connectionStatus: 'disconnected'
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
function handleNicknameSubmit(nickname) {
    setGameState({ 
        nickname,
        currentScreen: 'waiting'
    });
    
    // Phase 3: Connect to WebSocket and join game
    webSocketManager.joinGame(nickname);
}

function handleStartGame() {
    webSocketManager.startGame();
}

function handleLeaveRoom() {
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

function handlePlayerMove(direction) {
    webSocketManager.movePlayer(direction);
}

function handlePlaceBomb() {
    webSocketManager.placeBomb();
}

function handleSendChatMessage(text) {
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

function handlePlayAgain() {
    setGameState({
        currentScreen: 'waiting',
        gameStatus: 'waiting',
        countdown: null,
        gameMap: null,
        winner: null
    });
}

function handleBackToMenu() {
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

// Phase 2: Initialize app
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('🎮 Bomberman DOM Game - Phase 2 Initialized');
//     render(() => GameApp(), document.getElementById('app'));
// }); 