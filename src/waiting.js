import {
  Vnode,
  batch,
  createState,
  effect,
  render,
} from "../framework/index.js";

// WebSocket management function
const [getPlayers, setPlayers] = createState(0);
function setupWebSocket(getPlayers, setPlayers) {
  effect(() => {
    let ws;
    try {
      ws = new window.WebSocket("ws://localhost:8081");
      console.log("WebSocket connecting...");
      ws.onopen = () => {
        console.log("WebSocket connected!");
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
  const currentPlayers = getPlayers();
  return Vnode("div", { class: "bomberman-dom" }, [
    Vnode("h2", {}, ["Waiting for other players..."]),
    Vnode("div", { class: "players-count" }, [currentPlayers + "/4 players"]),
    Vnode("div", { class: "spinner" }, []),
  ]);
}

export function waitingpage() {
  setupWebSocket(getPlayers, setPlayers);
  render(WaitingPage, document.body);
}