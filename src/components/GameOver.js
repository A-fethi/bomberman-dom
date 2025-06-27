import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';

// Phase 2: GameOver component
export function GameOver() {
    const gameState = getGameState();
    
    return Vnode('div', { class: 'game-over' }, [
        Vnode('div', { class: 'game-over-content' }, [
            Vnode('h2', {}, 'Game Over!'),
            gameState.winner && 
            Vnode('div', { class: 'winner' }, [
                Vnode('h3', {}, 'Winner:'),
                Vnode('span', { class: 'winner-name' }, gameState.winner)
            ]),
            Vnode('div', { class: 'game-over-actions' }, [
                Vnode('button', {
                    onclick: () => {
                        updateGameState({
                            ...getGameState(),
                            currentScreen: 'nickname',
                            players: [],
                            gameMap: [],
                            currentPlayer: null,
                            countdown: null,
                            winner: null,
                            chatMessages: [],
                            roomId: null
                        });
                    },
                    class: 'new-game-btn'
                }, 'New Game')
            ])
        ])
    ]);
} 