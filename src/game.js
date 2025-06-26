import { Vnode, createState, render, batch } from "../node_modules/all4one-js/index.js";
import { Map } from "./map.js";
import { Player } from "./player.js";
// import { Bomb } from "./Bomb.js";


const [getGameRunning, setGameRunning] = createState(false);
const [getPaused, setPaused] = createState(false);
const [getTimer, setTimer] = createState(0);
const [getScore, setScore] = createState(0);
const [getLives, setLives] = createState(3);
const [getMap, setMap] = createState([])
const [getBombs, setBombs] = createState([])
const [getPlayer, setPlayer] = createState({ x: 1, y: 1, direction: 'right' })

let lastFrameTime = 0

function start() {
  batch(() => {
    setGameRunning(true);
    setPaused(false);
    setTimer(0);
    setScore(0);
    setLives(3);
    setPlayer({ x: 1, y: 1 });
    setBombs([]);
    setMap(generateMap());
  })
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function pause() {
  setPaused(true);
  setGameRunning(false);
}

function resume() {
  setPaused(false);
  setGameRunning(true);
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function restart() {
  batch(() => {
    setGameRunning(false);
    setPaused(false);
    setTimer(0);
    setScore(0);
    setLives(3);
    setPlayer({ x: 1, y: 1 });
    setBombs([]);
    setMap(generateMap());
  });
}

function gameLoop(timestamp) {
  if (!getGameRunning()) return;
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  setTimer(getTimer() + deltaTime / 1000);
  requestAnimationFrame(gameLoop);
}

function generateMap() {
  const width = 20, height = 20;
  const map = [];
  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      let cellType = 'E';
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        cellType = 'W';
      } else if (x % 2 === 0 && y % 2 === 0) {
        cellType = 'W';
      } else if (Math.random() < 0.3) {
        cellType = 'B';
      }
      // if ((x === 1 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 1)) {
      //   cellType = 'S';
      // }
      map[y][x] = cellType;
    }
  }
  return map;
}


// Main App Vnode
function App() {
  const timer = getTimer();
  const score = getScore();
  const lives = getLives();
  const isRunning = getGameRunning();
  const isPaused = getPaused();
  const bombs = getBombs();
  const player = getPlayer();

  const map = getMap();
  return Vnode("div", {}, [
    !isRunning && !isPaused && Vnode("div", { id: "start-menu" }, [
      Vnode("h1", {}, "Bomberman Game"),
      Vnode("button", {
        id: "start-btn", onClick: start, class: "menu-button"
      }, "Start Game"),
    ]),
    isPaused && Vnode(
      "div",
      { id: "pause-menu" },
      [
        Vnode("h1", {}, "Paused"),
        Vnode("button", { id: "resume-btn", onClick: resume, class: "menu-button" }, "Continue"),
        Vnode("button", { id: "restart-btn", onClick: restart, class: "menu-button" }, "Restart"),
      ]
    ),
    isRunning && Vnode("div", { id: "scoreboard", style: "display: flex" }, [
      Vnode("div", { id: "timer", title: "Timer" }, `⏲️: ${Math.floor(timer)}s`),
      Vnode("div", { id: "score", title: "Score" }, `⭐: ${score}`),
      Vnode("div", { id: "lives", title: "Health" }, `❤️: ${lives}`),
      Vnode("button", { id: "pause-btn", title: "Pause", onClick: pause }, "⏸️"),
    ]),
    isRunning && Vnode("div", { id: "game_container" }, [
      Map.render({
        map,
        player,
      }),
      Player({
        player,
        map
      })
    ]),
  ]);
}

render(App, document.body);
