const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const MAX_PLAYERS = 4;
const PORT = process.env.PORT || 8080;

const players = new Map(); // Map<ws, nickname>

const server = http.createServer((req, res) => {
  const filePath = './public' + (req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'application/javascript'
  }[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  if (players.size >= MAX_PLAYERS) {
    ws.send(JSON.stringify({ type: 'error', reason: 'room_full' }));
    return ws.close();
  }

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'join') {
        const nickname = data.nickname?.trim();
        if (!nickname) return ws.send(JSON.stringify({ type: 'error', reason: 'invalid_nickname' }));

        players.set(ws, nickname);
        console.log(`Player joined: ${nickname}`);

        ws.send(JSON.stringify({ type: 'welcome', nickname }));
        broadcastPlayerList();
      }

      if (data.type === 'chat') {
        const from = players.get(ws);
        if (!from) return;

        broadcast({
          type: 'chat',
          from,
          text: data.text
        });
      }
    } catch (e) {
      console.error('Invalid message received:', msg);
    }
  });

  ws.on('close', () => {
    if (players.has(ws)) {
      console.log(`Player left: ${players.get(ws)}`);
      players.delete(ws);
      broadcastPlayerList();
    }
  });
});

function broadcast(msg) {
  const str = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  }
}

function broadcastPlayerList() {
  const nicknames = Array.from(players.values());
  broadcast({ type: 'players', list: nicknames });
}

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
