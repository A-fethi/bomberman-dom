import { Vnode } from '../node_modules/all4one-js/index.js';
import { createState, effect } from '../node_modules/all4one-js/index.js';
import { NicknameEntry } from './components/NicknameEntry.js';
import { WaitingRoom } from './components/WaitingRoom.js';
import { GameBoard } from './components/GameBoard.js';
import { GameOver } from './components/GameOver.js';
import { Chat } from './components/Chat.js';

// Phase 2: Enhanced reactive state management with room support
export const [getGameState, setGameState] = createState({
    currentScreen: 'nickname', // 'nickname', 'waiting', 'game', 'gameOver'
    nickname: '',
    roomId: null,
    players: [],
    gameMap: [],
    currentPlayer: null,
    countdown: null,
    winner: null,
    chatMessages: [],
    gameStatus: 'waiting', // 'waiting', 'starting', 'playing', 'finished'
    maxPlayers: 4,
    minPlayers: 2
});

// Phase 2: WebSocket state (preparing for Phase 3)
export const [getWebSocket, setWebSocket] = createState(null);
export const [getConnectionStatus, setConnectionStatus] = createState('disconnected'); // 'connecting', 'connected', 'disconnected'

// Phase 2: Enhanced main application component
export function GameApp() {
    const gameState = getGameState();
    const connectionStatus = getConnectionStatus();
    
    return Vnode('div', { class: 'game-app' }, [
        Vnode('div', { class: 'game-header' }, [
            Vnode('h1', {}, 'Bomberman Multiplayer'),
            connectionStatus !== 'disconnected' && 
            Vnode('div', { class: 'connection-status' }, [
                Vnode('span', { class: `status-indicator ${connectionStatus}` }, 
                    connectionStatus === 'connected' ? '🟢 Connected' : 
                    connectionStatus === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected'
                )
            ])
        ]),
        
        // Phase 2: Render different screens based on current state
        gameState.currentScreen === 'nickname' && NicknameEntry(),
        gameState.currentScreen === 'waiting' && WaitingRoom(),
        gameState.currentScreen === 'game' && Vnode('div', { class: 'game-layout' }, [
            GameBoard(),
            Chat()
        ]),
        gameState.currentScreen === 'gameOver' && GameOver()
    ]);
} 