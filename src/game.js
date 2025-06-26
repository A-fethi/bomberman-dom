import { Vnode, render } from "../node_modules/all4one-js/index.js";
import { Map } from "./map.js";
import { Player } from "./player.js";

// Main App Vnode
const App = () => {
    return Vnode("div", {}, [
      Vnode("div", { id: "start-menu" }, [
        Vnode("h1", {}, "Bomberman Game"),
        Vnode("button", { id: "start-btn", onClick: () => game.start()
          }, "Start Game"),
      ]),
      Vnode(
        "div",
        { id: "pause-menu", style: "display: none;" },
        [
          Vnode("h1", {}, "Paused"),
          Vnode("button", { id: "resume-btn" }, "Continue"),
          Vnode("button", { id: "restart-btn" }, "Restart"),
        ]
      ),
      Vnode("div", { id: "scoreboard" }, [
        Vnode("div", { id: "timer", title: "Timer" }, "⏲️: 00:00"),
        Vnode("div", { id: "score", title: "Score" }, "⭐: 0"),
        Vnode("div", { id: "lives", title: "Health" }, "❤️: 3"),
        Vnode("div", { id: "level", title: "level" }, "⚔️: 1"),
        Vnode("div", { id: "pause-btn", title: "Pause" }, "⏸️"),
      ]),
      Vnode("div", { id: "game_container" }),
    ]);
}

render(App, document.body);

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