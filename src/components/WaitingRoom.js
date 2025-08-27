import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';
import { webSocketManager } from '../WebSocketManager.js';
import { Chat } from './Chat.js';

// WaitingRoom component with WebSocket integration
export function WaitingRoom() {
    const gameState = getGameState();
    
    const leaveRoom = () => {
        // Use WebSocket to leave game
        webSocketManager.leaveGame();
        
        updateGameState({
            ...getGameState(),
            currentScreen: 'nickname',
            players: [],
            roomId: null,
            chatMessages: []
        });
    };
    
    // Calculate waiting time display
    const getWaitingTimeDisplay = () => {
        if (gameState.waitingTimeLeft !== null && gameState.waitingTimeLeft > 0) {
            return `Waiting for more players: ${gameState.waitingTimeLeft}s`;
        }
        return null;
    };
    
    const waitingTimeDisplay = getWaitingTimeDisplay();
    
    return Vnode('div', { class: 'waiting-room' }, [
        Vnode('div', { class: 'waiting-content' }, [
            Vnode('h2', {}, 'Waiting for Players'),
            Vnode('div', { class: 'room-info' }, [
                Vnode('div', { class: 'room-id' }, [
                    Vnode('span', {}, 'Room: '),
                    Vnode('span', { class: 'room-number' }, gameState.roomId || 'Connecting...')
                ]),
                Vnode('div', { class: 'player-counter' }, [
                    Vnode('span', {}, `${gameState.players.length}/${gameState.maxPlayers} players`)
                ])
            ]),
            waitingTimeDisplay && 
            Vnode('div', { class: 'waiting-timer' }, [
                Vnode('h3', {}, 'Waiting Timer:'),
                Vnode('div', { class: 'waiting-time' }, waitingTimeDisplay)
            ]),
            gameState.countdown && gameState.countdown > 0 && 
            Vnode('div', { class: 'countdown' }, [
                Vnode('h3', {}, 'Game Starting In:'),
                Vnode('div', { class: 'countdown-number' }, gameState.countdown)
            ]),
            Vnode('div', { class: 'players-list' }, [
                Vnode('h3', {}, 'Connected Players:'),
                ...gameState.players.map(player => 
                    Vnode('div', { class: 'player-item' }, [
                        Vnode('span', { class: 'player-name' }, player.nickname),
                        player.isLocal && Vnode('span', { class: 'you-indicator' }, '(You)')
                    ])
                )
            ]),
            Vnode('div', { class: 'waiting-info' }, [
                Vnode('p', {}, `Waiting for ${gameState.minPlayers}-${gameState.maxPlayers} players to join...`),
                gameState.players.length >= gameState.minPlayers ? 
                    Vnode('p', {}, 'Game will start automatically!') :
                    Vnode('p', {}, 'Need more players to start...')
            ]),
            Vnode('button', {
                onclick: leaveRoom,
                class: 'back-btn'
            }, 'Leave Room')
        ]),
        Chat()
    ]);
} 