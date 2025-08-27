import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';

// GameBoard component with basic map display
export function GameBoard() {
    const gameState = getGameState();
    const bombs = gameState.bombs || [];
    const explosions = gameState.explosions || [];

    // Helper: check if a bomb is at (x, y)
    const isBombAt = (x, y) => bombs.some(b => b.x === x && b.y === y);
    // Helper: check if an explosion is at (x, y)
    const isExplosionAt = (x, y) => {
        const hasExplosion = explosions.some(e => e.affectedCells.some(cell => cell.x === x && cell.y === y));
        if (hasExplosion && explosions.length > 0) {
    
        }
        return hasExplosion;
    };

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
                        // Remove per-cell player rendering
                        return Vnode('div', { class: cellClass }, [
                            cellContent,
                            bombNode,
                            explosionNode
                        ]);
                    })
                )
            )
        );
    };
    
    // Render all player avatars in a single overlay above the map
    const renderPlayersOverlay = () => {
        if (!gameState.players) return null;
        // The overlay container should be absolutely positioned at the top-left of the map grid
        // Find map size
        const mapWidth = gameState.gameMap ? gameState.gameMap[0].length * 32 : 0;
        const mapHeight = gameState.gameMap ? gameState.gameMap.length * 32 : 0;
        return Vnode('div', {
            style: `position:absolute; left:0; top:0; width:${mapWidth}px; height:${mapHeight}px; pointer-events:none; z-index:10;`
        },
            gameState.players.filter(p => p.pixelPosition && !p.eliminated).map(player => {
                const isLocal = player.nickname === gameState.nickname;
                // Offset by one cell (32px) to account for wall border
                const { x, y } = player.pixelPosition;
                return Vnode('div', {
                    class: 'player-marker',
                    style: `position:absolute; left:${x}px; top:${y}px; width:32px; height:32px; pointer-events:none; transition:none; z-index:10;`,
                }, [
                    Vnode('div', {
                        class: 'player-avatar',
                        'data-player-name': player.nickname
                    }, [
                        Vnode('img', {
                            src: isLocal ? './src/assets/0_Golem_Idle_000.png' : './src/assets/0_Skeleton_Warrior_Idle_000.png',
                            alt: player.nickname || 'Player Avatar',
                            style: player.direction === 'left' ? 'transform: scaleX(-1);' : 'transform: scaleX(1);'
                        })
                    ])
                ]);
            })
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
                Vnode('div', { class: 'map-container', style: 'position:relative;' }, [
                    Vnode('div', { class: 'game-map-wrapper', style: 'position:relative;' }, [
                        renderMap(),
                        renderPlayersOverlay()
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
                    const maxPowerups = 3;
                    const pu = localPlayer.powerups || { bomb: 0, flame: 0, speed: 0 };
                    // Bomb
                    powerups.push(Vnode('span', {
                        class: 'sidebar-powerup' + (pu.bomb >= maxPowerups ? ' maxed' : ''),
                        title: pu.bomb >= maxPowerups ? 'Max bomb power reached' : ''
                    }, `💣 ${pu.bomb}/${maxPowerups}`));
                    // Flame
                    powerups.push(Vnode('span', {
                        class: 'sidebar-powerup' + (pu.flame >= maxPowerups ? ' maxed' : ''),
                        title: pu.flame >= maxPowerups ? 'Max flame power reached' : ''
                    }, `🔥 ${pu.flame}/${maxPowerups}`));
                    // Speed - display actual speed value (1.0 to 3.0)
                    const actualSpeed = localPlayer.speed || 1;
                    const speedPowerups = pu.speed || 0;
                    powerups.push(Vnode('span', {
                        class: 'sidebar-powerup' + (speedPowerups >= maxPowerups ? ' maxed' : ''),
                        title: `Speed: ${actualSpeed.toFixed(1)}x (${speedPowerups}/${maxPowerups} power-ups)`
                    }, `🏃 ${actualSpeed.toFixed(1)}x`));
                    return powerups;
                })()
            ])
        ])
    ]);
} 