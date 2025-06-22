export class Player {
    constructor(x, y, game) {
        this.container = document.getElementById("game_container");
        this.x = x;
        this.y = y;
        this.game = game;
        this.cellSize = 100 / this.game.g_map.mapWidth; 
        this.createPlayerElement();
        document.addEventListener("keydown", (e) => this.handleMovement(e));
    }

    createPlayerElement() {
        this.Char = document.createElement('div');
        this.Char.classList.add('Player');
        this.Char.style.width = `${this.cellSize}%`;
        this.Char.style.height = `${this.cellSize}%`;
        this.Char.style.position = 'absolute';
        this.updatePosition();
        this.container.appendChild(this.Char);
    }

    updatePosition() {
        this.Char.style.left = `${this.x * this.container.offsetWidth / this.game.g_map.mapWidth}px`;
        this.Char.style.top = `${this.y * this.container.offsetWidth / this.game.g_map.mapWidth}px`;
    }

    handleMovement(event) {
        let scale = 1;
        if (!this.game.gameRunning) return;
        switch (event.key) {
            case "ArrowUp": this.move(0, -1); break;
            case "ArrowDown": this.move(0, 1); break;
            case "ArrowLeft": this.move(-1, 0);scale = -1; break;
            case "ArrowRight": this.move(1, 0);scale = 1; break;
            case " ": this.placeBomb(); break;
            case "Escape": this.game.pause(); break;
        }
        const player = document.querySelector('.Player')
        player.style.transform = `scaleX(${scale})`;
    }

    move(dx, dy) {
        const newX = this.x + dx;
        const newY = this.y + dy;
        if (this.isValidMove(newX, newY)) {
            this.x = newX;
            this.y = newY;
            this.updatePosition();
        }
    }

    isValidMove(x, y) {
        return x >= 0 && x < 20 && y >= 0 && y < 20 && this.game.g_map.map[y][x] !== 'W' && this.game.g_map.map[y][x] !== 'B' ;
    }

    placeBomb() {
        console.log("Bomb placed!");
        // add bomb logic
    }
}