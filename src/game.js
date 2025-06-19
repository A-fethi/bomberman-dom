import { Map } from "./map.js";
import { Player } from "./player.js";

class Game {
    constructor(gameContainer) {
        this.gameRunning = false;
        this.timer = 0;
        this.score = 0;
        this.lives = 3;
        this.container = document.getElementById(gameContainer);
        this.g_map = new Map(gameContainer, this);
        this.player = null;
        document.getElementById("pause-btn").addEventListener("click", () => this.pause());
        document.getElementById("resume-btn").addEventListener("click", () => this.resume());
        document.getElementById("restart-btn").addEventListener("click", () => this.restart());
    }

    start() {
        document.getElementById("start-menu").style.display = "none";
        document.getElementById("scoreboard").style.display = "flex";
        this.gameRunning = true;
        this.g_map.generateMap();
        this.timer = 0;
        this.lastFrameTime = performance.now();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));

    }

    pause() {
        this.gameRunning = false;
        document.getElementById("pause-menu").style.display = "block";
    }

    resume() {
        document.getElementById("pause-menu").style.display = "none";
        this.gameRunning = true;
    }

    restart() {
        location.reload();
    }

    gameLoop(timestamp) {
        if (!this.gameRunning) return;
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        this.update(deltaTime);
        document.getElementById("timer").innerHTML = `⏲️: ${Math.floor(this.timer)}s`;
        requestAnimationFrame((newTimestamp) => this.gameLoop(newTimestamp)); // Pass new timestamp
    }

    update(deltaTime) {
        this.timer += deltaTime / 1000;
    }
}

export const game = new Game("game_container");
document.getElementById("start-btn").addEventListener("click", () => game.start());