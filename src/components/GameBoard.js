import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';

// Phase 3: GameBoard component with basic map display
export function GameBoard() {
    const gameState = getGameState();
    const bombs = gameState.bombs || [];
    const explosions = gameState.explosions || [];

    // Helper: check if a bomb is at (x, y)
    const isBombAt = (x, y) => bombs.some(b => b.x === x && b.y === y);
    // Helper: check if an explosion is at (x, y)
    const isExplosionAt = (x, y) => explosions.some(e => e.affectedCells.some(cell => cell.x === x && cell.y === y));

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
                            case 'powerup':
                                cellClass += ' powerup';
                                let powerupEmoji = '❓';
                                let altText = 'Power-up';
                                if (cell.power === 'bomb') {
                                    powerupEmoji = '💣';
                                    altText = 'Bomb Power-up';
                                } else if (cell.power === 'flame') {
                                    powerupEmoji = '🔥';
                                    altText = 'Flame Power-up';
                                } else if (cell.power === 'speed') {
                                    powerupEmoji = '🏃';
                                    altText = 'Speed Power-up';
                                } else if (cell.power === 'life' || cell.power === 'heart') {
                                    powerupEmoji = '❤️';
                                    altText = 'Extra Life';
                                }
                                cellContent = Vnode('span', { class: 'powerup-emoji', title: altText }, powerupEmoji);
                                break;
                            case 'empty':
                                cellClass += ' empty';
                                cellContent = Vnode('img', { class: 'cell-img', src: './src/assets/empty.png', alt: 'Empty' });
                                break;
                            default:
                                cellClass += ' empty';
                                cellContent = Vnode('img', { class: 'cell-img', src: './src/assets/empty.png', alt: 'Empty' });
                        }
                        
                        // Bomb animation
                        let bombNode = null;
                        if (isBombAt(x, y)) {
                            bombNode = Vnode('img', { class: 'Bomb', src: './src/assets/bomb.png', alt: 'Bomb' });
                        }
                        // Explosion animation
                        let explosionNode = null;
                        if (isExplosionAt(x, y)) {
                            explosionNode = Vnode('div', { class: 'Explosion' });
                        }
                        // Check if a player is at this cell
                        const player = gameState.players && gameState.players.find(p => p.position && p.position.x === x && p.position.y === y && !p.eliminated);
                        const isLocal = player && player.nickname === gameState.nickname;
                        return Vnode('div', { class: cellClass }, [
                            cellContent,
                            bombNode,
                            explosionNode,
                            player && Vnode('div', { class: 'player-marker' }, [
                                Vnode('div', { 
                                    class: 'player-avatar' + (isLocal ? ' local-player' : '') + (player.speed > 1 ? ' speed-boost' : ''),
                                    'data-player-name': player.nickname
                                }, [
                                    isLocal && Vnode('span', { class: 'local-badge', title: 'You' }, '🟢'),
                                    Vnode('img', {
                                        src: './src/assets/0_Skeleton_Warrior_Idle_000.png',
                                        alt: player.nickname || 'Player Avatar',
                                        style: player.direction === 'left' ? 'transform: scaleX(-1);' : 'transform: scaleX(1);'
                                    }),
                                    // Speed boost indicator
                                    player.speed > 1 && Vnode('div', { 
                                        class: 'speed-indicator', 
                                        title: `Speed: ${player.speed}` 
                                    }, '⚡')
                                ])
                            ])
                        ]);
                    })
                )
            )
        );
    };
    
    return Vnode('div', { class: 'game-board-layout' }, [
        Vnode('div', { class: 'game-board' }, [
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
                // Vnode('div', { class: 'game-controls' }, [ ... ])
            ])
        ]),
        Vnode('div', { class: 'sidebar' }, [
            Vnode('div', { class: 'sidebar-section' }, [
                Vnode('h3', {}, 'Players'),
                ...gameState.players.map(player =>
                    Vnode('div', { class: 'sidebar-player' + (player.nickname === gameState.nickname ? ' local' : '') + (player.eliminated ? ' eliminated' : '') }, [
                        Vnode('span', { class: 'sidebar-player-name' }, player.nickname),
                        Vnode('span', { class: 'sidebar-player-lives' }, player.eliminated ? '💀' : '❤️'.repeat(player.lives || 0))
                    ])
                )
            ]),
            Vnode('div', { class: 'sidebar-section' }, [
                Vnode('h3', {}, 'Your Power-ups'),
                (() => {
                    const localPlayer = gameState.players.find(p => p.nickname === gameState.nickname);
                    if (!localPlayer) return Vnode('div', {}, 'None');
                    const powerups = [];
                    if (localPlayer.bombs > 1) powerups.push(Vnode('span', { class: 'sidebar-powerup' }, `💣 x${localPlayer.bombs}`));
                    if (localPlayer.flameRange > 1) powerups.push(Vnode('span', { class: 'sidebar-powerup' }, `🔥 x${localPlayer.flameRange}`));
                    if (localPlayer.speed > 1) powerups.push(Vnode('span', { class: 'sidebar-powerup' }, `🏃 x${localPlayer.speed}`));
                    if (localPlayer.lives > 3) powerups.push(Vnode('span', { class: 'sidebar-powerup' }, `❤️ x${localPlayer.lives}`));
                    return powerups.length ? powerups : Vnode('div', {}, 'None');
                })()
            ])
        ])
    ]);
} 