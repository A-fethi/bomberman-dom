import { Vnode } from "../node_modules/all4one-js/index.js";

export class Map {
    static render({ map, players, bombs }) {
        const mapWidth = map[0]?.length || 0;
        const mapHeight = map.length;
        // const cellSize = 100 / mapWidth;

        return Vnode(
            "div",
            {
                id: "map",
                style: `position: relative; width: 100%; height: 100%; display: grid; grid-template-columns: repeat(${mapWidth}, 1fr); grid-template-rows: repeat(${mapHeight}, 1fr);`
            },
            map.flatMap((row, y) =>
                row.map((cell, x) => {
                    const playerAtPosition = players && players.find(p => p.x === x && p.y === y);
                    const bomb = bombs && bombs.find(b => b.x === x && b.y === y);
                    let cellClass = "cell ";
                    if (cell === "W") cellClass += "Wall";
                    else if (cell === "B") cellClass += "Block";
                    else if (cell === "S") cellClass += "Spawn";
                    else cellClass += "Empty";

                    return Vnode(
                        "div",
                        {
                            class: cellClass,
                            style: `grid-column: ${x + 1}; grid-row: ${y + 1}; position: relative;`
                        },
                        [
                            bomb && Vnode("div", { 
                                class: bomb.exploding ? "Bomb Explosion" : "Bomb",
                                style: `position: absolute; z-index: 1; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white; text-shadow: 1px 1px 2px black;`
                            }, bomb.exploding ? "" : Math.ceil(bomb.timer / 1000)),
                            bomb && bomb.exploding && bomb.explosionElements && bomb.explosionElements.map((explosion, index) => 
                                explosion.x === x && explosion.y === y ? 
                                Vnode("div", { 
                                    class: "Explosion",
                                    style: `position: absolute; z-index: 3; width: 100%; height: 100%;`
                                }) : null
                            ).filter(Boolean),
                            playerAtPosition && Vnode("div", { 
                                class: "Player",
                                style: `background-color: ${getPlayerColor(playerAtPosition.id)}; border: 2px solid #000; border-radius: 50%;`
                            })
                        ]
                    );
                })
            )
        );
    }
}

function getPlayerColor(playerId) {
    const colors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];
    return colors[playerId - 1] || '#ffffff';
}