import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, setGameState } from '../GameApp.js';

// Phase 2: GameBoard component (placeholder for Phase 5)
export function GameBoard() {
    const gameState = getGameState();
    
    return Vnode('div', { class: 'game-board' }, [
        Vnode('div', { class: 'game-header' }, [
            Vnode('h2', {}, 'Game in Progress'),
            Vnode('div', { class: 'game-info' }, [
                Vnode('span', {}, `Room: ${gameState.roomId}`),
                Vnode('span', {}, `Players: ${gameState.players.length}`)
            ])
        ]),
        Vnode('div', { class: 'game-area' }, [
            Vnode('p', {}, 'Game board - Coming in Phase 5!'),
            Vnode('div', { class: 'game-controls' }, [
                Vnode('button', {
                    onclick: () => {
                        setGameState({
                            ...getGameState(),
                            currentScreen: 'gameOver',
                            winner: gameState.nickname
                        });
                    }
                }, 'End Game (Test)')
            ])
        ])
    ]);
} 