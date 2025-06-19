


export class Bomb {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.container = document.getElementById("game_container");
        this.cellSize = 100 / this.game.g_map.mapWidth;
        this.createBombElement();
        this.timer = 3000; 
        this.explosionDuration = 500; 
        this.exploded = false;

        setTimeout(() => this.explode(), this.timer);
    }

    createBombElement() {
        this.bombElement = document.createElement('div');
        this.bombElement.classList.add('Bomb');
        this.bombElement.style.width = `${this.cellSize}%`;
        this.bombElement.style.height = `${this.cellSize}%`;
        this.bombElement.style.position = 'absolute';
        this.updatePosition();
        this.container.appendChild(this.bombElement);
    }

    updatePosition() {
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;
        const cellSize = Math.min(containerWidth / this.game.g_map.mapWidth, containerHeight / this.game.g_map.mapHeight);
        this.bombElement.style.left = `${this.x * cellSize}px`;
        this.bombElement.style.top = `${this.y * cellSize}px`;
    }

    explode() {
        if (this.exploded) return;
        this.exploded = true;
        this.bombElement.classList.add('Explosion');
        setTimeout(() => this.removeBomb(), this.explosionDuration);
        this.destroyBlocks();
    }

    removeBomb() {
        this.bombElement.remove();
        this.game.bombs = this.game.bombs.filter(bomb => bomb !== this);
    }

    destroyBlocks() {
        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }   // Right
        ];

        directions.forEach(direction => {
            for (let i = 1; i <= 2; i++) {
                const newX = this.x + direction.dx * i;
                const newY = this.y + direction.dy * i;
                if (newX >= 0 && newX < this.game.g_map.mapWidth && newY >= 0 && newY < this.game.g_map.mapHeight) {
                    if (this.game.g_map.map[newY][newX] === 'Block') {
                        this.game.g_map.map[newY][newX] = 'Empty';
                        const cell = this.container.children[newY * this.game.g_map.mapWidth + newX];
                        cell.className = 'cell Empty';
                        break;
                    } else if (this.game.g_map.map[newY][newX] === 'Wall') {
                        break;
                    }
                }
            }
        });

        this.game.g_map.render();
    }
}