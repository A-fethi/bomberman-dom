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
                                cellContent = '🧱';
                                break;
                            case 'block':
                                cellClass += ' block';
                                cellContent = '📦';
                                break;
                            case 'empty':
                                cellClass += ' empty';
                                break;
                            default:
                                cellClass += ' empty';
                        }
                        
                        return Vnode('div', { class: cellClass }, cellContent);
                    })
                )
            )
        );
    };
    
    // Render players on the map
    const renderPlayers = () => {
        if (!gameState.gameMap || !gameState.players) return null;
        
        console.log('🎮 GameBoard: Rendering players:', gameState.players);
        
        return gameState.players.map(player => {
            if (!player.position) {
                console.log('❌ GameBoard: Player has no position:', player);
                return null;
            }
            
            // Calculate position relative to the map (not the container)
            const x = player.position.x * 30; // 30px per cell
            const y = player.position.y * 30; // 30px per cell
            
            console.log('🎮 GameBoard: Player position:', player.nickname, 'at', player.position, 'pixels:', {x, y});
            
            return Vnode('div', {
                class: 'player-marker',
                style: `left: ${x}px; top: ${y}px;`
            }, [
                Vnode('div', { class: 'player-avatar' }, '👤'),
                Vnode('div', { class: 'player-name' }, player.nickname)
            ]);
        });
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
                    renderMap(),
                    renderPlayers()
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