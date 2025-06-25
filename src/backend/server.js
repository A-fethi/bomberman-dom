const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const PORT = 8081;

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
  if (req.url === "/" || req.url === "/index.html" || req.url === "/rooms") {
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
    console.log(__dirname);
    console.log(`Request URL: ${req.url}`);

    const pa = req.url.replace("/src/", "");
    filePath = path.join(__dirname, "../", pa);
    console.log(`Serving file: ${filePath}`);
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

// --- WebSocket player count logic ---
let playerCount = 0;
const maxPlayers = 4;

const wss = new WebSocket.Server({ server });

function broadcastPlayerCount() {
  const message = JSON.stringify({
    type: "playerCount",
    count: playerCount,
    max: maxPlayers,
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  if (playerCount < maxPlayers) {
    playerCount++;
  } else {
    console.log("WebSocket connection refused: Maximum player count reached.");

    return;
  }
  console.log("WebSocket client connected! Player count:", playerCount);
  broadcastPlayerCount();

  ws.on("message", (message) => {
    console.log("Received:", message);
  });

  ws.on("close", () => {
    playerCount = Math.max(0, playerCount - 1);
    console.log("WebSocket client disconnected. Player count:", playerCount);
    broadcastPlayerCount();
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
