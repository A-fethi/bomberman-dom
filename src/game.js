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
const [getPlayers, setPlayers] = createState([
  { id: 1, x: 1, y: 1, direction: 'right', lives: 3, score: 0, controls: { up: 'w', down: 's', left: 'a', right: 'd', bomb: ' ' } },
  { id: 2, x: 18, y: 1, direction: 'left', lives: 3, score: 0, controls: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Enter' } },
  { id: 3, x: 1, y: 18, direction: 'right', lives: 3, score: 0, controls: { up: 'i', down: 'k', left: 'j', right: 'l', bomb: 'o' } },
  { id: 4, x: 18, y: 18, direction: 'left', lives: 3, score: 0, controls: { up: 't', down: 'g', left: 'f', right: 'h', bomb: 'y' } }
])

let lastFrameTime = 0

function start() {
  batch(() => {
    setGameRunning(true);
    setPaused(false);
    setTimer(0);
    setScore(0);
    setLives(3);
    setPlayers([
      { id: 1, x: 1, y: 1, direction: 'right', lives: 3, score: 0, controls: { up: 'w', down: 's', left: 'a', right: 'd', bomb: ' ' } },
      { id: 2, x: 18, y: 1, direction: 'left', lives: 3, score: 0, controls: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Enter' } },
      { id: 3, x: 1, y: 18, direction: 'right', lives: 3, score: 0, controls: { up: 'i', down: 'k', left: 'j', right: 'l', bomb: 'o' } },
      { id: 4, x: 18, y: 18, direction: 'left', lives: 3, score: 0, controls: { up: 't', down: 'g', left: 'f', right: 'h', bomb: 'y' } }
    ]);
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
    setPlayers([
      { id: 1, x: 1, y: 1, direction: 'right', lives: 3, score: 0, controls: { up: 'w', down: 's', left: 'a', right: 'd', bomb: ' ' } },
      { id: 2, x: 18, y: 1, direction: 'left', lives: 3, score: 0, controls: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Enter' } },
      { id: 3, x: 1, y: 18, direction: 'right', lives: 3, score: 0, controls: { up: 'i', down: 'k', left: 'j', right: 'l', bomb: 'o' } },
      { id: 4, x: 18, y: 18, direction: 'left', lives: 3, score: 0, controls: { up: 't', down: 'g', left: 'f', right: 'h', bomb: 'y' } }
    ]);
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
      
      if ((x === 1 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 1)) {
        cellType = 'S'; // Player 1 spawn area
      }
      if ((x === 18 && y === 1) || (x === 18 && y === 2) || (x === 17 && y === 1)) {
        cellType = 'S'; // Player 2 spawn area
      }
      if ((x === 1 && y === 18) || (x === 1 && y === 17) || (x === 2 && y === 18)) {
        cellType = 'S'; // Player 3 spawn area
      }
      if ((x === 18 && y === 18) || (x === 18 && y === 17) || (x === 17 && y === 18)) {
        cellType = 'S'; // Player 4 spawn area
      }
      
      map[y][x] = cellType;
    }
  }
  return map;
}

function handleKeyDown(event) {
  if (!getGameRunning()) return;

  const players = getPlayers()
  const map = getMap()
  let playersUpdated = false

  players.forEach((player, index) => {
    const { controls } = player
    let { x, y, direction } = player
    let moved = false

    switch (event.key.toLowerCase()) {
      case controls.up.toLowerCase():
        if (isValidMove(x, y - 1, map, players, index)) { y -= 1; moved = true }
        break;
      case controls.down.toLowerCase():
        if (isValidMove(x, y + 1, map, players, index)) { y += 1; moved = true }
        break;
      case controls.left.toLowerCase():
        if (isValidMove(x - 1, y, map, players, index)) { x -= 1; moved = true; direction = 'left'; }
        break;
      case controls.right.toLowerCase():
        if (isValidMove(x + 1, y, map, players, index)) { x += 1; moved = true; direction = 'right'; }
        break;
      case controls.bomb.toLowerCase():
        console.log(`Player ${player.id} placed bomb at`, x, y);
        break;
    }
    
    if (moved) {
      players[index] = { ...player, x, y, direction }
      playersUpdated = true
    }
  })

  if (playersUpdated) {
    setPlayers([...players])
  }

  if (event.key === "Escape") {
    pause();
  }
}

function isValidMove(x, y, map, players, currentPlayerIndex) {
  if (x < 0 || x >= 20 || y < 0 || y >= 20 || map[y][x] === 'W' || map[y][x] === 'B') {
    return false
  }
  
  for (let i = 0; i < players.length; i++) {
    if (i !== currentPlayerIndex && players[i].x === x && players[i].y === y) {
      return false
    }
  }
  
  return true
}

let keyboardEventListenerAdded = false;

function App() {
  if (!keyboardEventListenerAdded) {
    document.addEventListener("keydown", handleKeyDown);
    keyboardEventListenerAdded = true;
  }
  const timer = getTimer();
  const score = getScore();
  const lives = getLives();
  const isRunning = getGameRunning();
  const isPaused = getPaused();
  const bombs = getBombs();
  const players = getPlayers();

  const map = getMap();
  return Vnode("div", {}, [
    !isRunning && !isPaused && Vnode("div", { id: "start-menu" }, [
      Vnode("h1", {}, "Bomberman Game"),
      Vnode("p", {}, "4 Players - Each in a corner"),
      Vnode("div", { style: "text-align: left; margin: 20px 0;" }, [
        Vnode("p", {}, "Player 1 (Red): WASD + Space"),
        Vnode("p", {}, "Player 2 (Blue): Arrow Keys + Enter"),
        Vnode("p", {}, "Player 3 (Green): IJKL + O"),
        Vnode("p", {}, "Player 4 (Yellow): TFGH + Y"),
      ]),
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
    isRunning && Vnode("div", { id: "scoreboard", style: "display: flex; flex-wrap: wrap; gap: 10px;" }, [
      Vnode("div", { id: "timer", title: "Timer" }, `⏲️: ${Math.floor(timer)}s`),
      ...players.map(player => 
        Vnode("div", { 
          id: `player-${player.id}-stats`, 
          title: `Player ${player.id}`, 
          style: `color: ${getPlayerColor(player.id)}; font-weight: bold;`
        }, `P${player.id}: ❤️${player.lives} ⭐${player.score}`)
      ),
      Vnode("button", { id: "pause-btn", title: "Pause", onClick: pause }, "⏸️"),
    ]),
    isRunning && Vnode("div", { id: "game_container" }, [
      Map.render({
        map,
        players,
      }),
      ...players.map(player => Player({ player, map }))
    ]),
  ]);
}

function getPlayerColor(playerId) {
  const colors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];
  return colors[playerId - 1] || '#ffffff';
}

render(App, document.body);
