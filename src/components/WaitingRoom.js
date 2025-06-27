import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, setGameState } from '../GameApp.js';

// Phase 2: WaitingRoom component with room management
export function WaitingRoom() {
    const gameState = getGameState();
    
    const startGame = () => {
        if (gameState.players.length >= gameState.minPlayers) {
            setGameState({
                ...getGameState(),
                currentScreen: 'game',
                gameStatus: 'starting',
                countdown: 3
            });
        }
    };
    
    return Vnode('div', { class: 'waiting-room' }, [
        Vnode('div', { class: 'waiting-content' }, [
            Vnode('h2', {}, 'Waiting for Players'),
            Vnode('div', { class: 'room-info' }, [
                Vnode('div', { class: 'room-id' }, [
                    Vnode('span', {}, 'Room: '),
                    Vnode('span', { class: 'room-number' }, gameState.roomId || 'Creating...')
                ]),
                Vnode('div', { class: 'player-counter' }, [
                    Vnode('span', {}, `${gameState.players.length}/${gameState.maxPlayers} players`)
                ])
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
                Vnode('p', {}, 'Game will start automatically when ready!')
            ]),
            gameState.players.length >= gameState.minPlayers && 
            Vnode('button', {
                onclick: startGame,
                class: 'start-game-btn'
            }, 'Start Game'),
            Vnode('button', {
                onclick: () => {
                    setGameState({
                        ...getGameState(),
                        currentScreen: 'nickname',
                        players: [],
                        roomId: null
                    });
                },
                class: 'back-btn'
            }, 'Back to Nickname')
        ])
    ]);
} 