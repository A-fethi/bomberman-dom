import { Player } from "./player.js";

export class Map {
    constructor(mapContainer, game) {
        this.container = document.getElementById(mapContainer);
        this.mapWidth = 20;
        this.mapHeight = 20;
        this.map = [];
        this.game = game;
    }

    generateMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                let cellType = 'E'; // E => Empty
                if (x === 0 || y === 0 || x === this.mapWidth - 1 || y === this.mapHeight - 1) {
                    cellType = 'W'; // W => Wall
                }
                else if (x % 2 === 0 && y % 2 === 0) {
                    cellType = 'W';
                }
                else if (Math.random() < 0.3) {
                    cellType = 'B'; // B => Block or Box 
                }

                if ((x === 1 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 1)) {
                    cellType = 'S'; // S => Spawn area
                }

                this.map[y][x] = cellType;
            }
        }

        this.createMap();
        this.createPlayer();
    }

    createMap() {
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;
        const cellSize = Math.min(containerWidth / this.mapWidth, containerHeight / this.mapHeight);
        this.container.innerHTML = '';
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const cell = document.createElement('div');
                cell.className = `cell`;
                if (this.map[y][x] === "W") {
                    cell.classList.add('Wall');
                } else if (this.map[y][x] === "B") {
                    cell.classList.add('Block');
                } else {
                    cell.classList.add("Empty");
                }
                // cell.style.width = `${100 / this.mapWidth}%`;
                // cell.style.height = `${100 / this.mapHeight}%`;
                this.container.append(cell);
            }
        }
    }

    createPlayer() {
        this.game.player = new Player(1, 1, this.game);
    }
}