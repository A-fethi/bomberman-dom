import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';

// Phase 3: GameBoard component with basic map display
export function GameBoard() {
    const gameState = getGameState();
    
    // Render the game map if available
    const renderMap = () => {
        if (!gameState.gameMap) {
            return Vnode('div', { class: 'no-map' }, 'Loading map...');
        }
        
        return Vnode('div', { class: 'game-map' }, 
            gameState.gameMap.map((row, y) => 
                Vnode('div', { class: 'map-row' }, 
                    row.map((cell, x) => {
                        let cellClass = 'map-cell';
                        let cellContent = '';
                        
                        switch (cell.type) {
                            case 'wall':
                                cellClass += ' wall';
                                cellContent = Vnode('img', { class: 'cell-img', src: './src/assets/Wall.png', alt: 'Wall' });
                                break;
                            case 'block':
                                cellClass += ' block';
                                cellContent = Vnode('img', { class: 'cell-img', src: './src/assets/Icons_02.png', alt: 'Block' });
                                break;
                            case 'empty':
                                cellClass += ' empty';
                                cellContent = Vnode('img', { class: 'cell-img', src: './src/assets/empty.png', alt: 'Empty' });
                                break;
                            default:
                                cellClass += ' empty';
                                cellContent = Vnode('img', { class: 'cell-img', src: './src/assets/empty.png', alt: 'Empty' });
                        }
                        
                        // Check if a player is at this cell
                        const player = gameState.players && gameState.players.find(p => p.position && p.position.x === x && p.position.y === y);
                        return Vnode('div', { class: cellClass }, [
                            cellContent,
                            player && Vnode('div', { class: 'player-marker' }, [
                                Vnode('div', { 
                                    class: 'player-avatar',
                                    'data-player-name': player.nickname
                                }, Vnode('img', {
                                    src: './src/assets/0_Skeleton_Warrior_Idle_000.png',
                                    alt: player.nickname || 'Player Avatar',
                                    style: player.direction === 'left' ? 'transform: scaleX(-1);' : 'transform: scaleX(1);'
                                }))
                            ])
                        ]);
                    })
                )
            )
        );
    };
    
    return Vnode('div', { class: 'game-board' }, [
        Vnode('div', { class: 'game-header' }, [
            Vnode('h2', {}, 'Bomberman Game'),
            Vnode('div', { class: 'game-info' }, [
                Vnode('span', {}, `Room: ${gameState.roomId}`),
                Vnode('span', {}, `Players: ${gameState.players.length}`),
                Vnode('span', {}, `Status: ${gameState.gameStatus}`)
            ])
        ]),
        Vnode('div', { class: 'game-area' }, [
            Vnode('div', { class: 'map-container' }, [
                Vnode('div', { class: 'game-map-wrapper' }, [
                    renderMap()
                ])
            ]),
            Vnode('div', { class: 'game-controls' }, [
                Vnode('button', {
                    onclick: () => {
                        updateGameState({
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