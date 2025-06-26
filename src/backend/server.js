const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const PORT = 8081;

const { rooms, maxPlayersPerRoom } = require("./roomManager.js");
const {
  broadcastRoomUpdate,
  broadcastRoomTimer,
  broadcastPlayerCount,
} = require("./broadcast.js");
const { startRoomTimer, stopRoomTimer } = require("./timerManager.js");

const maxPlayers = 20;
let playerCount = 0;

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  let filePath;
  if (req.url === "/" || req.url === "/index.html") {
    filePath = path.join(__dirname, "../templates/index.html");
  } else if (req.url === "/styles.css") {
    filePath = path.join(__dirname, "../templates/styles.css");
  } else if (req.url === "/index.js") {
    filePath = path.join(__dirname, "../index.js");
  } else if (req.url.startsWith("/framework/")) {
    filePath = path.join(
      __dirname,
      "../../framework",
      req.url.replace("/framework/", "")
    );
  } else if (req.url.startsWith("/src/")) {
    const pa = req.url.replace("/src/", "");
    filePath = path.join(__dirname, "../", pa);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  let assignedRoomId = null;

  // Find an existing room with space and not locked
  const sortedRoomIds = Object.keys(rooms)
    .map(Number)
    .sort((a, b) => a - b);
  for (const roomId of sortedRoomIds) {
    if (
      rooms[roomId].clients.length < maxPlayersPerRoom &&
      !rooms[roomId].locked
    ) {
      assignedRoomId = roomId.toString();
      break;
    }
  }

  // If no room has space, create a new one
  if (assignedRoomId === null) {
    const newRoomId =
      sortedRoomIds.length > 0
        ? sortedRoomIds[sortedRoomIds.length - 1] + 1
        : 1;
    assignedRoomId = newRoomId.toString();
    rooms[assignedRoomId] = { clients: [], nextPlayerId: 1, locked: false };
  }

  // --- STRICT ROOM CAPACITY AND LOCK CHECK ---
  if (
    rooms[assignedRoomId].clients.length >= maxPlayersPerRoom ||
    rooms[assignedRoomId].locked
  ) {
    ws.send(
      JSON.stringify({ type: "error", message: "Room is full or locked." })
    );
    ws.close();
    return;
  }

  // Assign a unique ID to the player
  ws.id = rooms[assignedRoomId].nextPlayerId++;
  playerCount++;
  
  // Add the player to the assigned room and store the room ID
  rooms[assignedRoomId].clients.push(ws);
  ws.roomId = assignedRoomId;

  broadcastRoomUpdate(rooms, assignedRoomId, maxPlayersPerRoom);
  broadcastPlayerCount(wss, playerCount, maxPlayers);

  // --- Room timer logic ---
  const room = rooms[assignedRoomId];
  if (room.clients.length >= 2) {
    startRoomTimer(rooms, assignedRoomId);
  } else {
    stopRoomTimer(rooms, assignedRoomId);
  }
  // Send the current timer value to the new client
  broadcastRoomTimer(rooms, assignedRoomId);

  ws.on("message", (message) => {
    console.log(`Received from room ${ws.roomId}: ${message}`);
    // Future: Handle in-game messages and broadcast to the room
  });

  ws.on("close", () => {
    const roomId = ws.roomId;
    if (roomId && rooms[roomId]) {
      playerCount--;
      // Remove player from the room
      rooms[roomId].clients = rooms[roomId].clients.filter(
        (client) => client !== ws
      );
      console.log(
        `Player ${ws.id} disconnected from room ${roomId}. Room size: ${rooms[roomId].clients.length}`
      );

      if (rooms[roomId].clients.length > 0) {
        // Broadcast the new player count to the remaining players in the room
        broadcastRoomUpdate(rooms, roomId, maxPlayersPerRoom);
        broadcastPlayerCount(wss, playerCount, maxPlayers);
        // --- Room timer logic ---
        if (rooms[roomId].clients.length >= 2) {
          startRoomTimer(rooms, roomId);
        } else {
          stopRoomTimer(rooms, roomId);
        }
      } else {
        // If the room is empty, remove it
        console.log(`Room ${roomId} is empty. Deleting it.`);
        stopRoomTimer(rooms, roomId);
        delete rooms[roomId];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
