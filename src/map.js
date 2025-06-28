import { Vnode } from "../node_modules/all4one-js/index.js";

export class Map {
    static render({ map, player, bombs }) {
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
                    const isPlayer = player && player.x === x && player.y === y;
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
                            bomb && Vnode("div", { class: "Bomb" }),
                            isPlayer && Vnode("div", { class: "Player" })
                        ]
                    );
                })
            )
        );
    }
}