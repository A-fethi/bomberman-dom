import { Vnode } from '../node_modules/all4one-js/index.js';
import { createState, effect } from '../node_modules/all4one-js/index.js';

// Phase 1: Basic reactive state management
export const [getGameState, setGameState] = createState({
    currentScreen: 'nickname', // 'nickname', 'waiting', 'game', 'gameOver'
    nickname: '',
    players: [],
    gameMap: [],
    currentPlayer: null,
    countdown: null,
    winner: null,
    chatMessages: []
});

// Phase 1: Main application component
export function GameApp() {
    const gameState = getGameState();
    
    return Vnode('div', { class: 'game-app' }, [
        Vnode('div', { class: 'game-header' }, [
            Vnode('h1', {}, 'Bomberman Multiplayer')
        ]),
        
        // Phase 1: Render different screens based on current state
        gameState.currentScreen === 'nickname' && NicknameEntry(),
        gameState.currentScreen === 'waiting' && WaitingRoom(),
        gameState.currentScreen === 'game' && Vnode('div', { class: 'game-container' }, [
            Vnode('p', {}, 'Game screen - Coming in Phase 2!'),
            Vnode('button', {
                onclick: () => {
                    setGameState({
                        ...getGameState(),
                        currentScreen: 'nickname'
                    });
                }
            }, 'Back to Nickname')
        ]),
        gameState.currentScreen === 'gameOver' && Vnode('div', { class: 'game-over' }, [
            Vnode('h2', {}, 'Game Over!'),
            Vnode('button', {
                onclick: () => {
                    setGameState({
                        ...getGameState(),
                        currentScreen: 'nickname',
                        players: [],
                        gameMap: [],
                        currentPlayer: null,
                        countdown: null,
                        winner: null,
                        chatMessages: []
                    });
                }
            }, 'Play Again')
        ])
    ]);
}

// Optimized components with performance considerations
function NicknameEntry() {
    let nicknameValue = '';
    let errorMessage = '';
    
    const handleSubmit = (e) => {
        e.preventDefault();
        
        const trimmedNickname = nicknameValue.trim();
        
        if (!trimmedNickname) {
            errorMessage = 'Please enter a nickname';
            setGameState({ ...getGameState() });
            return;
        }
        
        if (trimmedNickname.length < 2) {
            errorMessage = 'Nickname must be at least 2 characters long';
            setGameState({ ...getGameState() });
            return;
        }
        
        if (trimmedNickname.length > 15) {
            errorMessage = 'Nickname must be less than 15 characters';
            setGameState({ ...getGameState() });
            return;
        }
        
        setGameState({
            ...getGameState(),
            currentScreen: 'waiting',
            nickname: trimmedNickname
        });
    };
    
    return Vnode('div', { class: 'nickname-entry' }, [
        Vnode('div', { class: 'nickname-form' }, [
            Vnode('h2', {}, 'Enter Your Nickname'),
            Vnode('form', { onsubmit: handleSubmit }, [
                Vnode('input', {
                    type: 'text',
                    placeholder: 'Enter nickname (2-15 characters)',
                    oninput: (e) => {
                        nicknameValue = e.target.value;
                        errorMessage = '';
                    },
                    maxlength: 15,
                    autocomplete: 'off',
                    class: 'nickname-input'
                }),
                errorMessage && Vnode('div', { class: 'error-message' }, errorMessage),
                Vnode('button', { type: 'submit', class: 'submit-btn' }, 'Join Game')
            ])
        ])
    ]);
}

function WaitingRoom() {
    const gameState = getGameState();
    
    return Vnode('div', { class: 'waiting-room' }, [
        Vnode('div', { class: 'waiting-content' }, [
            Vnode('h2', {}, 'Waiting for Players'),
            Vnode('div', { class: 'player-counter' }, [
                Vnode('span', {}, '1/4 players')
            ]),
            Vnode('div', { class: 'players-list' }, [
                Vnode('h3', {}, 'Connected Players:'),
                Vnode('div', { class: 'player-item' }, [
                    Vnode('span', { class: 'player-name' }, gameState.nickname),
                    Vnode('span', { class: 'you-indicator' }, '(You)')
                ])
            ]),
            Vnode('div', { class: 'waiting-info' }, [
                Vnode('p', {}, 'Waiting for 2-4 players to join...'),
                Vnode('p', {}, 'Game will start automatically when ready!')
            ]),
            Vnode('button', {
                onclick: () => {
                    setGameState({
                        ...getGameState(),
                        currentScreen: 'nickname'
                    });
                }
            }, 'Back to Nickname')
        ])
    ]);
} 