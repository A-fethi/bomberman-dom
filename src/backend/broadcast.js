function broadcastRoomUpdate(rooms, roomId, maxPlayersPerRoom) {
    
  const room = rooms[roomId];
  if (!room) return;
  const message = JSON.stringify({
    type: "roomUpdate",
    roomId: roomId,
    count: room.clients.length,
    max: maxPlayersPerRoom,
  });
  room.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function broadcastRoomTimer(rooms, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const message = JSON.stringify({
    type: "roomTimer",
    value: room.timerValue || 0,
  });
  room.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function broadcastEnterGameTimer(rooms, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const message = JSON.stringify({
    type: "enterGameTimer",
    value: room.enterGameTimerValue || 0,
  });
  room.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function broadcastPlayerCount(wss, playerCount, maxPlayers) {
  const message = JSON.stringify({
    type: "playerCount",
    count: playerCount,
    max: maxPlayers,
  });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

module.exports = {
  broadcastRoomUpdate,
  broadcastRoomTimer,
  broadcastEnterGameTimer,
  broadcastPlayerCount,
}; 