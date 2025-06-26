import {
  Vnode,
  batch,
  createState,
  effect,
  render,
} from "../framework/index.js";

// WebSocket management function
const TIMER_DURATION = 30; // seconds
const [getPlayers, setPlayers] = createState(0);
const [getRoomCount, setRoomCount] = createState(1);
const [getRoomMax, setRoomMax] = createState(4);
const [getRoomTimer, setRoomTimer] = createState(TIMER_DURATION);
const [getTimerActive, setTimerActive] = createState(false);
const [getEnterGameTimer, setEnterGameTimer] = createState(0);
const [getEnterGameActive, setEnterGameActive] = createState(false);

function setupWebSocket(getPlayers, setPlayers, playerName) {
  effect(() => {
    let ws;
    try {
      ws = new window.WebSocket("ws://localhost:8081");
      console.log("WebSocket connecting...");
      ws.onopen = () => {
        console.log("WebSocket connected!");
        if (playerName) {
          ws.send(JSON.stringify({ type: "setName", name: playerName }));
        }
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);

        if (data.type === "playerCount") {
          console.log("Current state before update:", getPlayers());
          batch(() => {
            setPlayers(data.count);
          });
          console.log("data", data.count);
          console.log("State after update:", getPlayers());
        } else if (data.type === "roomUpdate") {
          batch(() => {
            setRoomCount(data.count);
            setRoomMax(data.max);
          });
        } else if (data.type === "roomTimer") {
          batch(() => {
            setRoomTimer(data.value);
            setTimerActive(data.value > 0);
          });
        } else if (data.type === "enterGameTimer") {
          batch(() => {
            setEnterGameTimer(data.value);
            setEnterGameActive(data.value > 0);
          });
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      console.error("WebSocket connection failed:", e);
    }
    return () => {
      if (ws) ws.close();
    };
  });
}

// UI Component function
function WaitingPage() {
  const roomCount = getRoomCount();
  const roomMax = getRoomMax();
  const timer = getRoomTimer();
  const timerActive = getTimerActive();
  const enterGameTimer = getEnterGameTimer();
  const enterGameActive = getEnterGameActive();
  return Vnode("div", { class: "bomberman-dom" }, [
    Vnode("h2", {}, [
      enterGameActive ? "Waiting to enter game..." : "Waiting for other players..."
    ]),
    Vnode("div", { class: "players-count" }, [roomCount + "/" + roomMax + " players"]),
    !enterGameActive && timerActive ? Vnode("div", { class: "timer" }, [`Game starts in: ${timer} seconds`]) : null,
    enterGameActive ? Vnode("div", { class: "timer" }, [`Entering game in: ${enterGameTimer} seconds`]) : null,
    Vnode("div", { class: "spinner" }, []),
  ].filter(Boolean));
}

export function waitingpage(playerName) {
  setupWebSocket(getPlayers, setPlayers, playerName);
  render(WaitingPage, document.body);
}