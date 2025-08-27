import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';

// GameOver component
export function GameOver() {
    const gameState = getGameState();
    const isWinner = gameState.nickname === gameState.winner;
    
    return Vnode('div', { class: 'game-over' }, [
        Vnode('div', { class: 'game-over-content' }, [
            Vnode('h2', {}, isWinner ? 'You Win!' : 'Game Over!'),
            isWinner && Vnode('div', { class: 'congrats-message' }, [
                Vnode('h3', {}, 'Congratulations!'),
                Vnode('p', {}, 'You are the last player standing!')
            ]),
            !isWinner && gameState.winner && 
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